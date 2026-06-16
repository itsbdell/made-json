import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createServer } from "node:http";

const exec = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "fixtures");
const BIN = join(__dirname, "..", "bin", "appfeed.js");
const EXAMPLE = join(__dirname, "..", "..", "spec", "apps.example.json");

async function run(args) {
  try {
    const { stdout, stderr } = await exec(process.execPath, [BIN, ...args], { encoding: "utf8" });
    return { code: 0, stdout, stderr };
  } catch (e) {
    return { code: e.code ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

async function listenOrSkip(t, server) {
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
  } catch (e) {
    if (e?.code === "EPERM") {
      t.skip("local sandbox does not allow binding an HTTP server");
      return false;
    }
    throw e;
  }
  return true;
}

test("happy path: example feed validates clean", async () => {
  const { code, stdout } = await run(["validate", EXAMPLE]);
  assert.equal(code, 0);
  assert.match(stdout, /valid/);
  assert.match(stdout, /3 items/);
});

test("happy path: --json on success emits parseable JSON", async () => {
  const { code, stdout } = await run(["validate", EXAMPLE, "--json"]);
  assert.equal(code, 0);
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.itemCount, 3);
  assert.equal(parsed.feedVersion, "1.0");
});

test("happy path: minimal valid feed passes", async () => {
  const { code } = await run(["validate", join(FIXTURES, "valid-minimal.json")]);
  assert.equal(code, 0);
});

test("edge case: extra unknown top-level fields are tolerated", async () => {
  const { code } = await run(["validate", join(FIXTURES, "extra-fields.json")]);
  assert.equal(code, 0);
});

test("edge case: empty items array is valid", async () => {
  const { code, stdout } = await run(["validate", join(FIXTURES, "empty-items.json")]);
  assert.equal(code, 0);
  assert.match(stdout, /0 items/);
});

test("error path: missing top-level version exits 1", async () => {
  const { code, stderr } = await run(["validate", join(FIXTURES, "missing-version.json")]);
  assert.equal(code, 1);
  assert.match(stderr, /version/i);
});

test("error path: missing item url exits 1 with /items/0 path", async () => {
  const { code, stderr } = await run(["validate", join(FIXTURES, "missing-app-url.json")]);
  assert.equal(code, 1);
  assert.match(stderr, /\/items\/0/);
});

test("error path: invalid JSON exits 2", async () => {
  const { code, stderr } = await run(["validate", join(FIXTURES, "broken.json")]);
  assert.equal(code, 2);
  assert.match(stderr, /Invalid JSON/i);
});

test("error path: nonexistent file exits 2", async () => {
  const { code, stderr } = await run(["validate", "/no/such/file.json"]);
  assert.equal(code, 2);
  assert.match(stderr, /Could not read/);
});

test("error path: --json on schema failure emits parseable JSON", async () => {
  const { code, stdout } = await run([
    "validate",
    join(FIXTURES, "missing-version.json"),
    "--json"
  ]);
  assert.equal(code, 1);
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.kind, "schema");
  assert.ok(Array.isArray(parsed.errors));
  assert.ok(parsed.errors.length > 0);
});

