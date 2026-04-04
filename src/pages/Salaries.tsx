import { useState, useMemo } from 'react';
import { Calculator, FileText, ArrowUpCircle, Upload, PlusCircle, X } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAppContext } from '../context/AppContext';
import ExcelImporter from '../components/ExcelImporter';

export default function Salaries() {
  const { clients, collaborators } = useAppContext();
  // Ajustes aplicados: { collabId: number | 'all', percent: number, label: string }
  const [ajustes, setAjustes] = useState<{ collabId: number | 'all'; percent: number; label: string }[]>([]);
  const [pendingCollabId, setPendingCollabId] = useState<string>('all');
  const [pendingPercent, setPendingPercent] = useState<string>('');
  
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` // Default YYYY-MM
  );
  
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [manualRows, setManualRows] = useState<any[]>([]);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ nombre: '', monto: '' });

  // MOTOR DE CÁLCULO: fijos cobran su honorario mensual sin desglose de clientes.
  // Variables cobran por porcentaje asignado en cada cuenta.
  const derivedSalaries = useMemo(() => {
    return collaborators.map(collab => {
      const details: { concept: string; amount: number }[] = [];
      let commTotal = 0;

      if (collab.baseSalary > 0) {
        // HONORARIO FIJO: se paga el monto de la ficha, punto.
        // No se desglosa por clientes (privacidad de la agencia).
        details.push({ concept: 'Honorario Fijo Mensual', amount: collab.baseSalary });
      } else {
        // HONORARIO VARIABLE: se calcula por los clientes asignados
        clients.forEach(client => {
          const membership = client.team?.find(t => t.collaboratorName === collab.name);
          if (!membership) return;
          let earned = 0;
          if (membership.feeType === 'Percentage' && membership.feeAmount > 0) {
            earned = (client.amount * membership.feeAmount) / 100;
            details.push({
              concept: `${client.name} — ${membership.feeAmount}% sobre $${client.amount.toLocaleString()}`,
              amount: earned
            });
          } else if (membership.feeType === 'One-Time' && membership.feeAmount > 0) {
            earned = membership.feeAmount;
            details.push({
              concept: `${client.name} — Pago único`,
              amount: earned
            });
          }
          commTotal += earned;
        });
      }

      // Ajustes aplicados para este colaborador
      const totalPreBonus = collab.baseSalary + commTotal;
      let finalBonus = 0;
      ajustes
        .filter(a => a.collabId === 'all' || a.collabId === collab.id)
        .forEach(a => {
          const bonus = (totalPreBonus * a.percent) / 100;
          finalBonus += bonus;
          details.push({ concept: `Ajuste aplicado (+${a.percent}%) — ${a.label}`, amount: bonus });
        });

      return {
        id: collab.id,
        date: selectedPeriod + '-01',
        collaborator: collab.name,
        role: collab.role,
        base: collab.baseSalary,
        commission: commTotal + finalBonus,
        total: totalPreBonus + finalBonus,
        details,
        esFijo: collab.baseSalary > 0,
      };
    }).filter(s => s.total > 0);
  }, [clients, collaborators, ajustes, selectedPeriod]);


  // Generar PDF Recibo — fijos: honorario simple / variables: desglose por cliente
  const handleDownloadSlip = (sal: typeof derivedSalaries[0]) => {
    const doc = new jsPDF();

    // Header magenta
    doc.setFillColor(217, 70, 239);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('Be Böld Studio — Comprobante de Honorarios', 14, 20);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(13);
    doc.text(`${sal.collaborator} · ${sal.role}`, 14, 44);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Período: ${selectedPeriod}`, 14, 51);

    if (sal.esFijo) {
      // FIJO: tabla simple, sin mencionar clientes
      autoTable(doc, {
        startY: 60,
        headStyles: { fillColor: [248, 250, 252] as [number, number, number], textColor: [71, 85, 105], fontStyle: 'bold' },
        bodyStyles: { textColor: [30, 41, 59] },
        head: [['Concepto', 'Monto (ARS)']],
        body: [
          ['Honorario Fijo Mensual', `$${sal.base.toLocaleString()}`],
          ...(sal.commission > 0 ? [['Ajuste / Adicional', `$${sal.commission.toLocaleString()}`]] : []),
          [{ content: 'Total a Transferir', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
           { content: `$${sal.total.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
        ],
      });
    } else {
      // VARIABLE: desglose detallado por cliente
      const rows = sal.details.map(d => [d.concept, `$${d.amount.toLocaleString()}`]);
      autoTable(doc, {
        startY: 60,
        headStyles: { fillColor: [248, 250, 252] as [number, number, number], textColor: [71, 85, 105], fontStyle: 'bold' },
        bodyStyles: { textColor: [30, 41, 59] },
        head: [['Detalle por Cuenta', 'Monto (ARS)']],
        body: [
          ...rows,
          [{ content: 'Total a Transferir', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
           { content: `$${sal.total.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
        ],
      });
    }

    const finalY = (doc as any).lastAutoTable.finalY || 70;
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('Generado automáticamente por el sistema de gestión Be Böld Studio.', 14, finalY + 12);

    doc.save(`Recibo_${sal.collaborator.replace(/ /g, '_')}_${selectedPeriod}.pdf`);
  };

  const allSalaries = useMemo(() => [...derivedSalaries, ...manualRows], [derivedSalaries, manualRows]);
  const totalSalaries = allSalaries.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full pb-8">
      {/* Header Contextual */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-main font-display flex items-center gap-2">Monitor de Sueldos y Honorarios</h1>
            <span className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md bg-emerald-100 text-emerald-700 font-mono shadow-sm">
              Automated
            </span>
          </div>
          <p className="text-text-muted mt-1 text-sm">Calculadora viva. Basado en la información ingresada individualmente en "Directorio".</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsImporterOpen(true)}
            className="btn-secondary flex items-center gap-2 text-sm shadow-sm"
          >
            <Upload className="w-4 h-4" /> Importar Adicionales
          </button>
          <button
            onClick={() => { setManualForm({ nombre: '', monto: '' }); setIsManualOpen(true); }}
            className="btn-primary flex items-center gap-2 text-sm shadow-md"
          >
            <PlusCircle className="w-4 h-4 text-white" /> Carga Manual
          </button>
        </div>
      </div>

      {/* Action / Filtering Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="card p-5 md:col-span-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-l-4 border-l-primary-500">
           <div className="flex items-center gap-4 w-full">
              <Calculator className="w-10 h-10 text-primary-200 hidden sm:block" />
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Volumen Salarial del Período</p>
                <p className="text-3xl font-extrabold text-slate-800">${totalSalaries.toLocaleString()}</p>
              </div>
           </div>
           <div className="w-full sm:w-auto">
             <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Selector de Período</label>
             <input type="month" className="input-field shadow-sm w-full" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} />
           </div>
        </div>

        <div className="card p-5 md:col-span-4 flex flex-col gap-3 bg-gradient-to-br from-slate-800 to-slate-900 border-transparent shadow-xl">
          <label className="text-xs font-semibold uppercase text-slate-300 flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-emerald-400" /> Aumento / Paritaria
          </label>

          {/* Form */}
          <div className="flex flex-col gap-2">
            <select
              className="bg-slate-700/50 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none"
              value={pendingCollabId}
              onChange={e => setPendingCollabId(e.target.value)}
            >
              <option value="all">Todos los colaboradores</option>
              {collaborators.map(c => (
                <option key={c.id} value={String(c.id)}>{c.name} ({c.role})</option>
              ))}
            </select>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  max="200"
                  placeholder="Ej: 15"
                  className="bg-slate-700/50 border border-slate-600 text-white rounded-lg px-3 py-2 w-full text-lg font-bold focus:outline-none focus:border-emerald-500"
                  value={pendingPercent}
                  onChange={e => setPendingPercent(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
              <button
                onClick={() => {
                  const pct = Number(pendingPercent);
                  if (!pct || pct <= 0) return;
                  const collab = collaborators.find(c => String(c.id) === pendingCollabId);
                  const label = pendingCollabId === 'all' ? 'Todos' : (collab?.name ?? '');
                  setAjustes(prev => [...prev, {
                    collabId: pendingCollabId === 'all' ? 'all' : Number(pendingCollabId),
                    percent: pct,
                    label,
                  }]);
                  setPendingPercent('');
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                Aplicar
              </button>
            </div>
          </div>

          {/* Ajustes aplicados */}
          {ajustes.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1 max-h-28 overflow-y-auto">
              {ajustes.map((a, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-700/40 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-slate-300">
                    <span className="font-bold text-emerald-400">+{a.percent}%</span>
                    {' — '}{a.label}
                  </span>
                  <button onClick={() => setAjustes(prev => prev.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400 ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* Tabla de Resultados Calculados */}
      <div className="card flex-1 overflow-hidden border-transparent shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-border text-slate-500 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Colaborador</th>
                <th className="px-6 py-4">Bases Fijas Adheridas</th>
                <th className="px-6 py-4">Comisiones y Porcentajes</th>
                <th className="px-6 py-4 text-primary-600 font-bold">Distribución Total Calculada</th>
                <th className="px-6 py-4 text-center rounded-tr-xl">Descargar Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-white">
              {allSalaries.map((sal) => (
                <tr key={sal.id} className="hover:bg-primary-50/30 transition-colors group">
                  <td className="px-6 py-4 font-bold text-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shadow-sm">
                        {sal.collaborator.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        {sal.collaborator}
                        <span className="block text-[11px] font-semibold text-slate-400 mt-0.5">{sal.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">${sal.base.toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="flex flex-col gap-1 items-start">
                      {sal.esFijo ? (
                        <span className="text-[10px] uppercase font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                          Honorario fijo
                        </span>
                      ) : (
                        <>
                          <span className="font-semibold text-slate-700">${sal.commission.toLocaleString()}</span>
                          <span className="text-[10px] uppercase text-primary-600 font-bold bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100">
                            {sal.details.length} cuenta{sal.details.length !== 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-black text-lg text-emerald-600 tabular-nums bg-emerald-50/10">
                    ${sal.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                     <button onClick={() => handleDownloadSlip(sal)} className="p-2.5 text-primary-500 hover:text-white hover:bg-primary-500 rounded-lg transition-all shadow-sm border border-primary-100 hover:border-transparent group-hover:scale-110" title="Descargar Recibo de Liquidación">
                       <FileText className="w-5 h-5 mx-auto" />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {allSalaries.length === 0 && (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-center">
              <Calculator className="w-12 h-12 mb-4 text-slate-200" />
              <p className="font-semibold text-slate-600">No hay sueldos por computar.</p>
              <p className="text-sm mt-1">Asegurate de crear a tu Equipo, e ir al directorio de Clientes a asignarles cuentas y porcentajes.</p>
            </div>
          )}
        </div>
      </div>
      {/* Modal Carga Manual de Bono/Pago Ad-hoc */}
      {isManualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Pago / Bono Ad-hoc</h2>
              <button onClick={() => setIsManualOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Nombre del colaborador</label>
                <input
                  type="text"
                  className="input-field w-full"
                  placeholder="Ej: Freelancer Externo"
                  value={manualForm.nombre}
                  onChange={e => setManualForm({ ...manualForm, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Monto (ARS)</label>
                <input
                  type="number"
                  className="input-field w-full"
                  placeholder="Ej: 50000"
                  value={manualForm.monto}
                  onChange={e => setManualForm({ ...manualForm, monto: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsManualOpen(false)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => {
                  if (!manualForm.nombre.trim() || !manualForm.monto) return;
                  setManualRows(prev => [...prev, {
                    id: Date.now(), date: selectedPeriod + '-01',
                    collaborator: manualForm.nombre.trim(), role: 'Ad-hoc', base: 0,
                    commission: Number(manualForm.monto), total: Number(manualForm.monto),
                    details: [{ concept: 'Pago Manual / Bono Especial', amount: Number(manualForm.monto) }]
                  }]);
                  setIsManualOpen(false);
                }}
                className="btn-primary"
              >Agregar</button>
            </div>
          </div>
        </div>
      )}

      <ExcelImporter isOpen={isImporterOpen} onClose={() => setIsImporterOpen(false)} onImport={(data) => {
         const parsed = data.map((d: any) => ({
             id: Date.now() + Math.random(),
             date: selectedPeriod + '-01',
             collaborator: d.Nombre || d.Colaborador || 'Desconocido',
             role: d.Rol || d.Area || 'Extra',
             base: 0,
             commission: Number(d.Monto || d.Total || 0),
             total: Number(d.Monto || d.Total || 0),
             details: [{ concept: 'Importado de Excel externo', amount: Number(d.Monto || d.Total || 0) }]
         })).filter(x => x.total > 0);
         setManualRows([...manualRows, ...parsed]);
      }} />
    </div>
  );
}
