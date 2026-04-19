import { useState, useMemo } from 'react';
import { Search, PlusCircle, Trash2, Pencil, ChevronLeft, ChevronRight, Upload, RefreshCw, Copy, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import ExcelImporter from '../components/ExcelImporter';
import { useAppContext, CAJA_ACCOUNTS } from '../context/AppContext';
import type { Income, CajaAccount } from '../context/AppContext';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function Incomes() {
  const { incomes, setIncomes, clients, setCajaEntries } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [editIncome, setEditIncome] = useState<Income | null>(null);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  // Modal confirmación Caja
  const [cajaModal, setCajaModal] = useState<{ income: Income } | null>(null);
  const [cajaAccount, setCajaAccount] = useState<CajaAccount>('Cuenta Meli');

  function prevMonth() {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  }
  function nextMonth() {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  }

  const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  // Traer clientes activos como ingresos del mes
  function traerClientesMes() {
    const activosConMonto = clients.filter(c => c.status === 'activo' && c.amount > 0);
    if (activosConMonto.length === 0) return;
    const yaExisten = incomes.filter(i => i.date.startsWith(monthPrefix)).map(i => i.client);
    const nuevos = activosConMonto
      .filter(c => !yaExisten.includes(c.name))
      .map((c, i) => ({
        id: Date.now() + i,
        date: `${monthPrefix}-01`,
        client: c.name,
        type: 'Facturada',
        method: 'Transferencia',
        amount: c.amount,
        status: 'Pendiente',
      }));
    if (nuevos.length === 0) return;
    setIncomes(prev => [...prev, ...nuevos as Income[]]);
  }

  // Replicar mes anterior
  function duplicarMesAnterior() {
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const prevPrefix = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
    const prevIncomes = incomes.filter(i => i.date.startsWith(prevPrefix));
    if (prevIncomes.length === 0) return;
    const yaExisten = incomes.filter(i => i.date.startsWith(monthPrefix)).map(i => i.client + i.type);
    const nuevos = prevIncomes
      .filter(i => !yaExisten.includes(i.client + i.type))
      .map(i => ({ ...i, id: Date.now() + Math.random() * 1000, date: `${monthPrefix}-01`, status: 'Pendiente' }));
    if (nuevos.length === 0) return;
    setIncomes(prev => [...prev, ...nuevos as Income[]]);
  }

  const handleImport = (parsedData: any[], period: string) => {
    if (parsedData.length === 0) return;
    setIncomes(prev => [...prev, ...parsedData as any]);
    const [year, month] = period.split('-').map(Number);
    setSelectedYear(year);
    setSelectedMonth(month - 1);
  };

  const handleSave = () => {
    if (!editIncome || !editIncome.client.trim()) return;
    const isNew = !incomes.some(i => i.id === editIncome.id);
    const prevStatus = isNew ? null : incomes.find(i => i.id === editIncome.id)?.status;

    if (isNew) setIncomes(prev => [...prev, editIncome]);
    else setIncomes(prev => prev.map(i => i.id === editIncome.id ? editIncome : i));

    // Proponer registrar en Caja si se marca como Cobrado
    if (editIncome.status === 'Cobrado' && (isNew || prevStatus !== 'Cobrado')) {
      setCajaModal({ income: editIncome });
    }
    setEditIncome(null);
  };

  function confirmCaja() {
    if (!cajaModal) return;
    setCajaEntries(prev => [...prev, {
      id: Date.now(),
      date: cajaModal.income.date,
      account: cajaAccount,
      type: 'entrada',
      amount: cajaModal.income.amount,
      desc: `Cobro ${cajaModal.income.client}`,
    }]);
    setCajaModal(null);
  }

  // Ingresos del mes seleccionado
  const monthIncomes = useMemo(() =>
    incomes.filter(i => i.date.startsWith(monthPrefix)).sort((a, b) => a.client.localeCompare(b.client)),
    [incomes, monthPrefix]
  );

  // Carry-over: pendientes de meses anteriores
  const pendingCarryover = useMemo(() =>
    incomes
      .filter(i => !i.date.startsWith(monthPrefix) && i.date < monthPrefix && i.status === 'Pendiente')
      .sort((a, b) => a.date.localeCompare(b.date)),
    [incomes, monthPrefix]
  );

  const currentTotal = monthIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalCobrado = monthIncomes.filter(i => i.status === 'Cobrado').reduce((acc, curr) => acc + curr.amount, 0);
  const filtered = monthIncomes.filter(i =>
    i.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.type.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredCarryover = pendingCarryover.filter(i =>
    i.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main font-display">Libro de Ingresos</h1>
          <p className="text-text-muted mt-1 text-sm">Facturación, cobros y señas mensuales.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <button onClick={duplicarMesAnterior}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-muted hover:border-primary-300 hover:text-primary-600 transition-all"
            title="Replicar ingresos del mes anterior como pendientes">
            <Copy className="w-4 h-4" /> Replicar mes anterior
          </button>
          <button onClick={traerClientesMes}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-muted hover:border-primary-300 hover:text-primary-600 transition-all"
            title="Traer clientes activos como ingresos del mes">
            <RefreshCw className="w-4 h-4" /> Traer clientes
          </button>
          <button onClick={() => setIsImporterOpen(true)} className="btn-secondary flex items-center gap-2 text-sm shadow-sm">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button
            onClick={() => setEditIncome({ id: Date.now(), date: `${monthPrefix}-01`, client: '', type: 'Facturada', method: 'Transferencia', amount: 0, status: 'Cobrado' })}
            className="btn-primary flex items-center gap-2 text-sm shadow-md shadow-primary-500/20">
            <PlusCircle className="w-4 h-4 text-white" /> Nuevo
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5 border-l-4 border-l-emerald-500 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Registrado</p>
          <p className="text-2xl font-bold text-slate-800">${currentTotal.toLocaleString()}</p>
        </div>
        <div className="card p-5 border-l-4 border-l-blue-500 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Efectivamente Cobrado</p>
          <p className="text-2xl font-bold text-slate-800">${totalCobrado.toLocaleString()}</p>
        </div>
      </div>

      {/* Pendientes de meses anteriores */}
      {filteredCarryover.length > 0 && (
        <div className="card border-l-4 border-l-orange-400 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border-b border-orange-100">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">
              {filteredCarryover.length} cobro{filteredCarryover.length !== 1 ? 's' : ''} pendiente{filteredCarryover.length !== 1 ? 's' : ''} de meses anteriores
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-orange-50 bg-orange-50/30">
                {filteredCarryover.map(inc => (
                  <tr key={inc.id} className="hover:bg-orange-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{inc.date}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-700">{inc.client}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-orange-600 text-right whitespace-nowrap">${inc.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-600">Pendiente</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setEditIncome(inc)}
                          className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setIncomes(prev => prev.filter(i => i.id !== inc.id))}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Buscar por cliente o tipo..."
          className="input-field pl-9 bg-slate-50 border-transparent hover:border-slate-200"
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* Tabla */}
      <div className="card flex-1 overflow-hidden border-transparent shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-border text-slate-500 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3">Tipo / Método</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-white">
              {filtered.map(inc => (
                <tr key={inc.id} className="hover:bg-primary-50/30 transition-colors">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{inc.date}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{inc.client}</p>
                    {inc.notes && <p className="text-xs text-slate-400 mt-0.5">{inc.notes}</p>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 text-right whitespace-nowrap">${inc.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-bold uppercase",
                        inc.type === 'Facturada' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                      )}>{inc.type}</span>
                      <span className="text-xs text-slate-400">{inc.method}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold",
                      inc.status === 'Cobrado' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-500"
                    )}>{inc.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditIncome(inc)}
                        className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setIncomes(prev => prev.filter(i => i.id !== inc.id))}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-10 text-center text-slate-400 text-sm">
              Sin ingresos en {MESES[selectedMonth]} {selectedYear}.
            </div>
          )}
        </div>
      </div>

      <ExcelImporter isOpen={isImporterOpen} onClose={() => setIsImporterOpen(false)} onImport={handleImport} />

      {/* Modal Caja automática */}
      {cajaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-slate-800 mb-1">¿Registrar en Caja?</h2>
            <p className="text-sm text-slate-500 mb-4">
              Cobro de <strong>{cajaModal.income.client}</strong> por <strong>${cajaModal.income.amount.toLocaleString()}</strong>
            </p>
            <div className="mb-5">
              <label className="text-sm font-semibold text-slate-600 mb-1 block">¿En qué cuenta entró?</label>
              <select className="input-field w-full" value={cajaAccount} onChange={e => setCajaAccount(e.target.value as CajaAccount)}>
                {CAJA_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCajaModal(null)} className="btn-secondary flex-1">No registrar</button>
              <button onClick={confirmCaja} className="btn-primary flex-1">Sí, registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar/nuevo ingreso */}
      {editIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl flex flex-col p-6">
            <h2 className="text-xl font-bold mb-4">
              {!incomes.some(i => i.id === editIncome.id) ? 'Nuevo Ingreso' : 'Editar Ingreso'}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Cliente</label>
                <input list="clients-list" type="text" className="input-field w-full"
                  value={editIncome.client}
                  onChange={e => setEditIncome({ ...editIncome, client: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="Nombre del cliente" />
                <datalist id="clients-list">
                  {clients.sort((a,b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Monto (ARS)</label>
                <input type="number" className="input-field w-full"
                  value={editIncome.amount === 0 ? '' : editIncome.amount}
                  onChange={e => setEditIncome({ ...editIncome, amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                  onKeyDown={e => e.key === 'Enter' && handleSave()} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Fecha</label>
                <input type="date" className="input-field w-full" value={editIncome.date}
                  onChange={e => setEditIncome({ ...editIncome, date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Tipo</label>
                <select className="input-field w-full" value={editIncome.type}
                  onChange={e => setEditIncome({ ...editIncome, type: e.target.value })}>
                  <option>Facturada</option>
                  <option>Seña</option>
                  <option>Sin facturar</option>
                  <option>Otro</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Método de Cobro</label>
                <select className="input-field w-full" value={editIncome.method}
                  onChange={e => setEditIncome({ ...editIncome, method: e.target.value })}>
                  <option>Transferencia</option>
                  <option>Efectivo</option>
                  <option>Cheque</option>
                  <option>PayPal</option>
                  <option>Otro</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Estado</label>
                <select className="input-field w-full" value={editIncome.status}
                  onChange={e => setEditIncome({ ...editIncome, status: e.target.value })}>
                  <option>Cobrado</option>
                  <option>Pendiente</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Notas</label>
                <input type="text" className="input-field w-full"
                  value={editIncome.notes || ''}
                  onChange={e => setEditIncome({ ...editIncome, notes: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="Observaciones opcionales..." />
              </div>
            </div>
            <div className="mt-6 flex justify-between items-center">
              {incomes.some(i => i.id === editIncome.id) ? (
                <button onClick={() => { setIncomes(prev => prev.filter(i => i.id !== editIncome.id)); setEditIncome(null); }}
                  className="text-red-500 text-sm font-semibold hover:underline">Eliminar</button>
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
