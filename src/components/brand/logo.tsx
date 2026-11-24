import { cn } from "@/lib/utils";

/** Marca provisória do Agendas Pro (símbolo: calendário + lâmina) */
export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="ap-logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#75B5FF" />
            <stop offset="0.55" stopColor="#2467F2" />
            <stop offset="1" stopColor="#02006F" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#ap-logo-g)" />
        <rect x="1.5" y="1.5" width="29" height="29" rx="8.5" fill="none" stroke="rgba(255,255,255,0.35)" />
        <path d="M9 12.5h14M12 8v3M20 8v3" stroke="#F7F3FF" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M10.5 22.5 21.5 16" stroke="#F7F3FF" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="11" cy="17" r="1.6" fill="#F7F3FF" />
      </svg>
      {withText && (
        <span className="text-[17px] font-semibold tracking-tight text-halo">
          Agendas<span className="text-sky"> Pro</span>
        </span>
      )}
    </span>
  );
}
