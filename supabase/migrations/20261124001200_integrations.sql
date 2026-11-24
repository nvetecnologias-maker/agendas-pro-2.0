-- ============================================================================
-- Fase 6: integrações
--   * Checkout de assinatura: cotação com cupom, transação pendente e
--     aplicação idempotente dos eventos de pagamento vindos dos gateways
--   * Cancelamento pelo dono (no fim do período)
--   * Notificações: fila de e-mail/WhatsApp, lembretes de horário e caixa de
--     entrada no painel
-- Funções marcadas "service_role" só rodam no servidor (webhooks e tarefas).
-- ============================================================================

-- ---------------------------------------------------------------- colunas
alter table public.payment_transactions
  add column if not exists coupon_id uuid references public.coupons(id) on delete set null,
  add column if not exists checkout_ref text,
  add column if not exists created_by uuid references auth.users(id) on delete set null;
create index if not exists payment_transactions_checkout_ref on public.payment_transactions (gateway, checkout_ref) where checkout_ref is not null;

alter table public.appointments add column if not exists reminder_queued_at timestamptz;

alter table public.notifications add column if not exists attempts integer not null default 0;
alter table public.notifications add column if not exists recipient text;

-- ---------------------------------------------------------------- helpers
create or replace function public.period_interval(p_period public.billing_period)
returns interval
language sql
immutable
set search_path = ''
as $$
  select case p_period
    when 'monthly' then interval '1 month'
    when 'quarterly' then interval '3 months'
    when 'semiannual' then interval '6 months'
    when 'annual' then interval '1 year'
  end;
$$;

