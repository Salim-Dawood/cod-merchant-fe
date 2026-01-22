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

export default function Sidebar({ permissions = [] }) {
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
    <aside className="soft-panel rise-fade flex w-full flex-col gap-8 rounded-3xl px-6 py-7 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:max-w-[300px] lg:overflow-y-auto">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-lg font-semibold text-white shadow-lg">
          CM
        </div>
        <div>
          <h1 className="font-display text-xl leading-tight">COD Merchant</h1>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted-ink)]">
            Admin Console
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted-ink)]">
        <p className="font-semibold uppercase tracking-[0.2em] text-[var(--ink)]">Pulse</p>
        <p className="mt-2 leading-relaxed">
          Review access, approve merchants, and map permissions with clarity.
        </p>
      </div>

      <nav className="space-y-6">
        {sections.map((section) => {
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
              className="mb-3 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-[0.26em] text-[var(--muted-ink)]"
            >
              <span>{section.title}</span>
              <span className="text-sm">{openSections[section.title] ? '–' : '+'}</span>
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
                          'stagger-item rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-[var(--muted-ink)] transition hover:border-[var(--border)] hover:bg-[var(--surface)]',
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
