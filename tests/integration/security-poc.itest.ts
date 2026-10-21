// Prova de conceito de segurança (Fase 1B-2A): usuários FICTÍCIOS, Supabase LOCAL, chamadas HTTP reais.
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays, todayInZone } from "../../src/domain/dates";
import {
  DB_CONTAINER, adminDeleteUser, api, localStatus, psql, psqlTry, results, runAsync, signUp, sqlAs,
  type TestUser,
} from "./helpers";

const today = todayInZone(new Date());
const day = (offset: number) => addDays(today, offset);
const sqlDir = path.join(__dirname, "sql");
const read = (file: string) => readFileSync(path.join(sqlDir, file), "utf8");

type Err = { code?: string; message?: string; details?: string };
const denied = (status: number) => [401, 403].includes(status);

let A: TestUser;
let B: TestUser;
let C: TestUser;
let E: TestUser;
let G: TestUser;
const created: TestUser[] = [];

async function entries(user: TestUser) {
  const res = await api<{ id: string; user_id: string; amount_cents: number }[]>("/rest/v1/poc_entries?select=*&order=created_at", { token: user.token });
  expect(res.status).toBe(200);
  return res.body;
}

async function addEntry(user: TestUser, amount: number, date: string, note: string | null = null) {
  return api<string & Err>("/rest/v1/rpc/poc_add_entry", { method: "POST", token: user.token, body: { p_amount: amount, p_note: note, p_date: date } });
}

beforeAll(async () => {
  localStatus();
  for (const label of ["a", "b", "c", "e", "g"]) created.push(await signUp(label));
  [A, B, C, E, G] = created;
});

afterAll(async () => {
  psqlTry(read("test-only-teardown.sql"));
  for (const user of created) await adminDeleteUser(user.id);
});

