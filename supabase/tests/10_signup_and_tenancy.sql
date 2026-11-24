-- ============================================================================
-- Cadastro, isolamento entre barbearias, permissões e conflitos de horário
-- ============================================================================
\echo '— Cadastro do barbeiro'

-- Dois barbeiros se cadastram (como o Supabase Auth faria)
insert into auth.users (email, raw_user_meta_data) values
  ('joao@teste.dev',  '{"full_name":"João Silva","phone":"(11) 98888-7777","barbershop_name":"Barbearia do João","terms_version":"2026-11-24","privacy_version":"2026-11-24"}'),
  ('maria@teste.dev', '{"full_name":"Maria Souza","phone":"11977776666","barbershop_name":"Barbearia do João","terms_version":"2026-11-24","privacy_version":"2026-11-24"}'),
  ('pedro@teste.dev', '{"full_name":"Pedro Profissional"}'),
  ('root@teste.dev',  '{"full_name":"Dono da Plataforma"}');

select tests.ok((select count(*) = 4 from public.profiles), 'perfil criado para cada usuário');
select tests.ok((select count(*) = 2 from public.barbershops), 'barbearia criada apenas para quem informou o nome');
select tests.ok(
  (select array_agg(slug::text order by slug) = array['barbearia-do-joao', 'barbearia-do-joao-2'] from public.barbershops),
  'slugs únicos gerados (barbearia-do-joao / barbearia-do-joao-2)');
select tests.ok(
  (select count(*) = 2 from public.barbershop_members where role = 'owner'),
  'cada cadastrante virou proprietário da própria barbearia');
select tests.ok(
  (select bool_and(s.status = 'trial' and p.slug = 'profissional' and s.current_period_end > now() + interval '13 days')
     from public.subscriptions s join public.plans p on p.id = s.plan_id),
  'período de teste de 14 dias iniciado no plano padrão');
select tests.ok((select phone = '11988887777' from public.profiles where email = 'joao@teste.dev'), 'telefone normalizado');
select tests.ok(
  (select count(*) = 2 from public.audit_logs where action = 'account.created'),
  'criação de conta registrada na auditoria');

-- Fixtures (como postgres, ignorando RLS)
update public.profiles set platform_role = 'super_admin' where email = 'root@teste.dev';

create temp table ids as
select
  (select id from public.barbershops where slug = 'barbearia-do-joao')   as shop_a,
  (select id from public.barbershops where slug = 'barbearia-do-joao-2') as shop_b,
  (select id from auth.users where email = 'pedro@teste.dev')            as pedro;
grant select on ids to authenticated, anon;

-- Pedro é profissional na barbearia A
insert into public.barbershop_members (barbershop_id, user_id, role) select shop_a, pedro, 'professional' from ids;

insert into public.professionals (id, barbershop_id, name, user_id)
select 'aaaaaaaa-0000-4000-8000-000000000001', shop_a, 'Pedro', pedro from ids;
insert into public.professionals (id, barbershop_id, name)
select 'bbbbbbbb-0000-4000-8000-000000000001', shop_b, 'Barbeiro B' from ids;
insert into public.services (id, barbershop_id, name, price_cents, duration_minutes)
select 'aaaaaaaa-0000-4000-8000-0000000000a1', shop_a, 'Corte masculino', 4500, 30 from ids;
insert into public.services (id, barbershop_id, name, price_cents, duration_minutes)
select 'bbbbbbbb-0000-4000-8000-0000000000b1', shop_b, 'Barba', 3000, 20 from ids;
insert into public.customers (id, barbershop_id, name, phone)
select 'aaaaaaaa-0000-4000-8000-0000000000c1', shop_a, 'Cliente A', '11911112222' from ids;
insert into public.customers (id, barbershop_id, name, phone)
select 'bbbbbbbb-0000-4000-8000-0000000000c1', shop_b, 'Cliente B', '11933334444' from ids;
insert into public.payments (barbershop_id, amount_cents, method)
select shop_a, 4500, 'pix' from ids;

