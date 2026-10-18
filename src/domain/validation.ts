import { assertIsoDate } from "./dates";
import { DomainError } from "./errors";
import { assertPositiveCents } from "./money";
import type { EntryStatus, GoalContribution, InvoicePayment, LedgerData, Transaction, Transfer } from "./types";

function invalid(message: string): never {
  throw new DomainError("INVALID_ENTRY", message);
}

/** Impede que o mesmo lançamento seja contado duas vezes. */
export function assertUniqueIds(list: readonly { id: string }[], label: string): void {
  const seen = new Set<string>();
  for (const { id } of list) {
    if (seen.has(id)) {
      throw new DomainError("DUPLICATE_ENTRY", `${label}: id duplicado "${id}"`);
    }
    seen.add(id);
  }
}

function assertStatusDates(
  entry: { status: EntryStatus; expectedDate: string | null; postedDate: string | null },
  label: string,
  { allowPlanned = true }: { allowPlanned?: boolean } = {},
): void {
  if (entry.expectedDate !== null) assertIsoDate(entry.expectedDate, `${label}: data esperada`);
  if (entry.postedDate !== null) assertIsoDate(entry.postedDate, `${label}: data efetiva`);
  if (entry.status === "planned") {
    if (!allowPlanned) invalid(`${label}: não pode ser planejado`);
    if (entry.expectedDate === null) invalid(`${label}: planejado exige data esperada`);
    if (entry.postedDate !== null) invalid(`${label}: planejado não pode ter data efetiva`);
  } else if (entry.status === "posted" && entry.postedDate === null) {
    invalid(`${label}: realizado exige data efetiva`);
  }
}

export function assertValidTransaction(t: Transaction): void {
  const label = `lançamento ${t.id}`;
  assertPositiveCents(t.amountCents, `${label}: valor`);
  assertIsoDate(t.competenceDate, `${label}: competência`);

  const targets = (t.accountId !== null ? 1 : 0) + (t.cardId !== null ? 1 : 0);
  if (targets !== 1) invalid(`${label}: informe exatamente uma conta ou um cartão`);

  if (t.cardId !== null) {
    if (t.invoiceId === null) invalid(`${label}: item de cartão exige fatura`);
    if (t.kind === "income") invalid(`${label}: receita não pode ser lançada em cartão`);
    assertStatusDates(t, label, { allowPlanned: false });
  } else {
    if (t.invoiceId !== null) invalid(`${label}: lançamento em conta não tem fatura`);
    assertStatusDates(t, label);
  }

  if (t.kind === "refund") {
    if (t.refundOfId === null) invalid(`${label}: estorno exige o lançamento original`);
  } else if (t.refundOfId !== null) {
    invalid(`${label}: somente estornos apontam para um original`);
  }
}

export function assertValidTransfer(t: Transfer): void {
  const label = `transferência ${t.id}`;
  assertPositiveCents(t.amountCents, `${label}: valor`);
  if (t.fromAccountId === t.toAccountId) invalid(`${label}: origem e destino devem ser diferentes`);
  assertStatusDates(t, label);
}

export function assertValidPayment(p: InvoicePayment): void {
  assertPositiveCents(p.amountCents, `pagamento ${p.id}: valor`);
  assertIsoDate(p.paidDate, `pagamento ${p.id}: data`);
}

export function assertValidContribution(c: GoalContribution): void {
  assertPositiveCents(c.amountCents, `aporte ${c.id}: valor`);
  assertStatusDates(c, `aporte ${c.id}`);
}

function missing(what: string, id: string): never {
  throw new DomainError("UNKNOWN_REFERENCE", `${what} inexistente: "${id}"`);
}

export function assertValidLedger(data: LedgerData): void {
  assertUniqueIds(data.accounts, "contas");
  assertUniqueIds(data.transactions, "lançamentos");
  assertUniqueIds(data.transfers, "transferências");
  assertUniqueIds(data.payments, "pagamentos");
  assertUniqueIds(data.contributions, "aportes");
  assertUniqueIds(data.invoices, "faturas");

  const accountIds = new Set(data.accounts.map((a) => a.id));
  const invoiceById = new Map(data.invoices.map((i) => [i.id, i]));
  const transactionById = new Map(data.transactions.map((t) => [t.id, t]));

  for (const t of data.transactions) {
    assertValidTransaction(t);
    if (t.accountId !== null && !accountIds.has(t.accountId)) missing("conta", t.accountId);
    if (t.invoiceId !== null) {
      const invoice = invoiceById.get(t.invoiceId) ?? missing("fatura", t.invoiceId);
      if (invoice.cardId !== t.cardId) invalid(`lançamento ${t.id}: a fatura pertence a outro cartão`);
    }
  }

  const refunded = new Map<string, number>();
  for (const t of data.transactions) {
    if (t.kind !== "refund" || t.refundOfId === null) continue;
    const original = transactionById.get(t.refundOfId) ?? missing("lançamento original", t.refundOfId);
    if (original.kind !== "expense") invalid(`estorno ${t.id}: o original deve ser uma despesa`);
    if (t.status === "canceled") continue;
    const total = (refunded.get(original.id) ?? 0) + t.amountCents;
    if (total > original.amountCents) invalid(`estorno ${t.id}: excede o valor do lançamento original`);
    refunded.set(original.id, total);
  }

  for (const t of data.transfers) {
    assertValidTransfer(t);
    if (!accountIds.has(t.fromAccountId)) missing("conta", t.fromAccountId);
    if (!accountIds.has(t.toAccountId)) missing("conta", t.toAccountId);
  }
  for (const p of data.payments) {
    assertValidPayment(p);
    if (!invoiceById.has(p.invoiceId)) missing("fatura", p.invoiceId);
    if (!accountIds.has(p.accountId)) missing("conta", p.accountId);
  }
  for (const c of data.contributions) {
    assertValidContribution(c);
    if (!accountIds.has(c.accountId)) missing("conta", c.accountId);
  }
}
