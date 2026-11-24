-- ============================================================================
-- 0003 · Operação da barbearia
-- profissionais, serviços, horários, bloqueios, clientes, agendamentos, pagamentos
-- ----------------------------------------------------------------------------
-- Isolamento reforçado: as chaves estrangeiras entre tabelas operacionais são
-- COMPOSTAS (barbershop_id, id). Assim é impossível, mesmo por bug, ligar um
-- agendamento da barbearia A a um profissional da barbearia B.
-- Valores monetários em centavos (integer) para evitar erros de arredondamento.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- professionals
-- ---------------------------------------------------------------------------
create table public.professionals (
  id             uuid primary key default gen_random_uuid(),
  barbershop_id  uuid not null references public.barbershops (id) on delete cascade,
  user_id        uuid references auth.users (id) on delete set null,  -- login opcional do profissional
  name           text not null check (char_length(name) between 2 and 120),
  photo_url      text,
  phone          text,
  email          extensions.citext,
  specialties    text[] not null default '{}',
  bio            text check (char_length(bio) <= 1000),
  is_active      boolean not null default true,
  sort_order     integer not null default 0,
  is_demo        boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (barbershop_id, id)
);
create index professionals_shop_idx on public.professionals (barbershop_id, is_active, sort_order);
create unique index professionals_user_per_shop on public.professionals (barbershop_id, user_id) where user_id is not null;
create trigger professionals_updated_at before update on public.professionals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
create table public.services (
  id                uuid primary key default gen_random_uuid(),
  barbershop_id     uuid not null references public.barbershops (id) on delete cascade,
  name              text not null check (char_length(name) between 2 and 120),
  description       text check (char_length(description) <= 1000),
  category          text check (char_length(category) <= 60),
  price_cents       integer not null check (price_cents >= 0),
  duration_minutes  integer not null check (duration_minutes between 5 and 600),
  image_url         text,
  is_active         boolean not null default true,
  sort_order        integer not null default 0,
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (barbershop_id, id)
);
create index services_shop_idx on public.services (barbershop_id, is_active, sort_order);
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- professional_services: quais serviços cada profissional realiza
-- ---------------------------------------------------------------------------
create table public.professional_services (
  barbershop_id    uuid not null,
  professional_id  uuid not null,
  service_id       uuid not null,
  primary key (professional_id, service_id),
  foreign key (barbershop_id, professional_id) references public.professionals (barbershop_id, id) on delete cascade,
  foreign key (barbershop_id, service_id)      references public.services (barbershop_id, id) on delete cascade
);
create index professional_services_service_idx on public.professional_services (barbershop_id, service_id);

-- ---------------------------------------------------------------------------
-- working_hours: expediente semanal
--   professional_id NULL  -> horário de funcionamento da barbearia
--   professional_id = X   -> horário de trabalho do profissional
-- Intervalos (almoço) = duas faixas no mesmo dia (09-12 e 13-19).
-- ---------------------------------------------------------------------------
create table public.working_hours (
  id               uuid primary key default gen_random_uuid(),
  barbershop_id    uuid not null references public.barbershops (id) on delete cascade,
  professional_id  uuid,
  weekday          smallint not null check (weekday between 0 and 6),  -- 0 = domingo
  starts_at        time not null,
  ends_at          time not null,
  created_at       timestamptz not null default now(),
  check (ends_at > starts_at),
  foreign key (barbershop_id, professional_id) references public.professionals (barbershop_id, id) on delete cascade,
  -- faixas do mesmo dono no mesmo dia não podem se sobrepor
  exclude using gist (
    barbershop_id with =,
    (coalesce(professional_id, '00000000-0000-0000-0000-000000000000'::uuid)) with =,
    weekday with =,
    tsrange('2000-01-01'::date + starts_at, '2000-01-01'::date + ends_at, '[)') with &&
  )
);
create index working_hours_lookup_idx on public.working_hours (barbershop_id, professional_id, weekday);

-- ---------------------------------------------------------------------------
-- time_blocks: bloqueios, folgas e feriados
--   professional_id NULL -> vale para a barbearia toda
-- ---------------------------------------------------------------------------
create table public.time_blocks (
  id               uuid primary key default gen_random_uuid(),
  barbershop_id    uuid not null references public.barbershops (id) on delete cascade,
  professional_id  uuid,
  kind             public.time_block_kind not null default 'block',
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  reason           text check (char_length(reason) <= 200),
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  check (ends_at > starts_at),
  foreign key (barbershop_id, professional_id) references public.professionals (barbershop_id, id) on delete cascade
);
create index time_blocks_range_idx on public.time_blocks using gist (barbershop_id, tstzrange(starts_at, ends_at, '[)'));

