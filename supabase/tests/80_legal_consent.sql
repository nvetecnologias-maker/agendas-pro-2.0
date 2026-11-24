-- ============================================================================
-- Aceite dos Termos de Uso e da Política de Privacidade
-- ============================================================================
\echo '- Aceite obrigatório no cadastro'

select tests.throws(
  $$insert into auth.users (email, raw_user_meta_data) values ('sem-aceite@teste.dev', '{"full_name":"Sem Aceite","barbershop_name":"Barbearia Sem Aceite"}')$$,
  'cadastro de barbearia sem aceite é recusado');
select tests.ok((select count(*) = 0 from public.barbershops where name = 'Barbearia Sem Aceite'), 'nenhuma barbearia criada sem aceite');

insert into auth.users (email, raw_user_meta_data) values
  ('aceite@teste.dev', '{"full_name":"Com Aceite","phone":"11955550000","barbershop_name":"Barbearia Com Aceite","terms_version":"2026-11-24","privacy_version":"2026-11-24"}'),
  ('outro-aceite@teste.dev', '{"full_name":"Outro","phone":"11955550001","barbershop_name":"Outra Barbearia","terms_version":"2026-11-24","privacy_version":"2026-11-24"}');

select tests.ok(
  (select count(*) = 2 from public.legal_acceptances a join auth.users u on u.id = a.user_id
    where u.email = 'aceite@teste.dev' and a.version = '2026-11-24' and a.source = 'signup'),
  'versão dos dois documentos registrada no cadastro');
select tests.ok(
  (select bool_and(a.accepted_at > now() - interval '1 minute') from public.legal_acceptances a join auth.users u on u.id = a.user_id
    where u.email = 'aceite@teste.dev'),
  'data de aceite registrada pelo servidor');

select tests.throws(
  $$insert into auth.users (email, raw_user_meta_data) values ('versao-ruim@teste.dev', '{"full_name":"X","barbershop_name":"Barbearia X2","terms_version":"<script>","privacy_version":"2026-11-24"}')$$,
  'versão em formato inválido é recusada');

\echo '- Cada pessoa só enxerga os próprios aceites'
select tests.login_as('aceite@teste.dev');
set role authenticated;
select tests.ok((select count(*) = 2 from public.legal_acceptances), 'vê apenas os próprios aceites');
select public.accept_legal_documents('2026-12-01', '2026-12-01', 'checkout');
select tests.ok((select count(*) = 4 from public.legal_acceptances), 'novo aceite registrado no checkout');
select tests.throws($$insert into public.legal_acceptances (user_id, document, version) values (gen_random_uuid(), 'terms_of_use', '2026-11-24')$$,
  'não grava aceite direto na tabela');
select tests.throws($$select public.accept_legal_documents('2026-11-24', '2026-11-24', 'signup')$$, 'origem "signup" só pelo cadastro');
select from tests.logout();
reset role;

select tests.ok((select public.is_reserved_slug('termos-de-uso') and public.is_reserved_slug('politica-de-privacidade')), 'rotas institucionais reservadas');
select tests.ok((select count(*) = 0 from public.plans where highlight_label ilike '%mais escolhido%'), 'sem selo de popularidade');

\echo '✓ Testes de aceite passaram.'
