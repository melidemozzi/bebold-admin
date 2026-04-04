import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { BarChart2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, subMonths } from 'date-fns';
import { useAppContext } from '../context/AppContext';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function MonthRangePicker({ startDate, endDate, onStartChange, onEndChange }: {
  startDate: string; endDate: string;
  onStartChange: (v: string) => void; onEndChange: (v: string) => void;
}) {
  function parseYM(s: string) { const [y, m] = s.split('-').map(Number); return { y, m }; }
  function toStr(y: number, m: number) { return `${y}-${String(m).padStart(2, '0')}`; }

  const start = parseYM(startDate);
  const end = parseYM(endDate);

  function moveStart(delta: number) {
    let { y, m } = start;
    m += delta;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    const next = toStr(y, m);
    if (next <= endDate) onStartChange(next);
  }
  function moveEnd(delta: number) {
    let { y, m } = end;
    m += delta;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    const next = toStr(y, m);
    if (next >= startDate) onEndChange(next);
  }

  return (
    <div className="flex items-center gap-2 bg-white p-2 border border-border shadow-sm rounded-xl">
      <Calendar className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
      <button onClick={() => moveStart(-1)} className="p-0.5 text-slate-400 hover:text-primary-500 rounded transition-colors"><ChevronLeft className="w-4 h-4" /></button>
      <span className="text-sm font-semibold text-text-main min-w-[110px] text-center">{MESES_FULL[start.m - 1]} {start.y}</span>
      <button onClick={() => moveStart(1)} className="p-0.5 text-slate-400 hover:text-primary-500 rounded transition-colors"><ChevronRight className="w-4 h-4" /></button>
      <span className="text-slate-300 font-bold px-1">—</span>
      <button onClick={() => moveEnd(-1)} className="p-0.5 text-slate-400 hover:text-primary-500 rounded transition-colors"><ChevronLeft className="w-4 h-4" /></button>
      <span className="text-sm font-semibold text-text-main min-w-[110px] text-center">{MESES_FULL[end.m - 1]} {end.y}</span>
      <button onClick={() => moveEnd(1)} className="p-0.5 text-slate-400 hover:text-primary-500 rounded transition-colors"><ChevronRight className="w-4 h-4" /></button>
    </div>
  );
}

const variables = [
  { id: 'ingresos', label: 'Ingresos Totales', color: '#d946ef' },
  { id: 'egresos', label: 'Egresos Totales', color: '#fbcfe8' },
  { id: 'honorarios', label: 'Neto (Ing - Gas)', color: '#8b5cf6' },
  { id: 'gastos', label: 'Gastos Operativos', color: '#f59e0b' },
];

