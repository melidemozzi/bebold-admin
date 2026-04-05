import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, TrendingUp, CreditCard, UserCircle, PieChart, UsersRound, Receipt, LogOut, Landmark } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Informes', href: '/reports', icon: PieChart },
  { name: 'Facturación', href: '/billing', icon: Receipt },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Equipo', href: '/team', icon: UsersRound },
  { name: 'Ingresos', href: '/incomes', icon: TrendingUp },
  { name: 'Gastos', href: '/expenses', icon: CreditCard },
  { name: 'Sueldos', href: '/salaries', icon: UserCircle },
  { name: 'Caja', href: '/caja', icon: Landmark },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-full w-64 flex-col bg-surface border-r border-border shadow-sm z-10">
      <div className="flex h-20 shrink-0 items-center px-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shadow-md shadow-primary-500/30">
            <span className="text-white font-black text-base font-display leading-none">B</span>
          </div>
          <h1 className="text-lg font-extrabold tracking-tight text-text-main font-display">
            Be <span className="text-primary-500">Böld</span>
          </h1>
        </div>
      </div>
      
      <div className="px-4 py-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Main Menu</p>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-3">
        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  isActive
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                    : 'text-text-muted hover:bg-primary-50 hover:text-primary-600',
                  'group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200'
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary-500',
                    'mr-3 flex-shrink-0 h-5 w-5 transition-colors'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 mt-auto border-t border-border">
        <div className="flex items-center gap-3 p-2 rounded-xl">
          <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-sm shadow-sm shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="text-sm overflow-hidden flex-1 min-w-0">
            <p className="font-semibold text-text-main truncate text-xs">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            title="Cerrar sesión"
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
