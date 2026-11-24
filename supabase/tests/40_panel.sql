-- ============================================================================
-- Painel: disponibilidade, validação de agendamentos, histórico e indicadores
-- ============================================================================
\echo '— Painel do barbeiro'
reset role;
select from tests.logout();

insert into auth.users (email, raw_user_meta_data) values
  ('painel@teste.dev', '{"full_name":"Dono Painel","phone":"11944443333","barbershop_name":"Corte Fino"}');

create temp table p as
select (select id from public.barbershops where name = 'Corte Fino') as shop;
grant select on p to authenticated, anon;

-- Fixtures: 2 profissionais, 2 serviços, expediente seg–sáb 09–12 e 13–19 (almoço), Ana trabalha só 14–18
insert into public.professionals (id, barbershop_id, name)
select 'cccccccc-0000-4000-8000-000000000001'::uuid, shop, 'Lucas' from p union all
select 'cccccccc-0000-4000-8000-000000000002'::uuid, shop, 'Ana' from p;
insert into public.services (id, barbershop_id, name, price_cents, duration_minutes)
select 'cccccccc-0000-4000-8000-0000000000a1'::uuid, shop, 'Corte', 5000, 30 from p union all
select 'cccccccc-0000-4000-8000-0000000000a2'::uuid, shop, 'Barba', 3500, 60 from p;
insert into public.professional_services (barbershop_id, professional_id, service_id)
select shop, 'cccccccc-0000-4000-8000-000000000001'::uuid, 'cccccccc-0000-4000-8000-0000000000a1'::uuid from p union all
select shop, 'cccccccc-0000-4000-8000-000000000001'::uuid, 'cccccccc-0000-4000-8000-0000000000a2'::uuid from p union all
select shop, 'cccccccc-0000-4000-8000-000000000002'::uuid, 'cccccccc-0000-4000-8000-0000000000a1'::uuid from p;
insert into public.working_hours (barbershop_id, weekday, starts_at, ends_at)
select shop, d, t.s::time, t.e::time from p, generate_series(1, 6) d, (values ('09:00', '12:00'), ('13:00', '19:00')) t(s, e);
insert into public.working_hours (barbershop_id, professional_id, weekday, starts_at, ends_at)
select shop, 'cccccccc-0000-4000-8000-000000000002'::uuid, d, '14:00', '18:00' from p, generate_series(1, 6) d;
insert into public.customers (id, barbershop_id, name, phone)
select 'cccccccc-0000-4000-8000-0000000000c1'::uuid, shop, 'Cliente Painel', '11922221111' from p;
update public.barbershops set slot_interval_minutes = 30 where id = (select shop from p);

-- 2030-03-04 é segunda-feira; fuso America/Sao_Paulo (UTC-3)
select tests.login_as('painel@teste.dev');
set role authenticated;

select tests.ok(
  (select count(*) = 18 from public.get_available_slots((select shop from p), 'cccccccc-0000-4000-8000-0000000000a1'::uuid, '2030-03-04',
     'cccccccc-0000-4000-8000-000000000001'::uuid)),
  'Lucas tem 18 horários de corte (09–12 e 13–19, a cada 30 min) — almoço respeitado');
select tests.ok(
  (select min(starts_at) = '2030-03-04 17:00Z' and count(*) = 8
     from public.get_available_slots((select shop from p), 'cccccccc-0000-4000-8000-0000000000a1'::uuid, '2030-03-04',
       'cccccccc-0000-4000-8000-000000000002'::uuid)),
  'Ana só aparece no expediente dela (14–18 local) dentro do da barbearia');
select tests.ok(
  (select count(*) = 0 from public.get_available_slots((select shop from p), 'cccccccc-0000-4000-8000-0000000000a1'::uuid, '2030-03-03')),
  'domingo (barbearia fechada) não tem horários');
select tests.ok(
  (select count(distinct professional_id) = 1 from public.get_available_slots((select shop from p), 'cccccccc-0000-4000-8000-0000000000a2'::uuid, '2030-03-04')),
  'barba só lista quem realiza o serviço');

-- agendamento manual: preço e duração vêm do serviço
insert into public.appointments (id, barbershop_id, professional_id, service_id, customer_id, starts_at)
select 'cccccccc-0000-4000-8000-0000000000e1'::uuid, shop, 'cccccccc-0000-4000-8000-000000000001'::uuid,
       'cccccccc-0000-4000-8000-0000000000a2'::uuid, 'cccccccc-0000-4000-8000-0000000000c1'::uuid, '2030-03-04 13:00Z' from p;
select tests.ok(
  (select price_cents = 3500 and duration_minutes = 60 and ends_at = '2030-03-04 14:00Z' from public.appointments
     where id = 'cccccccc-0000-4000-8000-0000000000e1'::uuid),
  'preço e duração congelados a partir do serviço; término calculado no banco');
