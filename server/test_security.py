"""Offline boundary tests, never charged model calls."""
import copy
import http.client
import json
import os
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
import unittest
from pathlib import Path
from unittest.mock import patch

from server.app import Server, Lab, RunError, safe_public_path, local_origin
from server.schema import validate_spec, validate_request, ValidationError, include_section
from server.providers import redact, load_external_env

SPEC = {'app':'stays','title':'Elsewhere','subtitle':'Stay awhile','theme':'sand','layout':'editorial','density':'comfortable',
        'typography':'editorial','corners':'soft','emphasis':'visual','hero':'large','sections':['filters','results','compare'],'note':'Synthetic data'}

class SpecTests(unittest.TestCase):
    def test_reject_cross_app_section_and_extra_executable_field(self):
        for change in [{'sections':['products']},{'script':'alert(1)'},{'layout':'<iframe>'},{'sections':['results','results']},{'title':'<script>alert(1)</script>'},{'density':[]}]:
            with self.assertRaises(ValidationError):
                validate_spec({**SPEC,**change},'stays')

    def test_reject_wrong_app_and_empty_sections(self):
        with self.assertRaises(ValidationError): validate_spec(SPEC,'shop')
        with self.assertRaises(ValidationError): validate_spec({**SPEC,'sections':[]})

    def test_never_coerce_invalid_decision_probability(self):
        for bad in [float('nan'),float('inf'),True,-0.1,1.01,'yes']:
            with self.assertRaises(ValidationError): include_section({'x':{'type':'noul','noul':bad}},'x')

    def test_request_and_previous_contract(self):
        validate_request({'app':'stays','prompt':'Make it dark','provider':'jev','previous':SPEC})
        for change in [{'app':'../../.env'},{'prompt':''},{'prompt':'x'*1501},{'provider':'shell'},{'previous':{**SPEC,'app':'shop'}}]:
            with self.assertRaises(ValidationError): validate_request({'app':'stays','prompt':'x','provider':'jev',**change})

    def test_reject_client_forged_live_result(self):
        with tempfile.TemporaryDirectory() as tmp:
            lab=Lab(providers=FakeProviders(),run_dir=tmp)
            with self.assertRaises(RunError) as e:
                lab.run({'app':'stays','prompt':'x','plan':{'run_id':'invented','source':'LIVE','spec':SPEC}},True)
            self.assertEqual(e.exception.status,400)
            self.assertEqual(len(list(Path(tmp).glob('*.json'))),1)

class FileBoundaryTests(unittest.TestCase):
    def test_static_allowlist_traversal_dotfiles_and_symlink_escape(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp); dist=base/'dist';dist.mkdir();(dist/'assets').mkdir()
            (base/'.env').write_text('SECRET');((dist/'index.html').resolve()).write_text('public')
            (dist/'assets'/'escape.js').symlink_to(base/'.env')
            (dist/'assets'/'safe.js').write_text('console.log(1)')
            self.assertEqual(safe_public_path(dist,'/'),(dist/'index.html').resolve())
            self.assertEqual(safe_public_path(dist,'/assets/safe.js'),(dist/'assets/safe.js').resolve())
            for path in ['/.env','/../.env','/%2e%2e/.env','/assets/%2e%2e/%2e%2e/.env','/server/app.py','/runs/a.json','/assets/escape.js','/assets/a\\b.js']:
                self.assertIsNone(safe_public_path(dist,path),path)

    def test_origin_not_hostname_prefix(self):
        for origin in ['https://127.0.0.1:8787','http://localhost.evil:8787','http://attacker.test:8787','null','http://localhost:9999','http://user@localhost:8787']:
            self.assertFalse(local_origin(origin,{8787}))
        self.assertTrue(local_origin('http://localhost:8787',{8787}))

    def test_credentials_redacted_recursively(self):
        with patch.dict(os.environ,{'TYPESAFE_API_KEY':'secret-value-123'}):
            self.assertNotIn('secret-value-123',json.dumps(redact({'nested':['secret-value-123']})))

    def test_external_env_is_allowlisted_and_not_executed(self):
        with tempfile.TemporaryDirectory() as tmp:
            file=Path(tmp)/'.env';file.write_text('UNRELATED_PRIVATE=do-not-load\nTYPESAFE_API_KEY=literal$(echo no)\n')
            with patch.dict(os.environ,{'DEMO_ENV_FILES':str(file)},clear=True):
                load_external_env()
                self.assertEqual(os.environ['TYPESAFE_API_KEY'],'literal$(echo no)')
                self.assertNotIn('UNRELATED_PRIVATE',os.environ)

