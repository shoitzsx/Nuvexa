-- FUNÇÕES SOMENTE DE TESTE: criadas pelos testes de integração e REMOVIDAS ao final.
-- Incluem funções DEFEITUOSAS de propósito, para provar que a RLS contém o dano de um bug.
-- Nunca devem existir em migração.

create function private.poc_buggy_insert_for(p_victim uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  insert into public.poc_entries (user_id, amount_cents, entry_date)
  values (p_victim, 100, (now() at time zone 'America/Sao_Paulo')::date) returning id into v_id;
  return v_id;
end;
$$;

create function private.poc_buggy_read_all()
returns setof public.poc_entries language sql security definer set search_path = ''
as $$ select * from public.poc_entries; $$;

create function private.poc_buggy_delete_all()
returns bigint language plpgsql security definer set search_path = ''
as $$
declare v_count bigint;
begin
  delete from public.poc_entries where true; -- o Supabase (safeupdate) recusa DELETE sem WHERE
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Igual a poc_add_entry, mas segura a trava compartilhada e DORME antes de inserir (teste de concorrência).
create function private.poc_add_entry_slow(p_amount bigint, p_date date, p_sleep double precision)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select private.current_uid());
  v_locked date;
  v_id uuid;
begin
  if v_uid is null then raise exception 'NX_UNAUTHENTICATED' using errcode = '28000'; end if;
  perform private.ensure_period_lock(v_uid);
  select locked_through into v_locked from public.poc_period_locks where user_id = v_uid for share;
  if v_locked is not null and p_date <= v_locked then
    raise exception 'NX_PERIOD_LOCKED' using errcode = 'P0001';
  end if;
  perform pg_sleep(p_sleep);
  insert into public.poc_entries (user_id, amount_cents, entry_date) values (v_uid, p_amount, p_date)
  returning id into v_id;
  return v_id;
end;
$$;

alter function private.poc_buggy_insert_for(uuid) owner to nuvexa_rpc;
alter function private.poc_buggy_read_all() owner to nuvexa_rpc;
alter function private.poc_buggy_delete_all() owner to nuvexa_rpc;
alter function private.poc_add_entry_slow(bigint, date, double precision) owner to nuvexa_rpc;

revoke all on function private.poc_buggy_insert_for(uuid) from public, anon, authenticated;
revoke all on function private.poc_buggy_read_all() from public, anon, authenticated;
revoke all on function private.poc_buggy_delete_all() from public, anon, authenticated;
revoke all on function private.poc_add_entry_slow(bigint, date, double precision) from public, anon, authenticated;
grant execute on function private.poc_buggy_insert_for(uuid) to authenticated;
grant execute on function private.poc_buggy_read_all() to authenticated;
grant execute on function private.poc_buggy_delete_all() to authenticated;
grant execute on function private.poc_add_entry_slow(bigint, date, double precision) to authenticated;

-- Wrappers expostos na Data API (somente enquanto os testes rodam).
create function public.poc_buggy_insert_for(p_victim uuid)
returns uuid language sql security invoker set search_path = ''
as $$ select private.poc_buggy_insert_for(p_victim); $$;

create function public.poc_buggy_read_all()
returns setof public.poc_entries language sql security invoker set search_path = ''
as $$ select * from private.poc_buggy_read_all(); $$;

create function public.poc_buggy_delete_all()
returns bigint language sql security invoker set search_path = ''
as $$ select private.poc_buggy_delete_all(); $$;

revoke all on function public.poc_buggy_insert_for(uuid) from public, anon, authenticated;
revoke all on function public.poc_buggy_read_all() from public, anon, authenticated;
revoke all on function public.poc_buggy_delete_all() from public, anon, authenticated;
grant execute on function public.poc_buggy_insert_for(uuid) to authenticated;
grant execute on function public.poc_buggy_read_all() to authenticated;
grant execute on function public.poc_buggy_delete_all() to authenticated;
