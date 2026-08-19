# Gestão Financeira

Aplicação web de gestão financeira pessoal com autenticação, painel financeiro, filtros, relatórios, projeções, alertas e acompanhamento de hábitos de consumo.

A solução foi desenvolvida com React + Vite + TypeScript no frontend e Supabase no backend, com autenticação, armazenamento de dados e regras de segurança no banco.

## Status do projeto

- Frontend em produção: https://finantrack-oeqqszpqe-lucasizaias.vercel.app
- Repositório: https://github.com/shoitzsx/Gestao
- Stack principal: React, Vite, TypeScript, Tailwind CSS, Supabase, Recharts

## Visão geral

A plataforma permite:

- cadastro e login de usuários
- registro de receitas e despesas
- filtros por tipo, categoria, descrição e período
- cards financeiros com resumo do saldo e movimentações
- gráficos e dashboards com indicadores financeiros
- projeção de saldo para meses futuros
- alertas de vencimentos e faturas
- gestão de fontes de renda, despesas recorrentes, cartões, dívidas, parcelas e metas
- relatórios em CSV
- exclusão de conta com limpeza de dados do usuário

## Principais funcionalidades

- Autenticação com email e senha
- Rotas protegidas para usuários autenticados
- CRUD de transações por usuário logado
- Dados de demonstração por conta do usuário
- Personalização visual com tema claro e escuro
- Layout e UX responsivos
- RLS no Supabase para proteção dos dados
- Fluxo de deploy em Vercel com variáveis de ambiente

## Tecnologias utilizadas

- React 18
- Vite 6
- TypeScript
- Tailwind CSS
- Supabase JS
- Recharts
- Vitest
- Playwright para smoke test

## Requisitos

- Node.js 20+
- npm 10+
- Conta no Supabase
- Conta no Vercel

## Configuração local

1. Clone o projeto
2. Instale as dependências:

```bash
npm install
```

3. Crie um arquivo `.env` na raiz com as variáveis abaixo:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

O arquivo `.env.example` já contém o modelo esperado.

## Configuração do Supabase

1. Crie um projeto no Supabase.
2. Abra Project Settings > API.
3. Copie a URL do projeto para `VITE_SUPABASE_URL`.
4. Copie a chave `anon public` para `VITE_SUPABASE_ANON_KEY`.
5. No SQL Editor, execute o script em `supabase/schema.sql`.
6. Em Authentication, habilite o provedor de email.
7. Para produção, configure as URLs de redirect da Vercel no painel de autenticação do Supabase.

## Executar localmente

```bash
npm run dev
```

A aplicação será iniciada em:

```bash
http://localhost:5173
```

## Build de produção

```bash
npm run build
```

Os artefatos finais ficam na pasta `dist`.

## Testes

### Testes unitários e de lógica

```bash
npm test
```

### Smoke test

```bash
APP_URL=http://127.0.0.1:5180 npm run test:smoke
```

Este teste valida que não há erros de console e que não houve overflow horizontal.

## Deploy na Vercel

1. Conecte o repositório ao Vercel.
2. Selecione o framework Vite.
3. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Faça o deploy em produção.
5. Adicione a URL da Vercel no Supabase em Authentication > URL Configuration.

### Arquivo de roteamento Vercel

Foi incluído o arquivo `vercel.json` para garantir que rotas internas funcionem corretamente em SPA.

## Estrutura do projeto

```text
.
├── .env.example
├── .gitignore
├── README.md
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── scripts/
│   └── smoke-console.mjs
├── src/
│   ├── App.tsx
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── styles/
│   ├── types/
│   ├── main.tsx
│   └── vite-env.d.ts
├── supabase/
│   ├── migrations/
│   └── schema.sql
└── dist/
```

## Observações de segurança e operação

- As tabelas de dados do usuário usam `user_id` ligado ao `auth.users`.
- A aplicação usa Row Level Security para proteger acesso e manipulação dos dados.
- A exclusão de conta é tratada via função SQL para remover registros do usuário e seus dados.
- O valor da chave pública do Supabase fica visível no frontend por design do Supabase, como ocorre em qualquer cliente público.

## Conclusão

O projeto está pronto para uso em ambiente de desenvolvimento e produção, com frontend publicado no Vercel e integração com Supabase configurada para autenticação e persistência de dados.

Se houver a necessidade de uma próxima etapa, o próximo salto natural seria a criação de um domínio customizado, testes de UX em produção e refinamento de métricas financeiras e automações.
