import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout({ onLogout, permissions, authType }) {
  return (
    <div className="min-h-screen text-[var(--ink)]">
      <div className="mx-auto flex min-h-screen max-w-[1560px] flex-col gap-4 px-2 py-2 lg:flex-row lg:gap-5 lg:px-4">
        <Sidebar permissions={permissions} authType={authType} />
        <main className="flex-1 space-y-6 rounded-[28px] bg-[var(--surface)] p-4 shadow-sm">
          <div className="surface-panel rise-fade rounded-[24px] px-6 py-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-[var(--muted-ink)]">Welcome, COD Merchant</p>
                <h1 className="text-2xl font-bold leading-tight md:text-3xl">Command Center</h1>
                <p className="mt-1 text-sm text-[var(--muted-ink)]">
                  Oversee merchants, assign roles, and keep every storefront consistent.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-ink)] transition hover:bg-[var(--surface-soft)]"
                  aria-label="Search"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                    <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M16.5 16.5L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-ink)] transition hover:bg-[var(--surface-soft)]"
                  aria-label="Notifications"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                    <path
                      d="M12 20a2.5 2.5 0 0 0 2.4-2h-4.8A2.5 2.5 0 0 0 12 20zm6-5H6l1.5-2V9a4.5 4.5 0 0 1 9 0v4z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-ink)] transition hover:bg-[var(--surface-soft)]"
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
