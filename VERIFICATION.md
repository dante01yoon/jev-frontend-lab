# Verification snapshot

Snapshot date: **2026-09-22**. This document separates executed checks from remaining work. A smoke result establishes that an individual path returned a valid result, not a performance ranking or a design-quality winner.

## Current gates

| Check | Status | Evidence and limit |
| --- | --- | --- |
| Backend security and contract tests | **PASS** | 13 tests recorded in [`server/smoke-evidence.json`](server/smoke-evidence.json), command `python -m unittest server.test_security -v`. Root reran the same 13 checks through `npm test` after integration, with all passing. |
| Jev only live provider path | **PASS** | One English stay-design request returned a validated specification through `jev-1.13.0`. |
| Laya only live provider path | **PASS** | The pinned multilingual model returned a validated specification using the installed Laya runtime on MPS. Some requested design attributes were missed; these are retained in the evidence. |
| Jev + LLM live path | **PASS** | The fixed Qwen3 Coder Next refinement returned a validated specification from the Jev plan. |
| Laya + LLM live path | **PASS** | The same refinement setup returned a validated specification from the Laya plan. |
| Frontend production build | **PASS** | TypeScript and Vite production build passed after final integration and scroll-pane fixes. |
| Browser interaction checks | **IN_PROGRESS** | Stay save and two-item comparison survived midnight/sidebar revision. Two shop products and the $313 total survived paper/grid revision. Remaining app checks are recorded during capture. |
| Responsive layout and visual inspection | **NOT_RUN** | Must inspect current desktop and narrow layouts, text clipping, scroll behavior and differences between modes. |
| Capture helper compilation | **PASS** | `capture-window.swift` compiled with Swift 6.3 without warnings on macOS 26.5.2. |
| Screen Recording access and window listing | **PASS** | Existing permission and filtered ScreenCaptureKit enumeration succeeded. This is preparation, not footage. |
| Video codec toolchain | **PASS** | ffmpeg/ffprobe 9.0.1 encoded, probed and fully decoded a synthetic 1-second 1920×1080 H.264 clip containing 30 frames. Synthetic codec output is not demo footage. |
| Actual demo capture | **PILOT PASS** | Real 14.775-second single-window capture: H.264 1920×1080, 434 frames, decode and sampled motion/framing passed. Main footage and continuous playback are separate. See [`scripts/CAPTURE.md`](scripts/CAPTURE.md). |
| Raw capture decode, motion, framing and privacy | **NOT_RUN** | Inspect the exact recorded file; generation or file presence alone does not satisfy these checks. |
| Continuous 1× video playback | **NOT_RUN** | Requires playback of the exact deliverable from start to finish; sampled frames do not count. |
| Edited video and narration/captions | **NOT_RUN** | Raw silent recording is distinct from an edited or narrated deliverable. |
| Candidate-file publication preflight | **PASS (bounded scan)** | 30 candidate text files scanned as described below; no matching credential or personal-path findings. |
| GitHub publication and anonymous readback | **NOT_RUN** | This preflight makes no Git mutations or publication claim. Verify the actual remote commit and public files after publishing. |
| Six-app API sampler | **PASS** | [24 real result slots](evidence/README.md), one repetition, all valid. Post-hoc JSON request matching is disclosed separately from aesthetics. |
| Full repeated performance benchmark | **NOT_RUN** | Full style/language/repetition matrix and human blind evaluation remain outside this development sample. |
| Human blind design-quality review | **NOT_RUN** | Required before making comparative quality claims. |

## Live smoke evidence

[`server/provider-manifest.json`](server/provider-manifest.json) freezes the tested models, Laya checkpoint, local runtime, provider settings, timeouts and decision protocol. [`server/smoke-evidence.json`](server/smoke-evidence.json) contains four results and their measured stages, usage, cost and returned UI specifications.

The Jev and Laya initial plans are each shared with their corresponding refinement. A refinement record's `elapsed_ms` and cost cover the refinement stage only; add its planner stage for the full pipeline. Batch accounting counts shared initial plans once. The Laya smoke includes first-inference warm-up, while loading is outside inference timing. The cloud round trip and warm local inference are different measurements. The total API cost is a development-run observation, with local hardware and electricity excluded.

The Laya-only smoke missed requested comfortable density, soft corners, visual emphasis and large hero. Refinement corrected those attributes in this example. This observation is preserved rather than interpreted as a general ranking.

## Bounded publication preflight

The scan covered source code, documentation, configuration, the package lock, `.env.example`, and the two curated backend evidence JSON files. It excluded Git internals, dependencies, the local Python environment, compiled output, caches, run logs and media. Those excluded materials are not approved by this scan for public inclusion.

Checks searched for common API-token prefixes, private-key markers, literal credential assignments, bearer credentials, JWT strings, email addresses, and personal absolute home-directory paths. Findings were reported only as category/file/line, never as matched values. **No pattern findings were detected in the 30 candidate text files.** This is a targeted scan, not a guarantee that arbitrary future files are safe.

`.gitignore` excludes local credential files (while permitting `.env.example`), the Python environment, raw run records, captures, video files, logs and build metadata. Both credential assignments in `.env.example` are empty; the remaining assignments are model/device defaults. Backend documentation uses generic environment-variable instructions. The publication-candidate evidence contains synthetic app data and model-run summaries, not authentication material or raw personal sessions.

Before the final push, inspect the actual staged file list, keep raw runtime records and capture metadata local, and recheck any files changed after this snapshot. After publication, read the exact GitHub commit and README anonymously. Update this file with concrete evidence as browser checks, recording and publication finish; do not carry preparation PASS labels over to those separate gates.
