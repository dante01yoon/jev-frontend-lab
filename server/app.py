"""Loopback-only stdlib HTTP API and explicitly allowlisted production assets."""
from __future__ import annotations
import argparse
import hashlib
import http.server
import ipaddress
import json
import math
import mimetypes
import os
import re
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit

from .providers import Providers, ProviderError, redact, JEV_MODEL, LAYA_MODEL, LLM_MODEL, LLM_PROVIDER
from .questions import stage_one, stage_two, first_decisions, assemble
from .schema import ValidationError, validate_request, validate_spec

ROOT = Path(__file__).resolve().parents[1]
MAX_BODY = 32768
PUBLIC_SUFFIXES = {'.html','.js','.css','.svg','.png','.jpg','.jpeg','.webp','.avif','.ico','.woff','.woff2'}


def encode_json(payload):
    return json.dumps(redact(payload), ensure_ascii=False, allow_nan=False, separators=(',', ':')).encode()


def safe_public_path(dist, request_path):
    """Never traverse, expose source/.env/runs, or follow a symlink outside dist."""
    path = unquote(urlsplit(request_path).path)
    if '\x00' in path or '\\' in path or any(part.startswith('.') for part in path.split('/') if part):
        return None
    relative = 'index.html' if path == '/' else path.lstrip('/')
    if relative != 'index.html' and not relative.startswith('assets/') and relative not in {'favicon.svg','favicon.ico'}:
        return None
    candidate = (dist / relative).resolve()
    if not candidate.is_relative_to(dist.resolve()) or candidate.suffix.lower() not in PUBLIC_SUFFIXES or not candidate.is_file():
        return None
    return candidate


def local_origin(value, ports):
    try:
        parsed = urlsplit(value)
        return parsed.scheme == 'http' and parsed.hostname in {'localhost','127.0.0.1','::1'} and parsed.port in ports and parsed.username is None and parsed.password is None
    except ValueError:
        return False


class Lab:
    def __init__(self, providers=None, run_dir=None):
        self.providers = providers or Providers()
        self.run_dir = Path(run_dir or ROOT / 'runs')
        self.run_dir.mkdir(parents=True, exist_ok=True)
        self.records = {}
        self.records_lock = threading.Lock()

    def save(self, record):
        clean = redact(record)
        target = self.run_dir / (clean['run_id'] + '.json')
        target.write_text(json.dumps(clean, ensure_ascii=False, indent=2, allow_nan=False))
        with self.records_lock:
            self.records[clean['run_id']] = clean
            while len(self.records) > 1000:
                self.records.pop(next(iter(self.records)))

    def summaries(self):
        with self.records_lock:
            values = list(self.records.values())[-80:]
        return [{key:r[key] for key in ['run_id','provider','created_at','status','app'] if key in r} for r in reversed(values)]

    def run(self, body, refine=False):
        validate_request(body, refine)
        run_id = uuid.uuid4().hex
        record = {'run_id':run_id, 'created_at':datetime.now(timezone.utc).isoformat(), 'app':body['app'],
                  'provider':body.get('provider', 'refine'), 'request':body, 'status':'running', 'source':'LIVE'}
        started = time.perf_counter()
        stages, calls = [], []
        try:
            if refine:
                supplied = body['plan']
                planner_id = supplied.get('run_id')
                with self.records_lock:
                    previous_record = self.records.get(planner_id) if isinstance(planner_id,str) else None
                if not previous_record or previous_record.get('status') != 'complete' or previous_record.get('kind') != 'plan':
                    raise ValidationError('Refinement requires a successful plan created by this running server')
                plan = previous_record['result']
                if supplied != plan or plan['spec']['app'] != body['app']:
                    raise ValidationError('Plan payload differs from the original server result')
                if previous_record['request']['prompt'] != body['prompt'] or previous_record['request'].get('previous') != body.get('previous'):
                    raise ValidationError('Refinement must use the same request and previous spec as its plan')
                provider = plan['provider'] + '+llm'
                record['provider'] = provider
                record['kind'] = 'refine'
                stage_start = time.perf_counter()
                spec, raw = self.providers.refine(body, plan)
                record['llm_response'] = raw
                validate_spec(spec, body['app'])
                stages.append({'name':'llm_refine','elapsed_ms':round((time.perf_counter()-stage_start)*1000,1)})
                usage = raw.get('usage', {})
                cost = usage.get('cost')
                if not isinstance(cost,(int,float)) or isinstance(cost,bool) or not math.isfinite(cost) or cost < 0:
                    cost = None
                result = {'run_id':run_id, 'provider':provider, 'spec':spec, 'model':raw.get('model',LLM_MODEL),
                          'elapsed_ms':round((time.perf_counter()-started)*1000,1), 'stages':stages, 'usage':usage,
                          'cost_usd':cost, 'cost_basis':'OpenRouter returned usage.cost' if cost is not None else 'not returned',
                          'raw':raw, 'source':'LIVE', 'before':plan['spec'], 'planner_run_id':plan['run_id'],
                          'diff':[{'field':k,'before':plan['spec'][k],'after':spec[k]} for k in spec if spec[k] != plan['spec'][k]],
                          'llm_provider':raw.get('provider',LLM_PROVIDER)}
            else:
                provider = body['provider']
                record['kind'] = 'plan'
                for stage in [1,2]:
                    state, questions = stage_one(body) if stage == 1 else stage_two(body, first)
                    stage_start = time.perf_counter()
                    raw = self.providers.decision(provider, state, questions)
                    stages.append({'name':f'decision_{stage}', 'elapsed_ms':round((time.perf_counter()-stage_start)*1000,1)})
                    calls.append({'state':state, 'questions':questions, 'response':raw})
                    record['calls'] = calls
                    if stage == 1:
                        first = first_decisions(body, raw)
                        if not first['sections']:
                            raise ValidationError('Model selected no sections; invalid plan was not repaired')
                    else:
                        spec = assemble(body, first, raw)
                usage = {key:sum(call['response'].get('usage',{}).get(key,0) for call in calls) for key in ['input_tokens','output_tokens']}
                # Official Jev price observed 2026-09-22: $0.042/M input; output free.
                cost = round(usage['input_tokens']*0.042/1_000_000,10) if provider == 'jev' else 0
                result = {'run_id':run_id,'provider':provider,'spec':spec,'model':JEV_MODEL if provider=='jev' else LAYA_MODEL,
                          'elapsed_ms':round((time.perf_counter()-started)*1000,1),'stages':stages,'usage':usage,'cost_usd':cost,
                          'cost_basis':'Jev published input-token rate estimate, not billing invoice' if provider=='jev' else 'Local inference API charge only; hardware/energy excluded',
                          'raw':{'decisions':calls},'source':'LIVE'}
            result = redact(result)
            record.update(status='complete', result=result)
            self.save(record)
            return result
        except Exception as exc:
            if isinstance(exc,(ValidationError,ProviderError)):
                message = str(exc)
            else:
                message = 'Internal provider failure (' + type(exc).__name__ + ')'
            if getattr(exc, 'raw', None) is not None:
                record['rejected_response'] = exc.raw
            record.update(status='failed', error=message, stages=stages, elapsed_ms=round((time.perf_counter()-started)*1000,1))
            self.save(record)
            error = {'error':message,'provider':record['provider'],'run_id':run_id}
            # The handler receives safe structured diagnostics plus preserved failure log.
            raise RunError(400 if isinstance(exc,ValidationError) else 502, error) from None


