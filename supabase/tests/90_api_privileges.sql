-- ============================================================================
-- Privilégios dos papéis da API (projetos Supabase sem concessão automática)
-- ============================================================================
\echo '- Pessoas logadas acessam as tabelas (a RLS filtra as linhas)'
select tests.ok(has_table_privilege('authenticated', 'public.profiles', 'select'), 'authenticated lê profiles');
select tests.ok(has_table_privilege('authenticated', 'public.barbershop_members', 'select'), 'authenticated lê barbershop_members');
select tests.ok(has_table_privilege('authenticated', 'public.appointments', 'insert'), 'authenticated cria agendamentos');
select tests.ok(not has_table_privilege('authenticated', 'public.appointments', 'truncate'), 'authenticated não esvazia tabelas');
select tests.ok(not has_column_privilege('authenticated', 'public.profiles', 'platform_role', 'update'), 'não promove a si mesmo');
select tests.ok(not has_column_privilege('authenticated', 'public.barbershops', 'status', 'update'), 'não muda status da barbearia');
select tests.ok(has_column_privilege('authenticated', 'public.barbershops', 'notification_prefs', 'update'), 'edita preferências de aviso');
select tests.ok(not has_column_privilege('authenticated', 'public.payment_gateways', 'secret_key_vault_id', 'select'), 'não lê ids do cofre');
select tests.ok(not has_table_privilege('authenticated', 'public.audit_logs', 'insert'), 'não grava auditoria direto');

\echo '- Visitantes só leem os planos'
select tests.ok(has_table_privilege('anon', 'public.plans', 'select'), 'anon lê planos');
select tests.ok(not has_table_privilege('anon', 'public.profiles', 'select'), 'anon não lê perfis');
select tests.ok(not has_table_privilege('anon', 'public.legal_acceptances', 'select'), 'anon não lê aceites');

\echo '- Servidor'
select tests.ok(has_table_privilege('service_role', 'public.subscriptions', 'update'), 'service_role atualiza assinaturas');

\echo '✓ Testes de privilégios passaram.'
