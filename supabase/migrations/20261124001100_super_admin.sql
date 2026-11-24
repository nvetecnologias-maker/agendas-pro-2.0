-- =============================================================================
-- 0011 · Super Admin
--   * visão geral da plataforma (barbearias, assinaturas, MRR, receita)
--   * lista e detalhe de barbearias com busca e filtros
--   * ações administrativas atômicas e auditadas (status, dias, plano, assinatura)
--   * gateways de pagamento com segredos no Vault (nunca em texto nas tabelas)
-- Todas as funções exigem platform_role = super_admin.
-- =============================================================================

create or replace function public.assert_super_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'AP_FORBIDDEN' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.assert_super_admin() from public, anon;
grant execute on function public.assert_super_admin() to authenticated;

-- Valor mensal equivalente (para MRR)
create or replace function public.monthly_cents(p_amount integer, p_period public.billing_period)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select p_amount::numeric / case p_period when 'monthly' then 1 when 'quarterly' then 3 when 'semiannual' then 6 else 12 end;
$$;

-- -----------------------------------------------------------------------------
-- Visão geral
-- -----------------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  perform public.assert_super_admin();
  select jsonb_build_object(
    'shops', (select jsonb_build_object(
        'total', count(*),
        'active', count(*) filter (where status = 'active'),
        'suspended', count(*) filter (where status = 'suspended'),
        'published', count(*) filter (where published_at is not null),
        'new_30d', count(*) filter (where created_at > now() - interval '30 days'))
      from public.barbershops),
    'subscriptions', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
      from (select status, count(*) n from public.subscriptions
            where status in ('trial', 'active', 'pending', 'past_due', 'suspended')
               or updated_at > now() - interval '90 days'
            group by status) x),
    'mrr_cents', (select coalesce(round(sum(public.monthly_cents(amount_cents, billing_period))), 0)
      from public.subscriptions where status = 'active' and current_period_end > now()),
    'trials_expiring_7d', (select count(*) from public.subscriptions
      where status = 'trial' and current_period_end between now() and now() + interval '7 days'),
    'churn_30d', (select count(*) from public.subscription_events
      where event_type in ('canceled', 'expired') and created_at > now() - interval '30 days'),
    'users', (select count(*) from public.profiles),
    'appointments_30d', (select count(*) from public.appointments where created_at > now() - interval '30 days'),
    'public_bookings_30d', (select count(*) from public.appointments
      where source = 'public_page' and created_at > now() - interval '30 days'),
    'revenue_by_month', (
      select coalesce(jsonb_agg(jsonb_build_object('month', to_char(m, 'YYYY-MM'), 'cents', coalesce(t.cents, 0)) order by m), '[]'::jsonb)
      from generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m
      left join (select date_trunc('month', paid_at) mm, sum(amount_cents) cents
                 from public.payment_transactions where status = 'approved' and paid_at is not null group by 1) t on t.mm = m),
    'signups_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'count', coalesce(c.n, 0)) order by d), '[]'::jsonb)
      from generate_series((now() at time zone 'America/Sao_Paulo')::date - 29, (now() at time zone 'America/Sao_Paulo')::date, interval '1 day') d
      left join (select (created_at at time zone 'America/Sao_Paulo')::date dd, count(*) n from public.barbershops group by 1) c on c.dd = d::date),
    'plans', (
      select coalesce(jsonb_agg(jsonb_build_object('name', p.name, 'count', coalesce(x.n, 0)) order by p.sort_order), '[]'::jsonb)
      from public.plans p
      left join (select plan_id, count(*) n from public.subscriptions
                 where status in ('trial', 'active', 'pending', 'past_due') group by 1) x on x.plan_id = p.id),
    'expiring', (
      select coalesce(jsonb_agg(row_to_json(e) order by e.current_period_end), '[]'::jsonb)
      from (select b.id, b.name, b.slug, s.status, s.current_period_end, p.name as plan_name
            from public.subscriptions s join public.barbershops b on b.id = s.barbershop_id join public.plans p on p.id = s.plan_id
            where s.status in ('trial', 'active', 'past_due') and s.current_period_end between now() - interval '3 days' and now() + interval '7 days'
            order by s.current_period_end limit 8) e)
  ) into v;
  return v;
end;
$$;
revoke execute on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