-- ---------------------------------------------------------------------------
-- customers: base de clientes da barbearia (cliente final não tem login)
-- ---------------------------------------------------------------------------
create table public.customers (
  id             uuid primary key default gen_random_uuid(),
  barbershop_id  uuid not null references public.barbershops (id) on delete cascade,
  name           text not null check (char_length(name) between 2 and 120),
  phone          text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  email          extensions.citext,
  notes          text check (char_length(notes) <= 2000),
  is_demo        boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (barbershop_id, id),
  unique (barbershop_id, phone)
);
create index customers_name_idx on public.customers (barbershop_id, lower(name));
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- appointments
-- Preço e duração são "congelados" no momento do agendamento: se o serviço
-- mudar de preço depois, o histórico continua correto.
-- ---------------------------------------------------------------------------
create table public.appointments (
  id                uuid primary key default gen_random_uuid(),
  barbershop_id     uuid not null references public.barbershops (id) on delete cascade,
  professional_id   uuid not null,
  service_id        uuid not null,
  customer_id       uuid not null,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  duration_minutes  integer not null check (duration_minutes between 5 and 600),
  price_cents       integer not null check (price_cents >= 0),
  status            public.appointment_status not null default 'pending',
  source            public.appointment_source not null default 'manual',
  notes             text check (char_length(notes) <= 1000),
  cancel_reason     text check (char_length(cancel_reason) <= 500),
  status_changed_at timestamptz not null default now(),
  created_by        uuid references auth.users (id) on delete set null,
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (barbershop_id, id),
  check (ends_at > starts_at),
  foreign key (barbershop_id, professional_id) references public.professionals (barbershop_id, id) on delete restrict,
  foreign key (barbershop_id, service_id)      references public.services (barbershop_id, id) on delete restrict,
  foreign key (barbershop_id, customer_id)     references public.customers (barbershop_id, id) on delete restrict,

  -- >>> PROTEÇÃO CONTRA CONFLITO E RESERVA SIMULTÂNEA <<<
  -- O próprio banco recusa dois agendamentos ativos do mesmo profissional com
  -- horários sobrepostos. Funciona mesmo com duas requisições no mesmo instante.
  constraint appointments_no_overlap exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status not in ('cancelled', 'no_show'))
);
create index appointments_shop_time_idx on public.appointments (barbershop_id, starts_at);
create index appointments_professional_time_idx on public.appointments (professional_id, starts_at);
create index appointments_customer_idx on public.appointments (barbershop_id, customer_id, starts_at desc);
create index appointments_status_idx on public.appointments (barbershop_id, status);
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

create or replace function public.appointments_track_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;
create trigger appointments_status_changed before update on public.appointments
  for each row execute function public.appointments_track_status();

-- ---------------------------------------------------------------------------
-- payments: pagamentos EFETIVAMENTE recebidos na barbearia.
-- Faturamento previsto = agendamentos; receita recebida = esta tabela.
-- Um agendamento NUNCA vira receita automaticamente.
-- ---------------------------------------------------------------------------
create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  barbershop_id     uuid not null references public.barbershops (id) on delete cascade,
  appointment_id    uuid,
  service_id        uuid,
  professional_id   uuid,
  customer_id       uuid,
  amount_cents      integer not null check (amount_cents > 0),
  method            public.payment_method not null,
  status            public.payment_status not null default 'received',
  paid_at           timestamptz not null default now(),
  notes             text check (char_length(notes) <= 500),
  recorded_by       uuid references auth.users (id) on delete set null,
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (barbershop_id, appointment_id)  references public.appointments (barbershop_id, id) on delete set null (appointment_id),
  foreign key (barbershop_id, service_id)      references public.services (barbershop_id, id) on delete set null (service_id),
  foreign key (barbershop_id, professional_id) references public.professionals (barbershop_id, id) on delete set null (professional_id),
  foreign key (barbershop_id, customer_id)     references public.customers (barbershop_id, id) on delete set null (customer_id)
);
create index payments_shop_paid_idx on public.payments (barbershop_id, paid_at desc);
create index payments_professional_idx on public.payments (barbershop_id, professional_id, paid_at desc);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
