-- ============================================================================
-- 0006 · Row Level Security, privilégios e auditoria automática
-- ----------------------------------------------------------------------------
-- Regra de ouro: o isolamento entre barbearias acontece AQUI, no banco.
-- Mesmo que o frontend tenha um bug ou alguém chame a API diretamente,
-- um usuário só enxerga/alter linhas das barbearias das quais é membro.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Ativa RLS em todas as tabelas
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.barbershops           enable row level security;
alter table public.barbershop_members    enable row level security;
alter table public.professionals         enable row level security;
alter table public.services              enable row level security;
alter table public.professional_services enable row level security;
alter table public.working_hours         enable row level security;
alter table public.time_blocks           enable row level security;
alter table public.customers             enable row level security;
alter table public.appointments          enable row level security;
alter table public.payments              enable row level security;
alter table public.platform_settings     enable row level security;
alter table public.plans                 enable row level security;
alter table public.plan_features         enable row level security;
alter table public.coupons               enable row level security;
alter table public.subscriptions         enable row level security;
alter table public.subscription_events   enable row level security;
alter table public.coupon_redemptions    enable row level security;
alter table public.payment_gateways      enable row level security;
alter table public.payment_transactions  enable row level security;
alter table public.audit_logs            enable row level security;
alter table public.notifications         enable row level security;

-- ---------------------------------------------------------------------------
-- Privilégios (defesa em profundidade, além da RLS)
-- ---------------------------------------------------------------------------
-- Visitante anônimo: só enxerga a vitrine de planos. A página pública de
-- agendamento usará funções específicas (Fase 4), nunca as tabelas direto.
revoke all on all tables in schema public from anon;
grant select on public.plans, public.plan_features to anon;

-- Colunas sensíveis não podem ser alteradas pelo próprio usuário
revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url, last_seen_at) on public.profiles to authenticated;

revoke update on public.barbershops from authenticated;
grant update (
  name, slug, description, timezone, phone, whatsapp, email,
  address_street, address_number, address_complement, address_district,
  address_city, address_state, address_zip, social_links,
  logo_url, cover_url, branding, published_at,
  min_advance_minutes, max_advance_days, buffer_minutes, slot_interval_minutes,
  cancellation_min_hours, cancellation_policy, auto_confirm,
  onboarding_step, onboarding_completed_at
) on public.barbershops to authenticated;
-- status (suspensão) e is_demo só mudam pelo servidor/Super Admin

-- Registros de auditoria e histórico: ninguém altera ou apaga pela API
revoke insert, update, delete on public.audit_logs from authenticated;
revoke update, delete on public.subscription_events from authenticated;

-- Funções internas não ficam expostas como RPC
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.enforce_professional_limit() from public, anon, authenticated;
revoke execute on function public.generate_unique_slug(text) from public, anon, authenticated;
revoke execute on function public.barbershop_access_level(uuid) from public, anon;
revoke execute on function public.plan_limit(uuid, text) from public, anon;
grant execute on function public.barbershop_access_level(uuid) to authenticated, service_role;
grant execute on function public.plan_limit(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------------
-- o usuário logado é o "dono" deste profissional?
create or replace function public.is_own_professional(p_professional_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.professionals
    where id = p_professional_id and user_id = (select auth.uid())
  );
$$;

-- dois usuários compartilham alguma barbearia?
create or replace function public.shares_shop_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.barbershop_members me
    join public.barbershop_members other on other.barbershop_id = me.barbershop_id
    where me.user_id = (select auth.uid()) and me.is_active
      and other.user_id = p_user_id and other.is_active
  );
$$;

-- ===========================================================================
-- POLÍTICAS
-- ===========================================================================

-- profiles -------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_shop_with(id) or public.is_super_admin());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- barbershops ----------------------------------------------------------------
create policy barbershops_select on public.barbershops for select to authenticated
  using (public.is_shop_member(id) or public.is_super_admin());
create policy barbershops_update on public.barbershops for update to authenticated
  using (public.is_shop_manager(id) or public.is_super_admin())
  with check (public.is_shop_manager(id) or public.is_super_admin());
-- INSERT: apenas pelo cadastro (trigger). DELETE: nunca pela API.

-- barbershop_members ---------------------------------------------------------
-- Proprietário gerencia administradores e profissionais.
-- Administrador gerencia apenas profissionais. Ninguém cria outro "owner".
create policy members_select on public.barbershop_members for select to authenticated
  using (public.is_shop_member(barbershop_id) or public.is_super_admin());
create policy members_insert on public.barbershop_members for insert to authenticated
  with check (
    role <> 'owner' and (
      public.has_shop_role(barbershop_id, array['owner']::public.shop_role[])
      or (role = 'professional' and public.has_shop_role(barbershop_id, array['admin']::public.shop_role[]))
    )
  );
