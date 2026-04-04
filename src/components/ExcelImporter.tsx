import { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, X, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';

interface ExcelImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[], period: string) => void;
}

export default function ExcelImporter({ isOpen, onClose, onImport }: ExcelImporterProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [preview, setPreview] = useState<any[]>([]);
  const [rawJson, setRawJson] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);

  // Mapeo manual de columnas
  const [colCliente, setColCliente] = useState('');
  const [colMonto, setColMonto] = useState('');
  const [colCuit, setColCuit] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true);
    else if (e.type === 'dragleave') setIsDragActive(false);
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        setWorkbook(wb);
        handleSheetSelection(wb.SheetNames[0], wb);
      } catch (err) {
        console.error("Error parsing Excel:", err);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleSheetSelection = (sheetName: string, activeWb: XLSX.WorkBook | null = workbook) => {
    if (!activeWb) return;
    setSelectedSheet(sheetName);
    const worksheet = activeWb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

    if (rawRows.length === 0) { setRawJson([]); setPreview([]); setColumns([]); return; }

    // Auto-detectar fila de encabezados
    let headerIndex = 0;
    for (let i = 0; i < Math.min(10, rawRows.length); i++) {
      const rowStr = rawRows[i].join(' ').toUpperCase();
      if (rowStr.includes('CLIENTE') || rowStr.includes('CUIT') || rowStr.includes('MONTO') || rowStr.includes('DETALLE')) {
        headerIndex = i;
        break;
      }
    }

    const headers = (rawRows[headerIndex] as string[]).map((h, i) => h ? h.toString().trim() : `Columna_${i}`);
    const dataRows = rawRows.slice(headerIndex + 1).filter(row => row.some(cell => cell !== ""));
    const formattedJson = dataRows.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => { obj[header] = row[index]; });
      return obj;
    });

    setColumns(headers);
    setRawJson(formattedJson);
    setPreview(formattedJson.slice(0, 5));

    // Auto-seleccionar columnas más probables
    const clienteCol = headers.find(h => h.toUpperCase().includes('CLIENTE') || h.toUpperCase().includes('NOMBRE')) || '';
    const cuitCol = headers.find(h => h.toUpperCase().includes('CUIT')) || '';
    const montoActual = headers.find(h => h.toUpperCase().includes('ACTUAL'));
    const montoGeneral = headers.find(h => h.toUpperCase().includes('MONTO'));
    setColCliente(clienteCol);
    setColCuit(cuitCol);
    setColMonto(montoActual || montoGeneral || '');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const parseNum = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    const str = val.toString().replace(/\./g, '').replace(',', '.');
    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
  };

  const handleConfirm = () => {
    try {
      alert(`rawJson tiene ${rawJson.length} filas. Cliente: "${colCliente}", Monto: "${colMonto}"`);
      const mapped = rawJson.map((row, i) => ({
        id: Date.now() + i,
        date: selectedPeriod + '-01',
        client: colCliente ? String(row[colCliente] || '') : '',
        cuit: colCuit ? String(row[colCuit] || '') : '',
        amount: colMonto ? parseNum(row[colMonto]) : 0,
        type: 'Facturada',
        method: 'Transferencia',
        status: 'Cobrado',
      })).filter(r => r.client.trim() !== '');

      alert(`Después de mapear: ${mapped.length} registros`);
      onImport(mapped, selectedPeriod);
      onClose();
      setFile(null); setWorkbook(null); setColumns([]); setColCliente(''); setColMonto(''); setColCuit('');
    } catch(e: any) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-3xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
            <FileSpreadsheet className="text-primary-500" />
            Importador de Excel
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-text-main hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {!file ? (
            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
                isDragActive ? "border-primary-500 bg-primary-50" : "border-slate-300 hover:border-primary-400 hover:bg-slate-50"
              )}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleChange} className="hidden" />
              <UploadCloud className="w-10 h-10 text-primary-500 mb-4" />
              <p className="text-lg font-semibold text-text-main mb-1">Arrastrá tu planilla aquí</p>
              <p className="text-sm text-text-muted">Soporta .xlsx, .xls o .csv</p>
              <button className="mt-6 btn-secondary text-sm">Buscar en la computadora</button>
            </div>
          ) : (
            <>
              {/* Archivo cargado */}
              <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="font-semibold text-sm flex-1">{file.name}</span>
                <button onClick={() => { setFile(null); setWorkbook(null); setColumns([]); }} className="text-xs underline opacity-70">Cambiar</button>
              </div>

              {/* Configuración */}
              <div className="grid grid-cols-2 gap-4">
                {workbook && workbook.SheetNames.length > 1 && (
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Hoja</label>
                    <select value={selectedSheet} onChange={e => handleSheetSelection(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300">
                      {workbook.SheetNames.map(n => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Período</label>
                  <input type="month" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary-300" />
                </div>
              </div>

              {/* Mapeo de columnas */}
              {columns.length > 0 && (
                <div className="bg-slate-50 border border-border rounded-xl p-4 space-y-3">
                  <p className="text-sm font-bold text-text-main">¿Cuál columna es cada dato?</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">Columna CLIENTE</label>
                      <select value={colCliente} onChange={e => setColCliente(e.target.value)}
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300">
                        <option value="">— seleccionar —</option>
                        {columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">Columna CUIT <span className="text-slate-400 normal-case">(opcional)</span></label>
                      <select value={colCuit} onChange={e => setColCuit(e.target.value)}
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300">
                        <option value="">— no incluir —</option>
                        {columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">Columna MONTO</label>
                      <select value={colMonto} onChange={e => setColMonto(e.target.value)}
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300">
                        <option value="">— seleccionar —</option>
                        {columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview */}
              {preview.length > 0 && colCliente && colMonto && (
                <div>
                  <p className="text-sm font-bold text-text-main mb-2">Vista previa</p>
                  <div className="border border-border rounded-xl overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-border">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted uppercase">Cliente</th>
                          {colCuit && <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted uppercase">CUIT</th>}
                          <th className="px-4 py-2 text-right text-xs font-semibold text-text-muted uppercase">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {preview.map((row, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 text-slate-700">{row[colCliente]}</td>
                            {colCuit && <td className="px-4 py-2 text-slate-500 font-mono text-xs">{row[colCuit]}</td>}
                            <td className="px-4 py-2 text-right font-semibold text-emerald-600">${parseNum(row[colMonto]).toLocaleString('es-AR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {file && colCliente && colMonto && (
          <div className="border-t border-border p-6 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
            <button onClick={onClose} className="btn-secondary rounded-lg">Cancelar</button>
            <button onClick={handleConfirm} className="btn-primary rounded-lg shadow-md shadow-primary-500/20">
              Importar {rawJson.length} registros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
