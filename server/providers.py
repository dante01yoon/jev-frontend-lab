"""Official Jev HTTP, installed Laya runtime, and one fixed OpenRouter model."""
from __future__ import annotations
import importlib.util
import importlib.metadata
import json
import os
import socket
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

from .schema import ValidationError, json_schema, validate_spec, APPS, ENUMS

JEV_MODEL = 'jev-1.13.0'
LAYA_MODEL = 'convaiinnovations/laya-multilingual'
LAYA_REVISION = '052592a15d198d9ad47da779604259b10b47b7aa'
LLM_MODEL = 'qwen/qwen3-coder-next'
LLM_PROVIDER = 'parasail/bf16'
DECISION_TIMEOUT = 10
LLM_TIMEOUT = 60
# Shared across Providers instances: at most one LLM HTTP request per process.
_LLM_REQUEST_LOCK = threading.Lock()
ALLOWED_ENV_KEYS = {'TYPESAFE_API_KEY', 'OPENROUTER_API_KEY', 'OPEN_ROUTER_API_KEY'}


class ProviderError(RuntimeError):
    def __init__(self, message, raw=None):
        super().__init__(message)
        self.raw = raw


def load_external_env():
    """No shell evaluation and no .env copied into this repository."""
    for filename in os.environ.get('DEMO_ENV_FILES', '').split(os.pathsep):
        if not filename:
            continue
        path = Path(filename).expanduser()
        if not path.is_file():
            raise ProviderError('An explicitly configured DEMO_ENV_FILES path does not exist')
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            key = key.removeprefix('export ').strip()
            if key in ALLOWED_ENV_KEYS:
                os.environ.setdefault(key, value.strip().strip('"').strip("'"))


def redact(value):
    text = json.dumps(value, ensure_ascii=False, allow_nan=False)
    for key in ALLOWED_ENV_KEYS:
        secret = os.environ.get(key)
        if secret and len(secret) > 6:
            text = text.replace(secret, '[REDACTED]')
    return json.loads(text)


