import { useState } from 'react';
import { Upload, PlusCircle, MoreVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import ExcelImporter from '../components/ExcelImporter';
import { useAppContext } from '../context/AppContext';
import type { Expense } from '../context/AppContext';

export default function Expenses() {
  const { expenses, setExpenses } = useAppContext();
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  const handleImport = (parsedData: any[], period: string) => {
    const newRecords = parsedData.map((row, index) => {
      const getVal = (key: string) => {
        const found = Object.keys(row).find(k => k.toLowerCase().includes(key.toLowerCase()));
        return found ? row[found] : undefined;
      };
      return {
        id: Date.now() + index,
        date: period + '-01',
        desc: getVal("descripcion") || getVal("detalle") || getVal("gasto") || "Gasto Importado",
        category: getVal("categoria") || getVal("tipo") || "Variable",
        method: getVal("metodo") || getVal("medio") || "Otro",
        amount: parseInt(getVal("monto")) || parseInt(getVal("pesos")) || parseInt(getVal("total")) || 0,
        isRecurrent: false
      };
    }).filter(c => c.amount > 0);
    setExpenses(prev => [...prev, ...newRecords]);
  };

  const handleSave = () => {
    if (!editExpense) return;
    const isNew = !expenses.some(e => e.id === editExpense.id);
    if (isNew) setExpenses(prev => [...prev, editExpense]);
    else setExpenses(prev => prev.map(e => e.id === editExpense.id ? editExpense : e));
    setEditExpense(null);
  };

  const totalGastos = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalFijos = expenses.filter(e => e.isRecurrent).reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main font-display">Gastos Operativos</h1>
          <p className="text-text-muted mt-1 text-sm">Registro de herramientas, impuestos y gastos diarios de la agencia.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsImporterOpen(true)} className="btn-secondary flex items-center gap-2 text-sm shadow-sm">
            <Upload className="w-4 h-4" /> Importar CSV/Excel
          </button>
          <button
            onClick={() => setEditExpense({ id: Date.now(), date: new Date().toLocaleDateString('en-CA'), desc: '', category: 'Variable', amount: 0, method: 'Transferencia', isRecurrent: false })}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <PlusCircle className="w-4 h-4 text-white" /> Carga Manual
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6 border-l-4 border-l-rose-500 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total de Gastos</p>
          <p className="text-3xl font-bold text-slate-800">-${totalGastos.toLocaleString()} <span className="text-lg text-slate-400 font-normal">ARS</span></p>
        </div>
        <div className="card p-6 border-l-4 border-l-indigo-500 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Gastos Recurrentes</p>
          <p className="text-3xl font-bold text-slate-800">-${totalFijos.toLocaleString()} <span className="text-lg text-slate-400 font-normal">ARS / mes</span></p>
        </div>
      </div>

      {/* Tabla */}
      <div className="card flex-1 overflow-hidden border-transparent shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-border text-slate-500 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Fecha</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Monto (ARS)</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Recurrente</th>
                <th className="px-6 py-4 text-center rounded-tr-xl">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-white">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-primary-50/30 transition-colors">
                  <td className="px-6 py-4 text-slate-500">{exp.date}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{exp.desc}</td>
                  <td className="px-6 py-4 font-bold text-rose-500">-${exp.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-semibold",
                      exp.category === "Fijo" ? "bg-indigo-50 text-indigo-600" :
                      exp.category === "Impuestos" ? "bg-amber-50 text-amber-600" :
                      exp.category === "Hardware/Software" ? "bg-blue-50 text-blue-600" :
                      "bg-slate-100 text-slate-500"
                    )}>
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {exp.isRecurrent && (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-600">Mensual</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setEditExpense(exp)}
                      className="p-1.5 text-slate-400 hover:text-text-main hover:bg-slate-50 transition-colors rounded"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && (
            <div className="p-10 text-center text-slate-400">
              No hay gastos. Usá el importador o agregá uno manualmente.
            </div>
          )}
        </div>
      </div>

      <ExcelImporter isOpen={isImporterOpen} onClose={() => setIsImporterOpen(false)} onImport={handleImport} />

      {/* Modal Carga Manual / Edición */}
      {editExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl flex flex-col p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4">
              {!expenses.some(e => e.id === editExpense.id) ? 'Nuevo Gasto' : 'Editar Gasto'}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Descripción del Gasto</label>
                <input type="text" className="input-field w-full" value={editExpense.desc} onChange={e => setEditExpense({ ...editExpense, desc: e.target.value })} placeholder="Ej: Canva Pro, Papelería..." />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Monto (ARS)</label>
                <input type="number" className="input-field w-full" value={editExpense.amount || ''} onChange={e => setEditExpense({ ...editExpense, amount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Método de Pago</label>
                <select className="input-field w-full" value={editExpense.method} onChange={e => setEditExpense({ ...editExpense, method: e.target.value })}>
                  <option>Transferencia</option>
                  <option>TC Empresa</option>
                  <option>Efectivo</option>
                  <option>Caja Chica</option>
                  <option>Otro</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Categoría</label>
                <select className="input-field w-full" value={editExpense.category} onChange={e => setEditExpense({ ...editExpense, category: e.target.value })}>
                  <option>Variable</option>
                  <option>Fijo</option>
                  <option>Impuestos</option>
                  <option>Hardware/Software</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Fecha</label>
                <input type="date" className="input-field w-full" value={editExpense.date} onChange={e => setEditExpense({ ...editExpense, date: e.target.value })} />
              </div>
              <div className="col-span-2 flex items-center gap-2 mt-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <input
                  type="checkbox" id="recur"
                  className="w-4 h-4 text-primary-500 rounded"
                  checked={editExpense.isRecurrent}
                  onChange={e => setEditExpense({ ...editExpense, isRecurrent: e.target.checked })}
                />
                <label htmlFor="recur" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Es un gasto mensual/recurrente (se suma al total fijo mensual)
                </label>
              </div>
            </div>
            <div className="mt-8 flex justify-between items-center">
              {expenses.some(e => e.id === editExpense.id) ? (
                <button
                  onClick={() => { setExpenses(prev => prev.filter(e => e.id !== editExpense.id)); setEditExpense(null); }}
                  className="text-red-500 hover:text-red-700 text-sm font-semibold"
                >Eliminar</button>
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
