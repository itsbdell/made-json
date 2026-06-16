import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchFeedJson, fetchFeedWithFallback } from "./feed-loader.js";

test("fetchFeedJson returns parsed data on success", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    text: async () => JSON.stringify({ version: "1.0", items: [] })
  });

  try {
    const result = await fetchFeedJson("https://ada.example/made.json");
    assert.equal(result.ok, true);
    assert.deepEqual(result.data, { version: "1.0", items: [] });
    assert.equal(result.url, "https://ada.example/made.json");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchFeedWithFallback retries .well-known after /made.json 404", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url === "https://ada.example/made.json") {
      return { ok: false, status: 404, statusText: "Not Found" };
    }
    if (url === "https://ada.example/.well-known/made.json") {
      return {
        ok: true,
        text: async () => JSON.stringify({ version: "1.0", items: [{ name: "Hi", url: "https://example.com" }] })
      };
    }
    throw new Error(`unexpected url ${url}`);
  };

  try {
    const result = await fetchFeedWithFallback("https://ada.example/made.json");
    assert.equal(result.ok, true);
    assert.equal(result.url, "https://ada.example/.well-known/made.json");
    assert.deepEqual(calls, [
      "https://ada.example/made.json",
      "https://ada.example/.well-known/made.json"
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchFeedWithFallback keeps the primary error but notes fallback failure", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url === "https://ada.example/made.json") {
      return { ok: false, status: 404, statusText: "Not Found" };
    }
    return { ok: false, status: 500, statusText: "Internal Server Error" };
  };

  try {
    const result = await fetchFeedWithFallback("https://ada.example/made.json");
    assert.equal(result.ok, false);
    assert.equal(result.kind, "http");
    assert.equal(result.status, 404);
    assert.match(result.message, /also tried https:\/\/ada\.example\/\.well-known\/made\.json: HTTP 500/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
