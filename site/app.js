// Live API Hub — static directory front-end.
// Loads data/apis.json (tries site/data/ first, then ../data/ for repo-root serving).

const DATA_URLS = ["data/apis.json", "../data/apis.json"];

const state = { apis: [], meta: null };
let activeCategory = "";
let allCategories = [];

// Two-parent structure (v0.6.2, revised 2026-11-17): the main row holds
// "Public API" and "Git Projects" plus "Social Media" and "SEO", right
// after the tier chips. Every other data category lives under one of the
// parents as a sub-category. "Mobile Agent" is itself a group under Git
// Projects, with Termux / Android as a third level.
const PINNED_CATS = ["Public API", "Git Projects", "Social Media", "SEO"];
const MAIN_CATS = ["Social Media", "SEO"];
const GIT_CATS = ["Agent For Termux", "Agent For Android", "Agent Skill", "Free Agent Tools"];
const SUBCATS = {
  "Git Projects": ["Mobile Agent", "Agent Skill", "Free Agent Tools"],
  "Mobile Agent": ["Agent For Termux", "Agent For Android"],
};
let activeSubcategory = "";
let activeSubSubcategory = "";

function subcatsFor(parent) {
  if (parent === "Public API") return allCategories.filter((c) => !GIT_CATS.includes(c) && !MAIN_CATS.includes(c));
  return SUBCATS[parent] || null;
}

// Expand a group (Mobile Agent) into the data categories it holds, so the
// Git Projects parent view matches real entries.
function expandCats(cats) {
  return cats.flatMap((c) => SUBCATS[c] || c);
}

// Opening-page order (vibe-coder essentials first). The default view and the
// tier views (Free / Free Tier / Paid) — no category, search, auth or HTTPS
// filter active — show these APIs first, in this order, grouped by what
// people actually build with: prototype data, dev tools, everyday data,
// bots, content apps, then fun. Everything else follows in the normal
// category / tier / name order. Category and search views always use the
// normal order.
const CURATED_ORDER = [
  // Prototype data — fake APIs for building fast
  "github-rest", "jsonplaceholder", "dummyjson", "reqres", "fakerapi",
  "fake-store", "random-user",
  // Dev tools
  "httpbin", "iconify", "ui-avatars",
  // Everyday data
  "openweathermap", "open-meteo", "newsapi", "gnews", "rest-countries",
  "exchangerate-api", "frankfurter", "ip-api", "nominatim",
  // Bots & social
  "telegram-bot-api", "discord-api", "youtube", "bluesky", "dev-to",
  // Content apps — the classic tutorial projects
  "tmdb", "pokeapi", "open-library", "google-books", "coingecko",
  "binance", "stack-exchange", "hacker-news", "nasa",
  // Fun & media
  "thecatapi", "cataas", "quotable", "jokeapi", "deezer",
  "itunes-search", "libretranslate",
];

const $ = (id) => document.getElementById(id);

