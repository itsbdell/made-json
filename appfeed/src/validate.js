import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import pc from "picocolors";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "schema.json");

let cachedValidator = null;

async function getValidator() {
  if (cachedValidator) return cachedValidator;
  const schemaText = await readFile(schemaPath, "utf8");
  const schema = JSON.parse(schemaText);
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats.default(ajv);
  cachedValidator = ajv.compile(schema);
  return cachedValidator;
}

const FETCH_TIMEOUT_MS = 15000;

function wellKnownFallback(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (!u.pathname.endsWith("/made.json")) return null;
  u.pathname = u.pathname.replace(/\/made\.json$/, "/.well-known/made.json");
  return u.toString();
}

async function fetchRemoteJson(url) {
  let res;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "appfeed/0.1 (+https://made-json.org)" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
  } catch (e) {
    const isTimeout = e?.name === "TimeoutError" || e?.name === "AbortError";
    const err = new Error(
      isTimeout
        ? `Timed out after ${FETCH_TIMEOUT_MS}ms fetching ${url}`
        : `Network error fetching ${url}: ${e.message}`
    );
    err.kind = isTimeout ? "timeout" : "network";
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText} from ${url}`);
    err.kind = "http";
    err.status = res.status;
    throw err;
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    const err = new Error(`Invalid JSON from ${url}: ${e.message}`);
    err.kind = "parse";
    throw err;
  }
}

async function load(urlOrPath) {
  if (/^https?:\/\//i.test(urlOrPath)) {
    try {
      return await fetchRemoteJson(urlOrPath);
    } catch (e) {
      const fallback = e.kind === "http" && e.status === 404 ? wellKnownFallback(urlOrPath) : null;
      if (!fallback) throw e;

      try {
        return await fetchRemoteJson(fallback);
      } catch (fallbackError) {
        fallbackError.message = `${e.message} (also tried ${fallback}: ${fallbackError.kind === "http" ? `HTTP ${fallbackError.status}` : fallbackError.message})`;
        throw fallbackError;
      }
    }
  }

  let text;
  try {
    text = await readFile(urlOrPath, "utf8");
  } catch (e) {
    const err = new Error(`Could not read ${urlOrPath}: ${e.message}`);
    err.kind = "fs";
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    const err = new Error(`Invalid JSON in ${urlOrPath}: ${e.message}`);
    err.kind = "parse";
    throw err;
  }
}

export async function validateCmd(urlOrPath, options = {}) {
  const json = !!options.json;

  let data;
  try {
    data = await load(urlOrPath);
  } catch (e) {
    if (json) {
      console.log(JSON.stringify({ ok: false, kind: e.kind || "error", error: e.message }));
    } else {
      console.error(pc.red(`✖ ${e.message}`));
    }
    return 2;
  }

  const validator = await getValidator();
  const ok = validator(data);

  if (ok) {
    const itemCount = Array.isArray(data.items) ? data.items.length : 0;
    if (json) {
      console.log(JSON.stringify({
        ok: true,
        itemCount,
        feedVersion: data.version ?? null,
        updated: data.updated ?? null
      }));
    } else {
      console.log(pc.green(`✔ made.json v${data.version} — valid`));
      console.log(`  ${itemCount} item${itemCount === 1 ? "" : "s"}`);
      if (data.updated) console.log(`  feed updated ${data.updated}`);
    }
    return 0;
  }

  const errors = (validator.errors || []).map(err => ({
    path: err.instancePath || "/",
    message: err.message,
    keyword: err.keyword,
    params: err.params
  }));

  if (json) {
    console.log(JSON.stringify({ ok: false, kind: "schema", errors }));
  } else {
    console.error(pc.red(`✖ made.json — ${errors.length} error${errors.length === 1 ? "" : "s"}`));
    for (const err of errors) {
      const loc = err.path || "/";
      console.error(`  ${pc.dim(loc)}  ${err.message}`);
    }
  }
  return 1;
}
