# made.json

`made.json` is a tiny open standard for publishing software, skills, tools,
prompts, workflows, agents, templates, CLIs, MCP servers, and other useful
software-shaped artifacts.

Home: [made-json.org](https://made-json.org)

Put it at `https://yourdomain.com/made.json`, list what you have made, and
people can discover, follow, render, install, and fork your work from anywhere.

It is like RSS for software-shaped work: publish one plain file, and any
reader, crawler, launcher, directory, search engine, or agent can understand it.

## Why this exists

More people are publishing software as part of their work: tools, experiments,
Claude and Codex skills, prototypes, prompts, workflows, tiny utilities, and
apps that do one useful thing.

But there is no simple way to follow what someone makes as a set. These
artifacts are scattered across GitHub repos, launch posts, personal sites, app
stores, plugin directories, Discord links, and half-forgotten demos.

`made.json` gives that work a home on the open web. No central registry, no
submission form, no platform account required.

## Start small

Create a file at:

```text
https://yourdomain.com/made.json
```

Then add the smallest useful feed:

```json
{
  "version": "1.0",
  "items": [
    { "name": "My Cool Tool", "kind": "tool", "url": "https://example.com/cool" }
  ]
}
```

That is enough. Only `version`, `items`, and per-item `name` + `url` are
required. `kind` is optional, but useful.

## Add claims when they help

Software artifacts are different from posts. People want to know where something
runs, whether it is current, whether the source is available, whether it was
AI-assisted, and whether it can be forked.

`made.json` handles that with optional creator claims:

```json
{
  "name": "My Cool App",
  "kind": "app",
  "url": "https://example.com/cool",
  "version": "1.2.0",
  "tags": ["writing", "utility"],
  "vibe_coded": true,
  "forkable": true,
  "source": "https://github.com/example/cool",
  "prompt_log": "https://example.com/cool/prompts",
  "targets": [
    { "kind": "web", "url": "https://example.com/cool", "label": "Open" }
  ]
}
```

These are not certifications from `made.json`. They are useful facts declared
by the creator. Readers can show them, search over them, and build trust layers
on top later.

## Principles

- **Publish to participate.** A public `made.json` file is the opt-in.
- **No central registry.** Directories and readers can exist, but the standard
  is just the file.
- **Tiny required surface.** Only `version`, `items`, `name`, and `url` are
  required.
- **Useful software context.** Software artifacts need a little more metadata
  than posts: where to run them, what version they are, where the source lives,
  and whether they can be forked.
- **Claims, not certification.** Creator fields are creator claims. Readers can
  show them; trust layers can come later.
- **For builders and audiences.** Builders get a canonical list. Readers and
  subscribers get a way to follow, reuse, and publish from what people are
  making.

## Reader, Directory, and Digest

This repo includes example tools around the standard: a reference reader, a
seeded directory, a badge generator, and a digest. They are here to prove the
format is useful and easy to build on. They are not required infrastructure,
and they are not the canonical platform for `made.json`.

The directory is "what exists"; the digest is "what changed." Both start from
public feeds in [`site/seeds.json`](site/seeds.json), and publishing a valid
public feed is the opt-in.

The seed list does not invent feeds for real creators.

## What's in this repo

| Path | What it is |
| --- | --- |
| [`spec/SPEC.md`](spec/SPEC.md) | Human-readable spec (v1.0). |
| [`spec/apps.schema.json`](spec/apps.schema.json) | JSON Schema (Draft 2020-12). |
| [`spec/apps.example.json`](spec/apps.example.json) | A complete example feed. |
| [`appfeed/`](appfeed/) | Example/reference CLI. Publishes as `@made-json/cli`. |
| [`site/`](site/) | Example web reader, seeded directory, digest, badge generator, and shared validator. |
| [`docs/ECOSYSTEM.md`](docs/ECOSYSTEM.md) | Map of readers, discovery, adopters. |
| [`docs/PUBLISHING.md`](docs/PUBLISHING.md) | How to publish and keep a feed fresh. |
| [`site/made.json`](site/made.json) | This project's own public feed, published at `https://made-json.org/made.json`. |
| [`skills/made-json-setup/`](skills/made-json-setup/) | Mirrored Codex/Claude skill for finding apps, skills, CLIs, MCP servers, and other software across repos, then drafting a feed. |
| [`skills/made-json-publisher/`](skills/made-json-publisher/) | Mirrored Codex/Claude skill for maintaining a feed. |

The skills are mirrored here for reference. The canonical agent-facing copies
live in
[`made-json-agent-skills`](https://github.com/itsbdell/made-json-agent-skills),
a smaller repo you can point agents at directly.

## Try It

```bash
# try the CLI without installing
npx @made-json/cli validate <url-or-path>

# add a new item to a local feed
npx @made-json/cli add ./made.json --name "Tiny Tool" --kind tool --url "https://example.com/tiny"

# try the reader
open https://made-json.org/?feed=<url-of-your-made.json>
```

For agent-assisted setup or maintenance, point the agent at
[`made-json-agent-skills`](https://github.com/itsbdell/made-json-agent-skills)
and ask it to use `made-json-setup` or `made-json-publisher`.

Live site: [made-json.org](https://made-json.org).
Project feed: [made-json.org/made.json](https://made-json.org/made.json).

## Development

```bash
node scripts/build-seed-data.js
node scripts/build-seed-data.js --check
node scripts/sync-schemas.js --check
```

Generated directory and digest artifacts live in `site/generated/`, with public
subscription outputs at `site/feed.json` and `site/feed.xml`.

## References

- Matt Webb: [We need RSS for sharing abundant vibe-coded apps](https://interconnected.org/home/2026/04/29/syndicating-vibes)
- Tom Critchlow: [Library JSON](https://tomcritchlow.com/2020/04/15/library-json/)
- Dave Winer: [Rules for standards-makers](http://scripting.com/2017/05/09/rulesForStandardsmakers.html)
