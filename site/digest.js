// site/digest.js
// Renders the public "what changed" digest and exposes pure grouping helpers.

import { safeHttpUrl, safeLocalOrHttpUrl } from "./trust.js?v=20260502-8";

export function groupDigestItems(items = []) {
  return {
    feeds: items.filter(item => item.type === "feed_added"),
    items: items.filter(item => item.type !== "feed_added")
  };
}

export async function bootDigest() {
  const root = document.getElementById("digest-output");
  if (!root) return;

  let digest;
  try {
    const res = await fetch("/generated/digest.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    digest = await res.json();
  } catch (error) {
    root.replaceChildren(el("p", { class: "error-message", text: `Digest unavailable: ${error.message}` }));
    return;
  }

  root.replaceChildren(renderDigest(digest));
}

function renderDigest(digest) {
  const groups = groupDigestItems(digest.items || []);
  const wrap = el("div", { class: "digest" },
    el("p", { class: "muted", text: `Generated ${String(digest.generated_at || "").slice(0, 10)} from the seeded made.json network.` }),
    renderGroup("New feeds", groups.feeds),
    renderGroup("Item updates", groups.items)
  );
  return wrap;
}

function renderGroup(title, items) {
  const section = el("section", { class: "digest-group" }, el("h2", { text: title }));
  if (!items.length) {
    section.append(el("p", { class: "empty", text: "Nothing this week." }));
    return section;
  }
  section.append(el("div", { class: "app-list" }, ...items.map(renderDigestItem)));
  return section;
}

function renderDigestItem(item) {
  const readerUrl = safeLocalOrHttpUrl(item.url);
  const externalUrl = safeHttpUrl(item.external_url);
  const targets = [
    readerUrl ? el("a", { class: "target-btn", href: readerUrl },
      el("span", { class: "target-label", text: "Open in reader" }),
      el("span", { class: "target-kind", text: "made.json" })
    ) : null,
    externalUrl ? el("a", { class: "target-btn target-web", href: externalUrl, target: "_blank", rel: "noopener" },
      el("span", { class: "target-label", text: "Open source" }),
      el("span", { class: "target-kind", text: item.type === "feed_added" ? "feed" : "item" })
    ) : null
  ].filter(Boolean);

  return el("article", { class: "app-card digest-card" },
    el("header", { class: "app-head" },
      el("h3", { class: "app-name", text: item.title }),
      el("span", { class: "updated muted", text: item.date ? item.date.slice(0, 10) : "" })
    ),
    el("p", { class: "app-desc", text: item.summary || "" }),
    el("p", { class: "muted", text: [item.creator, item.trust_summary].filter(Boolean).join(" · ") }),
    targets.length ? el("div", { class: "target-row" }, ...targets) : null
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
