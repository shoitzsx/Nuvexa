create table public.alert_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_key text not null check (length(btrim(alert_key)) > 0),
  dismissed_at timestamptz not null default now(),
  unique (user_id, alert_key)
);

create index alert_dismissals_user_dismissed_idx on public.alert_dismissals (user_id, dismissed_at desc);

alter table public.alert_dismissals enable row level security;
alter table public.alert_dismissals force row level security;

create policy "Users can select own alert dismissals" on public.alert_dismissals for select to authenticated using (user_id = auth.uid());
create policy "Users can insert own alert dismissals" on public.alert_dismissals for insert to authenticated with check (user_id = auth.uid());
create policy "Users can update own alert dismissals" on public.alert_dismissals for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can delete own alert dismissals" on public.alert_dismissals for delete to authenticated using (user_id = auth.uid());