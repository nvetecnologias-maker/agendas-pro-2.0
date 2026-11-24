"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarPlus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { Customer } from "@/types/database";
import { CustomerForm } from "./customers-client";

export function CustomerHeaderActions({ customer }: { customer: Customer }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex">
      <Button variant="subtle" onClick={() => setOpen(true)}><Pencil /> Editar</Button>
      <Button asChild><Link href={`/painel/agendamentos?novo=1&cliente=${customer.id}`}><CalendarPlus /> Agendar</Link></Button>
      <Sheet open={open} onOpenChange={setOpen}>{open && <CustomerForm c={customer} onDone={() => setOpen(false)} />}</Sheet>
    </div>
  );
}
