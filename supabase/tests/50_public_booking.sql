-- ============================================================================
-- Página pública: dados públicos, reserva, limites e cancelamento pelo cliente
-- ============================================================================
\echo '— Página pública de agendamento'
reset role;
select from tests.logout();

insert into auth.users (email, raw_user_meta_data) values
  ('publica@teste.dev', '{"full_name":"Dono Pública","phone":"11955554444","barbershop_name":"Tesoura Publica Teste","terms_version":"2026-11-24","privacy_version":"2026-11-24"}');

create temp table pb as
select (select id from public.barbershops where name = 'Tesoura Publica Teste') as shop,
       -- segunda-feira da semana que vem (dentro da antecedência máxima padrão de 60 dias)
       (current_date + (8 - extract(isodow from current_date)::int) + 7)::date as day;
grant select on pb to authenticated, anon;

insert into public.professionals (id, barbershop_id, name)
select 'dddddddd-0000-4000-8000-000000000001'::uuid, shop, 'Beto' from pb union all
select 'dddddddd-0000-4000-8000-000000000002'::uuid, shop, 'Caio' from pb union all
select 'dddddddd-0000-4000-8000-000000000003'::uuid, shop, 'Inativo' from pb;
update public.professionals set is_active = false where id = 'dddddddd-0000-4000-8000-000000000003';
insert into public.services (id, barbershop_id, name, price_cents, duration_minutes)
select 'dddddddd-0000-4000-8000-0000000000a1'::uuid, shop, 'Corte', 6000, 30 from pb union all
select 'dddddddd-0000-4000-8000-0000000000a2'::uuid, shop, 'Sem ninguém', 1000, 30 from pb;
insert into public.professional_services (barbershop_id, professional_id, service_id)
select shop, 'dddddddd-0000-4000-8000-000000000001'::uuid, 'dddddddd-0000-4000-8000-0000000000a1'::uuid from pb union all
select shop, 'dddddddd-0000-4000-8000-000000000002'::uuid, 'dddddddd-0000-4000-8000-0000000000a1'::uuid from pb union all
select shop, 'dddddddd-0000-4000-8000-000000000003'::uuid, 'dddddddd-0000-4000-8000-0000000000a2'::uuid from pb;
insert into public.working_hours (barbershop_id, weekday, starts_at, ends_at)
select shop, d, '09:00', '18:00' from pb, generate_series(1, 6) d;
update public.barbershops set slot_interval_minutes = 30 where id = (select shop from pb);

-- ---------------------------------------------------------------------------
\echo '— Endereços reservados'
select tests.throws($$update public.barbershops set slug = 'painel' where name = 'Tesoura Publica Teste'$$,
  'slug reservado (painel) é recusado pelo banco');
select tests.ok(public.generate_unique_slug('Agenda') = 'agenda-2', 'gerador de slug pula endereços reservados');

-- ---------------------------------------------------------------------------
\echo '— Visitante: barbearia não publicada'
set role anon;
select tests.ok((public.get_public_barbershop('tesoura-publica-teste') ->> 'status') = 'unavailable',
  'não publicada: visitante vê só "indisponível"');
select tests.ok(public.get_public_barbershop('nao-existe') is null, 'slug inexistente devolve nulo');
select tests.ok(public.get_public_barbershop('tesoura-publica-teste') -> 'services' is null, 'não publicada não expõe serviços');
select tests.throws(
  format($$select public.create_public_booking('tesoura-publica-teste', %L, null, %L, 'Fulano', '11911112222')$$,
         'dddddddd-0000-4000-8000-0000000000a1', ((select day from pb) + time '10:00') at time zone 'America/Sao_Paulo'),
  'não publicada não aceita reservas');

\echo '— Dono: pré-visualização'
reset role;
select tests.login_as('publica@teste.dev');
set role authenticated;
select tests.ok((public.get_public_barbershop('tesoura-publica-teste') ->> 'status') = 'ok'
            and (public.get_public_barbershop('tesoura-publica-teste') ->> 'accepting')::boolean = false,
  'dono pré-visualiza a página antes de publicar');
reset role;
select from tests.logout();
update public.barbershops set published_at = now() where id = (select shop from pb);

