import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout({ onLogout, permissions, authType }) {
  return (
    <div className="min-h-screen text-[var(--ink)]">
      <div className="mx-auto flex min-h-screen max-w-[1560px] flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-10 lg:px-8">
        <Sidebar permissions={permissions} authType={authType} />
        <main className="flex-1 space-y-6">
          <div className="surface-panel rise-fade relative overflow-hidden rounded-[32px] px-6 py-6">
            <div className="absolute -right-24 -top-20 h-44 w-44 rounded-full bg-[var(--accent)]/15 blur-3xl" />
            <div className="absolute -bottom-24 left-16 h-52 w-52 rounded-full bg-[var(--sun)]/20 blur-3xl" />
            <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-lg">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
                    <path d="M4 12L12 4L20 12L12 20L4 12Z" fill="currentColor" />
                    <path d="M12 4V20" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.4em] text-[var(--muted-ink)]">
                    Merchant Studio
                  </p>
                  <h1 className="font-display text-3xl leading-tight md:text-4xl">
                    Command Center
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-[var(--muted-ink)]">
                    Oversee merchants, assign roles, and keep every storefront consistent.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-ink)]">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2">
                  <p className="font-mono text-[10px] tracking-[0.3em]">Sync</p>
                  <p className="text-sm font-semibold text-[var(--ink)]">Live</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2">
                  <p className="font-mono text-[10px] tracking-[0.3em]">Scope</p>
                  <p className="text-sm font-semibold text-[var(--ink)]">Global</p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted-ink)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-soft)]"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