select tests.ok(
  (select count(*) = 16 from public.get_available_slots((select shop from p), 'cccccccc-0000-4000-8000-0000000000a1'::uuid, '2030-03-04',
     'cccccccc-0000-4000-8000-000000000001'::uuid)),
  'horários ocupados somem da lista');

select tests.throws(
  format($$insert into public.appointments (barbershop_id, professional_id, service_id, customer_id, starts_at)
           values (%L, 'cccccccc-0000-4000-8000-000000000001'::uuid, 'cccccccc-0000-4000-8000-0000000000a1'::uuid,
                   'cccccccc-0000-4000-8000-0000000000c1'::uuid, '2030-03-04 15:10Z')$$, (select shop from p)),
  'almoço (12:10 local) é recusado: AP_OUTSIDE_HOURS');
select tests.throws(
  format($$insert into public.appointments (barbershop_id, professional_id, service_id, customer_id, starts_at)
           values (%L, 'cccccccc-0000-4000-8000-000000000001'::uuid, 'cccccccc-0000-4000-8000-0000000000a1'::uuid,
                   'cccccccc-0000-4000-8000-0000000000c1'::uuid, '2030-03-04 21:45Z')$$, (select shop from p)),
  'atendimento que passa do fechamento é recusado');
select tests.throws(
  format($$insert into public.appointments (barbershop_id, professional_id, service_id, customer_id, starts_at)
           values (%L, 'cccccccc-0000-4000-8000-000000000002'::uuid, 'cccccccc-0000-4000-8000-0000000000a2'::uuid,
                   'cccccccc-0000-4000-8000-0000000000c1'::uuid, '2030-03-04 17:00Z')$$, (select shop from p)),
  'profissional que não faz o serviço é recusado: AP_SERVICE_NOT_OFFERED');

-- bloqueio e folga
insert into public.time_blocks (barbershop_id, professional_id, kind, starts_at, ends_at, reason)
select shop, 'cccccccc-0000-4000-8000-000000000001'::uuid, 'block', '2030-03-04 18:00Z', '2030-03-04 19:00Z', 'Médico' from p;
select tests.throws(
  format($$insert into public.appointments (barbershop_id, professional_id, service_id, customer_id, starts_at)
           values (%L, 'cccccccc-0000-4000-8000-000000000001'::uuid, 'cccccccc-0000-4000-8000-0000000000a1'::uuid,
                   'cccccccc-0000-4000-8000-0000000000c1'::uuid, '2030-03-04 18:30Z')$$, (select shop from p)),
  'horário bloqueado é recusado: AP_BLOCKED');
insert into public.time_blocks (barbershop_id, kind, starts_at, ends_at, reason)
select shop, 'holiday', '2030-03-05 03:00Z', '2030-03-06 03:00Z', 'Feriado' from p;
select tests.ok(
  (select count(*) = 0 from public.get_available_slots((select shop from p), 'cccccccc-0000-4000-8000-0000000000a1'::uuid, '2030-03-05')),
  'feriado da barbearia zera os horários do dia');

-- intervalo entre atendimentos
update public.barbershops set buffer_minutes = 15 where id = (select shop from p);
select tests.throws(
  format($$insert into public.appointments (barbershop_id, professional_id, service_id, customer_id, starts_at)
           values (%L, 'cccccccc-0000-4000-8000-000000000001'::uuid, 'cccccccc-0000-4000-8000-0000000000a1'::uuid,
                   'cccccccc-0000-4000-8000-0000000000c1'::uuid, '2030-03-04 14:00Z')$$, (select shop from p)),
  'respeita o tempo entre atendimentos (15 min)');
update public.barbershops set buffer_minutes = 0 where id = (select shop from p);

-- remarcar e mudar status geram histórico
update public.appointments set starts_at = '2030-03-04 16:00Z' where id = 'cccccccc-0000-4000-8000-0000000000e1'::uuid;
update public.appointments set status = 'confirmed' where id = 'cccccccc-0000-4000-8000-0000000000e1'::uuid;
update public.appointments set status = 'completed' where id = 'cccccccc-0000-4000-8000-0000000000e1'::uuid;
select tests.ok(
  (select array_agg(kind order by id) = array['created', 'rescheduled', 'status_changed', 'status_changed']
     from public.appointment_events where appointment_id = 'cccccccc-0000-4000-8000-0000000000e1'::uuid),
  'histórico registra criação, remarcação e mudanças de status');
select tests.throws($$insert into public.appointment_events (barbershop_id, appointment_id, kind) values (gen_random_uuid(), gen_random_uuid(), 'created')$$,
  'histórico não pode ser forjado pela API');

