-- =============================================================================
-- 0010 · Página pública de agendamento (/{slug})
--   * endereços reservados não podem virar link de barbearia
--   * leitura pública da barbearia (somente campos públicos)
--   * reserva pública com validação total no banco (horário livre, antecedência,
--     limite por telefone) e cliente criado/atualizado pelo telefone
--   * link de gerenciamento do cliente (ver e cancelar pelo token)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Endereços reservados (mesma lista de src/lib/slug.ts)
-- -----------------------------------------------------------------------------
create or replace function public.is_reserved_slug(p_slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(p_slug) = any (array[
    'painel','entrar','cadastro','recuperar-senha','redefinir-senha','auth','api','onboarding',
    'super-admin','admin','termos','privacidade','design-system','planos','ajuda','suporte',
    'blog','sobre','contato','app','www','static','_next','favicon','robots','sitemap',
    'agendar','agenda','b','checkout','assinatura','webhooks','login','logout'
  ]);
$$;

create or replace function public.barbershops_check_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_reserved_slug(new.slug::text) then
    raise exception 'AP_SLUG_RESERVED' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists barbershops_slug_reserved on public.barbershops;
create trigger barbershops_slug_reserved before insert or update of slug on public.barbershops
  for each row execute function public.barbershops_check_slug();

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
  while public.is_reserved_slug(candidate) or exists (select 1 from public.barbershops where slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end;
$$;
revoke execute on function public.generate_unique_slug(text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Token de gerenciamento do agendamento (enviado só a quem agendou)
-- -----------------------------------------------------------------------------
alter table public.appointments
  add column if not exists public_token uuid not null default gen_random_uuid();
create unique index if not exists appointments_public_token_idx on public.appointments (public_token);

-- -----------------------------------------------------------------------------
-- A barbearia pode receber agendamentos online agora?
-- -----------------------------------------------------------------------------
create or replace function public.shop_accepts_bookings(p_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.barbershops b
    where b.id = p_barbershop_id
      and b.published_at is not null
      and b.status = 'active'
  ) and public.can_operate(p_barbershop_id);
$$;
revoke execute on function public.shop_accepts_bookings(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Dados públicos da barbearia para a página /{slug}
--   status: 'ok' | 'unavailable' (existe mas não publicada / suspensa) | null (não existe)
--   Membros da barbearia enxergam tudo mesmo sem publicar (pré-visualização).
-- -----------------------------------------------------------------------------
create or replace function public.get_public_barbershop(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_shop public.barbershops;
  v_member boolean;
  v_open boolean;
begin
  select * into v_shop from public.barbershops where slug = lower(p_slug);
  if not found then return null; end if;

  v_member := public.is_shop_member(v_shop.id);
  v_open := public.shop_accepts_bookings(v_shop.id);

  if not v_open and not v_member then
    return jsonb_build_object('status', 'unavailable', 'name', v_shop.name, 'logo_url', v_shop.logo_url);
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'accepting', v_open,
    'is_member', v_member,
    'shop', jsonb_build_object(
      'id', v_shop.id, 'name', v_shop.name, 'slug', v_shop.slug, 'description', v_shop.description,
      'timezone', v_shop.timezone, 'phone', v_shop.phone, 'whatsapp', v_shop.whatsapp,
      'address_street', v_shop.address_street, 'address_number', v_shop.address_number,
      'address_complement', v_shop.address_complement, 'address_district', v_shop.address_district,
      'address_city', v_shop.address_city, 'address_state', v_shop.address_state, 'address_zip', v_shop.address_zip,
      'social_links', v_shop.social_links, 'logo_url', v_shop.logo_url, 'cover_url', v_shop.cover_url,
      'branding', v_shop.branding, 'min_advance_minutes', v_shop.min_advance_minutes,
      'max_advance_days', v_shop.max_advance_days, 'cancellation_min_hours', v_shop.cancellation_min_hours,
      'cancellation_policy', v_shop.cancellation_policy, 'auto_confirm', v_shop.auto_confirm
    ),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'description', s.description, 'price_cents', s.price_cents,
        'duration_minutes', s.duration_minutes, 'image_url', s.image_url,
        'professional_ids', (select jsonb_agg(ps.professional_id) from public.professional_services ps
                              join public.professionals p on p.id = ps.professional_id and p.is_active
                              where ps.service_id = s.id))
        order by s.sort_order, s.name)
      from public.services s
      where s.barbershop_id = v_shop.id and s.is_active
        and exists (select 1 from public.professional_services ps
                    join public.professionals p on p.id = ps.professional_id and p.is_active
                    where ps.service_id = s.id)
    ), '[]'::jsonb),
    'professionals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'photo_url', p.photo_url, 'bio', p.bio, 'specialties', p.specialties)
        order by p.sort_order, p.name)
      from public.professionals p
      where p.barbershop_id = v_shop.id and p.is_active
    ), '[]'::jsonb),
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object('weekday', w.weekday, 'starts_at', to_char(w.starts_at, 'HH24:MI'), 'ends_at', to_char(w.ends_at, 'HH24:MI'))
        order by w.weekday, w.starts_at)
      from public.working_hours w
      where w.barbershop_id = v_shop.id and w.professional_id is null
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.get_public_barbershop(text) from public;
grant execute on function public.get_public_barbershop(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Reserva pública
-- -----------------------------------------------------------------------------
create or replace function public.create_public_booking(
  p_slug text,
  p_service_id uuid,
  p_professional_id uuid,      -- null = "qualquer profissional"
  p_starts_at timestamptz,
  p_name text,
  p_phone text,
  p_email text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_shop public.barbershops;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_email text := nullif(btrim(lower(coalesce(p_email, ''))), '');
  v_prof uuid;
  v_customer uuid;
  v_appt public.appointments;
  v_day date;
  v_recent integer;
begin
  select * into v_shop from public.barbershops where slug = lower(p_slug);
  if not found or not public.shop_accepts_bookings(v_shop.id) then
    raise exception 'AP_SHOP_UNAVAILABLE' using errcode = 'P0001';
  end if;

  -- dados do cliente
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'AP_INVALID_NAME' using errcode = '22023';
  end if;
  if v_phone ~ '^55[0-9]{10,11}$' then v_phone := substr(v_phone, 3); end if;
  if v_phone !~ '^[0-9]{10,11}$' then
    raise exception 'AP_INVALID_PHONE' using errcode = '22023';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'AP_INVALID_EMAIL' using errcode = '22023';
  end if;
  if char_length(coalesce(p_notes, '')) > 500 then
    raise exception 'AP_INVALID_NOTES' using errcode = '22023';
  end if;

  -- proteção contra abuso: no máximo 3 agendamentos futuros ativos por telefone,
  -- e no máximo 5 reservas públicas por telefone a cada hora
  select count(*) into v_recent
  from public.appointments a join public.customers c on c.id = a.customer_id
  where a.barbershop_id = v_shop.id and c.phone = v_phone
    and a.starts_at > now() and a.status in ('pending', 'confirmed');
  if v_recent >= 3 then
    raise exception 'AP_TOO_MANY_BOOKINGS' using errcode = 'P0001';
  end if;
  select count(*) into v_recent
  from public.appointments a join public.customers c on c.id = a.customer_id
  where a.barbershop_id = v_shop.id and c.phone = v_phone
    and a.source = 'public_page' and a.created_at > now() - interval '1 hour';
  if v_recent >= 5 then
    raise exception 'AP_TOO_MANY_BOOKINGS' using errcode = 'P0001';
  end if;

  -- o horário precisa estar entre os livres (respeita antecedência mínima e máxima)
  v_day := (p_starts_at at time zone v_shop.timezone)::date;
  select s.professional_id into v_prof
  from public.get_available_slots(v_shop.id, p_service_id, v_day, p_professional_id) s
  where s.starts_at = p_starts_at
  order by (select count(*) from public.appointments a
            where a.professional_id = s.professional_id
              and a.starts_at >= (v_day::timestamp at time zone v_shop.timezone)
              and a.starts_at < ((v_day + 1)::timestamp at time zone v_shop.timezone)
              and a.status not in ('cancelled', 'no_show')),  -- "qualquer": quem tem menos atendimentos no dia
           s.professional_id
  limit 1;
  if v_prof is null then
    raise exception 'AP_SLOT_UNAVAILABLE' using errcode = 'P0001';
  end if;

  -- cliente pelo telefone (não sobrescreve o nome que a barbearia já tem)
  insert into public.customers (barbershop_id, name, phone, email)
  values (v_shop.id, v_name, v_phone, v_email)
  on conflict (barbershop_id, phone) do update
    set email = coalesce(public.customers.email, excluded.email)
  returning id into v_customer;

  -- o gatilho appointments_validate congela preço/duração e trava conflitos
  insert into public.appointments (barbershop_id, professional_id, service_id, customer_id, starts_at, ends_at,
                                   duration_minutes, price_cents, status, source, notes)
  values (v_shop.id, v_prof, p_service_id, v_customer, p_starts_at, null,
          null, null, case when v_shop.auto_confirm then 'confirmed' else 'pending' end::public.appointment_status,
          'public_page', nullif(btrim(coalesce(p_notes, '')), ''))
  returning * into v_appt;

  insert into public.notifications (barbershop_id, event_type, title, body, payload)
  select v_shop.id, 'appointment.created', 'Novo agendamento online',
         v_name || ' · ' || s.name || ' · ' || to_char(v_appt.starts_at at time zone v_shop.timezone, 'DD/MM HH24:MI'),
         jsonb_build_object('appointment_id', v_appt.id)
  from public.services s where s.id = p_service_id;

  return public.get_public_appointment(v_appt.public_token);
exception
  when exclusion_violation then
    raise exception 'AP_SLOT_UNAVAILABLE' using errcode = 'P0001';
end;
$$;
revoke execute on function public.create_public_booking(text, uuid, uuid, timestamptz, text, text, text, text) from public;
grant execute on function public.create_public_booking(text, uuid, uuid, timestamptz, text, text, text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Ver / cancelar pelo link do cliente
-- -----------------------------------------------------------------------------
create or replace function public.get_public_appointment(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'token', a.public_token,
    'status', a.status,
    'starts_at', a.starts_at,
    'ends_at', a.ends_at,
    'price_cents', a.price_cents,
    'duration_minutes', a.duration_minutes,
    'service_name', s.name,
    'professional_name', p.name,
    'customer_name', c.name,
    'can_cancel', a.status in ('pending', 'confirmed')
                  and a.starts_at - make_interval(hours => b.cancellation_min_hours) > now(),
    'shop', jsonb_build_object('name', b.name, 'slug', b.slug, 'timezone', b.timezone, 'whatsapp', b.whatsapp,
                               'phone', b.phone, 'logo_url', b.logo_url, 'branding', b.branding,
                               'cancellation_min_hours', b.cancellation_min_hours,
                               'address_street', b.address_street, 'address_number', b.address_number,
                               'address_district', b.address_district, 'address_city', b.address_city,
                               'address_state', b.address_state)
  )
  from public.appointments a
  join public.barbershops b on b.id = a.barbershop_id
  join public.services s on s.id = a.service_id
  join public.professionals p on p.id = a.professional_id
  join public.customers c on c.id = a.customer_id
  where a.public_token = p_token;
$$;
revoke execute on function public.get_public_appointment(uuid) from public;
grant execute on function public.get_public_appointment(uuid) to anon, authenticated;

create or replace function public.cancel_public_appointment(p_token uuid, p_reason text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_appt public.appointments;
  v_min_hours integer;
begin
  select a.* into v_appt
  from public.appointments a
  where a.public_token = p_token
  for update;
  if not found then
    raise exception 'AP_NOT_FOUND' using errcode = 'P0002';
  end if;
  select b.cancellation_min_hours into v_min_hours from public.barbershops b where b.id = v_appt.barbershop_id;
  if v_appt.status not in ('pending', 'confirmed') then
    raise exception 'AP_NOT_CANCELLABLE' using errcode = 'P0001';
  end if;
  if v_appt.starts_at - make_interval(hours => v_min_hours) <= now() then
    raise exception 'AP_CANCEL_TOO_LATE' using errcode = 'P0001';
  end if;

  update public.appointments
     set status = 'cancelled',
         cancel_reason = left(coalesce(nullif(btrim(p_reason), ''), 'Cancelado pelo cliente'), 500)
   where id = v_appt.id;

  insert into public.notifications (barbershop_id, event_type, title, body, payload)
  select v_appt.barbershop_id, 'appointment.cancelled', 'Agendamento cancelado pelo cliente',
         c.name || ' · ' || to_char(v_appt.starts_at at time zone b.timezone, 'DD/MM HH24:MI'),
         jsonb_build_object('appointment_id', v_appt.id)
  from public.customers c, public.barbershops b
  where c.id = v_appt.customer_id and b.id = v_appt.barbershop_id;

  return public.get_public_appointment(p_token);
end;
$$;
revoke execute on function public.cancel_public_appointment(uuid, text) from public;
grant execute on function public.cancel_public_appointment(uuid, text) to anon, authenticated;