class AuditTrailTests(unittest.TestCase):
    def test_invalid_paid_llm_response_and_usage_are_preserved(self):
        class InvalidRefiner:
            def refine(self, body, plan):
                return {**SPEC, 'sections':['forbidden']}, {'model':'test', 'usage':{'cost':0.001}, 'choices':[{'message':{'content':'invalid'}}]}
        with tempfile.TemporaryDirectory() as tmp:
            lab=Lab(InvalidRefiner(),tmp)
            plan={'run_id':'known','provider':'jev','spec':SPEC}
            lab.records['known']={'status':'complete','kind':'plan','result':plan,'request':{'app':'stays','prompt':'dark'}}
            with self.assertRaises(RunError): lab.run({'app':'stays','prompt':'dark','plan':plan},True)
            record=json.loads(next(Path(tmp).glob('*.json')).read_text())
            self.assertEqual(record['status'],'failed')
            self.assertEqual(record['llm_response']['usage']['cost'],0.001)
            self.assertEqual(record['llm_response']['choices'][0]['message']['content'],'invalid')

    def test_refiner_provider_error_keeps_raw_and_redacts_secrets(self):
        from server.providers import ProviderError
        class RejectedRefiner:
            def refine(self, body, plan):
                raise ProviderError('LLM JSON invalid',raw={'usage':{'cost':0.001},'content':'secret-value-123'})
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ,{'TYPESAFE_API_KEY':'secret-value-123'}):
            lab=Lab(RejectedRefiner(),tmp)
            plan={'run_id':'known','provider':'jev','spec':SPEC}
            lab.records['known']={'status':'complete','kind':'plan','result':plan,'request':{'app':'stays','prompt':'dark'}}
            with self.assertRaises(RunError): lab.run({'app':'stays','prompt':'dark','plan':plan},True)
            text=next(Path(tmp).glob('*.json')).read_text();record=json.loads(text)
            self.assertEqual(record['rejected_response']['usage']['cost'],0.001)
            self.assertNotIn('secret-value-123',text)

