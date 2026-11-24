# Agendas Pro

Plataforma SaaS premium de agendamento e gestão para barbearias, pensada primeiro para o celular.
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, RLS, Storage, Vault).

## O que tem

| Área | Rotas | Para quem |
| --- | --- | --- |
| Site institucional | `/`, `/termos`, `/privacidade` | visitantes |
| Conta | `/cadastro`, `/entrar`, `/recuperar-senha`, `/redefinir-senha`, `/onboarding` | donos de barbearia |
| Painel | `/painel` (início, agenda, minha agenda, clientes, serviços, profissionais, financeiro, configurações, assinatura, avisos) | dono, administrador e barbeiros |
| Página da barbearia | `/{link-da-barbearia}` e `/{link}/agendamento/{código}` | clientes finais (sem login) |
| Super Admin | `/super-admin` (visão geral, barbearias, planos, cupons, pagamentos, gateways, configurações, auditoria) | equipe da plataforma |
| Integrações | `/api/webhooks/{mercado-pago,asaas,stripe}`, `/api/cron` | gateways e agendador |

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha as variáveis (veja abaixo)
npm run dev                  # http://localhost:3000
```

### Variáveis de ambiente

| Variável | Onde | Para quê |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | conexão com o Supabase |
| `NEXT_PUBLIC_SITE_URL` | público | links de e-mail e retorno do checkout |
| `SUPABASE_SERVICE_ROLE_KEY` | **só servidor** | webhooks, checkout e tarefas agendadas |
| `CRON_SECRET` | **só servidor** | protege `/api/cron` |
| `RESEND_API_KEY`, `EMAIL_FROM` | **só servidor** | e-mails de aviso para o dono (opcional) |
| `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN` | **só servidor** | lembretes por WhatsApp (opcional) |

Nunca coloque a `service_role` em variável `NEXT_PUBLIC_` nem no repositório. As chaves dos gateways **não** vão em variáveis: são cadastradas em `/super-admin/gateways` e guardadas criptografadas no Supabase Vault.

## Banco de dados (Supabase)

As migrations ficam em `supabase/migrations` e são aplicadas **em ordem**, seguidas de `supabase/seed.sql` (planos iniciais).

- **Supabase CLI**: `npx supabase link --project-ref <ref>` e `npx supabase db push`.
- **SQL Editor**: cole cada arquivo de `supabase/migrations` em ordem e depois o `seed.sql`.

### Auth (Dashboard → Authentication)

- **URL Configuration**: Site URL = URL do site; em *Redirect URLs* adicione `http://localhost:3000/auth/callback` e `https://SEU-DOMINIO/auth/callback`.
- **Email**: mantenha *Confirm email* ligado em produção e configure um SMTP próprio.

### Primeiro Super Admin

Cadastre-se normalmente e rode no SQL Editor:

```sql
update public.profiles set platform_role = 'super_admin'
where email = 'seu-email@dominio.com';
```

## Pagamentos

1. Em `/super-admin/gateways`, escolha **Teste (sandbox)** ou **Produção**, cole as chaves e ative um gateway (só um fica ativo).
2. Copie a **URL do webhook** mostrada ali e cadastre no painel do gateway:
   - **Mercado Pago**: Webhooks → evento *Pagamentos*; copie a *assinatura secreta* para o campo do webhook.
   - **Asaas**: Integrações → Webhooks → eventos de cobrança; defina um *token de autenticação* e cole o mesmo token.
   - **Stripe**: Developers → Webhooks → eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`; cole o *signing secret* (`whsec_…`).
3. O dono assina em `/painel/assinatura`. A assinatura só muda quando o webhook confirma o pagamento; webhooks repetidos não aplicam duas vezes.

Segurança: Stripe é validado pela assinatura HMAC; Mercado Pago e Asaas têm o status confirmado na API do próprio gateway antes de aplicar.

## Tarefa agendada

`GET /api/cron` com `Authorization: Bearer $CRON_SECRET`:
encerra assinaturas canceladas/vencidas, enfileira lembretes de WhatsApp e envia a fila de e-mails/WhatsApp (com novas tentativas).

- **Vercel**: o `vercel.json` agenda a cada 15 minutos (no plano Hobby a Vercel só permite uma vez por dia; use Pro ou um agendador externo).
- **Outros**: qualquer agendador que faça a chamada acima serve.

## Testes

```bash
npm test          # Vitest: permissões, validações, webhooks, agendamento
npm run typecheck
npm run lint
npm run test:db   # migrations + testes SQL de RLS, agenda, agendamento público, Super Admin e integrações
```

`test:db` precisa de um PostgreSQL 15+ local (`PGHOST`, `PGPORT`, `PGUSER`). Ele usa `supabase/tests/_local_supabase_stub.sql` para simular `auth.uid()`, os papéis e o Vault do Supabase.
Depois de mudar o schema, rode `npm run db:types` para regenerar `src/types/database.generated.ts`.

## Arquitetura

```
src/
  app/
    (marketing)/ (auth)/ auth/   site, login/cadastro e callbacks
    onboarding/                   passo a passo inicial do dono
    painel/                       painel da barbearia
    [slug]/                       página pública e gerenciamento do agendamento
    super-admin/                  administração da plataforma
    api/webhooks/[provider]/      webhooks de pagamento
    api/cron/                     tarefas agendadas
  components/  ui/ panel/ agenda/ booking/ admin/ landing/ charts/ ...
  lib/
    supabase/       clientes (browser, server, admin) e middleware de sessão
    permissions/    matriz de permissões por papel e acesso
    payments/       adaptadores dos gateways e verificação de webhooks
    notifications/  envio de e-mail e WhatsApp
    public-booking/ regras da página pública
supabase/
  migrations/  seed.sql  tests/
```

### Segurança e multi-tenancy

- Toda tabela operacional tem `barbershop_id`; a **RLS** libera só barbearias das quais o usuário é membro, e cada papel (dono, administrador, barbeiro) vê só o que pode.
- Chaves estrangeiras compostas `(barbershop_id, id)` impedem misturar dados de barbearias diferentes.
- Constraint de exclusão impede agendamentos sobrepostos do mesmo profissional, inclusive em reservas simultâneas.
- A página pública só fala com o banco por funções `SECURITY DEFINER` com validação, limite de reservas por telefone e token secreto para gerenciar o agendamento.
- Acesso por assinatura (`full`, `grace`, `billing_only`, `blocked`) é calculado no banco; dados nunca são apagados por vencimento.
- Funções de pagamento e da fila de envios só rodam com `service_role`; segredos de gateway ficam no Vault e nunca voltam ao navegador.
- Mudanças em assinaturas, planos, cupons, gateways, configurações e membros geram log de auditoria automático.
- Cabeçalhos de segurança (HSTS, nosniff, frame-options, referrer e permissions policy) em todas as rotas.
