import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Button } from './ui/button';

export default function Layout({ onLogout, permissions, authType, profile }) {
  const isClient = authType === 'client';

  if (isClient) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f5fbf8_0%,#ffffff_28%,#f7f8fa_100%)] text-[var(--ink)]">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-5 lg:px-6">
          <div className="glass-panel overflow-hidden rounded-[32px] border border-[var(--border)]">
            <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)] lg:px-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-[var(--muted-ink)]">
                  Buyer Space
                </p>
                <h1 className="font-display mt-3 text-3xl leading-tight sm:text-4xl">COD Merchant Marketplace</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
                  Move through a clear buyer flow: choose a merchant, choose a branch, then browse the items in a cleaner carousel-style catalog.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm text-[var(--muted-ink)]">
                  <div className="font-display text-[11px] uppercase tracking-[0.35em]">Account</div>
                  <div className="mt-2 font-semibold text-[var(--ink)]">{profile?.company_name || profile?.email || 'Buyer'}</div>
                </div>
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm text-[var(--muted-ink)]">
                  <div className="font-display text-[11px] uppercase tracking-[0.35em]">Mode</div>
                  <div className="mt-2 font-semibold text-[var(--ink)]">Structured buyer flow</div>
                </div>
                <Button variant="secondary" onClick={onLogout} className="h-12 rounded-[24px]">
                  Log Out
                </Button>
              </div>
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
