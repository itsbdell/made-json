#!/usr/bin/env node
// scripts/build-seed-data.js
// Builds static directory and digest artifacts from site/seeds.json.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { validate } from "../site/validator.js";
import { deriveTrustReport, trustSummary, safeHttpUrl } from "../site/trust.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const DEFAULT_NOW = "2026-05-02T00:00:00.000Z";

const PATHS = {
  seeds: join(REPO_ROOT, "site", "seeds.json"),
  directory: join(REPO_ROOT, "site", "generated", "directory.json"),
  digest: join(REPO_ROOT, "site", "generated", "digest.json"),
  jsonFeed: join(REPO_ROOT, "site", "feed.json"),
  rss: join(REPO_ROOT, "site", "feed.xml")
};

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function loadSeedFeed(seed, { fetchImpl = fetch } = {}) {
  if (seed.fixture) {
    return readJson(join(REPO_ROOT, seed.fixture));
  }
  const res = await fetchImpl(seed.feed_url, {
    headers: { "User-Agent": "made-json-seed-builder/0.1 (+https://made-json.org)" },
    redirect: "follow"
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

function toDate(value, fallback) {
  const parsed = value ? new Date(value) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return fallback;
}

function itemId(seed, item, index) {
  return `${seed.id}:${item.id || item.url || index}`;
}

function readerFeedUrl(seed) {
  if (seed.fixture && seed.fixture.startsWith("site/")) {
    return `/${seed.fixture.slice("site/".length)}`;
  }
  return seed.feed_url;
}

function publicReaderUrl(seed) {
  return `/?feed=${encodeURIComponent(readerFeedUrl(seed))}`;
}

function summarizeItem(seed, feed, item, index, now) {
  const updated = toDate(item.updated || feed.updated, now);
  const trust = deriveTrustReport({ feed, item, sourceUrl: seed.feed_url });
  return {
    id: itemId(seed, item, index),
    feed_id: seed.id,
    feed_url: seed.feed_url,
    name: item.name,
    kind: item.kind || null,
    description: item.description || "",
    url: item.url,
    version: item.version || null,
    updated,
    tags: Array.isArray(item.tags) ? item.tags.filter(t => typeof t === "string") : [],
    targets: Array.isArray(item.targets) ? item.targets : [],
    vibe_coded: item.vibe_coded === true,
    forkable: item.forkable === true,
    source: safeHttpUrl(item.source),
    prompt_log: safeHttpUrl(item.prompt_log),
    replaces: typeof item.replaces === "string" ? item.replaces : null,
    trust,
    trust_summary: trustSummary(trust),
    reader_url: publicReaderUrl(seed)
  };
}

export async function buildArtifacts({ now = DEFAULT_NOW, fetchImpl = fetch, seedsInput = null } = {}) {
  const seeds = seedsInput || await readJson(PATHS.seeds);
  const feeds = [];
  const digestItems = [];

  for (const seed of seeds.feeds || []) {
    const checkedAt = now;
    let feed = null;
    let validation = { ok: false, errors: [{ path: "/", message: "not loaded" }], warnings: [] };
    let loadError = null;

    try {
      feed = await loadSeedFeed(seed, { fetchImpl });
      validation = validate(feed);
    } catch (error) {
      loadError = error?.message || String(error);
    }

    const author = feed?.author || {};
    const items = validation.ok
      ? (feed.items || []).map((item, index) => summarizeItem(seed, feed, item, index, now))
      : [];
    const feedTrust = deriveTrustReport({ feed: feed || {}, sourceUrl: seed.feed_url });
    const feedUpdated = toDate(feed?.updated, checkedAt);

    feeds.push({
      id: seed.id,
      feed_url: seed.feed_url,
      demo: seed.demo === true,
      permission: seed.permission || null,
      curator_note: seed.curator_note || "",
      curator_tags: Array.isArray(seed.tags) ? seed.tags : [],
      checked_at: checkedAt,
      status: validation.ok ? "valid" : "invalid",
      load_error: loadError,
      validation,
      feed_updated: feedUpdated,
      author: {
        name: typeof author.name === "string" ? author.name : hostFromUrl(seed.feed_url),
        url: safeHttpUrl(author.url),
        social: Array.isArray(author.social) ? author.social : []
      },
      item_count: items.length,
      trust: feedTrust,
      trust_summary: trustSummary(feedTrust),
      items
    });

    if (validation.ok) {
      digestItems.push({
        id: `${seed.id}:feed`,
        type: "feed_added",
        title: `${author.name || hostFromUrl(seed.feed_url)} joined made.json`,
        summary: seed.curator_note || `New made.json feed with ${items.length} item${items.length === 1 ? "" : "s"}.`,
        url: publicReaderUrl(seed),
        external_url: seed.feed_url,
        date: feedUpdated,
        feed_id: seed.id,
        feed_url: seed.feed_url,
        creator: author.name || hostFromUrl(seed.feed_url),
        curator_note: seed.curator_note || "",
        trust_summary: trustSummary(feedTrust)
      });

      for (const item of items) {
        digestItems.push({
          id: item.id,
          type: "item_updated",
          title: item.name,
          summary: item.description || `Updated item from ${author.name || hostFromUrl(seed.feed_url)}.`,
          url: item.reader_url,
          external_url: item.url,
          date: item.updated,
          feed_id: seed.id,
          feed_url: seed.feed_url,
          creator: author.name || hostFromUrl(seed.feed_url),
          item_id: item.id,
          trust_summary: item.trust_summary
        });
      }
    }
  }

  digestItems.sort((a, b) => new Date(b.date) - new Date(a.date) || a.title.localeCompare(b.title));

  const directory = {
    version: "1.0",
    generated_at: now,
    source: "site/seeds.json",
    feeds
  };
  const digest = {
    version: "1.0",
    generated_at: now,
    title: "made.json weekly digest",
    items: digestItems
  };

  return {
    directory,
    digest,
    jsonFeed: buildJsonFeed(digest),
    rss: buildRss(digest)
  };
}

function hostFromUrl(url) {
  try { return new URL(url).host; } catch { return "made.json feed"; }
}

function absoluteUrl(url) {
  if (/^https?:\/\//.test(url)) return url;
  return `https://made-json.org${url.startsWith("/") ? "" : "/"}${url}`;
}

export function buildJsonFeed(digest) {
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: digest.title,
    home_page_url: "https://made-json.org/digest",
    feed_url: "https://made-json.org/feed.json",
    items: digest.items.map(item => ({
      id: item.id,
      url: absoluteUrl(item.url),
      external_url: safeHttpUrl(item.external_url) || undefined,
      title: item.title,
      summary: item.summary,
      content_text: item.summary,
      date_modified: item.date,
      tags: [item.type, item.trust_summary].filter(Boolean)
    }))
  };
}

export function buildRss(digest) {
  const items = digest.items.map(item => `    <item>
      <title>${xml(item.title)}</title>
      <link>${xml(absoluteUrl(item.url))}</link>
      <guid isPermaLink="false">${xml(item.id)}</guid>
      <description>${xml(item.summary)}</description>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>
    </item>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xml(digest.title)}</title>
    <link>https://made-json.org/digest</link>
    <description>Recent additions and updates from the seeded made.json network.</description>
    <lastBuildDate>${new Date(digest.generated_at).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

function xml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function writeIfChanged(path, content, { checkOnly }) {
  let existing = null;
  try { existing = await readFile(path, "utf8"); } catch {}
  if (existing === content) return false;
  if (checkOnly) return true;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
  return true;
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  const nowArg = process.argv.find(arg => arg.startsWith("--now="));
  const now = nowArg ? new Date(nowArg.slice(6)).toISOString() : DEFAULT_NOW;
  const artifacts = await buildArtifacts({ now });
  const outputs = [
    [PATHS.directory, JSON.stringify(artifacts.directory, null, 2) + "\n"],
    [PATHS.digest, JSON.stringify(artifacts.digest, null, 2) + "\n"],
    [PATHS.jsonFeed, JSON.stringify(artifacts.jsonFeed, null, 2) + "\n"],
    [PATHS.rss, artifacts.rss]
  ];

  let changed = 0;
  for (const [path, content] of outputs) {
    const didChange = await writeIfChanged(path, content, { checkOnly });
    if (didChange) {
      changed++;
      console.error(`${checkOnly ? "✖ would update" : "✓ wrote"} ${path.slice(REPO_ROOT.length + 1)}`);
    }
  }
  if (checkOnly && changed > 0) process.exit(1);
  if (checkOnly) console.log("Generated seed artifacts are in sync.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error);
    process.exit(2);
  });
}
