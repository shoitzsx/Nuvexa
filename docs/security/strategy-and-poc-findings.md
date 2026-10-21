# Segurança da NUVEXA: estratégia e achados da prova de conceito (Fase 1B-2A)

Documento vivo. Registra o que foi **verificado na prática** em 2026-10-18 e o que ainda está pendente.

## 1. Isolamento de rede do Supabase local

| Fato verificado | Evidência |
|---|---|
| O Supabase CLI publica as portas 54321 (API) e 54322 (PostgreSQL) em `0.0.0.0` e `[::]` | `docker ps` e `netstat`; `HostIp` vazio |
| O Docker Desktop (Windows) **ignora** `"ip": "127.0.0.1"` no `daemon.json` | Testado e revertido; nenhuma configuração global do Docker foi mantida |
| Existe regra de **permitir** entrada para `com.docker.backend.exe` (perfil Público) | Consulta ao Firewall |
| Regra criada pelo usuário: `Nuvexa: bloquear Supabase local fora do localhost` (entrada, Block, TCP 54321-54329, perfil Any) | PersistentStore e ActiveStore, 1 regra |
| **IPv4 (iPhone real, scanner TCP):** 4173 aberta (controle), 54321 e 54322 bloqueadas | Teste do usuário |
| **IPv6 (link-local) e IPv4 pela interface virtual do WSL:** controle (porta 4180) conecta; 54321 e 54322 sem resposta | Teste a partir do WSL2 |

Ressalvas: o IPv6 foi verificado pela interface `vEthernet (WSL)` e não por um segundo dispositivo físico; o PC só tem IPv6 link-local. A proteção depende de **uma regra local do Windows**: reverificar depois de atualizações do Docker ou do Windows e em cada máquina de desenvolvimento nova. Regra para remoção: `Remove-NetFirewallRule -DisplayName "Nuvexa: bloquear Supabase local fora do localhost"`.

## 2. Arquitetura de segurança validada (PoC)

`nuvexa_rpc` (NOLOGIN, NOBYPASSRLS) é dono das tabelas e das funções; `FORCE ROW LEVEL SECURITY`; funções `SECURITY DEFINER` no schema `private` (fora da Data API); a API só chama wrappers `SECURITY INVOKER` em `public`; `authenticated` só tem `SELECT` nas tabelas.

Resultado: `npm run test:int` passa **47/47** (HTTP real com dois usuários fictícios, SQL por papel, catálogo, concorrência, exclusão em cascata e varredura de credenciais). A suíte foi validada com 5 degradações propositais (INSERT para `authenticated`, SELECT para `anon`, policy `true`, FORCE RLS removida, função interna exposta): todas detectadas.

## 3. Achados (o que a PoC revelou)

| # | Achado | Tratamento |
|---|---|---|
| F1 | `nuvexa_rpc` **não consegue usar o schema `auth`**: o `postgres` tem `USAGE` sem `GRANT OPTION`, então o `GRANT` não concede nada e `auth.uid()` falha ("permission denied for schema auth") | Helper `private.current_uid()` lê o mesmo `request.jwt.claims` (só o JSON, não o GUC legado). **Desvio da arquitetura inicial: requer aprovação para a 1B-2B** |
| F2 | `INSERT ... ON CONFLICT DO NOTHING` também aplica a política de **leitura**; sem JWT (cadastro) isso derrubava o cadastro | Gatilho de cadastro usa `INSERT` simples |
| F3 | O `postgres` do Supabase tem `BYPASSRLS`: funções dele ignoram a RLS | Confirmado; funções ficam com `nuvexa_rpc` e há teste de catálogo |
| F4 | Os privilégios padrão do `supabase_admin` em `public` concedem acesso a `anon`/`authenticated` | Teste garante que nenhum objeto de `public` pertence ao `supabase_admin`; padrões do `postgres` e do `nuvexa_rpc` foram endurecidos |
| F5 | O Supabase carrega `safeupdate`: `DELETE` sem `WHERE` é recusado | Proteção extra (as funções de teste usam `WHERE true`) |
| F6 | Política de provisionamento: sem JWT, `nuvexa_rpc` pode inserir linha de trava **vazia** | Risco residual desprezível (linha vazia, só por função definer, `anon` sem EXECUTE, FK exige usuário existente); policy impede data ou outro usuário |
| F7 | `authenticated` tem `USAGE` no schema `private` e `EXECUTE` nas funções de escrita | Não é alcançável pela Data API (406 `PGRST106`); só uma conexão direta ao banco chegaria lá, e o banco não é exposto |

Funções deliberadamente vulneráveis existem **somente durante os testes** (`tests/integration/sql/`) e são removidas ao final (verificado por teste de catálogo).

## 4. Estratégia de testes de segurança (inclui OWASP ZAP)

Ferramentas e estado:

| Ferramenta | Estado |
|---|---|
| Semgrep (Guardian) | Disponível na sessão; analisa arquivos ao serem escritos |
| OWASP ZAP | **Instalado**: 2.17.0 (desktop) em `C:\Program Files\ZAP`, Java 17 presente. Sem integração por ferramenta (MCP/skill/CLI no PATH) e sem imagem Docker |
| Testes de integração próprios | `npm run test:int` |

Regras gerais: nenhuma ferramenta ataca produção; alvos somente `127.0.0.1` com dados fictícios; varredura **ativa** só em ambiente local controlado, com dados fictícios e autorização explícita; o ZAP deve escutar em `127.0.0.1` e a faixa de portas dele entra na regra de bloqueio do Firewall.

Plano por etapa (nada disso foi executado):
1. **ZAP Baseline (passivo)** contra a landing e, depois, contra a aplicação funcional local.
2. **Importar a descrição da API** (OpenAPI do PostgREST) e inspecionar os endpoints expostos.
3. **Autenticação e autorização:** contextos com dois usuários fictícios (leitura e escrita cruzadas, token adulterado e expirado).
4. **Sessões:** expiração, renovação, logout e armazenamento de tokens.
5. **Varredura ativa** local, somente com autorização.
6. Semgrep no CI e revisão manual das funções `SECURITY DEFINER` a cada migração.

## 5. Pendências para a Fase 1B-2B

1. Aprovar o helper `private.current_uid()` (F1).
2. Validar `grant nuvexa_rpc to postgres`, a posse de objetos e o gatilho em `auth.users` num **projeto Supabase novo e remoto** (o local não prova o ambiente hospedado).
3. Migração para remover os objetos `poc_*` e criar o esquema financeiro definitivo, mantendo `nuvexa_rpc`, `private`, `current_uid` e o gatilho de cadastro.
4. Decisões financeiras 2 e 4 (mudanças em `projection.ts`).
5. Plano de CI para testes de integração sem depender de regra de Firewall de máquina.
6. Definir como o ZAP será executado (instalação local existente × imagem Docker).
