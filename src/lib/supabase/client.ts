import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowserClient() {
  const env = getSupabaseEnv();

  if (!env) {
    throw new Error("Missing Supabase environment variables");
  }

  client ??= createBrowserClient<Database>(env.url, env.publishableKey, {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });

  return client;
}
