# 💰 Gestão Financeira

**Para entender para onde vai o seu dinheiro e planejar os próximos meses, sem planilha.**

> 🚧 **Em reconstrução.** Hoje já dá para ver a página de apresentação. As telas para usar o app no dia a dia ainda estão sendo construídas.

Feito com React, TypeScript e Supabase · [🛠️ ver a parte técnica](#parte-tecnica)

---

## 🎯 Para que serve

Muita gente só descobre que o mês apertou quando a fatura chega. A ideia do Gestão Financeira (que aparece na tela com a marca **Nuvexa**) é ajudar você a:

- 💸 ver para onde o dinheiro está indo;
- 💳 acompanhar a fatura do cartão e as compras parceladas;
- 🐷 separar reservas e acompanhar metas;
- 🧮 saber quanto você realmente pode gastar;
- 📈 ver como o seu saldo deve ficar nos próximos meses.

## ✅ O que já existe hoje

- 🌐 **Página de apresentação**, que se adapta ao celular e ao computador.
- 🌗 **Tema claro e escuro**: o site lembra a sua escolha.
- 🧮 **As contas por trás do app já foram programadas e têm testes automáticos**: saldo, fatura do cartão, parcelas, reservas, valor disponível e projeção dos próximos meses. Elas ainda não aparecem na tela.
- 🔒 **A base de segurança dos dados já tem testes automáticos** num ambiente local. A regra é que cada pessoa só possa ver e alterar os próprios dados.

## 🚧 O que ainda está sendo construído

- 🔑 Entrar com a sua conta (hoje a página de acesso mostra "Em construção").
- 📝 Telas para registrar receitas, despesas, cartões e metas.
- 📊 Gráficos e projeções na tela.
- 🗑️ Excluir a sua conta junto com todos os seus dados.

> ℹ️ Os valores e os planos mostrados na página de apresentação ("Nuvexa Plus", "Nuvexa Pro" e "Nuvexa IA") são apenas ilustrativos e ainda não existem. As notificações de atividade que aparecem na página também são simuladas.

## 👤 Quem fez

Projeto individual desenvolvido por **Lucas Izaias**.

- 📂 Repositório: [github.com/shoitzsx/Nuvexa](https://github.com/shoitzsx/Nuvexa)
- 🐙 GitHub: [github.com/shoitzsx](https://github.com/shoitzsx)
- ✉️ E-mail: [lucas.mateus.izaias.santos@gmail.com](mailto:lucas.mateus.izaias.santos@gmail.com)

---

<a name="parte-tecnica"></a>

## 🛠️ Parte técnica

Esta seção explica como o projeto foi feito, para quem quer avaliar o código ou rodá-lo localmente.

### Linguagens e tecnologias

| Área | Tecnologias |
|---|---|
| Linguagens | TypeScript, SQL (PostgreSQL), CSS e JavaScript (scripts de teste) |
| Interface | React 18, Vite 6, Tailwind CSS 3, React Router 7, Framer Motion, Lucide |
| Banco de dados (local) | Supabase CLI (versão fixada em `package.json`), PostgreSQL, Row Level Security |
| Qualidade | Vitest (testes unitários e de integração), Playwright (regressão visual e smoke test) |

### Situação desta versão

Esta versão reúne a página de apresentação, o núcleo de regras financeiras e uma prova de conceito da arquitetura de segurança do banco. Rotas existentes: `/` (landing), `/privacy` (política de privacidade, com conteúdo provisório: "Documento em revisão"), `/login` (aviso "Em construção") e a página de rota não encontrada.

A implementação anterior (FinanTrack) está preservada na tag `legacy-finantrack` (commit `c7ae87a`).

### Núcleo financeiro (`src/domain`)

Módulos em TypeScript puro, sem dependência de interface ou de banco de dados. Entradas inválidas são rejeitadas com `DomainError` e um código de erro estável.

| Módulo | Responsabilidade |
|---|---|
| `money` | Valores em centavos inteiros (sem ponto flutuante), soma, divisão e rateio, conversão e formatação em reais |
| `dates` | Datas de negócio no formato `AAAA-MM-DD`, sem fuso horário: anos bissextos, fim de mês, soma de meses e dias |
| `invoiceCycle` | Datas de fechamento e vencimento da fatura e em qual fatura cada compra entra |
| `installments` | Planejamento de compras parceladas no cartão |
| `balance` | Saldo por conta e verificação de débito |
| `consumption` | Consumo mensal |
| `cardLimit` | Saldo das faturas e resumo do limite do cartão |
| `reserves` | Reservas por conta e saldo de metas |
| `available` | Valor disponível em um horizonte de tempo |
| `projection` | Projeção de saldos mês a mês |
| `validation` | Validação de lançamentos, transferências, pagamentos e aportes |

Os casos de teste compartilhados ficam em `tests/vectors/` (JSON) e são verificados por `src/domain/vectors.test.ts`.

### Arquitetura de segurança do banco (prova de conceito)

As migrações em `supabase/migrations/` são uma **prova de conceito descartável**, executada apenas no Supabase local:

- O papel `nuvexa_rpc` (`NOLOGIN`, `NOBYPASSRLS`) é dono das tabelas e das funções de escrita.
- Todas as tabelas usam `FORCE ROW LEVEL SECURITY`.
- As funções `SECURITY DEFINER` ficam no schema `private`, fora da API de dados. A API só chama funções `SECURITY INVOKER` do schema `public`.
- O papel `authenticated` tem apenas permissão de leitura nas tabelas.

A suíte em `tests/integration/` verifica essas regras com requisições HTTP reais à API local, usando usuários fictícios criados no próprio teste. Os achados e as pendências estão em [`docs/security/strategy-and-poc-findings.md`](docs/security/strategy-and-poc-findings.md).

<details>
<summary><strong>📁 Estrutura do projeto</strong></summary>

```text
.
├── docs/
│   ├── decisions/        # decisões sobre regras financeiras e exclusão de usuário
│   └── security/         # estratégia de segurança e achados da prova de conceito
├── scripts/
│   └── smoke-console.mjs # smoke test: erros de console e overflow horizontal
├── src/
│   ├── components/       # componentes da landing page
│   ├── domain/           # núcleo financeiro e seus testes
│   ├── hooks/            # tema claro/escuro
│   ├── pages/            # landing, privacidade, acesso e 404
│   └── styles/
├── supabase/
│   ├── config.toml       # configuração do Supabase local
│   └── migrations/       # prova de conceito da arquitetura de segurança
└── tests/
    ├── integration/      # testes da arquitetura de segurança (Supabase local)
    ├── vectors/          # casos de teste compartilhados do núcleo financeiro
    └── visual/           # regressão visual da landing page
```

</details>

### Executar localmente

**Pré-requisitos:** Node.js e npm (verificado com Node.js 24 e npm 11). Docker Desktop **somente** para os testes de integração.

```bash
git clone https://github.com/shoitzsx/Nuvexa.git
cd Nuvexa
npm ci
npm run dev
```

Esta versão **não precisa de arquivo `.env`**, porque a interface ainda não se conecta a nenhum serviço externo.

```bash
npm run build    # verificação de tipos (tsc) + build do Vite em dist/
npm run preview  # serve o build localmente
```

### Testes

| Comando | O que verifica | Requisitos |
|---|---|---|
| `npm test` | Núcleo financeiro (Vitest), incluindo os casos de `tests/vectors/` | Nenhum |
| `npm run test:int` | Arquitetura de segurança do banco | Docker e o Supabase local em execução (ver abaixo) |
| `npx playwright test` | Regressão visual da landing: notificações, botões de ação, privacidade e menu móvel. Gera o build e o serve em `127.0.0.1:4173` | Navegador do Playwright (`npx playwright install chromium`) |
| `npm run test:smoke` | Erros de console e overflow horizontal em um servidor já em execução (padrão: `http://127.0.0.1:5173`; outro endereço via `APP_URL`) | Servidor rodando e navegador do Playwright |

As imagens de referência do teste visual ficam em `tests/visual/__snapshots__/`, fora do Git. Para gerá-las de novo, use `npx playwright test --update-snapshots=all`, somente depois de confirmar que a mudança visual é intencional.

<details>
<summary><strong>🧪 Testes de integração com o Supabase local</strong></summary>

```bash
npm run db:start   # sobe o Supabase local (Docker)
npm run db:migrate # aplica migrações pendentes
npm run test:int
npm run db:stop
```

> **Atenção:** o Supabase CLI publica as portas da API (54321) e do PostgreSQL (54322) em todas as interfaces de rede. Antes de rodar, leia a seção "Isolamento de rede" em [`docs/security/strategy-and-poc-findings.md`](docs/security/strategy-and-poc-findings.md). Os testes se recusam a rodar contra qualquer endereço que não seja `127.0.0.1`.

</details>

### Limitações técnicas conhecidas

- O núcleo financeiro ainda não está ligado à interface, e não há autenticação.
- O banco existe apenas como prova de conceito local. Os objetos `poc_*` serão substituídos pelo esquema definitivo, e a arquitetura ainda não foi validada num projeto Supabase hospedado.
- Duas decisões financeiras aprovadas ainda não foram implementadas em `projection.ts`: projeções separadas de patrimônio total e saldo operacional, e receitas atrasadas tratadas como pendentes. Ver [`docs/decisions/`](docs/decisions/2026-10-18-financial-rules-and-user-deletion.md).
- Os testes de integração ainda não rodam em CI.
- Esta versão ainda não tem demonstração pública.

### Próximos passos técnicos (planejado, ainda não implementado)

1. Substituir a prova de conceito pelo esquema financeiro definitivo, mantendo o modelo de segurança validado.
2. Validar a arquitetura num projeto Supabase hospedado.
3. Implementar as decisões financeiras pendentes nas projeções.
4. Construir a autenticação e as telas da aplicação sobre o núcleo financeiro.
5. Implementar a exclusão controlada de conta descrita em `docs/decisions/`.
