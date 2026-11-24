-- ============================================================================
-- 0002 · Multi-tenancy: perfis, barbearias e membros
-- ----------------------------------------------------------------------------
-- Cada barbearia é um TENANT. Toda tabela operacional carrega barbershop_id e
-- as políticas RLS só liberam linhas de barbearias das quais o usuário é membro.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles: 1:1 com auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text not null check (char_length(full_name) between 2 and 120),
  email          extensions.citext,
  phone          text check (phone is null or phone ~ '^\+?[0-9]{10,15}$'),
  avatar_url     text,
  platform_role  public.platform_role not null default 'user',
  last_seen_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- barbershops: o tenant
-- ---------------------------------------------------------------------------
create table public.barbershops (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null check (char_length(name) between 2 and 120),
  slug                     extensions.citext not null unique
                             check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$'),
  description              text check (char_length(description) <= 2000),
  status                   public.barbershop_status not null default 'active',
  timezone                 text not null default 'America/Sao_Paulo',

  -- contato e endereço
  phone                    text,
  whatsapp                 text,
  email                    extensions.citext,
  address_street           text,
  address_number           text,
  address_complement       text,
  address_district         text,
  address_city             text,
  address_state            char(2),
  address_zip              text,
  social_links             jsonb not null default '{}'::jsonb,

  -- página pública (a identidade do painel NÃO muda com isto)
  logo_url                 text,
  cover_url                text,
  branding                 jsonb not null default '{}'::jsonb,  -- cores e imagens da página pública
  published_at             timestamptz,                         -- null = agenda não publicada

  -- preferências de agendamento
  min_advance_minutes      integer not null default 60   check (min_advance_minutes between 0 and 10080),
  max_advance_days         integer not null default 60   check (max_advance_days between 1 and 365),
  buffer_minutes           integer not null default 0    check (buffer_minutes between 0 and 240),
  slot_interval_minutes    integer not null default 15   check (slot_interval_minutes in (5, 10, 15, 20, 30, 60)),
  cancellation_min_hours   integer not null default 2    check (cancellation_min_hours between 0 and 168),
  cancellation_policy      text,
  auto_confirm             boolean not null default false,

  -- onboarding
  onboarding_step          smallint not null default 1 check (onboarding_step between 1 and 7),
  onboarding_completed_at  timestamptz,

  -- ambiente de demonstração: dados fictícios ficam marcados
  is_demo                  boolean not null default false,

  created_by               uuid references auth.users (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index barbershops_status_idx on public.barbershops (status);
create index barbershops_created_at_idx on public.barbershops (created_at desc);

create trigger barbershops_updated_at before update on public.barbershops
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- barbershop_members: quem pertence a qual barbearia, e com qual papel
-- ---------------------------------------------------------------------------
create table public.barbershop_members (
  id             uuid primary key default gen_random_uuid(),
  barbershop_id  uuid not null references public.barbershops (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  role           public.shop_role not null,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (barbershop_id, user_id)
);

create index barbershop_members_user_idx on public.barbershop_members (user_id) where is_active;

-- Uma barbearia tem exatamente um proprietário ativo
create unique index barbershop_members_one_owner
  on public.barbershop_members (barbershop_id) where role = 'owner' and is_active;

create trigger barbershop_members_updated_at before update on public.barbershop_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Funções de autorização usadas pelas políticas RLS.
-- SECURITY DEFINER evita recursão de RLS; search_path vazio evita sequestro.
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and platform_role = 'super_admin'
  );
$$;

create or replace function public.is_shop_member(shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.barbershop_members m
    where m.barbershop_id = shop_id
      and m.user_id = (select auth.uid())
      and m.is_active
  );
$$;

create or replace function public.has_shop_role(shop_id uuid, roles public.shop_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.barbershop_members m
    where m.barbershop_id = shop_id
      and m.user_id = (select auth.uid())
      and m.is_active
      and m.role = any (roles)
  );
$$;

-- Atalho: proprietário ou administrador da barbearia
create or replace function public.is_shop_manager(shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_shop_role(shop_id, array['owner', 'admin']::public.shop_role[]);
$$;

-- Gera um slug único a partir do nome (barbearia-do-joao, barbearia-do-joao-2, ...)
create or replace function public.generate_unique_slug(base_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  base text := left(public.slugify(base_name), 50);
  candidate text;
  n integer := 1;
begin
  if base is null or char_length(base) < 3 then
    base := 'barbearia';
  end if;
  candidate := base;
  while exists (select 1 from public.barbershops where slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end;
$$;
