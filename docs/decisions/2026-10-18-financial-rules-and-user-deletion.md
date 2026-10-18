# Decisões financeiras e plano de exclusão de usuário (Fase 1B-2A)

Registro das decisões aprovadas em 2026-10-18. O motor financeiro (`src/domain/`) **não foi alterado** nesta etapa.

## Decisões financeiras

| # | Decisão | Impacto no código |
|---|---|---|
| 1 | Lançamentos inválidos são **rejeitados**, nunca ignorados em silêncio. A interface mostra um erro claro. | Já atendido: `DomainError` com `code` estável em todo o domínio. A tradução do código para mensagem fica para a camada de interface. **Nenhuma mudança.** |
| 2 | Projeções distintas: **patrimônio total** e **saldo operacional** (contas incluídas no disponível). | **Exige mudança.** `src/domain/projection.ts` (parâmetro de escopo `operational` \| `total`), `src/domain/types.ts` (critério de quais contas compõem o patrimônio), `src/domain/projection.test.ts` e `tests/vectors/projection.json`. Hoje só existe a projeção operacional. |
| 3 | O mês atual é o primeiro mês das projeções. | Já atendido (mês 0 = mês atual). **Nenhuma mudança.** |
| 4 | Receitas atrasadas **não** são recebimentos garantidos: aparecem como pendentes, com simulação otimista separada. | **Exige mudança.** `src/domain/projection.ts` hoje soma receitas atrasadas ao mês atual; precisa tirá-las da base e expor `pendingIncomeCents` e uma série otimista. Atualizar `src/domain/projection.test.ts` e `tests/vectors/projection.json`. `src/domain/available.ts` já mantém a receita atrasada fora do disponível (`plannedIncomeCents` separado); só falta expor a lista de pendentes. |
| 5 | **Sem** anonimização de chaves de idempotência como solução automática de exclusão. Exclusão controlada; retenção só quando juridicamente justificada. | Sem código agora. Ver plano abaixo. |

As mudanças das decisões 2 e 4 aguardam autorização específica.

## Plano de exclusão controlada de usuário (a implementar na 1B-2B)

Princípios: a exclusão é um fluxo controlado no servidor, nunca um `DELETE` do cliente; os dados financeiros somem junto com o usuário; nada é retido sem base legal documentada.

1. **Pedido e confirmação.** O usuário reautentica e confirma; a interface oferece exportação (JSON/CSV) antes de excluir.
2. **Bloqueio de novas escritas.** Um marcador no perfil (`deletion_requested_at`) faz as RPCs recusarem novas operações. Período de carência a definir (decisão pendente).
3. **Exclusão efetiva** por função de servidor com a chave de serviço (nunca no frontend): `auth.admin.deleteUser`. Todas as tabelas com `user_id` usam `on delete cascade`, **inclusive** `idempotency_keys`, `audit_log`, `period_lock_events` e `period_locks`. As chaves de idempotência morrem com a conta, sem anonimização.
4. **Por que isso é seguro para a idempotência.** Toda operação exige JWT válido do usuário. Depois da exclusão não existe sessão nem `user_id` reaproveitável (o UUID não é recriado), então uma requisição antiga não tem como recriar movimentação alguma.
5. **Retenção.** Somente o que a lei exigir (por exemplo, registros de cobrança de planos pagos), em tabela separada **sem conteúdo financeiro do usuário**, com base legal e prazo documentados. Exige revisão jurídica antes do lançamento.
6. **Backups.** Dados excluídos permanecem nos backups até a rotação; o prazo entra na política de privacidade.
7. **Verificação automatizada.** Teste dirigido pelo catálogo: depois da exclusão, toda tabela do schema `public` que tenha `user_id` retorna zero linhas para esse usuário.

A validar na prova de conceito: que o `on delete cascade` funciona em tabelas com `FORCE ROW LEVEL SECURITY` (as verificações de integridade referencial ignoram RLS).
