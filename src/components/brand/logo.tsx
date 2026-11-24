import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Identidade do Agendas Pro.
 * - LogoMark: símbolo compacto (calendário com confirmação), usado em favicon e ícones de app
 * - Logo: símbolo + nome (versão principal)
 * Arquivos estáticos equivalentes ficam em /public/brand.
 */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id={`ap-mark-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B7BFF" />
          <stop offset="0.55" stopColor="#2467F2" />
          <stop offset="1" stopColor="#083DA9" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#ap-mark-${id})`} />
      <rect x="7.5" y="9" width="17" height="15.5" rx="3.2" fill="none" stroke="#fff" strokeWidth="2.2" />
      <path d="M7.5 13.6h17" stroke="#fff" strokeWidth="2.2" />
      <path d="M12 6.8v4M20 6.8v4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12.2 19.1l2.6 2.5 5-5" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {withText && (
        <span className="text-[17px] font-semibold tracking-tight text-halo">
          Agendas<span className="text-sky"> Pro</span>
        </span>
      )}
    </span>
  );
}
