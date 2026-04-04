import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, DollarSign, Wallet2, CheckCircle2, Calendar, TrendingDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

// Nombres de meses en español
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function Dashboard() {
  const { incomes, expenses, clients } = useAppContext();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const mesActual = currentDate.getMonth();
  const añoActual = currentDate.getFullYear();
  const prefijo = `${añoActual}-${String(mesActual + 1).padStart(2, '0')}`;

  // KPIs del mes seleccionado
  const ingresosMes = useMemo(
    () => incomes.filter(i => i.date.startsWith(prefijo)),
    [incomes, prefijo]
  );
  const gastosMes = useMemo(
    () => expenses.filter(e => e.date.startsWith(prefijo)),
    [expenses, prefijo]
  );

  const totalVentas = ingresosMes.reduce((acc, i) => acc + i.amount, 0);
  const totalCobrado = ingresosMes.filter(i => i.status === 'Cobrado').reduce((acc, i) => acc + i.amount, 0);
  const totalGastos = gastosMes.reduce((acc, e) => acc + e.amount, 0);
  const ingresoNeto = totalCobrado - totalGastos;

  const porcentajeCobrado = totalVentas > 0 ? Math.round((totalCobrado / totalVentas) * 100) : 0;
  const porcentajePendiente = 100 - porcentajeCobrado;

  // Datos del gráfico: últimos 6 meses
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(añoActual, mesActual - (5 - i), 1);
      const pref = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const ing = incomes.filter(x => x.date.startsWith(pref)).reduce((a, x) => a + x.amount, 0);
      const gst = expenses.filter(x => x.date.startsWith(pref)).reduce((a, x) => a + x.amount, 0);
      return { month: MESES[d.getMonth()], Ingresos: ing, Gastos: gst };
    });
  }, [incomes, expenses, mesActual, añoActual]);

  const metrics = [
    {
      name: 'Ingresos Registrados', value: `$${totalVentas.toLocaleString()}`,
      change: totalVentas > 0 ? '+activo' : '—', isPositive: true,
      icon: DollarSign, color: 'text-primary-500', bg: 'bg-primary-50'
    },
    {
      name: 'Efectivamente Cobrado', value: `$${totalCobrado.toLocaleString()}`,
      change: `${porcentajeCobrado}%`, isPositive: porcentajeCobrado >= 70,
      icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50'
    },
    {
      name: 'Gastos del Mes', value: `$${totalGastos.toLocaleString()}`,
      change: totalGastos > 0 ? '—' : 'Sin gastos', isPositive: false,
      icon: Wallet2, color: 'text-orange-500', bg: 'bg-orange-50'
    },
    {
      name: 'Ingreso Neto', value: `$${ingresoNeto.toLocaleString()}`,
      change: ingresoNeto >= 0 ? 'positivo' : 'negativo', isPositive: ingresoNeto >= 0,
      icon: ingresoNeto >= 0 ? ArrowUpRight : TrendingDown,
      color: ingresoNeto >= 0 ? 'text-blue-500' : 'text-red-500',
      bg: ingresoNeto >= 0 ? 'bg-blue-50' : 'bg-red-50'
    },
  ];

  // Clientes activos del mes
  const clientesActivos = clients.filter(c => c.status === 'activo').length;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header & Date Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main font-display">Dashboard General</h1>
          <p className="text-text-muted mt-1 text-sm">
            Resumen financiero de Be Böld Studio · {clientesActivos} cliente{clientesActivos !== 1 ? 's' : ''} activo{clientesActivos !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 border border-border shadow-sm rounded-xl">
          <Calendar className="w-5 h-5 text-slate-400 ml-1" />
          <select
            className="bg-transparent text-sm font-semibold text-text-main focus:outline-none cursor-pointer capitalize"
            value={currentDate.getMonth()}
            onChange={(e) => setCurrentDate(new Date(currentDate.getFullYear(), parseInt(e.target.value), 1))}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {new Date(2000, i).toLocaleString('es-ES', { month: 'long' })}
              </option>
            ))}
          </select>
          <span className="text-slate-300">/</span>
          <select
            className="bg-transparent text-sm font-semibold text-text-main focus:outline-none cursor-pointer"
            value={currentDate.getFullYear()}
            onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), currentDate.getMonth(), 1))}
          >
            {Array.from({ length: new Date().getFullYear() - 2023 + 2 }).map((_, i) => {
              const year = 2023 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((metric) => (
          <div key={metric.name} className="card p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2.5 rounded-xl", metric.bg)}>
                <metric.icon className={cn("h-5 w-5", metric.color)} />
              </div>
              <span className={cn(
                "text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1",
                metric.isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}>
                {metric.change}
              </span>
            </div>
            <div>
              <p className="text-3xl font-bold text-text-main">{metric.value}</p>
              <p className="text-sm font-medium text-text-muted mt-1">{metric.name}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        {/* Gráfico */}
        <div className="lg:col-span-2 card p-6 shadow-sm border-transparent">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-text-main">Evolución de Ingresos y Gastos</h2>
            <button
              onClick={() => navigate('/reports')}
              className="text-sm font-medium text-primary-500 hover:text-primary-600"
            >
              Ver reporte completo
            </button>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val) => [`$${Number(val).toLocaleString()}`]}
                />
                <Bar dataKey="Ingresos" fill="#d946ef" radius={[6, 6, 0, 0]} barSize={32} />
                <Bar dataKey="Gastos" fill="#fbcfe8" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Estado mensual */}
        <div className="card p-6 flex flex-col border-transparent shadow-sm">
          <h2 className="text-lg font-bold text-text-main mb-6">Estado Mensual</h2>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-text-main">Cobrado</span>
                <span className="font-bold text-lg text-emerald-500">{porcentajeCobrado}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${porcentajeCobrado}%` }}
                />
              </div>
              <p className="text-xs text-text-muted mt-2">${totalCobrado.toLocaleString()} en banco</p>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-text-main">Pendiente</span>
                <span className="font-bold text-lg text-orange-400">{porcentajePendiente}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-orange-400 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${porcentajePendiente}%` }}
                />
              </div>
              <p className="text-xs text-text-muted mt-2">${(totalVentas - totalCobrado).toLocaleString()} a cobrar</p>
            </div>
          </div>

          <div className="mt-auto bg-primary-50 p-5 rounded-2xl border border-primary-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-500 rounded-lg text-white">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <span className="font-bold text-primary-900">Rentabilidad</span>
            </div>
            {totalCobrado > 0 ? (
              <p className="text-sm text-primary-700 leading-relaxed mt-2 font-medium">
                Margen bruto actual:{' '}
                <strong>{totalGastos > 0 ? Math.round(((totalCobrado - totalGastos) / totalCobrado) * 100) : 100}%</strong>.
                {' '}Ingreso neto del mes:{' '}
                <strong>${ingresoNeto.toLocaleString()}</strong>.
              </p>
            ) : (
              <p className="text-sm text-primary-700 leading-relaxed mt-2 font-medium">
                Sin ingresos registrados para este período.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