class RunError(Exception):
    def __init__(self, status, payload):
        self.status, self.payload = status, payload


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = 'FrontendLab/1.0'
    protocol_version = 'HTTP/1.1'

    def log_message(self, *_):
        pass

    def send_bytes(self, status, data, content_type):
        self.send_response(status)
        self.send_header('Content-Type',content_type)
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Content-Security-Policy',"default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'")
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def reply(self,status,payload):
        self.send_bytes(status,encode_json(payload),'application/json; charset=utf-8')

    def check_local(self):
        try:
            peer = ipaddress.ip_address(self.client_address[0]).is_loopback
            host = self.headers.get('Host','')
            parsed = urlsplit('http://' + host)
            safe_host = parsed.hostname in {'localhost','127.0.0.1','::1'} and parsed.port in self.server.allowed_ports
            origin = self.headers.get('Origin')
            safe_origin = origin is None or local_origin(origin,self.server.allowed_ports)
            return peer and safe_host and safe_origin
        except ValueError:
            return False

    def do_GET(self):
        if not self.check_local():
            return self.reply(403,{'error':'Only permitted loopback origins may access this server'})
        path = urlsplit(self.path).path
        if path == '/api/health':
            return self.reply(200,self.server.lab.providers.health())
        if path == '/api/runs':
            return self.reply(200,{'runs':self.server.lab.summaries()})
        file = safe_public_path(self.server.dist,self.path)
        if file is None:
            return self.reply(404,{'error':'Not found'})
        return self.send_bytes(200,file.read_bytes(),mimetypes.guess_type(file)[0] or 'application/octet-stream')

    def do_POST(self):
        if not self.check_local():
            return self.reply(403,{'error':'Only permitted loopback origins may access this server'})
        if self.path not in {'/api/plan','/api/refine'}:
            return self.reply(404,{'error':'Not found'})
        if self.headers.get('Transfer-Encoding'):
            self.close_connection = True
            return self.reply(400,{'error':'Transfer-Encoding is not supported'})
        if self.headers.get('Content-Type','').split(';')[0] != 'application/json':
            self.close_connection = True
            return self.reply(415,{'error':'Expected application/json'})
        try:
            length = int(self.headers.get('Content-Length','0'))
            if not 0 < length <= MAX_BODY:
                self.close_connection = True
                return self.reply(413,{'error':'Request must be 1–32768 bytes'})
            self.connection.settimeout(10)
            body = json.loads(self.rfile.read(length),parse_constant=lambda _: (_ for _ in ()).throw(ValidationError('Non-finite JSON is forbidden')))
            result = self.server.lab.run(body, self.path == '/api/refine')
            return self.reply(200,result)
        except RunError as exc:
            return self.reply(exc.status,exc.payload)
        except (ValueError,UnicodeDecodeError,ValidationError):
            return self.reply(400,{'error':'Malformed request or invalid request fields'})
        except TimeoutError:
            self.close_connection = True
            return self.reply(408,{'error':'Request body timed out'})


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, port, lab=None, dist=None):
        self.lab = lab or Lab()
        self.dist = Path(dist or ROOT / 'dist')
        self.allowed_ports = {port,5173,5178,4173}
        super().__init__(('127.0.0.1',port),Handler)
        self.allowed_ports.add(self.server_port)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8787)
    parser.add_argument('--no-preload', action='store_true')
    args = parser.parse_args()
    server = Server(args.port)
    if not args.no_preload:
        def preload():
            try:
                server.lab.providers.load_laya()
                print('Laya ready:',json.dumps(server.lab.providers.health()['laya']),flush=True)
            except ProviderError as exc:
                print('Laya unavailable:',str(exc),flush=True)
        threading.Thread(target=preload,daemon=True).start()
    print(f'Frontend Decision Lab: http://127.0.0.1:{args.port}',flush=True)
    server.serve_forever()

if __name__ == '__main__':
    main()
