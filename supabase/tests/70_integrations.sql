-- ============================================================================
-- Integrações: checkout com cupom, eventos de pagamento, cancelamento,
-- manutenção diária e fila de notificações
-- ============================================================================
\echo '— Integrações'
reset role;
select from tests.logout();

insert into auth.users (email, raw_user_meta_data) values
  ('dono-pag@teste.dev', '{"full_name":"Dono Pagante","phone":"11955554444","barbershop_name":"Barbearia Pagamento"}'),
  ('intruso-pag@teste.dev', '{"full_name":"Intruso","barbershop_name":"Barbearia Intrusa"}');

insert into public.coupons (name, code, discount_type, discount_value, extra_trial_days, audience, applicable_plan_ids, max_redemptions, is_active) values
  ('Metade', 'METADE', 'percent', 50, 0, 'new_customers', '{}', 10, true),
  ('Vencido', 'VENCIDO', 'percent', 10, 0, 'all', '{}', null, true),
  ('Só Essencial', 'SOESSENCIAL', 'fixed', 1000, 0, 'all', array[(select id from public.plans where slug = 'essencial')], null, true);
update public.coupons set ends_at = now() - interval '1 day' where code = 'VENCIDO';

create temp table ip as
select (select id from public.barbershops where name = 'Barbearia Pagamento') as shop,
       (select id from public.plans where slug = 'premium') as premium,
       (select price_cents from public.plans where slug = 'premium') as premium_price;
grant select on ip to authenticated, anon, service_role;

\echo '— Cotação'
select tests.login_as('intruso-pag@teste.dev');
set role authenticated;
select tests.throws(format($$select public.quote_checkout(%L, 'premium')$$, (select shop from ip)), 'outra barbearia não cota checkout');
select tests.throws(format($$select public.cancel_my_subscription(%L)$$, (select shop from ip)), 'outra barbearia não cancela');

reset role;
select tests.login_as('dono-pag@teste.dev');
set role authenticated;
select tests.ok(
  (select (q ->> 'amount_cents')::int = (select premium_price from ip) and (q ->> 'discount_cents')::int = 0
     from (select public.quote_checkout((select shop from ip), 'premium') q) x),
  'cotação sem cupom traz o preço cheio');
select tests.ok(
  (select (q ->> 'discount_cents')::int = round((select premium_price from ip) / 2.0)::int
     from (select public.quote_checkout((select shop from ip), 'premium', ' metade ') q) x),
  'cupom percentual (código sem diferenciar maiúsculas)');
select tests.throws(format($$select public.quote_checkout(%L, 'premium', 'VENCIDO')$$, (select shop from ip)), 'cupom vencido é recusado');
select tests.throws(format($$select public.quote_checkout(%L, 'premium', 'SOESSENCIAL')$$, (select shop from ip)), 'cupom de outro plano é recusado');
select tests.throws(format($$select public.quote_checkout(%L, 'premium', 'NAOEXISTE')$$, (select shop from ip)), 'cupom inexistente é recusado');
select tests.throws(format($$select public.quote_checkout(%L, 'nao-existe')$$, (select shop from ip)), 'plano inexistente é recusado');
select tests.throws('select public.apply_payment_event(''asaas'', gen_random_uuid(), ''x'', null, ''approved'')', 'navegador não aplica pagamento');
select tests.throws('select public.claim_notifications()', 'navegador não lê a fila de envios');

\echo '— Pagamento aprovado via webhook (service_role)'
reset role;
insert into public.payment_transactions (id, barbershop_id, plan_id, gateway, environment, amount_cents, discount_cents, status, coupon_id, checkout_ref)
select '00000000-0000-4000-8000-0000000000a1', shop, premium, 'asaas', 'sandbox', premium_price / 2, premium_price - premium_price / 2,
       'pending', (select id from public.coupons where code = 'METADE'), 'link_123'
from ip;

create temp table res (k text, v jsonb);
grant all on res to service_role;
set role service_role;
insert into res select 'pending', public.apply_payment_event('asaas', null, 'pay_1', 'link_123', 'pending');
insert into res select 'approved', public.apply_payment_event('asaas', null, 'pay_1', 'link_123', 'approved', null, 'pix', now(), '{"id":"pay_1"}');
insert into res select 'again', public.apply_payment_event('asaas', null, 'pay_1', null, 'approved');
insert into res select 'late_pending', public.apply_payment_event('asaas', null, 'pay_1', null, 'pending');
insert into res select 'unknown', public.apply_payment_event('asaas', null, 'pay_zzz', null, 'approved');
reset role;