-- ---------------------------------------------------------------- cotação
-- Valida plano e cupom para a barbearia do dono e devolve os valores finais.
create or replace function public.quote_checkout(p_barbershop_id uuid, p_plan_slug text, p_coupon_code text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
  v_coupon public.coupons;
  v_discount integer := 0;
  v_used integer;
  v_paid_before boolean;
  v_code text := upper(nullif(btrim(coalesce(p_coupon_code, '')), ''));
begin
  if not public.has_shop_role(p_barbershop_id, array['owner']::public.shop_role[]) then
    raise exception 'AP_FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_plan from public.plans where slug = p_plan_slug and is_active;
  if not found then raise exception 'AP_PLAN_NOT_FOUND' using errcode = 'P0002'; end if;

  if v_code is not null then
    select * into v_coupon from public.coupons where code = v_code;
    if not found or not v_coupon.is_active then raise exception 'AP_COUPON_INVALID' using errcode = '22023'; end if;
    if (v_coupon.starts_at is not null and v_coupon.starts_at > now())
       or (v_coupon.ends_at is not null and v_coupon.ends_at < now()) then
      raise exception 'AP_COUPON_EXPIRED' using errcode = '22023';
    end if;
    if cardinality(v_coupon.applicable_plan_ids) > 0 and not v_plan.id = any (v_coupon.applicable_plan_ids) then
      raise exception 'AP_COUPON_NOT_APPLICABLE' using errcode = '22023';
    end if;
    if exists (select 1 from public.coupon_redemptions where coupon_id = v_coupon.id and barbershop_id = p_barbershop_id) then
      raise exception 'AP_COUPON_ALREADY_USED' using errcode = '22023';
    end if;
    if v_coupon.max_redemptions is not null then
      select count(*) into v_used from public.coupon_redemptions where coupon_id = v_coupon.id;
      if v_used >= v_coupon.max_redemptions then raise exception 'AP_COUPON_EXHAUSTED' using errcode = '22023'; end if;
    end if;
    select exists (select 1 from public.payment_transactions where barbershop_id = p_barbershop_id and status = 'approved')
      into v_paid_before;
    if (v_coupon.audience = 'new_customers' and v_paid_before) or (v_coupon.audience = 'existing_customers' and not v_paid_before) then
      raise exception 'AP_COUPON_NOT_APPLICABLE' using errcode = '22023';
    end if;
    v_discount := case v_coupon.discount_type
      when 'percent' then round(v_plan.price_cents * v_coupon.discount_value / 100.0)::integer
      else least(v_coupon.discount_value, v_plan.price_cents) end;
  end if;

  return jsonb_build_object(
    'barbershop_id', p_barbershop_id,
    'plan_id', v_plan.id, 'plan_name', v_plan.name, 'plan_slug', v_plan.slug, 'billing_period', v_plan.billing_period,
    'price_cents', v_plan.price_cents, 'discount_cents', v_discount, 'amount_cents', v_plan.price_cents - v_discount,
    'coupon_id', v_coupon.id, 'coupon_code', v_coupon.code, 'extra_trial_days', coalesce(v_coupon.extra_trial_days, 0)
  );
end;
$$;
revoke execute on function public.quote_checkout(uuid, text, text) from public, anon;
grant execute on function public.quote_checkout(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------- evento de pagamento
-- service_role: chamado pelo webhook depois de verificar a assinatura do gateway
-- e confirmar o status na API do próprio gateway. Idempotente.
create or replace function public.apply_payment_event(
  p_gateway public.payment_gateway,
  p_tx_id uuid,
  p_gateway_payment_id text,
  p_checkout_ref text,
  p_status public.transaction_status,
  p_amount_cents integer default null,
  p_method text default null,
  p_paid_at timestamptz default null,
  p_raw jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx public.payment_transactions;
  v_plan public.plans;
  v_sub public.subscriptions;
  v_from public.subscription_status;
  v_start timestamptz;
  v_coupon public.coupons;
begin
  -- localiza a transação: nossa referência > id do pagamento > referência do checkout
  if p_tx_id is not null then
    select * into v_tx from public.payment_transactions where id = p_tx_id and gateway = p_gateway for update;
  end if;
  if v_tx.id is null and p_gateway_payment_id is not null then
    select * into v_tx from public.payment_transactions where gateway = p_gateway and gateway_payment_id = p_gateway_payment_id for update;
  end if;
  if v_tx.id is null and p_checkout_ref is not null then
    select * into v_tx from public.payment_transactions where gateway = p_gateway and checkout_ref = p_checkout_ref
      order by created_at desc limit 1 for update;
  end if;
  if v_tx.id is null then return jsonb_build_object('result', 'unknown_transaction'); end if;

  -- só avança: aprovado não volta para pendente; estorno vale depois de aprovado
  if v_tx.status = p_status
     or (v_tx.status = 'approved' and p_status in ('pending', 'refused', 'canceled'))
     or (v_tx.status in ('refunded') ) then
    return jsonb_build_object('result', 'noop', 'transaction_id', v_tx.id, 'status', v_tx.status);
  end if;

  update public.payment_transactions set
    status = p_status,
    gateway_payment_id = coalesce(gateway_payment_id, p_gateway_payment_id),
    amount_cents = case when p_status = 'approved' and p_amount_cents is not null then p_amount_cents else amount_cents end,
    method = coalesce(p_method, method),
    paid_at = case when p_status = 'approved' then coalesce(p_paid_at, now()) else paid_at end,
    raw_payload = coalesce(p_raw, raw_payload)
  where id = v_tx.id
  returning * into v_tx;

  if p_status = 'approved' then
    select * into v_plan from public.plans where id = v_tx.plan_id;
    select * into v_sub from public.subscriptions
      where barbershop_id = v_tx.barbershop_id and status in ('trial', 'active', 'pending', 'past_due', 'suspended')
      for update;

    if v_sub.id is null then
      insert into public.subscriptions (barbershop_id, plan_id, status, amount_cents, billing_period, current_period_start,
                                        current_period_end, next_billing_at, gateway, coupon_id)
      values (v_tx.barbershop_id, v_plan.id, 'active', v_plan.price_cents, v_plan.billing_period, now(),
              now() + public.period_interval(v_plan.billing_period), now() + public.period_interval(v_plan.billing_period),
              p_gateway, v_tx.coupon_id)
      returning * into v_sub;
      v_from := null;
    else
      v_from := v_sub.status;
      -- renovação do mesmo plano ativo soma ao vencimento; troca de plano ou saída do teste começa hoje
      v_start := case when v_sub.status in ('active', 'past_due') and v_sub.plan_id = v_plan.id
                      then greatest(now(), v_sub.current_period_end) else now() end;
      update public.subscriptions set
        plan_id = v_plan.id, amount_cents = v_plan.price_cents, billing_period = v_plan.billing_period,
        status = 'active', current_period_start = v_start,
        current_period_end = v_start + public.period_interval(v_plan.billing_period),
        next_billing_at = v_start + public.period_interval(v_plan.billing_period),
        gateway = p_gateway, cancel_at_period_end = false, canceled_at = null, suspended_at = null,
        coupon_id = coalesce(v_tx.coupon_id, coupon_id)
      where id = v_sub.id
      returning * into v_sub;
    end if;

    update public.payment_transactions set subscription_id = v_sub.id where id = v_tx.id;

    if v_tx.coupon_id is not null then
      insert into public.coupon_redemptions (coupon_id, barbershop_id, subscription_id, discount_cents)
      values (v_tx.coupon_id, v_tx.barbershop_id, v_sub.id, v_tx.discount_cents)
      on conflict (coupon_id, barbershop_id) do nothing;
      select * into v_coupon from public.coupons where id = v_tx.coupon_id;
      if coalesce(v_coupon.extra_trial_days, 0) > 0 then
        update public.subscriptions set current_period_end = current_period_end + make_interval(days => v_coupon.extra_trial_days),
          next_billing_at = current_period_end + make_interval(days => v_coupon.extra_trial_days)
        where id = v_sub.id returning * into v_sub;
      end if;
    end if;

    insert into public.subscription_events (subscription_id, barbershop_id, event_type, from_status, to_status, metadata)
    values (v_sub.id, v_tx.barbershop_id, case when v_from = 'active' then 'renewed' else 'payment_approved' end, v_from, 'active',
            jsonb_build_object('transaction_id', v_tx.id, 'amount_cents', v_tx.amount_cents, 'plan', v_plan.slug, 'gateway', p_gateway));

    insert into public.notifications (barbershop_id, event_type, title, body, payload)
    values (v_tx.barbershop_id, 'billing.payment_approved', 'Pagamento aprovado',
            format('Plano %s ativo até %s.', v_plan.name, to_char(v_sub.current_period_end at time zone 'America/Sao_Paulo', 'DD/MM/YYYY')),
            jsonb_build_object('transaction_id', v_tx.id));
  elsif p_status = 'refused' then
    select * into v_sub from public.subscriptions
      where barbershop_id = v_tx.barbershop_id and status in ('trial', 'active', 'pending', 'past_due', 'suspended');
    if v_sub.id is not null then
      insert into public.subscription_events (subscription_id, barbershop_id, event_type, from_status, to_status, metadata)
      values (v_sub.id, v_tx.barbershop_id, 'payment_failed', v_sub.status, v_sub.status, jsonb_build_object('transaction_id', v_tx.id));
    end if;
    insert into public.notifications (barbershop_id, event_type, title, body, payload)
    values (v_tx.barbershop_id, 'billing.payment_failed', 'Pagamento recusado',
            'O pagamento da assinatura não foi aprovado. Tente outra forma de pagamento.', jsonb_build_object('transaction_id', v_tx.id));
  end if;

  return jsonb_build_object('result', 'applied', 'transaction_id', v_tx.id, 'status', p_status, 'subscription_id', v_sub.id);
end;
$$;
revoke execute on function public.apply_payment_event(public.payment_gateway, uuid, text, text, public.transaction_status, integer, text, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_payment_event(public.payment_gateway, uuid, text, text, public.transaction_status, integer, text, timestamptz, jsonb)
  to service_role;

-- ---------------------------------------------------------------- cancelamento
create or replace function public.cancel_my_subscription(p_barbershop_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.subscriptions;
begin
  if not public.has_shop_role(p_barbershop_id, array['owner']::public.shop_role[]) then
    raise exception 'AP_FORBIDDEN' using errcode = '42501';
  end if;
  select * into v_sub from public.subscriptions
    where barbershop_id = p_barbershop_id and status in ('trial', 'active', 'past_due', 'pending') for update;
  if not found then raise exception 'AP_NO_SUBSCRIPTION' using errcode = 'P0002'; end if;
  if v_sub.cancel_at_period_end then return; end if;
  update public.subscriptions set cancel_at_period_end = true, canceled_at = now() where id = v_sub.id;
  insert into public.subscription_events (subscription_id, barbershop_id, event_type, from_status, to_status, metadata, actor_id)
  values (v_sub.id, p_barbershop_id, 'cancel_scheduled', v_sub.status, v_sub.status,
          jsonb_build_object('reason', left(coalesce(p_reason, ''), 300)), (select auth.uid()));
end;
$$;
revoke execute on function public.cancel_my_subscription(uuid, text) from public, anon;
grant execute on function public.cancel_my_subscription(uuid, text) to authenticated;

create or replace function public.resume_my_subscription(p_barbershop_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.subscriptions;
begin
  if not public.has_shop_role(p_barbershop_id, array['owner']::public.shop_role[]) then
    raise exception 'AP_FORBIDDEN' using errcode = '42501';
  end if;
  update public.subscriptions set cancel_at_period_end = false, canceled_at = null
    where barbershop_id = p_barbershop_id and status in ('trial', 'active', 'past_due', 'pending') and cancel_at_period_end
    returning * into v_sub;
  if v_sub.id is not null then
    insert into public.subscription_events (subscription_id, barbershop_id, event_type, from_status, to_status, actor_id)
    values (v_sub.id, p_barbershop_id, 'reactivated', v_sub.status, v_sub.status, (select auth.uid()));
  end if;
end;
$$;
revoke execute on function public.resume_my_subscription(uuid) from public, anon;
grant execute on function public.resume_my_subscription(uuid) to authenticated;

-- ---------------------------------------------------------------- manutenção diária
-- service_role: encerra assinaturas canceladas ou vencidas além da tolerância.
create or replace function public.run_subscription_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grace integer;
  v_canceled integer;
  v_past_due integer;
  v_expired integer;
begin
  select coalesce(grace_period_days, 0) into v_grace from public.platform_settings where id;

  with c as (
    update public.subscriptions set status = 'canceled'
    where cancel_at_period_end and status in ('trial', 'active', 'past_due', 'pending') and current_period_end < now()
    returning id, barbershop_id
  ), e as (
    insert into public.subscription_events (subscription_id, barbershop_id, event_type, to_status)
    select id, barbershop_id, 'canceled', 'canceled' from c returning 1
  ) select count(*) into v_canceled from e;

  with p as (
    update public.subscriptions set status = 'past_due'
    where status = 'active' and not cancel_at_period_end and current_period_end < now()
    returning id, barbershop_id
  ), e as (
    insert into public.subscription_events (subscription_id, barbershop_id, event_type, from_status, to_status)
    select id, barbershop_id, 'status_changed', 'active', 'past_due' from p returning 1
  ) select count(*) into v_past_due from e;

  with x as (
    update public.subscriptions s set status = 'expired'
    where (s.status = 'trial' and s.current_period_end < now())
       or (s.status in ('past_due', 'pending') and s.current_period_end + make_interval(days => v_grace) < now())
    returning id, barbershop_id
  ), e as (
    insert into public.subscription_events (subscription_id, barbershop_id, event_type, to_status)
    select id, barbershop_id, 'expired', 'expired' from x returning 1
  ) select count(*) into v_expired from e;

  -- transações pendentes há mais de 3 dias viram canceladas
  update public.payment_transactions set status = 'canceled'
    where status = 'pending' and created_at < now() - interval '3 days';

  return jsonb_build_object('canceled', v_canceled, 'past_due', v_past_due, 'expired', v_expired);
end;
$$;
revoke execute on function public.run_subscription_maintenance() from public, anon, authenticated;
grant execute on function public.run_subscription_maintenance() to service_role;

-- ---------------------------------------------------------------- notificações
-- Cada aviso no painel pode gerar uma cópia por e-mail para o dono, conforme as
-- preferências da barbearia.
create or replace function public.notifications_fanout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefs jsonb;
  v_owner record;
begin
  if new.channel <> 'in_app' or new.barbershop_id is null then return new; end if;
  select notification_prefs into v_prefs from public.barbershops where id = new.barbershop_id;
  if new.event_type in ('appointment.created', 'appointment.cancelled')
     and coalesce((v_prefs ->> 'new_booking_email')::boolean, true) is false then
    return new;
  end if;
  if new.event_type not in ('appointment.created', 'appointment.cancelled', 'billing.payment_approved', 'billing.payment_failed') then
    return new;
  end if;
  for v_owner in
    select p.id, p.email from public.barbershop_members m join public.profiles p on p.id = m.user_id
    where m.barbershop_id = new.barbershop_id and m.role = 'owner' and m.is_active and p.email is not null
  loop
    insert into public.notifications (barbershop_id, user_id, channel, event_type, title, body, payload, recipient)
    values (new.barbershop_id, v_owner.id, 'email', new.event_type, new.title, new.body, new.payload, v_owner.email);
  end loop;
  return new;
end;
$$;
revoke execute on function public.notifications_fanout() from public, anon, authenticated;
drop trigger if exists notifications_fanout on public.notifications;
create trigger notifications_fanout after insert on public.notifications
  for each row execute function public.notifications_fanout();

-- service_role: enfileira lembretes de WhatsApp para os clientes
create or replace function public.enqueue_appointment_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with due as (
    select a.id, a.barbershop_id, a.starts_at, a.public_token, c.name as customer_name, c.phone,
           b.name as shop_name, b.slug, b.timezone, s.name as service_name, pr.name as professional_name
    from public.appointments a
    join public.barbershops b on b.id = a.barbershop_id
    join public.customers c on c.id = a.customer_id
    left join public.services s on s.id = a.service_id
    left join public.professionals pr on pr.id = a.professional_id
    where a.status in ('pending', 'confirmed')
      and a.reminder_queued_at is null
      and coalesce((b.notification_prefs ->> 'reminder_whatsapp')::boolean, false)
      and public.has_feature(b.id, 'notifications.whatsapp')
      and c.phone is not null
      and a.starts_at > now()
      and a.starts_at <= now() + make_interval(hours => coalesce((b.notification_prefs ->> 'reminder_hours')::integer, 24))
    for update of a skip locked
  ), ins as (
    insert into public.notifications (barbershop_id, channel, event_type, title, body, payload, recipient)
    select d.barbershop_id, 'whatsapp', 'appointment.reminder', 'Lembrete de horário',
           format('Olá, %s! Lembrete do seu horário na %s: %s, %s%s.',
                  split_part(d.customer_name, ' ', 1), d.shop_name,
                  to_char(d.starts_at at time zone coalesce(d.timezone, 'America/Sao_Paulo'), 'DD/MM "às" HH24:MI'),
                  coalesce(d.service_name, 'atendimento'),
                  coalesce(' com ' || d.professional_name, '')),
           jsonb_build_object('appointment_id', d.id, 'token', d.public_token, 'slug', d.slug),
           d.phone
    from due d
    returning (payload ->> 'appointment_id')::uuid as appointment_id
  ), upd as (
    update public.appointments a set reminder_queued_at = now() from ins where a.id = ins.appointment_id returning 1
  ) select count(*) into v_count from upd;
  return v_count;
end;
$$;
revoke execute on function public.enqueue_appointment_reminders() from public, anon, authenticated;
grant execute on function public.enqueue_appointment_reminders() to service_role;

-- service_role: pega um lote de envios pendentes (sem concorrência entre execuções)
create or replace function public.claim_notifications(p_limit integer default 25)
returns setof public.notifications
language sql
security definer
set search_path = ''
as $$
  update public.notifications n set attempts = n.attempts + 1
  where n.id in (
    select id from public.notifications
    where channel in ('email', 'whatsapp') and status = 'pending' and attempts < 5
    order by created_at
    limit least(greatest(p_limit, 1), 100)
    for update skip locked
  )
  returning n.*;
$$;
revoke execute on function public.claim_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_notifications(integer) to service_role;

create or replace function public.finish_notification(p_id uuid, p_status public.notification_status, p_error text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications set
    status = case when p_status = 'failed' and attempts < 5 then 'pending'::public.notification_status else p_status end,
    error = left(p_error, 500),
    sent_at = case when p_status = 'sent' then now() else sent_at end
  where id = p_id;
$$;
revoke execute on function public.finish_notification(uuid, public.notification_status, text) from public, anon, authenticated;
grant execute on function public.finish_notification(uuid, public.notification_status, text) to service_role;

-- Caixa de entrada do painel: só avisos internos
create or replace function public.mark_notifications_read(p_barbershop_id uuid, p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_shop_manager(p_barbershop_id) then raise exception 'AP_FORBIDDEN' using errcode = '42501'; end if;
  update public.notifications set read_at = now()
  where barbershop_id = p_barbershop_id and channel = 'in_app' and read_at is null
    and (user_id is null or user_id = (select auth.uid()))
    and (p_ids is null or id = any (p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.mark_notifications_read(uuid, uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid, uuid[]) to authenticated;
