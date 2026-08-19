export type AlertSeverity = "info" | "attention";

export interface FinancialAlert {
  key: string;
  severity: AlertSeverity;
  title: string;
  message: string;
}

export interface AlertDismissal {
  id: string;
  user_id: string;
  alert_key: string;
  dismissed_at: string;
}