create policy members_update on public.barbershop_members for update to authenticated
  using (
    role <> 'owner' and (
      public.has_shop_role(barbershop_id, array['owner']::public.shop_role[])
      or (role = 'professional' and public.has_shop_role(barbershop_id, array['admin']::public.shop_role[]))
    )
  )
  with check (
    role <> 'owner' and (
      public.has_shop_role(barbershop_id, array['owner']::public.shop_role[])
      or (role = 'professional' and public.has_shop_role(barbershop_id, array['admin']::public.shop_role[]))
    )
  );
create policy members_delete on public.barbershop_members for delete to authenticated
  using (
    role <> 'owner' and (
      public.has_shop_role(barbershop_id, array['owner']::public.shop_role[])
      or (role = 'professional' and public.has_shop_role(barbershop_id, array['admin']::public.shop_role[]))
    )
  );

-- Tabelas de configuração da operação ----------------------------------------
-- Leitura: membros da barbearia (e Super Admin).
-- Escrita: proprietário/administrador, com assinatura que permita operar.
do $$
declare t text;
begin
  foreach t in array array['professionals', 'services', 'professional_services', 'working_hours'] loop
    execute format($f$
      create policy %1$s_select on public.%1$I for select to authenticated
        using (public.is_shop_member(barbershop_id) or public.is_super_admin());
      create policy %1$s_insert on public.%1$I for insert to authenticated
        with check (public.is_shop_manager(barbershop_id) and public.can_operate(barbershop_id));
      create policy %1$s_update on public.%1$I for update to authenticated
        using (public.is_shop_manager(barbershop_id) and public.can_operate(barbershop_id))
        with check (public.is_shop_manager(barbershop_id) and public.can_operate(barbershop_id));
      create policy %1$s_delete on public.%1$I for delete to authenticated
        using (public.is_shop_manager(barbershop_id) and public.can_operate(barbershop_id));
    $f$, t);
  end loop;
end $$;

-- time_blocks: gestor gerencia todos; profissional gerencia os próprios -------
create policy time_blocks_select on public.time_blocks for select to authenticated
  using (public.is_shop_member(barbershop_id) or public.is_super_admin());
create policy time_blocks_write on public.time_blocks for all to authenticated
  using (
    public.can_operate(barbershop_id) and (
      public.is_shop_manager(barbershop_id)
      or (professional_id is not null and public.is_own_professional(professional_id))
    )
  )
  with check (
    public.can_operate(barbershop_id) and (
      public.is_shop_manager(barbershop_id)
      or (professional_id is not null and public.is_own_professional(professional_id))
    )
  );

-- customers: qualquer membro atende e cadastra clientes ----------------------
create policy customers_select on public.customers for select to authenticated
  using (public.is_shop_member(barbershop_id) or public.is_super_admin());
create policy customers_insert on public.customers for insert to authenticated
  with check (public.is_shop_member(barbershop_id) and public.can_operate(barbershop_id));
create policy customers_update on public.customers for update to authenticated
  using (public.is_shop_member(barbershop_id) and public.can_operate(barbershop_id))
  with check (public.is_shop_member(barbershop_id) and public.can_operate(barbershop_id));
create policy customers_delete on public.customers for delete to authenticated
  using (public.is_shop_manager(barbershop_id) and public.can_operate(barbershop_id));

-- appointments ---------------------------------------------------------------
-- Gestor: todos os agendamentos da barbearia. Profissional: apenas os seus.
-- Não há DELETE: agendamentos são cancelados, preservando o histórico.
create policy appointments_select on public.appointments for select to authenticated
  using (public.is_shop_member(barbershop_id) or public.is_super_admin());
create policy appointments_insert on public.appointments for insert to authenticated
  with check (
    public.can_operate(barbershop_id) and (
      public.is_shop_manager(barbershop_id)
      or (public.is_shop_member(barbershop_id) and public.is_own_professional(professional_id))
    )
  );
create policy appointments_update on public.appointments for update to authenticated
  using (
    public.can_operate(barbershop_id) and (
      public.is_shop_manager(barbershop_id) or public.is_own_professional(professional_id)
    )
  )
  with check (
    public.can_operate(barbershop_id) and (
      public.is_shop_manager(barbershop_id) or public.is_own_professional(professional_id)
    )
  );

-- payments (financeiro): apenas proprietário/administrador --------------------
create policy payments_select on public.payments for select to authenticated
  using (public.is_shop_manager(barbershop_id) or public.is_super_admin());
create policy payments_insert on public.payments for insert to authenticated
  with check (public.is_shop_manager(barbershop_id) and public.can_operate(barbershop_id));
create policy payments_update on public.payments for update to authenticated
  using (public.is_shop_manager(barbershop_id) and public.can_operate(barbershop_id))
  with check (public.is_shop_manager(barbershop_id) and public.can_operate(barbershop_id));
create policy payments_delete on public.payments for delete to authenticated
  using (public.is_shop_manager(barbershop_id) and public.can_operate(barbershop_id));

-- platform_settings: só Super Admin -------------------------------------------
create policy platform_settings_admin on public.platform_settings for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- plans / plan_features: vitrine pública dos ativos; escrita só Super Admin ----
create policy plans_public_select on public.plans for select to anon, authenticated
  using (is_active or public.is_super_admin());