select tests.ok((select v ->> 'result' = 'applied' from res where k = 'approved'), 'evento aprovado é aplicado (achado pela referência do link)');
select tests.ok((select v ->> 'result' = 'noop' from res where k = 'again'), 'webhook repetido não aplica de novo');
select tests.ok((select v ->> 'result' = 'noop' from res where k = 'late_pending'), 'evento atrasado não desfaz aprovação');
select tests.ok((select v ->> 'result' = 'unknown_transaction' from res where k = 'unknown'), 'pagamento desconhecido é ignorado');
select tests.ok(
  (select s.status = 'active' and s.plan_id = (select premium from ip)
          and s.current_period_end between now() + interval '27 days' and now() + interval '32 days'
     from public.subscriptions s where s.barbershop_id = (select shop from ip) and s.status = 'active'),
  'assinatura vira Premium ativa por 1 mês');
select tests.ok(public.barbershop_access_level((select shop from ip)) = 'full', 'acesso total depois do pagamento');
select tests.ok((select count(*) = 1 from public.coupon_redemptions where barbershop_id = (select shop from ip)), 'uso do cupom registrado uma vez');
select tests.ok((select status = 'approved' and gateway_payment_id = 'pay_1' and method = 'pix' and paid_at is not null
                   from public.payment_transactions where id = '00000000-0000-4000-8000-0000000000a1'), 'transação atualizada');
select tests.ok((select count(*) = 1 from public.notifications where barbershop_id = (select shop from ip) and event_type = 'billing.payment_approved' and channel = 'in_app'),
  'aviso no painel');
select tests.ok((select count(*) = 1 from public.notifications where barbershop_id = (select shop from ip) and event_type = 'billing.payment_approved'
                   and channel = 'email' and recipient = 'dono-pag@teste.dev'), 'cópia por e-mail para o dono');

select tests.login_as('dono-pag@teste.dev');
set role authenticated;
select tests.throws(format($$select public.quote_checkout(%L, 'premium', 'METADE')$$, (select shop from ip)), 'cupom não é usado duas vezes');
reset role;

\echo '— Renovação soma ao vencimento'
create temp table before_end as select current_period_end e from public.subscriptions where barbershop_id = (select shop from ip) and status = 'active';
insert into public.payment_transactions (id, barbershop_id, plan_id, gateway, environment, amount_cents, status)
select '00000000-0000-4000-8000-0000000000a2', shop, premium, 'asaas', 'sandbox', premium_price, 'pending' from ip;
set role service_role;
select public.apply_payment_event('asaas', '00000000-0000-4000-8000-0000000000a2', 'pay_2', null, 'approved');
reset role;
select tests.ok(
  (select s.current_period_end = b.e + interval '1 month' from public.subscriptions s, before_end b
    where s.barbershop_id = (select shop from ip) and s.status = 'active'),
  'renovação antecipada não perde dias');
select tests.ok((select count(*) = 1 from public.subscription_events where barbershop_id = (select shop from ip) and event_type = 'renewed'), 'evento de renovação');

\echo '— Pagamento recusado'
insert into public.payment_transactions (id, barbershop_id, plan_id, gateway, environment, amount_cents, status)
select '00000000-0000-4000-8000-0000000000a3', shop, premium, 'stripe', 'sandbox', premium_price, 'pending' from ip;
set role service_role;
select public.apply_payment_event('stripe', '00000000-0000-4000-8000-0000000000a3', 'pi_3', null, 'refused');
reset role;
select tests.ok((select count(*) = 1 from public.notifications where barbershop_id = (select shop from ip) and event_type = 'billing.payment_failed' and channel = 'in_app'),
  'recusa avisa o dono');
select tests.ok((select status = 'active' from public.subscriptions where barbershop_id = (select shop from ip) and status = 'active'), 'recusa não derruba assinatura vigente');

\echo '— Cancelamento no fim do período'
select tests.login_as('dono-pag@teste.dev');
set role authenticated;
select public.cancel_my_subscription((select shop from ip), 'Fechando a loja');
select tests.ok((select cancel_at_period_end from public.subscriptions where barbershop_id = (select shop from ip) and status = 'active'),
  'cancelamento agendado mantém o acesso');
