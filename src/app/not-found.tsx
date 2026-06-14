import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen bg-[var(--bg)] text-[var(--text)] md:grid-cols-[248px_1fr]">
      <aside className="hidden border-r border-[var(--line)] bg-[var(--surface)] md:block">
        <div className="flex h-11 items-center gap-2 border-b border-[var(--line)] px-3">
          <span className="h-2 w-2 rounded-sm bg-[var(--accent)]" />
          <span className="text-sm font-medium tracking-tight">Flack</span>
        </div>
      </aside>

      <section className="flex items-center px-6">
        <div className="w-full max-w-xl">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            404 · route not found
          </p>
          <h1 className="text-2xl font-medium tracking-tight">This route is not available.</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            The page may have moved, or your session may not have access to it.
          </p>
          <div className="mt-6 flex gap-2">
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-[5px] border border-[color-mix(in_oklch,var(--accent)_45%,var(--line))] bg-[color-mix(in_oklch,var(--accent)_28%,var(--surface-2))] px-3 text-sm font-medium text-[var(--text)] hover:border-[var(--accent)] hover:bg-[color-mix(in_oklch,var(--accent)_36%,var(--surface-2))]"
            >
              Return to workspace
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-[5px] border border-[var(--line)] px-3 text-sm font-medium text-[var(--muted)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
