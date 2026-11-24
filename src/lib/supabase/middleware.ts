import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

const PROTECTED = ["/painel", "/onboarding", "/super-admin"];
const AUTH_PAGES = ["/entrar", "/cadastro", "/recuperar-senha"];

/**
 * Renova a sessão a cada requisição e faz a 1ª barreira de rotas.
 * A autorização definitiva (papel, barbearia, assinatura) acontece no
 * servidor de cada área e, por fim, na RLS do banco.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() valida o token no servidor do Supabase (não confia só no cookie)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.some((p) => path === p);

  if (isProtected && !user) {
    const to = request.nextUrl.clone();
    to.pathname = "/entrar";
    to.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(to);
  }

  if (isAuthPage && user) {
    const to = request.nextUrl.clone();
    to.pathname = "/auth/redirecionar";
    to.search = "";
    return NextResponse.redirect(to);
  }

  return response;
}
