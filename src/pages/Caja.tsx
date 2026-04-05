import { useState, useMemo } from 'react';
import { PlusCircle, Pencil, Trash2, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, fmt } from '../lib/utils';
import { useAppContext } from '../context/AppContext';
import type { CajaEntry, CajaAccount } from '../context/AppContext';
import { CAJA_ACCOUNTS } from '../context/AppContext';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const ACCOUNT_COLORS: Record<CajaAccount, string> = {
  'Cash $':      'border-l-emerald-500',
  'Cash USD':    'border-l-blue-500',
  'Cuenta Meli': 'border-l-violet-500',
  'Cuenta Sofi': 'border-l-pink-500',
};
const ACCOUNT_TEXT: Record<CajaAccount, string> = {
  'Cash $':      'text-emerald-600',
  'Cash USD':    'text-blue-600',
  'Cuenta Meli': 'text-violet-600',
  'Cuenta Sofi': 'text-pink-600',
};

const EMPTY: CajaEntry = { id: 0, date: '', account: 'Cash $', type: 'entrada', amount: 0, desc: '' };

export default function Caja() {
  const { cajaEntries, setCajaEntries } = useAppContext();
  const [editEntry, setEditEntry] = useState<CajaEntry | null>(null);
  const [filterAccount, setFilterAccount] = useState<CajaAccount | 'Todas'>('Todas');

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
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

  // Saldo acumulado por cuenta (todo el historial)
  const saldos = useMemo(() => {
    const result: Record<CajaAccount, number> = { 'Cash $': 0, 'Cash USD': 0, 'Cuenta Meli': 0, 'Cuenta Sofi': 0 };
    cajaEntries.forEach(e => {
      result[e.account] += e.type === 'entrada' ? e.amount : -e.amount;
    });
    return result;
  }, [cajaEntries]);

  const saldoTotal = Object.values(saldos).reduce((a, b) => a + b, 0);

  // Movimientos del mes seleccionado, filtrados por cuenta
  const monthEntries = useMemo(() => {
    return cajaEntries
      .filter(e => e.date.startsWith(monthPrefix))
      .filter(e => filterAccount === 'Todas' || e.account === filterAccount)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [cajaEntries, monthPrefix, filterAccount]);

  const entradaMes = monthEntries.filter(e => e.type === 'entrada').reduce((a, e) => a + e.amount, 0);
  const salidaMes  = monthEntries.filter(e => e.type === 'salida').reduce((a, e) => a + e.amount, 0);

  function openNew() {
    setEditEntry({ ...EMPTY, id: Date.now(), date: `${monthPrefix}-01` });
  }

  function handleSave() {
    if (!editEntry || !editEntry.desc.trim() || editEntry.amount <= 0) return;
    const isNew = !cajaEntries.some(e => e.id === editEntry.id);
    if (isNew) setCajaEntries(prev => [...prev, editEntry]);
    else setCajaEntries(prev => prev.map(e => e.id === editEntry.id ? editEntry : e));
    setEditEntry(null);
  }

  function handleDelete(id: number) {
    setCajaEntries(prev => prev.filter(e => e.id !== id));
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main font-display">Caja</h1>
          <p className="text-text-muted mt-1 text-sm">Liquidez real por cuenta. Lo que hay en el banco y en efectivo.</p>
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
          <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm shadow-md shadow-primary-500/20">
            <PlusCircle className="w-4 h-4 text-white" /> Registrar movimiento
          </button>
        </div>
      </div>

      {/* Saldos por cuenta (acumulado total) */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Saldo actual por cuenta</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CAJA_ACCOUNTS.map(account => (
            <div key={account} className={cn('card p-5 border-l-4 shadow-sm cursor-pointer transition-all', ACCOUNT_COLORS[account],
              filterAccount === account ? 'ring-2 ring-primary-300' : 'hover:shadow-md'
            )}
              onClick={() => setFilterAccount(prev => prev === account ? 'Todas' : account)}
            >
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{account}</p>
              <p className={cn('text-xl font-bold', saldos[account] >= 0 ? ACCOUNT_TEXT[account] : 'text-red-600')}>
                ${fmt(saldos[account])}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Total liquidez */}
      <div className="card p-5 bg-slate-800 border-transparent shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Liquidez Total Acumulada</p>
            <p className={cn('text-3xl font-bold', saldoTotal >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              ${fmt(saldoTotal)}
            </p>
          </div>
          <div className="text-right text-sm text-slate-400 space-y-1">
            <p><span className="text-emerald-400 font-semibold">↑ ${fmt(entradaMes)}</span> entradas este mes</p>
            <p><span className="text-red-400 font-semibold">↓ ${fmt(salidaMes)}</span> salidas este mes</p>
          </div>
        </div>
      </div>

      {/* Filtro por cuenta */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-500">Filtrar:</span>
        {(['Todas', ...CAJA_ACCOUNTS] as const).map(a => (
          <button key={a} onClick={() => setFilterAccount(a as any)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              filterAccount === a ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}>
            {a}
          </button>
        ))}
      </div>

      {/* Tabla de movimientos del mes */}
      <div className="card overflow-hidden border-transparent shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-border text-slate-500 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Cuenta</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-white">
              {monthEntries.map(e => (
                <tr key={e.id} className="hover:bg-primary-50/30 transition-colors">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{e.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{e.desc}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded text-[11px] font-bold', ACCOUNT_TEXT[e.account], 'bg-slate-50')}>
                      {e.account}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                    <span className={cn('flex items-center justify-end gap-1', e.type === 'entrada' ? 'text-emerald-600' : 'text-red-500')}>
                      {e.type === 'entrada' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      ${fmt(e.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditEntry(e)}
                        className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(e.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {monthEntries.length === 0 && (
            <div className="p-10 text-center text-slate-400 text-sm">
              Sin movimientos en {MESES[selectedMonth]} {selectedYear}{filterAccount !== 'Todas' ? ` — ${filterAccount}` : ''}.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl flex flex-col p-6">
            <h2 className="text-xl font-bold mb-4">
              {!cajaEntries.some(e => e.id === editEntry.id) ? 'Nuevo Movimiento' : 'Editar Movimiento'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Descripción</label>
                <input type="text" className="input-field w-full" autoFocus
                  value={editEntry.desc}
                  onChange={e => setEditEntry({ ...editEntry, desc: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="Ej: Cobro Cyclo, Pago Canva..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Monto ($)</label>
                  <input type="number" className="input-field w-full"
                    value={editEntry.amount === 0 ? '' : editEntry.amount}
                    onChange={e => setEditEntry({ ...editEntry, amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                    onKeyDown={e => e.key === 'Enter' && handleSave()} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Fecha</label>
                  <input type="date" className="input-field w-full" value={editEntry.date}
                    onChange={e => setEditEntry({ ...editEntry, date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Cuenta</label>
                  <select className="input-field w-full" value={editEntry.account}
                    onChange={e => setEditEntry({ ...editEntry, account: e.target.value as CajaAccount })}>
                    {CAJA_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Tipo</label>
                  <select className="input-field w-full" value={editEntry.type}
                    onChange={e => setEditEntry({ ...editEntry, type: e.target.value as 'entrada' | 'salida' })}>
                    <option value="entrada">Entrada (cobro)</option>
                    <option value="salida">Salida (pago)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-between items-center">
              {cajaEntries.some(e => e.id === editEntry.id) ? (
                <button onClick={() => { handleDelete(editEntry.id); setEditEntry(null); }}
                  className="text-red-500 text-sm font-semibold hover:underline">Eliminar</button>
              ) : <div />}
              <div className="flex gap-2">
                <button onClick={() => setEditEntry(null)} className="btn-secondary">Cancelar</button>
                <button onClick={handleSave} className="btn-primary">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
