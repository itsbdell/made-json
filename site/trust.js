// site/trust.js
// Trust/provenance helpers shared by generated directory data and browser UI.
// These helpers report evidence states; they do not award central approval.

export const TRUST_STATES = {
  PRESENT: "present",
  MISSING: "missing",
  VALID: "valid",
  INVALID: "invalid",
  VERIFIED: "verified",
  UNVERIFIED: "unverified",
  NOT_CHECKED: "not_checked"
};

export function safeHttpUrl(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    return null;
  } catch {
    return null;
  }
}

export function safeLocalOrHttpUrl(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return safeHttpUrl(value);
}

function claim(label, value, { allowAppUri = false } = {}) {
  const present = typeof value === "string" && value.length > 0;
  if (!present) return { label, state: TRUST_STATES.MISSING };
  if (allowAppUri && value.startsWith("app://")) {
    return { label, state: TRUST_STATES.PRESENT, value, urlState: TRUST_STATES.NOT_CHECKED };
  }
  const safe = safeHttpUrl(value);
  return {
    label,
    state: TRUST_STATES.PRESENT,
    value,
    url: safe,
    urlState: safe ? TRUST_STATES.VALID : TRUST_STATES.INVALID
  };
}

export function deriveTrustReport({ feed = {}, item = null, app = null, sourceUrl = null, checks = {} } = {}) {
  const artifact = item || app;
  const author = artifact?.author || feed.author || {};
  const report = {
    summary: {
      present: 0,
      valid: 0,
      invalid: 0,
      verified: 0,
      unverified: 0,
      not_checked: 0,
      missing: 0
    },
    claims: [],
    checks: []
  };

  const claims = [
    claim("feed", sourceUrl || feed.self),
    claim("author", author.url),
    claim("source", artifact?.source),
    claim("prompt log", artifact?.prompt_log),
    claim("replaces", artifact?.replaces, { allowAppUri: true })
  ];

  if (Array.isArray(author.social)) {
    author.social.forEach((entry, index) => {
      claims.push(claim(entry?.platform ? `social: ${entry.platform}` : `social ${index + 1}`, entry?.url));
    });
  }

  for (const item of claims) {
    report.claims.push(item);
    report.summary[item.state] = (report.summary[item.state] || 0) + 1;
    if (item.urlState) report.summary[item.urlState] = (report.summary[item.urlState] || 0) + 1;
  }

  const backlink = checks.backlink;
  if (backlink && backlink.attempted) {
    const state = backlink.verified ? TRUST_STATES.VERIFIED : TRUST_STATES.UNVERIFIED;
    report.checks.push({
      label: "social backlink",
      state,
      checkedAt: backlink.checkedAt || null,
      detail: backlink.detail || null
    });
    report.summary[state] += 1;
  } else {
    report.checks.push({
      label: "social backlink",
      state: TRUST_STATES.NOT_CHECKED,
      detail: backlink?.detail || "Backlink verification was not run for this item."
    });
    report.summary.not_checked += 1;
  }

  if (artifact?.forkable === true) {
    report.claims.push({ label: "forkable", state: TRUST_STATES.PRESENT, value: true });
    report.summary.present += 1;
  }

  return report;
}

export function trustLabel(state) {
  switch (state) {
    case TRUST_STATES.PRESENT: return "present";
    case TRUST_STATES.MISSING: return "missing";
    case TRUST_STATES.VALID: return "URL valid";
    case TRUST_STATES.INVALID: return "URL invalid";
    case TRUST_STATES.VERIFIED: return "verified";
    case TRUST_STATES.UNVERIFIED: return "unverified";
    case TRUST_STATES.NOT_CHECKED: return "not checked";
    default: return String(state || "unknown");
  }
}

export function trustSummary(report) {
  const s = report?.summary || {};
  if ((s.verified || 0) > 0) return "verified evidence";
  if ((s.valid || 0) > 0) return "claims present";
  if ((s.present || 0) > 0) return "claims unverified";
  return "limited provenance";
}

export function renderTrustReport(report, documentRef = globalThis.document) {
  if (!documentRef || !report) return null;

  function el(tag, attrs = {}, ...children) {
    const node = documentRef.createElement(tag);
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

  const root = el("details", { class: "trust-report" },
    el("summary", { text: `Trust report · ${trustSummary(report)}` })
  );

  const rows = el("ul", { class: "trust-list" });
  for (const item of [...(report.claims || []), ...(report.checks || [])]) {
    const state = item.urlState || item.state;
    rows.append(el("li", { class: `trust-item trust-${state}` },
      el("span", { class: "trust-name", text: item.label }),
      el("span", { class: "trust-state", text: trustLabel(state) })
    ));
  }
  root.append(rows);
  return root;
}