-- -----------------------------------------------------------------------------
-- Lista de barbearias
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_barbershops(
  p_search text default null,
  p_shop_status text default null,
  p_sub_status text default null,
  p_limit integer default 30,
  p_offset integer default 0
)
returns table (
  id uuid, name text, slug text, status public.barbershop_status, created_at timestamptz, published boolean,
  owner_name text, owner_email text, owner_phone text,
  plan_name text, sub_status public.subscription_status, period_end timestamptz, amount_cents integer,
  billing_period public.billing_period, professionals bigint, appointments_30d bigint, total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  perform public.assert_super_admin();
  return query
  with base as (
    select b.*, o.full_name as o_name, o.email::text as o_email, o.phone as o_phone,
           s.status as s_status, s.current_period_end, s.amount_cents as s_amount, s.billing_period as s_period, pl.name as pl_name
    from public.barbershops b
    left join lateral (
      select pr.full_name, pr.email, pr.phone from public.barbershop_members m join public.profiles pr on pr.id = m.user_id
      where m.barbershop_id = b.id and m.role = 'owner' order by m.created_at limit 1) o on true
    left join lateral (
      select * from public.subscriptions s where s.barbershop_id = b.id order by
        (s.status in ('trial', 'active', 'pending', 'past_due', 'suspended')) desc, s.created_at desc limit 1) s on true
    left join public.plans pl on pl.id = s.plan_id
    where (q is null or b.name ilike '%' || q || '%' or b.slug::text ilike '%' || q || '%'
           or o.email::text ilike '%' || q || '%' or o.full_name ilike '%' || q || '%'
           or regexp_replace(coalesce(o.phone, ''), '\D', '', 'g') like '%' || nullif(regexp_replace(q, '\D', '', 'g'), '') || '%')
      and (p_shop_status is null or b.status::text = p_shop_status)
      and (p_sub_status is null or s.status::text = p_sub_status)
  )
  select bs.id, bs.name, bs.slug::text, bs.status, bs.created_at, bs.published_at is not null,
         bs.o_name, bs.o_email, bs.o_phone, bs.pl_name, bs.s_status, bs.current_period_end, bs.s_amount, bs.s_period,
         (select count(*) from public.professionals p where p.barbershop_id = bs.id and p.is_active),
         (select count(*) from public.appointments a where a.barbershop_id = bs.id and a.created_at > now() - interval '30 days'),
         count(*) over ()
  from base bs
  order by bs.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end;
$$;
revoke execute on function public.admin_list_barbershops(text, text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_barbershops(text, text, text, integer, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Detalhe da barbearia
-- -----------------------------------------------------------------------------
create or replace function public.admin_barbershop_detail(p_barbershop_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_shop public.barbershops;
begin
  perform public.assert_super_admin();
  select * into v_shop from public.barbershops where id = p_barbershop_id;
  if not found then return null; end if;
  return jsonb_build_object(
    'shop', to_jsonb(v_shop),
    'access', public.barbershop_access_level(p_barbershop_id),
    'members', (select coalesce(jsonb_agg(jsonb_build_object('role', m.role, 'name', pr.full_name, 'email', pr.email, 'phone', pr.phone,
                                  'is_active', m.is_active, 'last_sign_in_at', null) order by m.role, m.created_at), '[]'::jsonb)
                from public.barbershop_members m join public.profiles pr on pr.id = m.user_id where m.barbershop_id = p_barbershop_id),
    'subscription', (select to_jsonb(x) from (
        select s.*, p.name as plan_name, p.slug::text as plan_slug from public.subscriptions s join public.plans p on p.id = s.plan_id
        where s.barbershop_id = p_barbershop_id
        order by (s.status in ('trial', 'active', 'pending', 'past_due', 'suspended')) desc, s.created_at desc limit 1) x),
    'events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc), '[]'::jsonb) from (
        select ev.event_type, ev.from_status, ev.to_status, ev.metadata, ev.created_at, pr.full_name as actor_name
        from public.subscription_events ev left join public.profiles pr on pr.id = ev.actor_id
        where ev.barbershop_id = p_barbershop_id order by ev.created_at desc limit 30) e),
    'audit', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb) from (
        select l.action, l.entity_type, l.metadata, l.created_at, l.actor_role, pr.full_name as actor_name
        from public.audit_logs l left join public.profiles pr on pr.id = l.actor_id
        where l.barbershop_id = p_barbershop_id order by l.created_at desc limit 30) a),
    'transactions', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb) from (
        select t.id, t.gateway, t.amount_cents, t.discount_cents, t.method, t.status, t.paid_at, t.created_at
        from public.payment_transactions t where t.barbershop_id = p_barbershop_id order by t.created_at desc limit 20) t),
    'stats', jsonb_build_object(
      'professionals', (select count(*) from public.professionals where barbershop_id = p_barbershop_id and is_active),
      'services', (select count(*) from public.services where barbershop_id = p_barbershop_id and is_active),
      'customers', (select count(*) from public.customers where barbershop_id = p_barbershop_id),
      'appointments_total', (select count(*) from public.appointments where barbershop_id = p_barbershop_id),
      'appointments_30d', (select count(*) from public.appointments where barbershop_id = p_barbershop_id and created_at > now() - interval '30 days'),
      'public_bookings_30d', (select count(*) from public.appointments where barbershop_id = p_barbershop_id and source = 'public_page' and created_at > now() - interval '30 days'),
      'last_appointment_at', (select max(created_at) from public.appointments where barbershop_id = p_barbershop_id))
  );
