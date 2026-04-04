import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Invoice } from '../context/AppContext';
import { Plus, Pencil, Trash2, Download, Filter, X, FileText, CheckCircle, Clock, Ban } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Constantes ────────────────────────────────────────────────
const EMISORES = ['Meli', 'Sofi', 'Agencia'];
const CURRENCIES = ['ARS', 'USD'];
const STATUSES: Invoice['status'][] = ['pendiente', 'emitida', 'cobrada', 'anulada'];

const STATUS_LABEL: Record<Invoice['status'], string> = {
  pendiente: 'Pendiente',
  emitida: 'Emitida',
  cobrada: 'Cobrada',
  anulada: 'Anulada',
};

const STATUS_STYLE: Record<Invoice['status'], string> = {
  pendiente: 'bg-amber-50 text-amber-700 border border-amber-200',
  emitida:   'bg-blue-50 text-blue-700 border border-blue-200',
  cobrada:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  anulada:   'bg-slate-100 text-slate-500 border border-slate-200 line-through',
};

const STATUS_ICON: Record<Invoice['status'], typeof Clock> = {
  pendiente: Clock,
  emitida:   FileText,
  cobrada:   CheckCircle,
  anulada:   Ban,
};

function fmt(n: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

// ── Tipos locales ─────────────────────────────────────────────
interface Filters {
  emisor: string;
  status: string;
  currency: string;
  from: string;
  to: string;
  search: string;
}

const EMPTY_FILTERS: Filters = { emisor: '', status: '', currency: '', from: '', to: '', search: '' };

// ── Componente principal ──────────────────────────────────────
export default function Billing() {
  const { invoices, setInvoices, clients } = useAppContext();

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);

  // ── Filtrado ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      if (filters.emisor && inv.emisor !== filters.emisor) return false;
      if (filters.status && inv.status !== filters.status) return false;
      if (filters.currency && inv.currency !== filters.currency) return false;
      if (filters.from && inv.date < filters.from) return false;
      if (filters.to && inv.date > filters.to) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!inv.client.toLowerCase().includes(q) && !inv.numero.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [invoices, filters]);

  // ── KPIs por emisor ───────────────────────────────────────
  const kpis = useMemo(() => {
    return EMISORES.map(emisor => {
      const mine = invoices.filter(inv => inv.emisor === emisor && inv.status !== 'anulada');
      const cobradas = mine.filter(inv => inv.status === 'cobrada');
      const pendientes = mine.filter(inv => inv.status !== 'cobrada');
      const totalARS = mine.filter(inv => inv.currency === 'ARS').reduce((s, i) => s + i.amount, 0);
      const totalUSD = mine.filter(inv => inv.currency === 'USD').reduce((s, i) => s + i.amount, 0);
      return { emisor, count: mine.length, cobradas: cobradas.length, pendientes: pendientes.length, totalARS, totalUSD };
    });
  }, [invoices]);

  // ── Acciones ──────────────────────────────────────────────
  function openNew() {
    setEditInvoice({
      id: 0,
      date: new Date().toISOString().split('T')[0],
      numero: '',
      client: '',
      amount: 0,
      currency: 'ARS',
      emisor: EMISORES[0],
      status: 'pendiente',
      notes: '',
    });
    setModalOpen(true);
  }

  function openEdit(inv: Invoice) {
    setEditInvoice({ ...inv });
    setModalOpen(true);
  }

  function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta factura?')) return;
    setInvoices(prev => prev.filter(i => i.id !== id));
  }

  function handleSave() {
    if (!editInvoice) return;
    const isNew = editInvoice.id === 0 || !invoices.some(i => i.id === editInvoice.id);
    if (isNew) {
      setInvoices(prev => [...prev, { ...editInvoice, id: Date.now() }]);
    } else {
      setInvoices(prev => prev.map(i => i.id === editInvoice.id ? editInvoice : i));
    }
    setModalOpen(false);
  }

  // ── Exportar PDF ──────────────────────────────────────────
  function exportPDF() {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Registro de Facturación — Be Böld', 14, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')}`, 14, 26);

    autoTable(doc, {
      startY: 32,
      head: [['Fecha', 'N° Comp.', 'Cliente', 'Emisor', 'Monto', 'Moneda', 'Estado', 'Notas']],
      body: filtered.map(inv => [
        inv.date,
        inv.numero,
        inv.client,
        inv.emisor,
        inv.amount.toLocaleString('es-AR'),
        inv.currency,
        STATUS_LABEL[inv.status],
        inv.notes,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [192, 38, 211], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 245, 255] },
    });

    doc.save('facturacion-bebold.pdf');
  }

  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-main font-display">Facturación</h1>
          <p className="text-sm text-text-muted mt-0.5">Registro de comprobantes ARCA por monotributo</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(p => !p)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-all ${showFilters || activeFilters > 0 ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-surface border-border text-text-muted hover:border-primary-300'}`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {activeFilters > 0 && <span className="bg-primary-500 text-white text-xs rounded-full px-1.5">{activeFilters}</span>}
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-muted hover:border-primary-300 hover:text-primary-600 transition-all"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary-500 text-white shadow-md shadow-primary-500/20 hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva factura
          </button>
        </div>
      </div>

      {/* KPI Cards por emisor */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map(k => (
          <div key={k.emisor} className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Monotributo</p>
                <p className="text-xl font-extrabold text-text-main font-display">{k.emisor}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-500" />
              </div>
            </div>
            <div className="space-y-1">
              {k.totalARS > 0 && <p className="text-lg font-bold text-text-main">{fmt(k.totalARS, 'ARS')}</p>}
              {k.totalUSD > 0 && <p className="text-base font-semibold text-emerald-600">{fmt(k.totalUSD, 'USD')}</p>}
              {k.totalARS === 0 && k.totalUSD === 0 && <p className="text-sm text-text-muted">Sin facturas</p>}
            </div>
            <div className="flex gap-3 mt-3 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                {k.cobradas} cobradas
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                {k.pendientes} pendientes
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <input
              type="text"
              placeholder="Buscar cliente o N°..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="col-span-2 sm:col-span-1 border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <select value={filters.emisor} onChange={e => setFilters(f => ({ ...f, emisor: e.target.value }))}
              className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300">
              <option value="">Todos los emisores</option>
              {EMISORES.map(e => <option key={e}>{e}</option>)}
            </select>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300">
              <option value="">Todos los estados</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <select value={filters.currency} onChange={e => setFilters(f => ({ ...f, currency: e.target.value }))}
              className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300">
              <option value="">Todas las monedas</option>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
              className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300" />
            <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
              className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300" />
          </div>
          {activeFilters > 0 && (
            <button onClick={() => setFilters(EMPTY_FILTERS)}
              className="mt-3 text-xs text-primary-500 hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">N° Comp.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Emisor</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Monto</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Notas</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-muted text-sm">
                    No hay facturas registradas. Creá una con el botón de arriba.
                  </td>
                </tr>
              ) : filtered.map(inv => {
                const StatusIcon = STATUS_ICON[inv.status];
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text-main whitespace-nowrap">{inv.date}</td>
                    <td className="px-4 py-3 text-sm font-mono text-text-muted">{inv.numero || '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-text-main">{inv.client}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100">
                        {inv.emisor}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-text-main text-right whitespace-nowrap">
                      {fmt(inv.amount, inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${STATUS_STYLE[inv.status]}`}>
                        <StatusIcon className="w-3 h-3" />
                        {STATUS_LABEL[inv.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted max-w-[140px] truncate">{inv.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(inv)}
                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(inv.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-slate-50 flex flex-wrap gap-4 items-center justify-between text-xs text-text-muted">
            <span>{filtered.length} {filtered.length === 1 ? 'factura' : 'facturas'}</span>
            <div className="flex gap-4">
              {['ARS', 'USD'].map(curr => {
                const total = filtered.filter(i => i.currency === curr && i.status !== 'anulada').reduce((s, i) => s + i.amount, 0);
                if (total === 0) return null;
                return (
                  <span key={curr} className="font-semibold text-text-main">
                    Total {curr}: <span className="text-primary-600">{fmt(total, curr)}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && editInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg border border-border">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="text-lg font-bold text-text-main font-display">
                {editInvoice.id === 0 || !invoices.some(i => i.id === editInvoice.id) ? 'Nueva factura' : 'Editar factura'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Fecha</label>
                  <input type="date" value={editInvoice.date}
                    onChange={e => setEditInvoice(p => p ? { ...p, date: e.target.value } : p)}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">N° Comprobante</label>
                  <input type="text" placeholder="0001-00000001" value={editInvoice.numero}
                    onChange={e => setEditInvoice(p => p ? { ...p, numero: e.target.value } : p)}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Cliente</label>
                <input list="billing-clients" type="text" placeholder="Nombre del cliente" value={editInvoice.client}
                  onChange={e => setEditInvoice(p => p ? { ...p, client: e.target.value } : p)}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300" />
                <datalist id="billing-clients">
                  {clients.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Emisor (Monotributo)</label>
                  <select value={editInvoice.emisor}
                    onChange={e => setEditInvoice(p => p ? { ...p, emisor: e.target.value } : p)}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300">
                    {EMISORES.map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Estado</label>
                  <select value={editInvoice.status}
                    onChange={e => setEditInvoice(p => p ? { ...p, status: e.target.value as Invoice['status'] } : p)}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300">
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Monto</label>
                  <input type="number" min={0} placeholder="0"
                    value={editInvoice.amount === 0 ? '' : editInvoice.amount}
                    onChange={e => setEditInvoice(p => p ? { ...p, amount: e.target.value === '' ? 0 : Number(e.target.value) } : p)}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Moneda</label>
                  <select value={editInvoice.currency}
                    onChange={e => setEditInvoice(p => p ? { ...p, currency: e.target.value } : p)}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300">
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Notas</label>
                <textarea rows={2} placeholder="Observaciones, período, etc."
                  value={editInvoice.notes}
                  onChange={e => setEditInvoice(p => p ? { ...p, notes: e.target.value } : p)}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text-main border border-border rounded-xl hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave}
                className="px-5 py-2.5 text-sm font-semibold bg-primary-500 text-white rounded-xl shadow-md shadow-primary-500/20 hover:bg-primary-600 transition-colors">
                Guardar factura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
