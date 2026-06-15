import { defineConfig } from "vitest/config";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Retry once to surface (and tolerate) flaky tests; a test that only
    // passes on retry is reported by the JUnit/CI reporter as flaky.
    retry: isCI ? 2 : 1,
    // Flag slow tests so suite duration regressions are visible.
    slowTestThreshold: 300,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      // Enforce coverage on the pure logic layer. UI components are exercised
      // by the Playwright e2e suite instead of unit coverage.
      include: [
        "src/lib/utils.ts",
        "src/features/messages/optimistic.ts",
        "src/features/chat/emoji-recents.ts",
        "src/features/chat/unread.ts"
      ],
      thresholds: {
        statements: 100,
        branches: 90,
        functions: 100,
        lines: 100
      }
    }
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname
    }
  }
});