-- ---------------------------------------------------------------------------
\echo '— Visitante: barbearia publicada'
set role anon;
select tests.ok(
  (select jsonb_array_length(public.get_public_barbershop('tesoura-publica-teste') -> 'services') = 1),
  'lista só serviços que algum profissional ATIVO realiza');
select tests.ok(
  (select jsonb_array_length(public.get_public_barbershop('tesoura-publica-teste') -> 'professionals') = 2),
  'lista só profissionais ativos');
select tests.ok(
  (select not (public.get_public_barbershop('tesoura-publica-teste') -> 'shop' ? 'email')
      and not (public.get_public_barbershop('tesoura-publica-teste') -> 'shop' ? 'created_by')),
  'não expõe campos internos da barbearia');
select tests.throws('select count(*) from public.customers', 'visitante continua sem ler clientes');

select tests.throws(
  format($$select public.create_public_booking('tesoura-publica-teste', %L, null, %L, 'F', '11911112222')$$,
         'dddddddd-0000-4000-8000-0000000000a1', ((select day from pb) + time '10:00') at time zone 'America/Sao_Paulo'),
  'nome curto demais é recusado');
select tests.throws(
  format($$select public.create_public_booking('tesoura-publica-teste', %L, null, %L, 'Fulano', '123')$$,
         'dddddddd-0000-4000-8000-0000000000a1', ((select day from pb) + time '10:00') at time zone 'America/Sao_Paulo'),
  'telefone inválido é recusado');
select tests.throws(
  format($$select public.create_public_booking('tesoura-publica-teste', %L, null, %L, 'Fulano', '11911112222')$$,
         'dddddddd-0000-4000-8000-0000000000a1', ((select day from pb) + time '10:10') at time zone 'America/Sao_Paulo'),
  'horário fora da grade (10:10) é recusado');
select tests.throws(
  format($$select public.create_public_booking('tesoura-publica-teste', %L, null, %L, 'Fulano', '11911112222')$$,
         'dddddddd-0000-4000-8000-0000000000a1', ((select day from pb) + time '19:00') at time zone 'America/Sao_Paulo'),
  'horário depois do expediente é recusado');
select tests.throws(
  format($$select public.create_public_booking('tesoura-publica-teste', %L, null, %L, 'Fulano', '11911112222')$$,
         'dddddddd-0000-4000-8000-0000000000a1', now() + interval '10 minutes'),
  'antecedência mínima respeitada');

create temp table booked (k text, v jsonb);
grant all on booked to anon, authenticated;
insert into booked
select 'a', public.create_public_booking('tesoura-publica-teste', 'dddddddd-0000-4000-8000-0000000000a1', null,
  ((select day from pb) + time '10:00') at time zone 'America/Sao_Paulo', '  João   da Silva ', '+55 (11) 91111-2222', 'JOAO@EMAIL.COM', 'Degradê baixo');
select tests.ok((select v ->> 'status' = 'pending' and (v ->> 'price_cents')::int = 6000 and v ->> 'customer_name' = 'João da Silva'
                  from booked where k = 'a'),
  'reserva criada: pendente, preço do serviço, nome limpo');

insert into booked
select 'b', public.create_public_booking('tesoura-publica-teste', 'dddddddd-0000-4000-8000-0000000000a1', null,
  ((select day from pb) + time '10:00') at time zone 'America/Sao_Paulo', 'Maria', '11933334444');
select tests.ok((select (select v ->> 'professional_name' from booked where k = 'a') <> (select v ->> 'professional_name' from booked where k = 'b')),
  '"qualquer profissional" escolhe outro profissional livre no mesmo horário');
select tests.throws(
  format($$select public.create_public_booking('tesoura-publica-teste', %L, null, %L, 'Pedro', '11955556666')$$,
         'dddddddd-0000-4000-8000-0000000000a1', ((select day from pb) + time '10:00') at time zone 'America/Sao_Paulo'),
  'terceira reserva no mesmo horário: ninguém livre, recusada');
