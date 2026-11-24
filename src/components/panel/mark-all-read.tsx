"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markNoticesReadAction } from "@/app/painel/(app)/avisos/actions";

export function MarkAllRead({ shopId }: { shopId: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <Button variant="subtle" size="sm" loading={pending} onClick={() => start(async () => { await markNoticesReadAction(shopId); router.refresh(); })}>
      <CheckCheck /> Marcar como lidos
    </Button>
  );
}
