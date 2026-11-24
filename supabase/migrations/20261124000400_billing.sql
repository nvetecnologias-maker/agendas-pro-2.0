-- ============================================================================
-- 0004 · Plataforma: planos, assinaturas, cupons, gateways e configurações
-- ============================================================================

-- ---------------------------------------------------------------------------
-- platform_settings: linha única com as configurações gerais
-- ---------------------------------------------------------------------------
create table public.platform_settings (
  id                     boolean primary key default true check (id),  -- garante linha única
  platform_name          text not null default 'Agendas Pro',
  logo_url               text,
  favicon_url            text,
  support_email          extensions.citext,
  contact_phone          text,
  contact_whatsapp       text,
  public_base_url        text not null default 'https://agendaspro.com.br',
  default_trial_days     integer not null default 14 check (default_trial_days between 0 and 90),
  grace_period_days      integer not null default 5  check (grace_period_days between 0 and 60),
  default_gateway        public.payment_gateway,
  notification_settings  jsonb not null default '{}'::jsonb,
  billing_settings       jsonb not null default '{}'::jsonb,
  updated_at             timestamptz not null default now(),
  updated_by             uuid references auth.users (id) on delete set null
);
insert into public.platform_settings (id) values (true);
create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- plans (vitrine dinâmica da landing page vem daqui)
-- ---------------------------------------------------------------------------
create table public.plans (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 2 and 60),
  slug              extensions.citext not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  description       text check (char_length(description) <= 500),
  price_cents       integer not null check (price_cents >= 0),
  compare_at_cents  integer check (compare_at_cents is null or compare_at_cents >= 0),  -- preço "de" em promoções
  billing_period    public.billing_period not null default 'monthly',
  trial_days        integer not null default 14 check (trial_days between 0 and 90),
  is_featured       boolean not null default false,  -- destaque visual
  highlight_label   text check (char_length(highlight_label) <= 30),
  is_active         boolean not null default true,
  is_default_trial  boolean not null default false,  -- plano usado no trial de novos cadastros
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index plans_one_default_trial on public.plans (is_default_trial) where is_default_trial;
create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- plan_features: funcionalidades e limites por plano
--   feature_key segue o catálogo em src/lib/permissions/features.ts
--   limit_value NULL = ilimitado
-- ---------------------------------------------------------------------------
create table public.plan_features (
  plan_id      uuid not null references public.plans (id) on delete cascade,
  feature_key  text not null check (feature_key ~ '^[a-z][a-z0-9_.]{1,60}$'),
  enabled      boolean not null default true,
  limit_value  integer check (limit_value is null or limit_value >= 0),
  label        text,  -- texto exibido na vitrine de planos
  sort_order   integer not null default 0,
  primary key (plan_id, feature_key)
);

-- ---------------------------------------------------------------------------
-- coupons e resgates
-- ---------------------------------------------------------------------------
create table public.coupons (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  code             extensions.citext not null unique check (code ~ '^[A-Za-z0-9_-]{3,40}$'),
  discount_type    public.discount_type not null,
  discount_value   integer not null check (discount_value > 0),  -- % (1-100) ou centavos
  extra_trial_days integer not null default 0 check (extra_trial_days between 0 and 90),
  starts_at        timestamptz,
  ends_at          timestamptz,
  max_redemptions  integer check (max_redemptions is null or max_redemptions > 0),
  audience         public.coupon_audience not null default 'all',
  applicable_plan_ids uuid[] not null default '{}',  -- vazio = todos
  is_active        boolean not null default true,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create trigger coupons_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  barbershop_id            uuid not null references public.barbershops (id) on delete cascade,
  plan_id                  uuid not null references public.plans (id) on delete restrict,
  status                   public.subscription_status not null,
  amount_cents             integer not null check (amount_cents >= 0),
  billing_period           public.billing_period not null,
  started_at               timestamptz not null default now(),
  current_period_start     timestamptz not null default now(),
  current_period_end       timestamptz not null,   -- vencimento
  next_billing_at          timestamptz,
  coupon_id                uuid references public.coupons (id) on delete set null,
  gateway                  public.payment_gateway,
  gateway_customer_id      text,
  gateway_subscription_id  text,
  canceled_at              timestamptz,
  cancel_at_period_end     boolean not null default false,
  suspended_at             timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (current_period_end > current_period_start)
);
-- Só uma assinatura "viva" por barbearia
create unique index subscriptions_one_current
  on public.subscriptions (barbershop_id)
  where status in ('trial', 'active', 'pending', 'past_due', 'suspended');
