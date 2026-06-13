import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

const e2eSupabaseKey = process.env.E2E_SUPABASE_PUBLISHABLE_KEY ?? ["dummy", "e2e", "publishable", "key"].join("-");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: e2eSupabaseKey,
      NEXT_PUBLIC_SITE_URL: baseURL
    }
  }
});
