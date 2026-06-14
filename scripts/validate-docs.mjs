#!/usr/bin/env node
// Validates that the agent-facing docs (AGENTS.md, README.md) stay consistent
// with the codebase: every documented `pnpm <script>` command must exist in
// package.json, and every relative markdown link must resolve to a real file.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = ["AGENTS.md", "README.md"];

// pnpm subcommands that are not project scripts and should be ignored.
const PNPM_BUILTINS = new Set([
  "install",
  "i",
  "add",
  "remove",
  "rm",
  "update",
  "up",
  "dlx",
  "exec",
  "run",
  "why",
  "store",
  "create",
  "import",
  "rebuild",
  "prune",
  "audit",
  "outdated",
  "list",
  "ls",
  "link",
  "unlink",
  "setup",
  "env",
  "patch"
]);

const pkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const scripts = new Set(Object.keys(pkg.scripts ?? {}));

// Only match commands written as inline code (backtick-prefixed) to avoid prose false positives.
const COMMAND_PATTERN = /`pnpm ([a-z][\w:-]*)/g;
const LINK_PATTERN = /\[[^\]]*\]\(([^)]+)\)/g;

const errors = [];
let commandChecks = 0;
let linkChecks = 0;

for (const doc of DOCS) {
  const docPath = resolve(repoRoot, doc);
  if (!existsSync(docPath)) {
    errors.push(`${doc}: documented file is missing from the repository`);
    continue;
  }
  const content = readFileSync(docPath, "utf8");

  for (const match of content.matchAll(COMMAND_PATTERN)) {
    const name = match[1];
    if (PNPM_BUILTINS.has(name)) continue;
    commandChecks += 1;
    if (!scripts.has(name)) {
      errors.push(`${doc}: documents \`pnpm ${name}\` but package.json has no such script`);
    }
  }

  for (const match of content.matchAll(LINK_PATTERN)) {
    const raw = match[1].trim();
    if (/^(https?:|mailto:|#)/.test(raw)) continue;
    const target = raw.split("#")[0];
    if (!target) continue;
    linkChecks += 1;
    if (!existsSync(resolve(docPath, "..", target))) {
      errors.push(`${doc}: relative link target not found -> ${raw}`);
    }
  }
}

console.log(
  `Validated ${commandChecks} documented pnpm command(s) and ${linkChecks} relative link(s) across: ${DOCS.join(", ")}`
);

if (errors.length > 0) {
  console.error(`\nDocumentation validation failed (${errors.length} issue(s)):`);
  for (const error of errors) console.error(`  - ${error}`);
  console.error(
    "\nUpdate the doc to match the code (rename/remove stale commands, fix broken links) or add the missing script/file."
  );
  process.exit(1);
}

console.log("All documented commands map to package.json scripts and all relative links resolve.");
