"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic" | "accept">(inviteToken ? "accept" : "password");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isInvite = Boolean(inviteToken);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      if (inviteToken) callbackUrl.searchParams.set("invite_token", inviteToken);
      const redirectTo = callbackUrl.toString();

      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
            shouldCreateUser: false
          }
        });
        if (error) throw error;
        setMessage("Magic link sent. Check your email.");
        return;
      }

      if (mode === "accept") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: inviteToken ? { onboarding_kind: "invite", invite_token: inviteToken } : { onboarding_kind: "invite" }
          }
        });

        if (error) throw error;

        if (data.session) {
          router.refresh();
          router.push("/");
          return;
        }

        setMessage("Account created. Confirm your email to join the organization.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (inviteToken) {
        const { error: inviteError } = await supabase.rpc("accept_invite", { invite_token: inviteToken });
        if (inviteError) throw inviteError;
      }

      router.refresh();
      router.push("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  function submitLabel() {
    if (loading) return "Working";
    if (mode === "magic") return "Send magic link";
    if (mode === "accept") return "Create account and join";
    return "Continue";
  }

  function submitDisabled() {
    return loading || !email || (mode !== "magic" && password.length < 6);
  }

  return (
    <main className="grid min-h-screen bg-[var(--bg)] text-[var(--text)] md:grid-cols-[minmax(280px,420px)_1fr]">
      <section className="flex min-h-0 flex-col border-r border-[var(--line)] bg-[var(--surface)]">
        <div className="flex h-11 items-center gap-2 border-b border-[var(--line)] px-3">
          <span className="h-2 w-2 rounded-sm bg-[var(--accent)]" />
          <span className="text-sm font-medium tracking-tight">Flack</span>
        </div>

        <form onSubmit={submit} className="flex flex-1 flex-col justify-center px-6 py-8">
          <div className="mb-7">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
              {isInvite ? "Invitation" : "Workspace access"}
            </p>
            <h1 className="text-xl font-medium tracking-tight">
              {isInvite ? "Join an organization" : "Sign in to Flack"}
            </h1>
            <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--muted)]">
              {isInvite
                ? "Use the exact email address that received this invite."
                : "Access an existing organization. Creating a new organization has its own setup path."}
            </p>
          </div>

          <div
            className={`mb-4 grid ${isInvite ? "grid-cols-3" : "grid-cols-2"} rounded-[6px] border border-[var(--line)] bg-[var(--surface-0)] p-0.5 text-xs`}
          >
            <button
              type="button"
              onClick={() => setMode("password")}
              className={`h-8 rounded-[4px] transition-colors ${mode === "password" ? "bg-[var(--surface-2)] text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("magic")}
              className={`h-8 rounded-[4px] transition-colors ${mode === "magic" ? "bg-[var(--surface-2)] text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
            >
              Magic link
            </button>
            {isInvite ? (
              <button
                type="button"
                onClick={() => setMode("accept")}
                className={`h-8 rounded-[4px] transition-colors ${mode === "accept" ? "bg-[var(--surface-2)] text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
              >
                Create account
              </button>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">Work email</span>
              <Input
                density="default"
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
            </label>
            {mode !== "magic" ? (
              <label className="block space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">
                  {mode === "accept" ? "Create password" : "Password"}
                </span>
                <Input
                  density="default"
                  required
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </label>
            ) : null}
            <Button disabled={submitDisabled()} className="w-full">
              {submitLabel()}
            </Button>
          </div>

          {message ? (
            <p className="mt-3 rounded-[5px] border border-[var(--line)] bg-[var(--surface-0)] p-2 text-xs leading-5 text-[var(--muted)]">
              {message}
            </p>
          ) : null}

          <p className="mt-6 font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">
            {isInvite ? (
              "Invites expire after 7 days"
            ) : (
              <>
                Need a new organization?{" "}
                <Link href="/signup" className="text-[var(--muted)] hover:text-[var(--text)]">
                  Create one
                </Link>
              </>
            )}
          </p>
        </form>
      </section>

      <section className="hidden min-h-0 flex-col justify-between p-6 md:flex">
        <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">
          Multi-tenant realtime chat
        </div>
        <div className="max-w-xl">
          <div className="mb-4 grid grid-cols-[88px_1fr] gap-x-4 gap-y-2 border-y border-[var(--line)] py-4 font-mono text-[11px]">
            <span className="text-[var(--faint)]">Auth</span>
            <span className="text-[var(--muted)]">Password or magic link</span>
            <span className="text-[var(--faint)]">Scope</span>
            <span className="text-[var(--muted)]">Multi-tenant organizations</span>
            <span className="text-[var(--faint)]">Session</span>
            <span className="text-[var(--muted)]">Secure Supabase SSR cookies</span>
          </div>
          <p className="text-xs leading-5 text-[var(--faint)]">
            Designed as a work surface: dense, keyboard-first, and quiet until something needs attention.
          </p>
        </div>
      </section>
    </main>
  );
}
