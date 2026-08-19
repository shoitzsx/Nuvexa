create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  category text not null,
  amount numeric(14, 2) not null check (amount > 0),
  due_day integer not null check (due_day between 1 and 31),
  frequency text not null check (frequency in ('monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual')),
  start_date date not null,
  end_date date,
  total_occurrences integer check (total_occurrences is null or total_occurrences > 0),
  payment_method text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  notes text,
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check (end_date is null or total_occurrences is null)
);

create index recurring_expenses_user_status_idx
  on public.recurring_expenses (user_id, status, start_date);

alter table public.transactions
  drop constraint if exists transactions_category_check;

alter table public.transactions
  add constraint transactions_category_check check (
    category in (
      'Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação',
      'Lazer', 'Assinaturas', 'Salário', 'Investimentos', 'Outros'
    )
  );

alter table public.recurring_expenses enable row level security;
alter table public.recurring_expenses force row level security;

create policy "Users can select own recurring expenses"
  on public.recurring_expenses for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own recurring expenses"
  on public.recurring_expenses for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own recurring expenses"
  on public.recurring_expenses for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can delete own recurring expenses"
  on public.recurring_expenses for delete to authenticated
  using (user_id = auth.uid());

alter table public.transactions
  add column recurring_expense_id uuid null
  references public.recurring_expenses(id) on delete set null;

create unique index transactions_recurring_expense_occurrence_idx
  on public.transactions (recurring_expense_id, date)
  where recurring_expense_id is not null;

create or replace function public.generate_current_recurring_expenses()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  expense record;
  current_month date := date_trunc('month', current_date)::date;
  due_date date;
  last_day integer;
  months_since_start integer;
  interval_months integer;
  generated_count integer := 0;
  occurrence_count integer;
begin
  for expense in
    select * from public.recurring_expenses
    where user_id = auth.uid() and status = 'active'
  loop
    interval_months := case expense.frequency
      when 'monthly' then 1
      when 'bimonthly' then 2
      when 'quarterly' then 3
      when 'semiannual' then 6
      when 'annual' then 12
    end;
    months_since_start :=
      (extract(year from current_month)::integer - extract(year from expense.start_date)::integer) * 12 +
      extract(month from current_month)::integer - extract(month from expense.start_date)::integer;

    if months_since_start < 0 or mod(months_since_start, interval_months) <> 0 then
      continue;
    end if;

    last_day := extract(day from (current_month + interval '1 month - 1 day'))::integer;
    due_date := make_date(
      extract(year from current_month)::integer,
      extract(month from current_month)::integer,
      least(expense.due_day, last_day)
    );

    if due_date < expense.start_date or (expense.end_date is not null and due_date > expense.end_date) then
      continue;
    end if;

    select count(*) into occurrence_count
    from public.transactions
    where recurring_expense_id = expense.id;

    if expense.total_occurrences is not null and occurrence_count >= expense.total_occurrences then
      update public.recurring_expenses set status = 'ended' where id = expense.id;
      continue;
    end if;

    insert into public.transactions (
      user_id, description, amount, type, category, date, observation, recurring_expense_id
    ) values (
      expense.user_id, expense.name, expense.amount, 'expense', expense.category,
      due_date, expense.notes, expense.id
    ) on conflict (recurring_expense_id, date) where recurring_expense_id is not null do nothing;

    if found then
      generated_count := generated_count + 1;
    end if;

    select count(*) into occurrence_count
    from public.transactions
    where recurring_expense_id = expense.id;

    if expense.total_occurrences is not null and occurrence_count >= expense.total_occurrences then
      update public.recurring_expenses set status = 'ended' where id = expense.id;
    end if;
  end loop;

  return generated_count;
end;
$$;

grant execute on function public.generate_current_recurring_expenses() to authenticated;