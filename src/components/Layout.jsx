import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Button } from './ui/button';

export default function Layout({ onLogout, permissions, authType, profile }) {
  const isClient = authType === 'client';

  if (isClient) {
    return (
      <div className="min-h-screen text-[var(--ink)]">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-5 lg:px-6">
          <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-[28px] px-5 py-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-[var(--muted-ink)]">
                Buyer Space
              </p>
              <h1 className="font-display mt-2 text-3xl leading-tight">COD Merchant</h1>
              <p className="mt-2 text-sm text-[var(--muted-ink)]">
                Browse merchants, branches, categories, and products as cards.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted-ink)]">
                <div className="font-display text-[11px] uppercase tracking-[0.35em]">Current Plan</div>
                <div className="mt-1 font-semibold text-[var(--ink)]">Pro trial</div>
              </div>
              <Button variant="outline" onClick={() => {}}>
                Upgrade Your Trial
              </Button>
              <Button variant="secondary" onClick={onLogout}>
                Log Out
              </Button>
            </div>
          </div>
          <main className="flex min-h-0 flex-1 flex-col">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden text-[var(--ink)]">
      <div className="flex h-full w-full flex-col gap-4 px-0 py-0 sm:flex-row sm:gap-4 lg:gap-5">
        <Sidebar permissions={permissions} authType={authType} profile={profile} onLogout={onLogout} />
        <main className="flex h-full min-h-0 flex-1 min-w-0 flex-col space-y-3 overflow-hidden rounded-[20px] bg-[var(--surface)] p-3 shadow-sm sm:p-4 lg:p-4">
          <div className="flex-1 min-h-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
