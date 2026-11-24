-- ============================================================================
-- 0005 · Auditoria, notificações, regras de acesso por assinatura e cadastro
-- ============================================================================

-- ---------------------------------------------------------------------------
-- audit_logs: somente inserção (ninguém edita ou apaga pela API)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id             bigint generated always as identity primary key,
  actor_id       uuid references auth.users (id) on delete set null,
  actor_role     text,
  barbershop_id  uuid references public.barbershops (id) on delete set null,
  action         text not null,       -- ex.: account.created, subscription.suspended
  entity_type    text,
  entity_id      text,
  metadata       jsonb not null default '{}'::jsonb,
  ip_address     inet,
  user_agent     text,
  created_at     timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_shop_idx on public.audit_logs (barbershop_id, created_at desc);
create index audit_logs_action_idx on public.audit_logs (action, created_at desc);

create or replace function public.log_audit(
  p_action text,
  p_barbershop_id uuid default null,
  p_entity_type text default null,
  p_entity_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  insert into public.audit_logs (actor_id, actor_role, barbershop_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    case when public.is_super_admin() then 'super_admin'
         when v_actor is null then 'system'
         else 'user' end,
    p_barbershop_id, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;
-- só o servidor (service_role) e funções internas chamam diretamente
revoke execute on function public.log_audit(text, uuid, text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- notifications: notificações internas + fila para e-mail/WhatsApp
-- ---------------------------------------------------------------------------
create table public.notifications (
  id             uuid primary key default gen_random_uuid(),
  barbershop_id  uuid references public.barbershops (id) on delete cascade,
  user_id        uuid references auth.users (id) on delete cascade,  -- destinatário interno
  channel        public.notification_channel not null default 'in_app',
  event_type     text not null,  -- appointment.created, appointment.cancelled, subscription.expiring ...
  title          text not null,
  body           text,
  payload        jsonb not null default '{}'::jsonb,
  status         public.notification_status not null default 'pending',
  error          text,
  read_at        timestamptz,
  sent_at        timestamptz,
  created_at     timestamptz not null default now(),
  check (barbershop_id is not null or user_id is not null)
);
create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);
create index notifications_shop_idx on public.notifications (barbershop_id, created_at desc);
create index notifications_queue_idx on public.notifications (channel, status) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Assinatura -> nível de acesso (matriz central, verificada no backend)
--   full          : tudo liberado conforme o plano
--   grace         : vencida, mas dentro da tolerância -> opera com aviso
--   billing_only  : sem assinatura válida -> só área de cobrança
--   blocked       : suspensa -> sem operação, dados preservados
-- ---------------------------------------------------------------------------
create or replace function public.barbershop_access_level(p_barbershop_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_shop_status public.barbershop_status;
  v_sub record;
  v_grace integer;
begin
  select status into v_shop_status from public.barbershops where id = p_barbershop_id;
  if v_shop_status is null then return 'blocked'; end if;
  if v_shop_status = 'suspended' then return 'blocked'; end if;

  select s.status, s.current_period_end into v_sub
  from public.subscriptions s
  where s.barbershop_id = p_barbershop_id
    and s.status in ('trial', 'active', 'pending', 'past_due', 'suspended')
  limit 1;

  if not found then return 'billing_only'; end if;

  select grace_period_days into v_grace from public.platform_settings where id;

  return case
    when v_sub.status = 'suspended' then 'blocked'
    when v_sub.status in ('trial', 'active') and now() <= v_sub.current_period_end then 'full'
    when v_sub.status in ('active', 'past_due', 'pending')
         and now() <= v_sub.current_period_end + make_interval(days => coalesce(v_grace, 0)) then 'grace'
    else 'billing_only'
  end;
end;
$$;

-- Pode executar operações (criar/editar agendamentos, serviços, etc.)?
create or replace function public.can_operate(p_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.barbershop_access_level(p_barbershop_id) in ('full', 'grace');
$$;

-- Limite numérico de um recurso no plano atual (NULL = ilimitado / sem plano = 0)
create or replace function public.plan_limit(p_barbershop_id uuid, p_feature_key text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when s.id is null then 0
    when pf.plan_id is null then 0          -- recurso não existe no plano
    when not pf.enabled then 0
    else pf.limit_value                      -- null = ilimitado
  end
  from (select 1) dummy
  left join public.subscriptions s
    on s.barbershop_id = p_barbershop_id
   and s.status in ('trial', 'active', 'pending', 'past_due')
  left join public.plan_features pf
    on pf.plan_id = s.plan_id and pf.feature_key = p_feature_key;
$$;

create or replace function public.has_feature(p_barbershop_id uuid, p_feature_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    join public.plan_features pf on pf.plan_id = s.plan_id
    where s.barbershop_id = p_barbershop_id
      and s.status in ('trial', 'active', 'pending', 'past_due')
      and pf.feature_key = p_feature_key
      and pf.enabled
  );
$$;

-- Limite de profissionais ativos conforme o plano (validado no banco)
create or replace function public.enforce_professional_limit()
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

  v_limit := public.plan_limit(new.barbershop_id, 'professionals.max');
  if v_limit is null then return new; end if;  -- ilimitado

  -- trava a barbearia para evitar corrida entre inserções simultâneas
  perform 1 from public.barbershops where id = new.barbershop_id for update;

  select count(*) into v_count
  from public.professionals
  where barbershop_id = new.barbershop_id and is_active and id <> new.id;

  if v_count >= v_limit then
    raise exception 'PLAN_LIMIT_PROFESSIONALS: seu plano permite % profissional(is) ativo(s).', v_limit
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger professionals_enforce_limit
  before insert or update of is_active on public.professionals
  for each row execute function public.enforce_professional_limit();

-- ---------------------------------------------------------------------------
-- CADASTRO: quando um usuário é criado no Supabase Auth, em UMA transação:
--   1. cria o perfil
--   2. cria a barbearia (se veio barbershop_name nos metadados)
--   3. associa o usuário como proprietário
--   4. inicia o período de teste no plano padrão
--   5. registra no log de auditoria
-- Se qualquer passo falhar, nada é criado (nem o usuário).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_full_name text := nullif(trim(v_meta ->> 'full_name'), '');
  v_phone text := nullif(regexp_replace(coalesce(v_meta ->> 'phone', ''), '[^0-9+]', '', 'g'), '');
  v_shop_name text := nullif(trim(v_meta ->> 'barbershop_name'), '');
  v_shop_id uuid;
  v_plan public.plans%rowtype;
  v_trial_days integer;
  v_sub_id uuid;
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id, coalesce(v_full_name, split_part(new.email, '@', 1)), new.email, v_phone);

  if v_shop_name is null then
    return new;  -- ex.: profissional convidado, sem barbearia própria
  end if;

  insert into public.barbershops (name, slug, email, phone, whatsapp, created_by)
  values (v_shop_name, public.generate_unique_slug(v_shop_name), new.email, v_phone, v_phone, new.id)
  returning id into v_shop_id;

  insert into public.barbershop_members (barbershop_id, user_id, role)
  values (v_shop_id, new.id, 'owner');

  select * into v_plan from public.plans where is_default_trial and is_active limit 1;
  if found then
    select coalesce(nullif(v_plan.trial_days, 0), default_trial_days) into v_trial_days
    from public.platform_settings where id;

    insert into public.subscriptions (
      barbershop_id, plan_id, status, amount_cents, billing_period,
      current_period_start, current_period_end, next_billing_at
    ) values (
      v_shop_id, v_plan.id, 'trial', v_plan.price_cents, v_plan.billing_period,
      now(), now() + make_interval(days => v_trial_days), now() + make_interval(days => v_trial_days)
    ) returning id into v_sub_id;

    insert into public.subscription_events (subscription_id, barbershop_id, event_type, to_status, metadata, actor_id)
    values (v_sub_id, v_shop_id, 'created', 'trial', jsonb_build_object('trial_days', v_trial_days), new.id);
  end if;

  insert into public.audit_logs (actor_id, actor_role, barbershop_id, action, entity_type, entity_id, metadata)
  values (new.id, 'user', v_shop_id, 'account.created', 'barbershop', v_shop_id::text,
          jsonb_build_object('barbershop_name', v_shop_name, 'email', new.email));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- e-mail do perfil acompanha o e-mail do Auth
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();