-- Agenda da A: profissional realiza o corte; barbearia abre 09h–19h todos os dias
insert into public.professional_services (barbershop_id, professional_id, service_id)
select shop_a, 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-0000000000a1' from ids;
insert into public.working_hours (barbershop_id, weekday, starts_at, ends_at)
select shop_a, d, '09:00', '19:00' from ids, generate_series(0, 6) d;

-- ============================================================================
\echo '— Isolamento entre barbearias (João = dono da A)'
select tests.login_as('joao@teste.dev');
set role authenticated;

select tests.ok((select count(*) = 1 from public.barbershops), 'enxerga somente a própria barbearia');
select tests.ok((select count(*) = 1 from public.customers), 'enxerga somente os próprios clientes');
select tests.ok((select count(*) = 1 from public.services), 'enxerga somente os próprios serviços');
select tests.ok((select count(*) = 1 from public.professionals), 'enxerga somente os próprios profissionais');
select tests.ok((select count(*) = 1 from public.subscriptions), 'enxerga somente a própria assinatura');
select tests.ok(not exists (select 1 from public.customers where barbershop_id = (select shop_b from ids)),
  'clientes da barbearia B são invisíveis');

select tests.throws(
  format($$insert into public.services (barbershop_id, name, price_cents, duration_minutes) values (%L, 'Invasão', 1, 10)$$, (select shop_b from ids)),
  'não consegue criar serviço na barbearia B');
select tests.ok(
  tests.affected(format($$update public.barbershops set name = 'Hackeada' where id = %L$$, (select shop_b from ids))) = 0,
  'não consegue alterar a barbearia B');
select tests.ok(
  tests.affected(format($$delete from public.customers where barbershop_id = %L$$, (select shop_b from ids))) = 0,
  'não consegue apagar clientes da barbearia B');

-- Chave composta: não dá para usar profissional da B num agendamento da A
select tests.throws(
  format($$insert into public.appointments (barbershop_id, professional_id, service_id, customer_id, starts_at, ends_at, duration_minutes, price_cents)
           values (%L, 'bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-0000000000a1', 'aaaaaaaa-0000-4000-8000-0000000000c1',
                   now() + interval '1 day', now() + interval '1 day 30 min', 30, 4500)$$, (select shop_a from ids)),
  'agendamento da A não aceita profissional da B (FK composta)');

\echo '— Escalada de privilégio'
select tests.throws($$update public.profiles set platform_role = 'super_admin' where id = auth.uid()$$,
  'usuário não consegue se promover a Super Admin');
select tests.throws(
  format($$update public.barbershops set status = 'active', is_demo = true where id = %L$$, (select shop_a from ids)),
  'dono não altera status/is_demo da própria barbearia (só a plataforma)');
select tests.throws(
  format($$update public.subscriptions set current_period_end = now() + interval '10 years' where barbershop_id = %L$$, (select shop_a from ids)),
  'dono não estende a própria assinatura')
  where false;  -- (UPDATE bloqueado por RLS afeta 0 linhas; verificado abaixo)
select tests.ok(
  tests.affected(format($$update public.subscriptions set current_period_end = now() + interval '10 years' where barbershop_id = %L$$, (select shop_a from ids))) = 0,
  'dono não estende a própria assinatura');
select tests.throws($$insert into public.audit_logs (action) values ('fake')$$, 'ninguém escreve direto no log de auditoria');
select tests.throws($$select public.log_audit('fake')$$, 'log_audit não é exposto como RPC');

-- Atualizações permitidas
select tests.ok(
  tests.affected(format($$update public.barbershops set description = 'Cortes clássicos' where id = %L$$, (select shop_a from ids))) = 1,
  'dono atualiza dados da própria barbearia');

\echo '— Conflito de horários (reserva simultânea)'
insert into public.appointments (id, barbershop_id, professional_id, service_id, customer_id, starts_at, ends_at, duration_minutes, price_cents)
select 'aaaaaaaa-0000-4000-8000-0000000000e1', shop_a, 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-0000000000a1',
       'aaaaaaaa-0000-4000-8000-0000000000c1', '2030-01-10 13:00Z', '2030-01-10 13:30Z', 30, 4500 from ids;
