create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  description text,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  target_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index savings_goals_user_status_idx on public.savings_goals (user_id, status, created_at desc);

alter table public.savings_goals enable row level security;
alter table public.savings_goals force row level security;

create policy "Users can select own savings goals" on public.savings_goals for select to authenticated using (user_id = auth.uid());
create policy "Users can insert own savings goals" on public.savings_goals for insert to authenticated with check (user_id = auth.uid());
create policy "Users can update own savings goals" on public.savings_goals for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can delete own savings goals" on public.savings_goals for delete to authenticated using (user_id = auth.uid());

create table public.savings_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdrawal')),
  amount numeric(14, 2) not null check (amount > 0),
  date date not null,
  source text,
  note text,
  created_at timestamptz not null default now()
);

create index savings_transactions_goal_date_idx on public.savings_transactions (goal_id, date desc, created_at desc);
create index savings_transactions_user_date_idx on public.savings_transactions (user_id, date desc);

alter table public.savings_transactions enable row level security;
alter table public.savings_transactions force row level security;

create policy "Users can select own savings transactions" on public.savings_transactions for select to authenticated using (user_id = auth.uid());
create policy "Users can insert own savings transactions" on public.savings_transactions for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.savings_goals where id = goal_id and user_id = auth.uid())
);
create policy "Users can update own savings transactions" on public.savings_transactions for update to authenticated using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and exists (select 1 from public.savings_goals where id = goal_id and user_id = auth.uid())
);
create policy "Users can delete own savings transactions" on public.savings_transactions for delete to authenticated using (user_id = auth.uid());