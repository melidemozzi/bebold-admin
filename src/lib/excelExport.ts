import * as XLSX from 'xlsx';
import type { Income, Expense, CajaEntry, Collaborator } from '../context/AppContext';

export function exportMonthlyExcel(
  period: string,
  incomes: Income[],
  expenses: Expense[],
  collaborators: Collaborator[]
) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    incomes.length > 0 ? incomes.map(i => ({
      Fecha: i.date, Cliente: i.client, Tipo: i.type,
      'Método de Cobro': i.method, Monto: i.amount, Estado: i.status, Notas: i.notes || '',
    })) : [{ Fecha: '', Cliente: '', Tipo: '', 'Método de Cobro': '', Monto: '', Estado: '', Notas: '' }]
  ), 'Ingresos');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    expenses.length > 0 ? expenses.map(e => ({
      Fecha: e.date, Descripción: e.desc, Categoría: e.category,
      Monto: e.amount, Método: e.method, Recurrente: e.isRecurrent ? 'Sí' : 'No', Notas: e.notes || '',
    })) : [{ Fecha: '', Descripción: '', Categoría: '', Monto: '', Método: '', Recurrente: '', Notas: '' }]
  ), 'Gastos');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    collaborators.length > 0 ? collaborators.map(c => ({
      Colaborador: c.name, Rol: c.role, 'Honorario Base': c.baseSalary,
    })) : [{ Colaborador: '', Rol: '', 'Honorario Base': '' }]
  ), 'Equipo');

  XLSX.writeFile(wb, `BeBold_${period}.xlsx`);
}

export function exportCajaExcel(entries: CajaEntry[], period: string) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    entries.length > 0 ? entries.map(e => ({
      Fecha: e.date, Descripción: e.desc, Cuenta: e.account,
      Tipo: e.type === 'entrada' ? 'Entrada' : 'Salida', Monto: e.amount,
    })) : [{ Fecha: '', Descripción: '', Cuenta: '', Tipo: '', Monto: '' }]
  ), 'Caja');
  XLSX.writeFile(wb, `BeBold_Caja_${period}.xlsx`);
}

export function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb,
    XLSX.utils.aoa_to_sheet([
      ['Fecha (YYYY-MM-DD)', 'Cliente', 'Tipo', 'Método de Cobro', 'Monto', 'Estado', 'Notas'],
      ['2026-04-01', 'Nombre Cliente', 'Facturada', 'Transferencia', '0', 'Cobrado', ''],
    ]),
    'Ingresos');

  XLSX.utils.book_append_sheet(wb,
    XLSX.utils.aoa_to_sheet([
      ['Fecha (YYYY-MM-DD)', 'Descripción', 'Categoría', 'Monto', 'Método de Pago', 'Recurrente (Sí/No)'],
      ['2026-04-01', 'Ej: Canva Pro', 'Fijo', '0', 'Transferencia', 'Sí'],
    ]),
    'Gastos');

  XLSX.utils.book_append_sheet(wb,
    XLSX.utils.aoa_to_sheet([
      ['Nombre/Empresa', 'CUIT', 'Monto a Cobrar'],
      ['Nombre Cliente', '30-00000000-0', '0'],
    ]),
    'Clientes');

  XLSX.utils.book_append_sheet(wb,
    XLSX.utils.aoa_to_sheet([
      ['Nombre', 'Rol', 'Monto'],
      ['Nombre Colaborador', 'Rol', '0'],
    ]),
    'Adicionales Sueldos');

  XLSX.writeFile(wb, 'BeBold_Template_Carga.xlsx');
}