create policy plans_admin_write on public.plans for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy plan_features_public_select on public.plan_features for select to anon, authenticated
  using (exists (select 1 from public.plans p where p.id = plan_id and p.is_active) or public.is_super_admin());
create policy plan_features_admin_write on public.plan_features for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- coupons: só Super Admin (validação pública será por função no backend) ------
create policy coupons_admin on public.coupons for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- subscriptions: barbearia lê a própria; mudança só pelo Super Admin/servidor -
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (public.is_shop_manager(barbershop_id) or public.is_super_admin());
create policy subscriptions_admin_write on public.subscriptions for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy subscription_events_select on public.subscription_events for select to authenticated
  using (public.is_shop_manager(barbershop_id) or public.is_super_admin());
create policy subscription_events_admin_insert on public.subscription_events for insert to authenticated
  with check (public.is_super_admin());

create policy coupon_redemptions_select on public.coupon_redemptions for select to authenticated
  using (public.is_shop_manager(barbershop_id) or public.is_super_admin());

-- payment_gateways: só Super Admin (e mesmo assim sem segredos em texto) ------
create policy payment_gateways_admin on public.payment_gateways for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- payment_transactions: leitura; escrita só pelo servidor (webhooks) ---------
create policy payment_transactions_select on public.payment_transactions for select to authenticated
  using (public.is_shop_manager(barbershop_id) or public.is_super_admin());

-- audit_logs: Super Admin vê tudo; proprietário vê os da própria barbearia ----
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (
    public.is_super_admin()
    or (barbershop_id is not null and public.has_shop_role(barbershop_id, array['owner']::public.shop_role[]))
  );

-- notifications: destinatário lê e marca como lida -----------------------------
create policy notifications_select on public.notifications for select to authenticated
  using (
    user_id = (select auth.uid())
    or (user_id is null and barbershop_id is not null and public.is_shop_manager(barbershop_id))
  );
create policy notifications_mark_read on public.notifications for update to authenticated
  using (
    user_id = (select auth.uid())
    or (user_id is null and barbershop_id is not null and public.is_shop_manager(barbershop_id))
  )
  with check (
    user_id = (select auth.uid())
    or (user_id is null and barbershop_id is not null and public.is_shop_manager(barbershop_id))
  );
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ===========================================================================
-- AUDITORIA AUTOMÁTICA
-- Toda mudança em assinaturas, planos, cupons, gateways, configurações e no
-- status de barbearias gera log — inclusive se feita direto no banco.
-- Nenhuma ação administrativa acontece silenciosamente.
-- ===========================================================================
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity text := tg_argv[0];
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_changes jsonb := '{}'::jsonb;
  k text;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(v_new) loop
      if k not in ('updated_at') and (v_old -> k) is distinct from (v_new -> k) then
        -- nunca registrar ids de segredos
        if k like '%vault_id' then
          v_changes := v_changes || jsonb_build_object(k, jsonb_build_object('changed', true));
        else
          v_changes := v_changes || jsonb_build_object(k, jsonb_build_object('from', v_old -> k, 'to', v_new -> k));
        end if;
      end if;
    end loop;
    if v_changes = '{}'::jsonb then return new; end if;
  end if;

  insert into public.audit_logs (actor_id, actor_role, barbershop_id, action, entity_type, entity_id, metadata)
  values (
    (select auth.uid()),
    case when public.is_super_admin() then 'super_admin'
         when (select auth.uid()) is null then 'system'
         else 'user' end,
    -- (a barbearia pode já ter sido removida numa exclusão em cascata)
    (select b.id from public.barbershops b
      where b.id = case when v_entity = 'barbershop' then (v_row ->> 'id')::uuid
                        when v_row ? 'barbershop_id' then (v_row ->> 'barbershop_id')::uuid end),
    v_entity || '.' || lower(tg_op),
    v_entity,
    coalesce(v_row ->> 'id', 'singleton'),
    case tg_op when 'UPDATE' then jsonb_build_object('changes', v_changes)
               else jsonb_build_object('record', v_row - array['secret_key_vault_id', 'webhook_secret_vault_id']) end
  );
  return coalesce(new, old);
end;
$$;
revoke execute on function public.audit_row_change() from public, anon, authenticated;

create trigger audit_subscriptions after insert or update or delete on public.subscriptions
  for each row execute function public.audit_row_change('subscription');
create trigger audit_plans after insert or update or delete on public.plans
  for each row execute function public.audit_row_change('plan');
create trigger audit_coupons after insert or update or delete on public.coupons
  for each row execute function public.audit_row_change('coupon');
create trigger audit_payment_gateways after insert or update or delete on public.payment_gateways
  for each row execute function public.audit_row_change('payment_gateway');
create trigger audit_platform_settings after update on public.platform_settings
  for each row execute function public.audit_row_change('platform_settings');
create trigger audit_barbershop_status after update of status on public.barbershops
  for each row execute function public.audit_row_change('barbershop');
create trigger audit_members after insert or update or delete on public.barbershop_members
  for each row execute function public.audit_row_change('member');
