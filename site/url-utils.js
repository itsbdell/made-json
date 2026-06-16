// site/url-utils.js
// Shared URL helpers for the reader and the badge generator. Pure ESM,
// no DOM access.

// Normalize a feed URL the user typed (or pasted into ?feed=). Accepts:
//   - "/apps.example.json"      -> "<current-origin>/apps.example.json"
//   - "apps.example.json"       -> "<current-origin>/apps.example.json"
//   - "ada.example"             -> "https://ada.example/made.json"
//   - "https://ada.example"     -> "https://ada.example/made.json"
//   - "https://ada.example/made.json"  -> unchanged
//   - "https://ada.example/feeds/made.json"  -> unchanged (custom path preserved)
// Returns null when the input cannot be coerced into a valid http(s) URL.
export function normalizeFeedUrl(raw, baseUrl = globalThis.location?.origin) {
  let s = (raw || "").trim();
  if (!s) return null;
  if (s.startsWith("//")) return null;
  if (s.startsWith("/") && !s.startsWith("//")) {
    try {
      return new URL(s, baseUrl).toString();
    } catch {
      return null;
    }
  }
  if (/^[A-Za-z0-9._-]+\.json(?:[?#].*)?$/.test(s)) {
    try {
      return new URL(`/${s}`, baseUrl).toString();
    } catch {
      return null;
    }
  }
  if (!/^https?:\/\//i.test(s)) {
    s = "https://" + s.replace(/^\/+/, "");
  }
  let u;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.pathname === "" || u.pathname === "/") {
    u.pathname = "/made.json";
  }
  return u.toString();
}

// Returns the canonical /.well-known/made.json URL for a feed URL whose
// path ends in /made.json. Preserves search and hash. Returns null when
// the input doesn't end in /made.json (so the caller can skip fallback).
export function wellKnownFallback(feedUrl) {
  let u;
  try {
    u = new URL(feedUrl);
  } catch {
    return null;
  }
  if (!u.pathname.endsWith("/made.json")) return null;
  u.pathname = u.pathname.replace(/\/made\.json$/, "/.well-known/made.json");
  return u.toString();
}
