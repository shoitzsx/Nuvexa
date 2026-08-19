create extension if not exists pgcrypto with schema extensions;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null check (length(btrim(description)) > 0),
  amount numeric(14, 2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  category text not null check (
    category in (
      'Alimentação',
      'Moradia',
      'Transporte',
      'Saúde',
      'Educação',
      'Lazer',
      'Salário',
      'Investimentos',
      'Outros'
    )
  ),
  date date not null,
  observation text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);

alter table public.transactions enable row level security;
alter table public.transactions force row level security;

drop policy if exists "Users can select own transactions" on public.transactions;
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;
drop policy if exists "Users can delete own transactions" on public.transactions;

create policy "Users can select own transactions"
  on public.transactions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own transactions"
  on public.transactions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own transactions"
  on public.transactions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own transactions"
  on public.transactions
  for delete
  to authenticated
  using (user_id = auth.uid());

create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  delete from public.transactions
  where user_id = current_user_id;

  delete from auth.users
  where id = current_user_id;
end;
$$;

revoke all on function public.delete_current_user() from public;
grant execute on function public.delete_current_user() to authenticated;
