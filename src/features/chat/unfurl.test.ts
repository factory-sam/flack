import { describe, expect, it } from "vitest";
import { extractUrls, isAllowedUrl, isPrivateHostname, parseOpenGraph } from "./unfurl";

describe("extractUrls", () => {
  it("extracts http and https urls", () => {
    expect(extractUrls("see http://a.com and https://b.com/x")).toEqual(["http://a.com", "https://b.com/x"]);
  });

  it("strips trailing punctuation", () => {
    expect(extractUrls("visit https://example.com.")).toEqual(["https://example.com"]);
  });

  it("dedupes repeated urls", () => {
    expect(extractUrls("https://a.com https://a.com")).toEqual(["https://a.com"]);
  });

  it("returns empty when there are no urls", () => {
    expect(extractUrls("no links here")).toEqual([]);
  });
});

describe("isPrivateHostname", () => {
  it("flags loopback and local domains", () => {
    expect(isPrivateHostname("localhost")).toBe(true);
    expect(isPrivateHostname("db.local")).toBe(true);
    expect(isPrivateHostname("svc.internal")).toBe(true);
    expect(isPrivateHostname("::1")).toBe(true);
    expect(isPrivateHostname("fd00::1")).toBe(true);
  });

  it("flags private IPv4 ranges", () => {
    expect(isPrivateHostname("10.0.0.1")).toBe(true);
    expect(isPrivateHostname("127.0.0.1")).toBe(true);
    expect(isPrivateHostname("169.254.1.1")).toBe(true);
    expect(isPrivateHostname("172.16.5.5")).toBe(true);
    expect(isPrivateHostname("192.168.1.2")).toBe(true);
    expect(isPrivateHostname("0.0.0.0")).toBe(true);
  });

  it("allows public hosts", () => {
    expect(isPrivateHostname("example.com")).toBe(false);
    expect(isPrivateHostname("8.8.8.8")).toBe(false);
    expect(isPrivateHostname("172.32.0.1")).toBe(false);
  });
});

describe("isAllowedUrl", () => {
  it("rejects invalid urls", () => {
    expect(isAllowedUrl("not a url")).toBe(false);
  });

  it("rejects non-http protocols", () => {
    expect(isAllowedUrl("ftp://example.com")).toBe(false);
    expect(isAllowedUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects private hosts", () => {
    expect(isAllowedUrl("http://localhost:3000")).toBe(false);
    expect(isAllowedUrl("http://192.168.0.1")).toBe(false);
  });

  it("allows public http(s) urls", () => {
    expect(isAllowedUrl("https://example.com/path")).toBe(true);
  });
});

describe("parseOpenGraph", () => {
  it("prefers open graph tags", () => {
    const html = `
      <meta property="og:title" content="Title" />
      <meta property="og:description" content="Desc" />
      <meta property="og:image" content="https://img" />
      <meta property="og:site_name" content="Site" />
    `;
    expect(parseOpenGraph(html, "https://x.com")).toEqual({
      url: "https://x.com",
      title: "Title",
      description: "Desc",
      image_url: "https://img",
      site_name: "Site"
    });
  });

  it("falls back to <title> and meta description", () => {
    const html = `<title> Fallback </title><meta name="description" content="Meta desc">`;
    const result = parseOpenGraph(html, "https://x.com");
    expect(result.title).toBe("Fallback");
    expect(result.description).toBe("Meta desc");
    expect(result.image_url).toBeNull();
    expect(result.site_name).toBeNull();
  });

  it("ignores meta tags without a content attribute", () => {
    const html = `<meta property="og:title"><title>Real</title>`;
    expect(parseOpenGraph(html, "https://x.com").title).toBe("Real");
  });

  it("returns nulls when nothing is present", () => {
    expect(parseOpenGraph("<html></html>", "https://x.com")).toEqual({
      url: "https://x.com",
      title: null,
      description: null,
      image_url: null,
      site_name: null
    });
  });
});
