---
name: made-json-publisher
description: >
  Use when maintaining a made.json feed for a project or creator: add newly
  shipped items, update changed metadata, preserve creator-declared claims,
  and validate the feed.
---

# made.json Publisher

Use this skill when a user asks to publish, update, maintain, or validate a
`made.json` feed, or when a project change ships a creator-made artifact that
should appear in the feed, including apps, Claude/Codex skills, CLIs, MCP
servers, prompts, workflows, agents, extensions, templates, or other useful
software.

## Workflow

1. Find the feed file.
   - Prefer `./made.json`.
   - Also check public output paths such as `public/made.json`,
     `static/made.json`, or `site/made.json`.
   - If no feed exists, create `made.json` with `version: "1.0"` and `items: []`.
   - Use the resolved feed path as `<feed-path>` in every validation and CLI
     command below.

2. Identify the item entry.
   - Required: `name`, `url`.
   - Prefer a stable lowercase `id`.
   - Include `kind` when it is clear: `app`, `tool`, `skill`, `prompt`,
     `workflow`, `agent`, `template`, `mcp-server`, `cli`, `library`, or another
     useful hint.
   - Include `description`, `tags`, `targets`, `source`, `prompt_log`,
     `replaces`, `vibe_coded`, and `forkable` when the project has evidence for
     them.
   - Treat `vibe_coded`, `forkable`, `source`, `prompt_log`, and `replaces` as
     creator-declared metadata, not endorsements.
   - For skills, CLIs, MCP servers, prompts, workflows, templates, and other
     installable artifacts, add or update the entry only when there is clear
     evidence of creator/workspace ownership, canonical URL or source, intended
     install/use target, and current status.
   - Do not add downloaded marketplace/plugin-cache skills, vendored examples,
     copied third-party tools, or unclear private automation directly to the
     feed. Report a confirmation question instead.

3. Update timestamps.
   - Set feed-level `updated` when the file changes.
   - Set item-level `updated` when adding or materially changing an item.
   - Use ISO 8601 date-time strings.

4. Validate.
   - Run `npx @apps-json/cli validate <feed-path>` when available.
   - If working inside the main `made-json` repo, run `node appfeed/bin/appfeed.js
     validate <feed-path>`.
   - Fix schema errors before finishing.

5. Report what changed.
   - Mention the item id/name added or updated.
   - Mention validation result.
   - If CORS/deployment headers are relevant, remind the user to serve
     `Access-Control-Allow-Origin: *`.

## CLI Shortcut

When the `appfeed` CLI is available, prefer:

```bash
appfeed add <feed-path> \
  --name "Item Name" \
  --kind tool \
  --url "https://example.com/item" \
  --description "One sentence." \
  --tags "utility,ai" \
  --target "web|https://example.com/item|Open"
```

Use `--replace` when updating an existing entry with the same `id` or `url`.
