import { NextResponse, type NextRequest } from "next/server";
import { requirePanelAction } from "@/lib/panel/context";
import { addDays, formatDateTime, isValidDay, zonedToUtc } from "@/lib/datetime";
import { METHOD_LABEL } from "@/lib/appointments/status";

/** Exporta os pagamentos do período em CSV (abre no Excel/Planilhas) */
export async function GET(req: NextRequest) {
  const panel = await requirePanelAction("finance.view");
  const de = req.nextUrl.searchParams.get("de");
  const ate = req.nextUrl.searchParams.get("ate");
  if (!isValidDay(de) || !isValidDay(ate)) return NextResponse.json({ error: "Período inválido" }, { status: 400 });

  const { data } = await panel.supabase
    .from("payments")
    .select("paid_at, amount_cents, method, status, notes, customer:customers(name, phone), service:services(name), professional:professionals(name)")
    .eq("barbershop_id", panel.shop.id)
    .gte("paid_at", zonedToUtc(de, "00:00", panel.tz).toISOString())
    .lt("paid_at", zonedToUtc(addDays(ate, 1), "00:00", panel.tz).toISOString())
    .order("paid_at")
    .limit(10000);

  // CSV com ; (padrão do Excel em português) e proteção contra injeção de fórmulas
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const rows = [
    ["Data", "Valor (R$)", "Forma", "Situação", "Cliente", "Telefone", "Serviço", "Profissional", "Observação"],
    ...(data ?? []).map((p) => [
      formatDateTime(p.paid_at, panel.tz),
      (p.amount_cents / 100).toFixed(2).replace(".", ","),
      METHOD_LABEL[p.method],
      p.status === "refunded" ? "Estornado" : "Recebido",
      p.customer?.name, p.customer?.phone, p.service?.name, p.professional?.name, p.notes,
    ]),
  ];
  const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-${de}-a-${ate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
