#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOTS = ["src", "e2e"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const MARKER = /\b(TODO|FIXME|HACK|XXX)\b/;
const ISSUE_REFERENCE = /(\([A-Z][A-Z0-9]+-\d+\)|#\d+|https?:\/\/\S+)/;

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (EXTENSIONS.has(extname(full))) {
      files.push(full);
    }
  }
  return files;
}

const markers = [];
const violations = [];

for (const root of ROOTS) {
  let entries;
  try {
    entries = walk(root);
  } catch {
    continue;
  }
  for (const file of entries) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      if (!MARKER.test(line)) return;
      const record = { file: relative(process.cwd(), file), line: index + 1, text: line.trim() };
      markers.push(record);
      if (!ISSUE_REFERENCE.test(line)) violations.push(record);
    });
  }
}

console.log(`Technical debt markers found: ${markers.length}`);
for (const marker of markers) {
  console.log(`  ${marker.file}:${marker.line}  ${marker.text}`);
}

if (violations.length > 0) {
  console.error(
    `\n${violations.length} marker(s) are missing an issue reference. ` +
      `Link each TODO/FIXME/HACK/XXX to a tracked issue, e.g. "TODO(ABC-123)", "FIXME #45", or an issue URL.`
  );
  process.exit(1);
}

console.log("\nAll technical debt markers reference a tracked issue.");
