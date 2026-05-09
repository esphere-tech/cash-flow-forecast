import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, DollarSign, ClipboardList, PlugZap } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/40'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── Sidebar ── */}
      <aside className="w-60 flex-shrink-0 bg-slate-900 flex flex-col">

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-inner">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Cash Flow</p>
            <p className="text-slate-500 text-xs">Forecast</p>
          </div>
        </div>

        {/* Nav section */}
        <div className="px-3 pt-5 pb-2">
          <p className="px-4 mb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
            Menu
          </p>
          <nav className="space-y-1">
            <NavLink to="/dashboard" className={navClass}>
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              Dashboard
            </NavLink>
            <NavLink to="/entries" className={navClass}>
              <ClipboardList className="w-4 h-4 flex-shrink-0" />
              Entries
            </NavLink>
            <NavLink to="/integrations" className={navClass}>
              <PlugZap className="w-4 h-4 flex-shrink-0" />
              Integrations
            </NavLink>
          </nav>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1 rounded-lg">
            <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate flex-1 min-w-0">{user?.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>

          {__APP_VERSION__ && (
            <p className="px-4 pt-3 text-[10px] text-slate-700">v{__APP_VERSION__}</p>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