async function loadData() {
  let lastError = null;
  for (const url of DATA_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Could not load API data.");
}

function statusLabel(status) {
  return { live: "Live", reachable: "Reachable", down: "Down", unknown: "Unknown" }[status] || status;
}

// Card title icons: git projects (docs at github.com/owner/repo) show the
// repo owner's GitHub avatar; APIs show the provider's favicon via Google's
// favicon service, keyed by the docs site's hostname.
function iconFor(api) {
  let url;
  try {
    url = new URL(api.docs_url);
  } catch (e) {
    return null;
  }
  if (url.hostname === "github.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const reserved = ["orgs", "settings", "marketplace", "sponsors", "search"];
    if (parts.length >= 2 && !reserved.includes(parts[0])) {
      return { src: "https://github.com/" + parts[0] + ".png", cls: "icon-avatar" };
    }
  }
  return { src: "https://www.google.com/s2/favicons?domain=" + url.hostname + "&sz=64", cls: "icon-favicon" };
}

function iconImg(api) {
  const icon = iconFor(api);
  if (!icon) return "";
  return `<img class="title-icon ${icon.cls}" src="${escapeHtml(icon.src)}" alt="" loading="lazy" onerror="this.style.display='none'">`;
}

// Related entries: same category by default; curated tight groups override
// the category where a category is too broad (Free Agent Tools mixes LLM
// routers, MCP servers, scanners and more). Group-mates are each other's
// related entries; everyone else falls back to same-category entries.
const RELATED_GROUPS = [
  ["freellmapi", "litellm", "portkey-gateway", "bifrost", "llm-gateway", "awesome-freellm-apis", "omniroute"],
  ["context7", "github-mcp-server", "gitmcp", "tavily-mcp"],
];

// id -> related entry objects. Rebuilt once per render() (state.apis only
// changes on local add/remove, and both call render() right after).
let relatedById = null;
function buildRelatedIndex() {
  const byId = new Map(state.apis.map((a) => [a.id, a]));
  const byCat = new Map();
  for (const a of state.apis) {
    if (!byCat.has(a.category)) byCat.set(a.category, []);
    byCat.get(a.category).push(a);
  }
  const groupOf = new Map();
  for (const g of RELATED_GROUPS) {
    for (const id of g) groupOf.set(id, g);
  }
  relatedById = new Map();
  for (const a of state.apis) {
    const g = groupOf.get(a.id);
    if (g) {
      relatedById.set(a.id, g.filter((id) => id !== a.id).map((id) => byId.get(id)).filter(Boolean));
    } else {
      relatedById.set(a.id, (byCat.get(a.category) || []).filter((x) => x.id !== a.id));
    }
  }
}

function relatedFor(api) {
  if (!relatedById) buildRelatedIndex();
  return relatedById.get(api.id) || [];
}

// Best overall comparison data: structured, comparable attributes per related
// group. Only groups listed here get a RANKED comparison (scorecard: 1 point
// per attribute won, ties share the win, null/missing never wins; ties broken
// by the group's primary attribute, then by name). Other groups fall back to
// an alphabetical, unranked table. Figures come from each project's own
// README/docs (see router-compare-notes.md and phase2-*-notes.md); null = not stated by the project.
// To add a group later: add its config + data here, nothing else changes.
const COMPARISON_GROUPS = {
  "llm-routers": {
    ids: ["freellmapi", "litellm", "portkey-gateway", "bifrost", "llm-gateway", "awesome-freellm-apis", "omniroute"],
    primary: "free_tokens_monthly",
    note: "Free-token figures use each project's own methodology and are not like-for-like: FreeLLMAPI counts listed free-tier capacity; OmniRoute counts published budgets only (pool-deduped).",
    attributes: [
      { key: "free_tokens_monthly", label: "Free tokens/mo", type: "number", higherBetter: true, suffix: "B" },
      { key: "providers", label: "Providers", type: "number", higherBetter: true },
      { key: "platforms", label: "Platforms", type: "list", higherBetter: true },
      { key: "account_required", label: "Account needed", type: "boolean", higherBetter: false },
      { key: "self_hosted", label: "Self-hosted", type: "boolean", higherBetter: true },
      { key: "termux", label: "Termux", type: "boolean", higherBetter: true },
    ],
    data: {
      freellmapi: { free_tokens_monthly: 10.1, providers: 87, platforms: ["Docker", "Desktop", "Android", "iOS", "Local", "Termux"], account_required: false, self_hosted: true, termux: true },
      litellm: { free_tokens_monthly: null, providers: 100, platforms: ["Docker", "Local", "Cloud deploy"], account_required: false, self_hosted: true, termux: false },
      "portkey-gateway": { free_tokens_monthly: null, providers: 45, platforms: ["Docker", "Local", "Cloud deploy", "Cloud"], account_required: false, self_hosted: true, termux: false },
      bifrost: { free_tokens_monthly: null, providers: 23, platforms: ["Docker", "Local", "K8s"], account_required: false, self_hosted: true, termux: false },
      "llm-gateway": { free_tokens_monthly: null, providers: 35, platforms: ["Docker", "Cloud deploy", "Cloud"], account_required: false, self_hosted: true, termux: false },
      "awesome-freellm-apis": { free_tokens_monthly: null, providers: 22, platforms: ["Website"], account_required: false, self_hosted: null, termux: false },
      omniroute: { free_tokens_monthly: 1.62, providers: 394, platforms: ["Local", "Docker", "Desktop", "Termux", "PWA", "Cloud"], account_required: false, self_hosted: true, termux: true },
    },
  },
  "mcp-servers": {
    ids: ["context7", "github-mcp-server", "gitmcp", "tavily-mcp"],
    primary: "api_key_required",
    note: "These 4 do different jobs (docs index / GitHub ops / repo-as-docs / web search) — the rank compares setup friction, self-hostability and install flexibility, not capability. Pick by the job you need. Install-method counts reflect what each project's own README documents.",
    attributes: [
      { key: "api_key_required", label: "API key needed", type: "boolean", higherBetter: false },
      { key: "self_hosted", label: "Self-hostable", type: "boolean", higherBetter: true },
      { key: "install_methods", label: "Install methods", type: "list", higherBetter: true },
    ],
    data: {
      context7: { api_key_required: false, self_hosted: false, install_methods: ["npx", "Remote URL"] },
      "github-mcp-server": { api_key_required: true, self_hosted: true, install_methods: ["Docker", "Remote URL", "Go build"] },
      gitmcp: { api_key_required: false, self_hosted: true, install_methods: ["Remote URL", "npx mcp-remote"] },
      "tavily-mcp": { api_key_required: true, self_hosted: false, install_methods: ["npx", "Remote URL", "npx mcp-remote"] },
    },
  },
  "freellm-gateways": {
    ids: ["orcarouter", "kilo-gateway", "llm7", "unorouter", "nvidia-build", "openrouter", "pollinations", "groq", "google-ai-studio", "hcnsec"],
    primary: "free_requests_per_day",
    note: "Free req/day mixes published daily caps (OrcaRouter, OpenRouter, Groq), caps derived from published hourly/minute limits (Kilo 200/hr, UnoRouter ~1/min per model — approximate), and unstated caps shown as — (LLM7 is token-capped at 100,000 tokens/day; NVIDIA, Google AI Studio, hcnsec and Pollinations publish no daily request figure).",
    attributes: [
      { key: "free_requests_per_day", label: "Free req/day", type: "number", higherBetter: true, suffix: "/day" },
      { key: "deepseek_free", label: "DeepSeek free", type: "boolean", higherBetter: true },
      { key: "glm_free", label: "GLM free", type: "boolean", higherBetter: true },
      { key: "api_key_required", label: "API key needed", type: "boolean", higherBetter: false },
      { key: "signup_required", label: "Signup needed", type: "boolean", higherBetter: false },
    ],
    data: {
      orcarouter: { free_requests_per_day: 50, deepseek_free: true, glm_free: true, api_key_required: true, signup_required: true },
      "kilo-gateway": { free_requests_per_day: 4800, deepseek_free: false, glm_free: false, api_key_required: false, signup_required: false },
      llm7: { free_requests_per_day: null, deepseek_free: true, glm_free: true, api_key_required: true, signup_required: true },
      unorouter: { free_requests_per_day: 1440, deepseek_free: true, glm_free: true, api_key_required: true, signup_required: true },
      "nvidia-build": { free_requests_per_day: null, deepseek_free: true, glm_free: true, api_key_required: true, signup_required: true },
      openrouter: { free_requests_per_day: 50, deepseek_free: false, glm_free: false, api_key_required: true, signup_required: true },
      pollinations: { free_requests_per_day: null, deepseek_free: false, glm_free: false, api_key_required: false, signup_required: false },
      groq: { free_requests_per_day: 1000, deepseek_free: false, glm_free: false, api_key_required: true, signup_required: true },
      "google-ai-studio": { free_requests_per_day: null, deepseek_free: false, glm_free: false, api_key_required: true, signup_required: true },
      hcnsec: { free_requests_per_day: null, deepseek_free: true, glm_free: true, api_key_required: true, signup_required: true },
    },
  },
  "termux-agents": {
    ids: ["aichat", "aider", "codebase-memory-mcp", "core-termux", "deepseek-harness", "fabric", "freebuff", "goose", "gptme", "hermes-agent", "kimi-code", "llm", "ollama", "open-interpreter", "openclaw", "openclaw-android", "opencode", "opencode-termux", "pi", "shell-gpt", "termux-mcp", "tgpt"],
    primary: "providers",
    note: "Provider counts use each project's own figures and are not like-for-like: Open Interpreter counts its generated catalog (117), OpenCode its stated 75+ providers, Fabric/tgpt/OpenClaw are counts from the project's own vendor list, and Kimi Code counts 7 provider types (each can host several endpoints). Free no-key options counts OpenCode's 13 built-in free models, Freebuff's 8 ad-supported free models, and tgpt's 7 no-key backends (third-party free services, not tgpt's own models). Free-model rosters change without notice — OpenCode listed 14 free models on 2026-11-15 and 13 today. Termux-native means it installs/runs in native Termux; entries marked from a standard pip/npm/go install path have not been tested on a phone.",
    attributes: [
      { key: "providers", label: "Providers", type: "number", higherBetter: true },
      { key: "free_no_key", label: "Free no-key options", type: "number", higherBetter: true },
      { key: "free_gateway", label: "Free gateway path", type: "boolean", higherBetter: true },
      { key: "termux_native", label: "Runs in native Termux", type: "boolean", higherBetter: true },
    ],
    data: {
      aichat: { providers: 20, free_no_key: null, free_gateway: true, termux_native: true },
      aider: { providers: null, free_no_key: null, free_gateway: true, termux_native: true },
      "codebase-memory-mcp": { providers: null, free_no_key: null, free_gateway: null, termux_native: false },
      "core-termux": { providers: null, free_no_key: null, free_gateway: null, termux_native: true },
      "deepseek-harness": { providers: null, free_no_key: null, free_gateway: true, termux_native: true },
      fabric: { providers: 52, free_no_key: null, free_gateway: true, termux_native: true },
      freebuff: { providers: null, free_no_key: 8, free_gateway: null, termux_native: true },
      goose: { providers: 15, free_no_key: null, free_gateway: true, termux_native: true },
      gptme: { providers: null, free_no_key: null, free_gateway: true, termux_native: true },
      "hermes-agent": { providers: null, free_no_key: null, free_gateway: true, termux_native: false },
      "kimi-code": { providers: 7, free_no_key: null, free_gateway: true, termux_native: true },
      llm: { providers: null, free_no_key: null, free_gateway: true, termux_native: true },
      ollama: { providers: null, free_no_key: null, free_gateway: null, termux_native: true },
      "open-interpreter": { providers: 117, free_no_key: null, free_gateway: true, termux_native: true },
      openclaw: { providers: 37, free_no_key: null, free_gateway: true, termux_native: true },
      "openclaw-android": { providers: null, free_no_key: null, free_gateway: null, termux_native: false },
      opencode: { providers: 75, free_no_key: 13, free_gateway: true, termux_native: false },
      "opencode-termux": { providers: 75, free_no_key: 13, free_gateway: true, termux_native: true },
      pi: { providers: null, free_no_key: null, free_gateway: true, termux_native: true },
      "shell-gpt": { providers: null, free_no_key: null, free_gateway: true, termux_native: true },
      "termux-mcp": { providers: null, free_no_key: null, free_gateway: null, termux_native: true },
      tgpt: { providers: 26, free_no_key: 7, free_gateway: true, termux_native: true },
    },
  },
  "android-agents": {
    ids: ["aicode", "android-ad-cleaner", "chatbox", "concat", "dsh-android", "dsh-go", "locus", "mika", "openclaw-app", "plain-app", "pocketpal-ai", "rikkahub", "voice-studio"],
    primary: "min_android",
    note: "SCORES: 1 point per attribute won; ties share the win. RANKING FAVOURS AI AGENTS: multi-model and free-path don't apply to the 4 utility apps (VoiceStudio, Concat, Plain App, Android Ad Cleaner), so those can score at most 3 of 5 points — compare apps against apps on Min Android, install sources and open-source status. MIN ANDROID is the install minimum: Mika installs on Android 11 but app control needs 12+ (14+ recommended). MIN-ANDROID SOURCES VARY: README statements, app build files (minSdk), project docs and the official website — all the projects' own pages. INSTALL SOURCES count distinct Android channels only (Play, F-Droid, GitHub APK, website APK, Termux/npm); Obtainium is an update tracker, not a source. POCKETPAL counts as multi-model via on-device GGUF models plus remote OpenAI-compatible servers.",
    attributes: [
      { key: "multi_model", label: "Multi-model", type: "boolean", higherBetter: true },
      { key: "free_path", label: "Free path", type: "boolean", higherBetter: true },
      { key: "min_android", label: "Min Android", type: "number", higherBetter: false, suffix: "+" },
      { key: "install_sources", label: "Install sources", type: "list", higherBetter: true },
      { key: "open_source", label: "Open source", type: "boolean", higherBetter: true },
    ],
    data: {
      aicode: { multi_model: true, free_path: true, min_android: 8, install_sources: ["GitHub APK"], open_source: true },
      "android-ad-cleaner": { multi_model: null, free_path: null, min_android: 11, install_sources: ["GitHub APK"], open_source: true },
      chatbox: { multi_model: true, free_path: true, min_android: null, install_sources: ["Google Play", "Website APK"], open_source: true },
      concat: { multi_model: null, free_path: null, min_android: 8, install_sources: ["Website", "GitHub APK"], open_source: true },
      "dsh-android": { multi_model: true, free_path: true, min_android: 10, install_sources: ["GitHub APK"], open_source: true },
      "dsh-go": { multi_model: true, free_path: true, min_android: 8, install_sources: ["GitHub APK"], open_source: true },
      locus: { multi_model: true, free_path: true, min_android: 8, install_sources: ["GitHub APK"], open_source: true },
      mika: { multi_model: true, free_path: true, min_android: 11, install_sources: ["GitHub APK"], open_source: true },
      "openclaw-app": { multi_model: true, free_path: true, min_android: 10, install_sources: ["GitHub APK", "Termux CLI"], open_source: true },
      "plain-app": { multi_model: null, free_path: null, min_android: 9, install_sources: ["Google Play", "F-Droid", "GitHub APK"], open_source: true },
      "pocketpal-ai": { multi_model: true, free_path: true, min_android: 7, install_sources: ["Google Play", "GitHub APK"], open_source: true },
      rikkahub: { multi_model: true, free_path: true, min_android: 8, install_sources: ["Website", "Google Play"], open_source: true },
      "voice-studio": { multi_model: null, free_path: null, min_android: 10, install_sources: ["GitHub APK", "F-Droid repo"], open_source: true },
    },
  },
};

function comparisonGroupFor(api) {
  return Object.values(COMPARISON_GROUPS).find((g) => g.ids.includes(api.id)) || null;
}

function attrValue(group, api, attr) {
  const row = group.data[api.id];
  if (!row) return null;
  const v = row[attr.key];
  return v === undefined ? null : v;
}

// Comparable score for ranking: numbers as-is, lists by count, booleans as
// 1/0. Null stays null (missing values never win an attribute).
function attrScore(group, api, attr) {
  const v = attrValue(group, api, attr);
  if (v === null) return null;
  if (attr.type === "list") return v.length;
  if (attr.type === "boolean") return v ? 1 : 0;
  return v;
}

function attrDisplay(group, api, attr) {
  const v = attrValue(group, api, attr);
  if (v === null) return "—";
  if (attr.type === "list") return v.length ? v.join(", ") : "—";
  if (attr.type === "boolean") return v ? "Yes" : "No";
  return String(v) + (attr.suffix || "");
}

// Map attrKey -> Set of entry ids holding the best value in this set.
function attributeWinners(group, entries) {
  const winners = new Map();
  for (const attr of group.attributes) {
    const scored = entries
      .map((a) => ({ id: a.id, s: attrScore(group, a, attr) }))
      .filter((x) => x.s !== null);
    let best = null;
    for (const x of scored) {
      if (best === null || (attr.higherBetter ? x.s > best : x.s < best)) best = x.s;
    }
    winners.set(attr.key, new Set(scored.filter((x) => x.s === best).map((x) => x.id)));
  }
  return winners;
}

// Rank the current entry + its related entries for the comparison table.
// Ranked groups: scorecard (points = attributes won), tie-break = primary
// attribute desc (nulls last), then name asc. Unranked groups: alphabetical
// by name, no ranks — the current entry is NOT auto-first either way.
function rankRelated(current, related) {
  const group = comparisonGroupFor(current);
  const entries = [current, ...related];
  if (!group) {
    const rows = entries.slice().sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => ({ api: a, rank: null, wins: 0 }));
    return { ranked: false, group: null, rows, winners: null };
  }
  const winners = attributeWinners(group, entries);
  const wins = new Map(entries.map((a) => [a.id, 0]));
  for (const set of winners.values()) for (const id of set) wins.set(id, wins.get(id) + 1);
  const primaryAttr = group.attributes.find((a) => a.key === group.primary);
  const rows = entries.slice().sort((a, b) => {
    const wa = wins.get(a.id), wb = wins.get(b.id);
    if (wa !== wb) return wb - wa;
    const pa = attrScore(group, a, primaryAttr), pb = attrScore(group, b, primaryAttr);
    if (pa !== pb) {
      if (pa === null) return 1;
      if (pb === null) return -1;
      return primaryAttr.higherBetter ? pb - pa : pa - pb;
    }
    return a.name.localeCompare(b.name);
  }).map((a, i) => ({ api: a, rank: i + 1, wins: wins.get(a.id) }));
  return { ranked: true, group, rows, winners };
}

