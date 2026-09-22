# Verification snapshot

Snapshot date: **2026-09-22**. Executed checks, manual observations and unfinished work are separated below. A valid model response establishes an individual path, not a performance ranking or design-quality winner. Browser observations were supplied by the recording operator during live filming; they are not automated tests.

## Current gates

| Check | Status | Evidence and limit |
| --- | --- | --- |
| Backend security, contract and concurrency tests | **PASS** | 15 offline tests passed after the process-wide LLM queue change, including concurrent-request serialization, wait-time accounting and lock release after a simulated 429. The earlier 13-test result remains historical smoke evidence in [`server/smoke-evidence.json`](server/smoke-evidence.json). |
| Jev only live provider path | **PASS** | The fixed `jev-1.13.0` returned validated specifications in the initial smoke and six-app API sample. |
| Laya only live provider path | **PASS** | The pinned multilingual checkpoint returned validated specifications on MPS. Missed design attributes remain in the evidence. |
| Jev + LLM live path | **PASS (bounded)** | The fixed Qwen3-Coder-Next refinement succeeded in the smoke and sequential sample. An initial live filming request also returned HTTP 429; success here does not imply every live call passed. |
| Laya + LLM live path | **PASS (bounded)** | The same refinement setup succeeded in the smoke and sequential sample. A board revision during live filming returned HTTP 429 and preserved the previous screen. |
| Frontend production build | **PASS** | TypeScript and Vite production build passed after integration and scroll-pane fixes, as verified by the coordinating operator. |
| Browser interaction checks | **PARTIAL PASS (bounded)** | All six app paths were observed. Stays, analytics, shop, inbox and landing retained checked state through successful revisions. Board task/filter state survived a failed refinement; successful board refinement is not claimed. See [`evidence/browser-interactions.json`](evidence/browser-interactions.json). |
| Responsive layout and visual inspection | **PARTIAL** | Desktop screens and mobile views for stays and landing were inspected during filming; landing was viewed at 390-pixel width. The complete viewport, clipping, scrolling, keyboard and accessibility matrix remains **NOT_RUN**. |
| Capture helper compilation | **PASS (historical preparation)** | The capture helper compiled with Swift 6.3 without warnings on macOS 26.5.2. |
| Screen Recording access and window listing | **PASS (preparation)** | Existing permission and filtered ScreenCaptureKit enumeration succeeded. This does not establish footage quality. |
| Video codec toolchain | **PASS (synthetic preparation)** | ffmpeg/ffprobe 9.0.1 encoded, probed and fully decoded a synthetic one-second 1920×1080 H.264 clip with 30 frames. |
| Actual demo capture | **PASS** | All six raw app recordings and clean viewing copies are complete. The 12:41.833 silent chaptered MP4 preserves source time, model waits and failures; it is distinct from a narrated final video. |
| Clean capture decode and sampled privacy/framing | **PASS (bounded)** | All six raw and clean recordings, plus the 22,855-frame combined MP4, passed full decode and timestamp checks. Sampled privacy/framing checks passed; all 10 frames bordering five joins matched their source clips. See [media verification](evidence/media-verification.json). These checks do not establish continuous playback. |
| Continuous 1× video playback | **PASS (six-clip playlist)** | All six exact clean clips reached `ended=true` at 1× with zero seeks or rate changes, 13:03:51–13:16:33 UTC. Final video error was null. [Receipt](evidence/media-verification.json). The concatenated MP4 was decoded and its joins verified, but was not separately played from start to end. |
| Edited final video, narration and captions | **NOT_RUN** | Raw silent recordings and clean screen clips are distinct from an edited, narrated final video. |
| Candidate-file publication preflight | **PASS (bounded scan)** | All 45 current tracked and non-ignored candidate text files were scanned for credential prefixes, literal bearer tokens, private-key markers, JWTs, credential assignments and personal home paths. No matching findings. This is a targeted scan, not a general guarantee. |
| Initial GitHub publication and anonymous readback | **PASS** | [Public repository](https://github.com/dante01yoon/jev-frontend-lab), initial commit [`33c469d`](https://github.com/dante01yoon/jev-frontend-lab/commit/33c469d). [CI run 35729681082](https://github.com/dante01yoon/jev-frontend-lab/actions/runs/35729681082) succeeded; anonymous readback was verified by the coordinating operator. |
| Subsequent commit publication | **CHECK CURRENT HEAD** | The initial receipt above covers that exact commit. [Main history](https://github.com/dante01yoon/jev-frontend-lab/commits/main/) and [CI](https://github.com/dante01yoon/jev-frontend-lab/actions/workflows/verify.yml) expose subsequent publication status; this document does not treat the initial receipt as verification of later commits. |
| Six-app sequential API sampler | **PASS** | [24 real result slots](evidence/README.md), one repetition, all valid. Post-hoc JSON request matching is separate from aesthetics and browser interaction. |
| Full repeated performance benchmark | **NOT_RUN** | The complete style/language/repetition matrix remains outside this development sample. |
| Human blind design-quality review | **NOT_RUN** | Required before making comparative aesthetic-quality claims. |

## Observed app interactions

The [structured browser evidence](evidence/browser-interactions.json) records exact bounded observations and limits. Named records are synthetic demo fixtures.

- **Stays / Jev:** The Stillwater House was saved; The Stillwater House and Pine & Timber were selected for comparison. Saved/selected state remained after the dark/sidebar revision. The mobile view was inspected.
- **Analytics / Jev:** The 7-day view showed Customers **767**. The Organic filter showed **2 transactions totaling $178**. Period and filter state remained after the midnight revision.
- **Shop / Jev:** The Sound category and cart containing two headphones plus one speaker showed **quantity 3, total $527**. Cart state remained after the paper/grid revision.
- **Board / Laya + LLM:** ORB25 moved to Done; ORB32 “Ship the live frontend demo” was created; the Engineering filter remained. Refinement returned **HTTP 429**, and the original specification and state were preserved. This is evidence of failure handling, not a successful refinement.
- **Inbox / Jev + LLM:** Taylor Park was selected, a literal local reply saved and the conversation resolved. All four revision paths succeeded. Taylor Park, the Reopen action and the saved reply remained. No external message was sent.
- **Landing / Laya + LLM:** Ship and Monthly were selected; monthly prices showed **$15 Together / $30 Studio**. The “Can design change” FAQ was expanded and a workspace created locally. All four initial and revision paths returned LIVE results. After revision, Ship and Monthly remained selected, and the Welcome heading and expanded FAQ remained. The FAQ and workspace were visually inspected at 390-pixel mobile width.

These checks do not exhaust all modes, controls, data combinations or responsive breakpoints.

## Live model evidence and timing limits

[`server/provider-manifest.json`](server/provider-manifest.json) records the initial smoke models, Laya checkpoint, runtime and provider settings. [`server/smoke-evidence.json`](server/smoke-evidence.json) retains four initial results with measured stages, usage, cost and returned specifications.

The Jev and Laya initial plans are each shared with their corresponding refinement. A refinement record's elapsed time and cost cover refinement only; the full pipeline also includes its planner stage. Batch accounting counts shared plans once. The Laya smoke includes first-inference warm-up, while loading is outside inference timing. Hosted round-trip time and local inference are different measurements. Local hardware and electricity are excluded from the recorded API cost.

The Laya-only smoke missed comfortable density, soft corners, visual emphasis and a large hero. Refinement corrected those attributes in that example. This is not a general model ranking.

Two live filming refinements returned HTTP 429. Their original failures were retained. Concurrent requests to the fixed provider were a possible cause, not a proven diagnosis. The subsequent server protocol limits LLM HTTP calls to one per process, with queue waiting included in reported elapsed time and separated in raw transport metadata. It introduces no retry, fallback or provider change. Earlier simultaneous filming timings and subsequent queued timings must remain distinguishable. The sequential 24-slot sample is also a separate measurement setting.

## Publication scope

The historical scan covered source code, documentation, configuration, package lock, empty credential examples and curated backend evidence. It excluded dependencies, runtime environments, raw run records, capture metadata and media. **No pattern findings were detected in those 30 candidate text files.** This targeted result does not approve arbitrary later files.

Ignored credentials, local runtimes, raw logs and private capture metadata remain outside the public evidence scope. Curated browser evidence contains only synthetic-app observations and test limitations, without local filesystem paths, account usernames, reply content or capture-session metadata.

The final candidate scan covered 45 text files and found no matching credential or personal-home-path patterns. Raw runtime and capture records remain excluded. Exact commit and CI status must still be assessed from the public repository; an older publication receipt does not verify newer commits.
