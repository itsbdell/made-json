# Implementation Notes

## Scope

- Rename the active standard from `apps.json` to `made.json` and update the alpha feed contract from `apps[]` to `items[]`.
- Turn the top skill recommendation into a narrow `apps-json` contract extraction pass.
- Keep the work reviewable: shared feed-loading behavior for site surfaces, plus CLI fallback parity where it is already proven useful.

## Decisions

- Start with feed loading and fallback behavior, not schema validation extraction. The schema/package boundary is larger and touches npm packaging; the fetch/error contract is smaller and already duplicated.
- Keep the shared loader browser-safe so `site/reader.js` and `site/badge.js` can both use it without build tooling.
- Bring CLI parity by adding the same `/.well-known/made.json` fallback for URL validation on `404`, but avoid a broad cross-package abstraction in this pass.
- Standardize parity at the behavior layer, not the copy layer. Reader errors and badge status text remain product-specific even though they now share fetch/fallback semantics.
- For the `made.json` alpha, use `/made.json` as canonical and `/.well-known/made.json` as fallback. Use `items[]` as the collection name and keep item `name` + `url` as the minimal required fields.

## Risks / Follow-ups

- `appfeed` is published from `appfeed/`, so repo-root shared modules are awkward for npm packaging. If we want one true shared contract across CLI + site later, the package boundary will need an intentional design.
- Badge status copy and reader error rendering do not have the same UX surface; parity here means shared fetch/result semantics, not identical text.
- Local verification needs two commands in this environment:
  - `npm test` in `appfeed/`
  - `/Users/brianjdell/.nvm/versions/node/v20.19.6/bin/node --test /Users/brianjdell/Coding/apps-json/site/*.test.js`
  The default `node` on this machine is still Node 18 and will fail the site ESM tests.
