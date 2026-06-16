# Publishing made.json

`made.json` should be as boring to maintain as RSS.

Put the file at:

```text
https://yourdomain.com/made.json
```

or, if your site prefers well-known files:

```text
https://yourdomain.com/.well-known/made.json
```

## Three Ways To Keep It Fresh

### 1. Hand-edit it

Good for a solo builder with a few items.

```bash
npx @made-json/cli validate ./made.json
```

Edit the file when you ship a new app, skill, tool, prompt, workflow, agent, or
template, or materially update an existing one. Keep `updated` timestamps
current if you want readers and digests to notice.

### 2. Use the CLI helper

Good when you want a small repeatable command without building your own
generator.

```bash
npx @made-json/cli add ./made.json \
  --name "Tiny Tool" \
  --kind tool \
  --url "https://example.com/tiny" \
  --description "A small useful app." \
  --tags "utility,ai" \
  --target "web|https://example.com/tiny|Open" \
  --vibe-coded true \
  --forkable true \
  --source "https://github.com/example/tiny"
```

The command creates `made.json` if it does not exist, appends the item, updates
the feed timestamp, and validates the result.

Use `--replace` to update an existing item with the same `id` or `url`.

### 3. Generate it from your existing source of truth

Best for static sites, monorepos, CMS-backed sites, and platforms.

Examples:

- A static site builds `/made.json` from `content/projects/*.md`.
- A monorepo builds it from `apps/*/package.json`, `skills/**/SKILL.md`, and
  package metadata.
- A CMS exposes `/made.json` from the same entries used for a projects page.
- An agent platform exposes per-user feeds at `/users/:handle/made.json`.

Manual is fine at first. Generated is how the file stays fresh without becoming
another chore.

## Server Requirements

Serve the file as JSON and allow browser readers to fetch it:

```http
Content-Type: application/json; charset=utf-8
Access-Control-Allow-Origin: *
```

The CORS header matters because browser-based readers cannot fetch a feed from
another domain without it.

## Private And Company Feeds

The feed shape is the same for public and private use. A company can serve
`made.json` behind normal access controls such as HTTP auth, a signed URL, an
internal gateway, VPN-only hosting, or an allowlisted reader.

Credential-aware readers and CLI support are future profile work. The core v1
schema stays open and transport-neutral.

## GitHub Action

For a repo-hosted feed:

```yaml
name: validate made.json

on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx @made-json/cli validate ./made.json
```

## Agent Workflow

Agents should treat `made.json` as a project artifact:

1. Detect when a new app, skill, CLI, MCP server, prompt, workflow, agent,
   template, or significant item update was shipped.
2. Add or update the relevant entry.
3. Preserve creator-declared claims such as `vibe_coded`, `forkable`, `source`,
   `prompt_log`, and `replaces`.
4. Run validation.
5. Include the feed update in the same commit as the item change when
   practical.

For agent-assisted setup or maintenance, point the agent at
[`made-json-agent-skills`](https://github.com/itsbdell/made-json-agent-skills)
and ask it to use `made-json-setup` or `made-json-publisher`. That standalone
repo is the canonical agent-facing distribution copy of the skills; this repo
keeps reference mirrors.
