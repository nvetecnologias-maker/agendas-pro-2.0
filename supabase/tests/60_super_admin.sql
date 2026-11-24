-- ============================================================================
-- Super Admin: visão geral, barbearias, ações auditadas e gateways
-- ============================================================================
\echo '— Super Admin'
reset role;
select from tests.logout();

insert into auth.users (email, raw_user_meta_data) values
  ('admin@teste.dev', '{"full_name":"Admin Plataforma"}'),
  ('cliente-sa@teste.dev', '{"full_name":"Dono Alvo","phone":"11966665555","barbershop_name":"Barbearia Alvo"}');
update public.profiles set platform_role = 'super_admin' where email = 'admin@teste.dev';

create temp table sa as
select (select id from public.barbershops where name = 'Barbearia Alvo') as shop,
       (select id from public.plans where slug = 'premium') as premium;
grant select on sa to authenticated, anon;

\echo '— Barbeiro comum não acessa nada do Super Admin'
select tests.login_as('cliente-sa@teste.dev');
set role authenticated;
select tests.throws('select public.admin_overview()', 'visão geral bloqueada');
select tests.throws('select * from public.admin_list_barbershops()', 'lista de barbearias bloqueada');
select tests.throws(format('select public.admin_grant_days(%L, 30)', (select shop from sa)), 'não concede dias a si mesmo');
select tests.throws(format('select public.admin_change_plan(%L, %L)', (select shop from sa), (select premium from sa)), 'não troca o próprio plano');
select tests.throws(format($$select public.admin_set_shop_status(%L, 'suspended')$$, (select shop from sa)), 'não muda status de barbearia');
select tests.throws($$select public.admin_save_gateway('asaas', 'sandbox', null, array['pix'], false, 'sk_x')$$, 'não configura gateway');
select tests.ok((select count(*) = 0 from public.payment_gateways_admin), 'não vê gateways');
select tests.throws('select public.get_gateway_secret(gen_random_uuid(), ''secret'')', 'não lê segredo de gateway');
select tests.ok((select count(*) = 0 from public.coupons), 'não vê cupons');

\echo '— Super Admin'
reset role;
select tests.login_as('admin@teste.dev');
set role authenticated;
select tests.ok((select (public.admin_overview() -> 'shops' ->> 'total')::int >= 1), 'visão geral conta barbearias');
select tests.ok((select jsonb_array_length(public.admin_overview() -> 'revenue_by_month') = 12), 'receita dos últimos 12 meses');
select tests.ok((select jsonb_array_length(public.admin_overview() -> 'signups_by_day') = 30), 'cadastros dos últimos 30 dias');
select tests.ok(
  (select owner_email = 'cliente-sa@teste.dev' and sub_status = 'trial' and total_count = 1
     from public.admin_list_barbershops('alvo')),
  'busca por nome traz dono, plano e status');
select tests.ok((select count(*) = 1 from public.admin_list_barbershops('966665555')), 'busca por telefone do dono');
select tests.ok((select coalesce(bool_and(status = 'suspended') and not bool_or(name = 'Barbearia Alvo'), true) from public.admin_list_barbershops(null, 'suspended')),
  'filtro por status da barbearia');
select tests.ok((public.admin_barbershop_detail((select shop from sa)) -> 'subscription' ->> 'plan_slug') = 'profissional',
  'detalhe mostra a assinatura atual');

-- conceder dias
create temp table before_end as select current_period_end as e from public.subscriptions where barbershop_id = (select shop from sa);
grant select on before_end to authenticated;
select public.admin_grant_days((select shop from sa), 10, 'Cortesia');
select tests.ok(
  (select s.current_period_end = b.e + interval '10 days' from public.subscriptions s, before_end b where s.barbershop_id = (select shop from sa)),
  'concede 10 dias somando ao vencimento');
select tests.throws(format('select public.admin_grant_days(%L, 0)', (select shop from sa)), 'zero dias é recusado');

-- trocar plano
select public.admin_change_plan((select shop from sa), (select premium from sa), 'active', 30, 'Upgrade negociado');
select tests.ok(
  (select s.status = 'active' and s.plan_id = (select premium from sa) and s.amount_cents = p.price_cents
     from public.subscriptions s join public.plans p on p.id = s.plan_id where s.barbershop_id = (select shop from sa)),
  'troca para Premium ativa com o preço do plano');
select tests.ok(public.plan_limit((select shop from sa), 'professionals.max') is distinct from 1, 'limites passam a seguir o novo plano');

-- suspender assinatura bloqueia a operação; reativar libera
select public.admin_set_subscription_status((select shop from sa), 'suspended', 'Teste');
select tests.ok(public.barbershop_access_level((select shop from sa)) = 'blocked', 'assinatura suspensa bloqueia o painel');
select public.admin_set_subscription_status((select shop from sa), 'active');
select tests.ok(public.barbershop_access_level((select shop from sa)) = 'full', 'reativada volta ao acesso total');

-- suspender a barbearia
select public.admin_set_shop_status((select shop from sa), 'suspended', 'Fraude');
select tests.ok((select status = 'suspended' from public.barbershops where id = (select shop from sa)), 'barbearia suspensa');
select public.admin_set_shop_status((select shop from sa), 'active');

select tests.ok(
  (select array_agg(event_type order by created_at) @> array['days_granted', 'plan_changed', 'suspended', 'reactivated']
     from public.subscription_events where barbershop_id = (select shop from sa)),
  'histórico da assinatura registra cada ação');
select tests.ok(
  (select count(*) >= 2 from public.audit_logs where barbershop_id = (select shop from sa)
     and action in ('barbershop.suspended', 'barbershop.reactivated') and actor_role = 'super_admin'),
  'auditoria registra quem suspendeu e reativou');

\echo '— Gateways'
select tests.throws($$select public.admin_save_gateway('asaas', 'sandbox', 'pk', array['pix'], true)$$,
  'não ativa gateway sem chave secreta');
select public.admin_save_gateway('asaas', 'sandbox', 'pk_test', array['pix', 'credit_card'], true, 'sk_test_123', 'whsec_1');
select tests.ok((select has_secret and has_webhook_secret and is_active from public.payment_gateways_admin where provider = 'asaas'),
  'gateway salvo com segredos no Vault e ativo');
select tests.throws('select secret_key_vault_id from public.payment_gateways', 'id do segredo não é legível pelo navegador');
select public.admin_save_gateway('mercado_pago', 'sandbox', null, array['pix'], true, 'mp_secret');
select tests.ok((select count(*) = 1 from public.payment_gateways_admin where is_active), 'só um gateway ativo por vez');
select public.admin_save_gateway('asaas', 'sandbox', 'pk_test', array['pix'], false);
select tests.ok((select has_secret from public.payment_gateways_admin where provider = 'asaas'), 'salvar sem chave mantém a chave atual');
select tests.throws($$select public.admin_save_gateway('asaas', 'sandbox', null, array['bitcoin'], false)$$, 'forma de pagamento inválida');

reset role;
create temp table secret_read as select null::text as v;
grant all on secret_read to service_role;
set role service_role;
update secret_read set v = (select public.get_gateway_secret(id, 'secret') from public.payment_gateways where provider = 'asaas');
reset role;
select tests.ok((select v = 'sk_test_123' from secret_read), 'servidor (service_role) lê o segredo para as integrações');
select tests.ok(
  (select count(*) = 0 from public.audit_logs where metadata::text like '%sk_test_123%'),
  'segredo nunca aparece na auditoria');
select from tests.logout();
\echo '✅ Testes do Super Admin passaram.'
