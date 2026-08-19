create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  institution text not null check (length(btrim(institution)) > 0),
  brand text not null check (length(btrim(brand)) > 0),
  last_four_digits text check (last_four_digits is null or last_four_digits ~ '^\d{4}$'),
  credit_limit numeric(14, 2) not null check (credit_limit > 0),
  closing_day integer not null check (closing_day between 1 and 31),
  due_day integer not null check (due_day between 1 and 31),
  color text not null default '#2563eb',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  reference_month text not null check (reference_month ~ '^\d{4}-\d{2}$'),
  closing_date date not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'closed', 'paid')),
  paid_at date,
  created_at timestamptz not null default now(),
  unique (credit_card_id, reference_month),
  check ((status = 'paid' and paid_at is not null) or (status <> 'paid' and paid_at is null))
);

create index credit_cards_user_status_idx on public.credit_cards (user_id, status, created_at desc);
create index invoices_card_reference_idx on public.invoices (credit_card_id, reference_month desc);

alter table public.credit_cards enable row level security;
alter table public.credit_cards force row level security;
alter table public.invoices enable row level security;
alter table public.invoices force row level security;

create policy "Users can select own credit cards" on public.credit_cards for select to authenticated using (user_id = auth.uid());
create policy "Users can insert own credit cards" on public.credit_cards for insert to authenticated with check (user_id = auth.uid());
create policy "Users can update own credit cards" on public.credit_cards for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can delete own credit cards" on public.credit_cards for delete to authenticated using (user_id = auth.uid());

create policy "Users can select own invoices" on public.invoices for select to authenticated using (user_id = auth.uid());
create policy "Users can insert own invoices" on public.invoices for insert to authenticated with check (user_id = auth.uid());
create policy "Users can update own invoices" on public.invoices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can delete own invoices" on public.invoices for delete to authenticated using (user_id = auth.uid());

alter table public.transactions add column credit_card_id uuid null references public.credit_cards(id) on delete set null;
alter table public.transactions add column invoice_id uuid null references public.invoices(id) on delete set null;

create index transactions_credit_card_id_idx on public.transactions (credit_card_id);
create index transactions_invoice_id_idx on public.transactions (invoice_id);