function cardHtml(api) {
  const tierBadge = api.tier === "paid"
    ? `<span class="tier-badge paid">Paid</span>`
    : api.tier === "freemium"
      ? `<span class="tier-badge freemium">Free Tier</span>`
      : `<span class="tier-badge free">100% Free</span>`;
  const related = relatedFor(api);
  const relatedBadge = related.length > 0
    ? `<span class="related-badge">${related.length} related</span>`
    : "";
  // Compact card: name + category + tier + a 2-line description. The full
  // detail (chips, limits, access guide, docs link, Try-it) lives in the
  // detail modal, opened by clicking the card.
  return `
  <article class="card" data-id="${escapeHtml(api.id)}">
    <div class="card-top">
      <span class="category">${escapeHtml(api.category)}</span>
      ${tierBadge}
      ${relatedBadge}
      ${api._local ? `<span class="local-badge">Added by you</span>` : ""}
    </div>
    <h2>${iconImg(api)}<span>${escapeHtml(api.name)}</span></h2>
    <p class="card-desc">${escapeHtml(api.description)}</p>
    ${api._local ? `<button class="remove-btn" type="button" data-remove-id="${escapeHtml(api.id)}">Remove</button>` : ""}
  </article>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function filteredApis() {
  const q = $("search").value.trim().toLowerCase();
  const auth = $("auth").value;
  const tier = $("tier").value;
  const httpsOnly = $("https-only").checked;
  return state.apis.filter((api) => {
    if (q && !(api.name + " " + api.description + " " + api.category).toLowerCase().includes(q)) return false;
    const subs = subcatsFor(activeCategory);
    if (subs) {
      // Parent view: a sub-category narrows to it, otherwise all of them.
      // A sub-category can itself be a group (Mobile Agent): then the
      // third-level chip narrows further, otherwise all its categories.
      if (activeSubcategory) {
        const subSubs = subcatsFor(activeSubcategory);
        if (subSubs) {
          if (activeSubSubcategory) {
            if (api.category !== activeSubSubcategory) return false;
          } else if (!subSubs.includes(api.category)) return false;
        } else if (api.category !== activeSubcategory) return false;
      } else if (!expandCats(subs).includes(api.category)) return false;
    } else if (activeCategory && api.category !== activeCategory) return false;
    if (auth && api.auth !== auth) return false;
    if (tier && api.tier !== tier) return false;
    if (httpsOnly && !api.https) return false;
    return true;
  });
}

function tierRank(api) {
  return { free: 0, freemium: 1, paid: 2 }[api.tier] ?? 0;
}

function defaultSort(a, b) {
  return a.category.localeCompare(b.category) ||
    tierRank(a) - tierRank(b) ||
    a.name.localeCompare(b.name);
}

function curatedApplies() {
  // Curated order on the opening page AND on the tier views (Free / Free
  // Tier / Paid): a tier filter is fine, but a category, search, auth or
  // HTTPS filter switches back to the normal sort.
  return $("search").value.trim() === "" &&
    activeCategory === "" &&
    $("auth").value === "" &&
    !$("https-only").checked;
}

function render() {
  buildRelatedIndex();
  const list = filteredApis();
  if (curatedApplies()) {
    // Opening page and tier views: vibe-coder essentials first, then the
    // normal order.
    const rank = new Map(CURATED_ORDER.map((id, i) => [id, i]));
    list.sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id) : Infinity;
      const rb = rank.has(b.id) ? rank.get(b.id) : Infinity;
      if (ra !== rb) return ra - rb;
      return defaultSort(a, b);
    });
  } else {
    list.sort(defaultSort);
  }
  $("results").innerHTML = list.map(cardHtml).join("") ||
    `<p>No APIs match these filters. Try clearing the search or a filter.</p>`;
  $("result-count").textContent =
    `Showing ${list.length} of ${state.apis.length} APIs` +
    (list.length !== state.apis.length ? " (filtered)" : "");
}

const TIER_CHIPS = [
  { tier: "free", label: "Free" },
  { tier: "freemium", label: "Free Tier" },
  { tier: "paid", label: "Paid" },
];

function renderChips() {
  const wrap = $("category-chips");
  const tier = $("tier").value;
  const allActive = !activeCategory && !tier;
  let html = `<button type="button" class="chip-btn${allActive ? " active" : ""}" data-cat="">All</button>`;
  for (const t of TIER_CHIPS) {
    const active = !activeCategory && tier === t.tier;
    html += `<button type="button" class="chip-btn${active ? " active" : ""}" data-tier="${t.tier}">${t.label}</button>`;
  }
  // The two parent chips plus Social Media and SEO show in the main row;
  // every other data category lives under a parent as a sub-category.
  for (const c of PINNED_CATS) {
    const active = c === activeCategory;
    const subs = subcatsFor(c);
    if (subs) {
      // Parent chip + its sub-chips as one group, so the sub-chips sit
      // directly below the chip (not at the bottom of the row).
      html += `<span class="chip-group"><button type="button" class="chip-btn${active ? " active" : ""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>${active ? subChipsHtml(subs) : ""}</span>`;
    } else {
      html += `<button type="button" class="chip-btn${active ? " active" : ""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`;
    }
  }
  wrap.innerHTML = html;
  wrap.querySelectorAll("button[data-cat], button[data-tier]").forEach((b) => {
    b.addEventListener("click", () => {
      if (b.dataset.tier) {
        // Tier chip: filter by tier across all categories.
        $("tier").value = b.dataset.tier;
        activeCategory = "";
        activeSubcategory = "";
        activeSubSubcategory = "";
      } else {
        // Category chip (or All): filter by category, clear the tier.
        activeCategory = b.dataset.cat;
        $("tier").value = "";
        activeSubcategory = "";
        activeSubSubcategory = "";
      }
      renderChips();
      render();
    });
  });
  wrap.querySelectorAll("button[data-subcat]").forEach((b) => {
    b.addEventListener("click", () => {
      // Toggle: clicking the active sub-category goes back to the parent view.
      activeSubcategory = b.dataset.subcat === activeSubcategory ? "" : b.dataset.subcat;
      activeSubSubcategory = "";
      renderChips();
      render();
    });
  });
  wrap.querySelectorAll("button[data-subsubcat]").forEach((b) => {
    b.addEventListener("click", () => {
      // Toggle: clicking the active third-level chip goes back to the group view.
      activeSubSubcategory = b.dataset.subsubcat === activeSubSubcategory ? "" : b.dataset.subsubcat;
      renderChips();
      render();
    });
  });
}