// ======================================================================================
describe("1. Papéis, FORCE RLS, privilégios e EXECUTE efetivos (catálogo real)", () => {
  it("nuvexa_rpc: NOLOGIN, NOBYPASSRLS, sem superusuário/createrole/createdb", () => {
    const out = psql(`select 'RESULT:'||rolsuper||','||rolbypassrls||','||rolcanlogin||','||rolcreaterole||','||rolcreatedb from pg_roles where rolname='nuvexa_rpc';`);
    expect(results(out)).toEqual(["false,false,false,false,false"]);
  });

  it("controle: o postgres do Supabase TEM BYPASSRLS (por isso não pode ser dono das funções)", () => {
    const out = psql(`select 'RESULT:'||rolbypassrls from pg_roles where rolname='postgres';`);
    expect(results(out)).toEqual(["true"]);
  });

  it("nuvexa_rpc não consegue fazer login", () => {
    const result = spawnSync("docker", ["exec", "-e", "PGPASSWORD=irrelevante", DB_CONTAINER, "psql", "-h", "127.0.0.1", "-U", "nuvexa_rpc", "-d", "postgres", "-c", "select 1"], { encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/not permitted to log in/);
  });

  it("toda tabela de public: dona nuvexa_rpc, RLS habilitada E FORÇADA", () => {
    const out = psql(`select 'RESULT:'||count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind in ('r','p')
        and not (c.relrowsecurity and c.relforcerowsecurity and pg_get_userbyid(c.relowner)='nuvexa_rpc');`);
    expect(results(out)).toEqual(["0"]);
  });

  it("anon e authenticated não têm INSERT/UPDATE/DELETE/TRUNCATE em nenhuma tabela de public; anon não tem nada", () => {
    const out = psql(`select 'RESULT:'||count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace,
      (values ('anon'),('authenticated')) r(role), (values ('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(priv)
      where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege(r.role, c.oid, p.priv);`);
    expect(results(out)).toEqual(["0"]);
    const anonSelect = psql(`select 'RESULT:'||count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege('anon', c.oid, 'SELECT');`);
    expect(results(anonSelect)).toEqual(["0"]);
  });

  it("nenhuma função SECURITY DEFINER no schema exposto (public)", () => {
    const out = psql(`select 'RESULT:'||count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef;`);
    expect(results(out)).toEqual(["0"]);
  });

  it("toda função SECURITY DEFINER é do nuvexa_rpc, com search_path vazio fixado", () => {
    const out = psql(`select 'RESULT:'||count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname in ('public','private') and p.prosecdef
        and (pg_get_userbyid(p.proowner) <> 'nuvexa_rpc' or not coalesce(p.proconfig @> array['search_path=""'], false));`);
    expect(results(out)).toEqual(["0"]);
  });

  it("wrappers expostos são SECURITY INVOKER (não elevam privilégio)", () => {
    const out = psql(`select 'RESULT:'||string_agg(p.proname||'='||p.prosecdef, ',' order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'poc_%';`);
    expect(results(out)).toEqual(["poc_add_entry=false,poc_close_period=false"]);
  });

  it("EXECUTE: anon e PUBLIC não executam nada; authenticated só a lista aprovada", () => {
    const anon = psql(`select 'RESULT:'||count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname in ('public','private') and has_function_privilege('anon', p.oid, 'EXECUTE');`);
    expect(results(anon)).toEqual(["0"]);

    const publicGrantee = psql(`select 'RESULT:'||count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname in ('public','private')
        and exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE');`);
    expect(results(publicGrantee)).toEqual(["0"]);

    const authenticated = psql(`select 'RESULT:'||string_agg(n.nspname||'.'||p.proname, ',' order by n.nspname, p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname in ('public','private') and has_function_privilege('authenticated', p.oid, 'EXECUTE');`);
    expect(results(authenticated)).toEqual(["private.poc_add_entry,private.poc_close_period,public.poc_add_entry,public.poc_close_period"]);
  });

  it("privilégios padrão: nada novo em public/private nasce acessível a anon/authenticated", () => {
    const out = psql(`select 'RESULT:'||count(*) from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace,
      aclexplode(d.defaclacl) a
      where pg_get_userbyid(d.defaclrole) in ('postgres','nuvexa_rpc') and coalesce(n.nspname,'public') in ('public','private')
        and a.grantee in (select oid from pg_roles where rolname in ('anon','authenticated')) ;`);
    expect(results(out)).toEqual(["0"]);
  });

  it("nenhum objeto de public pertence ao supabase_admin (cujos privilégios padrão concedem anon/authenticated)", () => {
    const out = psql(`select 'RESULT:'||(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and pg_get_userbyid(c.relowner)='supabase_admin')
      +(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and pg_get_userbyid(p.proowner)='supabase_admin');`);
    expect(results(out)).toEqual(["0"]);
  });

  it("a Data API expõe somente o schema public (config) e o schema private não está acessível", async () => {
    const config = readFileSync(path.join(__dirname, "../../supabase/config.toml"), "utf8");
    expect(config).toMatch(/^schemas = \["public"\]$/m);

    const viaRpc = await api<Err>("/rest/v1/rpc/poc_add_entry", { method: "POST", token: A.token, headers: { "Content-Profile": "private" }, body: { p_amount: 1, p_note: null, p_date: day(-1) } });
    expect(viaRpc.status).toBe(406);
    expect(viaRpc.body.code).toBe("PGRST106");
    const viaTable = await api<Err>("/rest/v1/poc_entries", { token: A.token, headers: { "Accept-Profile": "private" } });
    expect(viaTable.status).toBe(406);
    const helper = await api<Err>("/rest/v1/rpc/current_uid", { method: "POST", token: A.token, body: {} });
    expect(helper.status).toBe(404);
  });

  it("OpenAPI: nenhuma função interna aparece, nem para anon nem para authenticated", async () => {
    for (const token of [undefined, A.token]) {
      const res = await api<{ paths: Record<string, unknown> }>("/rest/v1/", { token });
      expect(res.status).toBe(200);
      const rpc = Object.keys(res.body.paths).filter((p) => p.startsWith("/rpc/")).sort();
      for (const hidden of ["/rpc/current_uid", "/rpc/ensure_period_lock", "/rpc/handle_new_user"]) {
        expect(rpc).not.toContain(hidden);
      }
      expect(rpc.every((p) => ["/rpc/poc_add_entry", "/rpc/poc_close_period"].includes(p))).toBe(true);
    }
  });
});

// ======================================================================================
describe("2. HTTP real com dois usuários fictícios", () => {
  let entryA: string;

  it("A registra uma movimentação pela RPC; A vê a sua e B não vê nada", async () => {
    const res = await addEntry(A, 12_345, day(-1), "fictício A");
    expect(res.status).toBe(200);
    entryA = res.body as unknown as string;
    expect(entryA).toMatch(/^[0-9a-f-]{36}$/);

    const mine = await entries(A);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ id: entryA, user_id: A.id, amount_cents: 12_345 });
    expect(await entries(B)).toEqual([]);
  });

  it("B não lê a linha de A nem pelo filtro direto por id", async () => {
    const res = await api<unknown[]>(`/rest/v1/poc_entries?id=eq.${entryA}&select=*`, { token: B.token });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("B não altera nem apaga dados de A (PATCH/DELETE negados) e A segue intacto", async () => {
    const patch = await api<Err>(`/rest/v1/poc_entries?id=eq.${entryA}`, { method: "PATCH", token: B.token, body: { amount_cents: 1 } });
    expect(denied(patch.status)).toBe(true);
    const del = await api<Err>(`/rest/v1/poc_entries?id=eq.${entryA}`, { method: "DELETE", token: B.token });
    expect(denied(del.status)).toBe(true);
    expect((await entries(A))[0].amount_cents).toBe(12_345);
  });

  it("escrita direta não contorna as RPCs: nem B em A, nem A em si mesmo (POST/PATCH/DELETE negados)", async () => {
    const asB = await api<Err>("/rest/v1/poc_entries", { method: "POST", token: B.token, body: { user_id: A.id, amount_cents: 1, entry_date: day(-1) } });
    expect(denied(asB.status)).toBe(true);
    const asA = await api<Err>("/rest/v1/poc_entries", { method: "POST", token: A.token, body: { user_id: A.id, amount_cents: 1, entry_date: day(-1) } });
    expect(denied(asA.status)).toBe(true);
    const patchOwn = await api<Err>(`/rest/v1/poc_entries?id=eq.${entryA}`, { method: "PATCH", token: A.token, body: { amount_cents: 1 } });
    expect(denied(patchOwn.status)).toBe(true);
    const deleteOwn = await api<Err>(`/rest/v1/poc_entries?id=eq.${entryA}`, { method: "DELETE", token: A.token });
    expect(denied(deleteOwn.status)).toBe(true);
    expect(await entries(A)).toHaveLength(1);
  });

  it("usuário anônimo não lê nem executa nada protegido", async () => {
    const read = await api<Err>("/rest/v1/poc_entries?select=*");
    expect(denied(read.status)).toBe(true);
    const rpc = await api<Err>("/rest/v1/rpc/poc_add_entry", { method: "POST", body: { p_amount: 100, p_note: null, p_date: day(-1) } });
    expect(denied(rpc.status)).toBe(true);
    const lock = await api<Err>("/rest/v1/rpc/poc_close_period", { method: "POST", body: { p_through: day(-1) } });
    expect(denied(lock.status)).toBe(true);
    const locks = await api<Err>("/rest/v1/poc_period_locks?select=*");
    expect(denied(locks.status)).toBe(true);
  });

  it("a RPC não aceita user_id do cliente: parâmetro extra é rejeitado e nada é gravado", async () => {
    const res = await api<Err>("/rest/v1/rpc/poc_add_entry", { method: "POST", token: B.token, body: { p_amount: 100, p_note: null, p_date: day(-1), user_id: A.id } });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("PGRST202");
    expect(await entries(A)).toHaveLength(1);
    expect(await entries(B)).toEqual([]);
  });

  it("a RPC grava sempre no usuário do token (B grava e só B vê)", async () => {
    const res = await addEntry(B, 5_000, day(-1), "fictício B");
    expect(res.status).toBe(200);
    expect((await entries(B)).map((e) => e.user_id)).toEqual([B.id]);
    expect((await entries(A)).map((e) => e.user_id)).toEqual([A.id]);
  });

  it.each([
    ["valor zero", 0, day(-1), null, "NX_INVALID_AMOUNT"],
    ["valor negativo", -5, day(-1), null, "NX_INVALID_AMOUNT"],
    ["valor acima do teto", 100_000_000_001, day(-1), null, "NX_INVALID_AMOUNT"],
    ["data futura", 100, day(2), null, "NX_INVALID_DATE"],
    ["observação longa", 100, day(-1), "x".repeat(201), "NX_INVALID_NOTE"],
  ])("RPC rejeita %s", async (_name, amount, date, note, code) => {
    const res = await addEntry(A, amount as number, date as string, note as string | null);
    expect(res.status).toBe(400);
    expect((res.body as Err).message).toBe(code);
    expect(await entries(A)).toHaveLength(1);
  });

  it("valor decimal é rejeitado antes de chegar ao banco", async () => {
    const res = await addEntry(A, 10.5, day(-1));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await entries(A)).toHaveLength(1);
  });

  it("token adulterado ou expirado não autentica", async () => {
    const tampered = A.token.slice(0, -4) + (A.token.endsWith("AAAA") ? "BBBB" : "AAAA");
    const res = await api<Err>("/rest/v1/poc_entries?select=*", { token: tampered });
    expect(denied(res.status)).toBe(true);
  });
});

