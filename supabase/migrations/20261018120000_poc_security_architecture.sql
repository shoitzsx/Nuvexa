-- =====================================================================================
-- PROVA DE CONCEITO DESCARTÁVEL (Fase 1B-2A): valida a arquitetura de segurança antes de
-- criar o esquema financeiro. Será removida e substituída na Fase 1B-2B.
-- Nenhum dado real. Tabelas e funções com prefixo poc_.
--
-- As funções defeituosas de teste NÃO fazem parte desta migração: os testes as criam e removem
-- (tests/integration/sql/).
--
-- Arquitetura sob teste:
--   * papel dedicado nuvexa_rpc (NOLOGIN, NOBYPASSRLS) é DONO das tabelas e das funções de escrita;
--   * FORCE ROW LEVEL SECURITY: o dono também obedece às policies;
--   * funções SECURITY DEFINER ficam no schema `private`, que NÃO é exposto pela Data API;
--   * a Data API chama apenas wrappers SECURITY INVOKER no schema `public`;
--   * authenticated só tem SELECT nas tabelas; toda escrita passa pelas funções.
-- =====================================================================================

-- ---- 1. Papel dedicado, sem privilégios desnecessários -----------------------------
create role nuvexa_rpc
  nologin nosuperuser nobypassrls nocreatedb nocreaterole noinherit noreplication;

-- Necessário para o postgres criar objetos pertencentes a nuvexa_rpc (ALTER ... OWNER TO).
grant nuvexa_rpc to postgres;

-- ---- 2. Schemas ---------------------------------------------------------------------
create schema private;
alter schema private owner to nuvexa_rpc;
revoke all on schema private from public;
-- Os wrappers (SECURITY INVOKER) rodam como `authenticated` e precisam enxergar o schema.
-- Isso não expõe nada pela Data API: `private` não está em [api].schemas.
grant usage on schema private to authenticated;
grant usage on schema private to supabase_auth_admin; -- gatilho de cadastro (auth.users)

-- Privilégios mínimos do papel dedicado.
grant usage on schema public to nuvexa_rpc;
grant usage on schema auth to nuvexa_rpc;
grant execute on function auth.uid() to nuvexa_rpc;

-- ---- 3. Privilégios padrão: nada novo nasce executável/acessível por acidente --------
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role nuvexa_rpc revoke execute on functions from public;
alter default privileges for role nuvexa_rpc in schema private revoke all on functions from public;

-- ---- 4. Tabelas ----------------------------------------------------------------------
create table public.poc_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000000),
  entry_date date not null,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create index poc_entries_user_date_idx on public.poc_entries (user_id, entry_date);

create table public.poc_period_locks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  locked_through date,
  updated_at timestamptz not null default now()
);

-- ---- 5. Posse, RLS forçada e privilégios --------------------------------------------
-- O dono precisa de CREATE no schema para receber a tabela; o privilégio é retirado depois.
grant create on schema public to nuvexa_rpc;
alter table public.poc_entries owner to nuvexa_rpc;
alter table public.poc_period_locks owner to nuvexa_rpc;
revoke create on schema public from nuvexa_rpc;

alter table public.poc_entries enable row level security;
alter table public.poc_entries force row level security;
alter table public.poc_period_locks enable row level security;
alter table public.poc_period_locks force row level security;

revoke all on public.poc_entries from public, anon, authenticated;
revoke all on public.poc_period_locks from public, anon, authenticated;
grant select on public.poc_entries to authenticated;
grant select on public.poc_period_locks to authenticated;

-- Leitura: cada usuário vê apenas as próprias linhas.
create policy poc_entries_select_own on public.poc_entries
  for select to authenticated using (user_id = (select auth.uid()));
create policy poc_period_locks_select_own on public.poc_period_locks
  for select to authenticated using (user_id = (select auth.uid()));

-- Escrita: somente o papel dedicado, e só sobre linhas do usuário da requisição.
create policy poc_entries_rpc_all on public.poc_entries
  for all to nuvexa_rpc
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy poc_period_locks_rpc_select_update_delete on public.poc_period_locks
  for all to nuvexa_rpc
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- Provisionamento no cadastro (sem JWT, auth.uid() é nulo): só pode criar linha de trava VAZIA.
create policy poc_period_locks_rpc_provision on public.poc_period_locks
  for insert to nuvexa_rpc
  with check (user_id = (select auth.uid()) or ((select auth.uid()) is null and locked_through is null));

