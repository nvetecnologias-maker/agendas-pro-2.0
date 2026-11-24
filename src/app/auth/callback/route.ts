import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/session";

/**
 * Destino dos links enviados por e-mail (confirmação de conta e recuperação
 * de senha). Troca o código por uma sessão e redireciona.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;

  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const to = url.clone();
  to.search = "";
  if (ok) {
    to.pathname = next;
  } else {
    to.pathname = "/entrar";
    to.searchParams.set("erro", "link_invalido");
  }
  return NextResponse.redirect(to);
}
