import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="min-h-screen text-[var(--ink)]">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-10 lg:px-8">
        <Sidebar />
        <main className="flex-1">
          <div className="surface-panel rise-fade mb-6 rounded-3xl px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-ink)]">
                  Operations Suite
                </p>
                <h1 className="font-display text-3xl leading-tight md:text-4xl">
                  Control the platform, shape the merchants.
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-[var(--muted-ink)]">
                  A single command center for platform governance, merchant onboarding, and permission design.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-ink)]">
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
                  Api v1
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
                  Live Data
                </span>
              </div>
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
