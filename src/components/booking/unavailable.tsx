import Link from "next/link";
import { CalendarOff } from "lucide-react";

export function Unavailable({ name, logo }: { name: string; logo: string | null }) {
  return (
    <main className="grid min-h-svh place-items-center bg-ink px-6 text-center text-halo">
      <div className="max-w-sm">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="mx-auto size-20 rounded-2xl object-cover" />
        ) : (
          <span className="mx-auto grid size-20 place-items-center rounded-2xl bg-white/[0.06] text-sky"><CalendarOff className="size-9" /></span>
        )}
        <h1 className="mt-6 text-2xl font-semibold">{name}</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          A agenda online desta barbearia não está disponível no momento. Entre em contato diretamente com a barbearia para marcar seu horário.
        </p>
        <Link href="/" className="mt-8 inline-block text-[13px] text-subtle-foreground">Agendas Pro</Link>
      </div>
    </main>
  );
}