// ======================================================================================
describe("3. Isolamento no nível do banco, por papel (SQL real)", () => {
  it("authenticated: SELECT só das próprias linhas; INSERT/UPDATE/DELETE/TRUNCATE negados", () => {
    const sel = sqlAs("authenticated", A.id, `select 'RESULT:'||count(*) from public.poc_entries;`);
    expect(results(sel.out)).toEqual(["1"]);
    for (const stmt of [
      `insert into public.poc_entries(user_id, amount_cents, entry_date) values ('${A.id}', 100, current_date);`,
      `update public.poc_entries set amount_cents = 1;`,
      `delete from public.poc_entries;`,
      `truncate public.poc_entries;`,
    ]) {
      const r = sqlAs("authenticated", A.id, stmt);
      expect(r.ok).toBe(false);
      expect(r.err).toMatch(/permission denied for table poc_entries/);
    }
  });

  it("anon: nenhum acesso às tabelas", () => {
    const r = sqlAs("anon", null, `select count(*) from public.poc_entries;`);
    expect(r.ok).toBe(false);
    expect(r.err).toMatch(/permission denied for table poc_entries/);
  });

  it("anon e authenticated não chamam funções internas (schema private)", () => {
    const anon = sqlAs("anon", null, `select private.poc_add_entry(1, null, current_date);`);
    expect(anon.err).toMatch(/permission denied for schema private/);
    const authed = sqlAs("authenticated", A.id, `select private.current_uid();`);
    expect(authed.err).toMatch(/permission denied for function current_uid/);
    const ensure = sqlAs("authenticated", A.id, `select private.ensure_period_lock('${B.id}');`);
    expect(ensure.err).toMatch(/permission denied for function ensure_period_lock/);
  });

  it("nuvexa_rpc obedece a RLS (FORCE): vê só o usuário da requisição e, sem claims, nada", () => {
    const withA = sqlAs("nuvexa_rpc", A.id, `select 'RESULT:'||count(*) from public.poc_entries;`);
    expect(results(withA.out)).toEqual(["1"]);
    const noClaims = sqlAs("nuvexa_rpc", null, `select 'RESULT:'||count(*) from public.poc_entries;`);
    expect(results(noClaims.out)).toEqual(["0"]);
    const control = psql(`select 'RESULT:'||count(*) from public.poc_entries;`); // postgres (BYPASSRLS)
    expect(Number(results(control)[0])).toBeGreaterThanOrEqual(2);
  });

  it("nuvexa_rpc com claims de A não grava para B (nem apaga linhas de B)", () => {
    const insert = sqlAs("nuvexa_rpc", A.id, `insert into public.poc_entries(user_id, amount_cents, entry_date) values ('${B.id}', 100, current_date);`);
    expect(insert.ok).toBe(false);
    expect(insert.err).toMatch(/row-level security/);
    const del = sqlAs("nuvexa_rpc", A.id, `with d as (delete from public.poc_entries returning 1) select 'RESULT:'||count(*) from d;`);
    expect(results(del.out)).toEqual(["1"]); // apagou só a de A (revertido)
    expect(results(psql(`select 'RESULT:'||count(*) from public.poc_entries where user_id='${B.id}';`))).toEqual(["1"]);
  });

  it("um claims com sub forjado não passa de uma chave de GUC inexistente (sem 'sub' → uid nulo)", () => {
    const r = sqlAs("nuvexa_rpc", null, `select set_config('request.jwt.claims', '{"role":"authenticated"}', true) as _x \\gset
      select 'RESULT:'||coalesce((select private.current_uid())::text, 'null');`);
    expect(results(r.out)).toEqual(["null"]);
  });
});

