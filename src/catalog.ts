import type { AppId, UISpec } from "./types";
export const APP_CATALOG: Record<
  AppId,
  {
    name: string;
    brand: string;
    category: string;
    number: string;
    prompt: string;
    revision: string;
    sections: string[];
  }
> = {
  stays: {
    name: "Stay discovery",
    brand: "Elsewhere",
    category: "Travel & comparison",
    number: "01",
    prompt:
      "Create a travel magazine-inspired stay discovery interface. Use warm sand, big photographs, generous spacing and editorial typography. Show search filters, the stay results and a comparison tray. Make prices easy to scan.",
    revision:
      "Make this a compact dark interface with a sidebar layout, modern typography and data-first cards. Keep my selected stays and filters.",
    sections: ["filters", "results", "compare", "saved"],
  },
  analytics: {
    name: "Revenue dashboard",
    brand: "Forma Analytics",
    category: "Data & operations",
    number: "02",
    prompt:
      "Create a crisp revenue dashboard for an operations team. Use a light paper theme, compact density, modern type and a grid layout. Prioritize KPI numbers, a revenue chart, transactions and a category breakdown.",
    revision:
      "Switch to a spacious midnight theme with a split layout. Keep the revenue chart and transaction data, and make the key numbers more prominent.",
    sections: ["kpis", "chart", "transactions", "breakdown"],
  },
  shop: {
    name: "Studio storefront",
    brand: "Objects & Co.",
    category: "Commerce & checkout",
    number: "03",
    prompt:
      "Design an independent homeware shop with a warm rose theme and oversized editorial type. Use a showcase layout, beautiful product cards, category filters and a visible cart. Give the page generous whitespace.",
    revision:
      "Make the shop more practical: a paper theme, compact grid, modern typography and a small hero. Keep my cart and product options.",
    sections: ["categories", "products", "cart", "benefits"],
  },
  board: {
    name: "Team workspace",
    brand: "Sprint",
    category: "Tasks & state",
    number: "04",
    prompt:
      "Design a focused kanban workspace for a small product team. Use paper, compact density, modern typography and sharp corners. Show overview, assignee filters, kanban columns and recent activity.",
    revision:
      "Give this workspace a mint theme with comfortable spacing and soft corners. Keep all tasks, their status and assignees.",
    sections: ["overview", "filters", "kanban", "activity"],
  },
  inbox: {
    name: "Support inbox",
    brand: "Relay",
    category: "Messages & workflow",
    number: "05",
    prompt:
      "Create a clean two-panel support inbox using a split layout and cobalt theme. Use modern typography, compact rows and subtle corners. Show overview, filters, message list and selected message details.",
    revision:
      "Switch to a warm paper interface, editorial headings and comfortable spacing. Keep the selected conversation and its resolution state.",
    sections: ["overview", "filters", "messages", "detail"],
  },
  landing: {
    name: "Product landing",
    brand: "Flowstate",
    category: "Brand & conversion",
    number: "06",
    prompt:
      "Create a premium SaaS landing page for Flowstate, a team planning tool. Use a midnight theme, large hero, editorial typography, generous space and a showcase layout. Include features, pricing, FAQ and a signup form.",
    revision:
      "Make it light and minimalist: paper theme, modern typography, sharp corners and an editorial layout. Keep pricing, FAQ and signup working.",
    sections: ["hero", "features", "pricing", "faq", "signup"],
  },
};
export const DEFAULT_SPECS = Object.fromEntries(
  Object.entries(APP_CATALOG).map(([app, x]) => [
    app,
    {
      app,
      title: x.brand,
      subtitle: x.category,
      theme:
        app === "landing"
          ? "midnight"
          : app === "stays"
            ? "sand"
            : app === "shop"
              ? "rose"
              : "paper",
      layout:
        app === "inbox" ? "split" : app === "analytics" ? "grid" : "editorial",
      density: app === "board" || app === "inbox" ? "compact" : "comfortable",
      typography:
        app === "stays" || app === "shop" || app === "landing"
          ? "editorial"
          : "modern",
      corners: "soft",
      emphasis: app === "analytics" ? "data" : "visual",
      hero: "large",
      sections: x.sections,
      note: "Prepared component preview. No model has been called.",
    },
  ]),
) as Record<AppId, UISpec>;
