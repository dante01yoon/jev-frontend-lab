# Implementation contract

This file is the shared integration contract for parallel work. Actual model calls only; blocked providers must report errors, never claim rule-based output came from a model.

App IDs: `stays`, `analytics`, `shop`, `board`, `inbox`, `landing`.

UISpec JSON (all fields required):
```
{
  "app": "stays",
  "title": "Weekend, elsewhere.",
  "subtitle": "Find a place worth slowing down for.",
  "theme": "sand", // sand | paper | midnight | mint | rose | cobalt
  "layout": "editorial", // editorial | sidebar | split | grid | compact | showcase
  "density": "comfortable", // comfortable | compact
  "typography": "editorial", // editorial | modern | mono
  "corners": "soft", // soft | sharp
  "emphasis": "visual", // visual | data | actions
  "hero": "large", // large | small | hidden
  "sections": ["filters", "results", "compare"],
  "note": "A short grounded description of the screen"
}
```

Allowed sections per app:
- stays: filters, results, compare, saved
- analytics: kpis, chart, transactions, breakdown
- shop: categories, products, cart, benefits
- board: overview, filters, kanban, activity
- inbox: overview, filters, messages, detail
- landing: hero, features, pricing, faq, signup

Defaults live in `src/catalog.ts` exported `APP_CATALOG` record and `DEFAULT_SPECS`. Main root owns src/types.ts and catalog.ts.

Python API (127.0.0.1:8787) with Vite proxy /api:
- GET /api/health -> {jev:{configured:boolean,model:string},laya:{available:boolean,ready:boolean,model:string,device:string,error?:string},llm:{configured:boolean,model:string}}
- POST /api/plan {app,prompt,provider:'jev'|'laya',previous?:UISpec} -> {run_id,provider,spec:UISpec,model,elapsed_ms,stages:[{name,elapsed_ms}],usage,cost_usd:number|null,raw:object,source:'LIVE'}
- POST /api/refine {app,prompt,plan:<entire plan response>,previous?:UISpec} -> same result shape plus {before:UISpec,diff:[{field,before,after}],planner_run_id}, provider 'jev+llm'/'laya+llm'. elapsed_ms is LLM stage only; main root adds actual plan elapsed in display. Usage/cost only current stage.
- errors JSON {error,provider?,run_id?}, non-2xx.
- GET /api/runs -> safe log summary (optional).
Backend validates all fields/enums/app-specific section allowlist. Request max 32KB. No external code execution. Dist public only; no .env or arbitrary FS reads. Allow server from loopback only. Exact local runtime/weights must be discovered, no forced reinstall if installed.

Renderer: `src/Preview.tsx` default export `Preview({spec, instanceId}:{spec:UISpec,instanceId:string})`. It owns actual React app interaction state, survives spec changes via stable instanceId. Use scoped .preview CSS and data-theme/layout/density/...; no global body styles. Real behavior for each app, no external service writes. LocalStorage keys instance-specific. Include explicit synthetic-data label. Export enough deterministic fixture data for tests if useful. No network calls from Preview itself.

Root owns orchestration shell, catalog/types, Vite/package setup, README, publication and capture. Provider worker owns server/ and provider scripts. Renderer worker owns Preview.tsx, preview.css and fixtures. QA/recording helper owns own scripts/ files only when assigned.
