import { createClient } from "@/lib/supabase/server";
import { PlatformSettingsForm } from "@/components/admin/platform-settings-form";

export const metadata = { title: "Configurações" };

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("*").eq("id", true).maybeSingle();
  if (!data) return <p className="text-danger">Configurações não encontradas.</p>;
  const social = (data.social_links as Record<string, string> | null) ?? {};
  return (
    <PlatformSettingsForm initial={{
      platformName: data.platform_name, supportEmail: data.support_email ?? "", contactPhone: data.contact_phone ?? "",
      contactWhatsapp: data.contact_whatsapp ?? "", publicBaseUrl: data.public_base_url, defaultTrialDays: String(data.default_trial_days),
      gracePeriodDays: String(data.grace_period_days), instagram: social.instagram ?? "",
    }} />
  );
}
