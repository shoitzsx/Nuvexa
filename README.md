# Nuvexa

Plataforma de gestão e inteligência financeira pessoal.

## Status

Fase 0: o repositório contém apenas a página de apresentação (landing page). A aplicação financeira está sendo reconstruída do zero; `/login` e `/privacy` exibem conteúdo provisório.

O código da implementação anterior (FinanTrack) está preservado na tag `legacy-finantrack`.

## Stack

React 18, Vite 6, TypeScript, Tailwind CSS 3, Framer Motion, Lucide.

## Comandos

```bash
npm install
npm run dev          # servidor de desenvolvimento
npm run build        # tsc + build de produção em dist/
npm test             # testes unitários (Vitest)
npx playwright test  # regressão visual da landing, notificações e navegação
APP_URL=http://127.0.0.1:4173 npm run test:smoke  # smoke test contra um servidor em execução
```

As capturas de referência do teste visual ficam em `tests/visual/__snapshots__/` (local, fora do git). Para gerá-las novamente: `npx playwright test --update-snapshots=all`, somente após confirmar que a mudança visual é intencional.
