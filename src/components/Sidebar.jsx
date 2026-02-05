import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';

const sections = [
  {
    title: 'Platform',
    links: [
      { label: 'Admins', to: '/platform/platform-admins', permission: 'view-platform-admin', icon: 'users' },
      { label: 'Roles', to: '/platform/platform-roles', permission: 'view-platform-role', icon: 'shield' }
    ]
  },
  {
    title: 'Merchant',
    links: [
      { label: 'Merchants', to: '/merchant/merchants', permission: 'view-merchant', icon: 'store' },
      { label: 'Branches', to: '/merchant/branches', permission: 'view-branch', icon: 'branch' },
      { label: 'Users', to: '/merchant/users', permission: 'view-user', icon: 'user' },
      { label: 'Permissions', to: '/merchant/permissions', permission: 'view-permission', icon: 'key' },
      { label: 'Branch Roles', to: '/merchant/branch-roles', permission: 'view-branch-role', icon: 'id' },
      { label: 'Branch Role Permissions', to: '/merchant/branch-role-permissions', permission: 'view-branch-role-permission', icon: 'list' },
      { label: 'Products', to: '/merchant/products', permission: 'view-product', icon: 'stack' },
      { label: 'Categories', to: '/merchant/categories', permission: 'view-category', icon: 'grid' },
      { label: 'Product Images', to: '/merchant/product-images', permission: 'view-product-image', icon: 'file' },
      { label: 'Product Categories', to: '/merchant/product-categories', permission: 'view-product-category', icon: 'list' }
    ]
  }
];

