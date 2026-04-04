-- ==========================================
-- BE BÖLD ADMIN — SCHEMA V2
-- Ejecutar en: Supabase > SQL Editor > New query
-- ==========================================

-- COLABORADORES
create table if not exists public.collaborators (
  id        bigint primary key,
  name      text not null,
  role      text not null default '',
  bank_details text default '',
  is_billing   boolean default false,
  base_salary  numeric default 0
);

-- CLIENTES (team guardado como JSON para simplicidad)
create table if not exists public.clients (
  id          bigint primary key,
  name        text not null,
  cuit        text default '',
  country     text default 'Argentina',
  currency    text default 'ARS',
  responsible text default '',
  status      text default 'activo',
  services    text default '',
  start_date  text default '',
  amount      numeric default 0,
  notes       text default '',
  team        jsonb default '[]'::jsonb
);

-- INGRESOS
create table if not exists public.incomes (
  id     bigint primary key,
  date   text not null default '',
  client text not null default '',
  type   text not null default 'Facturada',
  method text not null default 'Transferencia',
  amount numeric not null default 0,
  status text default 'Pendiente'
);

-- GASTOS
create table if not exists public.expenses (
  id           bigint primary key,
  date         text not null default '',
  description  text not null default '',
  category     text not null default 'Variable',
  amount       numeric not null default 0,
  method       text default '',
  is_recurrent boolean default false
);

-- RLS: permitir todo por ahora (app interna sin auth)
alter table public.collaborators enable row level security;
alter table public.clients       enable row level security;
alter table public.incomes       enable row level security;
alter table public.expenses      enable row level security;

create policy "todo_collaborators" on public.collaborators for all using (true) with check (true);
create policy "todo_clients"       on public.clients       for all using (true) with check (true);
create policy "todo_incomes"       on public.incomes       for all using (true) with check (true);
create policy "todo_expenses"      on public.expenses      for all using (true) with check (true);
