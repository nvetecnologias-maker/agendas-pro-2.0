import { createClient } from "@/lib/supabase/server";
import { PlansAdmin } from "@/components/admin/plans-admin";

export const metadata = { title: "Planos" };

export default async function AdminPlansPage() {
  const supabase = await createClient();
  const [{ data: plans }, { data: features }, { data: subs }] = await Promise.all([
    supabase.from("plans").select("*").order("sort_order"),
    supabase.from("plan_features").select("*").order("sort_order"),
    supabase.from("subscriptions").select("plan_id").in("status", ["trial", "active", "pending", "past_due", "suspended"]),
  ]);
  const usage: Record<string, number> = {};
  for (const s of subs ?? []) usage[s.plan_id] = (usage[s.plan_id] ?? 0) + 1;
  return <PlansAdmin plans={plans ?? []} features={features ?? []} usage={usage} />;
}
