import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';

const sections = [
  {
    title: 'Platform',
    links: [
      { label: 'Admins', to: '/platform/platform-admins' },
      { label: 'Roles', to: '/platform/platform-roles' },
      { label: 'Permissions', to: '/platform/platform-permissions' },
      { label: 'Role Permissions', to: '/platform/platform-role-permissions' }
    ]
  },
  {
    title: 'Merchant',
    links: [
      { label: 'Merchants', to: '/merchant/merchants' },
      { label: 'Branches', to: '/merchant/branches' },
      { label: 'Users', to: '/merchant/users' },
      { label: 'Permissions', to: '/merchant/permissions' },
      { label: 'Branch Roles', to: '/merchant/branch-roles' },
      { label: 'Branch Role Permissions', to: '/merchant/branch-role-permissions' }
    ]
  }
];

export default function Sidebar() {
  let navIndex = 0;

  return (
    <aside className="soft-panel rise-fade flex w-full flex-col gap-8 rounded-3xl px-6 py-7 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:max-w-[300px]">
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
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.26em] text-[var(--muted-ink)]">
              {section.title}
            </h2>
            <div className="flex flex-col gap-2">
              {section.links.map((link) => {
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
          </div>
        ))}
      </nav>
    </aside>
  );
}
