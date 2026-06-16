# made.json -- Ecosystem Map

A guide to what the format enables, what can be built on top, and who would
adopt it first.

## What the file enables

Once a meaningful number of `made.json` files exist on the open web, you get:

1. **A crawlable index of the long tail of made things.** Apps, skills, tools,
   prompts, workflows, agents, templates, MCP servers, and CLIs can be found
   without platform mediation, app store fees, or a submission process.
2. **Readers becoming publishers.** The people who read, subscribe, learn from,
   or work with a creator can publish artifacts in the same network.
3. **Verifiable authorship.** Cross-linked social profiles let any agent
   independently confirm "this domain's made things are connected to this
   account." No central identity provider.
4. **Provenance trails.** `vibe_coded`, `prompt_log`, `source`, and `replaces`
   make construction history and remix lineage first-class facts.
5. **Multi-target manifests.** A single item can carry web, native, skill, MCP,
   CLI, and prompt targets. Aggregators can present the install option that
   matches the visitor's environment.

## What can be built on top

The tools in this repository are examples of these surfaces. They demonstrate
the standard; they do not define the only way to participate.

- **A web reader at `made-json.org/?feed=<url>`** that fetches any `made.json`
  and renders it as a profile page.
- **A validator badge** that authors paste into their site footer:
  `<a href="https://made-json.org/?feed=mysite.com/made.json">made.json</a>`.
- **A directory page** with curated `made.json` URLs. Manual at first; a crawler
  later. The directory is "what exists"; it is generated from a checked-in seed
  list of public feeds that creators or platforms have published.
- **A "what changed" digest.** Starts from the seed list and publishes recent
  additions/updates as a page plus RSS/JSON Feed.
- **A search engine across feeds** indexing names, descriptions, tags, `kind`,
  targets, forkability, and provenance.
- **A decentralized skill marketplace.** Crawl feeds for `targets.kind ==
  "claude-skill"` or `"codex-skill"` and render install buttons without one
  vendor blessing every listing.
- **Editor extensions** that subscribe to feeds and offer one-click install of
  new skills, MCP servers, prompts, workflows, or CLIs as their authors publish
  them.
- **Family-tree visualizers** that follow `replaces` chains across feeds to show
  item lineages and prompt logs.
- **Reputation overlays** built on social-graph backlinks and reader-chosen
  trust policies.

## Discovery without a registry

Three concrete bootstraps, ranked by leverage:

### 1. Backlink crawls

Most authors already publish their personal site to a small audience. A crawler
that starts from a seed list of hand-curated `made.json` URLs and follows every
`author.url` and every `social[].url` can fan out through the web. Every author
who links to a friend implicitly extends the index.

### 2. Social-graph discovery

If `author.social[]` lists a social profile and that profile links back to the
author's site, an agent can walk the graph: "the people I follow who have a
`made.json` on their linked website." Discovery follows trust instead of raw
crawl volume.

### 3. "Found at" badge program

A tiny GitHub repo accepts PRs adding `made.json` URLs to a seed list. Authors
get a badge for their README. The list is the seed for crawlers. This mirrors
how early webring scenes built reach.

What we explicitly do *not* build: a submission form on a central site that
gates inclusion. Publishing a public `made.json` is the opt-in; seed lists
curate public feeds rather than inventing feeds or scraping arbitrary artifacts
for people who never published the standard.

## Metadata is not endorsement

Reader pills should be understood as compact facts, usually supplied by the
creator. `web`, `cli`, `claude-skill`, and `mcp-server` are targets.
`vibe_coded`, `forkable`, `source`, `prompt_log`, and `replaces` are claims or
provenance links. A reader can display those facts without blessing them. Trust
layers can sit on top later.

## Private and company loops

The same JSON shape can run inside a company or group. A private feed can live
behind HTTP auth, a signed URL, a VPN, an internal gateway, or an allowlisted
reader. That gives teams a closed loop without turning the open standard into a
closed marketplace.

## First 10 adopter archetypes

The pattern: each archetype already produces multiple artifacts, already has a
home on the web, and already has a reason to want them findable as a set.

1. **Solo tool builders.** People who already maintain personal index pages of
   tools can make those pages machine-readable.
2. **AI coding platforms.** Platforms can expose per-user feeds, turning every
   published user into a portable publisher.
3. **Claude, Codex, Cursor, and MCP skill curators.** Curated feeds can be
   subscribed to by people and agents.
4. **Indie SaaS founders with adjacent micro-products.** The feed becomes a
   durable cross-linking surface for related tools.
5. **Agencies showcasing client work.** A structured feed can replace or power a
   "Recent Projects" page.
6. **Open-source maintainers cross-referencing ecosystem tools.** Maintainers
   can publish curated feeds of adjacent tools without hosting a marketplace.
7. **Newsletter writers with companion apps or prompts.** The feed becomes a
   permanent index decoupled from any one post.
8. **Researchers publishing demos, datasets, and workflows.** Project pages
   become machine-readable.
9. **Educators with course-supplement tools.** The feed becomes a syllabus
   index for projects and reusable workflows.
10. **AI-native publishers.** Publications that ship artifacts as part of
    editorial can let readers subscribe to the things they make.

## Adoption ladder

1. **One author publishes a feed.** Reward: a permanent canonical list of what
   they have made that survives platform churn.
2. **Five friends mirror each other's feeds in their footers.** Reward:
   cross-promotion without a shared platform.
3. **A reference reader renders any feed.** Reward: instant URL to share
   whenever someone wants to show the set of things they make.
4. **The agent skills make publishing nearly automatic.** Reward: maintaining
   the feed is easier than joining a closed store.
5. **A digest service launches.** Reward: readers have a destination that
   surfaces what the network is producing.
6. **A second platform treats `made.json` as an export/import source.** This is
   when the format escapes its origin and becomes a standard.

## Risks to durability

- **Platform pre-emption.** Anthropic, GitHub, Vercel, or another vendor could
  ship a proprietary registry. Defense: be openly compatible so any of them can
  expose `made.json` as an export and look generous doing it.
- **AI-assistance becomes assumed.** Provenance fields are a current-moment
  hook. Defense: they are optional; the format works without them.
- **Spam and trust collapse.** A crawler that ingests everything will ingest
  junk. Defense: discovery walks the social graph and trust layers stay reader
  side.
- **Standards committee creep.** The format gets improved until it is too heavy
  to publish casually. Defense: keep v1 tiny and make additions optional.
