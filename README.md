# Jev / Interface Lab

Six working frontend demos. Four real model pipelines. One shared component system.

Compare **Jev only**, **Laya only**, **Jev + LLM**, and **Laya + LLM** across stay discovery, revenue analytics, a homeware shop, a team board, a support inbox, and a SaaS landing page.

## What this experiment measures

Jev and Laya make two rounds of typed design decisions. A deterministic compiler creates a validated UI specification, and React renders a prepared component catalogue. The optional fixed LLM improves that specification. The inspector exposes original responses, usage, changed fields, and an exportable specification.

This is component composition, not arbitrary code generation. App behavior and illustrations are built beforehand. A prepared preview is explicitly labeled; a failed model call is never replaced by a fake result.

## Run locally

Requires Node.js 24+ and Python 3.12 in an environment with `laya==0.3.4` installed. Existing Laya installations can be reused.

```sh
npm ci
python server/prepare_laya.py
```

Set `TYPESAFE_API_KEY` and `OPENROUTER_API_KEY` in the server process environment, or point `DEMO_ENV_FILES` at an existing private credential file. The alias `OPEN_ROUTER_API_KEY` is also supported. Do not commit credentials.

```sh
# Terminal 1, using your Laya Python environment
python -m server.app --port 8787
# Terminal 2
npm run dev
```

Open http://127.0.0.1:5178. The provider server binds only to loopback. It loads Laya once before warm measurements. See [server documentation](server/README.md) for runtime details, fixed model/provider settings and security boundaries.

For a local production build:

```sh
npm run build
# Restart the provider server, then open http://127.0.0.1:8787
```

## Use the lab

1. Pick an app and edit its design brief.
2. Press **Compose all four**. Each planner result is shared between its only and +LLM panels.
3. Use the working app: filter stays, compare, add to cart, move tasks, resolve a conversation, or explore pricing.
4. Try a revision, then press **Revise current screens**. Every mode receives its own previous specification; user interaction state remains isolated per panel.
5. Inspect the specification, model response, changed fields and usage. Export the run or a React assembly wrapper.

All data is synthetic. Messages, signup and checkout controls are local demonstrations and do not send email or charge money.

## Fair comparison

- Shared fixtures, prompts, component catalogue, question builder, validators and refinement model.
- Jev `jev-1.13.0`; Laya multilingual pinned checkpoint; Qwen3 Coder Next via fixed Parasail/bf16 endpoint.
- UI wall time includes requests, rendering, and the process-wide LLM queue. LLM calls run one at a time; the queue wait is included in elapsed time and the 60-second timeout. No automatic retry or provider fallback. Use server stage timings for inference/network observations. Warm local inference is not directly equivalent to a cloud round trip.
- First-interactive time begins with the request and ends after the initial model specification is committed and painted. A prepared preview is excluded.
- A +LLM panel shows its planner cost plus refinement cost. A shared initial plan is counted once in batch totals. Local API cost excludes hardware and electricity. Missing provider cost is reported as unknown.
- Revisions require four independent plans because previous designs can differ. Failures and validation rejection remain visible and logged.
- No quality winner is claimed from a single run. The full repeated benchmark and human blind design review are separate from smoke tests.

## Verification and capture

```sh
npm run build
npm test
```

[Capture helper](scripts/CAPTURE.md) records only an explicitly selected demo window through macOS ScreenCaptureKit. Run logs and local media are ignored by Git. [Contract](CONTRACT.md) describes the typed interface. See [verification status](VERIFICATION.md), the [24-result API sample and filming evidence](evidence/README.md), and [manual browser interaction checks](evidence/browser-interactions.json). Six silent real-time clips capture initial composition, actual interaction and revision. Two HTTP 429 failures are retained. Clips 01–04 used concurrent LLM calls; clips 05–06 used the queued protocol, so their timings must not be pooled as one benchmark. Raw footage remains local; this repository contains curated measurements and capture tooling.

## Inspiration and primary sources

- [Jeverative UI](https://jeverative-ui.vercel.app/) and [Rahul’s demo](https://x.com/hckmstrrahul/status/2102040278937055404)
- [Jev API](https://docs.typesafe.ai/api) · [Jev models](https://docs.typesafe.ai/models)
- [Laya source](https://github.com/NandhaKishorM/laya) · [multilingual weights](https://huggingface.co/convaiinnovations/laya-multilingual)
- [Qwen3 Coder Next](https://openrouter.ai/qwen/qwen3-coder-next)

Independent experiment. No affiliation or performance ranking implied.