function subChipsHtml(subs) {
  let html = `<span class="sub-chips">${subs.map((c) =>
    `<button type="button" class="chip-btn sub${c === activeSubcategory ? " active" : ""}" data-subcat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join("")}</span>`;
  // Third level: when the active sub-category is itself a group
  // (Mobile Agent), show its chips in a nested row below.
  const subSubs = activeSubcategory ? subcatsFor(activeSubcategory) : null;
  if (subSubs) {
    html += `<span class="sub-chips nested">${subSubs.map((c) =>
      `<button type="button" class="chip-btn sub${c === activeSubSubcategory ? " active" : ""}" data-subsubcat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
    ).join("")}</span>`;
  }
  return html;
}

function formatTryResult(text) {
  const LIMIT = 3000;
  let out = text;
  try { out = JSON.stringify(JSON.parse(text), null, 2); } catch (e) { /* keep raw text */ }
  return out.length > LIMIT ? out.slice(0, LIMIT) + "\n… (truncated)" : out;
}

async function runTryIt(btn, panel) {
  const url = btn.dataset.url;
  const statusEl = panel.querySelector(".try-status");
  const resultEl = panel.querySelector(".try-result");
  btn.disabled = true;
  btn.textContent = "Loading…";
  panel.hidden = false;
  statusEl.textContent = "Fetching…";
  resultEl.textContent = "";
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await res.text();
    statusEl.textContent = `HTTP ${res.status} · ${text.length.toLocaleString()} bytes`;
    resultEl.textContent = formatTryResult(text);
  } catch (err) {
    statusEl.textContent = "Request failed";
    resultEl.textContent = "Couldn't load this response in the browser. The API may block browser calls (CORS) or be unreachable from here.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Hide result";
  }
}

