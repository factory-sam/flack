import { describe, expect, it, vi } from "vitest";
import { checkReadiness } from "./health";

const env = { url: "http://supabase.test", publishableKey: "test-key" };

describe("checkReadiness", () => {
  it("reports ok when env is present and Supabase responds healthy", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    const report = await checkReadiness({ env, fetchImpl, uptimeSeconds: () => 42, now: () => 0 });

    expect(report.status).toBe("ok");
    expect(report.uptimeSeconds).toBe(42);
    expect(report.checks.map((c) => c.name)).toEqual(["supabase_env", "supabase"]);
    expect(report.checks.every((c) => c.status === "pass")).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://supabase.test/auth/v1/health",
      expect.objectContaining({ headers: { apikey: "test-key" } })
    );
  });

  it("reports degraded when Supabase env is missing", async () => {
    const fetchImpl = vi.fn();

    const report = await checkReadiness({ env: null, fetchImpl });

    expect(report.status).toBe("degraded");
    expect(report.checks).toHaveLength(1);
    expect(report.checks[0]).toMatchObject({ name: "supabase_env", status: "fail" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports degraded when Supabase returns a non-ok status", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 500 }));

    const report = await checkReadiness({ env, fetchImpl });

    expect(report.status).toBe("degraded");
    const supabaseCheck = report.checks.find((c) => c.name === "supabase");
    expect(supabaseCheck).toMatchObject({ status: "fail", detail: "auth health returned 500" });
  });

  it("reports degraded when the connectivity request throws", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));

    const report = await checkReadiness({ env, fetchImpl });

    expect(report.status).toBe("degraded");
    const supabaseCheck = report.checks.find((c) => c.name === "supabase");
    expect(supabaseCheck).toMatchObject({ status: "fail", detail: "network down" });
  });
});
