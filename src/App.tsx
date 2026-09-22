import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Code2,
  Download,
  Expand,
  LayoutGrid,
  Loader2,
  Maximize2,
  RefreshCw,
  Timer,
  X,
  Zap,
} from "lucide-react";
import Preview from "./Preview";
import { APP_CATALOG, DEFAULT_SPECS } from "./catalog";
import type { AppId, Mode, Provider, RunResult, UISpec } from "./types";

const MODES: Mode[] = ["jev", "laya", "jev+llm", "laya+llm"];
const LABELS: Record<Mode, string> = {
  jev: "Jev only",
  laya: "Laya only",
  "jev+llm": "Jev + LLM",
  "laya+llm": "Laya + LLM",
};
type Card = {
  status: "prepared" | "planning" | "refining" | "done" | "error";
  result?: RunResult;
  draft?: RunResult;
  previous?: RunResult;
  instance?: string;
  submittedPrompt?: string;
  failureRunId?: string;
  error?: string;
  started?: number;
  readyMs?: number;
  finalMs?: number;
  wallMs?: number;
  paired?: boolean;
};
type Cards = Record<Mode, Card>;
type Health = {
  jev: { configured: boolean; model: string };
  laya: {
    available: boolean;
    ready: boolean;
    model: string;
    device: string;
    error?: string;
  };
  llm: { configured: boolean; model: string };
};
const fresh = (): Cards =>
  Object.fromEntries(MODES.map((m) => [m, { status: "prepared" }])) as Cards;
const prettyMs = (ms?: number) =>
  ms == null
    ? "—"
    : ms < 1000
      ? `${Math.round(ms)} ms`
      : `${(ms / 1000).toFixed(2)} s`;
const money = (v?: number | null) =>
  v == null ? "not reported" : `$${v.toFixed(6)}`;
