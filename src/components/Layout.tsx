import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Bell, Menu, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoading } = useAppContext();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">

      {/* Sidebar — Desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Drawer mobile — overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Drawer mobile — panel */}
      <div className={`
        fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="relative h-full">
          <Sidebar onNavigate={() => setMobileOpen(false)} />
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-[-44px] p-2 bg-white rounded-r-xl shadow-md text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between border-b border-border bg-surface px-4 sm:px-6 md:px-8 shrink-0 shadow-sm">
          {/* Hamburguesa — solo mobile */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Nombre — solo mobile cuando el drawer está cerrado */}
          <span className="md:hidden font-extrabold font-display text-primary-500 text-base">
            Be Böld
          </span>

          <div className="flex items-center gap-4 ml-auto">
            <button className="relative p-2 text-slate-400 hover:text-text-main transition-colors">
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Contenido dinámico */}
        <main className="flex-1 overflow-y-auto w-full">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-8 h-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                <p className="text-sm font-medium">Conectando con Supabase...</p>
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
