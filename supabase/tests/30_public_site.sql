-- ============================================================================
-- Site institucional: informações públicas e plano escolhido no cadastro
-- ============================================================================
\echo '— Site institucional'

insert into auth.users (email, raw_user_meta_data) values
  ('premium@teste.dev', '{"full_name":"Cliente Premium","phone":"11955554444","barbershop_name":"Navalha de Ouro","desired_plan":"premium"}'),
  ('invalido@teste.dev', '{"full_name":"Plano Inexistente","phone":"11955553333","barbershop_name":"Barbearia X","desired_plan":"nao-existe"}');

select tests.ok(
  (select p.slug = 'premium' from public.subscriptions s join public.plans p on p.id = s.plan_id
     join public.barbershops b on b.id = s.barbershop_id where b.name = 'Navalha de Ouro'),
  'trial começa no plano escolhido na vitrine');
select tests.ok(
  (select p.is_default_trial from public.subscriptions s join public.plans p on p.id = s.plan_id
     join public.barbershops b on b.id = s.barbershop_id where b.name = 'Barbearia X'),
  'plano inválido cai no plano padrão de teste');

set role anon;
select tests.ok((select platform_name = 'Agendas Pro' from public.get_public_platform_info()), 'visitante lê as informações públicas da plataforma');
select tests.throws($$select grace_period_days from public.platform_settings$$, 'visitante não lê as configurações internas');
reset role;

\echo ''
\echo '✅ Testes do site institucional passaram.'
