import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart2, Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, subMonths } from 'date-fns';
import { useAppContext } from '../context/AppContext';

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

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

  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 5), 'yyyy-MM'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM'));

  const toggleVariable = (id: string) => {
    setSelectedVariables(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  // Rango de meses entre startDate y endDate
  const monthRange = useMemo(() => {
    const result: string[] = [];
    const [startY, startM] = startDate.split('-').map(Number);
    const [endY, endM] = endDate.split('-').map(Number);
    let y = startY, m = startM;
    while (y < endY || (y === endY && m <= endM)) {
      result.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) { m = 1; y++; }
      if (result.length > 24) break;
    }
    return result;
  }, [startDate, endDate]);

  // Ingresos y gastos del período seleccionado
  const periodIncomes = useMemo(() =>
    incomes.filter(i => monthRange.some(p => i.date.startsWith(p))),
    [incomes, monthRange]
  );
  const periodExpenses = useMemo(() =>
    expenses.filter(e => monthRange.some(p => e.date.startsWith(p))),
    [expenses, monthRange]
  );

  // Datos para el gráfico general
  const chartData = useMemo(() => {
    return monthRange.map(pref => {
      const ing = incomes.filter(x => x.date.startsWith(pref)).reduce((a, x) => a + x.amount, 0);
      const gst = expenses.filter(x => x.date.startsWith(pref)).reduce((a, x) => a + x.amount, 0);
      const [, m] = pref.split('-').map(Number);
      return { month: MESES[m - 1], ingresos: ing, egresos: gst, honorarios: ing - gst, gastos: gst };
    });
  }, [incomes, expenses, monthRange]);

  // Rentabilidad por cliente
  const clientProfitability = useMemo(() => {
    const totalIngresos = periodIncomes.reduce((a, i) => a + i.amount, 0);
    const totalGastos   = periodExpenses.reduce((a, e) => a + e.amount, 0);

    return clients.map(c => {
      // Ingresos cobrados de este cliente en el período
      const ingresos = periodIncomes
        .filter(i => i.client === c.name)
        .reduce((a, i) => a + i.amount, 0);

      // Costo equipo: fees asignados a este cliente
      const costoEquipo = (c.team || []).reduce((a, t) => {
        if (t.feeType === 'Fixed') return a + t.feeAmount;
        if (t.feeType === 'Percentage') return a + (c.amount * t.feeAmount / 100);
        if (t.feeType === 'One-Time') return a + t.feeAmount;
        return a;
      }, 0);

      // Gastos generales proporcionales al peso del cliente en los ingresos totales
      const pesoCliente = totalIngresos > 0 ? ingresos / totalIngresos : 0;
      const gastosAsignados = Math.round(totalGastos * pesoCliente);

      const costoTotal = costoEquipo + gastosAsignados;
      const neto = ingresos - costoTotal;
      const margen = ingresos > 0 ? Math.round((neto / ingresos) * 100) : null;

      return { client: c, ingresos, costoEquipo, gastosAsignados, costoTotal, neto, margen };
    }).sort((a, b) => (b.margen ?? -999) - (a.margen ?? -999));
  }, [clients, periodIncomes, periodExpenses]);

  // Margen general del período
  const margenGeneral = useMemo(() => {
    const ing = periodIncomes.reduce((a, i) => a + i.amount, 0);
    const gst = periodExpenses.reduce((a, e) => a + e.amount, 0);
    const neto = ing - gst;
    return { ing, gst, neto, margen: ing > 0 ? Math.round((neto / ing) * 100) : 0 };
  }, [periodIncomes, periodExpenses]);

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
        {[
          { id: 'general', label: 'Análisis Global' },
          { id: 'clients', label: 'Rentabilidad por Cliente' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("pb-3 text-sm font-bold border-b-2 transition-colors",
              activeTab === tab.id ? "border-primary-500 text-primary-600" : "border-transparent text-slate-400 hover:text-text-main"
            )}>
            {tab.label}
          </button>
        ))}
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
        /* Vista rentabilidad por cliente */
        <div className="flex flex-col gap-6 animate-in fade-in">

          {/* KPI general del período */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Ingresos período', value: fmt(margenGeneral.ing), color: 'text-emerald-600' },
              { label: 'Gastos período', value: fmt(margenGeneral.gst), color: 'text-red-500' },
              { label: 'Neto período', value: fmt(margenGeneral.neto), color: margenGeneral.neto >= 0 ? 'text-emerald-600' : 'text-red-500' },
              { label: 'Margen general', value: `${margenGeneral.margen}%`, color: margenGeneral.margen >= 40 ? 'text-emerald-600' : margenGeneral.margen >= 20 ? 'text-amber-500' : 'text-red-500' },
            ].map(k => (
              <div key={k.label} className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">{k.label}</p>
                <p className={cn("text-xl font-extrabold font-display", k.color)}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Nota metodológica */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Los gastos generales se distribuyen proporcionalmente según el peso de cada cliente en los ingresos totales del período. Los clientes sin ingresos registrados no absorben gastos.</span>
          </div>

          {/* Tabla de rentabilidad */}
          <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold text-text-main">Rentabilidad por cliente — {MESES_FULL[Number(startDate.split('-')[1]) - 1]} {startDate.split('-')[0]} a {MESES_FULL[Number(endDate.split('-')[1]) - 1]} {endDate.split('-')[0]}</h2>
              <p className="text-xs text-text-muted mt-0.5">Ordenado de mayor a menor margen. Verde ≥ 40% · Amarillo ≥ 20% · Rojo &lt; 20%</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-border">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Ingresos</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Costo equipo</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Gastos asignados</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Neto</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">Margen</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">vs General</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clientProfitability.map(({ client, ingresos, costoEquipo, gastosAsignados, neto, margen }) => {
                    const diff = margen !== null ? margen - margenGeneral.margen : null;
                    const margenColor = margen === null ? 'text-slate-400' :
                      margen >= 40 ? 'text-emerald-600' :
                      margen >= 20 ? 'text-amber-600' : 'text-red-500';
                    const margenBg = margen === null ? 'bg-slate-50' :
                      margen >= 40 ? 'bg-emerald-50 border-emerald-100' :
                      margen >= 20 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';

                    return (
                      <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-text-main text-sm">{client.name}</p>
                            <p className="text-xs text-text-muted">{client.responsible} · {client.currency}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-text-main">
                          {ingresos > 0 ? fmt(ingresos) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-red-500">
                          {costoEquipo > 0 ? fmt(costoEquipo) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-orange-500">
                          {gastosAsignados > 0 ? fmt(gastosAsignados) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold">
                          <span className={neto >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                            {ingresos > 0 ? fmt(neto) : <span className="text-slate-300">—</span>}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {margen !== null ? (
                            <span className={cn("inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold border", margenBg, margenColor)}>
                              {margen}%
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">sin datos</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {diff !== null && ingresos > 0 ? (
                            <span className={cn("inline-flex items-center gap-1 text-xs font-semibold",
                              diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-slate-400'
                            )}>
                              {diff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : diff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                              {diff > 0 ? '+' : ''}{diff}pp
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Fila de totales */}
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-border">
                    <td className="px-6 py-4 text-sm font-bold text-text-main">TOTAL</td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">{fmt(margenGeneral.ing)}</td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-red-500">
                      {fmt(clientProfitability.reduce((a, c) => a + c.costoEquipo, 0))}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-orange-500">{fmt(margenGeneral.gst)}</td>
                    <td className="px-6 py-4 text-right text-sm font-bold">
                      <span className={margenGeneral.neto >= 0 ? 'text-emerald-600' : 'text-red-500'}>{fmt(margenGeneral.neto)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("inline-flex px-3 py-1 rounded-full text-sm font-bold border",
                        margenGeneral.margen >= 40 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                        margenGeneral.margen >= 20 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-red-50 border-red-100 text-red-500'
                      )}>
                        {margenGeneral.margen}%
                      </span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
