create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  creditor text not null check (length(btrim(creditor)) > 0),
  original_amount numeric(14, 2) not null check (original_amount > 0),
  interest_rate numeric(8, 4) check (interest_rate is null or interest_rate >= 0),
  installment_amount numeric(14, 2) check (installment_amount is null or installment_amount > 0),
  total_installments integer check (total_installments is null or total_installments >= 1),
  due_day integer check (due_day is null or due_day between 1 and 31),
  status text not null default 'active' check (status in ('active', 'paid_off', 'renegotiated')),
  notes text,
  created_at timestamptz not null default now()
);

create index debts_user_status_idx on public.debts (user_id, status, created_at desc);

alter table public.debts enable row level security;
alter table public.debts force row level security;

create policy "Users can select own debts" on public.debts for select to authenticated using (user_id = auth.uid());
create policy "Users can insert own debts" on public.debts for insert to authenticated with check (user_id = auth.uid());
create policy "Users can update own debts" on public.debts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can delete own debts" on public.debts for delete to authenticated using (user_id = auth.uid());

alter table public.transactions add column debt_id uuid null references public.debts(id) on delete set null;
create index transactions_debt_id_idx on public.transactions (debt_id);

alter table public.transactions drop constraint if exists transactions_category_check;
alter table public.transactions add constraint transactions_category_check check (
  category in (
    'Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer',
    'Assinaturas', 'Salário', 'Investimentos', 'Dívidas', 'Outros'
  )
);