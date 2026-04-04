import { useState, useMemo } from 'react';
import { Upload, Search, PlusCircle, Trash2, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import ExcelImporter from '../components/ExcelImporter';
import { useAppContext } from '../context/AppContext';
import type { Income } from '../context/AppContext';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function Incomes() {
  const { incomes, setIncomes, clients } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [editIncome, setEditIncome] = useState<Income | null>(null);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  function prevMonth() {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  }
  function nextMonth() {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  }

  const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const handleImport = (parsedData: any[], period: string) => {
    setIncomes(prev => [...prev, ...parsedData as any]);
    // Cambiar la vista al mes importado
    const [year, month] = period.split('-').map(Number);
    setSelectedYear(year);
    setSelectedMonth(month - 1);
  };

  const handleSave = () => {
    if (!editIncome || !editIncome.client.trim()) return;
    const isNew = !incomes.some(i => i.id === editIncome.id);
    if (isNew) setIncomes(prev => [...prev, editIncome]);
    else setIncomes(prev => prev.map(i => i.id === editIncome.id ? editIncome : i));
    setEditIncome(null);
  };

  const monthIncomes = useMemo(() =>
    incomes.filter(i => i.date.startsWith(monthPrefix)),
    [incomes, monthPrefix]
  );

  const currentTotal = monthIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalCobrado = monthIncomes.filter(i => i.status === 'Cobrado').reduce((acc, curr) => acc + curr.amount, 0);
  const filtered = monthIncomes.filter(i =>
    i.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main font-display">Libro de Ingresos</h1>
          <p className="text-text-muted mt-1 text-sm">Controla la facturación, cobros efectivos y señas mensuales.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Selector de mes */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-xl px-2 py-1.5 shadow-sm">
            <button onClick={prevMonth} className="p-1 text-slate-400 hover:text-primary-500 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-text-main px-2 min-w-[140px] text-center">
              {MESES[selectedMonth]} {selectedYear}
            </span>
            <button onClick={nextMonth} className="p-1 text-slate-400 hover:text-primary-500 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setIsImporterOpen(true)} className="btn-secondary flex items-center gap-2 text-sm shadow-sm">
            <Upload className="w-4 h-4" /> Importador Inteligente
          </button>
          <button
            onClick={() => setEditIncome({
              id: Date.now(),
              date: `${monthPrefix}-01`,
              client: '', type: 'Facturada', method: 'Transferencia', amount: 0, status: 'Cobrado'
            })}
            className="btn-primary flex items-center gap-2 text-sm shadow-md shadow-primary-500/20"
          >
            <PlusCircle className="w-4 h-4 text-white" /> Carga Manual
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6 border-l-4 border-l-emerald-500 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Registrado</p>
          <p className="text-3xl font-bold text-slate-800">${currentTotal.toLocaleString()} <span className="text-lg text-slate-400 font-normal">ARS</span></p>
        </div>
        <div className="card p-6 border-l-4 border-l-blue-500 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Efectivamente Cobrado</p>
          <p className="text-3xl font-bold text-slate-800">${totalCobrado.toLocaleString()} <span className="text-lg text-slate-400 font-normal">ARS</span></p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text" placeholder="Buscar por cliente o tipo..."
          className="input-field pl-9 bg-slate-50 border-transparent hover:border-slate-200"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className="card flex-1 overflow-hidden border-transparent shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-border text-slate-500 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Monto (ARS)</th>
                <th className="px-6 py-4">Tipo / Método</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-center rounded-tr-xl">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-white">
              {filtered.map((inc) => (
                <tr key={inc.id} className="hover:bg-primary-50/30 transition-colors">
                  <td className="px-6 py-4 text-slate-500">{inc.date}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{inc.client}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-600">${inc.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase",
                        inc.type === 'Facturada' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                      )}>{inc.type}</span>
                      <span className="text-xs text-slate-400">{inc.method}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold",
                      inc.status === 'Cobrado' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-500"
                    )}>{inc.status}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditIncome(inc)}
                        className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 transition-colors rounded-md"
                        title="Editar"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIncomes(prev => prev.filter(i => i.id !== inc.id))}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-md"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-10 text-center text-slate-400">
              Sin ingresos cargados. Usá el Importador o la Carga Manual.
            </div>
          )}
        </div>
      </div>

      <ExcelImporter isOpen={isImporterOpen} onClose={() => setIsImporterOpen(false)} onImport={handleImport} />

      {/* Modal Carga Manual / Edición */}
      {editIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl flex flex-col p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4">
              {!incomes.some(i => i.id === editIncome.id) ? 'Nuevo Ingreso' : 'Editar Ingreso'}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Cliente</label>
                <input
                  list="clients-list"
                  type="text"
                  className="input-field w-full"
                  value={editIncome.client}
                  onChange={e => setEditIncome({ ...editIncome, client: e.target.value })}
                  placeholder="Nombre del cliente"
                />
                <datalist id="clients-list">
                  {clients.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Monto (ARS)</label>
                <input type="number" className="input-field w-full" value={editIncome.amount || ''} onChange={e => setEditIncome({ ...editIncome, amount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Fecha</label>
                <input type="date" className="input-field w-full" value={editIncome.date} onChange={e => setEditIncome({ ...editIncome, date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Tipo</label>
                <select className="input-field w-full" value={editIncome.type} onChange={e => setEditIncome({ ...editIncome, type: e.target.value })}>
                  <option>Facturada</option>
                  <option>Seña</option>
                  <option>Sin facturar</option>
                  <option>Otro</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Método de Cobro</label>
                <select className="input-field w-full" value={editIncome.method} onChange={e => setEditIncome({ ...editIncome, method: e.target.value })}>
                  <option>Transferencia</option>
                  <option>Efectivo</option>
                  <option>Cheque</option>
                  <option>PayPal</option>
                  <option>Otro</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Estado</label>
                <select className="input-field w-full" value={editIncome.status} onChange={e => setEditIncome({ ...editIncome, status: e.target.value })}>
                  <option>Cobrado</option>
                  <option>Pendiente</option>
                  <option>Subido</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex justify-between items-center">
              {incomes.some(i => i.id === editIncome.id) ? (
                <button
                  onClick={() => { setIncomes(prev => prev.filter(i => i.id !== editIncome.id)); setEditIncome(null); }}
                  className="text-red-500 text-sm font-semibold hover:underline"
                >Eliminar</button>
              ) : <div />}
              <div className="flex gap-2">
                <button onClick={() => setEditIncome(null)} className="btn-secondary">Cancelar</button>
                <button onClick={handleSave} className="btn-primary">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