-- receita: agendamento concluído NÃO vira receita sozinho
select tests.ok(
  (select (public.finance_overview((select shop from p), '2030-03-01', '2030-03-31') -> 'period' ->> 'received_cents')::int = 0),
  'concluído sem pagamento não conta como recebido');
select tests.ok(
  (select (public.finance_overview((select shop from p), '2030-03-01', '2030-03-31') -> 'expected' ->> 'open_cents')::int = 3500),
  'concluído sem pagamento aparece como valor em aberto');
insert into public.payments (barbershop_id, appointment_id, service_id, professional_id, customer_id, amount_cents, method, paid_at)
select shop, 'cccccccc-0000-4000-8000-0000000000e1'::uuid, 'cccccccc-0000-4000-8000-0000000000a2'::uuid, 'cccccccc-0000-4000-8000-000000000001'::uuid,
       'cccccccc-0000-4000-8000-0000000000c1'::uuid, 3500, 'pix', '2030-03-04 17:05Z' from p;
select tests.ok(
  (select (f -> 'period' ->> 'received_cents')::int = 3500 and (f -> 'expected' ->> 'open_cents')::int = 0
     from public.finance_overview((select shop from p), '2030-03-01', '2030-03-31') f),
  'pagamento registrado entra no recebido');
select tests.ok(
  (select (d -> 'period' ->> 'completed')::int = 1 and (d -> 'customers' ->> 'total')::int = 1
          and jsonb_array_length(d -> 'appointments_by_day') = 31
     from public.dashboard_overview((select shop from p), '2030-03-01', '2030-03-31') d),
  'visão geral calculada com dados reais');
select tests.ok(
  (select completed_appointments = 1 and total_spent_cents = 3500 from public.customer_stats
     where customer_id = 'cccccccc-0000-4000-8000-0000000000c1'::uuid),
  'estatísticas do cliente (atendimentos e total gasto)');

-- outra barbearia não vê os números desta
reset role;
select tests.login_as('joao@teste.dev');
set role authenticated;
select tests.throws(format($$select public.dashboard_overview(%L, '2030-03-01', '2030-03-31')$$, (select shop from p)),
  'dono de outra barbearia não acessa a visão geral');
select tests.ok(
  (select count(*) = 0 from public.get_available_slots((select shop from p), 'cccccccc-0000-4000-8000-0000000000a1'::uuid, '2030-03-04')),
  'agenda não publicada não mostra horários para quem é de fora');

-- visitante: só com a agenda publicada e respeitando antecedência mínima
reset role;
select tests.logout();
set role anon;
select tests.ok(
  (select count(*) = 0 from public.get_available_slots((select shop from p), 'cccccccc-0000-4000-8000-0000000000a1'::uuid, '2030-03-04')),
  'visitante não vê horários de agenda não publicada');
reset role;
update public.barbershops set published_at = now() where id = (select shop from p);
set role anon;
-- uma segunda-feira daqui a 7–13 dias (dentro do limite de 60 dias)
select tests.ok(
  (select count(*) > 0 from public.get_available_slots((select shop from p), 'cccccccc-0000-4000-8000-0000000000a1'::uuid,
     current_date + 7 + ((8 - extract(dow from current_date)::int) % 7))),
  'visitante vê horários livres da agenda publicada');
select tests.throws($$select * from public.appointment_events$$, 'visitante não lê histórico de agendamentos');
select tests.ok(
  (select count(*) = 0 from public.get_available_slots((select shop from p), 'cccccccc-0000-4000-8000-0000000000a1'::uuid, '2030-03-04')),
  'visitante não reserva além do limite de dias no futuro');
reset role;

-- limite de serviços do plano (Essencial = 15)
reset role;
update public.subscriptions set plan_id = (select id from public.plans where slug = 'essencial') where barbershop_id = (select shop from p);
insert into public.services (barbershop_id, name, price_cents, duration_minutes)
select shop, 'Extra ' || n, 1000, 15 from p, generate_series(1, 13) n;
select tests.login_as('painel@teste.dev');
set role authenticated;
select tests.throws(format($$insert into public.services (barbershop_id, name, price_cents, duration_minutes) values (%L, 'Além do limite', 1000, 15)$$, (select shop from p)),
  'plano Essencial bloqueia o 16º serviço ativo');
select tests.ok(tests.affected(format($$insert into public.services (barbershop_id, name, price_cents, duration_minutes, is_active) values (%L, 'Inativo', 1000, 15, false)$$, (select shop from p))) = 1,
  'serviço inativo não conta no limite');
reset role;
update public.subscriptions set plan_id = (select id from public.plans where slug = 'profissional') where barbershop_id = (select shop from p);

\echo ''
\echo '✅ Testes do painel passaram.'
