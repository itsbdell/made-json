#!/usr/bin/env node
import { Command } from "commander";
import { validateCmd } from "../src/validate.js";
import { addCmd } from "../src/add.js";

// Exit codes (mirrors validate.js):
//   0  — success
//   1  — schema-validation failure
//   2  — input failure (parse, network, http, timeout, fs)
//  64  — usage error / unimplemented command (matches sysexits.h EX_USAGE)
const EXIT_USAGE = 64;

const program = new Command();

program
  .name("appfeed")
  .description("Reference CLI for the made.json standard\n\nExit codes: 0=valid, 1=schema error, 2=input error (parse/network/http/timeout/fs), 64=usage / not implemented.")
  .version("0.1.0");

program
  .command("validate <urlOrPath>")
  .description("Validate a made.json against the v1.0 schema. Exits 0 on success, 1 on schema error, 2 on parse/network/http/timeout/fs error.")
  .option("--json", "emit machine-readable JSON output")
  .action(async (urlOrPath, options) => {
    const code = await validateCmd(urlOrPath, options);
    process.exit(code);
  });

program
  .command("add <path>")
  .description("Add or update an item entry in a local made.json file, then validate the result.")
  .requiredOption("--name <name>", "item name")
  .requiredOption("--url <url>", "primary item URL")
  .option("--id <id>", "stable item id; defaults to a slug of --name")
  .option("--kind <kind>", "artifact kind hint, e.g. app, tool, skill, prompt, workflow, agent")
  .option("--description <text>", "short item description")
  .option("--tags <list>", "comma-separated tags")
  .option("--target <spec>", "target as kind|url-or-command|label")
  .option("--vibe-coded [bool]", "set creator claim that the item was primarily AI-assisted")
  .option("--forkable [bool]", "set creator claim that forks are invited")
  .option("--source <url>", "source repository or canonical source URL")
  .option("--prompt-log <url>", "public prompt log URL")
  .option("--replaces <uri>", "upstream item URI this item replaces/forks")
  .option("--updated <dateTime>", "item updated timestamp; defaults to now")
  .option("--feed-updated <dateTime>", "feed updated timestamp; defaults to now")
  .option("--replace", "replace an existing entry with the same id or url")
  .action(async (path, options) => {
    const code = await addCmd(path, options);
    process.exit(code);
  });

for (const stub of ["fetch", "follow", "list", "update"]) {
  program
    .command(`${stub} [args...]`)
    .description(`(coming soon) ${stub} — see https://github.com/itsbdell/made-json/issues for roadmap`)
    .action(() => {
      console.error(`appfeed ${stub}: coming in a later release. Current commands: 'validate' and 'add'.`);
      console.error(`Track progress at https://github.com/itsbdell/made-json/issues`);
      process.exit(EXIT_USAGE);
    });
}

await program.parseAsync();
