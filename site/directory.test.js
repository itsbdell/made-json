import { test } from "node:test";
import assert from "node:assert/strict";
import { collectOptions, filterApps, flattenApps } from "./directory.js";

const directory = {
  feeds: [
    {
      id: "ada",
      feed_url: "https://ada.example/made.json",
      author: { name: "Ada" },
      curator_tags: ["demo"],
      status: "valid",
      items: [
        {
          id: "ada:notebook",
          name: "Notebook",
          description: "A web notebook",
          url: "https://notebook.ada.example",
          tags: ["notes", "ai"],
          targets: [{ kind: "web" }],
          trust_summary: "claims present"
        },
        {
          id: "ada:cli",
          name: "CLI Tool",
          description: "Terminal helper",
          url: "https://ada.example/cli",
          tags: ["developer"],
          targets: [{ kind: "cli" }],
          trust_summary: "limited provenance"
        }
      ]
    }
  ]
};

test("flattens feed items with creator context", () => {
  const apps = flattenApps(directory);
  assert.equal(apps.length, 2);
  assert.equal(apps[0].creator, "Ada");
  assert.equal(apps[0].feed_status, "valid");
});

test("filters by text, tag, target kind, and trust summary", () => {
  const apps = flattenApps(directory);
  assert.deepEqual(filterApps(apps, { q: "notebook" }).map(app => app.name), ["Notebook"]);
  assert.deepEqual(filterApps(apps, { tag: "developer" }).map(app => app.name), ["CLI Tool"]);
  assert.deepEqual(filterApps(apps, { target: "cli" }).map(app => app.name), ["CLI Tool"]);
  assert.deepEqual(filterApps(apps, { trust: "claims present" }).map(app => app.name), ["Notebook"]);
});

test("collects filter options from items", () => {
  const options = collectOptions(flattenApps(directory));
  assert.deepEqual(options.targets, ["cli", "web"]);
  assert.ok(options.tags.includes("notes"));
  assert.ok(options.tags.includes("demo"));
  assert.ok(options.trust.includes("claims present"));
});
