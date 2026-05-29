import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const authFlow = url.searchParams.get("auth_flow");
  const next = url.searchParams.get("next") ?? "/app";
  const safeNext = next.startsWith("/") ? next : "/app";
  const supabase = await createSupabaseServerClient();

  if (tokenHash && type) {
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as
        | "signup"
        | "invite"
        | "magiclink"
        | "recovery"
        | "email_change"
        | "email",
    });
  } else if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (authFlow === "signup") {
    await supabase.auth.signOut();
    const redirectUrl = new URL("/login", url.origin);
    redirectUrl.searchParams.set("confirmed", "1");
    redirectUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
