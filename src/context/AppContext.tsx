import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { supabase } from '../lib/supabase';

// --- INTERFACES ---
export interface TeamMember {
  collaboratorName: string;
  role: string;
  feeType: 'Fixed' | 'Percentage' | 'One-Time';
  feeAmount: number;
  fixedClientAmount?: number; // monto fijo asignado a este cliente (para colaboradores de honorario fijo)
}

export interface Client {
  id: number;
  name: string;
  cuit: string;
  country: string;
  currency: string;
  responsible: string;
  status: string;
  services: string;
  start_date: string;
  amount: number;
  notes: string;
  team: TeamMember[];
}

export interface Collaborator {
  id: number;
  name: string;
  role: string;
  bankDetails: string;
  isBilling: boolean;
  baseSalary: number;
}

export interface Income {
  id: number;
  date: string;
  client: string;
  type: string;
  method: string;
  amount: number;
  status: string;
  notes?: string;
}

export interface Expense {
  id: number;
  date: string;
  desc: string;
  category: string;
  amount: number;
  method: string;
  isRecurrent: boolean;
  notes?: string;
}

export interface Invoice {
  id: number;
  date: string;
  numero: string;
  client: string;
  amount: number;
  currency: string;
  emisor: string;
  status: 'pendiente' | 'emitida' | 'cobrada' | 'anulada';
  notes: string;
}

export const CAJA_ACCOUNTS = ['Cash $', 'Cash USD', 'Cuenta Meli', 'Cuenta Sofi'] as const;
export type CajaAccount = typeof CAJA_ACCOUNTS[number];

export interface CajaEntry {
  id: number;
  date: string;
  account: CajaAccount;
  type: 'entrada' | 'salida';
  amount: number;
  desc: string;
}

// --- MAPEOS DB ↔ APP ---
function mapDbCollaborator(row: any): Collaborator {
  return { id: row.id, name: row.name, role: row.role, bankDetails: row.bank_details ?? '', isBilling: row.is_billing ?? false, baseSalary: row.base_salary ?? 0 };
}
function mapCollaboratorToDb(c: Collaborator) {
  return { id: c.id, name: c.name, role: c.role, bank_details: c.bankDetails, is_billing: c.isBilling, base_salary: c.baseSalary };
}

function mapDbClient(row: any): Client {
  return { id: row.id, name: row.name, cuit: row.cuit ?? '', country: row.country ?? 'Argentina', currency: row.currency ?? 'ARS', responsible: row.responsible ?? '', status: row.status ?? 'activo', services: row.services ?? '', start_date: row.start_date ?? '', amount: row.amount ?? 0, notes: row.notes ?? '', team: row.team ?? [] };
}
function mapClientToDb(c: Client) {
  return { id: c.id, name: c.name, cuit: c.cuit, country: c.country, currency: c.currency, responsible: c.responsible, status: c.status, services: c.services, start_date: c.start_date, amount: c.amount, notes: c.notes, team: c.team };
}

function mapDbIncome(row: any): Income {
  return { id: row.id, date: row.date ?? '', client: row.client ?? '', type: row.type ?? '', method: row.method ?? '', amount: row.amount ?? 0, status: row.status ?? 'Pendiente', notes: row.notes ?? '' };
}
function mapIncomeToDb(i: Income) {
  return { id: i.id, date: i.date, client: i.client, type: i.type, method: i.method, amount: i.amount, status: i.status, notes: i.notes ?? '' };
}

function mapDbExpense(row: any): Expense {
  return { id: row.id, date: row.date ?? '', desc: row.description ?? '', category: row.category ?? 'Variable', amount: row.amount ?? 0, method: row.method ?? '', isRecurrent: row.is_recurrent ?? false };
}
function mapExpenseToDb(e: Expense) {
  return { id: e.id, date: e.date, description: e.desc, category: e.category, amount: e.amount, method: e.method, is_recurrent: e.isRecurrent };
}

function mapDbInvoice(row: any): Invoice {
  return { id: row.id, date: row.date ?? '', numero: row.numero ?? '', client: row.client ?? '', amount: row.amount ?? 0, currency: row.currency ?? 'ARS', emisor: row.emisor ?? '', status: row.status ?? 'pendiente', notes: row.notes ?? '' };
}
function mapInvoiceToDb(i: Invoice) {
  return { id: i.id, date: i.date, numero: i.numero, client: i.client, amount: i.amount, currency: i.currency, emisor: i.emisor, status: i.status, notes: i.notes };
}

