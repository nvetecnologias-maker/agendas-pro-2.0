import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

/**
 * Cliente com service_role: IGNORA a RLS. Uso restrito a rotinas de servidor
 * (webhooks de pagamento, tarefas agendadas, ações do Super Admin já
 * autorizadas). Nunca importar em código de cliente: "server-only" garante isso.
 */
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada (somente no servidor).");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
