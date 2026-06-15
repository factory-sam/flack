import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requestLogger } from "@/lib/logger";
import { isAllowedUrl, isPrivateHostname, parseOpenGraph, type LinkPreview } from "@/features/chat/unfurl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HTML_BYTES = 500_000;
const FETCH_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

async function hostResolvesPrivate(hostname: string): Promise<boolean> {
  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.some((address) => isPrivateHostname(address.address));
  } catch {
    return true;
  }
}

async function safeFetchHtml(initialUrl: string, signal: AbortSignal): Promise<string | null> {
  let current = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!isAllowedUrl(current) || (await hostResolvesPrivate(new URL(current).hostname))) return null;

    const response = await fetch(current, {
      signal,
      redirect: "manual",
      headers: { "user-agent": "FlackBot/1.0 (+link-preview)", accept: "text/html" }
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      current = new URL(location, current).toString();
      continue;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) return null;
    return (await response.text()).slice(0, MAX_HTML_BYTES);
  }
  return null;
}

export async function POST(request: Request) {
  const log = requestLogger("unfurl");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const url =
    payload && typeof payload === "object" && typeof (payload as { url?: unknown }).url === "string"
      ? (payload as { url: string }).url
      : null;
  if (!url || !isAllowedUrl(url)) return NextResponse.json({ error: "invalid url" }, { status: 400 });

  const { data: cached } = await supabase
    .from("link_previews")
    .select("url,title,description,image_url,site_name")
    .eq("url", url)
    .maybeSingle();
  if (cached) return NextResponse.json(cached);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let preview: LinkPreview | null = null;
  try {
    const html = await safeFetchHtml(url, controller.signal);
    if (html) preview = parseOpenGraph(html, url);
  } catch (error) {
    log.warn({ err: error instanceof Error ? error.message : "unknown" }, "unfurl fetch failed");
  } finally {
    clearTimeout(timeout);
  }

  if (!preview) return NextResponse.json({ error: "no preview" }, { status: 422 });

  await supabase.from("link_previews").upsert({ ...preview, fetched_at: new Date().toISOString() });
  return NextResponse.json(preview);
}
