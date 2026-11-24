-- ============================================================================
-- SEED BASE (produção e desenvolvimento)
-- Planos iniciais. Preços e benefícios são editáveis depois no Super Admin.
-- Os valores abaixo são SUGESTÕES para começar, não definições comerciais.
-- ============================================================================

insert into public.plans (id, name, slug, description, price_cents, billing_period, trial_days, is_featured, highlight_label, is_default_trial, sort_order)
values
  ('11111111-0000-4000-8000-000000000001', 'Essencial', 'essencial',
   'Para o barbeiro que atende sozinho e quer uma agenda profissional.',
   4990, 'monthly', 14, false, null, false, 1),
  ('11111111-0000-4000-8000-000000000002', 'Profissional', 'profissional',
   'Para barbearias com equipe que querem controle total da operação.',
   9990, 'monthly', 14, true, 'Recomendado', true, 2),
  ('11111111-0000-4000-8000-000000000003', 'Premium', 'premium',
   'Para redes e barbearias grandes, sem limites.',
   19990, 'monthly', 14, false, null, false, 3)
on conflict (id) do nothing;

insert into public.plan_features (plan_id, feature_key, enabled, limit_value, label, sort_order) values
  -- Essencial
  ('11111111-0000-4000-8000-000000000001', 'professionals.max',   true, 1,    '1 profissional', 1),
  ('11111111-0000-4000-8000-000000000001', 'services.max',        true, 15,   'Até 15 serviços', 2),
  ('11111111-0000-4000-8000-000000000001', 'public_page',         true, null, 'Página de agendamento online', 3),
  ('11111111-0000-4000-8000-000000000001', 'customers',           true, null, 'Cadastro de clientes', 4),
  ('11111111-0000-4000-8000-000000000001', 'finance.basic',       true, null, 'Financeiro básico', 5),
  ('11111111-0000-4000-8000-000000000001', 'reports.advanced',    false, null, 'Relatórios avançados', 6),
  ('11111111-0000-4000-8000-000000000001', 'notifications.whatsapp', false, null, 'Lembretes por WhatsApp', 7),
  -- Profissional
  ('11111111-0000-4000-8000-000000000002', 'professionals.max',   true, 5,    'Até 5 profissionais', 1),
  ('11111111-0000-4000-8000-000000000002', 'services.max',        true, null, 'Serviços ilimitados', 2),
  ('11111111-0000-4000-8000-000000000002', 'public_page',         true, null, 'Página de agendamento online', 3),
  ('11111111-0000-4000-8000-000000000002', 'customers',           true, null, 'Cadastro de clientes', 4),
  ('11111111-0000-4000-8000-000000000002', 'finance.basic',       true, null, 'Financeiro completo', 5),
  ('11111111-0000-4000-8000-000000000002', 'reports.advanced',    true, null, 'Relatórios avançados', 6),
  ('11111111-0000-4000-8000-000000000002', 'notifications.whatsapp', false, null, 'Lembretes por WhatsApp', 7),
  -- Premium
  ('11111111-0000-4000-8000-000000000003', 'professionals.max',   true, null, 'Profissionais ilimitados', 1),
  ('11111111-0000-4000-8000-000000000003', 'services.max',        true, null, 'Serviços ilimitados', 2),
  ('11111111-0000-4000-8000-000000000003', 'public_page',         true, null, 'Página de agendamento online', 3),
  ('11111111-0000-4000-8000-000000000003', 'customers',           true, null, 'Cadastro de clientes', 4),
  ('11111111-0000-4000-8000-000000000003', 'finance.basic',       true, null, 'Financeiro completo', 5),
  ('11111111-0000-4000-8000-000000000003', 'reports.advanced',    true, null, 'Relatórios avançados', 6),
  ('11111111-0000-4000-8000-000000000003', 'notifications.whatsapp', true, null, 'Lembretes por WhatsApp', 7)
on conflict do nothing;
