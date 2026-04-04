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
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` // Default YYYY-MM
  );
  const [preview, setPreview] = useState<any[]>([]);
  const [rawJson, setRawJson] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        setWorkbook(wb);
        
        // Selecciono la primera hoja por defecto
        const firstSheetName = wb.SheetNames[0];
        handleSheetSelection(firstSheetName, wb);
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
    
    // Parsear como array 2D
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
    
    if (rawRows.length === 0) {
      setRawJson([]);
      setPreview([]);
      return;
    }

    // Algoritmo de Auto-Detección de Encabezados Reales
    // Buscamos la fila que tanga palabras clave clásicas: "CLIENTE", "CUIT", "MONTO"
    let headerIndex = 0;
    for (let i = 0; i < Math.min(10, rawRows.length); i++) {
        const rowStr = rawRows[i].join(' ').toUpperCase();
        if (rowStr.includes('CLIENTE') || rowStr.includes('CUIT') || rowStr.includes('MONTO') || rowStr.includes('DETALLE')) {
            headerIndex = i;
            break;
        }
    }

    const headers = rawRows[headerIndex] as string[];
    // Limpiamos los headers (a veces vienen vacíos como "__EMPTY")
    const cleanHeaders = headers.map((h, i) => h ? h.toString().trim() : `Columna_${i}`);

    // Re-mapear la data ignorando la "basura" de las filas superiores al header
    // Y obviamos las filas vacias
    const dataRows = rawRows.slice(headerIndex + 1).filter(row => row.some(cell => cell !== ""));
    
    const formattedJson = dataRows.map(row => {
      let obj: any = {};
      cleanHeaders.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    setRawJson(formattedJson);
    setPreview(formattedJson.slice(0, 5));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleConfirm = () => {
    onImport(rawJson, selectedPeriod); // Enviamos la data + el periodo
    onClose();
    // Limpiar estado
    setFile(null);
    setWorkbook(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-3xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
            <FileSpreadsheet className="text-primary-500" />
            Importador Inteligente Excel
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-text-main hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {!file ? (
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
                isDragActive ? "border-primary-500 bg-primary-50" : "border-slate-300 hover:border-primary-400 hover:bg-slate-50"
              )}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleChange}
                className="hidden" 
              />
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                <UploadCloud className="w-8 h-8 text-primary-500" />
              </div>
              <p className="text-lg font-semibold text-text-main mb-1">Arrastra tu planilla aquí</p>
              <p className="text-sm text-text-muted">Soporta .xlsx, .xls o .csv (Max 10MB)</p>
              <button className="mt-6 btn-secondary text-sm">Buscar en la computadora</button>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-8">
              <div className="flex items-center gap-4 bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold">{file.name}</p>
                </div>
                {workbook && (
                  <div className="flex flex-row gap-4 items-center flex-wrap">
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Hoja a importar:</span>
                    <select 
                      className="text-sm bg-white border border-emerald-200 rounded-md py-1 px-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={selectedSheet}
                      onChange={(e) => handleSheetSelection(e.target.value)}
                    >
                      {workbook.SheetNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Mes al que corresponde:</span>
                    <input 
                      type="month" 
                      className="text-sm bg-white border border-emerald-200 rounded-md py-1 px-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                    />
                  </div>
                  </div>
                )}
                <button onClick={() => {setFile(null); setWorkbook(null)}} className="ml-2 text-sm font-semibold underline opacity-70 hover:opacity-100">Cambiar</button>
              </div>

              {preview.length > 0 && (
                <div>
                  <h3 className="font-bold text-text-main mb-3">Filas Detectadas de la Hoja "{selectedSheet}"</h3>
                  <div className="border border-border rounded-xl overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b border-border text-slate-500 font-semibold text-xs uppercase">
                        <tr>
                          {Object.keys(preview[0]).slice(0, 6).map((header, i) => (
                            <th key={i} className="px-4 py-3 whitespace-nowrap">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {preview.map((row, idx) => (
                          <tr key={idx}>
                            {Object.values(row).slice(0, 6).map((val: any, j) => (
                              <td key={j} className="px-4 py-3 text-slate-600 truncate max-w-[150px]">
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {file && (
          <div className="border-t border-border p-6 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
            <button onClick={onClose} className="btn-secondary rounded-lg">Cancelar</button>
            <button onClick={handleConfirm} className="btn-primary rounded-lg shadow-md shadow-primary-500/20">Ingresar estos datos</button>
          </div>
        )}
      </div>
    </div>
  );
}
