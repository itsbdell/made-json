// site/validator.test.js
// Run with: node --test site/validator.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "./validator.js";

const VALID_MIN = {
  version: "1.0",
  items: [{ name: "Hi", url: "https://example.com" }]
};

test("happy path: minimal valid feed", () => {
  const r = validate(VALID_MIN);
  assert.equal(r.ok, true);
  assert.equal(r.errors.length, 0);
});

test("happy path: full example feed with optional fields", () => {
  const r = validate({
    version: "1.0",
    self: "https://ada.example/made.json",
    updated: "2026-04-30T12:00:00Z",
    author: {
      name: "Ada Lovelace",
      url: "https://ada.example",
      social: [
        { platform: "github", url: "https://github.com/ada-example" }
      ]
    },
    items: [
      {
        id: "notebook", name: "Notebook", kind: "app", url: "https://notebook.ada.example",
        version: "0.4.2", vibe_coded: true, forkable: true,
        source: "https://github.com/ada-example/notebook",
        targets: [
          { kind: "web", url: "https://notebook.ada.example" },
          { kind: "macos", url: "https://ada.example/downloads/Notebook.dmg" }
        ]
      }
    ]
  });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.errors.length, 0);
});

test("edge case: empty items array is valid", () => {
  const r = validate({ version: "1.0", items: [] });
  assert.equal(r.ok, true);
});

test("edge case: extra unknown top-level fields are tolerated", () => {
  const r = validate({
    version: "1.0",
    custom_field: "hi",
    weird_thing: { nested: true },
    items: [{ name: "X", url: "https://example.com", "x-foo": 42 }]
  });
  assert.equal(r.ok, true);
});

test("edge case: unknown target.kind is tolerated (no error or warning)", () => {
  const r = validate({
    version: "1.0",
    items: [{
      name: "X", url: "https://example.com",
      targets: [{ kind: "totally-made-up-platform", url: "https://example.com/x" }]
    }]
  });
  assert.equal(r.ok, true);
  assert.equal(r.warnings.length, 0);
});

test("edge case: item without targets is valid (top-level url is the launch)", () => {
  const r = validate({
    version: "1.0",
    items: [{ name: "X", url: "https://example.com" }]
  });
  assert.equal(r.ok, true);
});

test("error path: missing version", () => {
  const r = validate({ items: [] });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.path === "/version" && /required/.test(e.message)));
});

test("error path: wrong version string", () => {
  const r = validate({ version: "2.0", items: [] });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.path === "/version"));
});

test("error path: items not an array", () => {
  const r = validate({ version: "1.0", items: "nope" });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.path === "/items"));
});

test("error path: item missing url surfaces /items/0/url", () => {
  const r = validate({ version: "1.0", items: [{ name: "Bad" }] });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.path === "/items/0/url"));
});

test("error path: item missing name surfaces /items/0/name", () => {
  const r = validate({ version: "1.0", items: [{ url: "https://example.com" }] });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.path === "/items/0/name"));
});

test("error path: invalid url string fails", () => {
  const r = validate({ version: "1.0", items: [{ name: "X", url: "not-a-url" }] });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.path === "/items/0/url"));
});

test("error path: per-item errors don't stop later items from being validated", () => {
  const r = validate({
    version: "1.0",
    items: [
      { name: "Bad" },                             // missing url
      { name: "Good", url: "https://example.com" } // valid
    ]
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.path === "/items/0/url"));
  // item 1 should produce no errors
  assert.equal(r.errors.filter(e => e.path.startsWith("/items/1")).length, 0);
});

test("warning path: malformed updated produces warning, not error", () => {
  const r = validate({
    version: "1.0",
    updated: "yesterday",
    items: []
  });
  assert.equal(r.ok, true);
  assert.ok(r.warnings.some(w => w.path === "/updated"));
});

test("warning path: malformed author.url produces warning", () => {
  const r = validate({
    version: "1.0",
    author: { name: "X", url: "not-a-url" },
    items: []
  });
  assert.equal(r.ok, true);
  assert.ok(r.warnings.some(w => w.path === "/author/url"));
});

test("error path: old apps collection is not the made.json contract", () => {
  const r = validate({ version: "1.0", apps: [] });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.path === "/items"));
});

test("error path: feed is not an object", () => {
  for (const bad of [null, undefined, "string", 42, []]) {
    const r = validate(bad);
    assert.equal(r.ok, false);
  }
});
