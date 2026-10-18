export type DomainErrorCode =
  | "INVALID_AMOUNT"
  | "INVALID_DATE"
  | "INVALID_ARGUMENT"
  | "INVALID_ENTRY"
  | "DUPLICATE_ENTRY"
  | "UNKNOWN_REFERENCE"
  | "OVERPAYMENT"
  | "INSUFFICIENT_FUNDS"
  | "RESERVE_EXCEEDS_BALANCE";

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
