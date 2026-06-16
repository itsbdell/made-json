// site/directory.js
// Browser directory for the seeded made.json network, plus pure helpers for tests.

import { renderTrustReport, safeHttpUrl, safeLocalOrHttpUrl } from "./trust.js?v=20260502-8";

export function flattenApps(directory) {
  const rows = [];
  for (const feed of directory?.feeds || []) {
    for (const app of feed.items || []) {
      rows.push({
        ...app,
        creator: feed.author?.name || new URL(feed.feed_url).host,
        creator_url: feed.author?.url,
        curator_note: feed.curator_note,
        curator_tags: feed.curator_tags || [],
        feed_status: feed.status,
        feed_demo: feed.demo === true
      });
    }
  }
  return rows;
}

export function filterApps(apps, filters = {}) {
  const q = (filters.q || "").trim().toLowerCase();
  const tag = filters.tag || "";
  const target = filters.target || "";
  const trust = filters.trust || "";

  return apps.filter(app => {
    if (q) {
      const haystack = [
        app.name, app.description, app.creator,
        ...(app.tags || []), ...(app.curator_tags || [])
      ].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (tag && !(app.tags || []).includes(tag) && !(app.curator_tags || []).includes(tag)) return false;
    if (target) {
      const kinds = (app.targets || []).map(t => t.kind);
      if (!kinds.includes(target) && !(target === "web" && app.url)) return false;
    }
    if (trust && app.trust_summary !== trust) return false;
    return true;
  });
}

export function collectOptions(apps) {
  const tags = new Set();
  const targets = new Set(["web"]);
  const trust = new Set();
  for (const app of apps) {
    for (const tag of [...(app.tags || []), ...(app.curator_tags || [])]) tags.add(tag);
    for (const target of app.targets || []) if (target.kind) targets.add(target.kind);
    if (app.trust_summary) trust.add(app.trust_summary);
  }
  return {
    tags: [...tags].sort(),
    targets: [...targets].sort(),
    trust: [...trust].sort()
  };
}

export async function bootDirectory() {
  const root = document.getElementById("seed-directory");
  if (!root) return;
  let data;
  try {
    const res = await fetch("/generated/directory.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (error) {
    root.replaceChildren(el("p", { class: "error-message", text: `Directory unavailable: ${error.message}` }));
    return;
  }

  const apps = flattenApps(data);
  root.replaceChildren(renderDirectory(apps, data));
}

function renderDirectory(apps, data) {
  const wrap = el("section", { class: "directory" });
  wrap.append(
    el("p", { class: "eyebrow", text: "Who's publishing?" }),
    el("h2", { text: "A small blogroll of made.json feeds" }),
    el("p", { class: "muted", text: `${apps.length} item${apps.length === 1 ? "" : "s"} from ${(data.feeds || []).length} opted-in feed${(data.feeds || []).length === 1 ? "" : "s"}. The list is a seed, not a gate.` })
  );

  if (apps.length === 0) {
    wrap.append(el("p", { class: "empty", text: "No seeded items yet." }));
    return wrap;
  }

  const options = collectOptions(apps);
  const controls = el("div", { class: "directory-controls" },
    el("input", { type: "search", placeholder: "Search items, creators, tags", "aria-label": "Search directory" }),
    select("Target", "target", options.targets),
    select("Tag", "tag", options.tags),
    select("Trust", "trust", options.trust)
  );
  const list = el("div", { class: "directory-list" });

  function update() {
    const [search, targetSel, tagSel, trustSel] = controls.children;
    const results = filterApps(apps, {
      q: search.value,
      target: targetSel.value,
      tag: tagSel.value,
      trust: trustSel.value
    });
    list.replaceChildren(...results.map(renderDirectoryCard));
    if (results.length === 0) list.append(el("p", { class: "empty", text: "No items match those filters." }));
  }

  controls.addEventListener("input", update);
  controls.addEventListener("change", update);
  wrap.append(controls, list, el("p", { class: "muted correction-note" },
    "Listed because the creator or platform published a made.json feed. ",
    el("a", { href: "https://github.com/itsbdell/made-json/issues", text: "Request a correction or removal" }),
    "."
  ));
  update();
  return wrap;
}

function renderDirectoryCard(app) {
  const appUrl = safeHttpUrl(app.url);
  const readerUrl = safeLocalOrHttpUrl(app.reader_url);
  const targets = [
    appUrl ? el("a", { class: "target-btn target-web", href: appUrl, target: "_blank", rel: "noopener" },
      el("span", { class: "target-label", text: "Open item" }),
      el("span", { class: "target-kind", text: "web" })
    ) : null,
    readerUrl ? el("a", { class: "target-btn", href: readerUrl },
      el("span", { class: "target-label", text: "Open feed" }),
      el("span", { class: "target-kind", text: "made.json" })
    ) : null
  ].filter(Boolean);

  const card = el("article", { class: "app-card directory-card" },
    el("header", { class: "app-head" },
      el("h3", { class: "app-name", text: app.name }),
      el("span", { class: "updated muted", text: app.updated ? app.updated.slice(0, 10) : "" })
    ),
    app.description ? el("p", { class: "app-desc", text: app.description }) : null,
    el("p", { class: "muted", text: `by ${app.creator}${app.feed_demo ? " (demo)" : ""}` }),
    renderTags(app.tags || []),
    targets.length ? renderFactGroup("Targets", "target-group", el("div", { class: "target-row" }, ...targets)) : null,
    renderClaims(app),
    renderTrustReport(app.trust)
  );
  return card;
}

function renderTags(tags) {
  if (!tags.length) return null;
  return renderFactGroup("Tags", "tag-group",
    el("ul", { class: "tag-row" }, ...tags.map(tag => el("li", { class: "tag", text: tag })))
  );
}

function renderClaims(app) {
  const claims = [];
  if (app.vibe_coded === true) claims.push(el("span", { class: "chip claim-chip chip-vibe", text: "vibe-coded" }));
  if (app.forkable === true) claims.push(el("span", { class: "chip claim-chip chip-fork", text: "forkable" }));
  if (safeHttpUrl(app.source)) claims.push(el("a", { class: "chip claim-chip", href: app.source, target: "_blank", rel: "noopener", text: "source" }));
  if (safeHttpUrl(app.prompt_log)) claims.push(el("a", { class: "chip claim-chip", href: app.prompt_log, target: "_blank", rel: "noopener", text: "prompt log" }));
  if (typeof app.replaces === "string" && app.replaces.length) claims.push(el("span", { class: "chip claim-chip", text: "replaces" }));
  if (!claims.length) return null;
  return renderFactGroup("Creator claims", "claim-group", el("div", { class: "prov-row" }, ...claims));
}

function renderFactGroup(label, className, content) {
  return el("div", { class: `fact-group ${className}` },
    el("div", { class: "fact-label", text: label }),
    content
  );
}

function select(label, name, values) {
  return el("select", { name, "aria-label": label },
    el("option", { value: "", text: label }),
    ...values.map(value => el("option", { value, text: value }))
  );
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === "string") node.append(child);
    else node.append(child);
  }
  return node;
}
