create table public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  recurrence_type text not null check (recurrence_type in ('recurring', 'eventual')),
  category text not null check (
    category in (
      'Salário',
      'Comissão',
      'Freelance',
      'Trabalho avulso',
      'Venda',
      'Rendimento',
      'Aluguel recebido',
      'Presente',
      'Reembolso',
      'Renda extra',
      'Outros'
    )
  ),
  expected_amount numeric(14, 2) check (expected_amount is null or expected_amount > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index income_sources_user_status_idx
  on public.income_sources (user_id, status, created_at desc);

alter table public.income_sources enable row level security;
alter table public.income_sources force row level security;

create policy "Users can select own income sources"
  on public.income_sources
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own income sources"
  on public.income_sources
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own income sources"
  on public.income_sources
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own income sources"
  on public.income_sources
  for delete
  to authenticated
  using (user_id = auth.uid());

alter table public.transactions
  add column income_source_id uuid null
  references public.income_sources(id) on delete set null;

create index transactions_income_source_id_idx
  on public.transactions (income_source_id);