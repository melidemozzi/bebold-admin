import { useState } from 'react';
import { PlusCircle, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import type { Collaborator } from '../context/AppContext';
import { cn } from '../lib/utils';

export default function Collaborators() {
  const { collaborators, setCollaborators } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollab, setEditingCollab] = useState<Collaborator | null>(null);

  const sorted = [...collaborators].sort((a, b) => a.name.localeCompare(b.name));

  const handleDelete = (id: number) => {
    setCollaborators(prev => prev.filter(c => c.id !== id));
    setIsModalOpen(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollab) return;
    if (editingCollab.id === 0) {
      setCollaborators([...collaborators, { ...editingCollab, id: Date.now() }]);
    } else {
      setCollaborators(collaborators.map(c => c.id === editingCollab.id ? editingCollab : c));
    }
    setIsModalOpen(false);
  };

  const openNew = () => {
    setEditingCollab({ id: 0, name: '', role: '', bankDetails: '', isBilling: false, baseSalary: 0 });
    setIsModalOpen(true);
  };

  const totalFijo = collaborators.reduce((acc, c) => acc + c.baseSalary, 0);

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main font-display">Equipo</h1>
          <p className="text-text-muted mt-1 text-sm">Colaboradores y honorarios del estudio.</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm shadow-md shadow-primary-500/20">
          <PlusCircle className="w-4 h-4 text-white" /> Sumar Colaborador
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5 border-l-4 border-l-violet-500 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Costo Fijo Mensual</p>
          <p className="text-2xl font-bold text-slate-800">${totalFijo.toLocaleString()}</p>
        </div>
        <div className="card p-5 border-l-4 border-l-slate-300 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Colaboradores</p>
          <p className="text-2xl font-bold text-slate-800">{collaborators.length}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden border-transparent shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-border text-slate-500 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3 text-right">Honorario Fijo</th>
                <th className="px-4 py-3">Datos Bancarios</th>
                <th className="px-4 py-3 text-center">Factura</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-white">
              {sorted.map(collab => (
                <tr key={collab.id} className="hover:bg-primary-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary-500 to-primary-400 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-xs">{collab.name.substring(0, 2).toUpperCase()}</span>
                      </div>
                      <span className="font-bold text-slate-800">{collab.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{collab.role}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                    {collab.baseSalary > 0 ? `$${collab.baseSalary.toLocaleString()}` : <span className="text-slate-400 font-normal text-xs">Por cliente</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">{collab.bankDetails || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {collab.isBilling
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                      : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setEditingCollab(collab); setIsModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(collab.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {collaborators.length === 0 && (
            <div className="p-10 text-center text-slate-400 text-sm">
              No hay colaboradores cargados todavía.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && editingCollab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl flex flex-col p-6">
            <h2 className="text-xl font-bold mb-6 text-slate-800">
              {editingCollab.id === 0 ? 'Nuevo Colaborador' : 'Editar Ficha'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Nombre Completo</label>
                  <input required placeholder="Ej: Gonzalo" className="input-field w-full"
                    value={editingCollab.name}
                    onChange={e => setEditingCollab({ ...editingCollab, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Rol o Especialidad</label>
                  <input required placeholder="Ej: Paid Media" className="input-field w-full"
                    value={editingCollab.role}
                    onChange={e => setEditingCollab({ ...editingCollab, role: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Honorario Fijo Mensual ($)</label>
                  <input type="number" placeholder="0 = variable por cliente" className="input-field w-full"
                    value={editingCollab.baseSalary === 0 ? '' : editingCollab.baseSalary}
                    onChange={e => setEditingCollab({ ...editingCollab, baseSalary: e.target.value === '' ? 0 : Number(e.target.value) })} />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {editingCollab.baseSalary > 0 ? 'Monto fijo mensual.' : 'Dejá en 0 si cobra por cliente.'}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Datos para Transferencias (CBU / ALIAS)</label>
                  <textarea placeholder="CBU: ..." className="input-field w-full" rows={2}
                    value={editingCollab.bankDetails}
                    onChange={e => setEditingCollab({ ...editingCollab, bankDetails: e.target.value })} />
                </div>
                <div className="col-span-2 flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50">
                  <input type="checkbox" id="billing" className="w-4 h-4 text-primary-500 rounded border-slate-300"
                    checked={editingCollab.isBilling}
                    onChange={e => setEditingCollab({ ...editingCollab, isBilling: e.target.checked })} />
                  <label htmlFor="billing" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Este colaborador está registrado y emite facturas
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-between items-center border-t border-slate-100 pt-5">
                {editingCollab.id !== 0 && (
                  <button type="button" onClick={() => handleDelete(editingCollab.id)}
                    className="text-red-500 text-sm font-semibold hover:underline">Eliminar colaborador</button>
                )}
                <div className={cn('flex gap-3', editingCollab.id === 0 && 'ml-auto')}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
                  <button type="submit" className="btn-primary">Guardar Ficha</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
