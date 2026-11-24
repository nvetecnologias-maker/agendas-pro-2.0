-- ============================================================================
-- 0001 · Extensões, tipos (enums) e utilitários
-- ============================================================================

create extension if not exists pgcrypto   with schema extensions;
create extension if not exists citext     with schema extensions;
create extension if not exists unaccent   with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Papéis
-- ---------------------------------------------------------------------------
-- Papel na PLATAFORMA (global). Apenas 'super_admin' tem acesso ao /super-admin.
create type public.platform_role as enum ('user', 'super_admin');

-- Papel DENTRO de uma barbearia (por tenant).
create type public.shop_role as enum ('owner', 'admin', 'professional');

-- ---------------------------------------------------------------------------
-- Barbearia e operação
-- ---------------------------------------------------------------------------
create type public.barbershop_status as enum ('active', 'suspended');

create type public.appointment_status as enum (
  'pending',      -- Pendente
  'confirmed',    -- Confirmado
  'in_progress',  -- Em atendimento
  'completed',    -- Concluído
  'cancelled',    -- Cancelado
  'no_show'       -- Não compareceu
);

create type public.appointment_source as enum ('manual', 'public_page');

create type public.time_block_kind as enum ('block', 'day_off', 'holiday');

create type public.payment_method as enum ('cash', 'pix', 'debit_card', 'credit_card', 'other');

create type public.payment_status as enum ('received', 'refunded');

-- ---------------------------------------------------------------------------
-- Planos e assinaturas
-- ---------------------------------------------------------------------------
create type public.billing_period as enum ('monthly', 'quarterly', 'semiannual', 'annual');

create type public.subscription_status as enum (
  'trial',      -- Trial
  'active',     -- Ativa
  'pending',    -- Pendente (aguardando 1º pagamento)
  'past_due',   -- Atrasada
  'canceled',   -- Cancelada
  'suspended',  -- Suspensa
  'expired'     -- Expirada
);

create type public.discount_type as enum ('percent', 'fixed');

create type public.coupon_audience as enum ('all', 'new_customers', 'existing_customers');

create type public.payment_gateway as enum ('mercado_pago', 'asaas', 'stripe');

create type public.gateway_environment as enum ('sandbox', 'production');

create type public.transaction_status as enum ('pending', 'approved', 'refused', 'refunded', 'canceled');

-- ---------------------------------------------------------------------------
-- Notificações
-- ---------------------------------------------------------------------------
create type public.notification_channel as enum ('in_app', 'email', 'whatsapp');

create type public.notification_status as enum (
  'pending',
  'sent',
  'failed',
  'skipped_not_configured'  -- canal não configurado: NÃO simulamos envio
);

-- ---------------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------------

-- Mantém updated_at sempre correto
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- "Barbearia do João" -> "barbearia-do-joao"
create or replace function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from
    regexp_replace(
      lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(value, ''))),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;
