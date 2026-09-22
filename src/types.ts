export type AppId =
  "stays" | "analytics" | "shop" | "board" | "inbox" | "landing";
export type Provider = "jev" | "laya";
export type Mode = Provider | "jev+llm" | "laya+llm";
export interface UISpec {
  app: AppId;
  title: string;
  subtitle: string;
  theme: "sand" | "paper" | "midnight" | "mint" | "rose" | "cobalt";
  layout: "editorial" | "sidebar" | "split" | "grid" | "compact" | "showcase";
  density: "comfortable" | "compact";
  typography: "editorial" | "modern" | "mono";
  corners: "soft" | "sharp";
  emphasis: "visual" | "data" | "actions";
  hero: "large" | "small" | "hidden";
  sections: string[];
  note: string;
}
export interface RunResult {
  run_id: string;
  provider: Mode;
  spec: UISpec;
  model: string;
  elapsed_ms: number;
  stages: { name: string; elapsed_ms: number }[];
  usage: Record<string, unknown>;
  cost_usd: number | null;
  raw: Record<string, unknown>;
  source: "LIVE";
  before?: UISpec;
  diff?: { field: string; before: unknown; after: unknown }[];
  planner_run_id?: string;
}
