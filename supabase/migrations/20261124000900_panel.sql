-- ============================================================================
-- 0009 · Painel do barbeiro
--   * disponibilidade real (expediente da barbearia ∩ expediente do profissional)
--   * validação de agendamentos NO BANCO (expediente, folgas, bloqueios,
--     intervalo entre atendimentos e conflito) — vale para painel e página pública
--   * cálculo de horários livres (usado no painel e, na Fase 4, na página pública)
--   * histórico de cada agendamento
--   * estatísticas de clientes, visão geral e financeiro com dados reais
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Preferências de notificação da barbearia (usadas na Fase 6)
-- ---------------------------------------------------------------------------
alter table public.barbershops
  add column if not exists notification_prefs jsonb not null
    default '{"new_booking_email": true, "reminder_whatsapp": false, "reminder_hours": 24}'::jsonb;
grant update (notification_prefs) on public.barbershops to authenticated;

-- ---------------------------------------------------------------------------
-- Faixas de atendimento de um profissional num dia (no fuso da barbearia)
--   - profissional sem expediente próprio cadastrado -> usa o da barbearia
--   - barbearia sem expediente cadastrado            -> usa só o do profissional
--   - ambos cadastrados                              -> interseção dos dois
-- Intervalos (almoço) são lacunas entre faixas do mesmo dia.
-- ---------------------------------------------------------------------------
create or replace function public.professional_day_ranges(
  p_barbershop_id uuid,
  p_professional_id uuid,
  p_day date
)
returns setof tstzrange
language sql
stable
security definer
set search_path = ''
as $$
  with shop as (
    select timezone as tz from public.barbershops where id = p_barbershop_id
  ),
  flags as (
    select
      exists (select 1 from public.working_hours w
              where w.barbershop_id = p_barbershop_id and w.professional_id = p_professional_id) as prof_has,
      exists (select 1 from public.working_hours w
              where w.barbershop_id = p_barbershop_id and w.professional_id is null) as shop_has
  ),
  prof_r as (
    select tsrange(p_day + w.starts_at, p_day + w.ends_at, '[)') as r
    from public.working_hours w
    where w.barbershop_id = p_barbershop_id
      and w.professional_id = p_professional_id
      and w.weekday = extract(dow from p_day)::smallint
  ),
  shop_r as (
    select tsrange(p_day + w.starts_at, p_day + w.ends_at, '[)') as r
    from public.working_hours w
    where w.barbershop_id = p_barbershop_id
      and w.professional_id is null
      and w.weekday = extract(dow from p_day)::smallint
  ),
  combined as (
    select p.r * s.r as r from prof_r p, shop_r s, flags f
      where f.prof_has and f.shop_has and p.r && s.r
    union all
    select p.r from prof_r p, flags f where f.prof_has and not f.shop_has
    union all
    select s.r from shop_r s, flags f where not f.prof_has
  )
  select tstzrange(lower(c.r) at time zone shop.tz, upper(c.r) at time zone shop.tz, '[)')
  from combined c, shop
  where not isempty(c.r)
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- Verifica se um horário pode ser reservado. Devolve NULL quando está livre
-- ou o código do motivo: professional_inactive | outside_hours | blocked | conflict
-- ---------------------------------------------------------------------------
create or replace function public.check_appointment_slot(
  p_barbershop_id uuid,
  p_professional_id uuid,
  p_starts timestamptz,
  p_ends timestamptz,
  p_ignore_appointment_id uuid default null
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_buffer integer;
  v_range tstzrange := tstzrange(p_starts, p_ends, '[)');
begin
  select timezone, buffer_minutes into v_tz, v_buffer
  from public.barbershops where id = p_barbershop_id;
  if v_tz is null then return 'professional_inactive'; end if;

  if not exists (
    select 1 from public.professionals
    where id = p_professional_id and barbershop_id = p_barbershop_id and is_active
  ) then
    return 'professional_inactive';
  end if;

  if not exists (
    select 1
    from public.professional_day_ranges(p_barbershop_id, p_professional_id, (p_starts at time zone v_tz)::date) r
    where r @> v_range
  ) then
    return 'outside_hours';
  end if;

  if exists (
    select 1 from public.time_blocks b
    where b.barbershop_id = p_barbershop_id
      and (b.professional_id is null or b.professional_id = p_professional_id)
      and tstzrange(b.starts_at, b.ends_at, '[)') && v_range
  ) then
    return 'blocked';
  end if;

  if exists (
    select 1 from public.appointments a
    where a.professional_id = p_professional_id
      and a.status not in ('cancelled', 'no_show')
      and a.id is distinct from p_ignore_appointment_id
      and tstzrange(a.starts_at - make_interval(mins => v_buffer),
                    a.ends_at   + make_interval(mins => v_buffer), '[)') && v_range
  ) then
    return 'conflict';
  end if;

  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Horários livres de um dia.
--   Membro da barbearia: vê tudo a partir de agora.
--   Visitante (Fase 4): só barbearia publicada e operando, respeitando a
--   antecedência mínima e o limite de dias no futuro.
-- ---------------------------------------------------------------------------
create or replace function public.get_available_slots(
  p_barbershop_id uuid,
  p_service_id uuid,
  p_day date,
  p_professional_id uuid default null
)
returns table (professional_id uuid, starts_at timestamptz, ends_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_shop record;
  v_duration integer;
  v_is_member boolean := public.is_shop_member(p_barbershop_id);
  v_earliest timestamptz;
  v_latest timestamptz;
begin
  select b.* into v_shop from public.barbershops b where b.id = p_barbershop_id;
  if not found then return; end if;

  if not v_is_member then
    if v_shop.published_at is null or v_shop.status <> 'active' or not public.can_operate(p_barbershop_id) then
      return;
    end if;
  end if;

  select s.duration_minutes into v_duration
  from public.services s
  where s.id = p_service_id and s.barbershop_id = p_barbershop_id and s.is_active;
  if v_duration is null then return; end if;

  v_earliest := now() + case when v_is_member then interval '0' else make_interval(mins => v_shop.min_advance_minutes) end;
  v_latest := case when v_is_member then 'infinity'::timestamptz
                   else ((now() at time zone v_shop.timezone)::date + v_shop.max_advance_days + 1)::timestamp at time zone v_shop.timezone end;

  return query
  with pros as (
    select p.id
    from public.professionals p
    join public.professional_services ps on ps.professional_id = p.id and ps.service_id = p_service_id
    where p.barbershop_id = p_barbershop_id
      and p.is_active
      and (p_professional_id is null or p.id = p_professional_id)
  ),
  ranges as (
    select pros.id as pid, r
    from pros, lateral public.professional_day_ranges(p_barbershop_id, pros.id, p_day) r
  ),
  candidates as (
    select rg.pid, gs as s, gs + make_interval(mins => v_duration) as e
    from ranges rg,
      lateral generate_series(lower(rg.r), upper(rg.r) - make_interval(mins => v_duration),
                              make_interval(mins => v_shop.slot_interval_minutes)) gs
  )
  select c.pid, c.s, c.e
  from candidates c
  where c.s >= v_earliest
    and c.s < v_latest
    and not exists (
      select 1 from public.time_blocks b
      where b.barbershop_id = p_barbershop_id
        and (b.professional_id is null or b.professional_id = c.pid)
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(c.s, c.e, '[)')
    )
    and not exists (
      select 1 from public.appointments a
      where a.professional_id = c.pid
        and a.status not in ('cancelled', 'no_show')
        and tstzrange(a.starts_at - make_interval(mins => v_shop.buffer_minutes),
                      a.ends_at + make_interval(mins => v_shop.buffer_minutes), '[)')
            && tstzrange(c.s, c.e, '[)')
    )
  order by c.s, c.pid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Validação de agendamento (roda em TODO insert/update, qualquer origem)
-- Erros com códigos estáveis (AP_*) que o front traduz em mensagens amigáveis.
-- ---------------------------------------------------------------------------
create or replace function public.appointments_validate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_service record;
  v_reason text;
begin
  select duration_minutes, price_cents, is_active into v_service
  from public.services where id = new.service_id and barbershop_id = new.barbershop_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'AP_SERVICE_NOT_FOUND';
  end if;

  -- preço e duração congelados a partir do serviço quando não informados
  if tg_op = 'INSERT' then
    new.duration_minutes := coalesce(new.duration_minutes, v_service.duration_minutes);
    new.price_cents := coalesce(new.price_cents, v_service.price_cents);
  end if;
  new.ends_at := new.starts_at + make_interval(mins => new.duration_minutes);

  -- registros encerrados não passam pela agenda
  if new.status in ('cancelled', 'no_show', 'completed') then
    return new;
  end if;

  -- atualização que não mexe em horário/profissional e não reativa: nada a validar
  if tg_op = 'UPDATE'
     and new.starts_at = old.starts_at
     and new.ends_at = old.ends_at
     and new.professional_id = old.professional_id
     and new.service_id = old.service_id
     and old.status not in ('cancelled', 'no_show', 'completed') then
    return new;
  end if;

  if tg_op = 'INSERT' and not v_service.is_active then
    raise exception using errcode = 'P0001', message = 'AP_SERVICE_INACTIVE';
  end if;

  if not exists (
    select 1 from public.professional_services
    where professional_id = new.professional_id and service_id = new.service_id
  ) then
    raise exception using errcode = 'P0001', message = 'AP_SERVICE_NOT_OFFERED';
  end if;

  -- trava por profissional: duas reservas simultâneas no mesmo profissional
  -- são processadas uma de cada vez (a exclusion constraint é a última barreira)
  perform pg_advisory_xact_lock(hashtextextended(new.professional_id::text, 42));

  v_reason := public.check_appointment_slot(
    new.barbershop_id, new.professional_id, new.starts_at, new.ends_at,
    case when tg_op = 'UPDATE' then old.id else null end
  );
  if v_reason is not null then
    raise exception using errcode = 'P0001', message = 'AP_' || upper(v_reason);
  end if;

  return new;
end;
$$;

create trigger appointments_validate
  before insert or update on public.appointments
  for each row execute function public.appointments_validate();

-- ---------------------------------------------------------------------------
-- Histórico do agendamento
-- ---------------------------------------------------------------------------
create table public.appointment_events (
  id              bigint generated always as identity primary key,
  barbershop_id   uuid not null,
  appointment_id  uuid not null,
  kind            text not null check (kind in ('created', 'status_changed', 'rescheduled', 'updated')),
  from_status     public.appointment_status,
  to_status       public.appointment_status,
  details         jsonb not null default '{}'::jsonb,
  actor_id        uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  foreign key (barbershop_id, appointment_id) references public.appointments (barbershop_id, id) on delete cascade
);
create index appointment_events_appt_idx on public.appointment_events (appointment_id, created_at);
create index appointment_events_shop_idx on public.appointment_events (barbershop_id, created_at desc);

create or replace function public.appointments_log_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.appointment_events (barbershop_id, appointment_id, kind, to_status, details, actor_id)
    values (new.barbershop_id, new.id, 'created', new.status,
            jsonb_build_object('source', new.source, 'starts_at', new.starts_at), auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.appointment_events (barbershop_id, appointment_id, kind, from_status, to_status, details, actor_id)
    values (new.barbershop_id, new.id, 'status_changed', old.status, new.status,
            case when new.cancel_reason is not null then jsonb_build_object('reason', new.cancel_reason) else '{}'::jsonb end,
            auth.uid());
  elsif new.starts_at <> old.starts_at or new.professional_id <> old.professional_id then
    insert into public.appointment_events (barbershop_id, appointment_id, kind, details, actor_id)
    values (new.barbershop_id, new.id, 'rescheduled',
            jsonb_build_object('from', old.starts_at, 'to', new.starts_at,
                               'from_professional', old.professional_id, 'to_professional', new.professional_id),
            auth.uid());
  elsif new.service_id <> old.service_id or new.price_cents <> old.price_cents or new.notes is distinct from old.notes then
    insert into public.appointment_events (barbershop_id, appointment_id, kind, actor_id)
    values (new.barbershop_id, new.id, 'updated', auth.uid());
  end if;
  return null;
end;
$$;

create trigger appointments_log_event
  after insert or update on public.appointments
  for each row execute function public.appointments_log_event();

alter table public.appointment_events enable row level security;
create policy appointment_events_select on public.appointment_events for select to authenticated
  using (public.is_shop_member(barbershop_id) or public.is_super_admin());
revoke all on public.appointment_events from anon;
revoke insert, update, delete on public.appointment_events from authenticated;

-- ---------------------------------------------------------------------------
-- Estatísticas por cliente (RLS das tabelas de origem continua valendo)
-- ---------------------------------------------------------------------------
create or replace view public.customer_stats
with (security_invoker = true) as
select
  c.id as customer_id,
  c.barbershop_id,
  count(a.id) filter (where a.status not in ('cancelled')) as total_appointments,
  count(a.id) filter (where a.status = 'completed') as completed_appointments,
  max(a.starts_at) filter (where a.status = 'completed') as last_visit_at,
  coalesce((
    select sum(p.amount_cents) from public.payments p
    where p.barbershop_id = c.barbershop_id and p.customer_id = c.id and p.status = 'received'
  ), 0)::bigint as total_spent_cents
from public.customers c
left join public.appointments a on a.barbershop_id = c.barbershop_id and a.customer_id = c.id
group by c.id, c.barbershop_id;

revoke all on public.customer_stats from anon;
grant select on public.customer_stats to authenticated;

-- ---------------------------------------------------------------------------
-- Visão geral do painel (todos os números vêm do banco; RLS aplicada)
-- Período em datas locais da barbearia, inclusive.
-- ---------------------------------------------------------------------------
create or replace function public.dashboard_overview(p_barbershop_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_tz text;
  v_from timestamptz;
  v_to timestamptz;
  v_today date;
  v_today_start timestamptz;
  v_today_end timestamptz;
  v_month_start timestamptz;
  v_result jsonb;
begin
  select timezone into v_tz from public.barbershops where id = p_barbershop_id;
  if v_tz is null then
    raise exception using errcode = '42501', message = 'AP_FORBIDDEN';
  end if;

  v_from := p_from::timestamp at time zone v_tz;
  v_to := (p_to + 1)::timestamp at time zone v_tz;
  v_today := (now() at time zone v_tz)::date;
  v_today_start := v_today::timestamp at time zone v_tz;
  v_today_end := (v_today + 1)::timestamp at time zone v_tz;
  v_month_start := date_trunc('month', v_today)::timestamp at time zone v_tz;

  select jsonb_build_object(
    'today', jsonb_build_object(
      'appointments', (select count(*) from public.appointments a
                       where a.barbershop_id = p_barbershop_id and a.starts_at >= v_today_start and a.starts_at < v_today_end
                         and a.status not in ('cancelled')),
      'completed',    (select count(*) from public.appointments a
                       where a.barbershop_id = p_barbershop_id and a.starts_at >= v_today_start and a.starts_at < v_today_end
                         and a.status = 'completed'),
      'upcoming',     (select count(*) from public.appointments a
                       where a.barbershop_id = p_barbershop_id and a.starts_at >= now() and a.starts_at < v_today_end
                         and a.status in ('pending', 'confirmed')),
      'revenue_cents', (select coalesce(sum(p.amount_cents), 0) from public.payments p
                        where p.barbershop_id = p_barbershop_id and p.status = 'received'
                          and p.paid_at >= v_today_start and p.paid_at < v_today_end)
    ),
    'month_revenue_cents', (select coalesce(sum(p.amount_cents), 0) from public.payments p
                            where p.barbershop_id = p_barbershop_id and p.status = 'received' and p.paid_at >= v_month_start),
    'period', (
      select jsonb_build_object(
        'appointments', count(*) filter (where a.status <> 'cancelled'),
        'completed',    count(*) filter (where a.status = 'completed'),
        'cancelled',    count(*) filter (where a.status = 'cancelled'),
        'no_show',      count(*) filter (where a.status = 'no_show'),
        'expected_cents', coalesce(sum(a.price_cents) filter (where a.status not in ('cancelled', 'no_show')), 0)
      )
      from public.appointments a
      where a.barbershop_id = p_barbershop_id and a.starts_at >= v_from and a.starts_at < v_to
    ),
    'period_revenue_cents', (select coalesce(sum(p.amount_cents), 0) from public.payments p
                             where p.barbershop_id = p_barbershop_id and p.status = 'received'
                               and p.paid_at >= v_from and p.paid_at < v_to),
    'customers', jsonb_build_object(
      'total', (select count(*) from public.customers c where c.barbershop_id = p_barbershop_id),
      'new',   (select count(*) from public.customers c where c.barbershop_id = p_barbershop_id
                  and c.created_at >= v_from and c.created_at < v_to)
    ),
    'revenue_by_month', (
      select coalesce(jsonb_agg(jsonb_build_object('month', to_char(m, 'YYYY-MM'), 'cents', coalesce(x.cents, 0)) order by m), '[]'::jsonb)
      from generate_series(date_trunc('month', v_today) - interval '11 months', date_trunc('month', v_today), interval '1 month') m
      left join (
        select date_trunc('month', p.paid_at at time zone v_tz) as mm, sum(p.amount_cents) as cents
        from public.payments p
        where p.barbershop_id = p_barbershop_id and p.status = 'received'
          and p.paid_at >= (date_trunc('month', v_today) - interval '11 months')::timestamp at time zone v_tz
        group by 1
      ) x on x.mm = m
    ),
    'appointments_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'count', coalesce(x.n, 0)) order by d), '[]'::jsonb)
      from generate_series(p_from, p_to, interval '1 day') d
      left join (
        select (a.starts_at at time zone v_tz)::date as dd, count(*) as n
        from public.appointments a
        where a.barbershop_id = p_barbershop_id and a.starts_at >= v_from and a.starts_at < v_to
          and a.status <> 'cancelled'
        group by 1
      ) x on x.dd = d::date
    ),
    'top_services', (
      select coalesce(jsonb_agg(t order by t.count desc), '[]'::jsonb) from (
        select s.name, count(*) as count, sum(a.price_cents) as cents
        from public.appointments a join public.services s on s.id = a.service_id
        where a.barbershop_id = p_barbershop_id and a.starts_at >= v_from and a.starts_at < v_to
          and a.status not in ('cancelled', 'no_show')
        group by s.name order by count(*) desc limit 6
      ) t
    ),
    'professionals', (
      select coalesce(jsonb_agg(t order by t.completed desc, t.name), '[]'::jsonb) from (
        select pr.id, pr.name,
          count(a.id) filter (where a.status = 'completed') as completed,
          count(a.id) filter (where a.status not in ('cancelled', 'no_show')) as booked,
          coalesce((select sum(p.amount_cents) from public.payments p
                    where p.barbershop_id = p_barbershop_id and p.professional_id = pr.id and p.status = 'received'
                      and p.paid_at >= v_from and p.paid_at < v_to), 0) as revenue_cents
        from public.professionals pr
        left join public.appointments a on a.professional_id = pr.id and a.starts_at >= v_from and a.starts_at < v_to
        where pr.barbershop_id = p_barbershop_id
        group by pr.id, pr.name
      ) t
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Financeiro: recebido x previsto (apenas gestores enxergam pagamentos via RLS)
-- ---------------------------------------------------------------------------
create or replace function public.finance_overview(p_barbershop_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_tz text;
  v_from timestamptz;
  v_to timestamptz;
  v_today date;
  v_result jsonb;
begin
  select timezone into v_tz from public.barbershops where id = p_barbershop_id;
  if v_tz is null then
    raise exception using errcode = '42501', message = 'AP_FORBIDDEN';
  end if;
  v_from := p_from::timestamp at time zone v_tz;
  v_to := (p_to + 1)::timestamp at time zone v_tz;
  v_today := (now() at time zone v_tz)::date;

  with recv as (
    select p.* from public.payments p
    where p.barbershop_id = p_barbershop_id and p.status = 'received'
  )
  select jsonb_build_object(
    'day_cents',   (select coalesce(sum(amount_cents), 0) from recv where paid_at >= v_today::timestamp at time zone v_tz),
    'week_cents',  (select coalesce(sum(amount_cents), 0) from recv
                    where paid_at >= date_trunc('week', v_today)::timestamp at time zone v_tz),
    'month_cents', (select coalesce(sum(amount_cents), 0) from recv
                    where paid_at >= date_trunc('month', v_today)::timestamp at time zone v_tz),
    'year_cents',  (select coalesce(sum(amount_cents), 0) from recv
                    where paid_at >= date_trunc('year', v_today)::timestamp at time zone v_tz),
    'period', (
      select jsonb_build_object(
        'received_cents', coalesce(sum(amount_cents), 0),
        'payments', count(*),
        'avg_ticket_cents', coalesce(round(avg(amount_cents)), 0)
      ) from recv where paid_at >= v_from and paid_at < v_to
    ),
    'expected', (
      select jsonb_build_object(
        'cents', coalesce(sum(a.price_cents), 0),
        'services', count(*) filter (where a.status = 'completed'),
        'open_cents', coalesce(sum(a.price_cents) filter (
          where a.status = 'completed'
            and not exists (select 1 from public.payments p where p.appointment_id = a.id and p.status = 'received')
        ), 0)
      )
      from public.appointments a
      where a.barbershop_id = p_barbershop_id and a.starts_at >= v_from and a.starts_at < v_to
        and a.status not in ('cancelled', 'no_show')
    ),
    'by_method', (
      select coalesce(jsonb_agg(jsonb_build_object('method', method, 'cents', cents) order by cents desc), '[]'::jsonb)
      from (select method, sum(amount_cents) as cents from recv where paid_at >= v_from and paid_at < v_to group by method) x
    ),
    'by_professional', (
      select coalesce(jsonb_agg(jsonb_build_object('id', pr.id, 'name', pr.name, 'cents', x.cents, 'count', x.n) order by x.cents desc), '[]'::jsonb)
      from (select professional_id, sum(amount_cents) as cents, count(*) as n from recv
            where paid_at >= v_from and paid_at < v_to and professional_id is not null group by professional_id) x
      join public.professionals pr on pr.id = x.professional_id
    ),
    'by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'received', coalesce(r.cents, 0), 'expected', coalesce(e.cents, 0)) order by d), '[]'::jsonb)
      from generate_series(p_from, p_to, interval '1 day') d
      left join (select (paid_at at time zone v_tz)::date as dd, sum(amount_cents) as cents from recv
                 where paid_at >= v_from and paid_at < v_to group by 1) r on r.dd = d::date
      left join (select (a.starts_at at time zone v_tz)::date as dd, sum(a.price_cents) as cents
                 from public.appointments a
                 where a.barbershop_id = p_barbershop_id and a.starts_at >= v_from and a.starts_at < v_to
                   and a.status not in ('cancelled', 'no_show') group by 1) e on e.dd = d::date
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Limite de serviços ativos do plano (feature services.max)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_service_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if not new.is_active then return new; end if;
  if tg_op = 'UPDATE' and old.is_active then return new; end if;
  v_limit := public.plan_limit(new.barbershop_id, 'services.max');
  if v_limit is null then return new; end if;
  perform 1 from public.barbershops where id = new.barbershop_id for update;
  select count(*) into v_count from public.services
  where barbershop_id = new.barbershop_id and is_active and id <> new.id;
  if v_count >= v_limit then
    raise exception 'PLAN_LIMIT_SERVICES: seu plano permite % serviço(s) ativo(s).', v_limit using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger services_enforce_limit
  before insert or update of is_active on public.services
  for each row execute function public.enforce_service_limit();
revoke execute on function public.enforce_service_limit() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Permissões das funções
-- ---------------------------------------------------------------------------
revoke execute on function public.professional_day_ranges(uuid, uuid, date) from public, anon, authenticated;
revoke execute on function public.check_appointment_slot(uuid, uuid, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke execute on function public.appointments_validate() from public, anon, authenticated;
revoke execute on function public.appointments_log_event() from public, anon, authenticated;
revoke execute on function public.dashboard_overview(uuid, date, date) from public, anon;
revoke execute on function public.finance_overview(uuid, date, date) from public, anon;
grant execute on function public.dashboard_overview(uuid, date, date) to authenticated;
grant execute on function public.finance_overview(uuid, date, date) to authenticated;
grant execute on function public.get_available_slots(uuid, uuid, date, uuid) to anon, authenticated;
