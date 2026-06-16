// site/reader.js
// Entry point for the reader. When ?feed=<url> is present, hide the
// directory placeholder, fetch the feed, validate it, and render the
// profile (or actionable errors) into #reader-output.

import { validate } from "/validator.js?v=20260502-8";
import { renderProfile, renderError, renderSchemaErrors, safeWebUrl } from "/render.js?v=20260502-8";
import { normalizeFeedUrl, wellKnownFallback } from "/url-utils.js?v=20260502-8";
import { fetchFeedWithFallback } from "/feed-loader.js?v=20260529-1";

const params = new URLSearchParams(location.search);
const rawFeed = params.get("feed");

if (rawFeed) {
  const directory = document.getElementById("directory-mode");
  const output = document.getElementById("reader-output");
  if (directory) directory.hidden = true;
  if (output) {
    output.hidden = false;
    output.replaceChildren();
    runReader(rawFeed, output).catch(e => {
      output.replaceChildren(renderError({
        kind: "internal",
        message: e?.message || String(e)
      }));
    });
  }
}

async function runReader(rawFeed, output) {
  const url = normalizeFeedUrl(rawFeed);
  if (!url || !safeWebUrl(url)) {
    output.replaceChildren(renderError({
      kind: "input",
      url: rawFeed,
      message: "That doesn't look like a valid http(s) URL.",
      hint: "Try ?feed=https://yourdomain.com/made.json"
    }));
    return;
  }

  setStatus(output, `Loading ${url}…`);

  const fallback = wellKnownFallback(url);
  if (fallback) {
    setStatus(output, `Loading ${url} (then ${fallback} if needed)…`);
  }
  const result = await fetchFeedWithFallback(url, { corsHint: true });

  if (!result.ok) {
    output.replaceChildren(renderError(result));
    return;
  }

  const v = validate(result.data);
  if (!v.ok) {
    output.replaceChildren(renderSchemaErrors({
      errors: v.errors,
      warnings: v.warnings,
      sourceUrl: result.url
    }));
    return;
  }

  output.replaceChildren(renderProfile(result.data, { sourceUrl: result.url }));
  document.title = profileTitle(result.data, result.url);
}

function profileTitle(feed, url) {
  const author = feed.author?.name;
  if (author) return `${author} — made.json`;
  try { return `${new URL(url).host} — made.json`; } catch { return "made.json"; }
}

function setStatus(output, msg) {
  output.replaceChildren(
    Object.assign(document.createElement("p"), { className: "loading muted", textContent: msg })
  );
}