export default function Sidebar({ permissions = [], authType, profile }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState({
    Platform: true,
    Merchant: true
  });

  const profileName = profile?.email || 'Profile';
  const avatarStorageKey = profile?.id
    ? `profile_avatar_${authType === 'merchant' ? 'users' : 'platform-admins'}_${profile.id}`
    : '';
  const [avatarUrl, setAvatarUrl] = useState(() => {
    const fromProfile = profile?.avatar_url ? String(profile.avatar_url) : '';
    if (fromProfile || !avatarStorageKey) {
      return fromProfile;
    }
    try {
      return localStorage.getItem(avatarStorageKey) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    const fromProfile = profile?.avatar_url ? String(profile.avatar_url) : '';
    if (fromProfile) {
      setAvatarUrl(fromProfile);
      if (avatarStorageKey) {
        try {
          localStorage.setItem(avatarStorageKey, fromProfile);
        } catch {
          // ignore storage failures
        }
      }
      return;
    }
    if (!avatarStorageKey) {
      setAvatarUrl('');
      return;
    }
    try {
      setAvatarUrl(localStorage.getItem(avatarStorageKey) || '');
    } catch {
      setAvatarUrl('');
    }
  }, [profile?.avatar_url, avatarStorageKey]);

  useEffect(() => {
    const handleAvatarUpdate = (event) => {
      if (!event?.detail || event.detail.id !== profile?.id) {
        return;
      }
      const nextUrl = event.detail.avatar_url || '';
      setAvatarUrl(nextUrl);
      if (avatarStorageKey) {
        try {
          if (nextUrl) {
            localStorage.setItem(avatarStorageKey, nextUrl);
          } else {
            localStorage.removeItem(avatarStorageKey);
          }
        } catch {
          // ignore storage failures
        }
      }
    };
    window.addEventListener('profile-avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('profile-avatar-updated', handleAvatarUpdate);
  }, [profile?.id]);

  const visibleSections = sections.filter((section) =>
    authType === 'merchant' ? section.title === 'Merchant' : true
  );

  const visibleLinks = visibleSections.flatMap((section) => {
    if (section.title === 'Merchant') {
      return section.links;
    }
    return section.links.filter((link) => !link.permission || permissions.includes(link.permission));
  });
  const toggleSection = (title) => {
    setOpenSections((prev) => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <aside className="rise-fade flex-none">
      <div
        className={cn(
          'glass-panel flex rounded-[32px] px-4 py-4 sm:px-5 sm:py-5 lg:h-screen lg:px-5 lg:py-6',
          isCollapsed ? 'flex-row gap-4 sm:gap-4 lg:gap-5' : 'flex-col gap-6',
          isCollapsed ? 'w-[96px] px-4' : 'w-[280px] sm:w-[360px] lg:w-[420px]'
        )}
      >
        {isCollapsed && (
          <div className="flex w-20 flex-col items-center justify-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-lg">
              CM
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              aria-expanded={!isCollapsed}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-ink)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-soft)]"
            >
              <span className="text-base font-semibold">{isCollapsed ? '>' : '<'}</span>
            </button>
            <div className="no-scrollbar flex flex-1 flex-col items-center gap-2 overflow-y-auto pb-2 pt-1">
              {visibleLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent text-[var(--muted-ink)] transition hover:-translate-y-0.5 hover:border-[var(--border)] hover:bg-[var(--surface)]',
                      isActive && 'border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--ink)] shadow-sm'
                    )
                  }
                  aria-label={link.label}
                >
                  <SidebarIcon name={link.icon || 'dot'} />
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {!isCollapsed && (
          <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto transition-all duration-300 ease-out opacity-100">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-lg">
                  CM
                </div>
                <div>
                  <h1 className="font-display text-[26px] leading-tight tracking-[0.04em]">COD Merchant</h1>
                  <p className="font-mono text-[10px] uppercase tracking-[0.45em] text-[var(--muted-ink)]">
                    Merchant Office
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCollapsed((prev) => !prev)}
                  aria-expanded={!isCollapsed}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-ink)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-soft)]"
                >
                  <span className="text-base font-semibold">{isCollapsed ? '>' : '<'}</span>
                </button>
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_rgba(12,107,92,0.8)]" />
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted-ink)]">
              <p className="font-display text-[12px] font-semibold uppercase tracking-[0.5em] text-[var(--ink)]">
                Storefront
              </p>
              <p className="mt-2 leading-relaxed text-[13px]">
                Curate branches, manage teams, and keep merchant experiences on brand.
              </p>
            </div>

            <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted-ink)]">
              <div>
                <p className="font-display text-[12px] uppercase tracking-[0.5em]">Workspace</p>
                <p className="mt-1 text-[13px] font-semibold text-[var(--ink)] tracking-[0.02em]">
                  Regional Ops
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted-ink)]">
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1">
                  Q1 Cycle
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1">
                  Audit Ready
                </span>
              </div>
            </div>

            <nav className="space-y-6">
              {visibleSections.map((section) => {
                const sectionLinks =
                  section.title === 'Merchant'
                    ? section.links
                    : section.links.filter((link) => !link.permission || permissions.includes(link.permission));

                if (sectionLinks.length === 0) {
                  return null;
                }

                return (
                  <div key={section.title}>
                    <button
                      type="button"
                      onClick={() => toggleSection(section.title)}
                      className="mb-3 flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-[0.45em] text-[var(--muted-ink)]"
                    >
                      <span>{section.title}</span>
                      <span className="text-base text-[var(--muted-ink)]">
                        {openSections[section.title] ? (
                          <SidebarIcon name="chevron-up" />
                        ) : (
                          <SidebarIcon name="chevron-down" />
                        )}
                      </span>
                    </button>
                    {openSections[section.title] && (
                      <div className="flex flex-col gap-2">
                        {sectionLinks.map((link, index) => {
                          const delay = `${index * 70}ms`;
                          return (
                            <NavLink
                              key={link.to}
                              to={link.to}
                              style={{ animationDelay: delay }}
                              className={({ isActive }) =>
                                cn(
                                  'stagger-item flex items-center gap-3 rounded-2xl border border-transparent px-4 py-2 text-sm font-medium text-[var(--muted-ink)] transition hover:-translate-y-0.5 hover:border-[var(--border)] hover:bg-[var(--surface)]',
                                  isActive &&
                                    'border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--ink)] shadow-sm'
                                )
                              }
                            >
                              <span className="text-[var(--muted-ink)]">
                                <SidebarIcon name={link.icon || 'dot'} />
                              </span>
                              <span className="tracking-[0.01em]">{link.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted-ink)]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]">
                  <SidebarIcon name="spark" />
                </div>
                <div>
                  <p className="font-display text-[12px] uppercase tracking-[0.5em] text-[var(--muted-ink)]">
                    Current plan
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-[var(--ink)] tracking-[0.02em]">
                    Pro trial
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--muted-ink)]">
                Upgrade to Pro to unlock analytics and priority support.
              </p>
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.38em] text-[var(--muted-ink)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-soft)]"
              >
                <SidebarIcon name="bolt" />
                <span className="font-display text-[12px] tracking-[0.32em]">Upgrade to Pro</span>
              </button>
            </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-3 text-[13px]">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--muted-ink)]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profileName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <SidebarIcon name="user" />
                )}
              </div>
              <div>
                <p className="font-semibold text-[var(--ink)] tracking-[0.02em]">{profileName}</p>
                <p className="text-[11px] text-[var(--muted-ink)] tracking-[0.2em] uppercase">
                  {profile?.email || 'Pro trial'}
                </p>
              </div>
              <span className="ml-auto text-[var(--muted-ink)]">v</span>
            </div>
          </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function SidebarIcon({ name }) {
  switch (name) {
    case 'home':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M4 11.5L12 5l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'search':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M16.5 16.5L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'inbox':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M4 6h16l-2 9h-5l-1.5 3h-2L8 15H4z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'bell':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M12 20a2.5 2.5 0 0 0 2.4-2h-4.8A2.5 2.5 0 0 0 12 20zm6-5H6l1.5-2V9a4.5 4.5 0 0 1 9 0v4z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'grid':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case 'chart':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'file':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path d="M7 4h7l4 4v12H7z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M14 4v4h4" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case 'stack':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path d="M4 7l8-4 8 4-8 4zM4 12l8 4 8-4M4 17l8 4 8-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case 'receipt':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path d="M6 4h12v16l-2-1-2 1-2-1-2 1-2-1-2 1z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M9 9h6M9 13h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'archive':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path d="M4 7h16v12H4z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 7l1-3h6l1 3" stroke="currentColor" strokeWidth="1.6" />
          <path d="M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'trash':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path d="M6 7h12l-1 13H7z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M9 7V4h6v3M4 7h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'settings':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm7 3l1.5 1-1.5 1-.5 2-2 .8-.8 2h-2l-1 1.5-1-1.5H9l-.8-2-2-.8-.5-2-1.5-1 1.5-1 .5-2 2-.8.8-2h2L12 3.5l1 1.5h2l.8 2 2 .8z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'help':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M9.5 9a2.8 2.8 0 0 1 5.3 1c0 2-2.8 2-2.8 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="17" r="1" fill="currentColor" />
        </svg>
      );
    case 'users':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3.5 18c1.6-3 8.4-3 10 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="17.5" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M14.5 18c.7-1.4 2.7-2.2 4-2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'shield':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9.5 12.5l1.8 1.8 3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'key':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="9" cy="10" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 10h8v3h-2v2h-2v2h-2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'list':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path d="M8 7h12M8 12h12M8 17h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="4" cy="7" r="1" fill="currentColor" />
          <circle cx="4" cy="12" r="1" fill="currentColor" />
          <circle cx="4" cy="17" r="1" fill="currentColor" />
        </svg>
      );
    case 'store':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path d="M4 10h16v9H4z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M3 10l2-6h14l2 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9 19v-5h6v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case 'branch':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path d="M5 20V7l7-3 7 3v13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9 20v-5h6v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case 'id':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <rect x="4" y="6" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="9" cy="12" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M13 11h5M13 14h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'user':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M5 19c1.8-3 11.2-3 14 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'bolt':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
          <path d="M13 3L5 14h6l-1 7 9-12h-6z" fill="currentColor" />
        </svg>
      );
    case 'spark':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );
    case 'chevron-up':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
          <path d="M6 14l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
          <path d="M6 10l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'dot':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3">
          <circle cx="12" cy="12" r="4" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}
