# Six-app API smoke evidence

This snapshot contains **24 actual API result slots: six fixed English prompts, one repetition, four modes**. All 24 returned a valid UISpec. That contract result does **not** mean the requested design was followed, the rendered screen looked good, or its interactions worked.

The run manifest was recorded at `20260922T124354Z`. Prompts and their execution order were saved and hashed before requests were made. The request-matching rubric below was added **after the run**; it is a disclosed post-hoc analysis, not a preregistered quality benchmark.

## Files and provenance

- [Manifest](six-app-smoke/manifest.json): the exact six prompts, their hash, order, model/runtime metadata, budget and source hashes.
- [Result slots](six-app-smoke/slots.json): all 24 results, including run IDs, planner linkage, final UISpec, changes, timing and per-mode cost allocation.
- [Original summary](six-app-smoke/summary.json): contract status, API timings and batch cost accounting.
- [Post-hoc request matching](six-app-smoke/request-adherence.json): expected values, every comparison, mismatches and aggregate counts.
- [Offline analysis script](analyze_request_adherence.py): reproduces the matching analysis without models, a browser or network access.

The three source snapshots were reviewed for credentials, private local paths and unrelated data. No fields needed removal: they are byte-identical to their local source files, and their SHA-256 hashes are recorded in `request-adherence.json`. Full raw `attempts.json` and private run logs are not included. Source-file hashes in the manifest describe the code used for that run, not a guarantee that the current checkout has identical source.

## What was checked

Each prompt explicitly names seven design properties: `theme`, `layout`, `density`, `typography`, `corners`, `hero` and `emphasis`. Each property receives one exact enum-equality check. The eighth check, `sections_presence`, passes only when **all explicitly requested section IDs are present**. Every case therefore has eight checks; every mode has 48.

The only language normalization is the prompt's direct mapping to catalogue terms: serif headings/editorial type → `editorial` typography; modern type → `modern`; photographs/visuals → `visual` emphasis; KPIs → `kpis`; FAQ → `faq`. The expected values for all six cases are written out in the script and result JSON.

Requested-section coverage is also reported independently as individual IDs: 24 requested IDs per mode across the six prompts. Section order and extra unrequested sections are **not scored**, because these prompts ask for inclusion without requiring an exclusive list or exact order. For example, Jev's extra `saved` section on the stay case does not fail requested-section presence.

These are UISpec JSON checks. They do not verify rendered CSS, actual photos, breakpoint behavior, copy accuracy, accessibility, interaction behavior or aesthetic quality. A value such as `layout="sidebar"` matching the prompt does not prove that the browser rendered a successful sidebar.

## Per-mode request matching

| Mode | Valid API contracts | Exact style fields | Requested section IDs present | Cases with every requested section | Matched checks | Cases matching all eight |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Jev only | 6/6 | 42/42 | 24/24 | 6/6 | 48/48 | 6/6 |
| Laya only | 6/6 | 27/42 | 20/24 | 3/6 | 30/48 | 0/6 |
| Jev + LLM | 6/6 | 42/42 | 24/24 | 6/6 | 48/48 | 6/6 |
| Laya + LLM | 6/6 | 42/42 | 24/24 | 6/6 | 48/48 | 6/6 |

| Case | Jev only | Laya only | Jev + LLM | Laya + LLM | Laya-only mismatches |
| --- | ---: | ---: | ---: | ---: | --- |
| Stay discovery | 8/8 | 4/8 | 8/8 | 8/8 | `corners`, `hero`, `emphasis`; missing `compare` |
| Revenue dashboard | 8/8 | 6/8 | 8/8 | 8/8 | `layout`, `emphasis` |
| Homeware shop | 8/8 | 6/8 | 8/8 | 8/8 | `corners`, `hero` |
| Team workspace | 8/8 | 5/8 | 8/8 | 8/8 | `layout`, `hero`; missing `overview` |
| Support inbox | 8/8 | 4/8 | 8/8 | 8/8 | `layout`, `corners`, `hero`; missing `overview`, `messages` |
| SaaS landing | 8/8 | 5/8 | 8/8 | 8/8 | `density`, `corners`, `hero` |

In this batch, the LLM stage corrected all 15 scalar mismatches in Laya's initial specs and restored four missing requested section IDs. Jev's initial specs already matched these checks, so its LLM stage did not increase this particular count. Copy edits and changes to section order are visible in the recorded diffs but receive no credit in this rubric.

## Recorded API timing and cost

| Mode | Median server pipeline time | Observed range |
| --- | ---: | ---: |
| Jev only | 648.0 ms | 606.3–712.5 ms |
| Laya only | 159.3 ms | 81.2–1,074.9 ms |
| Jev + LLM | 3,075.7 ms | 2,459.6–3,715.0 ms |
| Laya + LLM | 2,789.4 ms | 2,180.3–4,116.6 ms |

These are the original summary's six observations per mode. The +LLM values add the shared planner time to the refinement time. Pipelines ran sequentially, and browser rendering is excluded. Remote API round trips and local inference run through different systems; initial inference overhead may affect the range. These values are not a p95, a browser first-interactive measurement, or a general speed ranking.

Recorded known batch cost: **$0.002291776**, with zero attempts whose cost was unknown. This combines Jev's published-rate estimate and OpenRouter's returned usage cost, counting each shared plan once. It is not a billing invoice. Local Laya hardware and electricity are excluded. Summing the four modes' standalone allocated costs would double-count shared planner calls.

Models: Jev `jev-1.13.0`; Laya `convaiinnovations/laya-multilingual` at revision `052592a15d198d9ad47da779604259b10b47b7aa`, MPS/float32; Qwen3 Coder Next through the fixed `parasail/bf16` endpoint. Full runtime versions are in the manifest.

## Reproduce the offline analysis

From the demo root:

```sh
python3 evidence/analyze_request_adherence.py
```

The script verifies the original prompt hash and 24 unique result slots, then writes `six-app-smoke/request-adherence.json`. It never reruns a paid model or opens the UI.

## Limits of this evidence

- These six prompts use catalogue vocabulary explicitly. They are a narrow contract-and-request smoke check, not a broad natural-language design benchmark.
- There is one sample per app and mode. This snapshot is not the planned repeated 18-brief evaluation and does not establish statistical superiority.
- The scoring rubric was defined after observing the run. The complete expected mapping and all case-level mismatches are exposed for review.
- No human aesthetic assessment or browser interaction test was performed as part of this batch or this analysis. Both remain **NOT_RUN for this evidence**. Separate browser or filming evidence must be identified independently.
- There is no LLM-only control. The data cannot show that adding Jev or Laya improves an LLM-only pipeline.
