import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout({ onLogout, permissions, authType, profile }) {
  return (
    <div className="h-screen text-[var(--ink)]">
      <div className="flex h-full w-full flex-col gap-4 px-0 py-0 sm:flex-row sm:gap-4 lg:gap-5">
        <Sidebar permissions={permissions} authType={authType} profile={profile} onLogout={onLogout} />
        <main className="flex h-full min-h-0 flex-1 min-w-0 flex-col space-y-3 overflow-y-auto rounded-[20px] bg-[var(--surface)] p-3 shadow-sm sm:p-4 lg:p-4">
          <div className="flex-1 min-h-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