function mapDbCaja(row: any): CajaEntry {
  return { id: row.id, date: row.date ?? '', account: row.account ?? 'Cash $', type: row.type ?? 'entrada', amount: row.amount ?? 0, desc: row.description ?? '' };
}
function mapCajaToDb(e: CajaEntry) {
  return { id: e.id, date: e.date, account: e.account, type: e.type, amount: e.amount, description: e.desc };
}

// --- DATOS INICIALES ---
const INITIAL_CLIENTS: Client[] = [
  { id: 1, name: "Cyclo", cuit: "30-12345678-9", country: "Argentina", currency: "ARS", responsible: "Meli", status: "activo", services: "Brand Planning", start_date: "2026-04-01", amount: 450000, notes: "", team: [{ collaboratorName: 'FLOR', role: 'CM', feeType: 'Fixed', feeAmount: 120000 }, { collaboratorName: 'Sofi', role: 'Socia', feeType: 'Percentage', feeAmount: 10 }] },
  { id: 2, name: "MetaJuegos", cuit: "30-98765432-1", country: "Argentina", currency: "USD", responsible: "Meli", status: "activo", services: "Performance Ads", start_date: "2026-04-01", amount: 600, notes: "", team: [{ collaboratorName: 'Gonzalo', role: 'Ads', feeType: 'Percentage', feeAmount: 20 }] }
];
const INITIAL_COLLABORATORS: Collaborator[] = [
  { id: 1, name: "FLOR", role: "CM", bankDetails: "CBU: 0140... Alias: flor.cm", isBilling: true, baseSalary: 100000 },
  { id: 2, name: "Sofi", role: "Socia", bankDetails: "CBU: 000... Alias: sofi.bebold", isBilling: true, baseSalary: 1200000 },
  { id: 3, name: "Gonzalo", role: "Paid Media", bankDetails: "PayPal: gonza@test.com", isBilling: false, baseSalary: 0 },
  { id: 4, name: "Meli", role: "Socia", bankDetails: "Brubank: meli.bebold", isBilling: true, baseSalary: 1200000 }
];
const INITIAL_INCOMES: Income[] = [
  { id: 1, date: "2026-04-10", client: "Cyclo", type: "Facturada", method: "Transferencia", amount: 450000, status: "Cobrado" },
  { id: 2, date: "2026-04-05", client: "Estudio Arquitectura", type: "Seña", method: "Efectivo", amount: 150000, status: "Cobrado" }
];
const INITIAL_EXPENSES: Expense[] = [
  { id: 1, date: "2026-04-15", desc: "Licencias de Software (Canva, etc)", category: "Fijo", amount: 45000, method: "TC Empresa", isRecurrent: true },
  { id: 2, date: "2026-04-20", desc: "Viáticos Cliente (Cafetería)", category: "Variable", amount: 12000, method: "Caja Chica", isRecurrent: false }
];