// ======================================================================================
describe("4. Funções defeituosas de propósito: a RLS contém o dano (criadas só para o teste)", () => {
  beforeAll(async () => {
    const out = psqlTry(read("test-only-functions.sql"));
    expect(out.ok, out.err).toBe(true);

    // O PostgREST guarda o schema em cache: pede o recarregamento e espera a API enxergar as funções.
    psql("notify pgrst, 'reload schema';");
    const wanted = ["/rpc/poc_buggy_insert_for", "/rpc/poc_buggy_read_all", "/rpc/poc_buggy_delete_all"];
    const deadline = Date.now() + 20_000;
    let visible = false;
    while (Date.now() < deadline && !visible) {
      const res = await api<{ paths: Record<string, unknown> }>("/rest/v1/", { token: A.token });
      visible = res.status === 200 && wanted.every((p) => p in res.body.paths);
      if (!visible) await new Promise((r) => setTimeout(r, 200));
    }
    expect(visible, "o PostgREST não recarregou o schema a tempo").toBe(true);
  });

  it("função que tenta inserir para outra vítima falha por RLS", async () => {
    const before = (await entries(B)).length;
    const res = await api<Err>("/rest/v1/rpc/poc_buggy_insert_for", { method: "POST", token: A.token, body: { p_victim: B.id } });
    expect(denied(res.status)).toBe(true);
    expect(res.body.message).toMatch(/row-level security/);
    expect((await entries(B)).length).toBe(before);
  });

  it("função que lê TUDO só devolve as linhas de quem chamou", async () => {
    const res = await api<{ user_id: string }[]>("/rest/v1/rpc/poc_buggy_read_all", { method: "POST", token: B.token, body: {} });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(new Set(res.body.map((r) => r.user_id))).toEqual(new Set([B.id]));
  });

  it("função que apaga TUDO só apaga as linhas de quem chamou", async () => {
    const bBefore = (await entries(B)).length;
    const res = await api<number>("/rest/v1/rpc/poc_buggy_delete_all", { method: "POST", token: A.token, body: {} });
    expect(res.status).toBe(200);
    expect(res.body).toBe(1);
    expect(await entries(A)).toHaveLength(0);
    expect((await entries(B)).length).toBe(bBefore);
  });
});

