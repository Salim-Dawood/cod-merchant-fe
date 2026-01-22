import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';

const sections = [
  {
    title: 'Platform',
    links: [
      { label: 'Admins', to: '/platform/platform-admins', permission: 'view-platform-admin' },
      { label: 'Roles', to: '/platform/platform-roles', permission: 'view-platform-role' },
      { label: 'Permissions', to: '/platform/platform-permissions', permission: 'view-platform-permission' },
      { label: 'Role Permissions', to: '/platform/platform-role-permissions', permission: 'view-platform-role-permission' }
    ]
  },
  {
    title: 'Merchant',
    links: [
      { label: 'Merchants', to: '/merchant/merchants', permission: 'view-merchant' },
      { label: 'Branches', to: '/merchant/branches', permission: 'view-branch' },
      { label: 'Users', to: '/merchant/users', permission: 'view-user' },
      { label: 'Permissions', to: '/merchant/permissions', permission: 'view-permission' },
      { label: 'Branch Roles', to: '/merchant/branch-roles', permission: 'view-branch-role' },
      { label: 'Branch Role Permissions', to: '/merchant/branch-role-permissions', permission: 'view-branch-role-permission' }
    ]
  }
];

export default function Sidebar({ permissions = [], authType }) {
  let navIndex = 0;
  const [openSections, setOpenSections] = useState({
    Platform: true,
    Merchant: true
  });

  const toggleSection = (title) => {
    setOpenSections((prev) => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <aside className="glass-panel rise-fade flex w-full flex-col gap-8 rounded-[32px] px-6 py-7 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-[320px] lg:min-w-[320px] lg:overflow-y-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-lg font-semibold text-white shadow-lg">
            CM
          </div>
          <div>
            <h1 className="font-display text-2xl leading-tight">COD Merchant</h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[var(--muted-ink)]">
              Merchant Office
            </p>
          </div>
        </div>
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_rgba(12,107,92,0.8)]" />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted-ink)]">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--ink)]">Storefront</p>
        <p className="mt-2 leading-relaxed">
          Curate branches, manage teams, and keep merchant experiences on brand.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted-ink)]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em]">Workspace</p>
          <p className="mt-1 text-sm font-semibold text-[var(--ink)]">Regional Ops</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-ink)]">
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1">
            Q1 Cycle
          </span>
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1">
            Audit Ready
          </span>
        </div>
      </div>

      <nav className="space-y-6">
        {sections
          .filter((section) => (authType === 'merchant' ? section.title === 'Merchant' : true))
          .map((section) => {
            const visibleLinks = section.links.filter((link) => {
              if (!link.permission) {
                return true;
              }
              return permissions.includes(link.permission);
            });

            if (visibleLinks.length === 0) {
              return null;
            }

            return (
              <div key={section.title}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className="mb-3 flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--muted-ink)]"
                >
                  <span>{section.title}</span>
                  <span className="font-mono text-sm">{openSections[section.title] ? '-' : '+'}</span>
                </button>
                {openSections[section.title] && (
                  <div className="flex flex-col gap-2">
                    {visibleLinks.map((link) => {
                      const delay = `${navIndex * 70}ms`;
                      navIndex += 1;
                      return (
                        <NavLink
                          key={link.to}
                          to={link.to}
                          style={{ animationDelay: delay }}
                          className={({ isActive }) =>
                            cn(
                              'stagger-item rounded-2xl border border-transparent px-4 py-2 text-sm font-medium text-[var(--muted-ink)] transition hover:-translate-y-0.5 hover:border-[var(--border)] hover:bg-[var(--surface)]',
                              isActive &&
                                'border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--ink)] shadow-sm'
                            )
                          }
                        >
                          {link.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </nav>
    </aside>
  );
}
