import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { AlertDismissal } from "../types/alerts";
import { useAuth } from "./useAuth";

export function useAlertDismissals() {
  const { user } = useAuth(); const [dismissals, setDismissals] = useState<AlertDismissal[]>([]); const [loading, setLoading] = useState(true);
  const refetchDismissals = useCallback(async () => { if (!user) { setDismissals([]); setLoading(false); return; } setLoading(true); const { data, error } = await supabase.from("alert_dismissals").select("*").eq("user_id", user.id).order("dismissed_at", { ascending: false }); setLoading(false); if (error) throw new Error("Não foi possível carregar os alertas descartados."); setDismissals(data ?? []); }, [user]);
  useEffect(() => { refetchDismissals().catch(() => undefined); }, [refetchDismissals]);
  const dismissAlert = useCallback(async (alertKey: string) => { if (!user) throw new Error("Sua sessão expirou. Entre novamente."); const { error } = await supabase.from("alert_dismissals").upsert({ user_id: user.id, alert_key: alertKey }, { onConflict: "user_id,alert_key" }); if (error) throw new Error("Não foi possível descartar o alerta."); await refetchDismissals(); }, [refetchDismissals, user]);
  return { dismissals, loading, dismissAlert, refetchDismissals };
}