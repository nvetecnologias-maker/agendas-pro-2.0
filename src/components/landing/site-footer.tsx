import Link from "next/link";
import { LifeBuoy, Mail, MessageCircle, Phone } from "lucide-react";
import { COMPANY, LEGAL_ROUTES } from "@/lib/legal";
import { Logo } from "@/components/brand/logo";
import type { PublicPlatformInfo } from "@/services/public-site";

// ícones simples em traço (lucide não inclui logotipos de marcas)
const svg = (d: React.ReactNode) =>
  function SocialIcon({ className }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        {d}
      </svg>
    );
  };
const SOCIAL_ICONS: Record<string, ReturnType<typeof svg>> = {
  instagram: svg(<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></>),
  facebook: svg(<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8a0 0 0 0 1 0 0Z" />),
  youtube: svg(<><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="m10 9.5 5 2.5-5 2.5Z" fill="currentColor" /></>),
  linkedin: svg(<><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" /></>),
};

export function SiteFooter({ info }: { info: PublicPlatformInfo }) {
  const socials = Object.entries(info.social_links ?? {}).filter(([k, v]) => SOCIAL_ICONS[k] && /^https:\/\//.test(v));
  const whatsapp = info.contact_whatsapp?.replace(/\D/g, "");

  return (
    <footer className="border-t border-border bg-[#020817] pb-28 xl:pb-0">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="grid content-start gap-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Sistema de agendamento online e gestão para barbearias: agenda, equipe, serviços, clientes e financeiro.
          </p>
          {socials.length > 0 && (
            <ul className="flex gap-2">
              {socials.map(([k, url]) => {
                const Icon = SOCIAL_ICONS[k];
                return (
                  <li key={k}>
                    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={k} className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground hover:border-sky/40 hover:text-halo">
                      <Icon className="size-4" aria-hidden />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <FooterCol title="Produto">
          <FooterLink href="/#funcionalidades">Funcionalidades</FooterLink>
          <FooterLink href="/#como-funciona">Como funciona</FooterLink>
          <FooterLink href="/#planos">Planos</FooterLink>
          <FooterLink href="/#faq">Perguntas frequentes</FooterLink>
        </FooterCol>

        <FooterCol title="Conta">
          <FooterLink href="/cadastro">Criar conta</FooterLink>
          <FooterLink href="/entrar">Entrar</FooterLink>
          <FooterLink href="/recuperar-senha">Recuperar senha</FooterLink>
        </FooterCol>

        <FooterCol title="Institucional">
          <FooterLink href={LEGAL_ROUTES.terms}>Termos de Uso</FooterLink>
          <FooterLink href={LEGAL_ROUTES.privacy}>Política de Privacidade</FooterLink>
          <li><Link href={LEGAL_ROUTES.support} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-halo"><LifeBuoy className="size-3.5" aria-hidden /> Suporte</Link></li>
          {info.support_email ? (
            <li><a href={`mailto:${info.support_email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-halo"><Mail className="size-3.5" aria-hidden /> Contato</a></li>
          ) : (
            <li><Link href={`${LEGAL_ROUTES.support}#contato`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-halo"><Mail className="size-3.5" aria-hidden /> Contato</Link></li>
          )}
          {whatsapp && (
            <li><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-halo"><MessageCircle className="size-3.5" aria-hidden /> WhatsApp</a></li>
          )}
          {info.contact_phone && (
            <li><a href={`tel:${info.contact_phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-halo"><Phone className="size-3.5" aria-hidden /> {info.contact_phone}</a></li>
          )}
        </FooterCol>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 text-xs text-subtle-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {info.platform_name}. Todos os direitos reservados.</p>
          <p>
            {info.platform_name}: agendamento online e gestão para barbearias
            {COMPANY.legalName && <> · {COMPANY.legalName}</>}
            {COMPANY.cnpj && <> · CNPJ {COMPANY.cnpj}</>}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-halo">{title}</p>
      <ul className="mt-4 grid gap-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-muted-foreground transition-colors hover:text-halo">{children}</Link>
    </li>
  );
}
