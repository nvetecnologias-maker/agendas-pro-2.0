import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST para evitar logout acidental por prefetch de links
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const to = request.nextUrl.clone();
  to.pathname = "/entrar";
  to.search = "";
  return NextResponse.redirect(to, { status: 303 });
}
