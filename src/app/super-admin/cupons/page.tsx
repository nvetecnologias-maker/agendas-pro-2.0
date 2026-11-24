import { createClient } from "@/lib/supabase/server";
import { CouponsAdmin } from "@/components/admin/coupons-admin";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Cupons" };

export default async function AdminCouponsPage() {
  const supabase = await createClient();
  const [{ data: coupons }, { data: usage }, { data: plans }] = await Promise.all([
    supabase.from("coupons").select("*").order("created_at", { ascending: false }),
    supabase.from("coupon_usage").select("*"),
    supabase.from("plans").select("id, name, price_cents, is_active").order("sort_order"),
  ]);
  const use: Record<string, { redemptions: number; discount: number }> = {};
  for (const u of usage ?? []) if (u.coupon_id) use[u.coupon_id] = { redemptions: Number(u.redemptions ?? 0), discount: Number(u.discount_cents ?? 0) };
  return (
    <CouponsAdmin coupons={coupons ?? []} usage={use}
      plans={(plans ?? []).map((p) => ({ id: p.id, name: p.name, price: formatMoney(p.price_cents), active: p.is_active }))} />
  );
}
