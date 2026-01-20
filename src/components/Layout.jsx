import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen grid-cols-[280px_1fr]">
        <Sidebar />
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