select public.resume_my_subscription((select shop from ip));
select tests.ok((select not cancel_at_period_end from public.subscriptions where barbershop_id = (select shop from ip) and status = 'active'), 'dono desfaz o cancelamento');
select public.cancel_my_subscription((select shop from ip));
select tests.ok((select count(*) = 3 from public.notifications where barbershop_id = (select shop from ip) and channel = 'in_app'), 'dono vê os avisos da barbearia');
select tests.ok(public.mark_notifications_read((select shop from ip)) = 3, 'marca avisos como lidos');
reset role;

\echo '— Manutenção diária'
update public.subscriptions set current_period_start = now() - interval '40 days', current_period_end = now() - interval '1 hour'
  where barbershop_id = (select shop from ip) and status = 'active';
update public.subscriptions set current_period_start = now() - interval '20 days', current_period_end = now() - interval '1 day'
  where barbershop_id = (select id from public.barbershops where name = 'Barbearia Intrusa');
set role service_role;
insert into res select 'maint', public.run_subscription_maintenance();
reset role;
select tests.ok((select status = 'canceled' from public.subscriptions where barbershop_id = (select shop from ip) order by updated_at desc limit 1),
  'cancelada encerra ao vencer');
select tests.ok((select status = 'expired' from public.subscriptions where barbershop_id = (select id from public.barbershops where name = 'Barbearia Intrusa')),
  'teste vencido expira');
select tests.ok(public.barbershop_access_level((select shop from ip)) = 'billing_only', 'sem assinatura vigente só acessa a cobrança');

\echo '— Lembretes e fila de envio'
-- reativa e habilita WhatsApp para a barbearia
update public.subscriptions set status = 'active', cancel_at_period_end = false, current_period_end = now() + interval '20 days'
  where id = (select id from public.subscriptions where barbershop_id = (select shop from ip) order by updated_at desc limit 1);
update public.barbershops set notification_prefs = '{"reminder_hours": 24, "reminder_whatsapp": true, "new_booking_email": false}'
  where id = (select shop from ip);
insert into public.professionals (barbershop_id, name) select shop, 'Zeca' from ip;
insert into public.services (barbershop_id, name, duration_minutes, price_cents) select shop, 'Corte', 30, 4000 from ip;
insert into public.customers (barbershop_id, name, phone) select shop, 'Carlos Cliente', '11944443333' from ip;
-- validações de agenda já têm testes próprios; aqui só interessa a janela do lembrete
set session_replication_role = replica;
insert into public.appointments (barbershop_id, professional_id, service_id, customer_id, starts_at, ends_at, duration_minutes, price_cents, status, source)
select ip.shop, p.id, s.id, c.id, x.t, x.t + interval '30 minutes', 30, 4000, 'confirmed', 'manual'
from ip
join public.professionals p on p.barbershop_id = ip.shop
join public.services s on s.barbershop_id = ip.shop
join public.customers c on c.barbershop_id = ip.shop
cross join (values (date_trunc('hour', now()) + interval '5 hours'), (date_trunc('hour', now()) + interval '3 days')) x(t);
set session_replication_role = origin;

set role service_role;
insert into res select 'rem1', to_jsonb(public.enqueue_appointment_reminders());
insert into res select 'rem2', to_jsonb(public.enqueue_appointment_reminders());
insert into res select 'claim', to_jsonb(array(select id from public.claim_notifications(100)));
reset role;
select tests.ok((select (v)::text::int = 1 from res where k = 'rem1'), 'lembrete só para horários dentro da janela');
select tests.ok((select (v)::text::int = 0 from res where k = 'rem2'), 'lembrete não duplica');
select tests.ok(
  (select body like 'Olá, Carlos!%' and recipient = '11944443333' from public.notifications
    where barbershop_id = (select shop from ip) and channel = 'whatsapp'),
  'mensagem de lembrete com nome e telefone do cliente');
select tests.ok((select jsonb_array_length(v) >= 3 from res where k = 'claim'), 'fila entrega e-mails e WhatsApp pendentes');
set role service_role;
select public.finish_notification((select id from public.notifications where barbershop_id = (select shop from ip) and channel = 'whatsapp'), 'failed', 'timeout');
reset role;
select tests.ok((select status = 'pending' and attempts = 1 and error = 'timeout' from public.notifications
                   where barbershop_id = (select shop from ip) and channel = 'whatsapp'), 'falha temporária volta para a fila');

select from tests.logout();
\echo '✅ Testes de integrações passaram.'
