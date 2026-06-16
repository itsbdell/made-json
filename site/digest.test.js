import { test } from "node:test";
import assert from "node:assert/strict";
import { groupDigestItems } from "./digest.js";

test("groups feed additions separately from item updates", () => {
  const groups = groupDigestItems([
    { id: "feed", type: "feed_added" },
    { id: "item", type: "item_updated" },
    { id: "other", type: "item_added" }
  ]);

  assert.deepEqual(groups.feeds.map(item => item.id), ["feed"]);
  assert.deepEqual(groups.items.map(item => item.id), ["item", "other"]);
});
