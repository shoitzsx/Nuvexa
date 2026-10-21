\pset format unaligned
\pset fieldsep ' | '
\pset tuples_only on

\echo '== papéis'
select rolname, 'super='||rolsuper, 'bypassrls='||rolbypassrls, 'login='||rolcanlogin, 'inherit='||rolinherit, 'createrole='||rolcreaterole, 'createdb='||rolcreatedb
from pg_roles where rolname in ('nuvexa_rpc','postgres','authenticated','anon','service_role','supabase_auth_admin') order by 1;

\echo '== postgres é membro de nuvexa_rpc?'
select pg_has_role('postgres','nuvexa_rpc','member');
\echo '== nuvexa_rpc: membros e privilégios de schema'
select 'usage private='||has_schema_privilege('nuvexa_rpc','private','USAGE'),
       'create private='||has_schema_privilege('nuvexa_rpc','private','CREATE'),
       'usage public='||has_schema_privilege('nuvexa_rpc','public','USAGE'),
       'create public='||has_schema_privilege('nuvexa_rpc','public','CREATE'),
       'usage auth='||has_schema_privilege('nuvexa_rpc','auth','USAGE');

\echo '== tabelas poc_: dono, RLS, FORCE'
select c.relname, pg_get_userbyid(c.relowner), 'rls='||c.relrowsecurity, 'force='||c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'poc_%' and c.relkind='r' order by 1;

\echo '== privilégios efetivos nas tabelas (anon / authenticated)'
select t, r, string_agg(p, ',' order by p) filter (where has_table_privilege(r, 'public.'||t, p)) as privs
from (values ('poc_entries'),('poc_period_locks')) tt(t),
     (values ('anon'),('authenticated')) rr(r),
     (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) pp(p)
group by t, r order by t, r;

\echo '== policies'
select tablename, policyname, cmd, roles::text from pg_policies where schemaname='public' and tablename like 'poc_%' order by 1,2;

\echo '== funções poc_/private: schema, dono, definer, search_path, EXECUTE efetivo'
select n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' as fn,
       pg_get_userbyid(p.proowner) as owner,
       'definer='||p.prosecdef,
       'search_path='||coalesce((select split_part(c,'=',2) from unnest(p.proconfig) c where c like 'search_path=%'),'(nao fixado)'),
       'anon='||has_function_privilege('anon', p.oid, 'EXECUTE'),
       'authenticated='||has_function_privilege('authenticated', p.oid, 'EXECUTE'),
       'public='||coalesce((select true from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'), false)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('private') or (n.nspname='public' and p.proname like 'poc_%')
order by 1;

\echo '== default privileges (pg_default_acl)'
select pg_get_userbyid(d.defaclrole), coalesce(n.nspname,'(global)'), d.defaclobjtype, d.defaclacl::text
from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace order by 1,2,3;

\echo '== gatilho de cadastro'
select tgname, tgenabled, pg_get_function_identity_arguments(tgfoid) , tgfoid::regproc::text from pg_trigger where tgname='poc_on_auth_user_created';

\echo '== schemas expostos pela Data API (config do PostgREST)'
select rolname, unnest(rolconfig) from pg_roles where rolname='authenticator';
