import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, LogOut, DollarSign } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-600 text-white'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-slate-900 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-700">
          <div className="p-1.5 bg-indigo-600 rounded-lg">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Cash Flow</p>
            <p className="text-slate-400 text-xs">Forecast</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink to="/dashboard" className={navClass}>
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </NavLink>
          <NavLink to="/forecast" className={navClass}>
            <TrendingUp className="w-4 h-4" />
            Forecast
          </NavLink>
        </nav>

        {/* User + Logout + Version */}
        <div className="px-3 py-4 border-t border-slate-700">
          <p className="px-4 py-1 text-xs text-slate-500 truncate">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 mt-1 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
          {__APP_VERSION__ && (
            <p className="px-4 pt-3 text-xs text-slate-600">v{__APP_VERSION__}</p>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
