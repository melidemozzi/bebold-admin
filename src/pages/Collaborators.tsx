import { useState } from 'react';
import { PlusCircle, MoreVertical, Briefcase, Landmark, CheckCircle2, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import type { Collaborator } from '../context/AppContext';
import { cn } from '../lib/utils';

export default function Collaborators() {
  const { collaborators, setCollaborators } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollab, setEditingCollab] = useState<Collaborator | null>(null);

  const handleDelete = (id: number) => {
    setCollaborators(prev => prev.filter(c => c.id !== id));
    setIsModalOpen(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCollab) {
      if (editingCollab.id === 0) {
        setCollaborators([...collaborators, { ...editingCollab, id: Date.now() }]);
      } else {
        setCollaborators(collaborators.map(c => c.id === editingCollab.id ? editingCollab : c));
      }
      setIsModalOpen(false);
    }
  };

  const openNew = () => {
    setEditingCollab({ id: 0, name: '', role: '', bankDetails: '', isBilling: false, baseSalary: 0 });
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main font-display flex items-center gap-2">Gestión de Equipo</h1>
          <p className="text-text-muted mt-1 text-sm">Fichas técnicas y datos contables de los colaboradores de la agencia.</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm shadow-md shadow-primary-500/20">
          <PlusCircle className="w-4 h-4 text-white" /> Sumar Colaborador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {collaborators.map(collab => (
          <div key={collab.id} className="card relative overflow-hidden group hover:border-primary-300 transition-colors">
            <div className="absolute top-4 right-4 flex gap-1">
              <button
                onClick={() => { setEditingCollab(collab); setIsModalOpen(true); }}
                className="p-1.5 text-slate-300 hover:text-primary-500 bg-slate-50 rounded-md transition-colors"
                title="Editar"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(collab.id)}
                className="p-1.5 text-slate-300 hover:text-red-500 bg-slate-50 rounded-md transition-colors"
                title="Eliminar colaborador"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary-500 to-primary-400 flex items-center justify-center shadow-inner">
                  <span className="text-white font-bold text-xl">{collab.name.substring(0, 2).toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{collab.name}</h3>
                  <p className="text-primary-600 text-sm font-semibold">{collab.role}</p>
                </div>
              </div>

              <div className="space-y-3 mt-6 border-t border-slate-100 pt-4">
                <div className="flex items-start gap-2 text-sm">
                  <Landmark className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-600 block mb-0.5">Datos Bancarios</span>
                    <span className="text-slate-500 break-all">{collab.bankDetails || "No especificados"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm pt-2">
                  <div className="flex items-center gap-2 text-slate-600 font-semibold">
                    <Briefcase className="w-4 h-4 text-slate-400" /> Sueldo Fijo:
                  </div>
                  <span className="font-bold text-slate-800">${collab.baseSalary.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-3 pt-3 border-t border-slate-100">
                  <CheckCircle2 className={cn("w-4 h-4", collab.isBilling ? "text-emerald-500" : "text-slate-300")} />
                  <span className={cn("font-medium", collab.isBilling ? "text-emerald-700" : "text-slate-400")}>
                    {collab.isBilling ? "Emite Factura (Agente Registrado)" : "No emite factura"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingCollab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl flex flex-col p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-6 text-slate-800">
              {editingCollab.id === 0 ? "Nuevo Colaborador" : "Editar Ficha"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Nombre Completo</label>
                  <input required placeholder="Ej: Gonzalo" className="input-field w-full" value={editingCollab.name} onChange={e => setEditingCollab({...editingCollab, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Rol o Especialidad</label>
                  <input required placeholder="Ej: Paid Media" className="input-field w-full" value={editingCollab.role} onChange={e => setEditingCollab({...editingCollab, role: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Honorario Fijo Mensual ($)</label>
                  <input
                    type="number"
                    placeholder="0 = honorarios por cliente"
                    className="input-field w-full"
                    value={editingCollab.baseSalary === 0 ? '' : editingCollab.baseSalary}
                    onChange={e => setEditingCollab({ ...editingCollab, baseSalary: e.target.value === '' ? 0 : Number(e.target.value) })}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {editingCollab.baseSalary > 0 ? 'Monto fijo mensual — no se suma por clientes.' : 'Dejá en 0 si cobra por porcentaje de cada cliente.'}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Datos para Transferencias (CBU / ALIAS)</label>
                  <textarea placeholder="CBU: ..." className="input-field w-full" rows={2} value={editingCollab.bankDetails} onChange={e => setEditingCollab({...editingCollab, bankDetails: e.target.value})} />
                </div>
                <div className="col-span-2 flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50">
                  <input type="checkbox" id="billing" className="w-4 h-4 text-primary-500 rounded border-slate-300 focus:ring-primary-500" 
                    checked={editingCollab.isBilling} onChange={e => setEditingCollab({...editingCollab, isBilling: e.target.checked})} />
                  <label htmlFor="billing" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Este colaborador está registrado y emite facturas
                  </label>
                </div>
              </div>
              <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-5">
                {editingCollab.id !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingCollab.id)}
                    className="text-red-500 text-sm font-semibold hover:underline"
                  >Eliminar colaborador</button>
                )}
                <div className={cn("flex gap-3", editingCollab.id === 0 && "ml-auto")}>
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