select tests.ok(true, 'primeiro agendamento 13:00–13:30 criado');

select tests.throws(
  format($$insert into public.appointments (barbershop_id, professional_id, service_id, customer_id, starts_at, ends_at, duration_minutes, price_cents)
           values (%L, 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-0000000000a1', 'aaaaaaaa-0000-4000-8000-0000000000c1',
                   '2030-01-10 13:15Z', '2030-01-10 13:45Z', 30, 4500)$$, (select shop_a from ids)),
  'horário sobreposto (13:15) é recusado pelo banco');

insert into public.appointments (barbershop_id, professional_id, service_id, customer_id, starts_at, ends_at, duration_minutes, price_cents)
select shop_a, 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-0000000000a1',
       'aaaaaaaa-0000-4000-8000-0000000000c1', '2030-01-10 13:30Z', '2030-01-10 14:00Z', 30, 4500 from ids;
select tests.ok(true, 'horário encostado (13:30) é permitido');

update public.appointments set status = 'cancelled' where id = 'aaaaaaaa-0000-4000-8000-0000000000e1';
insert into public.appointments (barbershop_id, professional_id, service_id, customer_id, starts_at, ends_at, duration_minutes, price_cents)
select shop_a, 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-0000000000a1',
       'aaaaaaaa-0000-4000-8000-0000000000c1', '2030-01-10 13:00Z', '2030-01-10 13:30Z', 30, 4500 from ids;
select tests.ok(true, 'horário cancelado volta a ficar disponível');

select tests.throws($$delete from public.appointments$$, 'agendamentos não são apagados (só cancelados)')
  where false;
select tests.ok(tests.affected($$delete from public.appointments$$) = 0, 'agendamentos não são apagados, só cancelados');

\echo '— Papel profissional (Pedro na barbearia A)'
reset role;
select tests.login_as('pedro@teste.dev');
set role authenticated;
select tests.ok((select count(*) = 1 from public.barbershops), 'profissional enxerga a barbearia onde trabalha');
select tests.ok((select count(*) = 0 from public.payments), 'profissional NÃO enxerga o financeiro');
select tests.throws(
  format($$insert into public.services (barbershop_id, name, price_cents, duration_minutes) values (%L, 'Novo', 1000, 30)$$, (select shop_a from ids)),
  'profissional não cria serviços');
select tests.ok(
  tests.affected($$update public.appointments set notes = 'cliente pediu degradê' where professional_id = 'aaaaaaaa-0000-4000-8000-000000000001' and status <> 'cancelled'$$) = 2,
  'profissional atualiza os próprios agendamentos');
select tests.throws(
  format($$insert into public.barbershop_members (barbershop_id, user_id, role) values (%L, auth.uid(), 'owner')$$, (select shop_a from ids)),
  'profissional não se torna proprietário');

\echo '— Visitante anônimo'
reset role;
select tests.logout();
set role anon;
select tests.ok((select count(*) = 3 from public.plans), 'vê a vitrine de planos ativos');
select tests.throws($$select * from public.barbershops$$, 'não lê tabela de barbearias');
select tests.throws($$select * from public.customers$$, 'não lê clientes');
select tests.throws($$select * from public.appointments$$, 'não lê agendamentos');

\echo '— Super Admin'
reset role;
select tests.login_as('root@teste.dev');
set role authenticated;
select tests.ok((select count(*) = 2 from public.barbershops), 'vê todas as barbearias');
select tests.ok(public.is_super_admin(), 'papel de Super Admin validado no banco');
update public.subscriptions set current_period_end = current_period_end + interval '7 days'
  where barbershop_id = (select shop_b from ids);
select tests.ok(
  (select count(*) = 1 from public.audit_logs where action = 'subscription.update' and actor_role = 'super_admin'
     and metadata -> 'changes' ? 'current_period_end'),
  'conceder dias gera log de auditoria automaticamente com o que mudou');

reset role;
select tests.logout();