class LLMQueueTests(unittest.TestCase):
    def test_concurrent_refinements_are_serialized_and_wait_is_reported(self):
        from server.providers import Providers, LLM_MODEL
        first_entered=threading.Event()
        release_first=threading.Event()
        second_waiting=threading.Event()
        guard=threading.Lock()
        state={'active':0,'peak':0,'calls':0,'lock_attempts':0}
        real_lock=threading.Lock()
        class ObservableLock:
            # Delegate to a real lock; only observe when the second thread queues.
            def acquire(self, timeout):
                with guard:
                    state['lock_attempts']+=1
                    if state['lock_attempts']==2: second_waiting.set()
                return real_lock.acquire(timeout=timeout)
            def release(self): real_lock.release()
        def fake_post(url,payload,key,timeout):
            with guard:
                state['calls']+=1;number=state['calls']
                state['active']+=1;state['peak']=max(state['peak'],state['active'])
            if number==1:
                first_entered.set()
                if not release_first.wait(2): raise AssertionError('Test did not release first request')
            with guard:state['active']-=1
            return {'model':LLM_MODEL,'choices':[{'finish_reason':'stop','message':{'content':json.dumps(SPEC)}}],'usage':{'cost':0}}
        with tempfile.TemporaryDirectory() as tmp, patch('server.providers.load_external_env'), patch.object(Providers,'llm_key',return_value='fake-key'), patch('server.providers._LLM_REQUEST_LOCK',ObservableLock()), patch('server.providers.post_json',side_effect=fake_post):
            # Different Providers instances must still share one process-wide queue.
            labs=[Lab(Providers(),Path(tmp)/str(i)) for i in range(2)]
            plan={'run_id':'known','provider':'jev','spec':SPEC}
            for lab in labs:lab.records['known']={'status':'complete','kind':'plan','result':plan,'request':{'app':'stays','prompt':'dark'}}
            body={'app':'stays','prompt':'dark','plan':plan}
            with ThreadPoolExecutor(max_workers=2) as pool:
                first=pool.submit(labs[0].run,body,True)
                self.assertTrue(first_entered.wait(1))
                second=pool.submit(labs[1].run,body,True)
                try:
                    self.assertTrue(second_waiting.wait(1))
                    self.assertEqual(state['calls'],1)
                    time.sleep(0.03)
                finally:release_first.set()
                first.result(timeout=2);result=second.result(timeout=2)
            self.assertEqual(state['calls'],2)
            self.assertEqual(state['peak'],1)
            transport=result['raw']['local_transport']
            self.assertGreaterEqual(transport['queue_ms'],20)
            self.assertGreaterEqual(result['elapsed_ms'],transport['queue_ms'])
            self.assertGreaterEqual(result['stages'][0]['elapsed_ms'],transport['queue_ms'])

    def test_provider_failure_releases_queue_without_retry_or_fallback(self):
        from server.providers import Providers, ProviderError, LLM_MODEL, LLM_PROVIDER
        valid={'model':LLM_MODEL,'choices':[{'finish_reason':'stop','message':{'content':json.dumps(SPEC)}}]}
        with patch('server.providers.load_external_env'), patch.object(Providers,'llm_key',return_value='fake-key'), patch('server.providers.post_json',side_effect=[ProviderError('Provider HTTP 429; no automatic retry'),valid]) as post:
            providers=Providers();body={'app':'stays','prompt':'dark'};plan={'spec':SPEC}
            with self.assertRaises(ProviderError) as error:providers.refine(body,plan)
            self.assertEqual(post.call_count,1)
            self.assertTrue(error.exception.raw['local_transport']['provider_request_started'])
            result,raw=providers.refine(body,plan)
            self.assertEqual(result,SPEC)
            self.assertEqual(post.call_count,2)
            for call in post.call_args_list:
                self.assertEqual(call.args[1]['provider']['only'],[LLM_PROVIDER])
                self.assertFalse(call.args[1]['provider']['allow_fallbacks'])

class FakeProviders:
    def health(self): return {'test':True}

class HTTPBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.server=Server(0,lab=Lab(FakeProviders(),self.tmp.name),dist=Path(self.tmp.name)/'dist')
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()

    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.tmp.cleanup()

    def request(self,method,path,body=None,headers=None):
        conn=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=2)
        conn.request(method,path,body,headers or {})
        response=conn.getresponse();data=response.read();conn.close()
        return response.status,json.loads(data)

    def test_dns_rebinding_and_cross_origin_blocked(self):
        self.assertEqual(self.request('GET','/api/health',headers={'Host':'evil.test:8787'})[0],403)
        self.assertEqual(self.request('POST','/api/plan','{}',{'Content-Type':'application/json','Origin':'https://evil.test'})[0],403)
        self.assertEqual(self.request('GET','/api/health')[0],200)

    def test_request_size_content_type_nonfinite_and_file_exposure(self):
        self.assertEqual(self.request('POST','/api/plan','x'*32769,{'Content-Type':'application/json'})[0],413)
        self.assertEqual(self.request('POST','/api/plan','{}',{'Content-Type':'text/plain'})[0],415)
        self.assertEqual(self.request('POST','/api/plan','{"app":NaN}',{'Content-Type':'application/json'})[0],400)
        self.assertEqual(self.request('GET','/.env')[0],404)

if __name__=='__main__': unittest.main()
