import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, DollarSign, Wallet2, Calendar, TrendingDown, FileSpreadsheet, Download } from 'lucide-react';
import { cn, fmt } from '../lib/utils';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { exportMonthlyExcel, downloadTemplate } from '../lib/excelExport';

// Nombres de meses en español
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function Dashboard() {
  const { incomes, expenses, clients, collaborators } = useAppContext();
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

  // Costo real del equipo: fijos por baseSalary, variables por comisiones asignadas en clientes
  const costoEquipo = useMemo(() => collaborators.reduce((total, collab) => {
    if (collab.baseSalary > 0) return total + collab.baseSalary;
    return total + clients.reduce((sum, client) => {
      const m = client.team?.find(t => t.collaboratorName === collab.name);
      if (!m) return sum;
      if (m.feeType === 'Percentage' && m.feeAmount > 0) return sum + (client.amount * m.feeAmount) / 100;
      if (m.feeType === 'One-Time' && m.feeAmount > 0) return sum + m.feeAmount;
      return sum;
    }, 0);
  }, 0), [collaborators, clients]);
  const liquidezReal      = totalCobrado - totalGastos - costoEquipo;
  const resultadoEsperado = totalVentas  - totalGastos - costoEquipo;
  const ganancia  = resultadoEsperado;
  const reserva   = ganancia > 0 ? ganancia * 0.20 : 0;
  const paraSocias = ganancia > 0 ? ganancia * 0.80 : 0;

  const porcentajeCobrado = totalVentas > 0 ? Math.round((totalCobrado / totalVentas) * 100) : 0;
  const porcentajePendiente = 100 - porcentajeCobrado;

  // Datos del gráfico: últimos 6 meses
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(añoActual, mesActual - (5 - i), 1);
      const pref = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const facturacion = incomes.filter(x => x.date.startsWith(pref)).reduce((a, x) => a + x.amount, 0);
      const gst = expenses.filter(x => x.date.startsWith(pref)).reduce((a, x) => a + x.amount, 0);
      const gan = facturacion - gst - costoEquipo;
      return {
        month: MESES[d.getMonth()],
        'Facturación': facturacion,
        'Ganancia': Math.max(0, gan),
        'Reserva': gan > 0 ? Math.round(gan * 0.20) : 0,
      };
    });
  }, [incomes, expenses, mesActual, añoActual, costoEquipo]);

  const metrics = [
    {
      name: 'Ingresos Registrados', value: `$${fmt(totalVentas)}`,
      change: `${porcentajeCobrado}% cobrado`, isPositive: true,
      icon: DollarSign, color: 'text-primary-500', bg: 'bg-primary-50'
    },
    {
      name: 'Gastos + Equipo', value: `$${fmt(totalGastos + costoEquipo)}`,
      change: `gastos + ${collaborators.length} colab.`, isPositive: false,
      icon: Wallet2, color: 'text-orange-500', bg: 'bg-orange-50'
    },
    {
      name: 'Resultado Esperado', value: `$${fmt(resultadoEsperado)}`,
      change: 'si se cobra todo', isPositive: resultadoEsperado >= 0,
      icon: resultadoEsperado >= 0 ? ArrowUpRight : TrendingDown,
      color: resultadoEsperado >= 0 ? 'text-emerald-500' : 'text-red-500',
      bg: resultadoEsperado >= 0 ? 'bg-emerald-50' : 'bg-red-50'
    },
    {
      name: 'Liquidez Real', value: `$${fmt(liquidezReal)}`,
      change: 'cobrado − gastos − equipo', isPositive: liquidezReal >= 0,
      icon: liquidezReal >= 0 ? ArrowUpRight : TrendingDown,
      color: liquidezReal >= 0 ? 'text-blue-500' : 'text-red-500',
      bg: liquidezReal >= 0 ? 'bg-blue-50' : 'bg-red-50'
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportMonthlyExcel(prefijo, ingresosMes, gastosMes, collaborators)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-white text-slate-600 hover:border-primary-300 hover:text-primary-600 transition-all shadow-sm"
            title="Descargar Excel del mes"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar mes
          </button>
          <button
            onClick={() => downloadTemplate()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-white text-slate-600 hover:border-primary-300 hover:text-primary-600 transition-all shadow-sm"
            title="Descargar template para carga"
          >
            <Download className="w-4 h-4" /> Template
          </button>
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

      {/* Distribución de Ganancia */}
      {ganancia !== 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Distribución de ganancia del período</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5 border-l-4 border-l-violet-400 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Ganancia Neta</p>
              <p className={cn('text-2xl font-bold', ganancia >= 0 ? 'text-violet-600' : 'text-red-600')}>${fmt(ganancia)}</p>
              <p className="text-xs text-slate-400 mt-1">ingresos − gastos − equipo</p>
            </div>
            <div className="card p-5 border-l-4 border-l-amber-400 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Reserva (20%)</p>
              <p className="text-2xl font-bold text-amber-600">${fmt(reserva)}</p>
              <p className="text-xs text-slate-400 mt-1">fondo de reserva</p>
            </div>
            <div className="card p-5 border-l-4 border-l-primary-400 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Para Socias (80%)</p>
              <p className="text-2xl font-bold text-primary-600">${fmt(paraSocias)}</p>
              <p className="text-xs text-slate-400 mt-1">distribución disponible</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        {/* Gráfico */}
        <div className="lg:col-span-2 card p-6 shadow-sm border-transparent">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text-main">Evolución mensual</h2>
            <button
              onClick={() => navigate('/reports')}
              className="text-sm font-medium text-primary-500 hover:text-primary-600"
            >
              Ver reporte completo
            </button>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#d946ef' }} /> Facturación
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#10b981' }} /> Ganancia
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#f59e0b' }} /> Reserva
            </span>
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
                <Bar dataKey="Facturación" fill="#d946ef" radius={[6, 6, 0, 0]} barSize={22} />
                <Bar dataKey="Ganancia" fill="#10b981" radius={[6, 6, 0, 0]} barSize={22} />
                <Bar dataKey="Reserva" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={22} />
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

          <div className="mt-auto bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm text-slate-500">
            {totalVentas > 0
              ? <><span className="font-semibold text-slate-700">{clientesActivos} cliente{clientesActivos !== 1 ? 's' : ''} activo{clientesActivos !== 1 ? 's' : ''}</span> · {porcentajeCobrado}% cobrado del total registrado</>
              : 'Sin ingresos registrados para este período.'
            }
          </div>
        </div>
      </div>
    </div>
  );
}
