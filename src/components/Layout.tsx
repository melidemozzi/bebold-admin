import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Bell, Menu } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoading } = useAppContext();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">

      {/* Sidebar — Desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 md:hidden"
          style={{ zIndex: 40 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-y-0 left-0 md:hidden" style={{ zIndex: 50 }}>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between border-b border-border bg-surface px-4 shrink-0 shadow-sm" style={{ zIndex: 10 }}>
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden text-slate-500 rounded-lg"
            style={{ padding: '12px', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>

          <span className="md:hidden font-extrabold font-display text-primary-500 text-base">
            Be Böld
          </span>

          <div className="flex items-center gap-4 ml-auto">
            <button className="p-2 text-slate-400">
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto w-full">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-8 h-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                <p className="text-sm font-medium">Conectando...</p>
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
