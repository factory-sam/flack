import { getSupabaseEnv } from "@/lib/supabase/env";

export type CheckState = "pass" | "fail";

export interface HealthCheck {
  name: string;
  status: CheckState;
  detail?: string;
  durationMs?: number;
}

export interface HealthReport {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  timestamp: string;
  checks: HealthCheck[];
}

interface ReadinessDeps {
  env?: ReturnType<typeof getSupabaseEnv>;
  fetchImpl?: typeof fetch;
  now?: () => number;
  uptimeSeconds?: () => number;
  timeoutMs?: number;
}

async function checkSupabaseConnectivity(
  env: NonNullable<ReturnType<typeof getSupabaseEnv>>,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  now: () => number
): Promise<HealthCheck> {
  const startedAt = now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(`${env.url}/auth/v1/health`, {
      headers: { apikey: env.publishableKey },
      signal: controller.signal,
      cache: "no-store"
    });
    const durationMs = now() - startedAt;
    return response.ok
      ? { name: "supabase", status: "pass", durationMs }
      : { name: "supabase", status: "fail", detail: `auth health returned ${response.status}`, durationMs };
  } catch (error) {
    return {
      name: "supabase",
      status: "fail",
      detail: error instanceof Error ? error.message : "request failed",
      durationMs: now() - startedAt
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkReadiness(deps: ReadinessDeps = {}): Promise<HealthReport> {
  const now = deps.now ?? (() => Date.now());
  const fetchImpl = deps.fetchImpl ?? fetch;
  const uptimeSeconds = deps.uptimeSeconds ?? (() => Math.round(process.uptime()));
  const timeoutMs = deps.timeoutMs ?? 2000;
  const env = deps.env ?? getSupabaseEnv();

  const checks: HealthCheck[] = [];

  if (!env) {
    checks.push({ name: "supabase_env", status: "fail", detail: "missing Supabase environment variables" });
  } else {
    checks.push({ name: "supabase_env", status: "pass" });
    checks.push(await checkSupabaseConnectivity(env, fetchImpl, timeoutMs, now));
  }

  const healthy = checks.every((check) => check.status === "pass");

  return {
    status: healthy ? "ok" : "degraded",
    uptimeSeconds: uptimeSeconds(),
    timestamp: new Date(now()).toISOString(),
    checks
  };
}
