import { NextResponse } from "next/server";
import { checkReadiness } from "@/lib/health";
import { requestLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const log = requestLogger("health");
  const report = await checkReadiness();

  if (report.status !== "ok") {
    log.warn({ checks: report.checks }, "health check degraded");
  }

  return NextResponse.json(report, {
    status: report.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" }
  });
}
