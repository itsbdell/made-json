import { test } from "node:test";
import assert from "node:assert/strict";
import { buildArtifacts, buildJsonFeed, buildRss } from "./build-seed-data.js";

test("builds directory and digest artifacts from the same seed source", async () => {
  const artifacts = await buildArtifacts({ now: "2026-05-02T00:00:00.000Z" });

  assert.equal(artifacts.directory.version, "1.0");
  assert.equal(artifacts.directory.feeds.length, 1);
  assert.equal(artifacts.directory.feeds[0].id, "ada-example");
  assert.equal(artifacts.directory.feeds[0].status, "valid");
  assert.equal(artifacts.directory.feeds[0].items.length, 3);
  assert.equal(artifacts.directory.feeds[0].items[0].reader_url, "/?feed=%2Fapps.example.json");

  const digestFeedIds = new Set(artifacts.digest.items.map(item => item.feed_id));
  assert.deepEqual([...digestFeedIds], ["ada-example"]);
  assert.ok(artifacts.digest.items.some(item => item.type === "feed_added"));
  assert.ok(artifacts.digest.items.some(item => item.type === "item_updated"));
});

test("generated feeds expose stable subscription surfaces", async () => {
  const digest = {
    title: "made.json weekly digest",
    generated_at: "2026-05-02T00:00:00.000Z",
    items: [
      {
        id: "ada-example:notebook",
        title: "Notebook",
        summary: "A web-based notebook.",
        url: "/?feed=https%3A%2F%2Fada.example%2Fmade.json",
        external_url: "https://notebook.ada.example",
        date: "2026-04-22T09:14:00.000Z",
        type: "item_updated",
        trust_summary: "claims present"
      }
    ]
  };

  const json = buildJsonFeed(digest);
  assert.equal(json.version, "https://jsonfeed.org/version/1.1");
  assert.equal(json.feed_url, "https://made-json.org/feed.json");
  assert.equal(json.items[0].id, "ada-example:notebook");
  assert.equal(json.items[0].url, "https://made-json.org/?feed=https%3A%2F%2Fada.example%2Fmade.json");

  const rss = buildRss(digest);
  assert.match(rss, /<rss version="2.0">/);
  assert.match(rss, /<guid isPermaLink="false">ada-example:notebook<\/guid>/);
  assert.match(rss, /<title>Notebook<\/title>/);
});

test("invalid feeds are carried as invalid metadata without crashing generation", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ version: "1.0", items: [{ name: "Missing URL" }] })
  });

  const artifacts = await buildArtifacts({
    now: "2026-05-02T00:00:00.000Z",
    fetchImpl,
    seedsInput: {
      version: "1.0",
      feeds: [{ id: "broken", feed_url: "https://broken.example/made.json" }]
    }
  });

  assert.equal(artifacts.directory.feeds[0].status, "invalid");
  assert.equal(artifacts.directory.feeds[0].items.length, 0);
  assert.ok(artifacts.directory.feeds[0].validation.errors.length > 0);
});
