import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Página não encontrada · Agendas Pro" };

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-navy bg-[radial-gradient(80%_60%_at_50%_0%,rgba(36,103,242,0.25),transparent_70%)] px-6 text-center">
      <div className="grid max-w-sm justify-items-center gap-4">
        <Logo />
        <p className="font-mono text-6xl font-semibold text-sky">404</p>
        <h1 className="text-2xl font-semibold text-halo">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">O endereço pode ter mudado. Se você procurava uma barbearia, confira o link com ela.</p>
        <Link href="/" className={buttonVariants({ size: "lg" })}>Voltar ao início</Link>
      </div>
    </main>
  );
}