end;
$$;
revoke execute on function public.admin_barbershop_detail(uuid) from public, anon;
grant execute on function public.admin_barbershop_detail(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Ações administrativas
-- -----------------------------------------------------------------------------
create or replace function public.admin_log_sub_event(
  p_sub public.subscriptions, p_event text, p_from public.subscription_status, p_meta jsonb
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.subscription_events (subscription_id, barbershop_id, event_type, from_status, to_status, metadata, actor_id)
  values (p_sub.id, p_sub.barbershop_id, p_event, p_from, p_sub.status, coalesce(p_meta, '{}'::jsonb), (select auth.uid()));
$$;
revoke execute on function public.admin_log_sub_event(public.subscriptions, text, public.subscription_status, jsonb) from public, anon, authenticated;

-- Suspender / reativar a barbearia inteira
create or replace function public.admin_set_shop_status(p_barbershop_id uuid, p_status public.barbershop_status, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_super_admin();
  update public.barbershops set status = p_status where id = p_barbershop_id;
  if not found then raise exception 'AP_NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.log_audit(case when p_status = 'suspended' then 'barbershop.suspended' else 'barbershop.reactivated' end,
                           p_barbershop_id, 'barbershop', p_barbershop_id::text, jsonb_build_object('reason', p_reason));
end;
$$;
revoke execute on function public.admin_set_shop_status(uuid, public.barbershop_status, text) from public, anon;
grant execute on function public.admin_set_shop_status(uuid, public.barbershop_status, text) to authenticated;

-- Conceder (ou remover, com valor negativo) dias na assinatura atual
create or replace function public.admin_grant_days(p_barbershop_id uuid, p_days integer, p_reason text default null)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.subscriptions;
  v_from public.subscription_status;
begin
  perform public.assert_super_admin();
  if p_days = 0 or p_days < -365 or p_days > 365 then
    raise exception 'AP_INVALID_DAYS' using errcode = '22023';
  end if;
  select * into v_sub from public.subscriptions
  where barbershop_id = p_barbershop_id and status in ('trial', 'active', 'pending', 'past_due', 'suspended')
  for update;
  if not found then raise exception 'AP_NO_SUBSCRIPTION' using errcode = 'P0002'; end if;
  v_from := v_sub.status;

  update public.subscriptions
     set current_period_end = greatest(case when p_days > 0 then greatest(current_period_end, now()) else current_period_end end
                                       + make_interval(days => p_days), current_period_start + interval '1 hour'),
         status = case when status in ('past_due', 'pending') and p_days > 0 then 'active' else status end,
         next_billing_at = case when next_billing_at is not null and p_days > 0 then greatest(current_period_end, now()) + make_interval(days => p_days) else next_billing_at end
   where id = v_sub.id
  returning * into v_sub;

  perform public.admin_log_sub_event(v_sub, 'days_granted', v_from, jsonb_build_object('days', p_days, 'reason', p_reason));
  return v_sub.current_period_end;
end;
$$;
revoke execute on function public.admin_grant_days(uuid, integer, text) from public, anon;
grant execute on function public.admin_grant_days(uuid, integer, text) to authenticated;

-- Trocar de plano (ou criar assinatura se a barbearia não tiver nenhuma vigente)
create or replace function public.admin_change_plan(
  p_barbershop_id uuid, p_plan_id uuid, p_status public.subscription_status default null, p_period_days integer default null, p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
  v_sub public.subscriptions;
  v_from public.subscription_status;
  v_old_plan uuid;
begin
  perform public.assert_super_admin();
  select * into v_plan from public.plans where id = p_plan_id;
  if not found then raise exception 'AP_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_status is not null and p_status in ('canceled', 'expired') then
    raise exception 'AP_INVALID_STATUS' using errcode = '22023';
  end if;

  select * into v_sub from public.subscriptions
  where barbershop_id = p_barbershop_id and status in ('trial', 'active', 'pending', 'past_due', 'suspended')
  for update;

  if not found then
    insert into public.subscriptions (barbershop_id, plan_id, status, amount_cents, billing_period, current_period_start, current_period_end)
    values (p_barbershop_id, v_plan.id, coalesce(p_status, 'active'), v_plan.price_cents, v_plan.billing_period, now(),
            now() + make_interval(days => coalesce(p_period_days, 30)))
    returning * into v_sub;
    perform public.admin_log_sub_event(v_sub, 'created', null, jsonb_build_object('plan', v_plan.slug, 'by', 'super_admin', 'reason', p_reason));
    return v_sub.id;
  end if;

  v_from := v_sub.status;
  v_old_plan := v_sub.plan_id;
  update public.subscriptions
     set plan_id = v_plan.id,
         amount_cents = v_plan.price_cents,
         billing_period = v_plan.billing_period,
         status = coalesce(p_status, status),
         suspended_at = case when coalesce(p_status, status) = 'suspended' then coalesce(suspended_at, now()) else null end,
         current_period_end = case when p_period_days is not null then now() + make_interval(days => p_period_days) else current_period_end end
   where id = v_sub.id
  returning * into v_sub;
  perform public.admin_log_sub_event(v_sub, 'plan_changed', v_from,
    jsonb_build_object('from_plan', v_old_plan, 'to_plan', v_plan.id, 'plan', v_plan.slug, 'reason', p_reason));
  return v_sub.id;
end;
$$;
revoke execute on function public.admin_change_plan(uuid, uuid, public.subscription_status, integer, text) from public, anon;
grant execute on function public.admin_change_plan(uuid, uuid, public.subscription_status, integer, text) to authenticated;

-- Mudar o status da assinatura atual (ativar, suspender, cancelar, expirar...)
create or replace function public.admin_set_subscription_status(p_barbershop_id uuid, p_status public.subscription_status, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.subscriptions;
  v_from public.subscription_status;
begin
  perform public.assert_super_admin();
  select * into v_sub from public.subscriptions
  where barbershop_id = p_barbershop_id and status in ('trial', 'active', 'pending', 'past_due', 'suspended')
  for update;
  if not found then raise exception 'AP_NO_SUBSCRIPTION' using errcode = 'P0002'; end if;
  if v_sub.status = p_status then return; end if;
  v_from := v_sub.status;

  update public.subscriptions
     set status = p_status,
         suspended_at = case when p_status = 'suspended' then now() else null end,
         canceled_at = case when p_status = 'canceled' then now() else canceled_at end,
         current_period_end = case when p_status = 'active' and current_period_end < now() then now() + interval '30 days' else current_period_end end
   where id = v_sub.id
  returning * into v_sub;

  perform public.admin_log_sub_event(v_sub,
    case p_status when 'suspended' then 'suspended' when 'canceled' then 'canceled' when 'expired' then 'expired'
                  when 'active' then case when v_from = 'suspended' then 'reactivated' else 'activated' end
                  else 'status_changed' end,
    v_from, jsonb_build_object('reason', p_reason));
end;
$$;
revoke execute on function public.admin_set_subscription_status(uuid, public.subscription_status, text) from public, anon;
grant execute on function public.admin_set_subscription_status(uuid, public.subscription_status, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Gateways: segredos guardados no Vault; a tabela guarda só o id do segredo
-- -----------------------------------------------------------------------------
create or replace function public.admin_save_gateway(
  p_provider public.payment_gateway,
  p_environment public.gateway_environment,
  p_public_key text,
  p_enabled_methods text[],
  p_is_active boolean,
  p_secret_key text default null,      -- null/vazio = manter o atual
  p_webhook_secret text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.payment_gateways;
  v_name text := p_provider::text || ':' || p_environment::text;
  v_secret text := nullif(btrim(coalesce(p_secret_key, '')), '');
  v_hook text := nullif(btrim(coalesce(p_webhook_secret, '')), '');
begin
  perform public.assert_super_admin();
  if p_enabled_methods is null or not (p_enabled_methods <@ array['pix', 'credit_card', 'boleto']) then
    raise exception 'AP_INVALID_METHODS' using errcode = '22023';
  end if;

  insert into public.payment_gateways (provider, environment, public_key, enabled_methods, updated_by)
  values (p_provider, p_environment, nullif(btrim(coalesce(p_public_key, '')), ''), p_enabled_methods, (select auth.uid()))
  on conflict (provider, environment) do update
    set public_key = excluded.public_key, enabled_methods = excluded.enabled_methods, updated_by = excluded.updated_by
  returning * into v_row;

  if v_secret is not null then
    if v_row.secret_key_vault_id is null then
      update public.payment_gateways set secret_key_vault_id = vault.create_secret(v_secret, 'gateway_secret:' || v_name || ':' || v_row.id, 'Chave secreta do gateway')
      where id = v_row.id;
    else
      perform vault.update_secret(v_row.secret_key_vault_id, v_secret);
    end if;
  end if;
  if v_hook is not null then
    if v_row.webhook_secret_vault_id is null then
      update public.payment_gateways set webhook_secret_vault_id = vault.create_secret(v_hook, 'gateway_webhook:' || v_name || ':' || v_row.id, 'Segredo do webhook')
      where id = v_row.id;
    else
      perform vault.update_secret(v_row.webhook_secret_vault_id, v_hook);
    end if;
  end if;

  select * into v_row from public.payment_gateways where id = v_row.id;
  if p_is_active then
    if v_row.secret_key_vault_id is null then
      raise exception 'AP_GATEWAY_NO_SECRET' using errcode = '22023';
    end if;
    update public.payment_gateways set is_active = false where is_active and id <> v_row.id;
    update public.payment_gateways set is_active = true where id = v_row.id;
    update public.platform_settings set default_gateway = p_provider where id;
  else
    update public.payment_gateways set is_active = false where id = v_row.id;
  end if;
  return v_row.id;
end;
$$;
revoke execute on function public.admin_save_gateway(public.payment_gateway, public.gateway_environment, text, text[], boolean, text, text) from public, anon;
grant execute on function public.admin_save_gateway(public.payment_gateway, public.gateway_environment, text, text[], boolean, text, text) to authenticated;

-- Leitura do segredo: SOMENTE o servidor (service_role), usada nas integrações
create or replace function public.get_gateway_secret(p_gateway_id uuid, p_kind text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_secret text;
begin
  select case p_kind when 'secret' then secret_key_vault_id when 'webhook' then webhook_secret_vault_id end
    into v_id from public.payment_gateways where id = p_gateway_id;
  if v_id is null then return null; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where id = v_id;
  return v_secret;
end;
$$;
revoke execute on function public.get_gateway_secret(uuid, text) from public, anon, authenticated;
grant execute on function public.get_gateway_secret(uuid, text) to service_role;

-- Ids do Vault não precisam ir ao navegador: o painel só precisa saber se existe
revoke select on public.payment_gateways from authenticated;
grant select (id, provider, environment, is_active, public_key, enabled_methods, updated_by, created_at, updated_at)
  on public.payment_gateways to authenticated;
-- visão do dono (postgres) filtrada por is_super_admin(): só o Super Admin vê linhas
create or replace view public.payment_gateways_admin as
select g.id, g.provider, g.environment, g.is_active, g.public_key, g.enabled_methods, g.updated_at,
       g.secret_key_vault_id is not null as has_secret,
       g.webhook_secret_vault_id is not null as has_webhook_secret
from public.payment_gateways g
where public.is_super_admin();
revoke all on public.payment_gateways_admin from anon;
grant select on public.payment_gateways_admin to authenticated;

-- Cupons: quantas vezes cada um foi usado
create or replace view public.coupon_usage
with (security_invoker = true) as
select c.id as coupon_id, count(r.id) as redemptions, coalesce(sum(r.discount_cents), 0) as discount_cents
from public.coupons c left join public.coupon_redemptions r on r.coupon_id = c.id
group by c.id;
revoke all on public.coupon_usage from anon;
grant select on public.coupon_usage to authenticated;
