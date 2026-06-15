"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PresenceState, Profile } from "@/types/chat";
import { Avatar } from "@/features/chat/chat-parts";
import { presenceDotClass, presenceLabel, statusActive, STATUS_DURATIONS } from "@/features/chat/status";
import { useNow } from "@/features/chat/use-now";

const PRESENCE_OPTIONS: PresenceState[] = ["active", "away", "dnd"];

export function StatusControl({
  profile,
  user,
  onPresence,
  onSaveStatus,
  onClearStatus
}: {
  profile: Profile | null;
  user: User | null;
  onPresence: (presence: PresenceState) => void;
  onSaveStatus: (emoji: string | null, text: string, minutes: number) => void;
  onClearStatus: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [emoji, setEmoji] = useState("");
  const [text, setText] = useState("");
  const [minutes, setMinutes] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const now = useNow();
  const presence = profile?.presence ?? "active";
  const hasStatus = statusActive(profile, now);
  const name = profile?.display_name ?? user?.email ?? "Me";

  function openEditor() {
    setEmoji(profile?.status_emoji ?? "");
    setText(profile?.status_text ?? "");
    setMinutes(0);
    setOpen(true);
  }

  function save() {
    onSaveStatus(emoji.trim() || null, text.trim(), minutes);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative border-t border-[var(--line)] px-2 py-2">
      <button
        onClick={openEditor}
        className="flex w-full items-center gap-2 rounded-[5px] px-1 py-1 text-left hover:bg-[var(--surface-2)]"
      >
        <span className="relative">
          <Avatar name={name} size="sm" />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[var(--surface)] ${presenceDotClass(presence)}`}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{name}</p>
          <p className="truncate text-[10px] text-[var(--muted)]">
            {hasStatus
              ? `${profile?.status_emoji ?? ""} ${profile?.status_text ?? ""}`.trim()
              : presenceLabel(presence)}
          </p>
        </div>
      </button>

      {open ? (
        <div className="absolute bottom-full left-2 right-2 z-30 mb-1 rounded-[6px] border border-[var(--line-strong)] bg-[var(--surface)] p-2 shadow-xl shadow-black/40">
          <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-[var(--faint)]">Presence</p>
          <div className="mb-2 flex gap-1">
            {PRESENCE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => onPresence(option)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-[4px] border px-1 py-1 text-[10px] ${
                  presence === option
                    ? "border-[var(--line-strong)] text-[var(--text)]"
                    : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${presenceDotClass(option)}`} />
                {presenceLabel(option)}
              </button>
            ))}
          </div>

          <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-[var(--faint)]">Status</p>
          <div className="mb-2 flex gap-1">
            <Input
              density="compact"
              value={emoji}
              onChange={(event) => setEmoji(event.target.value)}
              placeholder="😀"
              className="w-12 text-center"
            />
            <Input
              density="compact"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What's your status?"
            />
          </div>
          <select
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
            className="mb-2 h-8 w-full rounded-[5px] border border-[var(--line)] bg-[var(--surface-0)] px-2 text-xs outline-none"
          >
            {STATUS_DURATIONS.map((duration) => (
              <option key={duration.minutes} value={duration.minutes}>
                Clear after: {duration.label}
              </option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <Button size="sm" onClick={save}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onClearStatus();
                setOpen(false);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
