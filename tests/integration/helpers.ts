// Utilitários dos testes de integração. Tudo roda SOMENTE contra o Supabase local (127.0.0.1).
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

export const DB_CONTAINER = "supabase_db_nuvexa-local";

interface LocalStatus {
  API_URL: string;
  ANON_KEY: string;
  SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
  SECRET_KEY?: string;
  PUBLISHABLE_KEY?: string;
}

let cachedStatus: LocalStatus | null = null;

export function localStatus(): LocalStatus {
  if (cachedStatus) return cachedStatus;
  const out = execFileSync("npx", ["--no-install", "supabase", "status", "-o", "json"], {
    encoding: "utf8",
    shell: true,
  });
  const json = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1)) as LocalStatus;
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(json.API_URL)) {
    throw new Error(`API local inesperada: ${json.API_URL}. Os testes só rodam contra 127.0.0.1.`);
  }
  cachedStatus = json;
  return json;
}

// ---------- HTTP ----------

export interface HttpResult<T = unknown> {
  status: number;
  body: T;
  text: string;
}

export async function api<T = unknown>(
  path: string,
  options: { token?: string | null; method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<HttpResult<T>> {
  const { API_URL, ANON_KEY } = localStatus();
  const headers: Record<string, string> = {
    apikey: ANON_KEY,
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (options.token !== null) headers.Authorization = `Bearer ${options.token ?? ANON_KEY}`;
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* corpo não JSON */
  }
  return { status: response.status, body: body as T, text };
}

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

/** Cadastro real pelo GoTrue local, só com a chave pública (como faria o frontend). */
export async function signUp(label: string): Promise<TestUser> {
  const email = `poc-${label}-${randomUUID().slice(0, 8)}@example.test`;
  const res = await api<{ access_token?: string; user?: { id: string } }>("/auth/v1/signup", {
    method: "POST",
    token: null,
    body: { email, password: `Pw-${randomUUID()}` },
  });
  if (res.status !== 200 || !res.body.access_token || !res.body.user) {
    throw new Error(`falha no cadastro (${res.status}): ${res.text}`);
  }
  return { id: res.body.user.id, email, token: res.body.access_token };
}

/** Exclusão administrativa (somente testes, chave de serviço local, nunca no frontend). */
export async function adminDeleteUser(id: string): Promise<number> {
  const { API_URL, SERVICE_ROLE_KEY } = localStatus();
  const response = await fetch(`${API_URL}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  return response.status;
}

// ---------- SQL (via docker exec, como postgres) ----------

const PSQL = ["exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"];

export function psql(sql: string): string {
  return execFileSync("docker", PSQL, { input: sql, encoding: "utf8" }).replace(/\r/g, "");
}

export function psqlTry(sql: string): { ok: boolean; out: string; err: string } {
  const result = spawnSync("docker", PSQL, { input: sql, encoding: "utf8" });
  return { ok: result.status === 0, out: (result.stdout ?? "").replace(/\r/g, ""), err: (result.stderr ?? "").replace(/\r/g, "") };
}

/** Executa `body` como `role`, com os claims JWT de `uid` (ou sem claims), tudo em transação revertida. */
export function asRoleScript(role: string, uid: string | null, body: string): string {
  const claims = uid ? JSON.stringify({ sub: uid, role }) : "";
  return [
    "begin;",
    `set local role ${role};`,
    uid ? `select set_config('request.jwt.claims', '${claims}', true) as _c \\gset` : "",
    body,
    "rollback;",
  ].join("\n");
}

export function sqlAs(role: string, uid: string | null, body: string): { ok: boolean; out: string; err: string } {
  return psqlTry(asRoleScript(role, uid, body));
}

/** Linhas `RESULT:<valor>` impressas pelo script. */
export function results(out: string): string[] {
  return out
    .split("\n")
    .filter((l) => l.startsWith("RESULT:"))
    .map((l) => l.slice(7));
}

export function runAsync(sql: string): Promise<{ code: number | null; out: string; err: string; startedAt: number; endedAt: number }> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn("docker", PSQL);
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => resolve({ code, out: out.replace(/\r/g, ""), err: err.replace(/\r/g, ""), startedAt, endedAt: Date.now() }));
    child.stdin.write(sql);
    child.stdin.end();
  });
}