select tests.throws(
  format($$select public.create_public_booking('tesoura-publica-teste', %L, %L, %L, 'Pedro', '11955556666')$$,
         'dddddddd-0000-4000-8000-0000000000a1', 'dddddddd-0000-4000-8000-000000000001',
         ((select day from pb) + time '10:15') at time zone 'America/Sao_Paulo'),
  'profissional escolhido ocupado: recusado');

insert into booked
select 'c', public.create_public_booking('tesoura-publica-teste', 'dddddddd-0000-4000-8000-0000000000a1', null,
  ((select day from pb) + time '11:00') at time zone 'America/Sao_Paulo', 'Outro Nome', '11911112222');
insert into booked
select 'd', public.create_public_booking('tesoura-publica-teste', 'dddddddd-0000-4000-8000-0000000000a1', null,
  ((select day from pb) + time '12:00') at time zone 'America/Sao_Paulo', 'Outro Nome', '11911112222');
select tests.throws(
  format($$select public.create_public_booking('tesoura-publica-teste', %L, null, %L, 'Outro', '11911112222')$$,
         'dddddddd-0000-4000-8000-0000000000a1', ((select day from pb) + time '13:00') at time zone 'America/Sao_Paulo'),
  'quarta reserva futura do mesmo telefone é bloqueada (anti-abuso)');

\echo '— Link do cliente'
select tests.ok(public.get_public_appointment(gen_random_uuid()) is null, 'token desconhecido não revela nada');
select tests.ok((select (public.get_public_appointment((v ->> 'token')::uuid) ->> 'can_cancel')::boolean from booked where k = 'a'),
  'cliente pode cancelar com antecedência');
select tests.ok((select public.cancel_public_appointment((v ->> 'token')::uuid) ->> 'status' = 'cancelled' from booked where k = 'a'),
  'cliente cancela pelo link');
select tests.throws(format($$select public.cancel_public_appointment(%L)$$, (select v ->> 'token' from booked where k = 'a')),
  'não cancela duas vezes');
insert into booked
select 'e', public.create_public_booking('tesoura-publica-teste', 'dddddddd-0000-4000-8000-0000000000a1', null,
  ((select day from pb) + time '10:00') at time zone 'America/Sao_Paulo', 'Pedro', '11955556666');
select tests.ok((select v ->> 'status' = 'pending' from booked where k = 'e'), 'horário cancelado volta a ficar livre');

reset role;
select tests.ok(
  (select count(*) = 1 and min(name) = 'João da Silva' and min(email::text) = 'joao@email.com'
     from public.customers where barbershop_id = (select shop from pb) and phone = '11911112222'),
  'mesmo telefone = mesmo cliente (nome da barbearia preservado, e-mail normalizado)');
select tests.ok(
  (select bool_and(source = 'public_page' and created_by is null) from public.appointments where barbershop_id = (select shop from pb)),
  'reservas marcadas como vindas da página pública');
select tests.ok(
  (select count(*) = 5 from public.notifications where barbershop_id = (select shop from pb) and event_type = 'appointment.created' and channel = 'in_app')
  and (select count(*) = 1 from public.notifications where barbershop_id = (select shop from pb) and event_type = 'appointment.cancelled' and channel = 'in_app'),
  'barbearia é notificada de novas reservas e cancelamentos');

-- simula um agendamento daqui a 1h (barbearia exige 2h de antecedência para cancelar)
alter table public.appointments disable trigger appointments_validate;
update public.appointments set starts_at = now() + interval '1 hour', ends_at = now() + interval '90 minutes'
 where public_token = (select (v ->> 'token')::uuid from booked where k = 'b');
alter table public.appointments enable trigger appointments_validate;
set role anon;
select tests.ok((select not (public.get_public_appointment((v ->> 'token')::uuid) ->> 'can_cancel')::boolean from booked where k = 'b'),
  'link mostra que não dá mais para cancelar');
select tests.throws(format($$select public.cancel_public_appointment(%L)$$, (select v ->> 'token' from booked where k = 'b')),
  'cancelamento em cima da hora (política da barbearia) é recusado');

reset role;
update public.barbershops set status = 'suspended' where id = (select shop from pb);
set role anon;
select tests.ok((public.get_public_barbershop('tesoura-publica-teste') ->> 'status') = 'unavailable', 'barbearia suspensa sai do ar');
reset role;