create index subscriptions_status_idx on public.subscriptions (status, current_period_end);
create unique index subscriptions_gateway_ref on public.subscriptions (gateway, gateway_subscription_id)
  where gateway_subscription_id is not null;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- histórico da assinatura (criação, mudança de plano, renovação, suspensão...)
create table public.subscription_events (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid not null references public.subscriptions (id) on delete cascade,
  barbershop_id    uuid not null references public.barbershops (id) on delete cascade,
  event_type       text not null,  -- created, plan_changed, renewed, days_granted, suspended, reactivated, canceled, expired, payment_failed
  from_status      public.subscription_status,
  to_status        public.subscription_status,
  metadata         jsonb not null default '{}'::jsonb,
  actor_id         uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index subscription_events_sub_idx on public.subscription_events (subscription_id, created_at desc);

create table public.coupon_redemptions (
  id               uuid primary key default gen_random_uuid(),
  coupon_id        uuid not null references public.coupons (id) on delete restrict,
  barbershop_id    uuid not null references public.barbershops (id) on delete cascade,
  subscription_id  uuid references public.subscriptions (id) on delete set null,
  discount_cents   integer not null default 0,
  redeemed_at      timestamptz not null default now(),
  unique (coupon_id, barbershop_id)
);

-- ---------------------------------------------------------------------------
-- payment_gateways: configuração dos gateways (Mercado Pago, Asaas, Stripe)
-- As chaves secretas NUNCA ficam aqui em texto aberto: ficam no Supabase Vault
-- e esta tabela guarda apenas o id do segredo. Só o servidor (service_role)
-- consegue resolvê-lo.
-- ---------------------------------------------------------------------------
create table public.payment_gateways (
  id                       uuid primary key default gen_random_uuid(),
  provider                 public.payment_gateway not null,
  environment              public.gateway_environment not null default 'sandbox',
  is_active                boolean not null default false,
  public_key               text,                 -- chave pública (pode ir ao navegador)
  secret_key_vault_id      uuid,                 -- id em vault.secrets
  webhook_secret_vault_id  uuid,                 -- id em vault.secrets
  enabled_methods          text[] not null default array['pix', 'credit_card'],
  updated_by               uuid references auth.users (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (provider, environment)
);
create unique index payment_gateways_one_active on public.payment_gateways (is_active) where is_active;
create trigger payment_gateways_updated_at before update on public.payment_gateways
  for each row execute function public.set_updated_at();

-- transações de cobrança da ASSINATURA (plataforma <- barbearia)
create table public.payment_transactions (
  id                    uuid primary key default gen_random_uuid(),
  barbershop_id         uuid not null references public.barbershops (id) on delete cascade,
  subscription_id       uuid references public.subscriptions (id) on delete set null,
  plan_id               uuid references public.plans (id) on delete set null,
  gateway               public.payment_gateway not null,
  environment           public.gateway_environment not null,
  gateway_payment_id    text,
  amount_cents          integer not null check (amount_cents >= 0),
  discount_cents        integer not null default 0 check (discount_cents >= 0),
  method                text,
  status                public.transaction_status not null default 'pending',
  paid_at               timestamptz,
  raw_payload           jsonb,  -- payload do webhook (sem dados de cartão)
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create unique index payment_transactions_gateway_ref
  on public.payment_transactions (gateway, gateway_payment_id) where gateway_payment_id is not null;  -- idempotência de webhook
create index payment_transactions_shop_idx on public.payment_transactions (barbershop_id, created_at desc);
create trigger payment_transactions_updated_at before update on public.payment_transactions
  for each row execute function public.set_updated_at();
