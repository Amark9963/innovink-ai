import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { resolveRedirectOrigin } from "@/lib/auth/redirect-origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const headerStore = await headers();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const authFlow = url.searchParams.get("auth_flow");
  const next = url.searchParams.get("next") ?? "/app";
  const safeNext = next.startsWith("/") ? next : "/app";
  const redirectOrigin = resolveRedirectOrigin({
    requestUrl: request.url,
    forwardedHost: headerStore.get("x-forwarded-host"),
    forwardedProto: headerStore.get("x-forwarded-proto"),
    host: headerStore.get("host"),
  });
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
    const redirectUrl = new URL("/login", redirectOrigin);
    redirectUrl.searchParams.set("confirmed", "1");
    redirectUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(new URL(safeNext, redirectOrigin));
}
