-- PoC (descartável), correção encontrada na validação do cadastro:
-- `INSERT ... ON CONFLICT DO NOTHING` também exige que a linha nova passe pela política de LEITURA
-- (USING) do papel. No cadastro não há JWT (auth.uid() nulo), então a leitura não é permitida e o
-- gatilho falhava com "new row violates row-level security policy", derrubando o cadastro.
-- A linha de trava de um usuário recém-criado não pode existir (a chave é o novo id), então o
-- gatilho usa INSERT simples. O ensure_period_lock (com JWT) continua com ON CONFLICT.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.poc_period_locks (user_id) values (new.id);
  return new;
end;
$$;
