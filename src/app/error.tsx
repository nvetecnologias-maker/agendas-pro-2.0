"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="grid min-h-svh place-items-center bg-navy px-6 text-center">
      <div className="grid max-w-sm justify-items-center gap-4">
        <h1 className="text-2xl font-semibold text-halo">Algo deu errado</h1>
        <p className="text-sm text-muted-foreground">Tente de novo. Se continuar, fale com o suporte{error.digest ? ` e informe o código ${error.digest}` : ""}.</p>
        <Button size="lg" onClick={reset}>Tentar de novo</Button>
      </div>
    </main>
  );
}
