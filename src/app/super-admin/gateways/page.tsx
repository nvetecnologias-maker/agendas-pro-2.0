import { createClient } from "@/lib/supabase/server";
import { GatewaysAdmin } from "@/components/admin/gateways-admin";

export const metadata = { title: "Gateways" };

export default async function AdminGatewaysPage() {
  const supabase = await createClient();
  const [{ data: gateways }, { data: settings }] = await Promise.all([
    supabase.from("payment_gateways_admin").select("*"),
    supabase.from("platform_settings").select("public_base_url").eq("id", true).maybeSingle(),
  ]);
  return <GatewaysAdmin gateways={(gateways ?? []).filter((g) => g.provider && g.environment) as never} baseUrl={settings?.public_base_url ?? ""} />;
}
