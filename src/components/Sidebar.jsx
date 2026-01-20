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
  return (
    <aside className="flex h-full flex-col border-r border-slate-200 bg-white p-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">COD Merchant</h1>
        <p className="text-xs text-slate-500">Admin Console</p>
      </div>
      <nav className="space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {section.title}
            </h2>
            <div className="flex flex-col gap-1">
              {section.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100',
                      isActive && 'bg-slate-100 text-slate-900'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
