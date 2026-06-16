---
name: made-json-setup
description: >
  Use when bootstrapping a made.json feed for a creator or workspace by looking
  across local repositories, identifying creator-made apps, skills, prompts,
  workflows, agents, CLIs, MCP servers, extensions, and templates, drafting
  item entries, and validating the resulting feed.
---

# made.json Setup

Use this skill when a user asks to create an initial `made.json`, run a
first-pass inventory across a workspace, populate a feed from their repos, or
find creator-made artifacts that should be published in a feed. If the user is
maintaining an existing feed for a known shipped app, tool, or skill, use
`made-json-publisher` instead.

Guiding posture: be comprehensive in discovery and enrichment, conservative in
execution. Look broadly for creator-made artifacts and capture the wider
inventory, but only add evidence-backed entries and fields to an executable
`made.json` draft.

## Workflow

1. Establish the scan area.
   - Prefer the current workspace if the user names one.
   - Otherwise ask or infer likely repo roots such as `~/Coding`, `~/Documents`,
     `~/Documents/GitHub`, or the user's project folder.
   - Do not scan private or unrelated directories without a user request.
   - For public creator research, start from the creator's supplied or
     discovered public indexes, project pages, GitHub profile/org, package
     docs, skill catalogs, README files, release pages, and linked demos.
   - For multi-root scans, require an explicit root list from the user or a
     repo-local allowlist. Treat the scan as an inventory pass first, not a
     publishing pass.

2. Inventory candidate repos.
   - From the chosen roots, start with:

```bash
rg --files \
  -g package.json \
  -g pyproject.toml \
  -g Cargo.toml \
  -g go.mod \
  -g vercel.json \
  -g netlify.toml \
  -g wrangler.toml \
  -g app.json \
  -g manifest.json \
  -g mcp.json \
  -g SKILL.md \
  -g CLAUDE.md \
  -g AGENTS.md \
  -g skills.md \
  -g Skills.md \
  -g 'skills/**' \
  -g '.claude/**' \
  -g '.codex/**' \
  -g 'commands/**' \
  -g 'plugins/**' \
  -g README.md
```

   - Group files by git repo when possible with `git -C <dir> rev-parse
     --show-toplevel`.
   - Skip obvious dependency/cache directories: `node_modules`, `.next`,
     `dist`, `build`, `.git`, `.venv`, `vendor`, `.codex/plugins/cache`,
     `.claude/plugins/cache`, and other installed marketplace/plugin caches.
   - In multi-root mode, write or update a review artifact such as
     `docs/made-feed-inventory.md` with scan roots, safe-to-add entries,
     candidates needing confirmation, and skipped repos with reasons.

3. Decide whether a repo contains publishable software artifacts.
   - Strong signals: deployed web app config, package scripts like `dev`,
     `start`, or `deploy`, app routes/pages, CLI bin entries, Electron/Tauri,
     Expo/React Native, browser extension manifests, MCP servers, Claude/Codex
     skills, prompts, workflows, installable templates, automation tools, or
     public README usage instructions.
   - Agent/skill signals include `SKILL.md`, `CLAUDE.md`, `AGENTS.md`,
     command folders, agent folders, plugin manifests, MCP server config,
     package `bin` entries, and README install commands.
   - Treat a skill or agent workflow as includable only when there is evidence
     it is authored by the scanned creator/workspace or intentionally published
     from the scanned repo.
   - Good evidence includes a repo-owned `skills/**/SKILL.md`, local plugin
     manifest, README install instructions for this repo, package metadata, a
     public source remote for the project, or explicit user confirmation.
   - Installed marketplace downloads, plugin caches, vendored examples, copied
     third-party skill packs, and unclear shared/internal automation belong in
     `needs_confirmation` or `omit_for_now`, not directly in the feed.
   - Do not treat `CLAUDE.md` or `AGENTS.md` as publishable by itself. Treat
     them as discovery evidence unless the repo clearly packages a reusable
     skill, command, agent, server, workflow, or tool.

4. Classify findings before drafting.
   - Use three buckets:
     - `include_in_candidate_json`: enough public evidence for at least `name`,
       `url`, a useful factual description, and creator/workspace ownership or
       intentional publication.
     - `needs_confirmation`: likely app, tool, skill, prompt, workflow, agent,
       CLI, MCP server, extension, or template, but missing canonical URL,
       ownership, current status, install target, source URL,
       authorship/provenance evidence, or description confidence.
     - `omit_for_now`: weak signal, private-looking, abandoned, duplicate,
       dependency-only, library-only, or not clearly publishable.
   - Do not throw away fuzzy findings. Preserve them in `needs_confirmation`
     with the question that would unblock inclusion.
   - Keep `include_in_candidate_json` smaller and higher-confidence than the
     full inventory.

5. Draft each item entry from evidence.
   - Required: `name`, `url`.
   - Prefer `id` from repo/package slug.
   - Include a `kind` hint when clear.
   - Derive `description` from README, package description, or project docs.
   - Do not invent public URLs. If no launch/install URL is evident, mark the
     repo as needing confirmation instead of adding a guessed entry.
   - Derive `source` from `git remote get-url origin` when it is public or the
     user confirms it should be listed.
   - Derive `targets` from deploy URLs, package bins, install docs, skill docs,
     prompt docs, or platform configs.
   - Add optional metadata only when evidenced. Treat `vibe_coded`,
     `forkable`, `prompt_log`, and `replaces` as creator claims, not proof.

6. Create or update the feed.
   - Prefer `./made.json` unless the user requests a public output path such as
     `site/made.json`, `public/made.json`, or `static/made.json`, or the repo's
     deploy config clearly serves one of those folders.
   - If `vercel.json` declares `"outputDirectory": "site"`, create or update
     `site/made.json` so the feed publishes at `/made.json`.
   - If no feed exists, create:

```json
{
  "version": "1.0",
  "items": []
}
```

   - Preserve existing entries and unknown fields.
   - Match existing entries by `id`, then `url`, then source repo.
   - Ask before deleting entries.

7. Validate and report.
   - Run `npx @made-json/cli validate <feed-path>` when available.
   - If working inside the main `made-json` repo, run `node appfeed/bin/appfeed.js
     validate <feed-path>`.
   - Report entries added, `needs_confirmation` candidates, `omit_for_now`
     skips, and evidence gaps.
   - Remind the user that publishing requires serving the file publicly with
     browser-readable CORS headers when browser readers need to fetch it.

## Output Standard

Finish with:

- the feed path changed,
- items added or updated,
- candidates needing confirmation,
- candidates omitted for now and why,
- validation result,
- suggested next publish step.
