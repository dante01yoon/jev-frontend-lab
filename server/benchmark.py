"""Sequential live API sampler. Timing/contract evidence, never an aesthetic score.

Default: six fixed English app prompts, one repetition, 24 result slots.
No provider is called until the selected cases and their hash are saved.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import random
import statistics
import time
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
CASES = [
 {'id':'stays-editorial','app':'stays','prompt':'Create a stay discovery interface with a warm sand theme, editorial layout, comfortable spacing, serif headings, soft corners and a large hero. Prioritize photographs. Include filters, results and compare.'},
 {'id':'analytics-compact','app':'analytics','prompt':'Create a revenue dashboard using a paper theme, compact density, grid layout, modern typography, sharp corners and a small hero. Prioritize data. Include KPIs, chart, transactions and breakdown.'},
 {'id':'shop-showcase','app':'shop','prompt':'Create an independent homeware shop with a rose theme, showcase layout, comfortable spacing, editorial type, soft corners and a large hero. Prioritize visuals. Include categories, products, cart and benefits.'},
 {'id':'board-focused','app':'board','prompt':'Create a team workspace using a paper theme, sidebar layout, compact density, modern type, sharp corners and a hidden hero. Prioritize actions. Include overview, filters, kanban and activity.'},
 {'id':'inbox-split','app':'inbox','prompt':'Create a support inbox with a cobalt theme, split layout, compact density, modern typography, soft corners and a small hero. Prioritize actions. Include overview, filters, messages and detail.'},
 {'id':'landing-premium','app':'landing','prompt':'Create a premium SaaS product landing page with a midnight theme, showcase layout, comfortable spacing, editorial type, soft corners and a large hero. Prioritize visuals. Include hero, features, pricing, FAQ and signup.'},
]


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def sha(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def api(base, path, payload=None):
    headers = {'Content-Type':'application/json'} if payload is not None else {}
    request = urllib.request.Request(base + path, data=canonical(payload).encode() if payload is not None else None, headers=headers)
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            return {'http_status':response.status, 'wall_ms':round((time.perf_counter()-started)*1000,1), 'response':json.load(response)}
    except urllib.error.HTTPError as error:
        data = error.read()
        try: parsed=json.loads(data)
        except json.JSONDecodeError: parsed={'error':'Non-JSON server error'}
        return {'http_status':error.code, 'wall_ms':round((time.perf_counter()-started)*1000,1), 'response':parsed}
    except (urllib.error.URLError,TimeoutError) as error:
        return {'http_status':None, 'wall_ms':round((time.perf_counter()-started)*1000,1), 'response':{'error':'API connection error: '+type(error).__name__}}


def failure_cost(run_dir, run_id):
    """Read ignored local logs for completed billable calls in failed pipelines."""
    if not isinstance(run_id,str) or len(run_id)!=32 or any(c not in '0123456789abcdef' for c in run_id):
        return None
    path=run_dir/(run_id+'.json')
    if not path.is_file(): return None
    record=json.loads(path.read_text())
    cost=0.0
    observed=False
    for call in record.get('calls',[]):
        if record.get('provider')=='jev':
            tokens=call.get('response',{}).get('usage',{}).get('input_tokens')
            if isinstance(tokens,int):cost += tokens * 0.042 / 1_000_000;observed=True
        elif record.get('provider')=='laya': observed=True
    for field in ['llm_response','rejected_response']:
        response=record.get(field,{})
        value=response.get('usage',{}).get('cost') if isinstance(response,dict) else None
        if isinstance(value,(int,float)):cost += value;observed=True
    return cost if observed else None


def summarize(slots):
    grouped=defaultdict(list)
    for slot in slots: grouped[slot['mode']].append(slot)
    modes={}
    for mode,rows in grouped.items():
        successful=[r for r in rows if r['status']=='PASS']
        times=[r['pipeline_server_ms'] for r in successful]
        modes[mode]={'attempts':len(rows),'valid_contract_results':len(successful),
          'failed':sum(r['status']=='FAIL' for r in rows),'skipped':sum(r['status']=='SKIPPED' for r in rows),
          'pipeline_server_ms':{'median':round(statistics.median(times),1),'min':min(times),'max':max(times)} if times else None,
          'aesthetic_quality':'NOT_RUN','interaction_success':'NOT_RUN'}
    return modes


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--base-url',default='http://127.0.0.1:8787')
    p.add_argument('--repeats',type=int,default=1)
    p.add_argument('--seed',type=int,default=20260922)
    p.add_argument('--case',action='append',dest='case_ids',help='Repeat flag to select a subset of fixed IDs')
    p.add_argument('--cases-file',type=Path,help='Optional preregistered [{id,app,prompt}] JSON, hashed before execution')
    p.add_argument('--output',type=Path)
    p.add_argument('--budget-usd',type=float,default=1.0)
    args=p.parse_args()
    parsed=urlsplit(args.base_url)
    if parsed.scheme!='http' or parsed.hostname not in {'localhost','127.0.0.1'} or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in {'','/'}:
        p.error('base URL must be the local HTTP model server')
    args.base_url=args.base_url.rstrip('/')
    if not 1<=args.repeats<=10: p.error('repeats must be between 1 and 10')
    if not 0<args.budget_usd<=5: p.error('budget-usd must be greater than zero and at most 5')
    cases=json.loads(args.cases_file.read_text()) if args.cases_file else CASES
    if not isinstance(cases,list) or not cases or any(not isinstance(c,dict) or set(c)!={'id','app','prompt'} or not all(isinstance(v,str) for v in c.values()) for c in cases):
        p.error('cases must contain id, app and prompt strings only')
    if len({c['id'] for c in cases})!=len(cases): p.error('case IDs must be unique')
    if args.case_ids:
        if set(args.case_ids)-{c['id'] for c in cases}: p.error('unknown case ID')
        cases=[c for c in cases if c['id'] in args.case_ids]
    health=api(args.base_url,'/api/health')
    h=health.get('response',{})
    if health['http_status']!=200 or not h.get('jev',{}).get('configured') or not h.get('laya',{}).get('ready') or not h.get('llm',{}).get('configured'):
        p.error('all three providers must be configured, with Laya ready, before sampling')
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    output=args.output or ROOT/'runs'/'benchmarks'/stamp
    output.mkdir(parents=True,exist_ok=False)
    rng=random.Random(args.seed)
    order=[]
    for repeat in range(args.repeats):
        for case in cases:
            providers=['jev','laya'];rng.shuffle(providers)
            for provider in providers:order.append({'case_id':case['id'],'repeat':repeat+1,'provider':provider})
    manifest={'created_at':stamp,'cases':cases,'cases_sha256':sha(cases),'order':order,'seed':args.seed,'repeats':args.repeats,
              'expected_result_slots':len(order)*2,'provider_health':h,'budget_usd':args.budget_usd,
              'protocol':'Sequential pipelines; a valid plan is shared between only and +LLM. No automatic retry. All result slots retained.',
              'scope':'API contract and timing only. No human aesthetic evaluation or browser interaction test.',
              'source_sha256':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in (ROOT/'server').glob('*.py')}}
    (output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    slots=[];attempts=[];cost_total=0.0;unknown_cost_attempts=0
    case_map={c['id']:c for c in cases}
    for index,entry in enumerate(order):
        case=case_map[entry['case_id']];provider=entry['provider'];context={**entry,'app':case['app']}
        # Reserve a conservative per-call allowance; no charge is initiated near the ceiling.
        if cost_total + unknown_cost_attempts*0.02 + 0.02 > args.budget_usd:
            for mode in [provider,provider+'+llm']:slots.append({**context,'mode':mode,'status':'SKIPPED','reason':'Local budget guard stopped the run'})
            continue
        body={'app':case['app'],'prompt':case['prompt'],'provider':provider}
        plan_attempt=api(args.base_url,'/api/plan',body);attempts.append({**context,'stage':'plan',**plan_attempt})
        plan=plan_attempt['response']
        if plan_attempt['http_status']!=200:
            cost=failure_cost(ROOT/'runs',plan.get('run_id'))
            if cost is None:unknown_cost_attempts+=1
            else:cost_total+=cost
            slots.append({**context,'mode':provider,'status':'FAIL','wall_ms':plan_attempt['wall_ms'],**plan})
            slots.append({**context,'mode':provider+'+llm','status':'SKIPPED','reason':'Planner failed','planner_run_id':plan.get('run_id')})
        else:
            cost=plan.get('cost_usd')
            if cost is None:unknown_cost_attempts+=1
            else:cost_total+=cost
            slots.append({**context,'mode':provider,'status':'PASS','run_id':plan['run_id'],'wall_ms':plan_attempt['wall_ms'],'pipeline_server_ms':plan['elapsed_ms'],'spec':plan['spec'],'standalone_cost_usd':cost})
            refine_body={'app':case['app'],'prompt':case['prompt'],'plan':plan}
            refined=api(args.base_url,'/api/refine',refine_body);attempts.append({**context,'stage':'refine',**refined})
            result=refined['response']
            if refined['http_status']==200:
                refinement_cost=result.get('cost_usd')
                if refinement_cost is None:unknown_cost_attempts+=1
                else:cost_total+=refinement_cost
                slots.append({**context,'mode':provider+'+llm','status':'PASS','run_id':result['run_id'],'planner_run_id':plan['run_id'],
                  'wall_ms':round(plan_attempt['wall_ms']+refined['wall_ms'],1),'pipeline_server_ms':round(plan['elapsed_ms']+result['elapsed_ms'],1),
                  'spec':result['spec'],'diff':result['diff'],'standalone_cost_usd':cost+refinement_cost if cost is not None and refinement_cost is not None else None})
            else:
                failed_cost=failure_cost(ROOT/'runs',result.get('run_id'))
                if failed_cost is None:unknown_cost_attempts+=1
                else:cost_total+=failed_cost
                slots.append({**context,'mode':provider+'+llm','status':'FAIL','planner_run_id':plan['run_id'],'wall_ms':round(plan_attempt['wall_ms']+refined['wall_ms'],1),**result})
        (output/'attempts.json').write_text(json.dumps(attempts,ensure_ascii=False,indent=2)+'\n')
        (output/'slots.json').write_text(json.dumps(slots,ensure_ascii=False,indent=2)+'\n')
        print(f"{index+1}/{len(order)} {case['id']} {provider}: {slots[-2]['status']} / {slots[-1]['status']}",flush=True)
    summary={'status':'COMPLETE','expected_slots':len(order)*2,'recorded_slots':len(slots),'modes':summarize(slots),
             'known_batch_cost_usd':round(cost_total,10),'attempts_with_unknown_cost':unknown_cost_attempts,
             'cost_note':'Each shared plan counted once. Jev uses a rate estimate; local hardware excluded. Mode standalone costs must not be summed as actual batch charges.',
             'quality_and_interactions':'NOT_RUN','performance_limit':'Sequential API sampler only. Browser render excluded. Cold inference may be present; inspect raw timings. No ranking claim.'}
    (output/'slots.json').write_text(json.dumps(slots,ensure_ascii=False,indent=2)+'\n')
    (output/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    print(output/'summary.json')

if __name__=='__main__':main()
