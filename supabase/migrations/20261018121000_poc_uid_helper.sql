-- PoC (descartável), correção encontrada na validação:
-- o papel dedicado nuvexa_rpc NÃO consegue usar o schema `auth` (dono: supabase_admin; o postgres
-- tem USAGE sem GRANT OPTION, então `grant usage on schema auth to nuvexa_rpc` não concede nada).
-- Resultado: `auth.uid()` falha dentro das funções e policies do nuvexa_rpc
-- ("permission denied for schema auth").
--
-- Solução de mesma força: helper próprio que lê a MESMA fonte de auth.uid(), o JSON de claims
-- `request.jwt.claims`, preenchido pelo PostgREST somente depois de validar o JWT.
-- Lê apenas o JSON (não o GUC legado `request.jwt.claim.sub`).

create function private.current_uid()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select nullif(nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::pg_catalog.jsonb ->> 'sub', '')::pg_catalog.uuid
$$;

alter function private.current_uid() owner to nuvexa_rpc;
revoke all on function private.current_uid() from public, anon, authenticated;
grant execute on function private.current_uid() to nuvexa_rpc;

-- Policies do papel dedicado passam a usar o helper (as de leitura do `authenticated` seguem com auth.uid()).
drop policy poc_entries_rpc_all on public.poc_entries;
create policy poc_entries_rpc_all on public.poc_entries
  for all to nuvexa_rpc
  using (user_id = (select private.current_uid()))
  with check (user_id = (select private.current_uid()));

drop policy poc_period_locks_rpc_select_update_delete on public.poc_period_locks;
create policy poc_period_locks_rpc_select_update_delete on public.poc_period_locks
  for all to nuvexa_rpc
  using (user_id = (select private.current_uid()))
  with check (user_id = (select private.current_uid()));

drop policy poc_period_locks_rpc_provision on public.poc_period_locks;
create policy poc_period_locks_rpc_provision on public.poc_period_locks
  for insert to nuvexa_rpc
  with check (
    user_id = (select private.current_uid())
    or ((select private.current_uid()) is null and locked_through is null)
  );

-- Funções passam a usar o helper.
create or replace function private.poc_add_entry(p_amount bigint, p_note text, p_date date)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select private.current_uid());
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

create or replace function private.poc_close_period(p_through date)
returns date language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select private.current_uid());
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
