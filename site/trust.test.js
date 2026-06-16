import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveTrustReport, safeHttpUrl, safeLocalOrHttpUrl, trustSummary } from "./trust.js";

test("derives claim and URL states without central approval", () => {
  const report = deriveTrustReport({
    sourceUrl: "https://ada.example/made.json",
    feed: {
      author: {
        url: "https://ada.example",
        social: [{ platform: "github", url: "https://github.com/ada-example" }]
      }
    },
    item: {
      source: "https://github.com/ada-example/notebook",
      prompt_log: "not-a-url",
      replaces: "app://upstream.example/phrase-chain",
      forkable: true
    }
  });

  assert.ok(report.claims.some(claim => claim.label === "author" && claim.urlState === "valid"));
  assert.ok(report.claims.some(claim => claim.label === "prompt log" && claim.urlState === "invalid"));
  assert.ok(report.claims.some(claim => claim.label === "replaces" && claim.urlState === "not_checked"));
  assert.ok(report.checks.some(check => check.label === "social backlink" && check.state === "not_checked"));
  assert.equal(trustSummary(report), "claims present");
});

test("blocks unsafe web URLs", () => {
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,hi"), null);
  assert.equal(safeHttpUrl("https://example.com/x"), "https://example.com/x");
});

test("allows internal reader links without allowing protocol-relative URLs", () => {
  assert.equal(safeLocalOrHttpUrl("/?feed=https%3A%2F%2Fexample.com%2Fmade.json"), "/?feed=https%3A%2F%2Fexample.com%2Fmade.json");
  assert.equal(safeLocalOrHttpUrl("//evil.example/made.json"), null);
  assert.equal(safeLocalOrHttpUrl("javascript:alert(1)"), null);
});

test("records attempted backlink verification states", () => {
  const report = deriveTrustReport({
    feed: { author: { url: "https://ada.example" } },
    checks: { backlink: { attempted: true, verified: true, checkedAt: "2026-05-02T00:00:00Z" } }
  });

  assert.ok(report.checks.some(check => check.state === "verified"));
  assert.equal(trustSummary(report), "verified evidence");
});
