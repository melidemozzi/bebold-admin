import { useState, useMemo } from 'react';
import { PlusCircle, Trash2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppContext } from '../context/AppContext';
import type { Expense } from '../context/AppContext';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const EMPTY: Expense = { id: 0, date: '', desc: '', category: 'Variable', amount: 0, method: 'Transferencia', isRecurrent: false };

export default function Expenses() {
  const { expenses, setExpenses } = useAppContext();
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

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

  const monthExpenses = useMemo(() =>
    expenses.filter(e => e.date.startsWith(monthPrefix)).sort((a, b) => a.date.localeCompare(b.date)),
    [expenses, monthPrefix]
  );

  const totalGastos = monthExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalFijos = monthExpenses.filter(e => e.isRecurrent).reduce((acc, e) => acc + e.amount, 0);

  function openNew() {
    setEditExpense({ ...EMPTY, id: Date.now(), date: `${monthPrefix}-01` });
  }

  function handleSave() {
    if (!editExpense || !editExpense.desc.trim() || editExpense.amount <= 0) return;
    const isNew = !expenses.some(e => e.id === editExpense.id);
    if (isNew) setExpenses(prev => [...prev, editExpense]);
    else setExpenses(prev => prev.map(e => e.id === editExpense.id ? editExpense : e));
    setEditExpense(null);
  }

  function handleDelete(id: number) {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main font-display">Gastos Operativos</h1>
          <p className="text-text-muted mt-1 text-sm">Registro de herramientas, impuestos y gastos diarios.</p>
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
          <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
            <PlusCircle className="w-4 h-4 text-white" /> Nuevo Gasto
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5 border-l-4 border-l-rose-500 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total del Mes</p>
          <p className="text-2xl font-bold text-slate-800">-${totalGastos.toLocaleString()}</p>
        </div>
        <div className="card p-5 border-l-4 border-l-indigo-500 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Recurrentes</p>
          <p className="text-2xl font-bold text-slate-800">-${totalFijos.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden border-transparent shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-border text-slate-500 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-white">
              {monthExpenses.map(exp => (
                <tr key={exp.id} className="hover:bg-primary-50/30 transition-colors">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{exp.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {exp.desc}
                    {exp.notes && <p className="text-xs text-slate-400 mt-0.5">{exp.notes}</p>}

                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-semibold",
                      exp.category === 'Fijo' ? 'bg-indigo-50 text-indigo-600' :
                      exp.category === 'Impuestos' ? 'bg-amber-50 text-amber-600' :
                      exp.category === 'Hardware/Software' ? 'bg-blue-50 text-blue-600' :
                      'bg-slate-100 text-slate-500'
                    )}>{exp.category}</span>
                    {exp.isRecurrent && <span className="ml-1 px-2 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-600">Mensual</span>}
                  </td>
                  <td className="px-4 py-3 font-bold text-rose-500 text-right whitespace-nowrap">-${exp.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditExpense(exp)}
                        className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(exp.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {monthExpenses.length === 0 && (
            <div className="p-10 text-center text-slate-400 text-sm">
              Sin gastos en {MESES[selectedMonth]} {selectedYear}.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {editExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl flex flex-col p-6">
            <h2 className="text-xl font-bold mb-4">
              {!expenses.some(e => e.id === editExpense.id) ? 'Nuevo Gasto' : 'Editar Gasto'}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Descripción</label>
                <input type="text" className="input-field w-full" value={editExpense.desc}
                  onChange={e => setEditExpense({ ...editExpense, desc: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="Ej: Canva Pro, Papelería..." autoFocus />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Monto (ARS)</label>
                <input type="number" className="input-field w-full"
                  value={editExpense.amount === 0 ? '' : editExpense.amount}
                  onChange={e => setEditExpense({ ...editExpense, amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                  onKeyDown={e => e.key === 'Enter' && handleSave()} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Fecha</label>
                <input type="date" className="input-field w-full" value={editExpense.date}
                  onChange={e => setEditExpense({ ...editExpense, date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Categoría</label>
                <select className="input-field w-full" value={editExpense.category}
                  onChange={e => setEditExpense({ ...editExpense, category: e.target.value })}>
                  <option>Variable</option>
                  <option>Fijo</option>
                  <option>Impuestos</option>
                  <option>Hardware/Software</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Método de Pago</label>
                <select className="input-field w-full" value={editExpense.method}
                  onChange={e => setEditExpense({ ...editExpense, method: e.target.value })}>
                  <option>Transferencia</option>
                  <option>TC Empresa</option>
                  <option>Efectivo</option>
                  <option>Caja Chica</option>
                  <option>Otro</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Notas</label>
                <input type="text" className="input-field w-full" value={editExpense.notes || ''}
                  onChange={e => setEditExpense({ ...editExpense, notes: e.target.value })}
                  placeholder="Observaciones opcionales..." />
              </div>
              <div className="col-span-2 flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <input type="checkbox" id="recur" className="w-4 h-4 text-primary-500 rounded"
                  checked={editExpense.isRecurrent}
                  onChange={e => setEditExpense({ ...editExpense, isRecurrent: e.target.checked })} />
                <label htmlFor="recur" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Gasto mensual recurrente
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-between items-center">
              {expenses.some(e => e.id === editExpense.id) ? (
                <button onClick={() => { handleDelete(editExpense.id); setEditExpense(null); }}
                  className="text-red-500 text-sm font-semibold hover:underline">Eliminar</button>
              ) : <div />}
              <div className="flex gap-2">
                <button onClick={() => setEditExpense(null)} className="btn-secondary">Cancelar</button>
                <button onClick={handleSave} className="btn-primary">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
