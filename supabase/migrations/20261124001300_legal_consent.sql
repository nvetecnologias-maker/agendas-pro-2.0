-- ============================================================================
-- 0013 · Aceite dos documentos legais (Termos de Uso e Política de Privacidade)
-- ----------------------------------------------------------------------------
-- - legal_acceptances: registro de qual versão de cada documento a pessoa
--   aceitou, quando e em qual tela (cadastro ou checkout).
-- - handle_new_user: o cadastro de barbearia passa a EXIGIR o aceite (metadados
--   terms_version e privacy_version enviados pelo formulário, com a caixa de
--   confirmação desmarcada por padrão). A data registrada é a do servidor.
-- - Novos endereços reservados (rotas institucionais).
-- - Rótulo de destaque de plano sem alegação de popularidade.
-- ============================================================================

create type public.legal_document as enum ('terms_of_use', 'privacy_policy');

create table public.legal_acceptances (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  document      public.legal_document not null,
  version       text not null check (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}(\.[0-9]+)?$'),
  accepted_at   timestamptz not null default now(),
  source        text not null default 'signup' check (source in ('signup', 'checkout', 'update')),
  unique (user_id, document, version)
);
create index legal_acceptances_user_idx on public.legal_acceptances (user_id, document, accepted_at desc);

alter table public.legal_acceptances enable row level security;

-- a pessoa vê os próprios aceites; o Super Admin vê todos (auditoria)
create policy legal_acceptances_select_own on public.legal_acceptances
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_super_admin());

-- Aceite posterior (ex.: nova versão dos documentos ou no checkout). Só a
-- própria pessoa, só para si, com a data do servidor.
create or replace function public.accept_legal_documents(
  p_terms_version text,
  p_privacy_version text,
  p_source text default 'update'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'AP_FORBIDDEN' using errcode = '42501';
  end if;
  if p_source not in ('checkout', 'update') then
    raise exception 'AP_INVALID' using errcode = '22023';
  end if;
  insert into public.legal_acceptances (user_id, document, version, source)
  values (v_uid, 'terms_of_use', p_terms_version, p_source),
         (v_uid, 'privacy_policy', p_privacy_version, p_source)
  on conflict (user_id, document, version) do nothing;
end;
$$;
revoke execute on function public.accept_legal_documents(text, text, text) from public, anon;
grant execute on function public.accept_legal_documents(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Cadastro: igual à 0008 + aceite obrigatório para quem cria barbearia
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
  v_terms_version text := nullif(trim(v_meta ->> 'terms_version'), '');
  v_privacy_version text := nullif(trim(v_meta ->> 'privacy_version'), '');
  v_shop_id uuid;
  v_plan public.plans%rowtype;
  v_trial_days integer;
  v_sub_id uuid;
begin
  -- quem cria uma barbearia precisa ter aceitado os dois documentos
  if v_shop_name is not null and (v_terms_version is null or v_privacy_version is null) then
    raise exception 'AP_TERMS_REQUIRED' using errcode = '23514';
  end if;

  insert into public.profiles (id, full_name, email, phone)
  values (new.id, coalesce(v_full_name, split_part(new.email, '@', 1)), new.email, v_phone);

  if v_terms_version is not null and v_privacy_version is not null then
    insert into public.legal_acceptances (user_id, document, version, source)
    values (new.id, 'terms_of_use', v_terms_version, 'signup'),
           (new.id, 'privacy_policy', v_privacy_version, 'signup');
  end if;

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
          jsonb_build_object('barbershop_name', v_shop_name, 'email', new.email, 'plan', v_plan.slug,
                             'terms_version', v_terms_version, 'privacy_version', v_privacy_version));

  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Endereços reservados (mesma lista de src/lib/slug.ts)
-- ---------------------------------------------------------------------------
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
    'agendar','agenda','b','checkout','assinatura','webhooks','login','logout',
    'termos-de-uso','politica-de-privacidade','manifest','brand','icon','apple-icon'
  ]);
$$;

-- ---------------------------------------------------------------------------
-- Sem selos de popularidade sem comprovação
-- ---------------------------------------------------------------------------
update public.plans set highlight_label = 'Recomendado'
where highlight_label ilike any (array['%mais escolhido%', '%mais popular%', '%mais vendido%']);