// ======================================================================================
describe("5. Trava de períodos (period_locks): criação inicial, provisionamento e concorrência", () => {
  it("o cadastro criou a linha de trava VAZIA para cada usuário (gatilho com auth.uid() nulo)", () => {
    for (const u of [A, B, C, E, G]) {
      const out = psql(`select 'RESULT:'||count(*)||','||coalesce(max(locked_through)::text,'null') from public.poc_period_locks where user_id='${u.id}';`);
      expect(results(out)).toEqual(["1,null"]);
    }
  });

  it("cada usuário lê só a própria trava; ninguém altera a trava diretamente", async () => {
    const mine = await api<{ user_id: string }[]>("/rest/v1/poc_period_locks?select=*", { token: A.token });
    expect(mine.body.map((r) => r.user_id)).toEqual([A.id]);
    for (const [user, other] of [[A, B], [B, A]] as const) {
      const patch = await api<Err>(`/rest/v1/poc_period_locks?user_id=eq.${other.id}`, { method: "PATCH", token: user.token, body: { locked_through: day(-1) } });
      expect(denied(patch.status)).toBe(true);
      const own = await api<Err>(`/rest/v1/poc_period_locks?user_id=eq.${user.id}`, { method: "PATCH", token: user.token, body: { locked_through: day(-1) } });
      expect(denied(own.status)).toBe(true);
      const post = await api<Err>("/rest/v1/poc_period_locks", { method: "POST", token: user.token, body: { user_id: user.id, locked_through: day(-1) } });
      expect(denied(post.status)).toBe(true);
      const del = await api<Err>(`/rest/v1/poc_period_locks?user_id=eq.${user.id}`, { method: "DELETE", token: user.token });
      expect(denied(del.status)).toBe(true);
    }
    expect(results(psql(`select 'RESULT:'||count(*) from public.poc_period_locks where user_id in ('${A.id}','${B.id}') and locked_through is not null;`))).toEqual(["0"]);
  });

  it("política de provisionamento: sem JWT só cria linha VAZIA; nunca para outro usuário nem com data", () => {
    psql(`delete from public.poc_period_locks where user_id='${C.id}';`); // postgres
    const noJwtLocked = sqlAs("nuvexa_rpc", null, `insert into public.poc_period_locks(user_id, locked_through) values ('${C.id}', '${day(-10)}');`);
    expect(noJwtLocked.ok).toBe(false);
    expect(noJwtLocked.err).toMatch(/row-level security/);

    const otherUser = sqlAs("nuvexa_rpc", B.id, `insert into public.poc_period_locks(user_id) values ('${C.id}');`);
    expect(otherUser.ok).toBe(false);
    expect(otherUser.err).toMatch(/row-level security/);

    const noJwtEmpty = sqlAs("nuvexa_rpc", null, `insert into public.poc_period_locks(user_id) values ('${C.id}'); reset role; select 'RESULT:'||count(*) from public.poc_period_locks where user_id='${C.id}';`);
    expect(noJwtEmpty.ok, noJwtEmpty.err).toBe(true);
    expect(results(noJwtEmpty.out)).toEqual(["1"]);
    // (transação revertida: a linha de C continua ausente para o próximo teste)
    expect(results(psql(`select 'RESULT:'||count(*) from public.poc_period_locks where user_id='${C.id}';`))).toEqual(["0"]);
  });

  it("linha ausente é recriada automaticamente na primeira movimentação (ensure_period_lock)", async () => {
    const res = await addEntry(C, 700, day(-1));
    expect(res.status).toBe(200);
    expect(results(psql(`select 'RESULT:'||count(*) from public.poc_period_locks where user_id='${C.id}';`))).toEqual(["1"]);
  });

  it("fechamento: só avança, nunca no futuro, e trava movimentações antigas", async () => {
    const close = (user: TestUser, date: string) => api<string & Err>("/rest/v1/rpc/poc_close_period", { method: "POST", token: user.token, body: { p_through: date } });

    expect((await close(A, day(-3))).status).toBe(200);
    const locked = await addEntry(A, 100, day(-3));
    expect(locked.status).toBe(400);
    expect((locked.body as Err).message).toBe("NX_PERIOD_LOCKED");
    expect((await addEntry(A, 100, day(-2))).status).toBe(200);

    const back = await close(A, day(-5));
    expect(back.status).toBe(400);
    expect((back.body as Err).message).toBe("NX_PERIOD_NOT_MONOTONIC");
    const future = await close(A, day(2));
    expect(future.status).toBe(400);
    expect((future.body as Err).message).toBe("NX_INVALID_DATE");

    // B não é afetado pelo fechamento de A, e A não consegue fechar nada em nome de B.
    expect((await addEntry(B, 100, day(-3))).status).toBe(200);
    expect(results(psql(`select 'RESULT:'||coalesce(locked_through::text,'null') from public.poc_period_locks where user_id='${B.id}';`))).toEqual(["null"]);
  });

  it("concorrência: o fechamento espera uma movimentação em andamento (primeira trava, linha já existente)", async () => {
    const withCommit = (body: string) =>
      `begin;\nset local role authenticated;\nselect set_config('request.jwt.claims', '{"sub":"${E.id}","role":"authenticated"}', true) as _c \\gset\n${body}\ncommit;`;

    const slowAdd = runAsync(withCommit(`select 'RESULT:'||private.poc_add_entry_slow(500, '${day(-5)}', 3);`));
    // Determinístico: só inicia o fechamento depois de confirmar, no banco, que a movimentação
    // já está segurando a trava compartilhada (dormindo dentro da função).
    const holding = `select 'RESULT:'||count(*) from pg_stat_activity where wait_event = 'PgSleep' and query like '%poc_add_entry_slow%' and pid <> pg_backend_pid();`;
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && results(psql(holding))[0] !== "1") {
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(results(psql(holding))).toEqual(["1"]);
    const close = await runAsync(withCommit(`select 'RESULT:'||private.poc_close_period('${day(-2)}');`));
    const add = await slowAdd;

    expect(add.code, add.err).toBe(0);
    expect(close.code, close.err).toBe(0);
    // o fechamento (FOR UPDATE) só terminou depois que a movimentação (FOR SHARE) fez commit
    expect(close.endedAt).toBeGreaterThanOrEqual(add.endedAt - 150);
    expect(close.endedAt - close.startedAt).toBeGreaterThanOrEqual(1500);
    expect(results(psql(`select 'RESULT:'||count(*) from public.poc_entries where user_id='${E.id}';`))).toEqual(["1"]);

    const after = await addEntry(E, 100, day(-3));
    expect(after.status).toBe(400);
    expect((after.body as Err).message).toBe("NX_PERIOD_LOCKED");
  });
});

