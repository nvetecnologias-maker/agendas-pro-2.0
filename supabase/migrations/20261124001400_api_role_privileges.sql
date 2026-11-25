-- ============================================================================
-- 0014 · Privilégios das tabelas para os papéis da API
-- ----------------------------------------------------------------------------
-- Projetos Supabase novos não concedem mais, por padrão, acesso às tabelas do
-- schema public para os papéis da API. Sem isso, quem entra logado recebe
-- "permission denied" em todas as tabelas (perfil, barbearia, agenda...) e o
-- painel acha que a conta não tem barbearia.
--
-- Aqui concedemos explicitamente o que antes vinha por padrão e, em seguida,
-- reaplicamos todas as restrições das migrations anteriores. A RLS continua
-- decidindo quais linhas cada pessoa enxerga.
--
--   authenticated: select/insert/update/delete (sem truncate), com as
--                  exceções abaixo
--   anon:          apenas a vitrine de planos (o restante via funções)
--   service_role:  tudo (servidor: webhooks, cron, Super Admin)
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- servidor
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- pessoas logadas
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- visitantes: só os planos
revoke all on all tables in schema public from anon;
grant select on public.plans, public.plan_features to anon;

-- ---------------------------------------------------------------------------
-- Restrições reaplicadas (mesmas da 0006, 0009 e 0011)
-- ---------------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url, last_seen_at) on public.profiles to authenticated;

revoke update on public.barbershops from authenticated;
grant update (
  name, slug, description, timezone, phone, whatsapp, email,
  address_street, address_number, address_complement, address_district,
  address_city, address_state, address_zip, social_links,
  logo_url, cover_url, branding, published_at,
  min_advance_minutes, max_advance_days, buffer_minutes, slot_interval_minutes,
  cancellation_min_hours, cancellation_policy, auto_confirm,
  onboarding_step, onboarding_completed_at, notification_prefs
) on public.barbershops to authenticated;

revoke insert, update, delete on public.audit_logs from authenticated;
revoke update, delete on public.subscription_events from authenticated;

revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke insert, update, delete on public.appointment_events from authenticated;

revoke select on public.payment_gateways from authenticated;
grant select (id, provider, environment, is_active, public_key, enabled_methods, updated_by, created_at, updated_at)
  on public.payment_gateways to authenticated;

-- visões: somente leitura
revoke all on public.customer_stats, public.payment_gateways_admin, public.coupon_usage from authenticated;
grant select on public.customer_stats, public.payment_gateways_admin, public.coupon_usage to authenticated;

-- ---------------------------------------------------------------------------
-- Tabelas criadas por migrations futuras recebem o mesmo padrão
-- ---------------------------------------------------------------------------
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
