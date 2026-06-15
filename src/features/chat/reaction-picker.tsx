"use client";

import { useEffect, useRef, useState } from "react";
import { SmilePlus } from "lucide-react";
import { EmojiPicker, type EmojiPickerListCategoryHeaderProps, type EmojiPickerListEmojiProps } from "frimousse";
import { addRecent, readRecents, writeRecents } from "@/features/chat/emoji-recents";

function EmojiCategoryHeader({ category, ...props }: EmojiPickerListCategoryHeaderProps) {
  return (
    <div
      className="bg-[var(--surface)] px-1 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-[var(--faint)]"
      {...props}
    >
      {category.label}
    </div>
  );
}

function EmojiButton({ emoji, ...props }: EmojiPickerListEmojiProps) {
  return (
    <button className="grid h-7 w-7 place-items-center rounded-[4px] text-base hover:bg-[var(--surface-2)]" {...props}>
      {emoji.emoji}
    </button>
  );
}

export function ReactionPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setRecents(readRecents()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  function pick(emoji: string) {
    const next = addRecent(recents, emoji);
    setRecents(next);
    writeRecents(next);
    onSelect(emoji);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Add reaction"
        className="grid h-5 w-5 place-items-center rounded-[4px] border border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]"
      >
        <SmilePlus size={12} />
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-[284px] rounded-[6px] border border-[var(--line-strong)] bg-[var(--surface)] p-2 shadow-xl shadow-black/40">
          {recents.length ? (
            <div className="mb-1.5 flex flex-wrap gap-1 border-b border-[var(--line)] pb-1.5">
              {recents.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => pick(emoji)}
                  className="grid h-6 w-6 place-items-center rounded-[4px] text-sm hover:bg-[var(--surface-2)]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
          <EmojiPicker.Root
            onEmojiSelect={({ emoji }) => pick(emoji)}
            className="isolate flex h-[260px] w-full flex-col"
          >
            <EmojiPicker.Search className="mb-2 h-8 w-full rounded-[5px] border border-[var(--line)] bg-[var(--surface-0)] px-2 text-xs outline-none placeholder:text-[var(--faint)]" />
            <EmojiPicker.Viewport className="thin-scrollbar relative flex-1 outline-none">
              <EmojiPicker.Loading className="grid h-full place-items-center text-xs text-[var(--faint)]">
                Loading…
              </EmojiPicker.Loading>
              <EmojiPicker.Empty className="grid h-full place-items-center text-xs text-[var(--faint)]">
                No emoji found.
              </EmojiPicker.Empty>
              <EmojiPicker.List
                className="select-none pb-1"
                components={{ CategoryHeader: EmojiCategoryHeader, Emoji: EmojiButton }}
              />
            </EmojiPicker.Viewport>
          </EmojiPicker.Root>
        </div>
      ) : null}
    </div>
  );
}