// ======================================================================================
describe("6. Exclusão de usuário e credenciais", () => {
  it("excluir o usuário remove seus dados mesmo com FORCE RLS (on delete cascade)", async () => {
    expect((await addEntry(G, 900, day(-1))).status).toBe(200);
    expect(results(psql(`select 'RESULT:'||(select count(*) from public.poc_entries where user_id='${G.id}')||','||(select count(*) from public.poc_period_locks where user_id='${G.id}');`))).toEqual(["1,1"]);

    expect([200, 204]).toContain(await adminDeleteUser(G.id));
    expect(results(psql(`select 'RESULT:'||(select count(*) from public.poc_entries where user_id='${G.id}')||','||(select count(*) from public.poc_period_locks where user_id='${G.id}');`))).toEqual(["0,0"]);
    created.splice(created.indexOf(G), 1);
  });

  it("nenhuma credencial administrativa aparece no código do frontend nem no build", () => {
    const { SERVICE_ROLE_KEY, SECRET_KEY, JWT_SECRET } = localStatus();
    const secrets = [SERVICE_ROLE_KEY, SECRET_KEY, JWT_SECRET].filter((s): s is string => !!s && s.length > 20);
    expect(secrets.length).toBeGreaterThan(0);

    const root = path.join(__dirname, "../..");
    const textExt = new Set([".ts", ".tsx", ".js", ".mjs", ".css", ".html", ".json", ".map", ".svg", ".md"]);
    const files: string[] = [];
    const walk = (dir: string) => {
      if (!existsSync(dir)) return;
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (textExt.has(path.extname(name))) files.push(full);
      }
    };
    walk(path.join(root, "src"));
    walk(path.join(root, "dist"));
    files.push(path.join(root, "index.html"));
    expect(files.length).toBeGreaterThan(5);

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const secret of secrets) expect(content.includes(secret), `${file} contém credencial`).toBe(false);
      expect(/service_role|SERVICE_ROLE|VITE_[A-Z_]*(SECRET|SERVICE)/.test(content), `${file} referencia credencial administrativa`).toBe(false);
    }
  });

  it("nenhum arquivo .env versionado e .gitignore protege os locais", () => {
    const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8", cwd: path.join(__dirname, "../..") });
    expect(tracked.split("\n").filter((f) => /(^|\/)\.env(\..+)?$/.test(f) && !f.endsWith(".example"))).toEqual([]);
  });
});

// ======================================================================================
describe("7. Higiene final", () => {
  it("depois da remoção das funções de teste, nenhuma função vulnerável ou de pausa sobra no banco", () => {
    expect(psqlTry(read("test-only-teardown.sql")).ok).toBe(true);
    const out = psql(`select 'RESULT:'||count(*) from pg_proc where proname like 'poc_buggy%' or proname like '%_slow';`);
    expect(results(out)).toEqual(["0"]);
  });

  it("o conjunto de funções poc_/private volta exatamente ao da migração", () => {
    const out = psql(`select 'RESULT:'||string_agg(n.nspname||'.'||p.proname, ',' order by n.nspname, p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' or (n.nspname='public' and p.proname like 'poc_%');`);
    expect(results(out)).toEqual(["private.current_uid,private.ensure_period_lock,private.handle_new_user,private.poc_add_entry,private.poc_close_period,public.poc_add_entry,public.poc_close_period"]);
  });
});