-- ---- 6. Funções internas (SECURITY DEFINER, dono nuvexa_rpc, search_path vazio) -----
create function private.ensure_period_lock(p_uid uuid)
returns void language sql security definer set search_path = ''
as $$
  insert into public.poc_period_locks (user_id) values (p_uid) on conflict (user_id) do nothing;
$$;

create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.poc_period_locks (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create function private.poc_add_entry(p_amount bigint, p_note text, p_date date)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_locked date;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'NX_UNAUTHENTICATED' using errcode = '28000';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000000 then
    raise exception 'NX_INVALID_AMOUNT' using errcode = '22023';
  end if;
  if p_date is null or p_date > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'NX_INVALID_DATE' using errcode = '22023';
  end if;
  if p_note is not null and char_length(p_note) > 200 then
    raise exception 'NX_INVALID_NOTE' using errcode = '22023';
  end if;

  perform private.ensure_period_lock(v_uid);
  select locked_through into v_locked from public.poc_period_locks where user_id = v_uid for share;
  if v_locked is not null and p_date <= v_locked then
    raise exception 'NX_PERIOD_LOCKED' using errcode = 'P0001';
  end if;

  insert into public.poc_entries (user_id, amount_cents, entry_date, note)
  values (v_uid, p_amount, p_date, p_note)
  returning id into v_id;
  return v_id;
end;
$$;

create function private.poc_close_period(p_through date)
returns date language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_locked date;
begin
  if v_uid is null then raise exception 'NX_UNAUTHENTICATED' using errcode = '28000'; end if;
  if p_through is null or p_through > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'NX_INVALID_DATE' using errcode = '22023';
  end if;

  perform private.ensure_period_lock(v_uid);
  select locked_through into v_locked from public.poc_period_locks where user_id = v_uid for update;
  if v_locked is not null and p_through < v_locked then
    raise exception 'NX_PERIOD_NOT_MONOTONIC' using errcode = 'P0001';
  end if;

  update public.poc_period_locks set locked_through = p_through, updated_at = now() where user_id = v_uid;
  return p_through;
end;
$$;

-- ---- 7. Posse das funções internas pelo papel dedicado -------------------------------
alter function private.ensure_period_lock(uuid) owner to nuvexa_rpc;
alter function private.handle_new_user() owner to nuvexa_rpc;
alter function private.poc_add_entry(bigint, text, date) owner to nuvexa_rpc;
alter function private.poc_close_period(date) owner to nuvexa_rpc;

-- ---- 8. Wrappers expostos (SECURITY INVOKER, schema public) --------------------------
create function public.poc_add_entry(p_amount bigint, p_note text, p_date date)
returns uuid language sql security invoker set search_path = ''
as $$ select private.poc_add_entry(p_amount, p_note, p_date); $$;

create function public.poc_close_period(p_through date)
returns date language sql security invoker set search_path = ''
as $$ select private.poc_close_period(p_through); $$;

-- ---- 9. EXECUTE explícito: nada por PUBLIC/anon; só o necessário para authenticated -----
revoke all on function private.ensure_period_lock(uuid) from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.poc_add_entry(bigint, text, date) from public, anon, authenticated;
revoke all on function private.poc_close_period(date) from public, anon, authenticated;

grant execute on function private.poc_add_entry(bigint, text, date) to authenticated;
grant execute on function private.poc_close_period(date) to authenticated;
grant execute on function private.handle_new_user() to supabase_auth_admin;

revoke all on function public.poc_add_entry(bigint, text, date) from public, anon, authenticated;
revoke all on function public.poc_close_period(date) from public, anon, authenticated;

grant execute on function public.poc_add_entry(bigint, text, date) to authenticated;
grant execute on function public.poc_close_period(date) to authenticated;

-- ---- 10. Linha de trava criada no cadastro --------------------------------------------
create trigger poc_on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
