"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            onboarding_kind: "create_org",
            organization_name: organizationName.trim()
          }
        }
      });

      if (error) throw error;

      if (data.session) {
        router.refresh();
        router.push("/");
        return;
      }

      setMessage("Check your email to finish setup. After confirmation, Flack creates your organization, #general, #random, and makes you admin.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create organization.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = email.trim() && password.length >= 6 && organizationName.trim();

  return (
    <main className="grid min-h-screen bg-[var(--bg)] text-[var(--text)] md:grid-cols-[minmax(320px,440px)_1fr]">
      <section className="flex min-h-0 flex-col border-r border-[var(--line)] bg-[var(--surface)]">
        <div className="flex h-11 items-center gap-2 border-b border-[var(--line)] px-3">
          <span className="h-2 w-2 rounded-sm bg-[var(--accent)]" />
          <span className="text-sm font-medium tracking-tight">Flack</span>
        </div>

        <form onSubmit={submit} className="flex flex-1 flex-col justify-center px-6 py-8">
          <div className="mb-6">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">Create organization</p>
            <h1 className="text-xl font-medium tracking-tight">Set up a workspace</h1>
            <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--muted)]">You will be the first admin. Flack creates default public channels and then you can invite the team.</p>
          </div>

          <div className="mb-4 grid grid-cols-[96px_1fr] gap-x-3 gap-y-1 border-y border-[var(--line)] py-3 font-mono text-[11px]">
            <span className="text-[var(--faint)]">Creates</span>
            <span className="text-[var(--muted)]">Organization, #general, #random</span>
            <span className="text-[var(--faint)]">Role</span>
            <span className="text-[var(--muted)]">First user becomes admin</span>
            <span className="text-[var(--faint)]">Next</span>
            <span className="text-[var(--muted)]">Invite teammates from the sidebar</span>
          </div>

          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">Organization name</span>
              <Input density="default" required value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="Acme Research" />
            </label>
            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">Admin email</span>
              <Input density="default" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
            </label>
            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">Password</span>
              <Input density="default" required type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 characters" />
            </label>
            <Button disabled={loading || !canSubmit} className="w-full">
              {loading ? "Creating" : "Create organization"}
            </Button>
          </div>

          {message ? <p className="mt-3 rounded-[5px] border border-[var(--line)] bg-[var(--surface-0)] p-2 text-xs leading-5 text-[var(--muted)]">{message}</p> : null}

          <p className="mt-6 font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">
            Already have access? <Link href="/login" className="text-[var(--muted)] hover:text-[var(--text)]">Sign in</Link>
          </p>
        </form>
      </section>

      <section className="hidden min-h-0 flex-col justify-between p-6 md:flex">
        <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">Tenant setup</div>
        <div className="max-w-xl border-y border-[var(--line)] py-4">
          <h2 className="text-sm font-medium">A clean starting point</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Create the org, confirm your email, then land in #general with the admin invite controls ready. No sample data, no tour, no ceremony.</p>
        </div>
      </section>
    </main>
  );
}