class ApiError extends Error {
  runId?: string;
  constructor(message: string, runId?: string) {
    super(message);
    this.runId = runId;
  }
}
const failure = (e: unknown) => ({
  error: e instanceof Error ? e.message : String(e),
  failureRunId: e instanceof ApiError ? e.runId : undefined,
});
async function api<T>(
  route: string,
  body: unknown,
  signal: AbortSignal,
): Promise<T> {
  const r = await fetch(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = await r.json();
  if (!r.ok)
    throw new ApiError(
      typeof data.error === "string"
        ? data.error
        : JSON.stringify(data.error ?? data),
      data.run_id,
    );
  return data;
}
function download(name: string, contents: string, type = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([contents], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const afterPaint = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
export default function App() {
  const [app, setApp] = useState<AppId>("stays");
  const [prompt, setPrompt] = useState(APP_CATALOG.stays.prompt);
  const [allCards, setAllCards] = useState<Partial<Record<AppId, Cards>>>({});
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState<Mode | null>(null);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [film, setFilm] = useState(false);
  const [inspect, setInspect] = useState<Mode | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [session] = useState(() => {
    const key = "jev-lab-session";
    const value =
      sessionStorage.getItem(key) ?? `lab-${Date.now().toString(36)}`;
    sessionStorage.setItem(key, value);
    return value;
  });
  const liveStart = useRef(0);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const cards = allCards[app] ?? fresh();
  const cat = APP_CATALOG[app];
  function patch(target: AppId, mode: Mode, change: Partial<Card>) {
    setAllCards((prev) => ({
      ...prev,
      [target]: {
        ...(prev[target] ?? fresh()),
        [mode]: {
          ...(prev[target]?.[mode] ?? { status: "prepared" }),
          ...change,
        },
      },
    }));
  }
  async function getHealth() {
    try {
      const r = await fetch("/api/health");
      if (!r.ok) throw new Error("Provider server unavailable");
      setHealth(await r.json());
      setHealthError("");
    } catch {
      setHealthError("Start the provider server on port 8787.");
      setHealth(null);
    }
  }
  useEffect(() => {
    void getHealth();
  }, []);
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(
      () => setElapsed(performance.now() - liveStart.current),
      100,
    );
    return () => clearInterval(id);
  }, [busy]);
  useEffect(() => () => controller.current?.abort(), []);
  function selectApp(next: AppId) {
    if (busy) return;
    setApp(next);
    setPrompt(APP_CATALOG[next].prompt);
    setInspect(null);
  }
  async function compose(revise = false) {
    if (busy || !prompt.trim()) return;
    const target = app;
    const current = cards;
    const text = prompt;
    const token = ++generation.current;
    const abort = new AbortController();
    controller.current = abort;
    liveStart.current = performance.now();
    setBusy(true);
    setElapsed(0);
    setFocus(null);
    const start = performance.now();
    const valid = () => token === generation.current;
    const seed = (mode: Mode) =>
      revise
        ? (current[mode].result?.spec ??
          current[mode].draft?.spec ??
          current[mode].previous?.spec ??
          DEFAULT_SPECS[target])
        : undefined;
    MODES.forEach((mode) =>
      patch(target, mode, {
        status: "planning",
        submittedPrompt: text,
        failureRunId: undefined,
        instance: revise
          ? (current[mode].instance ?? "prepared")
          : `run-${Date.now()}-${token}`,
        previous:
          current[mode].result ?? current[mode].draft ?? current[mode].previous,
        result: undefined,
        draft: undefined,
        error: undefined,
        started: Date.now(),
        finalMs: undefined,
        readyMs: undefined,
        wallMs: undefined,
        paired: !revise,
      }),
    );
    const plan = async (provider: Provider, previous?: UISpec) =>
      api<RunResult>(
        "/api/plan",
        { app: target, prompt: text, provider, previous },
        abort.signal,
      );
    async function finishBase(mode: Mode, result: RunResult, done: boolean) {
      if (!valid()) return;
      patch(target, mode, {
        draft: result,
        result: done ? result : undefined,
        status: done ? "done" : "refining",
      });
      await afterPaint();
      if (valid()) {
        const ready = performance.now() - start;
        patch(target, mode, {
          readyMs: ready,
          ...(done ? { finalMs: ready, wallMs: ready } : {}),
        });
      }
    }
    async function refine(mode: Mode, result: RunResult, previous?: UISpec) {
      try {
        const enhanced = await api<RunResult>(
          "/api/refine",
          { app: target, prompt: text, plan: result, previous },
          abort.signal,
        );
        if (!valid()) return;
        patch(target, mode, { result: enhanced, status: "done" });
        await afterPaint();
        if (valid())
          patch(target, mode, {
            finalMs: performance.now() - start,
            wallMs: performance.now() - start,
          });
      } catch (e) {
        if (valid()) patch(target, mode, { status: "error", ...failure(e) });
      }
    }
    async function paired(provider: Provider) {
      const plus = `${provider}+llm` as Mode;
      try {
        const result = await plan(provider);
        await Promise.all([
          finishBase(provider, result, true),
          finishBase(plus, result, false),
        ]);
        await refine(plus, result);
      } catch (e) {
        if (valid())
          for (const mode of [provider, plus])
            patch(target, mode, { status: "error", ...failure(e) });
      }
    }
    async function independent(mode: Mode) {
      const provider = mode.startsWith("jev") ? "jev" : "laya";
      const previous = seed(mode);
      try {
        const result = await plan(provider, previous);
        const plus = mode.includes("+");
        await finishBase(mode, result, !plus);
        if (plus) await refine(mode, result, previous);
      } catch (e) {
        if (valid()) patch(target, mode, { status: "error", ...failure(e) });
      }
    }
    await Promise.allSettled(
      revise
        ? MODES.map(independent)
        : (["jev", "laya"] as Provider[]).map(paired),
    );
    if (valid()) {
      setBusy(false);
      void getHealth();
    }
  }
  function stop() {
    generation.current++;
    controller.current?.abort();
    setBusy(false);
    MODES.forEach((m) => {
      if (["planning", "refining"].includes(cards[m].status))
        patch(app, m, {
          status: "error",
          error:
            "Stopped in browser. A server request may still complete; see the run log.",
        });
    });
  }
  function exportRuns() {
    download(
      `${app}-interface-lab.json`,
      JSON.stringify(
        {
          app,
          current_editor_prompt: prompt,
          recorded_at: new Date().toISOString(),
          source: "browser-session",
          cards,
        },
        null,
        2,
      ),
    );
  }
  const selected = inspect ? cards[inspect] : undefined;
  const selectedSpec = selected?.result?.spec ?? selected?.draft?.spec;
  const hasResults = MODES.some(
    (m) => cards[m].result || cards[m].draft || cards[m].previous,
  );
  return (
    <div className={`lab ${film ? "film-mode" : ""}`}>
      <header className="lab-header">
        <a className="wordmark" href="/" aria-label="Interface Lab home">
          <span className="mark">
            j<span>↗</span>
          </span>
          <strong>
            jev<span>/ interface lab</span>
          </strong>
        </a>
        <div className="header-middle">A decision is just the beginning.</div>
        <div className="header-actions">
          <span className="edition">EXPERIMENT 001</span>
          <button onClick={() => setShowGuide(true)} className="quiet-button">
            <Code2 size={15} />
            How it works
          </button>
          <button onClick={() => setFilm(!film)} className="quiet-button">
            <Maximize2 size={15} />
            {film ? "Exit film mode" : "Film mode"}
          </button>
        </div>
      </header>
      <div className="lab-body">
        <aside className="control-panel">
          <div className="intro">
            <div className="eyebrow">
              <i />
              LIVE FRONTEND EXPERIMENT
            </div>
            <h1>
              One brief.
              <br />
              <em>Four possibilities.</em>
            </h1>
            <p>
              Compose working interfaces with Jev, Laya, and an optional LLM.
              See what changes. Measure what matters.
            </p>
          </div>
          <div className="section-label">
            <span>01 / PICK A PLAYGROUND</span>
            <span>6 APPS</span>
          </div>
          <nav className="app-picker" aria-label="App playground">
            {(Object.keys(APP_CATALOG) as AppId[]).map((id) => (
              <button
                key={id}
                disabled={busy}
                onClick={() => selectApp(id)}
                className={app === id ? "selected" : ""}
              >
                <span className="app-number">{APP_CATALOG[id].number}</span>
                <span>
                  <strong>{APP_CATALOG[id].name}</strong>
                  <small>{APP_CATALOG[id].category}</small>
                </span>
                {app === id ? (
                  <ArrowUpRight size={18} />
                ) : (
                  <span className="app-dot" />
                )}
              </button>
            ))}
          </nav>
          <div className="prompt-area">
            <label className="section-label" htmlFor="brief">
              02 / MAKE IT YOURS
            </label>
            <textarea
              id="brief"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={busy}
              rows={6}
              maxLength={1500}
              aria-label="Design brief"
            />
            <div className="prompt-helpers">
              <button disabled={busy} onClick={() => setPrompt(cat.prompt)}>
                Starting brief
              </button>
              <button disabled={busy} onClick={() => setPrompt(cat.revision)}>
                Try a revision ↗
              </button>
              <span>{prompt.length}/1500</span>
            </div>
            <button
              className="compose-button"
              disabled={busy || !prompt.trim()}
              onClick={() => compose(false)}
            >
              {busy ? (
                <Loader2 className="spin" size={19} />
              ) : (
                <Zap size={18} />
              )}
              <span>{busy ? "Composing live…" : "Compose all four"}</span>
              {busy ? (
                <span className="running-time">
                  {(elapsed / 1000).toFixed(1)}s
                </span>
              ) : (
                <ArrowRight size={19} />
              )}
            </button>
            <div className="secondary-actions">
              <button
                disabled={busy || !hasResults}
                onClick={() => compose(true)}
              >
                Revise current screens
              </button>
              {busy ? (
                <button onClick={stop}>Stop waiting</button>
              ) : (
                <button disabled={!hasResults} onClick={exportRuns}>
                  <Download size={13} />
                  Export run
                </button>
              )}
            </div>
          </div>
          <div className="connections">
            <div className="section-label">
              <span>PROVIDERS</span>
              <button aria-label="Refresh providers" onClick={getHealth}>
                <RefreshCw size={12} />
              </button>
            </div>
            <ProviderLine
              name="Jev API"
              ready={!!health?.jev.configured}
              text={health?.jev.model ?? "Not connected"}
            />
            <ProviderLine
              name="Laya local"
              ready={!!health?.laya.ready}
              text={
                health?.laya.ready
                  ? health.laya.device || "local"
                  : health?.laya.available
                    ? "Installed · loading on request"
                    : "Checking runtime"
              }
            />
            <ProviderLine
              name="LLM"
              ready={!!health?.llm.configured}
              text={health?.llm.model?.split("/").pop() ?? "Not connected"}
            />
            {healthError && <p className="health-error">{healthError}</p>}
          </div>
          <div className="lab-footnote">
            Shared components. Synthetic data.
            <br />
            Real model calls. No hidden fallback.
          </div>
        </aside>
        <main className="workspace">
          <div className="workspace-toolbar">
            <div>
              <span className="eyebrow">THE PLAYGROUND / {cat.number}</span>
              <h2>
                {cat.name}
                <span>↗</span>
              </h2>
            </div>
            <div className="view-controls">
              <div className="segmented">
                <button
                  className={viewport === "desktop" ? "active" : ""}
                  onClick={() => setViewport("desktop")}
                >
                  Desktop
                </button>
                <button
                  className={viewport === "mobile" ? "active" : ""}
                  onClick={() => setViewport("mobile")}
                >
                  Mobile
                </button>
              </div>
              <button
                className="icon-button"
                disabled={busy}
                aria-label={focus ? "Show all four" : "Focus Jev result"}
                onClick={() => setFocus(focus ? null : "jev")}
              >
                {focus ? <LayoutGrid size={18} /> : <Expand size={18} />}
              </button>
            </div>
          </div>
          {focus && (
            <div className="focus-tabs">
              {MODES.map((m) => (
                <button
                  key={m}
                  disabled={busy}
                  className={focus === m ? "active" : ""}
                  onClick={() => setFocus(m)}
                >
                  {LABELS[m]}
                </button>
              ))}
              <button disabled={busy} onClick={() => setFocus(null)}>
                <LayoutGrid size={14} />
                All four
              </button>
            </div>
          )}
          <div className={`preview-grid ${focus ? "focused" : ""}`}>
            {(focus ? [focus] : MODES).map((mode) => {
              const card = cards[mode];
              const spec =
                card.result?.spec ??
                card.draft?.spec ??
                card.previous?.spec ??
                DEFAULT_SPECS[app];
              const isPlus = mode.includes("+");
              const working = ["planning", "refining"].includes(card.status);
              const stage =
                card.status === "prepared"
                  ? "PREPARED PREVIEW"
                  : card.status === "planning"
                    ? "DECIDING"
                    : card.status === "refining"
                      ? "LLM REFINING"
                      : card.status === "error"
                        ? "FAILED"
                        : "LIVE RESULT";
              const cost =
                card.result?.cost_usd == null
                  ? null
                  : card.result.cost_usd +
                    (isPlus ? (card.draft?.cost_usd ?? 0) : 0);
              return (
                <section
                  className={`result-card ${card.status}`}
                  key={mode}
                  data-mode={mode}
                >
                  <div className="result-heading">
                    <div className="model-title">
                      <span
                        className={`provider-logo ${mode.startsWith("laya") ? "laya" : ""}`}
                      >
                        {mode.startsWith("jev") ? "j" : "l"}
                      </span>
                      <div>
                        <h3>
                          {LABELS[mode]}
                          {isPlus && (
                            <span className="plus-tag">DESIGN PASS</span>
                          )}
                        </h3>
                        <p>
                          {isPlus
                            ? "Decide → refine → render"
                            : "Decide → compose → render"}
                        </p>
                      </div>
                    </div>
                    <div className="result-actions">
                      <span
                        className={`state-badge ${card.status}`}
                        aria-live="polite"
                      >
                        {working ? (
                          <Loader2 size={10} className="spin" />
                        ) : card.status === "done" ? (
                          <i />
                        ) : null}
                        {stage}
                      </span>
                      <button
                        className="icon-button"
                        disabled={busy}
                        aria-label={`Expand ${LABELS[mode]}`}
                        onClick={() => setFocus(focus ? null : mode)}
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>
                  </div>
                  {card.status === "prepared" && (
                    <div className="prepared-strip">
                      Component system preview · press Compose for a real model
                      result
                    </div>
                  )}
                  {working && (
                    <div className="progress-strip">
                      <span />
                      {card.status === "planning"
                        ? card.previous
                          ? "Making new decisions · previous design remains visible…"
                          : "Making typed decisions from your brief…"
                        : "Initial plan is visible. The LLM is improving this design…"}
                    </div>
                  )}
                  {card.error && (
                    <div className="error-strip" role="alert">
                      <strong>
                        {card.draft
                          ? "Refinement failed · initial plan shown"
                          : card.previous
                            ? "Generation failed · previous design shown"
                            : "Generation failed"}
                      </strong>
                      <span>
                        {card.error}
                        {card.failureRunId && ` · Run ${card.failureRunId}`}
                      </span>
                    </div>
                  )}
                  <div className={`canvas-wrap ${viewport}`}>
                    <div className="canvas">
                      <Preview
                        key={`${app}-${mode}-${card.instance ?? "prepared"}`}
                        spec={spec}
                        instanceId={`${session}-${app}-${mode}-${card.instance ?? "prepared"}`}
                      />
                    </div>
                  </div>
                  <div className="result-metrics">
                    <div>
                      <span>FIRST INTERACTIVE</span>
                      <strong>{prettyMs(card.readyMs)}</strong>
                    </div>
                    <div>
                      <span>FINAL DESIGN</span>
                      <strong>{prettyMs(card.finalMs)}</strong>
                    </div>
                    <div>
                      <span>MODEL API COST</span>
                      <strong>
                        {card.status === "prepared" ? "—" : money(cost)}
                      </strong>
                    </div>
                    <button
                      disabled={!card.result && !card.draft}
                      onClick={() => setInspect(mode)}
                      aria-label={`Inspect ${LABELS[mode]}`}
                    >
                      <Code2 size={14} />
                      <span>
                        {card.result?.diff?.length
                          ? `${card.result.diff.length} changes`
                          : "Inspect"}
                      </span>
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
          <footer className="workspace-footer">
            <span>
              <Timer size={13} />
              Live wall time includes parallel requests and rendering. Server
              stage timings are stored separately.
            </span>
            <span>
              {hasResults
                ? "Shared plans count once in the batch bill."
                : "A prepared preview is not a generated result."}
            </span>
          </footer>
        </main>
      </div>
      {inspect && (
        <div className="modal-backdrop" onClick={() => setInspect(null)}>
          <section
            className="inspector"
            role="dialog"
            aria-modal="true"
            aria-label="Run inspector"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inspector-header">
              <div>
                <span className="eyebrow">PROVENANCE / REAL RESPONSE</span>
                <h2>{LABELS[inspect]}</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close inspector"
                onClick={() => setInspect(null)}
              >
                <X />
              </button>
            </div>
            <div className="inspector-summary">
              <span>
                Model{" "}
                <strong>
                  {selected?.result?.model ?? selected?.draft?.model}
                </strong>
              </span>
              <span>
                Run{" "}
                <code>
                  {selected?.result?.run_id ?? selected?.draft?.run_id}
                </code>
              </span>
              <span>
                Planning{" "}
                <strong>{prettyMs(selected?.draft?.elapsed_ms)}</strong>
              </span>
              {inspect.includes("+") && (
                <span>
                  Refinement{" "}
                  <strong>{prettyMs(selected?.result?.elapsed_ms)}</strong>
                </span>
              )}
            </div>
            <p className="inspector-note">
              The models select from an existing component system. The renderer
              supplies styling primitives and app behavior.{" "}
              {selected?.paired
                ? "This initial plan was shared between only and +LLM."
                : "This revision uses this mode’s own previous design."}
            </p>
            {!!selected?.result?.diff?.length && (
              <div className="diff-list">
                {selected.result.diff.map((d) => (
                  <div key={d.field}>
                    <code>{d.field}</code>
                    <span>{JSON.stringify(d.before)}</span>
                    <ArrowRight size={14} />
                    <strong>{JSON.stringify(d.after)}</strong>
                  </div>
                ))}
              </div>
            )}
            <details open>
              <summary>Final UISpec</summary>
              <pre>{JSON.stringify(selectedSpec, null, 2)}</pre>
            </details>
            <details>
              <summary>Original model response & usage</summary>
              <pre>
                {JSON.stringify(
                  {
                    plan: selected?.draft,
                    refinement: inspect.includes("+")
                      ? selected?.result
                      : undefined,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
            <div className="inspector-downloads">
              <button
                onClick={() =>
                  download(
                    `${app}-${inspect}-spec.json`,
                    JSON.stringify(selectedSpec, null, 2),
                  )
                }
              >
                <Download size={15} />
                UISpec JSON
              </button>
              <button
                onClick={() =>
                  download(
                    "ComposedApp.tsx",
                    `// Requires the Interface Lab component registry. This wrapper is exported by code, not written by Jev.\nimport Preview from './Preview'\nimport type { UISpec } from './types'\nconst spec: UISpec = ${JSON.stringify(selectedSpec, null, 2)}\nexport default function ComposedApp(){ return <Preview spec={spec} instanceId="exported-app"/> }\n`,
                    "text/plain",
                  )
                }
              >
                <Code2 size={15} />
                React assembly
              </button>
            </div>
          </section>
        </div>
      )}
      {showGuide && (
        <div className="modal-backdrop" onClick={() => setShowGuide(false)}>
          <section
            className="guide"
            role="dialog"
            aria-modal="true"
            aria-label="How it works"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button guide-close"
              aria-label="Close guide"
              onClick={() => setShowGuide(false)}
            >
              <X />
            </button>
            <div className="eyebrow">WHAT THE MODEL ACTUALLY DOES</div>
            <h2>
              Fast decisions.
              <br />
              <em>Working interfaces.</em>
            </h2>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <h3>You describe the design.</h3>
                  <p>
                    The same brief, data and component catalogue go to Jev and
                    local Laya.
                  </p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>The model makes typed choices.</h3>
                  <p>
                    Layout, theme, hierarchy and sections become a validated UI
                    specification. Existing React components supply behavior.
                  </p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>Optional: a second design pass.</h3>
                  <p>
                    The same LLM can improve the composition. Every changed
                    field is visible in the inspector.
                  </p>
                </div>
              </li>
              <li>
                <span>04</span>
                <div>
                  <h3>Use it. Change it. Measure it.</h3>
                  <p>
                    Filter, compare, add to cart and move tasks. Revise your
                    design without losing state.
                  </p>
                </div>
              </li>
            </ol>
            <p className="guide-boundary">
              This is component composition, not unrestricted code generation.
              Prepared previews and failed calls are labeled. Local compute is
              not zero-cost infrastructure.
            </p>
            <button
              className="compose-button"
              onClick={() => setShowGuide(false)}
            >
              Explore the lab <ArrowRight size={18} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
function ProviderLine({
  name,
  ready,
  text,
}: {
  name: string;
  ready: boolean;
  text: string;
}) {
  return (
    <div className="provider-line">
      <span className={ready ? "connection-dot ready" : "connection-dot"} />
      <strong>{name}</strong>
      <span title={text}>{text}</span>
    </div>
  );
}