function onResultsClick(e) {
  const rm = e.target.closest(".remove-btn");
  if (rm) {
    removeLocalEntry(rm.dataset.removeId);
    return;
  }
  const btn = e.target.closest(".try-btn");
  if (btn) {
    const panel = btn.nextElementSibling;
    if (!panel || !panel.classList.contains("try-panel")) return;
    if (!panel.hidden) {
      panel.hidden = true;
      btn.textContent = "Try it";
      return;
    }
    runTryIt(btn, panel);
    return;
  }
  // Anything else inside a card opens the detail modal — except links and
  // buttons, which keep their own behaviour.
  if (e.target.closest("a, button")) return;
  const card = e.target.closest(".card");
  if (card) openDetail(card.dataset.id);
}

const ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>';

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

function updateThemeButton(theme) {
  $("theme-toggle").innerHTML = theme === "dark" ? ICON_SUN : ICON_MOON;
}

function initTheme() {
  const btn = $("theme-toggle");
  updateThemeButton(currentTheme());
  btn.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("lah-theme", next); } catch (e) { /* private mode */ }
    updateThemeButton(next);
  });
}

function initFilters() {
  allCategories = [...new Set(state.apis.map((a) => a.category))].sort();
  $("cat-count").textContent = allCategories.length;
  renderChips();
  for (const id of ["search", "auth", "tier", "https-only"]) {
    $(id).addEventListener("input", render);
    $(id).addEventListener("change", render);
  }
  // Tier dropdown and chips stay in sync: picking a tier in the dropdown
  // clears the category so the matching tier chip lights up.
  $("tier").addEventListener("change", () => {
    activeCategory = "";
    activeSubcategory = "";
    activeSubSubcategory = "";
    renderChips();
    render();
  });
}

async function init() {
  initTheme();
  $("results").addEventListener("click", onResultsClick);
  try {
    const data = await loadData();
    state.apis = [...(data.apis || [])];
    for (const a of loadAdded()) {
      if (!state.apis.some((x) => x.id === a.id)) {
        state.apis.push({ ...a, _local: true });
      }
    }
    state.meta = data;
    $("total-count").textContent = state.apis.length;
    $("live-count").textContent = state.apis.filter((a) => a.status === "live").length;
    $("updated-date").textContent = data.updated || "—";
    initFilters();
    initAdd();
    initDetail();
    render();
  } catch (err) {
    const el = $("load-error");
    el.hidden = false;
    el.textContent =
      "Could not load data/apis.json. If you opened index.html directly (file://), serve the site/ folder instead: run python3 -m http.server 8001 from site/ — then open http://localhost:8001/";
    $("result-count").textContent = "";
  }
}

// ---- Manual Add (v0.6) ----
// Additions save in this browser's localStorage only; nothing here writes
// data/apis.json. Copy JSON exports an entry for a permanent directory add.
const ADDED_KEY = "lah-added-apis";

