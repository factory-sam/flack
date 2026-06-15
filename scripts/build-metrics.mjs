#!/usr/bin/env node
// Runs the production build, measures wall-clock duration, and exports a
// machine-readable build-metrics report. Used in CI to track build performance
// over time and surface regressions; appends a summary to the GitHub job page
// when GITHUB_STEP_SUMMARY is available. Forwards the build's exit code.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = resolve(repoRoot, "reports", "build-metrics.json");

function readNextVersion() {
  try {
    const pkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
    return pkg.dependencies?.next ?? pkg.devDependencies?.next ?? "unknown";
  } catch {
    return "unknown";
  }
}

function runBuild() {
  return new Promise((resolveRun) => {
    const start = process.hrtime.bigint();
    const child = spawn("pnpm", ["build"], { stdio: "inherit", cwd: repoRoot, env: process.env });

    let settled = false;
    const settle = (code) => {
      if (settled) return;
      settled = true;
      const durationMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
      resolveRun({ code: code ?? 1, durationMs });
    };

    child.on("error", (err) => {
      console.error("Failed to run pnpm build", err);
      settle(1);
    });
    child.on("close", (code) => settle(code));
  });
}

const { code, durationMs } = await runBuild();
const durationSec = Math.round(durationMs / 100) / 10;

const metrics = {
  status: code === 0 ? "success" : "failure",
  durationMs,
  durationSec,
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  nextVersion: readNextVersion(),
  cacheRestored: process.env.NEXT_BUILD_CACHE_HIT === "true",
  commit: process.env.GITHUB_SHA ?? null
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(metrics, null, 2)}\n`);

const summary =
  `### Build metrics\n\n` +
  `- Status: ${metrics.status}\n` +
  `- Duration: ${durationSec}s\n` +
  `- Cache restored: ${metrics.cacheRestored}\n` +
  `- Next.js: ${metrics.nextVersion}\n` +
  `- Node: ${metrics.nodeVersion}\n`;

console.log(`\nBuild ${metrics.status} in ${durationSec}s (metrics -> ${resolve("reports/build-metrics.json")})`);

if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  } catch {
    // Non-fatal: summary is best-effort.
  }
}

process.exit(code);