def post_json(url, payload, key, timeout):
    req = urllib.request.Request(url, data=json.dumps(payload, ensure_ascii=False, allow_nan=False).encode(), headers={'Authorization':f'Bearer {key}', 'Content-Type':'application/json', 'User-Agent':'frontend-decision-lab/1.0'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read(1024 * 1024 + 1)
            if len(raw) > 1024 * 1024:
                raise ProviderError('Provider response exceeded 1 MB')
            return json.loads(raw, parse_constant=lambda _: (_ for _ in ()).throw(ProviderError('Non-finite provider JSON')))
    except urllib.error.HTTPError as exc:
        # Error bodies may echo payloads or authentication values. Do not expose them.
        raise ProviderError(f'Provider HTTP {exc.code}; no automatic retry') from None
    except (TimeoutError, socket.timeout):
        raise ProviderError(f'Provider timed out after {timeout}s; no automatic retry') from None
    except urllib.error.URLError:
        raise ProviderError('Provider connection failed; no automatic retry') from None
    except json.JSONDecodeError:
        raise ProviderError('Provider did not return valid JSON') from None


class Providers:
    def __init__(self):
        load_external_env()
        self.laya = None
        self.laya_error = None
        self.laya_meta = {}
        self.load_lock = threading.Lock()
        self.inference_lock = threading.Lock()
        self.runtime_available = importlib.util.find_spec('laya') is not None

    def health(self):
        return {
            'jev':{'configured':bool(os.environ.get('TYPESAFE_API_KEY')), 'model':JEV_MODEL},
            'laya':{'available':self.runtime_available, 'ready':self.laya is not None, 'model':LAYA_MODEL, 'revision':LAYA_REVISION, 'device':self.laya_meta.get('device','not loaded'), **self.laya_meta, **({'error':self.laya_error} if self.laya_error else {})},
            'llm':{'configured':bool(self.llm_key()), 'model':LLM_MODEL, 'provider':LLM_PROVIDER,
                   'max_concurrent_requests':1, 'queue_scope':'process', 'queue_time_included_in_elapsed_ms':True,
                   'timeout_seconds':LLM_TIMEOUT, 'timeout_includes_queue':True, 'automatic_retries':0},
        }

    @staticmethod
    def llm_key():
        return os.environ.get('OPENROUTER_API_KEY') or os.environ.get('OPEN_ROUTER_API_KEY')

    def load_laya(self):
        with self.load_lock:
            if self.laya is not None:
                return self.laya
            if not self.runtime_available:
                self.laya_error = 'Laya is not installed in this Python runtime'
                raise ProviderError(self.laya_error)
            try:
                import laya
                from huggingface_hub import snapshot_download
                started = time.perf_counter()
                path = snapshot_download(LAYA_MODEL, revision=LAYA_REVISION, local_files_only=True,
                    allow_patterns=['rl_agent_config.json','model.safetensors','tokenizer/*','encoder/*'])
                agent = laya.load(path, device=os.environ.get('LAYA_DEVICE') or None)
                self.laya_meta = {'device':str(agent.device), 'dtype':str(agent.dtype),
                    'runtime_version':importlib.metadata.version('laya'), 'torch_version':importlib.metadata.version('torch'),
                    'transformers_version':importlib.metadata.version('transformers'),
                    'max_len':agent.cfg.get('max_len',512), 'head_max_len':agent.cfg.get('head_max_len',192),
                    'load_ms':round((time.perf_counter()-started)*1000, 1)}
                self.laya = agent
                self.laya_error = None
                return agent
            except Exception as exc:
                self.laya_error = 'Pinned Laya checkpoint could not load (' + type(exc).__name__ + '). Run server/prepare_laya.py with the same Python runtime.'
                raise ProviderError(self.laya_error) from exc

    @staticmethod
    def check_budget(agent, state, questions):
        """Reject before the runtime's silent truncation of instructions/options/state."""
        from laya.common import render_options, serialize_state
        tok = agent.tok
        max_len, head_max = agent.cfg.get('max_len',512), agent.cfg.get('head_max_len',192)
        tokenize = lambda text: tok(text.replace(tok.mask_token, ' '), add_special_tokens=False)['input_ids']
        state_tokens = len(tokenize(serialize_state(state)))
        lengths = {}
        for qid, definition in questions.items():
            q = agent._to_internal(definition)
            instructions = len(tokenize(f"{q['t']} question: {q['ins']}"))
            option_lengths = [len(tokenize(' ' + option)) for option in render_options(q)]
            # Runtime caps each option at 48 and reserves head capacity for instructions.
            option_total = sum(n + 1 for n in option_lengths)
            total = instructions + option_total + state_tokens + 4
            if any(n > 48 for n in option_lengths) or option_total > head_max - 16 or instructions > max(8, head_max - option_total) or total > max_len:
                raise ValidationError(f'Input would truncate in Laya for {qid}: {total}/{max_len} tokens; shorten request. No model result was substituted.')
            lengths[qid] = total
        return {'truncated':False, 'sequence_tokens':lengths, 'max_len':max_len, 'head_max_len':head_max}

    def decision(self, provider, state, questions):
        if provider == 'jev':
            key = os.environ.get('TYPESAFE_API_KEY')
            if not key:
                raise ProviderError('TYPESAFE_API_KEY is not configured')
            # Common tokenizer guard when Laya is ready: long prompts are rejected for both.
            budget = self.check_budget(self.laya, state, questions) if self.laya else {'truncated':None, 'reason':'Laya tokenizer not ready'}
            out = post_json('https://api.typesafe.ai/v1/systemone', {'state':state,'model':JEV_MODEL,'questions':questions}, key, DECISION_TIMEOUT)
            if out.get('model') != JEV_MODEL:
                raise ProviderError('Jev returned a different model version than requested', raw=out)
            out['input_budget'] = budget
            return out
        if self.laya is None:
            raise ProviderError('Laya is not ready. Wait for model loading and inspect /api/health.')
        agent = self.laya
        if not self.inference_lock.acquire(timeout=DECISION_TIMEOUT):
            raise ProviderError('Laya inference queue timed out; no automatic retry')
        try:
            budget = self.check_budget(agent, state, questions)
            started = time.perf_counter()
            out = agent.predict(state, questions)
            elapsed = (time.perf_counter()-started)*1000
            # In-process inference cannot be force-killed safely; late results are discarded.
            if elapsed > DECISION_TIMEOUT*1000:
                raise ProviderError('Laya inference exceeded 10s; late result discarded')
            out['model'] = LAYA_MODEL
            out['runtime'] = {**self.laya_meta, 'revision':LAYA_REVISION, 'device':str(agent.device), 'dtype':str(agent.dtype)}
            out['inference_ms'] = round(elapsed,1)
            out['input_budget'] = budget
            return out
        finally:
            self.inference_lock.release()

    def refine(self, body, plan):
        key = self.llm_key()
        if not key:
            raise ProviderError('OPENROUTER_API_KEY or OPEN_ROUTER_API_KEY is not configured')
        schema = json_schema(body['app'])
        system = ('You refine a frontend UISpec. Return only JSON matching the schema. '
                  'Use the provided component catalogue and finite styles to satisfy the user request. '
                  'You may change section selection/order, layout, visual tokens and short copy. '
                  'Preserve previous design properties unless the request asks to change them. '
                  'Do not add facts, prices, users or external integrations. Data is synthetic. '
                  'Never write executable code, markup, URLs, or new properties. '
                  'Explain the design in note, under 300 characters. Title max 120; subtitle max 240. '
                  'Keep sections unique and nonempty. Emphasis visual=imagery, data=numbers, actions=controls.')
        user = {'app':body['app'], 'request':body['prompt'], 'initial_spec':plan['spec'],
                'previous_spec':body.get('previous'), 'catalogue':APPS[body['app']]['sections'], 'style_tokens':ENUMS}
        payload = {'model':LLM_MODEL, 'temperature':0, 'max_tokens':4000, 'stream':False,
                   'provider':{'only':[LLM_PROVIDER], 'allow_fallbacks':False, 'require_parameters':True},
                   'messages':[{'role':'system','content':system},{'role':'user','content':json.dumps(user,ensure_ascii=False)}],
                   'response_format':{'type':'json_schema','json_schema':{'name':'ui_spec','strict':True,'schema':schema}}}
        queued_at = time.perf_counter()
        if not _LLM_REQUEST_LOCK.acquire(timeout=LLM_TIMEOUT):
            raise ProviderError('LLM queue timed out after 60s; no provider request, retry or fallback',
                raw={'local_transport':{'queue_ms':round((time.perf_counter()-queued_at)*1000,1),
                     'request_ms':0, 'max_concurrent_requests':1, 'provider_request_started':False}})
        acquired_at = time.perf_counter()
        queue_ms = round((acquired_at-queued_at)*1000,1)
        request_started = False
        try:
            remaining = LLM_TIMEOUT-(acquired_at-queued_at)
            if remaining <= 0:
                raise ProviderError('LLM queue exhausted the 60s deadline; no provider request')
            request_started = True
            out = post_json('https://openrouter.ai/api/v1/chat/completions', payload, key, remaining)
            out['local_transport'] = {'queue_ms':queue_ms,
                'request_ms':round((time.perf_counter()-acquired_at)*1000,1),
                'max_concurrent_requests':1, 'provider_request_started':True}
            if time.perf_counter()-queued_at > LLM_TIMEOUT:
                raise ProviderError('LLM exceeded the 60s queue-plus-request deadline; late response discarded', raw=out)
        except ProviderError as exc:
            exc.raw = {**(exc.raw or {}), 'local_transport':{'queue_ms':queue_ms,
                'request_ms':round((time.perf_counter()-acquired_at)*1000,1),
                'max_concurrent_requests':1, 'provider_request_started':request_started}}
            raise
        finally:
            _LLM_REQUEST_LOCK.release()
        if out.get('model') != LLM_MODEL:
            raise ProviderError('LLM returned a different model than requested', raw=out)
        choices = out.get('choices') or []
        if not choices or choices[0].get('finish_reason') != 'stop':
            raise ProviderError('LLM did not finish a complete JSON response', raw=out)
        try:
            spec = json.loads(choices[0]['message']['content'])
        except (KeyError, TypeError, json.JSONDecodeError):
            raise ProviderError('LLM returned invalid JSON', raw=out) from None
        return spec, out