export default function Reports() {
  const { incomes, expenses, clients } = useAppContext();
  const [selectedVariables, setSelectedVariables] = useState(['ingresos', 'egresos', 'honorarios']);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedClient, setSelectedClient] = useState('all');

  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 5), 'yyyy-MM'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM'));

  const toggleVariable = (id: string) => {
    setSelectedVariables(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  // Generar rango de meses entre startDate y endDate
  const monthRange = useMemo(() => {
    const result: string[] = [];
    const [startY, startM] = startDate.split('-').map(Number);
    const [endY, endM] = endDate.split('-').map(Number);
    let y = startY, m = startM;
    while (y < endY || (y === endY && m <= endM)) {
      result.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) { m = 1; y++; }
      if (result.length > 24) break; // máximo 2 años
    }
    return result;
  }, [startDate, endDate]);

  // Datos reales para el gráfico general
  const chartData = useMemo(() => {
    return monthRange.map(pref => {
      const ing = incomes.filter(x => x.date.startsWith(pref)).reduce((a, x) => a + x.amount, 0);
      const gst = expenses.filter(x => x.date.startsWith(pref)).reduce((a, x) => a + x.amount, 0);
      const [, m] = pref.split('-').map(Number);
      return {
        month: MESES[m - 1],
        ingresos: ing,
        egresos: gst,
        honorarios: ing - gst,
        gastos: gst,
      };
    });
  }, [incomes, expenses, monthRange]);

  // Datos por cliente para la pestaña de rendimiento
  const clientChartData = useMemo(() => {
    const filtered = selectedClient === 'all' ? clients : clients.filter(c => String(c.id) === selectedClient);
    return filtered.map(c => {
      const totalCobrado = incomes.filter(i => i.client === c.name).reduce((a, x) => a + x.amount, 0);
      return {
        name: c.name,
        Facturado: c.amount,
        Cobrado: totalCobrado,
      };
    });
  }, [clients, incomes, selectedClient]);

  // Métricas de rentabilidad por cliente seleccionado
  const clientMetrics = useMemo(() => {
    const filtered = selectedClient === 'all' ? clients : clients.filter(c => String(c.id) === selectedClient);
    return filtered.map(c => {
      const cobrado = incomes.filter(i => i.client === c.name).reduce((a, x) => a + x.amount, 0);
      const costoEquipo = (c.team || []).reduce((a, t) => {
        if (t.feeType === 'Fixed') return a + t.feeAmount;
        if (t.feeType === 'Percentage') return a + (c.amount * t.feeAmount / 100);
        return a;
      }, 0);
      const margen = cobrado > 0 ? Math.round(((cobrado - costoEquipo) / cobrado) * 100) : 0;
      return { name: c.name, cobrado, costoEquipo, margen };
    });
  }, [clients, incomes, selectedClient]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main font-display flex items-center gap-2">
            <BarChart2 className="text-primary-500" /> Informes y Analíticas
          </h1>
          <p className="text-text-muted mt-1 text-sm">Compará métricas financieras a lo largo del tiempo.</p>
        </div>

        <MonthRangePicker startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border px-2">
        <button
          onClick={() => setActiveTab('general')}
          className={cn("pb-3 text-sm font-bold border-b-2 transition-colors", activeTab === 'general' ? "border-primary-500 text-primary-600" : "border-transparent text-slate-400 hover:text-text-main")}
        >
          Análisis Global
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={cn("pb-3 text-sm font-bold border-b-2 transition-colors", activeTab === 'clients' ? "border-primary-500 text-primary-600" : "border-transparent text-slate-400 hover:text-text-main")}
        >
          Rendimiento por Cliente
        </button>
      </div>

      {activeTab === 'general' ? (
        <>
          {/* Control de variables */}
          <div className="card p-5 border-transparent shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4">Variables a Comparar</h3>
            <div className="flex flex-wrap gap-3">
              {variables.map((v) => {
                const isActive = selectedVariables.includes(v.id);
                return (
                  <button
                    key={v.id}
                    onClick={() => toggleVariable(v.id)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border-2 flex items-center gap-2",
                      isActive ? "bg-slate-50 border-transparent shadow-sm text-slate-800" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: isActive ? v.color : '#cbd5e1' }} />
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gráfico principal */}
          <div className="card p-6 border-transparent shadow-sm h-[450px]">
            <h2 className="text-lg font-bold text-text-main mb-6">Comparativa Temporal Global</h2>
            {chartData.every(d => d.ingresos === 0 && d.egresos === 0) ? (
              <div className="flex items-center justify-center h-[350px] text-slate-400 flex-col gap-2">
                <BarChart2 className="w-10 h-10 text-slate-200" />
                <p>Sin datos para el período seleccionado.</p>
                <p className="text-xs">Cargá ingresos o gastos en los módulos correspondientes.</p>
              </div>
            ) : (
              <ResponsiveContainer key={startDate + endDate} width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    {variables.map(v => (
                      <linearGradient key={v.id} id={`color_${v.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={v.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={v.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `$${val / 1000}k`} />
                  <Tooltip
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val) => [`$${Number(val).toLocaleString()}`]}
                  />
                  {variables.filter(v => selectedVariables.includes(v.id)).map(v => (
                    <Area
                      key={v.id}
                      type="monotone"
                      dataKey={v.id}
                      stroke={v.color}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill={`url(#color_${v.id})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      ) : (
        /* Vista por cliente */
        <div className="flex flex-col gap-6 animate-in fade-in">
          <div className="card p-6 border-transparent shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-text-main">Analítica de Rentabilidad por Cliente</h2>
              <p className="text-sm text-text-muted mt-1">Facturado vs cobrado real y margen estimado.</p>
            </div>
            <select
              className="bg-white border text-sm font-medium border-border shadow-sm rounded-lg px-4 py-2 min-w-[200px]"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="all">Todos los clientes</option>
              {clients.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gráfico facturado vs cobrado */}
            <div className="card p-6 border-transparent shadow-sm h-[350px]">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Facturado vs Cobrado (ARS)</h3>
              {clientChartData.length === 0 ? (
                <div className="flex items-center justify-center h-[250px] text-slate-400">Sin clientes.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientChartData} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-20} textAnchor="end" dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val) => [`$${Number(val).toLocaleString()}`]}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Bar dataKey="Facturado" fill="#d946ef" radius={[4, 4, 0, 0]} barSize={28} />
                    <Bar dataKey="Cobrado" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Tabla de rentabilidad */}
            <div className="card p-6 border-transparent shadow-sm h-[350px] overflow-y-auto">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Margen Estimado por Cliente</h3>
              {clientMetrics.length === 0 ? (
                <div className="flex items-center justify-center h-[250px] text-slate-400">Sin datos.</div>
              ) : (
                <div className="space-y-4">
                  {clientMetrics.map(m => (
                    <div key={m.name} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-slate-800 text-sm">{m.name}</span>
                        <span className={cn(
                          "text-sm font-bold px-2 py-0.5 rounded-full",
                          m.margen >= 50 ? "bg-emerald-50 text-emerald-600" :
                          m.margen >= 20 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"
                        )}>
                          {m.margen}% margen
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Cobrado: <strong className="text-slate-700">${m.cobrado.toLocaleString()}</strong></span>
                        <span>Costo equipo: <strong className="text-slate-700">${m.costoEquipo.toLocaleString()}</strong></span>
                      </div>
                      <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", m.margen >= 50 ? "bg-emerald-400" : m.margen >= 20 ? "bg-amber-400" : "bg-red-400")}
                          style={{ width: `${Math.max(0, Math.min(100, m.margen))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
