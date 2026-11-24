-- ============================================================================
-- Regras de assinatura e limites do plano
-- ============================================================================
\echo '— Assinatura x acesso'

create temp table sub_ids as
select (select id from public.barbershops where slug = 'barbearia-do-joao') as shop_a;
grant select on sub_ids to authenticated;

select tests.ok(public.barbershop_access_level((select shop_a from sub_ids)) = 'full', 'trial vigente = acesso total');

-- Trial vencido
update public.subscriptions set current_period_start = now() - interval '20 days', current_period_end = now() - interval '1 day'
  where barbershop_id = (select shop_a from sub_ids);
select tests.ok(public.barbershop_access_level((select shop_a from sub_ids)) = 'billing_only', 'trial vencido = só área de cobrança');

select tests.login_as('joao@teste.dev');
set role authenticated;
select tests.throws(
  format($$insert into public.services (barbershop_id, name, price_cents, duration_minutes) values (%L, 'Pigmentação', 6000, 60)$$, (select shop_a from sub_ids)),
  'sem assinatura válida não cria serviços');
select tests.ok((select count(*) >= 1 from public.services), 'mas os dados continuam preservados e legíveis');
reset role;

-- Ativa, vencida há 2 dias, tolerância de 5 dias
update public.subscriptions set status = 'past_due' where barbershop_id = (select shop_a from sub_ids);
update public.subscriptions set current_period_end = now() - interval '2 days' where barbershop_id = (select shop_a from sub_ids);
select tests.ok(public.barbershop_access_level((select shop_a from sub_ids)) = 'grace', 'atrasada dentro da tolerância = opera com aviso');

update public.platform_settings set grace_period_days = 1;
select tests.ok(public.barbershop_access_level((select shop_a from sub_ids)) = 'billing_only', 'tolerância configurável pelo Super Admin');
update public.platform_settings set grace_period_days = 5;

-- Suspensa
update public.subscriptions set status = 'suspended' where barbershop_id = (select shop_a from sub_ids);
select tests.ok(public.barbershop_access_level((select shop_a from sub_ids)) = 'blocked', 'suspensa = acesso operacional bloqueado');
select tests.ok((select count(*) >= 1 from public.customers where barbershop_id = (select shop_a from sub_ids)), 'dados preservados na suspensão');

-- Reativa no plano Essencial (limite 1 profissional; Pedro já está ativo)
update public.subscriptions set status = 'active', current_period_end = now() + interval '30 days',
  plan_id = '11111111-0000-4000-8000-000000000001'
  where barbershop_id = (select shop_a from sub_ids);
select tests.ok(public.barbershop_access_level((select shop_a from sub_ids)) = 'full', 'reativada = acesso total');

\echo '— Limites do plano'
select tests.login_as('joao@teste.dev');
set role authenticated;
select tests.throws(
  format($$insert into public.professionals (barbershop_id, name) values (%L, 'Segundo barbeiro')$$, (select shop_a from sub_ids)),
  'plano Essencial bloqueia o 2º profissional ativo');
insert into public.professionals (barbershop_id, name, is_active) select shop_a, 'Barbeiro inativo', false from sub_ids;
select tests.ok(true, 'profissional inativo não conta no limite');
select tests.throws(
  $$update public.professionals set is_active = true where name = 'Barbeiro inativo'$$,
  'reativar profissional também respeita o limite');
reset role;

update public.subscriptions set plan_id = '11111111-0000-4000-8000-000000000002'
  where barbershop_id = (select shop_a from sub_ids);
select tests.login_as('joao@teste.dev');
set role authenticated;
update public.professionals set is_active = true where name = 'Barbeiro inativo';
select tests.ok(true, 'após upgrade para Profissional, o 2º profissional é liberado');
reset role;
select tests.logout();

\echo ''
\echo '✅ Testes de assinatura passaram.'
