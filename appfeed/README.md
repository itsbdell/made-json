# appfeed — reference CLI for made.json

A small Node.js CLI for validating and maintaining `made.json` feeds. This is
an example/reference implementation for the [made.json spec](../spec/SPEC.md),
not a required part of the standard.

## Status

The CLI currently implements `validate` and `add`. The other commands
(`fetch`, `follow`, `list`, `update`) are reserved for a future local-reader
workflow; invoking them prints a "coming soon" message and exits `64`
(`EX_USAGE`).

The npm name `appfeed` is taken by an unrelated 2014 package. This package
currently publishes as **`@apps-json/cli`** and installs the binary as
`appfeed`. The feed contract is now `made.json`; package and binary renaming
can happen in a later release.

## Install

```bash
# zero-install
npx @apps-json/cli validate https://ada.example/made.json

# global install
npm install -g @apps-json/cli
appfeed --help
```

Requires Node.js 20 or newer.

## Commands

### `appfeed validate <url-or-path>`

Fetches (or reads from disk) and validates a `made.json` against the v1.0 JSON
Schema.

```text
$ appfeed validate https://ada.example/made.json
✔ made.json v1.0 — valid
  3 items

$ appfeed validate ./broken.json
✖ made.json — 2 schema errors
  /items/0 must have required property 'url'
  /items/1/targets/0/kind must be string
```

Flags:

- `--json` — emit a structured result instead of human output. The envelope is
  `{ ok, kind, ... }`; on success it includes `itemCount` and `feedVersion`, on
  failure it includes `errors[]` (schema) or a `message` (fs / parse / network /
  http / timeout).
- `--no-color` — disable ANSI colors.

### `appfeed add <path>`

Adds or updates an item entry in a local feed, then validates the result.
Creates the file if it does not exist.

```bash
appfeed add ./made.json \
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

Use `--replace` to update an existing entry with the same `id` or `url`.

### Stubs

`appfeed fetch | follow | list | update` print a "coming soon" message linking
to the tracking issue and exit `64`. They will land in a future release.

## Exit codes

The CLI uses a small fixed contract so scripts and CI can branch on the failure
mode:

| Code | Meaning                                         |
|------|-------------------------------------------------|
| 0    | Validation passed                               |
| 1    | Schema validation failed                        |
| 2    | Could not validate (fs / parse / network / HTTP / timeout) |
| 64   | `EX_USAGE` — stub command, bad arguments         |

## Project layout

```text
appfeed/
├── package.json
├── bin/
│   └── appfeed.js          # entry point
├── src/
│   ├── validate.js         # validate command
│   └── schema.json         # synced from ../spec/apps.schema.json
└── test/
    └── validate.test.js
```

The schema is copied (not symlinked) from `spec/apps.schema.json`. Run
`npm run sync-schemas` from this directory after editing the canonical spec to
refresh the copy; CI rejects PRs where the copies have drifted.

## Tests

```bash
npm test
```

Uses `node --test`. Covers happy path, fixtures with various schema errors,
broken JSON, missing files, the `--json` envelope on success and failure, and an
integration test against an in-process HTTP server.

## Why Node

Node 20+ ships `fetch`, `AbortSignal.timeout`, and `node --test` with zero deps.
The JSON Schema ecosystem (ajv) is mature. A Python or Go port is welcome; this
just happens to be the reference.
