// Live API Hub — static directory front-end.
// Loads data/apis.json (tries site/data/ first, then ../data/ for repo-root serving).

const DATA_URLS = ["data/apis.json", "../data/apis.json"];

const state = { apis: [], meta: null };

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

function cardHtml(api) {
  const chips = [
    `Auth: ${api.auth}`,
    api.https ? "HTTPS" : "HTTP only",
    `CORS: ${api.cors}`,
  ].map((c) => `<span class="chip">${escapeHtml(c)}</span>`).join("");
  return `
  <article class="card">
    <span class="category">${escapeHtml(api.category)}</span>
    <h2><a href="${escapeHtml(api.docs_url)}" target="_blank" rel="noopener">${escapeHtml(api.name)}</a></h2>
    <p>${escapeHtml(api.description)}</p>
    <div class="chips">${chips}</div>
    <p class="free-tier"><strong>Free tier:</strong> ${escapeHtml(api.free_tier)}</p>
    <div class="status-row">
      <span class="status ${escapeHtml(api.status)}">${statusLabel(api.status)}</span>
      <span>checked ${escapeHtml(api.last_checked || "—")}</span>
    </div>
    <a class="docs-link" href="${escapeHtml(api.docs_url)}" target="_blank" rel="noopener">Docs &rarr;</a>
  </article>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function filteredApis() {
  const q = $("search").value.trim().toLowerCase();
  const cat = $("category").value;
  const auth = $("auth").value;
  const status = $("status").value;
  const httpsOnly = $("https-only").checked;
  return state.apis.filter((api) => {
    if (q && !(api.name + " " + api.description + " " + api.category).toLowerCase().includes(q)) return false;
    if (cat && api.category !== cat) return false;
    if (auth && api.auth !== auth) return false;
    if (status && api.status !== status) return false;
    if (httpsOnly && !api.https) return false;
    return true;
  });
}

function render() {
  const list = filteredApis();
  $("results").innerHTML = list.map(cardHtml).join("") ||
    `<p>No APIs match these filters. Try clearing the search or a filter.</p>`;
  $("result-count").textContent =
    `Showing ${list.length} of ${state.apis.length} APIs` +
    (list.length !== state.apis.length ? " (filtered)" : "");
}

function initFilters() {
  const cats = [...new Set(state.apis.map((a) => a.category))].sort();
  $("category").innerHTML =
    `<option value="">All categories</option>` +
    cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  for (const id of ["search", "category", "auth", "status", "https-only"]) {
    $(id).addEventListener("input", render);
    $(id).addEventListener("change", render);
  }
}

async function init() {
  try {
    const data = await loadData();
    state.apis = data.apis || [];
    state.meta = data;
    $("total-count").textContent = state.apis.length;
    $("live-count").textContent = state.apis.filter((a) => a.status === "live").length;
    $("updated-date").textContent = data.updated || "—";
    if (data.status_meaning) {
      $("status-legend").textContent =
        `Live = docs answered 2xx/3xx. Reachable = server up but blocks anonymous checks (401/403/429). Down = failed or 5xx.`;
    }
    initFilters();
    render();
  } catch (err) {
    const el = $("load-error");
    el.hidden = false;
    el.textContent =
      "Could not load data/apis.json. If you opened index.html directly (file://), serve the folder instead: from the repo root, run: python3 -m http.server 8000 — then open http://localhost:8000/site/";
    $("result-count").textContent = "";
  }
}

init();
