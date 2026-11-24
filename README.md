# Agendas Pro

Plataforma SaaS premium de agendamento e gestão para barbearias.
Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, RLS, Storage).

## Status

| Fase | Escopo | Situação |
| --- | --- | --- |
| 1 · Fundação | Estrutura, design system, banco, autenticação, multi-tenancy, permissões | ✅ em revisão |
| 2 · Site institucional | Landing, planos, login, cadastro | ⏳ |
| 3 · Painel do barbeiro | Dashboard, agenda, serviços, profissionais, clientes, financeiro | ⏳ |
| 4 · Agenda pública | Página exclusiva e fluxo de agendamento | ⏳ |
| 5 · Super Admin | Contas, planos, cupons, assinaturas, auditoria | ⏳ |
| 6 · Integrações | Pagamentos, webhooks, notificações, WhatsApp | ⏳ |
| 7 · Finalização | Testes, segurança, performance, ajustes | ⏳ |

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha URL e chave publicável do Supabase
npm run dev                  # http://localhost:3000
```

Rotas da Fase 1: `/` (provisória), `/design-system`, `/entrar`, `/cadastro`,
`/recuperar-senha`, `/redefinir-senha`, `/painel`, `/onboarding`, `/super-admin`.

## Banco de dados (Supabase)

As migrations ficam em `supabase/migrations` e devem ser aplicadas **em ordem**,
seguidas de `supabase/seed.sql` (planos iniciais).

**Opção A · Supabase CLI**

```bash
npx supabase login
npx supabase link --project-ref yimnqkwliqxqqgqctabn
npx supabase db push          # aplica as migrations
npx supabase db query -f supabase/seed.sql   # ou cole o seed no SQL Editor
```

**Opção B · SQL Editor**: cole cada arquivo de `supabase/migrations` (em ordem) e depois o `seed.sql`.

### Configuração do Auth (Dashboard → Authentication)

- **URL Configuration**: Site URL = URL do site; adicione `http://localhost:3000/auth/callback` e a URL de produção `/auth/callback` em *Redirect URLs*.
- **Email**: mantenha *Confirm email* ligado em produção.

### Criar o primeiro Super Admin

Cadastre-se normalmente e depois rode no SQL Editor:

```sql
update public.profiles set platform_role = 'super_admin'
where email = 'seu-email@dominio.com';
```

## Testes

```bash
npm test        # matriz de permissões e validações (Vitest)
npm run test:db # migrations + 53 verificações de RLS/isolamento num Postgres local
```

`test:db` precisa de um PostgreSQL 15+ local (`PGHOST`, `PGPORT`, `PGUSER`).
Ele usa `supabase/tests/_local_supabase_stub.sql` para simular `auth.uid()` e os papéis do Supabase.

## Arquitetura

```
src/
  app/                 rotas (App Router)
    (auth)/            entrar, cadastro, recuperar/redefinir senha + server actions
    auth/              callback de e-mail, redirecionamento por perfil, sair
    painel/ onboarding/ super-admin/ design-system/
  components/
    ui/ animations/ brand/ auth/ navigation/ dashboard/ calendar/ landing/ admin/
  lib/
    supabase/          clientes (browser, server, admin) e middleware de sessão
    auth/              contexto da sessão, guards, mensagens de erro
    permissions/       matriz central de permissões + catálogo de recursos por plano
    validation/        esquemas Zod
  hooks/ types/ services/
supabase/
  migrations/          schema versionado
  seed.sql             planos iniciais
  tests/               testes SQL de segurança
```

### Segurança e multi-tenancy

- Toda tabela operacional tem `barbershop_id`; a **RLS** libera só barbearias das quais o usuário é membro.
- Chaves estrangeiras **compostas** `(barbershop_id, id)` impedem misturar dados de barbearias diferentes.
- **Constraint de exclusão** no Postgres impede agendamentos sobrepostos do mesmo profissional, inclusive em reservas simultâneas.
- Acesso por assinatura (`full`, `grace`, `billing_only`, `blocked`) é calculado no banco; dados nunca são apagados por vencimento.
- Limites do plano (ex.: nº de profissionais) são aplicados por trigger.
- Assinaturas, planos, cupons, gateways, configurações e membros geram **log de auditoria automático**.
- Chaves de gateway ficam no Supabase Vault; a tabela guarda só a referência.
