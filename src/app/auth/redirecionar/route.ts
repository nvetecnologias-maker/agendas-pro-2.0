import { NextResponse, type NextRequest } from "next/server";
import { getSession, homePathFor } from "@/lib/auth/session";

/** Decide o destino conforme o perfil: Super Admin, onboarding ou painel */
export async function GET(request: NextRequest) {
  const ctx = await getSession();
  const to = request.nextUrl.clone();
  to.search = "";
  to.pathname = ctx ? homePathFor(ctx) : "/entrar";
  return NextResponse.redirect(to);
}
