export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
};

const URL_REGEX = /\bhttps?:\/\/[^\s<>()]+/gi;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX) ?? [];
  const cleaned = matches.map((url) => url.replace(/[.,;:!?]+$/, ""));
  return Array.from(new Set(cleaned));
}

export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return true;
  const parts = host.split(".");
  if (parts.length === 4 && parts.every((part) => /^\d+$/.test(part))) {
    const [a, b] = parts.map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

export function isAllowedUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return !isPrivateHostname(url.hostname);
}

export function parseOpenGraph(html: string, url: string): LinkPreview {
  const meta = (property: string) => {
    const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*>`, "i"))?.[0];
    if (!tag) return null;
    return tag.match(/content=["']([^"']*)["']/i)?.[1] ?? null;
  };
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;
  return {
    url,
    title: meta("og:title") ?? titleTag,
    description: meta("og:description") ?? meta("description"),
    image_url: meta("og:image"),
    site_name: meta("og:site_name")
  };
}
