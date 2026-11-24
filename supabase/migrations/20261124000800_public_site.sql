-- ============================================================================
-- 0008 · Site institucional
--   * informações públicas da plataforma (rodapé, contato, redes sociais)
--   * plano escolhido na vitrine é usado no período de teste do cadastro
-- ============================================================================

alter table public.platform_settings
  add column if not exists social_links jsonb not null default '{}'::jsonb;  -- {"instagram": "...", "whatsapp": "..."}

-- Somente campos seguros para o visitante anônimo (nada de cobrança/gateway)
create or replace function public.get_public_platform_info()
returns table (
  platform_name text,
  logo_url text,
  support_email text,
  contact_phone text,
  contact_whatsapp text,
  public_base_url text,
  default_trial_days integer,
  social_links jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select platform_name, logo_url, support_email::text, contact_phone, contact_whatsapp,
         public_base_url, default_trial_days, social_links
  from public.platform_settings
  where id;
$$;
grant execute on function public.get_public_platform_info() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cadastro: respeita o plano escolhido na vitrine (metadado desired_plan),
-- se ele existir e estiver ativo; senão usa o plano padrão de teste.
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
  v_desired_plan text := nullif(lower(trim(v_meta ->> 'desired_plan')), '');
  v_shop_id uuid;
  v_plan public.plans%rowtype;
  v_trial_days integer;
  v_sub_id uuid;
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id, coalesce(v_full_name, split_part(new.email, '@', 1)), new.email, v_phone);

  if v_shop_name is null then
    return new;
  end if;

  insert into public.barbershops (name, slug, email, phone, whatsapp, created_by)
  values (v_shop_name, public.generate_unique_slug(v_shop_name), new.email, v_phone, v_phone, new.id)
  returning id into v_shop_id;

  insert into public.barbershop_members (barbershop_id, user_id, role)
  values (v_shop_id, new.id, 'owner');

  if v_desired_plan is not null then
    select * into v_plan from public.plans where slug = v_desired_plan and is_active limit 1;
  end if;
  if v_plan.id is null then
    select * into v_plan from public.plans where is_default_trial and is_active limit 1;
  end if;

  if v_plan.id is not null then
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
    values (v_sub_id, v_shop_id, 'created', 'trial',
            jsonb_build_object('trial_days', v_trial_days, 'plan', v_plan.slug), new.id);
  end if;

  insert into public.audit_logs (actor_id, actor_role, barbershop_id, action, entity_type, entity_id, metadata)
  values (new.id, 'user', v_shop_id, 'account.created', 'barbershop', v_shop_id::text,
          jsonb_build_object('barbershop_name', v_shop_name, 'email', new.email, 'plan', v_plan.slug));

  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
