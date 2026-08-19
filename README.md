# FinanTrack

FinanTrack é um MVP de gestão financeira pessoal multiusuário. A aplicação usa autenticação por email e senha ou magic link, registra receitas e despesas, filtra movimentações, calcula indicadores e mostra gráficos com dados reais do Supabase.

## Arquitetura

- Frontend: React, Vite e TypeScript.
- Estilização: Tailwind CSS com light mode e dark mode persistido em `localStorage`.
- Dados e autenticação: Supabase Auth, Supabase Postgres, client SDK e Row Level Security.
- Gráficos: Recharts.
- Deploy previsto: Vercel.
- Sem backend próprio: o CRUD usa o client do Supabase e a exclusão de conta usa uma função SQL `security definer` no próprio Supabase.

## Funcionalidades

- Cadastro, login por senha e magic link.
- Rotas protegidas para dashboard e conta.
- CRUD completo de transações do usuário logado.
- Categorias: Alimentação, Moradia, Transporte, Saúde, Educação, Lazer, Salário, Investimentos e Outros.
- Busca por descrição, filtros por tipo, categoria e período.
- Indicadores de saldo, entradas, saídas e quantidade de movimentações.
- Gráficos de receitas x despesas, gastos por categoria e evolução financeira.
- Dados de demonstração associados ao usuário logado.
- Exclusão de conta e dados financeiros pelo RPC `delete_current_user`.
- Política de Privacidade simples e pública.
- Layout responsivo para desktop, tablet e smartphone.

## Pré-requisitos

- Node.js 20 ou superior.
- npm 10 ou superior.
- Conta gratuita no Supabase.
- Conta na Vercel para deploy.

## Variáveis De Ambiente

Crie um arquivo `.env` na raiz com:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

O arquivo `.env.example` lista exatamente as variáveis necessárias:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

O `.env` está no `.gitignore` e não deve ser versionado.

## Configurar Supabase

1. Acesse https://supabase.com e crie um projeto gratuito.
2. No painel do projeto, abra Project Settings, depois API.
3. Copie a Project URL para `VITE_SUPABASE_URL`.
4. Copie a chave anon public para `VITE_SUPABASE_ANON_KEY`.
5. Abra SQL Editor.
6. Cole e execute o conteúdo de `supabase/schema.sql`.
7. Em Authentication, habilite Email provider.
8. Para magic link em produção, inclua a URL da Vercel em Authentication, URL Configuration, Redirect URLs.

Durante testes, o provedor de email embutido do Supabase pode retornar `email rate limit exceeded`. Para continuar o teste local sem esperar, desative temporariamente a confirmação de email em Authentication, Providers, Email, ou confirme manualmente o usuário no painel. Para produção, configure SMTP próprio em Authentication, SMTP Settings.

## Executar Localmente

```bash
npm install
npm run dev
```

Abra a URL exibida pelo Vite. Em geral:

```bash
http://localhost:5173
```

## Build De Produção

```bash
npm run build
```

Os arquivos finais são gerados em `dist`.

## Smoke Test

Com o servidor local rodando, execute em outro terminal:

```bash
npm run test:smoke
```

O teste abre login, privacidade e rota protegida no Chromium, verifica erros de console e checa overflow horizontal em viewport móvel.

## Deploy No Vercel

1. Suba o projeto para um repositório Git.
2. Acesse https://vercel.com e importe o repositório.
3. Em Framework Preset, selecione Vite.
4. Configure Build Command como `npm run build`.
5. Configure Output Directory como `dist`.
6. Em Environment Variables, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
7. Marque as variáveis para Production e Preview.
8. Faça o deploy.
9. Copie a URL final da Vercel.
10. No Supabase, adicione essa URL em Authentication, URL Configuration, Site URL e Redirect URLs.

## Como Testar

1. Crie uma conta com email e senha.
2. Faça login e confirme que `/dashboard` abre somente autenticado.
3. Cadastre uma receita de Salário e uma despesa de Supermercado.
4. Edite uma transação e verifique a atualização dos cards.
5. Exclua uma transação e confirme a mensagem visual.
6. Use busca, categoria, tipo e período, depois limpe filtros.
7. Confira os gráficos com os filtros ativos.
8. Clique em Carregar dados de exemplo e valide que os itens aparecem para o usuário logado.
9. Acesse Conta, digite `EXCLUIR` e confirme a exclusão.
10. Tente acessar `/dashboard` deslogado e confirme o redirecionamento para `/login`.

## Estrutura De Diretórios

```text
.
├── .env.example
├── .gitignore
├── README.md
├── index.html
├── package-lock.json
├── package.json
├── postcss.config.js
├── scripts
│   └── smoke-console.mjs
├── supabase
│   └── schema.sql
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── src
    ├── App.tsx
    ├── components
    │   ├── AppLayout.tsx
    │   ├── Button.tsx
    │   ├── ChartsPanel.tsx
    │   ├── ConfirmDialog.tsx
    │   ├── InlineFeedback.tsx
    │   ├── ProtectedRoute.tsx
    │   ├── SetupNotice.tsx
    │   ├── SummaryCards.tsx
    │   ├── ThemeToggle.tsx
    │   ├── TransactionFilters.tsx
    │   ├── TransactionForm.tsx
    │   └── TransactionTable.tsx
    ├── constants
    │   └── transactions.ts
    ├── hooks
    │   ├── useAuth.tsx
    │   ├── useTheme.tsx
    │   └── useTransactions.ts
    ├── lib
    │   ├── formatters.ts
    │   ├── supabase.ts
    │   └── validation.ts
    ├── main.tsx
    ├── pages
    │   ├── AccountPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── LoginPage.tsx
    │   ├── NotFoundPage.tsx
    │   └── PrivacyPage.tsx
    ├── styles
    │   └── index.css
    ├── types
    │   ├── supabase.ts
    │   └── transactions.ts
    └── vite-env.d.ts
```

## Segurança

Todas as tabelas de dados do usuário têm `user_id` referenciando `auth.users`. A tabela `transactions` tem RLS habilitado e políticas para SELECT, INSERT, UPDATE e DELETE usando `user_id = auth.uid()`.

A exclusão de conta é feita pela função `public.delete_current_user()`, criada no SQL. Ela valida `auth.uid()`, remove as transações do usuário e apaga o registro em `auth.users`.

## Autoria E Versão

- Produto: FinanTrack
- Versão: 0.1.0
- Fase: MVP

Antes do lançamento comercial oficial, busque revisão jurídica especializada para adequação legal, privacidade e termos de uso.
