import { wellKnownFallback } from "./url-utils.js";

export const FETCH_TIMEOUT_MS = 15000;

function buildSignal(signal) {
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  if (!signal) return timeout;
  if (AbortSignal.any) return AbortSignal.any([signal, timeout]);
  return signal;
}

export async function fetchFeedJson(url, options = {}) {
  const { signal, corsHint = false } = options;

  let res;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: buildSignal(signal)
    });
  } catch (e) {
    if (signal?.aborted) {
      return { ok: false, kind: "aborted", url, message: "Request aborted" };
    }
    const isTimeout = e?.name === "TimeoutError" || e?.name === "AbortError";
    const isLikelyCors = !isTimeout && /Failed to fetch|NetworkError|TypeError/i.test(e?.message || "");
    return {
      ok: false,
      kind: isTimeout ? "timeout" : "network",
      url,
      message: isTimeout
        ? `Timed out after ${FETCH_TIMEOUT_MS}ms`
        : (e?.message || "fetch failed"),
      hint: corsHint && isLikelyCors
        ? "The publisher's server may not be sending Access-Control-Allow-Origin. They need to add the header (e.g. on Cloudflare Pages, GitHub Pages, or via Vercel) for browser readers to fetch their feed."
        : null
    };
  }

  if (!res.ok) {
    return { ok: false, kind: "http", status: res.status, url, message: `HTTP ${res.status} ${res.statusText}` };
  }

  let text;
  try {
    text = await res.text();
  } catch (e) {
    return { ok: false, kind: "network", url, message: e?.message || "read failed" };
  }

  try {
    return { ok: true, data: JSON.parse(text), url };
  } catch (e) {
    return { ok: false, kind: "parse", url, message: `Invalid JSON: ${e?.message || "parse failed"}` };
  }
}

export async function fetchFeedWithFallback(url, options = {}) {
  const primary = await fetchFeedJson(url, options);
  if (primary.ok || primary.kind !== "http" || primary.status !== 404) return primary;

  const fallback = wellKnownFallback(url);
  if (!fallback) return primary;

  const secondary = await fetchFeedJson(fallback, options);
  if (secondary.ok || secondary.kind === "aborted") return secondary;

  return {
    ...primary,
    message: `${primary.message} (also tried ${fallback}: ${secondary.kind === "http" ? `HTTP ${secondary.status}` : secondary.message})`
  };
}