test("integration: validates a feed served over HTTP", async (t) => {
  const server = createServer((req, res) => {
    if (req.url === "/made.json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        version: "1.0",
        items: [{ name: "Net", url: "https://example.com" }]
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  if (!await listenOrSkip(t, server)) return;
  const { port } = server.address();
  try {
    const { code, stdout } = await run(["validate", `http://127.0.0.1:${port}/made.json`]);
    assert.equal(code, 0);
    assert.match(stdout, /valid/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("publisher: add creates a valid made.json file", async () => {
  const tmp = join(FIXTURES, "tmp-add.json");
  const { code, stdout } = await run([
    "add",
    tmp,
    "--name", "Tiny Tool",
    "--url", "https://example.com/tiny",
    "--kind", "tool",
    "--description", "A small useful app.",
    "--tags", "utility,ai",
    "--target", "web|https://example.com/tiny|Open",
    "--vibe-coded", "true",
    "--forkable", "true",
    "--source", "https://github.com/example/tiny",
    "--updated", "2026-05-03T12:00:00.000Z",
    "--feed-updated", "2026-05-03T12:00:00.000Z"
  ]);

  assert.equal(code, 0);
  assert.match(stdout, /Added Tiny Tool/);

  const { readFile, unlink } = await import("node:fs/promises");
  try {
    const feed = JSON.parse(await readFile(tmp, "utf8"));
    assert.equal(feed.version, "1.0");
    assert.equal(feed.items.length, 1);
    assert.equal(feed.items[0].id, "tiny-tool");
    assert.equal(feed.items[0].kind, "tool");
    assert.deepEqual(feed.items[0].tags, ["utility", "ai"]);
    assert.deepEqual(feed.items[0].targets, [{ kind: "web", url: "https://example.com/tiny", label: "Open" }]);
    assert.equal(feed.items[0].vibe_coded, true);
    assert.equal(feed.items[0].forkable, true);
  } finally {
    await unlink(tmp).catch(() => {});
  }
});

test("publisher: add refuses duplicates unless --replace is passed", async () => {
  const tmp = join(FIXTURES, "tmp-duplicate.json");
  const { writeFile, unlink } = await import("node:fs/promises");
  await writeFile(tmp, JSON.stringify({
    version: "1.0",
    items: [{ id: "tiny", name: "Tiny", url: "https://example.com/tiny" }]
  }));

  try {
    const duplicate = await run([
      "add",
      tmp,
      "--id", "tiny",
      "--name", "Tiny",
      "--url", "https://example.com/tiny"
    ]);
    assert.equal(duplicate.code, 64);
    assert.match(duplicate.stderr, /already exists/);

    const replaced = await run([
      "add",
      tmp,
      "--id", "tiny",
      "--name", "Tiny v2",
      "--url", "https://example.com/tiny",
      "--replace"
    ]);
    assert.equal(replaced.code, 0);
  } finally {
    await unlink(tmp).catch(() => {});
  }
});

test("error path: HTTP 404 exits 2", async (t) => {
  const server = createServer((_req, res) => {
    res.writeHead(404);
    res.end("not found");
  });
  if (!await listenOrSkip(t, server)) return;
  const { port } = server.address();
  try {
    const { code, stderr } = await run(["validate", `http://127.0.0.1:${port}/missing.json`]);
    assert.equal(code, 2);
    assert.match(stderr, /404/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("integration: URL validate falls back to /.well-known/made.json after 404", async (t) => {
  const server = createServer((req, res) => {
    if (req.url === "/made.json") {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    if (req.url === "/.well-known/made.json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        version: "1.0",
        items: [{ name: "Fallback", url: "https://example.com" }]
      }));
      return;
    }
    res.writeHead(404);
    res.end("missing");
  });
  if (!await listenOrSkip(t, server)) return;
  const { port } = server.address();
  try {
    const { code, stdout } = await run(["validate", `http://127.0.0.1:${port}/made.json`]);
    assert.equal(code, 0);
    assert.match(stdout, /valid/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("stub commands: each prints coming-soon message and exits 64 (EX_USAGE)", async () => {
  for (const stub of ["fetch", "follow", "list", "update"]) {
    const { code, stderr } = await run([stub, "https://example.com"]);
    assert.equal(code, 64, `${stub} should exit 64 (EX_USAGE), got ${code}`);
    assert.match(stderr, /coming/i, `${stub} should mention 'coming'`);
  }
});

test("error path: --json on nonexistent file emits kind:'fs'", async () => {
  const { code, stdout } = await run(["validate", "/no/such/file.json", "--json"]);
  assert.equal(code, 2);
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.kind, "fs");
});

test("error path: --json on broken JSON emits kind:'parse'", async () => {
  const { code, stdout } = await run([
    "validate",
    join(FIXTURES, "broken.json"),
    "--json"
  ]);
  assert.equal(code, 2);
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.kind, "parse");
});
