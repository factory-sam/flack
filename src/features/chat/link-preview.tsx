"use client";

import { useEffect, useState } from "react";
import type { LinkPreview } from "@/features/chat/unfurl";

export function LinkPreviewCard({ url }: { url: string }) {
  const [preview, setPreview] = useState<LinkPreview | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/unfurl", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url }),
          signal: controller.signal
        });
        if (!response.ok) return;
        const data = (await response.json()) as LinkPreview;
        if (active) setPreview(data);
      } catch {
        // Preview is best-effort; ignore network/parse failures.
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [url]);

  if (!preview || (!preview.title && !preview.description && !preview.image_url)) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="mt-1.5 flex max-w-md gap-2 rounded-[6px] border border-[var(--line)] border-l-2 border-l-[var(--accent)] bg-[var(--surface-0)] p-2 hover:border-[var(--line-strong)]"
    >
      {preview.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.image_url} alt="" className="h-12 w-12 shrink-0 rounded-[4px] object-cover" />
      ) : null}
      <div className="min-w-0">
        {preview.site_name ? (
          <p className="truncate text-[10px] uppercase tracking-wide text-[var(--faint)]">{preview.site_name}</p>
        ) : null}
        {preview.title ? <p className="truncate text-xs font-medium text-[var(--text)]">{preview.title}</p> : null}
        {preview.description ? (
          <p className="line-clamp-2 text-[11px] text-[var(--muted)]">{preview.description}</p>
        ) : null}
      </div>
    </a>
  );
}