function loadAdded() {
  try {
    const raw = localStorage.getItem(ADDED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function saveAdded(list) {
  try {
    localStorage.setItem(ADDED_KEY, JSON.stringify(list));
  } catch (e) { /* private mode / full storage: additions stay in memory only */ }
}

function refreshCounts() {
  $("total-count").textContent = state.apis.length;
  $("live-count").textContent = state.apis.filter((a) => a.status === "live").length;
  $("cat-count").textContent = [...new Set(state.apis.map((a) => a.category))].length;
}

function removeLocalEntry(id) {
  state.apis = state.apis.filter((a) => a.id !== id);
  saveAdded(loadAdded().filter((a) => a.id !== id));
  allCategories = [...new Set(state.apis.map((a) => a.category))].sort();
  refreshCounts();
  renderChips();
  render();
}

function slugify(name) {
  return String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "api";
}

function uniqueId(base) {
  let id = base;
  let n = 2;
  while (state.apis.some((a) => a.id === id)) {
    id = `${base}-${n++}`;
  }
  return id;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeUrl(raw) {
  const u = new URL(raw);
  const host = u.hostname.toLowerCase();
  const path = u.pathname.replace(/\/+$/, "");
  return `${u.protocol}//${host}${path}${u.search}`;
}

function findDuplicates(raw) {
  let exact = null;
  const sameSite = [];
  try {
    const norm = normalizeUrl(raw);
    const host = new URL(raw).hostname.toLowerCase();
    for (const a of state.apis) {
      try {
        if (normalizeUrl(a.docs_url) === norm) exact = a;
        else if (new URL(a.docs_url).hostname.toLowerCase() === host) sameSite.push(a);
      } catch (e) { /* skip bad stored URLs */ }
    }
  } catch (e) { /* invalid URL: no duplicates */ }
  return { exact, sameSite };
}

function isGithubUrl(raw) {
  try {
    return new URL(raw).hostname.toLowerCase() === "github.com";
  } catch (e) {
    return false;
  }
}

async function checkLinkLive(raw, timeoutMs = 10000) {
  // no-cors: an opaque response means the server answered (live); only a
  // network failure rejects. Status codes are not visible from the browser.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await fetch(raw, { mode: "no-cors", signal: ctrl.signal });
    return true;
  } catch (e) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function setResult(el, text, kind) {
  el.textContent = text;
  el.className = "check-result" + (kind ? ` ${kind}` : "");
}

function categoryOptions() {
  // Pinned sections with no entries yet still need to be pickable.
  const extra = ["Agent For Termux", "Agent For Android", "Agent Skill", "FreeLLM API", "Free Agent Tools"];
  return [...new Set([...allCategories, ...extra])].sort();
}

function fillCategorySelect(select, opts) {
  const cats = categoryOptions();
  select.innerHTML = cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("") +
    (opts.newOption ? `<option value="__new__">＋ New category…</option>` : "");
  if (opts.default && cats.includes(opts.default)) select.value = opts.default;
}

function showExportJson(preEl, entry) {
  preEl.textContent = JSON.stringify(entry, null, 2);
  preEl.hidden = false;
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied!";
  } catch (e) {
    btn.textContent = "Select the JSON below and copy it";
  }
  setTimeout(() => { btn.textContent = "Copy JSON"; }, 2000);
}

let apiCheck = null; // { link, live, duplicate }
let repoCheck = null; // { link, info, duplicate }

function updateApiAddState() {
  const ok = apiCheck && apiCheck.live && !apiCheck.duplicate &&
    $("api-name").value.trim() !== "" &&
    $("api-desc").value.trim() !== "" &&
    $("api-freetier").value.trim() !== "" &&
    ($("api-category").value !== "__new__" || $("api-newcat").value.trim() !== "");
  $("api-add-btn").disabled = !ok;
}

function updateRepoAddState() {
  const ok = repoCheck && repoCheck.info && !repoCheck.info.archived && !repoCheck.duplicate;
  $("repo-add-btn").disabled = !ok;
}

async function onApiCheck() {
  const link = $("api-link").value.trim();
  const resEl = $("api-check-result");
  const noteEl = $("api-github-note");
  noteEl.hidden = true;
  apiCheck = null;
  updateApiAddState();
  if (!link) {
    setResult(resEl, "Paste a link first.", "bad");
    return;
  }
  let url;
  try {
    url = new URL(link);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("bad protocol");
  } catch (e) {
    setResult(resEl, "That doesn't look like a valid http(s) link.", "bad");
    return;
  }
  if (isGithubUrl(link)) {
    noteEl.textContent = "This is a GitHub link — it belongs in the Git Repo form, where the repo's stars and license are checked.";
    noteEl.hidden = false;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "check-btn";
    btn.textContent = "Add as Git Repo instead";
    btn.addEventListener("click", () => {
      switchAddForm("repo");
      $("repo-link").value = link;
    });
    noteEl.appendChild(document.createElement("br"));
    noteEl.appendChild(btn);
  }
  setResult(resEl, "Checking…");
  const { exact, sameSite } = findDuplicates(link);
  const live = await checkLinkLive(link);
  apiCheck = { link, live, duplicate: !!exact };
  const lines = [];
  lines.push(live ? "✓ Live — the server answered." : "✗ Dead — no response from this link.");
  if (exact) lines.push(`✗ Already on the site as "${exact.name}".`);
  else if (sameSite.length) lines.push(`Note: same site as ${sameSite.map((a) => `"${a.name}"`).join(", ")} — check it isn't the same API.`);
  else lines.push("✓ Not on the site yet.");
  setResult(resEl, lines.join("\n"), live && !exact ? "ok" : "bad");
  if (!live) {
    resEl.textContent += "\n(If the site blocks browser calls this can be a false alarm — open the link yourself to confirm.)";
  }
  if (!$("api-name").value.trim()) {
    $("api-name").value = url.hostname.replace(/^www\./, "").split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  updateApiAddState();
}

function parseGithubRepo(link) {
  try {
    const u = new URL(link);
    if (u.hostname.toLowerCase() !== "github.com") return null;
    const parts = u.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch (e) {
    return null;
  }
}

async function onRepoCheck() {
  const link = $("repo-link").value.trim();
  const resEl = $("repo-check-result");
  repoCheck = null;
  updateRepoAddState();
  const parsed = parseGithubRepo(link);
  if (!parsed) {
    setResult(resEl, "Paste a GitHub repo link like https://github.com/owner/repo.", "bad");
    return;
  }
  setResult(resEl, "Checking…");
  const { exact } = findDuplicates(link);
  let info = null;
  try {
    const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, { headers: { Accept: "application/vnd.github+json" } });
    if (res.status === 404) {
      setResult(resEl, "Repo not found on GitHub — check the owner and repo name.", "bad");
      return;
    }
    if (res.status === 403) {
      setResult(resEl, "GitHub rate limit reached (60 checks/hour without a key). Try again later.", "bad");
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    info = await res.json();
  } catch (e) {
    setResult(resEl, "Couldn't reach GitHub — check your connection and try again.", "bad");
    return;
  }
  repoCheck = { link, info, duplicate: !!exact };
  const lines = [];
  lines.push(`✓ ${info.full_name} — ${info.stargazers_count.toLocaleString()} stars`);
  if (info.description) lines.push(info.description);
  lines.push(`License: ${info.license ? info.license.spdx_id || info.license.name : "none listed"}`);
  if (info.archived) lines.push("✗ Archived on GitHub — the directory lists live projects only.");
  if (exact) lines.push(`✗ Already on the site as "${exact.name}".`);
  setResult(resEl, lines.join("\n"), !info.archived && !exact ? "ok" : "bad");
  updateRepoAddState();
}

function switchAddForm(which) {
  document.querySelectorAll(".add-choice-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.form === which);
  });
  $("add-api-form").hidden = which !== "api";
  $("add-repo-form").hidden = which !== "repo";
}

function openAdd() {
  $("add-modal").hidden = false;
  switchAddForm("api");
}

function closeAdd() {
  $("add-modal").hidden = true;
}

function addLocalEntry(entry) {
  const withFlag = { ...entry, _local: true };
  state.apis.push(withFlag);
  const added = loadAdded();
  added.push(entry);
  saveAdded(added);
  allCategories = [...new Set(state.apis.map((a) => a.category))].sort();
  refreshCounts();
  renderChips();
  render();
}

function onApiSubmit(e) {
  e.preventDefault();
  if (!apiCheck || !apiCheck.live || apiCheck.duplicate) return;
  const cat = $("api-category").value === "__new__"
    ? $("api-newcat").value.trim()
    : $("api-category").value;
  const link = apiCheck ? apiCheck.link : $("api-link").value.trim();
  const entry = {
    id: uniqueId(slugify($("api-name").value)),
    name: $("api-name").value.trim(),
    category: cat,
    description: $("api-desc").value.trim(),
    docs_url: link,
    auth: $("api-auth").value,
    https: $("api-https").checked,
    cors: "Unknown",
    free_tier: $("api-freetier").value.trim(),
    status: "live",
    last_checked: todayStr(),
    tier: $("api-tier").value,
  };
  addLocalEntry(entry);
  showExportJson($("api-json"), entry);
  $("api-copy-btn").disabled = false;
  setResult($("api-check-result"), `✓ Added "${entry.name}" — it now shows on this site (this browser only).`, "ok");
  $("api-add-btn").disabled = true;
}

function onRepoSubmit(e) {
  e.preventDefault();
  if (!repoCheck || !repoCheck.info || repoCheck.info.archived || repoCheck.duplicate) return;
  const info = repoCheck.info;
  const entry = {
    id: uniqueId(slugify(info.name)),
    name: info.name,
    category: $("repo-category").value,
    description: info.description || `${info.full_name} on GitHub`,
    docs_url: `https://github.com/${info.full_name}`,
    auth: "No",
    https: true,
    cors: "Unknown",
    free_tier: $("repo-freetier").value.trim() ||
      `Free, open-source (${info.license ? info.license.spdx_id || info.license.name : "license not listed"})`,
    status: "live",
    last_checked: todayStr(),
    tier: "free",
  };
  addLocalEntry(entry);
  showExportJson($("repo-json"), entry);
  $("repo-copy-btn").disabled = false;
  setResult($("repo-check-result"), `✓ Added "${entry.name}" — it now shows on this site (this browser only).`, "ok");
  $("repo-add-btn").disabled = true;
}

function initAdd() {
  fillCategorySelect($("api-category"), { newOption: true });
  fillCategorySelect($("repo-category"), { newOption: false, default: "Free Agent Tools" });
  $("add-btn").addEventListener("click", openAdd);
  document.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeAdd));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$("add-modal").hidden) closeAdd();
      if (!$("detail-modal").hidden) closeDetail();
    }
  });
  document.querySelectorAll(".add-choice-btn").forEach((b) => {
    b.addEventListener("click", () => switchAddForm(b.dataset.form));
  });
  $("api-check-btn").addEventListener("click", onApiCheck);
  $("repo-check-btn").addEventListener("click", onRepoCheck);
  $("add-api-form").addEventListener("submit", onApiSubmit);
  $("add-repo-form").addEventListener("submit", onRepoSubmit);
  $("api-category").addEventListener("change", () => {
    $("api-newcat-wrap").hidden = $("api-category").value !== "__new__";
    updateApiAddState();
  });
  ["api-name", "api-desc", "api-freetier", "api-newcat"].forEach((id) => {
    $(id).addEventListener("input", updateApiAddState);
  });
  $("api-link").addEventListener("input", () => {
    apiCheck = null;
    updateApiAddState();
  });
  $("repo-link").addEventListener("input", () => {
    repoCheck = null;
    updateRepoAddState();
  });
  $("repo-freetier").addEventListener("input", updateRepoAddState);
  $("api-copy-btn").addEventListener("click", (e) => copyText($("api-json").textContent, e.currentTarget));
  $("repo-copy-btn").addEventListener("click", (e) => copyText($("repo-json").textContent, e.currentTarget));
}

