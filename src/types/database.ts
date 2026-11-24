/**
 * Tipos do banco. O schema completo vem de database.generated.ts
 * (gerado por scripts/gen-db-types.py a partir das migrations).
 * Aqui ficam apenas apelidos práticos usados pelo app.
 */
import type { Database, Json } from "./database.generated";

export type { Database, Json };

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type PlatformRole = Enums<"platform_role">;
export type ShopRole = Enums<"shop_role">;
export type BarbershopStatus = Enums<"barbershop_status">;
export type BillingPeriod = Enums<"billing_period">;
export type SubscriptionStatus = Enums<"subscription_status">;
export type AppointmentStatus = Enums<"appointment_status">;
export type AppointmentSource = Enums<"appointment_source">;
export type PaymentMethod = Enums<"payment_method">;
export type TimeBlockKind = Enums<"time_block_kind">;
export type AccessLevel = "full" | "grace" | "billing_only" | "blocked";

export type Profile = Tables<"profiles">;
export type Barbershop = Tables<"barbershops">;
export type BarbershopMember = Tables<"barbershop_members">;
export type Plan = Tables<"plans">;
export type PlanFeature = Tables<"plan_features">;
export type Subscription = Tables<"subscriptions">;
export type Professional = Tables<"professionals">;
export type Service = Tables<"services">;
export type Customer = Tables<"customers">;
export type Appointment = Tables<"appointments">;
export type Payment = Tables<"payments">;
export type WorkingHour = Tables<"working_hours">;
export type TimeBlock = Tables<"time_blocks">;
export type AppointmentEvent = Tables<"appointment_events">;