// --- CONTEXT ---
interface AppContextType {
  clients: Client[];
  setClients: Dispatch<SetStateAction<Client[]>>;
  collaborators: Collaborator[];
  setCollaborators: Dispatch<SetStateAction<Collaborator[]>>;
  incomes: Income[];
  setIncomes: Dispatch<SetStateAction<Income[]>>;
  expenses: Expense[];
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  invoices: Invoice[];
  setInvoices: Dispatch<SetStateAction<Invoice[]>>;
  cajaEntries: CajaEntry[];
  setCajaEntries: Dispatch<SetStateAction<CajaEntry[]>>;
  isLoading: boolean;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

// --- PROVIDER ---
export function AppProvider({ children }: { children: ReactNode }) {
  const [clients, setClientsState] = useState<Client[]>([]);
  const [collaborators, setCollaboratorsState] = useState<Collaborator[]>([]);
  const [incomes, setIncomesState] = useState<Income[]>([]);
  const [expenses, setExpensesState] = useState<Expense[]>([]);
  const [invoices, setInvoicesState] = useState<Invoice[]>([]);
  const [cajaEntries, setCajaEntriesState] = useState<CajaEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadingRef = useRef(true);

  useEffect(() => {
    async function init() {
      try {
        const [{ data: dbClients }, { data: dbCollaborators }, { data: dbIncomes }, { data: dbExpenses }, { data: dbInvoices }, { data: dbCaja }] = await Promise.all([
          supabase.from('clients').select('*').order('id'),
          supabase.from('collaborators').select('*').order('id'),
          supabase.from('incomes').select('*').order('id'),
          supabase.from('expenses').select('*').order('id'),
          supabase.from('invoices').select('*').order('id'),
          supabase.from('caja_entries').select('*').order('id'),
        ]);

        if (!dbClients || dbClients.length === 0) { await supabase.from('clients').upsert(INITIAL_CLIENTS.map(mapClientToDb)); setClientsState(INITIAL_CLIENTS); }
        else setClientsState(dbClients.map(mapDbClient));

        if (!dbCollaborators || dbCollaborators.length === 0) { await supabase.from('collaborators').upsert(INITIAL_COLLABORATORS.map(mapCollaboratorToDb)); setCollaboratorsState(INITIAL_COLLABORATORS); }
        else setCollaboratorsState(dbCollaborators.map(mapDbCollaborator));

        if (!dbIncomes || dbIncomes.length === 0) { await supabase.from('incomes').upsert(INITIAL_INCOMES.map(mapIncomeToDb)); setIncomesState(INITIAL_INCOMES); }
        else setIncomesState(dbIncomes.map(mapDbIncome));

        if (!dbExpenses || dbExpenses.length === 0) { await supabase.from('expenses').upsert(INITIAL_EXPENSES.map(mapExpenseToDb)); setExpensesState(INITIAL_EXPENSES); }
        else setExpensesState(dbExpenses.map(mapDbExpense));

        setInvoicesState(dbInvoices ? dbInvoices.map(mapDbInvoice) : []);
        setCajaEntriesState(dbCaja ? dbCaja.map(mapDbCaja) : []);

      } catch (err) {
        console.error('Error Supabase:', err);
        const stored = (key: string, fallback: any) => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; } };
        setClientsState(stored('bb_clients', INITIAL_CLIENTS));
        setCollaboratorsState(stored('bb_collaborators', INITIAL_COLLABORATORS));
        setIncomesState(stored('bb_incomes', INITIAL_INCOMES));
        setExpensesState(stored('bb_expenses', INITIAL_EXPENSES));
        setInvoicesState(stored('bb_invoices', []));
        setCajaEntriesState(stored('bb_caja_entries', []));
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    }
    init();
  }, []);

  function makeSetter<T extends { id: number }>(
    setState: Dispatch<SetStateAction<T[]>>,
    table: string,
    toDb: (item: T) => object
  ): Dispatch<SetStateAction<T[]>> {
    return (updater) => {
      setState(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (!loadingRef.current) {
          const deletedIds = prev.filter(p => !next.some(n => n.id === p.id)).map(p => p.id);
          if (next.length > 0) supabase.from(table).upsert(next.map(toDb)).then();
          if (deletedIds.length > 0) supabase.from(table).delete().in('id', deletedIds).then();
          localStorage.setItem(`bb_${table}`, JSON.stringify(next));
        }
        return next;
      });
    };
  }

  const setClients       = makeSetter(setClientsState, 'clients', mapClientToDb);
  const setCollaborators = makeSetter(setCollaboratorsState, 'collaborators', mapCollaboratorToDb);
  const setIncomes       = makeSetter(setIncomesState, 'incomes', mapIncomeToDb);
  const setExpenses      = makeSetter(setExpensesState, 'expenses', mapExpenseToDb);
  const setInvoices      = makeSetter(setInvoicesState, 'invoices', mapInvoiceToDb);
  const setCajaEntries   = makeSetter(setCajaEntriesState, 'caja_entries', mapCajaToDb);

  return (
    <AppContext.Provider value={{ clients, setClients, collaborators, setCollaborators, incomes, setIncomes, expenses, setExpenses, invoices, setInvoices, cajaEntries, setCajaEntries, isLoading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}
