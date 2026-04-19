import { useState } from 'react';
import { Upload, Search, UserPlus, FileText, MoreVertical, PlusCircle, Trash2, BarChart2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelImporter from '../components/ExcelImporter';
import { useAppContext } from '../context/AppContext';
import type { Client } from '../context/AppContext';

export default function Clients() {
  const { clients, setClients, collaborators, incomes } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterResponsable, setFilterResponsable] = useState('');
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [dashboardClient, setDashboardClient] = useState<Client | null>(null);

  const countries = [...new Set(clients.map(c => c.country).filter(Boolean))];
  const responsables = [...new Set(clients.map(c => c.responsible).filter(Boolean))];

  const handleDelete = (id: number) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const handleImport = (parsedData: any[], period: string) => {
    const newClients = parsedData.map((row: any, index: number) => ({
      id: Date.now() + index,
      name: row.client || '',
      cuit: row.cuit || '',
      country: 'Argentina',
      currency: 'ARS',
      responsible: 'Meli',
      status: 'activo',
      services: '',
      start_date: period + '-01',
      amount: row.amount || 0,
      notes: '',
      team: [],
    })).filter((c: any) => c.name.trim() !== '');
    setClients(prev => [...prev, ...newClients]);
  };

  // Calcular costo de equipo asignado a un cliente
  function calcClientTeamCost(client: Client): number {
    return (client.team || []).reduce((total, member) => {
      const collab = collaborators.find(c => c.name === member.collaboratorName);
      if (!collab) return total;
      if (collab.baseSalary > 0) {
        return total + (member.fixedClientAmount || 0);
      } else if (member.feeType === 'Percentage' && member.feeAmount > 0) {
        return total + (client.amount * member.feeAmount) / 100;
      } else if (member.feeType === 'One-Time' && member.feeAmount > 0) {
        return total + member.feeAmount;
      }
      return total;
    }, 0);
  }

  const handleDownloadBrief = (client: Client) => {
    const doc = new jsPDF();
    doc.setFillColor(217, 70, 239);
    doc.rect(0, 0, 210, 45, 'F');
    try {
      const img = new Image();
      img.src = '/bebold-logo.png';
      doc.addImage(img, 'PNG', 14, 8, 45, 12);
    } catch {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("Be Böld Studio", 14, 25);
    }
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.text(`Resumen de Servicios: ${client.name}`, 14, 55);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-AR')}`, 14, 62);

    const teamCost = calcClientTeamCost(client);
    const resultado = client.amount - teamCost;
    const margen = client.amount > 0 ? Math.round((resultado / client.amount) * 100) : 0;

    autoTable(doc, {
      startY: 70,
      headStyles: { fillColor: [248, 250, 252] as [number, number, number], textColor: [71, 85, 105], fontStyle: 'bold' },
      bodyStyles: { textColor: [30, 41, 59] },
      head: [['Dato', 'Información']],
      body: [
        ['Razón Social / Nombre', client.name],
        ['Identificación Fiscal', client.cuit],
        ['Responsable Interno', client.responsible],
        ['País de Cobro', client.country],
        ['Servicios Contratados', client.services],
        ['Moneda Base', client.currency],
        ['Ingreso Mensual', `$${client.amount.toLocaleString()}`],
        ['Costo Equipo Asignado', `$${teamCost.toLocaleString()}`],
        ['Resultado', `$${resultado.toLocaleString()} (${margen}%)`],
        ['Estado de Servicio', client.status.toUpperCase()],
      ],
    });

    const finalY = (doc as any).lastAutoTable.finalY || 70;
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('Adjuntar comprobante a majoestudiocontable@gmail.com', 14, finalY + 12);
    doc.save(`Brief_Cliente_${client.name.replace(/ /g, '_')}.pdf`);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full pb-8">

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main font-display flex items-center gap-2">Clientes</h1>
          <p className="text-text-muted mt-1 text-sm">Gestiona la base de clientes y emite reportes.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsImporterOpen(true)} className="btn-secondary flex items-center gap-2 text-sm shadow-sm">
            <Upload className="w-4 h-4" /> Importar Excel/CSV
          </button>
          <button
            onClick={() => setEditClient({
              id: Date.now(), name: '', cuit: '', country: 'Argentina', currency: 'ARS',
              responsible: 'Meli', status: 'activo', services: '', start_date: '', amount: 0, notes: '', team: []
            })}
            className="btn-primary flex items-center gap-2 text-sm shadow-md shadow-primary-500/20"
          >
            <UserPlus className="w-4 h-4 text-white" /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 border-transparent shadow-sm flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar por nombre, cuit..."
            className="input-field pl-9 bg-slate-50 border-transparent hover:border-slate-200"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select className="bg-white border text-sm font-medium border-border shadow-sm rounded-lg px-4 py-2 hidden md:block"
            value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
            <option value="">Todos los países</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="bg-white border text-sm font-medium border-border shadow-sm rounded-lg px-4 py-2 hidden sm:block"
            value={filterResponsable} onChange={e => setFilterResponsable(e.target.value)}>
            <option value="">Responsable: Todos</option>
            {responsables.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="card flex-1 overflow-hidden border-transparent shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-border text-slate-500 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Nombre / Empresa</th>
                <th className="px-6 py-4">CUIT</th>
                <th className="px-6 py-4">Servicios</th>
                <th className="px-6 py-4">Ingreso</th>
                <th className="px-6 py-4">Resultado</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-center rounded-tr-xl">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-white">
              {clients.filter(c =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                (filterCountry === '' || c.country === filterCountry) &&
                (filterResponsable === '' || c.responsible === filterResponsable)
              ).sort((a, b) => a.name.localeCompare(b.name)).map((client) => {
                const teamCost = calcClientTeamCost(client);
                const resultado = client.amount - teamCost;
                const margen = client.amount > 0 ? Math.round((resultado / client.amount) * 100) : 0;
                return (
                  <tr key={client.id} className="hover:bg-primary-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{client.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{client.country} · {client.currency}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 tabular-nums">{client.cuit}</td>
                    <td className="px-6 py-4 text-slate-600 max-w-[180px] truncate">{client.services}</td>
                    <td className="px-6 py-4">
                      <span className={cn("font-semibold", client.amount > 0 ? "text-orange-500" : "text-slate-400")}>
                        ${client.amount.toLocaleString()} <span className="text-xs font-normal text-slate-400">{client.currency}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {client.amount > 0 ? (
                        <div>
                          <span className={cn("font-bold text-sm", resultado >= 0 ? "text-emerald-600" : "text-red-500")}>
                            ${resultado.toLocaleString()}
                          </span>
                          <span className={cn("ml-1 text-xs font-semibold", margen >= 50 ? "text-emerald-500" : margen >= 20 ? "text-amber-500" : "text-red-500")}>
                            {margen}%
                          </span>
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold",
                        client.status === 'activo' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {client.status === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setDashboardClient(client)}
                          className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Ver rentabilidad del cliente">
                          <BarChart2 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDownloadBrief(client); }}
                          className="p-1.5 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                          title="Descargar Brief PDF">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditClient(client)}
                          className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 transition-colors rounded-md"
                          title="Editar / Ver">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {clients.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
            <Search className="w-12 h-12 mb-4 text-slate-200" />
            <p>No se encontraron clientes.</p>
          </div>
        )}
      </div>

      <ExcelImporter isOpen={isImporterOpen} onClose={() => setIsImporterOpen(false)} onImport={handleImport} />

      {/* Modal Dashboard de Cliente */}
      {dashboardClient && (() => {
        const client = dashboardClient;
        const teamCost = calcClientTeamCost(client);
        const resultado = client.amount - teamCost;
        const margen = client.amount > 0 ? Math.round((resultado / client.amount) * 100) : 0;
        const ingresosCobrados = incomes
          .filter(i => i.client === client.name && i.status === 'Cobrado')
          .reduce((a, i) => a + i.amount, 0);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl p-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{client.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{client.services}</p>
                </div>
                <button onClick={() => setDashboardClient(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Ingreso mensual</p>
                  <p className="text-xl font-bold text-slate-800">${client.amount.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{client.currency}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Costo equipo</p>
                  <p className="text-xl font-bold text-rose-500">${teamCost.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{(client.team || []).length} asignado{(client.team || []).length !== 1 ? 's' : ''}</p>
                </div>
                <div className={cn("rounded-xl p-4 col-span-2", resultado >= 0 ? "bg-emerald-50" : "bg-red-50")}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Resultado neto</p>
                  <div className="flex items-end gap-3">
                    <p className={cn("text-2xl font-bold", resultado >= 0 ? "text-emerald-600" : "text-red-600")}>
                      ${resultado.toLocaleString()}
                    </p>
                    <span className={cn(
                      "text-sm font-bold mb-0.5 px-2 py-0.5 rounded-full",
                      margen >= 50 ? "bg-emerald-100 text-emerald-700" :
                      margen >= 20 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    )}>
                      {margen}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">ingreso − costo equipo</p>
                </div>
              </div>

              {/* Histórico cobrado */}
              {ingresosCobrados > 0 && (
                <div className="bg-blue-50 rounded-xl p-3 mb-5">
                  <p className="text-xs font-semibold text-blue-700">Total cobrado histórico: <strong>${ingresosCobrados.toLocaleString()}</strong></p>
                </div>
              )}

              {/* Detalle equipo */}
              {(client.team || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Desglose equipo</p>
                  <div className="space-y-2">
                    {client.team.map((member, i) => {
                      const collab = collaborators.find(c => c.name === member.collaboratorName);
                      const cost = collab && collab.baseSalary > 0
                        ? (member.fixedClientAmount || 0)
                        : member.feeType === 'Percentage'
                          ? (client.amount * member.feeAmount) / 100
                          : member.feeAmount;
                      return (
                        <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                          <div>
                            <span className="text-sm font-semibold text-slate-700">{member.collaboratorName}</span>
                            <span className="ml-2 text-xs text-slate-400">{member.role}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-rose-500">${cost.toLocaleString()}</span>
                            {collab && collab.baseSalary > 0
                              ? <span className="ml-1 text-xs text-slate-400">fijo</span>
                              : member.feeType === 'Percentage'
                                ? <span className="ml-1 text-xs text-slate-400">{member.feeAmount}%</span>
                                : <span className="ml-1 text-xs text-slate-400">único</span>
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-5">
                <button onClick={() => { setDashboardClient(null); setEditClient(client); }} className="btn-secondary flex-1 text-sm">
                  Editar cliente
                </button>
                <button onClick={() => { handleDownloadBrief(client); }} className="btn-primary flex-1 text-sm">
                  Descargar PDF
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Editar Cliente */}
      {editClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl flex flex-col p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Editar Cliente</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Nombre / Empresa</label>
                  <input type="text" className="input-field" value={editClient.name}
                    onChange={e => setEditClient({...editClient, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">CUIT</label>
                  <input type="text" className="input-field" value={editClient.cuit}
                    placeholder="30-00000000-0"
                    onChange={e => setEditClient({...editClient, cuit: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Responsable</label>
                  <input type="text" className="input-field" value={editClient.responsible}
                    onChange={e => setEditClient({...editClient, responsible: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Moneda</label>
                  <select className="input-field" value={editClient.currency}
                    onChange={e => setEditClient({...editClient, currency: e.target.value})}>
                    <option value="ARS">Pesos (ARS)</option>
                    <option value="USD">Dólares (USD)</option>
                    <option value="EUR">Euros (EUR)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Monto a Cobrar</label>
                  <input type="number" className="input-field"
                    value={editClient.amount === 0 ? '' : editClient.amount}
                    onChange={e => setEditClient({...editClient, amount: e.target.value === '' ? 0 : Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Servicios</label>
                  <input type="text" className="input-field" value={editClient.services}
                    onChange={e => setEditClient({...editClient, services: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1 block">Estado</label>
                  <select className="input-field" value={editClient.status}
                    onChange={e => setEditClient({...editClient, status: e.target.value})}>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="pausado">Pausado</option>
                  </select>
                </div>
              </div>

              {/* Equipo */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-800">Asignación de Honorarios (Equipo)</h3>
                  <button
                    onClick={() => setEditClient({...editClient, team: [...(editClient.team || []), {collaboratorName: '', role: 'Staff', feeType: 'Fixed', feeAmount: 0}]})}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1"
                  >
                    <PlusCircle className="w-3 h-3" /> Añadir
                  </button>
                </div>
                {(!editClient.team || editClient.team.length === 0) && (
                  <p className="text-xs text-slate-400 italic">Sin equipo. Añade para generar los honorarios automáticos del mes.</p>
                )}

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {editClient.team?.map((member, idx) => {
                    const perfil = collaborators.find(c => c.name === member.collaboratorName);
                    const esFijo = perfil && perfil.baseSalary > 0;
                    return (
                      <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div className="flex gap-2 items-center">
                          <select
                            className="bg-white border border-slate-200 text-xs rounded font-semibold text-slate-700 p-1.5 flex-1 min-w-0"
                            value={member.collaboratorName}
                            onChange={e => {
                              const newTeam = [...editClient.team];
                              const seleccionado = collaborators.find(c => c.name === e.target.value);
                              newTeam[idx] = {
                                ...newTeam[idx],
                                collaboratorName: e.target.value,
                                feeType: seleccionado && seleccionado.baseSalary > 0 ? 'Fixed' : 'Percentage',
                                feeAmount: 0,
                                fixedClientAmount: 0,
                              };
                              setEditClient({ ...editClient, team: newTeam });
                            }}
                          >
                            <option value="">Seleccionar...</option>
                            {collaborators.map(c => (
                              <option key={c.id} value={c.name}>
                                {c.name} ({c.role}){c.baseSalary > 0 ? ' · Fijo' : ' · Variable'}
                              </option>
                            ))}
                          </select>

                          {esFijo ? (
                            <input
                              type="number"
                              placeholder="$ asignado a este cliente"
                              className="bg-white border border-slate-200 text-xs rounded p-1.5 w-[40%]"
                              value={member.fixedClientAmount === 0 ? '' : (member.fixedClientAmount || '')}
                              onChange={e => {
                                const newTeam = [...editClient.team];
                                newTeam[idx].fixedClientAmount = e.target.value === '' ? 0 : Number(e.target.value);
                                setEditClient({ ...editClient, team: newTeam });
                              }}
                            />
                          ) : (
                            <>
                              <select
                                className="bg-white border border-slate-200 text-xs rounded p-1.5 w-[30%]"
                                value={member.feeType}
                                onChange={e => {
                                  const newTeam = [...editClient.team];
                                  newTeam[idx].feeType = e.target.value as 'Fixed' | 'Percentage' | 'One-Time';
                                  setEditClient({ ...editClient, team: newTeam });
                                }}
                              >
                                <option value="Percentage">% del monto</option>
                                <option value="One-Time">Precio único</option>
                              </select>
                              <input
                                type="number"
                                placeholder={member.feeType === 'Percentage' ? '% ej: 15' : '$ monto'}
                                className="bg-white border border-slate-200 text-xs rounded p-1.5 w-[22%]"
                                value={member.feeAmount === 0 ? '' : member.feeAmount}
                                onChange={e => {
                                  const newTeam = [...editClient.team];
                                  newTeam[idx].feeAmount = e.target.value === '' ? 0 : Number(e.target.value);
                                  setEditClient({ ...editClient, team: newTeam });
                                }}
                              />
                            </>
                          )}

                          <button
                            onClick={() => setEditClient({ ...editClient, team: editClient.team.filter((_, i) => i !== idx) })}
                            className="text-red-400 hover:text-red-600 p-1 shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {member.collaboratorName && (
                          <p className="text-[10px] text-slate-400 mt-1.5 pl-0.5">
                            {esFijo
                              ? member.fixedClientAmount && member.fixedClientAmount > 0
                                ? `$${member.fixedClientAmount.toLocaleString()} asignados de su honorario fijo a este cliente`
                                : 'Ingresá el monto asignado a este cliente.'
                              : member.feeType === 'Percentage' && member.feeAmount > 0
                                ? `Cobro estimado: $${((editClient.amount * member.feeAmount) / 100).toLocaleString()}`
                                : member.feeType === 'One-Time' && member.feeAmount > 0
                                  ? `Pago único: $${member.feeAmount.toLocaleString()}`
                                  : 'Ingresá el porcentaje o monto.'
                            }
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between items-center">
              <button
                onClick={() => { handleDelete(editClient.id); setEditClient(null); }}
                className="text-red-500 text-sm font-semibold hover:underline"
              >
                Eliminar Cliente
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEditClient(null)} className="btn-secondary">Cerrar</button>
                <button
                  onClick={() => {
                    const isNew = !clients.some(c => c.id === editClient.id);
                    if (isNew) setClients(prev => [...prev, editClient]);
                    else setClients(prev => prev.map(c => c.id === editClient.id ? editClient : c));
                    setEditClient(null);
                  }}
                  className="btn-primary"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
