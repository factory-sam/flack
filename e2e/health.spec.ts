import { expect, test } from "@playwright/test";

test.describe("health endpoint", () => {
  test("responds with a structured readiness report", async ({ request }) => {
    const response = await request.get("/health");

    // 200 when Supabase is reachable, 503 (degraded) when it is not.
    expect([200, 503]).toContain(response.status());
    expect(response.headers()["cache-control"]).toContain("no-store");

    const body = await response.json();
    expect(["ok", "degraded"]).toContain(body.status);
    expect(typeof body.uptimeSeconds).toBe("number");
    expect(typeof body.timestamp).toBe("string");
    expect(Array.isArray(body.checks)).toBe(true);
    expect(body.checks.some((check: { name: string }) => check.name === "supabase_env")).toBe(true);
  });
});
