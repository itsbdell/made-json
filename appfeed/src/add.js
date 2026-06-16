import { readFile, writeFile } from "node:fs/promises";
import pc from "picocolors";
import { validateCmd } from "./validate.js";

const EXIT_USAGE = 64;

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 128);
}

function splitList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function boolOption(value) {
  if (value == null) return undefined;
  if (value === true || value === false) return value;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return undefined;
}

function targetFromOption(value) {
  if (!value) return null;
  const [kind, urlOrCommand, label] = String(value).split("|").map(part => part?.trim());
  if (!kind) return null;
  const target = { kind };
  if (urlOrCommand) {
    if (/^https?:\/\//i.test(urlOrCommand)) target.url = urlOrCommand;
    else target.command = urlOrCommand;
  }
  if (label) target.label = label;
  return target;
}

async function readFeed(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return { version: "1.0", items: [] };
    throw new Error(`Could not read ${path}: ${error.message}`);
  }
}

function buildItem(options) {
  if (!options.name || !options.url) {
    const error = new Error("appfeed add requires --name and --url");
    error.code = EXIT_USAGE;
    throw error;
  }

  const item = {
    id: options.id || slugify(options.name),
    name: options.name,
    url: options.url,
    updated: options.updated || new Date().toISOString()
  };

  if (options.kind) item.kind = options.kind;
  if (options.description) item.description = options.description;
  const tags = splitList(options.tags);
  if (tags.length) item.tags = tags;

  const target = targetFromOption(options.target);
  if (target) item.targets = [target];

  const vibeCoded = boolOption(options.vibeCoded);
  if (vibeCoded !== undefined) item.vibe_coded = vibeCoded;

  const forkable = boolOption(options.forkable);
  if (forkable !== undefined) item.forkable = forkable;

  if (options.source) item.source = options.source;
  if (options.promptLog) item.prompt_log = options.promptLog;
  if (options.replaces) item.replaces = options.replaces;

  return item;
}

export async function addCmd(path, options = {}) {
  let feed;
  try {
    feed = await readFeed(path);
  } catch (error) {
    console.error(pc.red(`✖ ${error.message}`));
    return 2;
  }

  if (!Array.isArray(feed.items)) feed.items = [];
  if (!feed.version) feed.version = "1.0";
  feed.updated = options.feedUpdated || new Date().toISOString();

  let item;
  try {
    item = buildItem(options);
  } catch (error) {
    console.error(pc.red(`✖ ${error.message}`));
    return error.code || 2;
  }

  const existingIndex = feed.items.findIndex(existing =>
    (item.id && existing?.id === item.id) || existing?.url === item.url
  );

  if (existingIndex >= 0 && !options.replace) {
    console.error(pc.red(`✖ item already exists (${feed.items[existingIndex].id || feed.items[existingIndex].url}); pass --replace to update it`));
    return EXIT_USAGE;
  }

  if (existingIndex >= 0) feed.items[existingIndex] = { ...feed.items[existingIndex], ...item };
  else feed.items.push(item);

  await writeFile(path, JSON.stringify(feed, null, 2) + "\n");
  console.log(pc.green(`${existingIndex >= 0 ? "Updated" : "Added"} ${item.name} in ${path}`));
  return validateCmd(path, { json: false });
}