// ---- Card detail view ----
// Clicking a compact card opens a detail modal with the full description,
// the expanded access guide (when the entry has one), the docs link, and
// Try-it. The modal sits outside #results, so it has its own click listener
// for Try-it; close buttons use data-detail-close (NOT data-close, which
// initAdd binds to closeAdd).
function tierLabel(tier) {
  return { free: "Free", freemium: "Free Tier", paid: "Paid" }[tier] || tier;
}

function relatedListHtml(related) {
  return `<ol class="related-list">${related.map((r) =>
    `<li data-related-id="${escapeHtml(r.id)}">${iconImg(r)}<span>${escapeHtml(r.name)}</span></li>`
  ).join("")}</ol>`;
}

function compareTableHtml(current, related) {
  const { ranked, group, rows, winners } = rankRelated(current, related);
  const attrCols = ranked ? group.attributes : [];
  return `<div class="compare-wrap"><table class="compare-table">
    <thead><tr>${ranked ? "<th>Rank</th>" : ""}<th></th><th>Name</th>${attrCols.map((a) => `<th>${escapeHtml(a.label)}</th>`).join("")}<th>Tier</th><th>Auth</th><th>HTTPS</th><th>CORS</th><th>Limits</th><th>Status</th></tr></thead>
    <tbody>${rows.map(({ api: a, rank }) => `
      <tr${a.id === current.id ? ` class="compare-current"` : ""}>
        ${ranked ? `<td class="compare-rank">${rank}</td>` : ""}
        <td>${iconImg(a)}</td>
        <td>${escapeHtml(a.name)}${ranked && rank === 1 ? ` <span class="best-badge">Best overall</span><a class="open-best-btn" href="${escapeHtml(a.docs_url)}" target="_blank" rel="noopener">Open project</a>` : ""}</td>
        ${attrCols.map((at) => `<td${winners.get(at.key).has(a.id) ? ` class="compare-best"` : ""}>${escapeHtml(attrDisplay(group, a, at))}</td>`).join("")}
        <td>${escapeHtml(tierLabel(a.tier))}</td>
        <td>${escapeHtml(a.auth)}</td>
        <td>${a.https ? "Yes" : "No"}</td>
        <td>${escapeHtml(a.cors)}</td>
        <td>${escapeHtml(a.free_tier)}</td>
        <td>${statusLabel(a.status)}</td>
      </tr>`).join("")}</tbody></table></div>${ranked && group.note ? `<p class="compare-note">${escapeHtml(group.note)}</p>` : ""}`;
}

// The entry currently shown in the detail modal (set by openDetail, cleared
// by closeDetail) — the compare-mode picker re-renders the table for it.
let detailApi = null;

