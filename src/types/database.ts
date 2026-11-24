/**
 * Tipos do banco (subconjunto usado na Fase 1).
 * Quando o projeto estiver ligado ao Supabase, substituir por:
 *   npx supabase gen types typescript --project-id yimnqkwliqxqqgqctabn > src/types/database.ts
 */

export type PlatformRole = "user" | "super_admin";
export type ShopRole = "owner" | "admin" | "professional";
export type BarbershopStatus = "active" | "suspended";
export type BillingPeriod = "monthly" | "quarterly" | "semiannual" | "annual";
export type SubscriptionStatus = "trial" | "active" | "pending" | "past_due" | "canceled" | "suspended" | "expired";
export type AppointmentStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
export type AccessLevel = "full" | "grace" | "billing_only" | "blocked";

type Timestamp = string;

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  platform_role: PlatformRole;
  last_seen_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type Barbershop = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: BarbershopStatus;
  timezone: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  logo_url: string | null;
  cover_url: string | null;
  published_at: Timestamp | null;
  onboarding_step: number;
  onboarding_completed_at: Timestamp | null;
  is_demo: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type BarbershopMember = {
  id: string;
  barbershop_id: string;
  user_id: string;
  role: ShopRole;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  compare_at_cents: number | null;
  billing_period: BillingPeriod;
  trial_days: number;
  is_featured: boolean;
  highlight_label: string | null;
  is_active: boolean;
  is_default_trial: boolean;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type PlanFeature = {
  plan_id: string;
  feature_key: string;
  enabled: boolean;
  limit_value: number | null;
  label: string | null;
  sort_order: number;
};

export type Subscription = {
  id: string;
  barbershop_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  amount_cents: number;
  billing_period: BillingPeriod;
  started_at: Timestamp;
  current_period_start: Timestamp;
  current_period_end: Timestamp;
  next_billing_at: Timestamp | null;
  canceled_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Pick<Profile, "id" | "full_name"> & Partial<Profile>>;
      barbershops: Table<Barbershop>;
      barbershop_members: Table<BarbershopMember>;
      plans: Table<Plan>;
      plan_features: Table<PlanFeature>;
      subscriptions: Table<Subscription>;
    };
    Views: Record<string, never>;
    Functions: {
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      barbershop_access_level: { Args: { p_barbershop_id: string }; Returns: AccessLevel };
      plan_limit: { Args: { p_barbershop_id: string; p_feature_key: string }; Returns: number | null };
      has_feature: { Args: { p_barbershop_id: string; p_feature_key: string }; Returns: boolean };
    };
    Enums: {
      platform_role: PlatformRole;
      shop_role: ShopRole;
      subscription_status: SubscriptionStatus;
      appointment_status: AppointmentStatus;
      billing_period: BillingPeriod;
    };
    CompositeTypes: Record<string, never>;
  };
};
