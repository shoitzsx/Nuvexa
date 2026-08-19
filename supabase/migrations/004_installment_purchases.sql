create table public.installment_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null check (length(btrim(description)) > 0),
  category text not null,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  purchase_date date not null,
  total_amount numeric(14, 2) not null check (total_amount > 0),
  installments_count integer not null check (installments_count >= 2),
  created_at timestamptz not null default now()
);

create index installment_purchases_user_card_idx on public.installment_purchases (user_id, credit_card_id, created_at desc);

alter table public.installment_purchases enable row level security;
alter table public.installment_purchases force row level security;

create policy "Users can select own installment purchases" on public.installment_purchases for select to authenticated using (user_id = auth.uid());
create policy "Users can insert own installment purchases" on public.installment_purchases for insert to authenticated with check (user_id = auth.uid());
create policy "Users can update own installment purchases" on public.installment_purchases for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can delete own installment purchases" on public.installment_purchases for delete to authenticated using (user_id = auth.uid());

alter table public.transactions add column installment_purchase_id uuid null references public.installment_purchases(id) on delete cascade;
alter table public.transactions add column installment_number integer null check (installment_number is null or installment_number >= 1);
alter table public.transactions add column installments_count integer null check (installments_count is null or installments_count >= 2);
alter table public.transactions add constraint transactions_installment_fields_check check (
  (installment_purchase_id is null and installment_number is null and installments_count is null)
  or (installment_purchase_id is not null and installment_number is not null and installments_count is not null and installment_number <= installments_count)
);

create unique index transactions_installment_number_idx on public.transactions (installment_purchase_id, installment_number) where installment_purchase_id is not null;