function comparePanelHtml(api, related) {
  return `<div class="compare-modes">
      <button type="button" class="compare-mode active" data-compare-mode="all">All related</button>
      <button type="button" class="compare-mode" data-compare-mode="1v1">1 vs 1</button>
      <button type="button" class="compare-mode" data-compare-mode="1v2">1 vs 2</button>
    </div>
    <div class="opponent-list" hidden>${related.map((r) => `
      <label class="opponent"><input type="checkbox" data-opponent="${escapeHtml(r.id)}">${iconImg(r)}<span>${escapeHtml(r.name)}</span></label>`).join("")}
    </div>
    <div id="compare-table-wrap">${compareTableHtml(api, related)}</div>`;
}

function refreshCompareTable() {
  const panel = $("compare-panel");
  const wrap = $("compare-table-wrap");
  if (!panel || !wrap || !detailApi) return;
  const mode = panel.querySelector(".compare-mode.active")?.dataset.compareMode || "all";
  const related = relatedFor(detailApi);
  let shown;
  if (mode === "all") {
    shown = related;
  } else {
    const max = mode === "1v1" ? 1 : 2;
    const picked = [...panel.querySelectorAll("input[data-opponent]:checked")].map((c) => c.dataset.opponent).slice(0, max);
    shown = related.filter((r) => picked.includes(r.id));
  }
  wrap.innerHTML = compareTableHtml(detailApi, shown);
}

function detailHtml(api) {
  const chips = [
    `Auth: ${api.auth}`,
    api.https ? "HTTPS" : "HTTP only",
    `CORS: ${api.cors}`,
  ].map((c) => `<span class="chip">${escapeHtml(c)}</span>`).join("");
  const tryIt = api.sample_url ? `
    <button class="try-btn" type="button" data-url="${escapeHtml(api.sample_url)}">Try it</button>
    <div class="try-panel" hidden>
      <div class="try-url">GET ${escapeHtml(api.sample_url)}</div>
      <div class="try-status"></div>
      <pre class="try-result"></pre>
    </div>` : "";
  const tierBadge = api.tier === "paid"
    ? `<span class="tier-badge paid">Paid</span>`
    : api.tier === "freemium"
      ? `<span class="tier-badge freemium">Free Tier</span>`
      : `<span class="tier-badge free">100% Free</span>`;
  const access = api.access ? `
    <div class="detail-access">
      <h3>How to get access</h3>
      <p><a href="${escapeHtml(api.access.portal)}" target="_blank" rel="noopener">${escapeHtml(api.access.portal_label || "Developer portal")} &rarr;</a></p>
      <ol>${api.access.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
    </div>` : "";
  const related = relatedFor(api);
  const relatedSection = related.length > 0 ? `
    <div class="detail-actions">
      <button class="detail-action" type="button" data-related-btn>Related (${related.length})</button>
      <button class="detail-action" type="button" data-compare-btn>Best overall Comparison</button>
    </div>
    <div id="related-panel" hidden>${relatedListHtml(related)}</div>
    <div id="compare-panel" hidden>${comparePanelHtml(api, related)}</div>` : "";
  return `
    <h2 id="detail-title">${iconImg(api)}<span>${escapeHtml(api.name)}</span></h2>
    <div class="card-top">
      <span class="category">${escapeHtml(api.category)}</span>
      ${tierBadge}
      ${api._local ? `<span class="local-badge">Added by you</span>` : ""}
    </div>
    <p class="detail-desc">${escapeHtml(api.description)}</p>
    <div class="chips">${chips}</div>
    <p class="free-tier"><strong>Limits:</strong> ${escapeHtml(api.free_tier)}</p>
    ${access}
    <div class="status-row">
      <span class="status ${escapeHtml(api.status)}">${statusLabel(api.status)}</span>
      <span>checked ${escapeHtml(api.last_checked || "—")}</span>
    </div>
    <a class="docs-link" href="${escapeHtml(api.docs_url)}" target="_blank" rel="noopener">${api.auth === "apiKey" ? "API Key" : "Docs"} &rarr;</a>
    ${tryIt}${relatedSection}`;
}

function openDetail(id) {
  const api = state.apis.find((a) => a.id === id);
  if (!api) return;
  detailApi = api;
  $("detail-content").innerHTML = detailHtml(api);
  $("detail-modal").hidden = false;
}

function closeDetail() {
  detailApi = null;
  $("detail-modal").hidden = true;
  $("detail-content").innerHTML = "";
}

function onDetailClick(e) {
  const btn = e.target.closest(".try-btn");
  if (btn) {
    const panel = btn.nextElementSibling;
    if (!panel || !panel.classList.contains("try-panel")) return;
    if (!panel.hidden) {
      panel.hidden = true;
      btn.textContent = "Try it";
      return;
    }
    runTryIt(btn, panel);
    return;
  }
  const relBtn = e.target.closest("[data-related-btn]");
  if (relBtn) {
    const rp = $("related-panel");
    const cp = $("compare-panel");
    const show = rp.hidden;
    rp.hidden = !show;
    cp.hidden = true;
    return;
  }
  const cmpBtn = e.target.closest("[data-compare-btn]");
  if (cmpBtn) {
    const rp = $("related-panel");
    const cp = $("compare-panel");
    const show = cp.hidden;
    cp.hidden = !show;
    rp.hidden = true;
    return;
  }
  const modeBtn = e.target.closest("[data-compare-mode]");
  if (modeBtn) {
    const panel = $("compare-panel");
    panel.querySelectorAll(".compare-mode").forEach((b) => b.classList.toggle("active", b === modeBtn));
    const mode = modeBtn.dataset.compareMode;
    const list = panel.querySelector(".opponent-list");
    const boxes = [...panel.querySelectorAll("input[data-opponent]")];
    if (mode === "all") {
      list.hidden = true;
      boxes.forEach((c) => { c.checked = false; });
    } else {
      list.hidden = false;
      // Default opponents: the first 1 (1v1) or 2 (1v2) related entries.
      const max = mode === "1v1" ? 1 : 2;
      boxes.forEach((c, i) => { c.checked = i < max; });
    }
    refreshCompareTable();
    return;
  }
  const opp = e.target.closest("input[data-opponent]");
  if (opp) {
    const panel = $("compare-panel");
    const mode = panel.querySelector(".compare-mode.active")?.dataset.compareMode || "all";
    const max = mode === "1v1" ? 1 : mode === "1v2" ? 2 : Infinity;
    const checked = panel.querySelectorAll("input[data-opponent]:checked").length;
    if (checked > max) {
      // Clicking toggles before this handler runs, so un-check the extra one.
      opp.checked = false;
      return;
    }
    refreshCompareTable();
    return;
  }
  // Clicking a related entry swaps the modal content to it (same page —
  // openDetail re-renders, so the previous entry "collapses" and both
  // panels reset to hidden). Related is symmetric, so navigating back
  // works the same way.
  const rel = e.target.closest("[data-related-id]");
  if (rel) {
    openDetail(rel.dataset.relatedId);
  }
}

function initDetail() {
  document.querySelectorAll("[data-detail-close]").forEach((el) => el.addEventListener("click", closeDetail));
  $("detail-modal").addEventListener("click", onDetailClick);
}

init();
