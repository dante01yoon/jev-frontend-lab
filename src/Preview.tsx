import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { UISpec } from "./types";
import {
  STAYS,
  PRODUCTS,
  TASKS,
  MESSAGES,
  TRANSACTIONS,
  REVENUE,
  type Stay,
  type Product,
  type Task,
} from "./fixtures";
import "./preview.css";

type IconName =
  | "arrow"
  | "search"
  | "heart"
  | "check"
  | "plus"
  | "minus"
  | "close"
  | "sun"
  | "bag"
  | "grid"
  | "chevron"
  | "spark"
  | "chart"
  | "inbox"
  | "leaf"
  | "bolt"
  | "clock"
  | "message"
  | "filter";
function Icon({
  name,
  size = 18,
  ...props
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const paths: Record<IconName, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    ),
    check: <path d="m5 12 4 4L19 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" />
      </>
    ),
    bag: (
      <>
        <path d="M5 7h14l1 14H4L5 7Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    chevron: <path d="m8 5 7 7-7 7" />,
    spark: (
      <path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7L12 2Z" />
    ),
    chart: (
      <>
        <path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4" />
      </>
    ),
    inbox: (
      <>
        <path d="m5 4-3 9v7h20v-7l-3-9H5Z" />
        <path d="M2 13h6l2 3h4l2-3h6" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 3C5 1 1 10 5 16s16 4 15-13Z" />
        <path d="M4 21 16 9" />
      </>
    ),
    bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    message: <path d="M21 11a8 8 0 0 1-8 8H7l-5 3V11a9 9 0 0 1 19 0Z" />,
    filter: (
      <>
        <path d="M4 6h16M7 12h10M10 18h4" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const cls = (...s: (string | false | undefined)[]) =>
  s.filter(Boolean).join(" ");

/** Original inline illustrations: consistent offline rendering and no image licensing ambiguity. */
function StayArt({ stay }: { stay: Stay }) {
  const uid = useId().replaceAll(":", "");
  const desert = stay.kind === "desert",
    cabin = stay.kind === "cabin",
    city = stay.kind === "city";
  const bg = desert
    ? "#e7cba7"
    : cabin
      ? "#bdc6b0"
      : city
        ? "#c4c9c3"
        : "#b4cad0";
  return (
    <svg
      className="pv-stay-art"
      viewBox="0 0 600 400"
      role="img"
      aria-label={`Illustration of ${stay.name}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x2="0" y2="1">
          <stop stopColor={bg} />
          <stop offset="1" stopColor="#f7ecdb" />
        </linearGradient>
        <linearGradient id={`${uid}-glass`}>
          <stop stopColor="#586860" />
          <stop offset="1" stopColor="#9aaf9d" />
        </linearGradient>
        <pattern
          id={`${uid}-wood`}
          width="16"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 2h16" stroke="#624b35" strokeOpacity=".24" />
        </pattern>
      </defs>
      <rect width="600" height="400" fill={`url(#${uid}-sky)`} />
      <circle cx="465" cy="82" r="40" fill="#fff8df" opacity=".8" />
      {!city && (
        <>
          <path
            d="M0 196 83 126l99 76 102-47 99 65 82-52 135 47v185H0Z"
            fill={desert ? "#c69c76" : cabin ? "#81907c" : "#86a6a8"}
          />
          <path
            d="M0 262 120 191l152 84 127-75 201 65v135H0Z"
            fill={desert ? "#b68462" : cabin ? "#617c64" : "#628c94"}
          />
        </>
      )}
      {!desert && !city && (
        <g fill={cabin ? "#334f42" : "#536f58"}>
          <path d="m75 74-40 150h80Zm-35 126h69l25 73H17ZM530 94l-40 158h81Zm-31 115h62" />
          <path d="m537 176-58 130h117Z" />
        </g>
      )}
      {city && (
        <g fill="#8f9b8f">
          <rect x="30" y="107" width="90" height="210" />
          <rect x="473" y="144" width="127" height="200" />
          <rect x="432" y="79" width="60" height="270" />
        </g>
      )}
      <path
        d="M0 333c165-60 304-13 600-49v116H0Z"
        fill={
          desert ? "#d2b18a" : cabin ? "#7f8969" : city ? "#a5a895" : "#a9b795"
        }
      />
      <ellipse
        cx="298"
        cy="340"
        rx="191"
        ry="31"
        fill="#273e33"
        opacity=".17"
      />
      {cabin ? (
        <>
          <path d="m300 79 173 257H127Z" fill="#4d4c3d" />
          <path d="m300 103 146 220H154Z" fill="#bfa582" />
          <path d="m300 144 112 167H188Z" fill={`url(#${uid}-glass)`} />
          <path
            d="M300 151v165m-76-81h151m-201 96h252"
            stroke="#d6b893"
            strokeWidth="9"
          />
        </>
      ) : desert ? (
        <>
          <path d="M139 190h290v141H139Z" fill="#e6ceb0" />
          <path d="M139 190 172 166h291l-34 24Z" fill="#f4e2c8" />
          <path d="M429 190l34-24v141l-34 24Z" fill="#bd9670" />
          <path d="M228 331v-76a52 52 0 0 1 104 0v76" fill="#665f4d" />
          <path
            d="M242 331v-76a38 38 0 0 1 76 0v76"
            fill={`url(#${uid}-glass)`}
          />
          <rect x="160" y="218" width="43" height="68" fill="#a9906c" />
          <path
            d="M390 310v-69m0 18c-27 6-24-13-24-17m24 42c29 2 25-20 25-25"
            fill="none"
            stroke="#627756"
            strokeWidth="10"
          />
        </>
      ) : (
        <>
          <rect
            x="130"
            y="183"
            width="323"
            height="142"
            fill={city ? "#ddd6c4" : "#c0a482"}
          />
          <rect
            x="130"
            y="183"
            width="323"
            height="142"
            fill={`url(#${uid}-wood)`}
          />
          <path d="m112 184 54-24h307v24Z" fill="#3d4942" />
          <rect
            x="180"
            y="206"
            width="226"
            height="113"
            fill={`url(#${uid}-glass)`}
          />
          <path d="M255 204v117m77-117v117" stroke="#d5c4a4" strokeWidth="7" />
          <path d="m130 325-39 21h378l-16-21Z" fill="#d6c6a9" />
          <rect
            x="348"
            y="239"
            width="36"
            height="10"
            fill="#f3deac"
            opacity=".75"
          />
          <path d="M367 250v46" stroke="#f3deac" strokeWidth="3" />
        </>
      )}
      <g fill="#445c48">
        <ellipse cx="114" cy="330" rx="25" ry="17" />
        <ellipse cx="476" cy="330" rx="34" ry="16" />
      </g>
      <path
        d="M0 375c167-20 327 11 600-5"
        fill="none"
        stroke="#e0d4b9"
        strokeWidth="2"
        opacity=".6"
      />
    </svg>
  );
}
function ProductArt({ product }: { product: Product }) {
  const uid = useId().replaceAll(":", "");
  const c = product.color;
  return (
    <svg
      className="pv-product-art"
      viewBox="0 0 400 360"
      role="img"
      aria-label={`Illustration of ${product.name}`}
    >
      <defs>
        <linearGradient id={`${uid}-obj`}>
          <stop stopColor={c} />
          <stop offset=".48" stopColor="#eee4d4" />
          <stop offset="1" stopColor={c} />
        </linearGradient>
        <filter id={`${uid}-shadow`}>
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <ellipse
        cx="204"
        cy="295"
        rx="103"
        ry="12"
        fill="#333"
        opacity=".13"
        filter={`url(#${uid}-shadow)`}
      />
      {product.kind === "headphones" && (
        <g transform="rotate(-13 200 190)">
          <path
            d="M106 205v-42a94 94 0 0 1 188 0v42"
            fill="none"
            stroke="#47423a"
            strokeWidth="27"
          />
          <path
            d="M106 174v-15a94 94 0 0 1 188 0v15"
            fill="none"
            stroke={c}
            strokeWidth="32"
          />
          <rect
            x="82"
            y="166"
            width="62"
            height="116"
            rx="29"
            fill={`url(#${uid}-obj)`}
          />
          <rect
            x="265"
            y="166"
            width="62"
            height="116"
            rx="29"
            fill={`url(#${uid}-obj)`}
          />
          <rect x="124" y="180" width="25" height="89" rx="12" fill="#524c43" />
          <rect x="260" y="180" width="25" height="89" rx="12" fill="#524c43" />
          <path d="M101 190v60" stroke="#f4e7d1" opacity=".5" />
        </g>
      )}
      {product.kind === "lamp" && (
        <>
          <path d="M178 169h44v109h-44Z" fill={`url(#${uid}-obj)`} />
          <ellipse cx="200" cy="278" rx="69" ry="15" fill={c} />
          <path d="M90 168a110 110 0 0 1 220 0Z" fill={`url(#${uid}-obj)`} />
          <ellipse cx="200" cy="168" rx="110" ry="13" fill="#66735d" />
          <ellipse cx="200" cy="173" rx="71" ry="7" fill="#f9e8b5" />
          <path d="M258 174v41" stroke="#655b46" strokeWidth="2" />
          <circle cx="258" cy="220" r="5" fill="#655b46" />
        </>
      )}
      {product.kind === "speaker" && (
        <>
          <rect
            x="99"
            y="90"
            width="202"
            height="195"
            rx="43"
            fill={`url(#${uid}-obj)`}
          />
          <rect
            x="114"
            y="101"
            width="173"
            height="166"
            rx="36"
            fill="#667282"
          />
          <pattern
            id={`${uid}-mesh`}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="3" cy="3" r="1.1" fill="#bbc6d1" />
          </pattern>
          <rect
            x="114"
            y="101"
            width="173"
            height="166"
            rx="36"
            fill={`url(#${uid}-mesh)`}
          />
          <rect x="175" y="86" width="50" height="6" rx="3" fill="#566173" />
          <circle cx="200" cy="250" r="2" fill="#ecf6e3" />
        </>
      )}
      {product.kind === "clock" && (
        <>
          <circle cx="200" cy="183" r="111" fill={c} />
          <circle cx="200" cy="183" r="99" fill="#f4eddf" />
          <g stroke="#6d5c48" strokeWidth="2">
            {Array.from({ length: 12 }, (_, i) => (
              <path
                key={i}
                d="M200 101v9"
                transform={`rotate(${i * 30} 200 183)`}
              />
            ))}
          </g>
          <path
            d="M200 183v-55m0 55 44 24"
            stroke="#5c5548"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="200" cy="183" r="8" fill={c} />
        </>
      )}
      {product.kind === "keyboard" && (
        <g transform="rotate(-10 200 190)">
          <rect
            x="41"
            y="112"
            width="318"
            height="164"
            rx="16"
            fill="#878e80"
          />
          <rect x="41" y="103" width="318" height="164" rx="16" fill={c} />
          {Array.from({ length: 40 }, (_, i) => (
            <rect
              key={i}
              x={55 + (i % 10) * 29}
              y={117 + Math.floor(i / 10) * 31}
              width="25"
              height="26"
              rx="4"
              fill={i === 9 ? "#b3795b" : "#e4e4d7"}
            />
          ))}
          <rect x="128" y="241" width="143" height="16" rx="3" fill="#e4e4d7" />
        </g>
      )}
      {product.kind === "bottle" && (
        <>
          <rect x="168" y="56" width="64" height="43" rx="14" fill="#6f514c" />
          <path
            d="M161 101q-14 14-14 39v119q0 35 53 35t53-35V140q0-25-14-39Z"
            fill={`url(#${uid}-obj)`}
          />
          <path
            d="M176 135v103"
            stroke="#fff"
            strokeOpacity=".18"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <text
            x="200"
            y="220"
            textAnchor="middle"
            fontSize="10"
            letterSpacing="4"
            fill="#78554b"
          >
            OBJECT
          </text>
        </>
      )}
    </svg>
  );
}
interface ViewState {
  maxPrice: number;
  guests: number;
  sort: string;
  saved: string[];
  compare: string[];
  stayLimit: number;
  stayQuery: string;
  period: string;
  chartMetric: string;
  channel: string;
  transactionQuery: string;
  category: string;
  cart: Record<string, number>;
  tasks: Task[];
  team: string;
  newTask: string;
  activity: string[];
  selectedMessage: string;
  inboxFilter: string;
  messageQuery: string;
  resolved: string[];
  reply: string;
  replies: Record<string, string[]>;
  annual: boolean;
  faq: number;
  feature: string;
  workspace: string;
  createdWorkspace: string;
  notice: string;
}
const initialState: ViewState = {
  maxPrice: 320,
  guests: 2,
  sort: "Recommended",
  saved: [],
  compare: [],
  stayLimit: 6,
  stayQuery: "",
  period: "30 days",
  chartMetric: "Revenue",
  channel: "All channels",
  transactionQuery: "",
  category: "All objects",
  cart: {},
  tasks: TASKS,
  team: "All teams",
  newTask: "",
  activity: [
    "Project created · 2 days ago",
    "8 sample tasks added · 1 day ago",
  ],
  selectedMessage: "m1",
  inboxFilter: "Open",
  messageQuery: "",
  resolved: [],
  reply: "",
  replies: {},
  annual: true,
  faq: -1,
  feature: "Design",
  workspace: "",
  createdWorkspace: "",
  notice: "",
};
const brands = {
  stays: "elsewhere",
  analytics: "folio",
  shop: "object.",
  board: "orbit",
  inbox: "kindred",
  landing: "layers",
};
const brandIcons: Record<string, IconName> = {
  stays: "sun",
  analytics: "chart",
  shop: "grid",
  board: "spark",
  inbox: "inbox",
  landing: "grid",
};
const taglines = {
  stays: "STAYS WITH A SENSE OF PLACE",
  analytics: "YOUR BUSINESS, IN FOCUS",
  shop: "FEWER THINGS. BETTER THINGS.",
  board: "SPACE FOR GOOD WORK",
  inbox: "MAKE EVERY CONVERSATION COUNT",
  landing: "IDEAS, BEAUTIFULLY TOGETHER",
};
function PreviewInstance({
  spec,
  instanceId,
}: {
  spec: UISpec;
  instanceId: string;
}) {
  const storageKey = `jev-demo-preview-v1:${instanceId}`;
  const [state, setState] = useState<ViewState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...initialState, ...JSON.parse(saved) } : initialState;
    } catch {
      return initialState;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* Storage may be unavailable in a private browser. */
    }
  }, [state, storageKey]);
  const patch = (p: Partial<ViewState>) => setState((s) => ({ ...s, ...p }));
  const action = (name: string, p?: Partial<ViewState>) => {
    if (p) patch(p);
    window.dispatchEvent(
      new CustomEvent("demo:interaction", {
        detail: { app: spec.app, action: name, instanceId },
      }),
    );
  };
  const notice = (text: string) => patch({ notice: text });
  const toggleSaved = (id: string) =>
    action("save-stay", {
      saved: state.saved.includes(id)
        ? state.saved.filter((s) => s !== id)
        : [...state.saved, id],
    });
  const toggleCompare = (id: string) => {
    if (!state.compare.includes(id) && state.compare.length === 3) {
      notice("Compare up to 3 stays. Remove one to add another.");
      return;
    }
    action("compare-stay", {
      compare: state.compare.includes(id)
        ? state.compare.filter((s) => s !== id)
        : [...state.compare, id],
    });
  };
  const addCart = (id: string, quantity = 1) => {
    const next = Math.max(0, (state.cart[id] || 0) + quantity);
    action(quantity > 0 ? "add-to-cart" : "remove-from-cart", {
      cart: { ...state.cart, [id]: next },
    });
  };
  const cartCount = Object.values(state.cart).reduce((a, b) => a + b, 0);
  const filteredStays = STAYS.filter(
    (s) =>
      s.price <= state.maxPrice &&
      s.guests >= state.guests &&
      `${s.name} ${s.location}`
        .toLowerCase()
        .includes(state.stayQuery.toLowerCase()),
  ).sort((a, b) =>
    state.sort === "Price: low to high"
      ? a.price - b.price
      : state.sort === "Top rated"
        ? b.rating - a.rating
        : 0,
  );
  const moveTask = (id: string, status: Task["status"]) => {
    const task = state.tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    action("move-task", {
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
      activity: [
        `${id} moved to ${status} · just now`,
        ...state.activity,
      ].slice(0, 8),
    });
  };
  const scrollTo = (section: string, button: HTMLElement) => {
    button
      .closest(".preview")
      ?.querySelector(`[data-section="${section}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    action(`navigate-${section}`);
  };
  const empty = (heading: string, body: string) => (
    <div className="pv-empty">
      <Icon name="search" size={25} />
      <strong>{heading}</strong>
      <p>{body}</p>
    </div>
  );
  const sectionHeading = (
    eyebrow: string,
    title: string,
    extra?: ReactNode,
  ) => (
    <div className="pv-section-heading">
      <div>
        <span className="pv-eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
      </div>
      {extra}
    </div>
  );
  const stayCard = (s: Stay) => (
    <article className="pv-stay-card" key={s.id}>
      <div className="pv-stay-image">
        <StayArt stay={s} />
        <span className="pv-image-tag">{s.feature}</span>
        <button
          className={cls(
            "pv-icon-button pv-save",
            state.saved.includes(s.id) && "is-active",
          )}
          onClick={() => toggleSaved(s.id)}
          aria-label={`${state.saved.includes(s.id) ? "Unsave" : "Save"} ${s.name}`}
          aria-pressed={state.saved.includes(s.id)}
        >
          <Icon name="heart" />
        </button>
      </div>
      <div className="pv-stay-meta">
        <span>{s.location}</span>
        <span className="pv-rating">★ {s.rating.toFixed(2)}</span>
      </div>
      <h4>{s.name}</h4>
      <div className="pv-stay-bottom">
        <span>
          <strong>{usd(s.price)}</strong>
          <small> / night · {s.guests} guests</small>
        </span>
        <button
          className={cls(
            "pv-compare-button",
            state.compare.includes(s.id) && "is-active",
          )}
          onClick={() => toggleCompare(s.id)}
          aria-label={`${state.compare.includes(s.id) ? "Remove from comparison" : "Compare"} ${s.name}`}
          aria-pressed={state.compare.includes(s.id)}
        >
          <Icon
            name={state.compare.includes(s.id) ? "check" : "plus"}
            size={13}
          />{" "}
          Compare
        </button>
      </div>
    </article>
  );

  const renderStays = (section: string): ReactNode => {
    if (section === "filters")
      return (
        <div className="pv-filter-bar">
          <label className="pv-search">
            <Icon name="search" />
            <span className="pv-field">
              <small>YOUR NEXT ESCAPE</small>
              <input
                aria-label="Search destinations"
                placeholder="Anywhere that feels different"
                value={state.stayQuery}
                onChange={(e) =>
                  action("search-stays", {
                    stayQuery: e.target.value,
                    stayLimit: 6,
                  })
                }
              />
            </span>
          </label>
          <label className="pv-field">
            <small>TRAVELERS</small>
            <select
              aria-label="Number of guests"
              value={state.guests}
              onChange={(e) =>
                action("change-guests", {
                  guests: Number(e.target.value),
                  stayLimit: 6,
                })
              }
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "guest" : "guests"}
                </option>
              ))}
            </select>
          </label>
          <label className="pv-field pv-budget">
            <small>UP TO {usd(state.maxPrice)} / NIGHT</small>
            <input
              aria-label="Maximum nightly price"
              type="range"
              min="100"
              max="320"
              step="5"
              value={state.maxPrice}
              onChange={(e) =>
                action("change-budget", {
                  maxPrice: Number(e.target.value),
                  stayLimit: 6,
                })
              }
            />
          </label>
          <span className="pv-filter-icon">
            <Icon name="filter" />
          </span>
        </div>
      );
    if (section === "results")
      return (
        <>
          {sectionHeading(
            "CURATED, NOT CROWDED",
            `${filteredStays.length} places to pause`,
            <select
              aria-label="Sort stays"
              className="pv-select"
              value={state.sort}
              onChange={(e) => action("sort-stays", { sort: e.target.value })}
            >
              {["Recommended", "Price: low to high", "Top rated"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>,
          )}
          <div className="pv-stay-grid">
            {filteredStays.slice(0, state.stayLimit).map(stayCard)}
          </div>
          {!filteredStays.length &&
            empty(
              "A different kind of escape?",
              "Try a higher budget, fewer guests, or another destination.",
            )}
          {filteredStays.length > state.stayLimit && (
            <button
              className="pv-button pv-load-more"
              onClick={() =>
                action("show-more-stays", { stayLimit: state.stayLimit + 6 })
              }
            >
              Discover more stays <Icon name="arrow" size={16} />
            </button>
          )}
        </>
      );
    if (section === "compare")
      return (
        <div className="pv-surface">
          {sectionHeading(
            "FIND YOUR FAVORITE",
            `A closer look${state.compare.length ? ` · ${state.compare.length} stays` : ""}`,
            state.compare.length > 0 && (
              <button
                className="pv-text-button"
                onClick={() => action("clear-comparison", { compare: [] })}
              >
                Clear all
              </button>
            ),
          )}
          {state.compare.length ? (
            <div className="pv-comparison">
              {STAYS.filter((s) => state.compare.includes(s.id)).map((s) => (
                <div key={s.id} className="pv-compare-item">
                  <button
                    className="pv-icon-button"
                    aria-label={`Remove ${s.name} from comparison`}
                    onClick={() => toggleCompare(s.id)}
                  >
                    <Icon name="close" size={15} />
                  </button>
                  <span className="pv-eyebrow">{s.location.split(",")[0]}</span>
                  <h4>{s.name}</h4>
                  <strong className="pv-compare-price">
                    {usd(s.price)}
                    <small> / night</small>
                  </strong>
                  <dl>
                    <div>
                      <dt>Room for</dt>
                      <dd>{s.guests} guests</dd>
                    </div>
                    <div>
                      <dt>Guest rating</dt>
                      <dd>★ {s.rating.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>A little extra</dt>
                      <dd>{s.feature}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <div className="pv-compare-empty">
              <span className="pv-outline-circle">
                <Icon name="plus" />
              </span>
              <p>
                Your next getaway, side by side.
                <br />
                <small>
                  Tap Compare on up to 3 stays to explore the details.
                </small>
              </p>
              <span className="pv-caption">01 / 02 / 03</span>
            </div>
          )}
        </div>
      );
    if (section === "saved")
      return (
        <>
          {sectionHeading(
            "YOUR LITTLE BLACK BOOK",
            `Saved for later · ${state.saved.length}`,
          )}
          {state.saved.length ? (
            <div className="pv-stay-grid">
              {STAYS.filter((s) => state.saved.includes(s.id)).map(stayCard)}
            </div>
          ) : (
            empty(
              "Some places stay with you.",
              "Tap the heart on a stay to start your collection.",
            )
          )}
        </>
      );
    return null;
  };
  const renderAnalytics = (section: string): ReactNode => {
    const factor =
      state.period === "7 days" ? 0.27 : state.period === "90 days" ? 2.84 : 1;
    const transactions = TRANSACTIONS.filter(
      (t) =>
        (state.channel === "All channels" || t.channel === state.channel) &&
        `${t.company} ${t.id}`
          .toLowerCase()
          .includes(state.transactionQuery.toLowerCase()),
    );
    if (section === "kpis")
      return (
        <>
          <div className="pv-dashboard-controls">
            <span className="pv-live-dot">All systems looking good</span>
            <select
              className="pv-select"
              aria-label="Analytics period"
              value={state.period}
              onChange={(e) =>
                action("change-period", { period: e.target.value })
              }
            >
              {["7 days", "30 days", "90 days"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <div className="pv-kpis">
            {[
              {
                label: "Total revenue",
                value: usd(48295 * factor),
                change: "+18.6%",
                icon: "chart",
              },
              {
                label: "Active customers",
                value: Math.round(2841 * factor).toLocaleString(),
                change: "+12.8%",
                icon: "heart",
              },
              {
                label: "Conversion rate",
                value:
                  state.period === "7 days"
                    ? "4.12%"
                    : state.period === "90 days"
                      ? "3.68%"
                      : "3.86%",
                change: "+0.8 pts",
                icon: "bolt",
              },
              {
                label: "Average order",
                value: usd(
                  128 +
                    (state.period === "7 days"
                      ? 7
                      : state.period === "90 days"
                        ? -4
                        : 0),
                ),
                change: "+6.2%",
                icon: "bag",
              },
            ].map((k, i) => (
              <div
                className={cls("pv-kpi", i === 0 && "pv-kpi-featured")}
                key={k.label}
              >
                <div className="pv-kpi-label">
                  {k.label}
                  <Icon name={k.icon as IconName} size={17} />
                </div>
                <strong>{k.value}</strong>
                <div>
                  <span className="pv-positive">↗ {k.change}</span>
                  <small> vs. previous period</small>
                </div>
              </div>
            ))}
          </div>
        </>
      );
    if (section === "chart") {
      const source =
        state.period === "7 days"
          ? REVENUE.slice(-7)
          : state.period === "90 days"
            ? REVENUE.map((v, i) => v * 0.88 + (i % 5) * 5)
            : REVENUE;
      const values =
        state.chartMetric === "Revenue"
          ? source
          : source.map((v, i) => v * 0.74 + (i % 4) * 17);
      const points = values
        .map((v, i) => `${40 + i * (638 / (values.length - 1))},${220 - v}`)
        .join(" ");
      const chartLabels =
        state.period === "7 days"
          ? ["7 days ago", "5 days ago", "3 days ago", "Today"]
          : state.period === "90 days"
            ? ["90 days ago", "60 days ago", "30 days ago", "Today"]
            : ["30 days ago", "20 days ago", "10 days ago", "Today"];
      return (
        <div className="pv-surface pv-chart-surface">
          {sectionHeading(
            "THE BIG PICTURE",
            "A little more momentum",
            <div
              className="pv-segmented"
              role="group"
              aria-label="Chart metric"
            >
              {["Revenue", "Customers"].map((x) => (
                <button
                  key={x}
                  className={cls(state.chartMetric === x && "is-active")}
                  onClick={() =>
                    action("change-chart-metric", { chartMetric: x })
                  }
                  aria-pressed={state.chartMetric === x}
                >
                  {x}
                </button>
              ))}
            </div>,
          )}
          <div className="pv-chart-summary">
            <strong>
              {state.chartMetric === "Revenue"
                ? usd(48295 * factor)
                : Math.round(2841 * factor).toLocaleString()}
            </strong>
            <span className="pv-positive">↗ Growing together</span>
          </div>
          <div
            className="pv-chart"
            role="img"
            aria-label={`${state.chartMetric} chart for the last ${state.period}, trending upward. Synthetic data.`}
          >
            <svg viewBox="0 0 720 265">
              <defs>
                <linearGradient
                  id={`chart-${instanceId.replace(/[^a-zA-Z0-9]/g, "")}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop stopColor="var(--pv-accent)" stopOpacity=".22" />
                  <stop
                    offset="1"
                    stopColor="var(--pv-accent)"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              {[60, 110, 160, 210].map((y, i) => (
                <g key={y}>
                  <path
                    d={`M40 ${y}h650`}
                    stroke="var(--pv-line)"
                    strokeDasharray="3 5"
                  />
                  <text x="2" y={y + 4} fill="var(--pv-muted)" fontSize="10">
                    {state.chartMetric === "Revenue"
                      ? `$${(4 - i) * 4}k`
                      : (4 - i) * 250}
                  </text>
                </g>
              ))}
              <polygon
                points={`40,223 ${points} 678,223`}
                fill={`url(#chart-${instanceId.replace(/[^a-zA-Z0-9]/g, "")})`}
              />
              <polyline
                points={points}
                fill="none"
                stroke="var(--pv-accent)"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <circle
                cx="678"
                cy={220 - values.at(-1)!}
                r="5"
                fill="var(--pv-accent)"
                stroke="var(--pv-surface)"
                strokeWidth="3"
              />
              {chartLabels.map((s, i) => (
                <text
                  key={s}
                  x={40 + i * 211}
                  y="252"
                  fill="var(--pv-muted)"
                  fontSize="11"
                  textAnchor={i === 3 ? "end" : "start"}
                >
                  {s}
                </text>
              ))}
            </svg>
          </div>
          <div className="pv-chart-foot">
            <span>
              <i /> {state.chartMetric}
            </span>
            <small>Every small step adds up.</small>
          </div>
        </div>
      );
    }
    if (section === "transactions")
      return (
        <div className="pv-surface">
          {sectionHeading(
            "THE EVERYDAY DETAILS",
            "Recent transactions",
            <label className="pv-inline-search">
              <Icon name="search" size={15} />
              <input
                aria-label="Search transactions"
                placeholder="Find a transaction"
                value={state.transactionQuery}
                onChange={(e) =>
                  action("search-transactions", {
                    transactionQuery: e.target.value,
                  })
                }
              />
            </label>,
          )}
          <div className="pv-table-wrap">
            <table className="pv-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th className="pv-align-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="pv-customer">
                        <span className="pv-avatar">{t.initials}</span>
                        <span>
                          <strong>{t.company}</strong>
                          <small>{t.id}</small>
                        </span>
                      </div>
                    </td>
                    <td>{t.plan}</td>
                    <td>
                      <span
                        className={cls(
                          "pv-badge",
                          t.status === "Paid"
                            ? "pv-badge-success"
                            : "pv-badge-warm",
                        )}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="pv-align-right">
                      <strong>{usd(t.amount)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!transactions.length &&
            empty(
              "No matching transactions",
              "Try another customer or choose all channels.",
            )}
          <div className="pv-table-foot">
            <span>{transactions.length} sample transactions</span>
            <strong>
              {usd(transactions.reduce((a, t) => a + t.amount, 0))} total
            </strong>
          </div>
        </div>
      );
    if (section === "breakdown")
      return (
        <div className="pv-surface">
          {sectionHeading(
            "WHERE GOOD THINGS START",
            "Acquisition channels",
            <select
              className="pv-select"
              aria-label="Filter transactions by channel"
              value={state.channel}
              onChange={(e) =>
                action("filter-channel", { channel: e.target.value })
              }
            >
              {["All channels", "Direct", "Organic", "Referral"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>,
          )}
          <div className="pv-channel-list">
            {[
              { name: "Organic", value: 48, color: "var(--pv-accent)" },
              { name: "Direct", value: 32, color: "#ada58c" },
              { name: "Referral", value: 20, color: "#cfb99c" },
            ].map((c) => (
              <button
                key={c.name}
                className={cls(
                  "pv-channel",
                  state.channel === c.name && "is-active",
                )}
                onClick={() =>
                  action("filter-channel", {
                    channel: state.channel === c.name ? "All channels" : c.name,
                  })
                }
                aria-pressed={state.channel === c.name}
              >
                <span>{c.name}</span>
                <span className="pv-meter">
                  <i style={{ width: `${c.value}%`, background: c.color }} />
                </span>
                <strong>{c.value}%</strong>
              </button>
            ))}
          </div>
        </div>
      );
    return null;
  };
  const renderShop = (section: string): ReactNode => {
    if (section === "categories")
      return (
        <div className="pv-shop-filter">
          <div className="pv-tabs" role="group" aria-label="Product categories">
            {["All objects", "Sound", "Light", "Workspace"].map((c) => (
              <button
                key={c}
                className={cls(state.category === c && "is-active")}
                onClick={() => action("filter-products", { category: c })}
                aria-pressed={state.category === c}
              >
                {c}
              </button>
            ))}
          </div>
          <span className="pv-caption">CONSIDERED OBJECTS, EVERY DAY</span>
        </div>
      );
    if (section === "products")
      return (
        <div className="pv-product-grid">
          {PRODUCTS.filter(
            (p) =>
              state.category === "All objects" || p.category === state.category,
          ).map((p) => (
            <article className="pv-product-card" key={p.id}>
              <div
                className="pv-product-image"
                style={{ "--object-tint": p.color } as CSSProperties}
              >
                <span className="pv-product-index">
                  0{PRODUCTS.indexOf(p) + 1} / OBJECTS
                </span>
                <ProductArt product={p} />
                <button
                  className="pv-product-add"
                  onClick={() => addCart(p.id)}
                  aria-label={`Add ${p.name} to cart`}
                >
                  <Icon name="plus" size={18} />
                </button>
                {(state.cart[p.id] || 0) > 0 && (
                  <span className="pv-added-count">
                    {state.cart[p.id]} in bag
                  </span>
                )}
              </div>
              <div className="pv-product-info">
                <div>
                  <span className="pv-eyebrow">{p.category}</span>
                  <h4>{p.name}</h4>
                  <p>{p.description}</p>
                </div>
                <strong>{usd(p.price)}</strong>
              </div>
            </article>
          ))}
        </div>
      );
    if (section === "cart")
      return (
        <div className="pv-surface pv-cart">
          {sectionHeading(
            "MAKE IT YOURS",
            `Your considered collection · ${cartCount}`,
          )}
          {cartCount ? (
            <>
              <div className="pv-cart-items">
                {PRODUCTS.filter((p) => state.cart[p.id] > 0).map((p) => (
                  <div className="pv-cart-item" key={p.id}>
                    <div className="pv-cart-thumbnail">
                      <ProductArt product={p} />
                    </div>
                    <div>
                      <strong>{p.name}</strong>
                      <small>{usd(p.price)} each</small>
                    </div>
                    <div className="pv-quantity">
                      <button
                        aria-label={`Remove one ${p.name}`}
                        onClick={() => addCart(p.id, -1)}
                      >
                        <Icon name="minus" size={13} />
                      </button>
                      <span aria-label={`${p.name} quantity`}>
                        {state.cart[p.id]}
                      </span>
                      <button
                        aria-label={`Add one ${p.name}`}
                        onClick={() => addCart(p.id)}
                      >
                        <Icon name="plus" size={13} />
                      </button>
                    </div>
                    <strong>{usd(p.price * state.cart[p.id])}</strong>
                  </div>
                ))}
              </div>
              <div className="pv-cart-total">
                <span>
                  Collection total{" "}
                  <small>Demo only · no checkout or charges</small>
                </span>
                <strong>
                  {usd(
                    PRODUCTS.reduce(
                      (s, p) => s + p.price * (state.cart[p.id] || 0),
                      0,
                    ),
                  )}
                </strong>
              </div>
            </>
          ) : (
            <div className="pv-cart-empty">
              <Icon name="bag" size={28} />
              <p>Leave a little room for something good.</p>
              <small>Add an object to try the working shopping bag.</small>
            </div>
          )}
        </div>
      );
    if (section === "benefits")
      return (
        <div className="pv-benefits">
          {[
            {
              icon: "leaf",
              title: "Made to stay",
              text: "Thoughtful materials. Enduring forms.",
            },
            {
              icon: "sun",
              title: "A little more everyday",
              text: "Objects that make the ordinary better.",
            },
            {
              icon: "heart",
              title: "Small details matter",
              text: "Designed with care, down to the finish.",
            },
          ].map((b) => (
            <div key={b.title}>
              <Icon name={b.icon as IconName} size={24} />
              <h4>{b.title}</h4>
              <p>{b.text}</p>
            </div>
          ))}
        </div>
      );
    return null;
  };
  const renderBoard = (section: string): ReactNode => {
    const done = state.tasks.filter((t) => t.status === "Done").length,
      filtered = state.tasks.filter(
        (t) => state.team === "All teams" || t.team === state.team,
      );
    if (section === "overview")
      return (
        <div className="pv-board-overview">
          <div>
            <span className="pv-eyebrow">SPRINT 06 · THE NEXT CHAPTER</span>
            <h3>Small steps. Meaningful progress.</h3>
            <p>
              {done} of {state.tasks.length} tasks complete. Keep the good work
              moving.
            </p>
            <div className="pv-progress-track">
              <span
                style={{ width: `${(done / state.tasks.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="pv-team-stack">
            {["AK", "JM", "SL", "MR"].map((n, i) => (
              <span
                key={n}
                style={{
                  background: ["#e8bd9d", "#b5c0de", "#bbd0b3", "#d4bae0"][i],
                }}
              >
                {n}
              </span>
            ))}
            <small>Four minds. One direction.</small>
          </div>
        </div>
      );
    if (section === "filters")
      return (
        <div className="pv-board-controls">
          <div
            className="pv-tabs"
            role="group"
            aria-label="Filter tasks by team"
          >
            {["All teams", "Design", "Engineering", "Content", "Research"].map(
              (t) => (
                <button
                  key={t}
                  className={cls(state.team === t && "is-active")}
                  onClick={() => action("filter-tasks", { team: t })}
                  aria-pressed={state.team === t}
                >
                  {t}
                </button>
              ),
            )}
          </div>
          <form
            className="pv-add-task"
            onSubmit={(e) => {
              e.preventDefault();
              const title = state.newTask.trim();
              if (!title) return;
              const id = `ORB-${Math.max(...state.tasks.map((t) => Number(t.id.split("-")[1]))) + 1}`;
              action("add-task", {
                tasks: [
                  ...state.tasks,
                  {
                    id,
                    title,
                    team: state.team === "All teams" ? "Design" : state.team,
                    status: "Backlog",
                    priority: "Medium",
                    person: "YOU",
                    color: "#d4c5a9",
                    comments: 0,
                  },
                ],
                newTask: "",
                activity: [`${id} created · just now`, ...state.activity].slice(
                  0,
                  8,
                ),
              });
            }}
          >
            <input
              aria-label="New task title"
              placeholder="A new idea…"
              value={state.newTask}
              onChange={(e) => patch({ newTask: e.target.value })}
              maxLength={100}
            />
            <button
              className="pv-button pv-button-primary"
              type="submit"
              disabled={!state.newTask.trim()}
            >
              <Icon name="plus" size={15} /> Add task
            </button>
          </form>
        </div>
      );
    if (section === "kanban")
      return (
        <div className="pv-kanban">
          {(["Backlog", "In progress", "Review", "Done"] as const).map(
            (column, i) => (
              <div
                className="pv-kanban-column"
                key={column}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  moveTask(id, column);
                }}
              >
                <div className="pv-column-heading">
                  <span className={`pv-status-dot pv-status-${i}`} />
                  <h3>{column}</h3>
                  <span>
                    {filtered.filter((t) => t.status === column).length}
                  </span>
                </div>
                <div className="pv-task-stack">
                  {filtered
                    .filter((t) => t.status === column)
                    .map((task) => (
                      <article
                        key={task.id}
                        className="pv-task"
                        draggable
                        onDragStart={(e) =>
                          e.dataTransfer.setData("text/plain", task.id)
                        }
                        data-testid={`task-${task.id}`}
                      >
                        <div className="pv-task-top">
                          <span>{task.id}</span>
                          <span
                            className={cls(
                              "pv-priority",
                              `pv-priority-${task.priority.toLowerCase()}`,
                            )}
                          >
                            {task.priority}
                          </span>
                        </div>
                        <h4>{task.title}</h4>
                        <span className="pv-task-team">{task.team}</span>
                        <div className="pv-task-footer">
                          <span
                            className="pv-avatar"
                            style={{ background: task.color }}
                          >
                            {task.person}
                          </span>
                          <span>
                            <Icon name="message" size={13} />
                            {task.comments}
                          </span>
                        </div>
                        <label className="pv-task-move">
                          <span>Move to</span>
                          <select
                            aria-label={`Move ${task.id}`}
                            value={task.status}
                            onChange={(e) =>
                              moveTask(
                                task.id,
                                e.target.value as Task["status"],
                              )
                            }
                          >
                            {["Backlog", "In progress", "Review", "Done"].map(
                              (s) => (
                                <option key={s}>{s}</option>
                              ),
                            )}
                          </select>
                        </label>
                      </article>
                    ))}
                </div>
                {!filtered.some((t) => t.status === column) && (
                  <div className="pv-kanban-empty">
                    A little breathing room.
                    <br />
                    <small>Drop a task here, or use its Move to menu.</small>
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      );
    if (section === "activity")
      return (
        <div className="pv-surface">
          {sectionHeading("IN THE LOOP", "A trail of good work")}
          <div className="pv-activity-list">
            {state.activity.map((a, i) => (
              <div key={`${a}-${i}`}>
                <span className="pv-activity-point" />
                <span>{a}</span>
              </div>
            ))}
          </div>
        </div>
      );
    return null;
  };
  const renderInbox = (section: string): ReactNode => {
    const selected =
      MESSAGES.find((m) => m.id === state.selectedMessage) ?? MESSAGES[0];
    const filtered = MESSAGES.filter(
      (m) =>
        (state.inboxFilter === "All" || state.inboxFilter === "Resolved"
          ? state.inboxFilter === "All" || state.resolved.includes(m.id)
          : !state.resolved.includes(m.id)) &&
        (state.inboxFilter !== "Priority" || m.priority === "High") &&
        `${m.name} ${m.subject} ${m.snippet}`
          .toLowerCase()
          .includes(state.messageQuery.toLowerCase()),
    );
    if (section === "overview")
      return (
        <div className="pv-inbox-overview">
          <div className="pv-inbox-orb">
            <Icon name="heart" size={28} />
          </div>
          <div>
            <span className="pv-eyebrow">PEOPLE FIRST. ALWAYS.</span>
            <h3>A good day to be helpful.</h3>
            <p>
              {MESSAGES.length - state.resolved.length} open conversations.
              Every reply makes a difference.
            </p>
          </div>
          <div className="pv-inbox-stat">
            <strong>{state.resolved.length}</strong>
            <small>resolved today</small>
          </div>
        </div>
      );
    if (section === "filters")
      return (
        <div className="pv-inbox-controls">
          <div
            className="pv-tabs"
            role="group"
            aria-label="Conversation status"
          >
            {["Open", "Priority", "Resolved", "All"].map((s) => (
              <button
                key={s}
                className={cls(state.inboxFilter === s && "is-active")}
                onClick={() => action("filter-inbox", { inboxFilter: s })}
                aria-pressed={state.inboxFilter === s}
              >
                {s}
              </button>
            ))}
          </div>
          <label className="pv-inline-search">
            <Icon name="search" size={15} />
            <input
              aria-label="Search conversations"
              placeholder="Search conversations"
              value={state.messageQuery}
              onChange={(e) =>
                action("search-inbox", { messageQuery: e.target.value })
              }
            />
          </label>
        </div>
      );
    if (section === "messages")
      return (
        <div className="pv-message-list">
          {filtered.map((m) => (
            <button
              className={cls(
                "pv-message-row",
                state.selectedMessage === m.id && "is-selected",
              )}
              key={m.id}
              aria-pressed={state.selectedMessage === m.id}
              aria-label={`Read ${m.subject}`}
              onClick={() =>
                action("select-message", { selectedMessage: m.id })
              }
            >
              <span className="pv-avatar" style={{ background: m.color }}>
                {m.initials}
              </span>
              <span className="pv-message-copy">
                <span className="pv-message-name">
                  {m.name}
                  <small>{m.time}</small>
                </span>
                <strong>{m.subject}</strong>
                <span>{m.snippet}</span>
                <span className="pv-message-tags">
                  <span>{m.tag}</span>
                  {state.resolved.includes(m.id) ? (
                    <span className="pv-badge-success">Resolved</span>
                  ) : (
                    m.priority === "High" && (
                      <span className="pv-badge-warm">Priority</span>
                    )
                  )}
                </span>
              </span>
              <Icon name="chevron" size={15} />
            </button>
          ))}
          {!filtered.length &&
            empty("A quiet inbox", "No conversations match this view.")}
        </div>
      );
    if (section === "detail")
      return (
        <div className="pv-conversation">
          <div className="pv-conversation-header">
            <span className="pv-avatar" style={{ background: selected.color }}>
              {selected.initials}
            </span>
            <div>
              <strong>{selected.name}</strong>
              <small>Fictional customer · {selected.tag}</small>
            </div>
            <button
              className={cls(
                "pv-button",
                !state.resolved.includes(selected.id) && "pv-button-primary",
              )}
              onClick={() =>
                action("resolve-message", {
                  resolved: state.resolved.includes(selected.id)
                    ? state.resolved.filter((id) => id !== selected.id)
                    : [...state.resolved, selected.id],
                })
              }
            >
              <Icon name="check" size={15} />
              {state.resolved.includes(selected.id) ? "Reopen" : "Resolve"}
            </button>
          </div>
          <div className="pv-conversation-body">
            <span className="pv-conversation-date">
              TODAY · SAMPLE CONVERSATION
            </span>
            <h3>{selected.subject}</h3>
            <div className="pv-chat-bubble">{selected.body}</div>
            <span className="pv-chat-time">
              {selected.name} · {selected.time} ago
            </span>
            {(state.replies[selected.id] || []).map((reply, i) => (
              <div className="pv-local-reply" key={i}>
                <div className="pv-chat-bubble">{reply}</div>
                <small>Local draft reply · not sent</small>
              </div>
            ))}
          </div>
          <form
            className="pv-composer"
            onSubmit={(e) => {
              e.preventDefault();
              const text = state.reply.trim();
              if (!text) return;
              action("save-local-reply", {
                replies: {
                  ...state.replies,
                  [selected.id]: [...(state.replies[selected.id] || []), text],
                },
                reply: "",
                notice: "Reply saved in this demo. No message was sent.",
              });
            }}
          >
            <textarea
              aria-label="Draft a local reply"
              value={state.reply}
              onChange={(e) => patch({ reply: e.target.value })}
              placeholder="A thoughtful reply starts here…"
              rows={3}
              maxLength={1000}
            />
            <div>
              <small>Local demo · never sends a message</small>
              <button
                className="pv-button pv-button-primary"
                disabled={!state.reply.trim()}
              >
                Save local reply <Icon name="arrow" size={15} />
              </button>
            </div>
          </form>
        </div>
      );
    return null;
  };
  const renderLanding = (section: string): ReactNode => {
    const featureText: Record<
      string,
      { heading: string; body: string; items: string[] }
    > = {
      Design: {
        heading: "A place for the whole picture.",
        body: "Bring the references, the rough ideas, and the almost-there work into one thoughtful space.",
        items: [
          "Moodboard exploration",
          "A calmer color system",
          "The first beautiful draft",
        ],
      },
      Build: {
        heading: "From a thought to a thing.",
        body: "Turn decisions into clear next steps. Keep the context close, and keep the work moving.",
        items: [
          "Shared component library",
          "Responsive foundations",
          "A working prototype",
        ],
      },
      Ship: {
        heading: "Make room for what is next.",
        body: "Share work that feels considered. Collect a little feedback and make the next version even better.",
        items: [
          "A focused final review",
          "Release with confidence",
          "Listen, learn, repeat",
        ],
      },
    };
    const current = featureText[state.feature];
    if (section === "hero")
      return spec.hero === "hidden" ? null : (
        <div className="pv-landing-hero">
          <div className="pv-landing-hero-copy">
            <span className="pv-announcement">
              <span /> A calmer way to create
            </span>
            <h2>{spec.title}</h2>
            <p>{spec.subtitle}</p>
            <div className="pv-hero-actions">
              {spec.sections.includes("signup") && (
                <button
                  className="pv-button pv-button-primary"
                  onClick={(e) => scrollTo("signup", e.currentTarget)}
                >
                  Make a little space <Icon name="arrow" size={16} />
                </button>
              )}
              {spec.sections.includes("features") && (
                <button
                  className="pv-text-button"
                  onClick={(e) => scrollTo("features", e.currentTarget)}
                >
                  See how it works ↗
                </button>
              )}
            </div>
            <div className="pv-social-proof">
              <span className="pv-proof-avatars">
                <i>AK</i>
                <i>JM</i>
                <i>SL</i>
              </span>
              <span>
                A fictional workspace.
                <br />
                <strong>A fully interactive example.</strong>
              </span>
            </div>
          </div>
          <div
            className="pv-landing-art"
            aria-label="Illustrated workspace preview"
          >
            <div className="pv-art-ring pv-art-ring-one" />
            <div className="pv-art-ring pv-art-ring-two" />
            <div className="pv-floating-note">
              <Icon name="spark" size={23} />
              <span>
                A little room
                <br />
                for your next big idea.
              </span>
              <small>NOTE TO SELF</small>
            </div>
            <div className="pv-mini-workspace">
              <div className="pv-mini-window">
                <i />
                <i />
                <i />
                <span>Our next chapter</span>
              </div>
              <div className="pv-mini-content">
                <span className="pv-eyebrow">MADE OF SMALL STEPS</span>
                <h4>
                  Good things
                  <br />
                  take shape.
                </h4>
                <div className="pv-mini-grid">
                  <div className="pv-mini-image">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div>
                    <span className="pv-mini-line" />
                    <span className="pv-mini-line" />
                    <span className="pv-mini-line" />
                    <span className="pv-mini-check">
                      <Icon name="check" size={13} /> Make something meaningful
                    </span>
                  </div>
                </div>
                <div className="pv-mini-bottom">
                  <span>PROJECT 001</span>
                  <span>
                    In a good place <i />
                  </span>
                </div>
              </div>
            </div>
            <div className="pv-floating-label">
              <span className="pv-mini-avatar">YOU</span>Your ideas belong here.
            </div>
          </div>
        </div>
      );
    if (section === "features")
      return (
        <div className="pv-feature-section">
          {sectionHeading(
            "FROM THE FIRST SPARK",
            "Less friction. More flow.",
            <div
              className="pv-segmented"
              role="group"
              aria-label="Explore the workflow"
            >
              {["Design", "Build", "Ship"].map((t) => (
                <button
                  key={t}
                  className={cls(state.feature === t && "is-active")}
                  onClick={() => action("change-feature", { feature: t })}
                  aria-pressed={state.feature === t}
                >
                  {t}
                </button>
              ))}
            </div>,
          )}
          <div className="pv-feature-content">
            <div className="pv-feature-number">
              0{["Design", "Build", "Ship"].indexOf(state.feature) + 1}
              <Icon
                name={
                  state.feature === "Design"
                    ? "spark"
                    : state.feature === "Build"
                      ? "grid"
                      : "arrow"
                }
                size={44}
              />
            </div>
            <div>
              <h4>{current.heading}</h4>
              <p>{current.body}</p>
            </div>
            <ul>
              {current.items.map((item) => (
                <li key={item}>
                  <Icon name="check" size={16} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    if (section === "pricing")
      return (
        <div className="pv-pricing-section">
          {sectionHeading(
            "ROOM TO GROW",
            "A plan for your next chapter.",
            <div
              className="pv-segmented"
              role="group"
              aria-label="Billing period"
            >
              <button
                className={cls(!state.annual && "is-active")}
                aria-pressed={!state.annual}
                onClick={() => action("toggle-billing", { annual: false })}
              >
                Monthly
              </button>
              <button
                className={cls(state.annual && "is-active")}
                aria-pressed={state.annual}
                onClick={() => action("toggle-billing", { annual: true })}
              >
                Yearly <span>−20%</span>
              </button>
            </div>,
          )}
          <div className="pv-pricing-grid">
            {[
              {
                name: "Personal",
                text: "For your own good ideas.",
                price: 0,
                items: [
                  "3 spaces to make your own",
                  "Unlimited little ideas",
                  "A home for your inspiration",
                ],
              },
              {
                name: "Together",
                text: "Good things happen together.",
                price: state.annual ? 12 : 15,
                items: [
                  "Unlimited shared spaces",
                  "A place for the whole team",
                  "Versions, feedback, and context",
                ],
              },
              {
                name: "Studio",
                text: "Space for something bigger.",
                price: state.annual ? 24 : 30,
                items: [
                  "Everything in Together",
                  "Flexible roles and permissions",
                  "An organized home for every project",
                ],
              },
            ].map((plan, i) => (
              <div
                className={cls("pv-plan", i === 1 && "pv-plan-featured")}
                key={plan.name}
              >
                {i === 1 && (
                  <span className="pv-plan-label">
                    A LITTLE MORE POSSIBILITY
                  </span>
                )}
                <h4>{plan.name}</h4>
                <p>{plan.text}</p>
                <div className="pv-plan-price">
                  {usd(plan.price)}
                  <small> / person / mo</small>
                </div>
                <span className="pv-caption">
                  {plan.price
                    ? state.annual
                      ? "BILLED YEARLY · SAMPLE PRICE"
                      : "BILLED MONTHLY · SAMPLE PRICE"
                    : "FREE IN THIS FICTIONAL PRODUCT"}
                </span>
                <ul>
                  {plan.items.map((item) => (
                    <li key={item}>
                      <Icon name="check" size={15} />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  className={cls("pv-button", i === 1 && "pv-button-primary")}
                  onClick={(e) => {
                    action("select-plan", {
                      notice: `${plan.name} selected. This is a local demo; no subscription is created.`,
                    });
                    if (spec.sections.includes("signup"))
                      scrollTo("signup", e.currentTarget);
                  }}
                >
                  Choose {plan.name} <Icon name="arrow" size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    if (section === "faq")
      return (
        <div className="pv-faq-section">
          <div>
            <span className="pv-eyebrow">A FEW LITTLE DETAILS</span>
            <h3>Glad you asked.</h3>
            <p>
              Clear answers.
              <br />A little less wondering.
            </p>
          </div>
          <div className="pv-faq-list">
            {[
              {
                q: "What can I actually do in this demo?",
                a: "Switch workflows, compare plans, open these answers, and create a local workspace name. All interactions run in your browser with fictional data.",
              },
              {
                q: "Will my team receive an invitation?",
                a: "No. This is an interactive frontend demonstration. It does not create accounts, contact people, or process payments.",
              },
              {
                q: "Can the design change while I use it?",
                a: "Yes. The preview can change its layout, typography, colors, and sections while preserving your local interaction state.",
              },
            ].map((f, i) => (
              <div className="pv-faq-item" key={f.q}>
                <button
                  aria-expanded={state.faq === i}
                  onClick={() =>
                    action("toggle-faq", { faq: state.faq === i ? -1 : i })
                  }
                >
                  {f.q}
                  <Icon name={state.faq === i ? "minus" : "plus"} size={17} />
                </button>
                {state.faq === i && <p>{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      );
    if (section === "signup")
      return (
        <div className="pv-signup">
          <Icon name="spark" size={36} />
          <div>
            <span className="pv-eyebrow">SOMETHING GOOD STARTS HERE</span>
            <h3>
              {state.createdWorkspace
                ? `Welcome to ${state.createdWorkspace}.`
                : "Give your next idea a home."}
            </h3>
            <p>
              {state.createdWorkspace
                ? "Your local demo workspace is ready. No account was created."
                : "A name, a little intention, and room to begin."}
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (state.workspace.trim())
                action("create-local-workspace", {
                  createdWorkspace: state.workspace.trim(),
                  notice:
                    "Workspace name saved locally. No account was created.",
                });
            }}
          >
            <label className="pv-sr-only" htmlFor={`workspace-${instanceId}`}>
              Workspace name
            </label>
            <input
              id={`workspace-${instanceId}`}
              aria-label="Workspace name"
              placeholder="Your workspace name"
              value={state.workspace}
              onChange={(e) => patch({ workspace: e.target.value })}
              maxLength={40}
              required
            />
            <button className="pv-button pv-button-primary" type="submit">
              Create locally <Icon name="arrow" size={16} />
            </button>
          </form>
        </div>
      );
    return null;
  };
  const renderers = {
    stays: renderStays,
    analytics: renderAnalytics,
    shop: renderShop,
    board: renderBoard,
    inbox: renderInbox,
    landing: renderLanding,
  };
  return (
    <div
      className="preview"
      data-app={spec.app}
      data-theme={spec.theme}
      data-layout={spec.layout}
      data-density={spec.density}
      data-typography={spec.typography}
      data-corners={spec.corners}
      data-emphasis={spec.emphasis}
      data-hero={spec.hero}
      data-instance={instanceId}
    >
      <div className="pv-inner">
        <header className="pv-topbar">
          <div className="pv-brand">
            <span>
              <Icon name={brandIcons[spec.app]} size={22} />
            </span>
            {brands[spec.app]}
          </div>
          {spec.app === "landing" ? (
            <nav aria-label="Product sections">
              {["features", "pricing", "faq"]
                .filter((s) => spec.sections.includes(s))
                .map((s) => (
                  <button key={s} onClick={(e) => scrollTo(s, e.currentTarget)}>
                    {s === "faq"
                      ? "Questions"
                      : s[0].toUpperCase() + s.slice(1)}
                  </button>
                ))}
            </nav>
          ) : (
            <span className="pv-topbar-tag">{taglines[spec.app]}</span>
          )}
          <div className="pv-topbar-end">
            {spec.app === "stays" ? (
              <span>
                <Icon name="heart" size={15} /> {state.saved.length} saved
              </span>
            ) : spec.app === "shop" ? (
              <span>
                <Icon name="bag" size={17} /> Bag ({cartCount})
              </span>
            ) : spec.app === "analytics" ? (
              <span className="pv-workspace-badge">
                Acme Studio <span className="pv-avatar">AS</span>
              </span>
            ) : spec.app === "board" ? (
              <span className="pv-badge">Workspace / Website</span>
            ) : spec.app === "inbox" ? (
              <span className="pv-agent-status">
                <i /> Here to help
              </span>
            ) : (
              <span className="pv-badge">Interactive demo</span>
            )}
          </div>
        </header>
        {spec.app !== "landing" && spec.hero !== "hidden" && (
          <div className="pv-hero">
            <div>
              <span className="pv-eyebrow">{taglines[spec.app]}</span>
              <h2>{spec.title}</h2>
              <p>{spec.subtitle}</p>
            </div>
            {spec.app === "stays" && (
              <div className="pv-hero-seal">
                <Icon name="sun" size={31} />
                <span>
                  LESS ORDINARY.
                  <br />
                  MORE YOURS.
                </span>
              </div>
            )}
            {spec.app === "shop" && (
              <div className="pv-hero-seal">
                <span>
                  THE EVERYDAY
                  <br />
                  COLLECTION
                </span>
                <strong>№ 01</strong>
              </div>
            )}
            {spec.app === "analytics" && (
              <span className="pv-dashboard-date">
                <Icon name="clock" size={16} /> A snapshot of the last{" "}
                {state.period}
              </span>
            )}
          </div>
        )}
        <main className="pv-sections">
          {spec.sections.map((section) => (
            <section
              key={section}
              className={`pv-section pv-section-${section}`}
              data-section={section}
            >
              {renderers[spec.app](section)}
            </section>
          ))}
        </main>
        {state.notice && (
          <div className="pv-notice" role="status">
            <Icon name="check" size={17} />
            <span>{state.notice}</span>
            <button
              className="pv-icon-button"
              aria-label="Dismiss notice"
              onClick={() => patch({ notice: "" })}
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        )}
        <footer className="pv-footer">
          <span>
            <Icon name="spark" size={12} /> Fictional brand · synthetic sample
            data · local interactions
          </span>
          <span>Made for the Jev × Laya experiment</span>
        </footer>
      </div>
    </div>
  );
}
export default function Preview(props: { spec: UISpec; instanceId: string }) {
  return <PreviewInstance key={props.instanceId} {...props} />;
}
