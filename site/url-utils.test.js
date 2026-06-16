import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeFeedUrl, wellKnownFallback } from "./url-utils.js";

test("normalizes local demo feeds against the current origin", () => {
  assert.equal(
    normalizeFeedUrl("/apps.example.json", "http://localhost:4173"),
    "http://localhost:4173/apps.example.json"
  );
  assert.equal(
    normalizeFeedUrl("apps.example.json", "http://localhost:4173"),
    "http://localhost:4173/apps.example.json"
  );
});

test("normalizes bare domains to the default made.json path", () => {
  assert.equal(normalizeFeedUrl("ada.example"), "https://ada.example/made.json");
  assert.equal(normalizeFeedUrl("https://ada.example"), "https://ada.example/made.json");
});

test("rejects protocol-relative local-looking input", () => {
  assert.equal(normalizeFeedUrl("//evil.example/made.json", "http://localhost:4173"), null);
});

test("builds well-known fallback only for made.json paths", () => {
  assert.equal(
    wellKnownFallback("https://ada.example/made.json"),
    "https://ada.example/.well-known/made.json"
  );
  assert.equal(wellKnownFallback("https://ada.example/custom.json"), null);
});
