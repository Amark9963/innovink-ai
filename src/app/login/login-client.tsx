"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "create-account" | "magic-link";

const MODE_LABELS: Record<AuthMode, string> = {
  "sign-in": "Sign in",
  "create-account": "Create account",
  "magic-link": "Magic link",
};

export function LoginClient() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "").trim();

    setMessage(null);
    setErrorMessage(null);

    if (!email) {
      setErrorMessage("Email is required.");
      return;
    }

    startTransition(async () => {
      if (mode === "magic-link") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
          },
        });

        if (error) {
          setErrorMessage(mapAuthErrorMessage(error.message, mode));
          return;
        }

        setMessage("Magic link sent. Open the email on this device to continue.");
        return;
      }

      if (!password) {
        setErrorMessage("Password is required for this flow.");
        return;
      }

      if (mode === "create-account") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || undefined,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
          },
        });

        if (error) {
          setErrorMessage(mapAuthErrorMessage(error.message, mode));
          return;
        }

        setMessage("Account created. Check your email to confirm the session.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(mapAuthErrorMessage(error.message, mode));
        return;
      }

      router.push("/app");
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-[16px] border border-white/10 bg-[#162034] shadow-[0_16px_48px_rgba(0,0,0,0.65)]">
      <div className="h-[2px] bg-[linear-gradient(90deg,#b08a28,#ccaa4a_50%,transparent)]" />
      <div className="px-8 py-8">
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#b08a2838] bg-[#b08a2810] text-[15px] font-bold text-[#ccaa4a]">
            IN
          </div>
          <div>
            <div className="text-[18px] font-semibold text-[#eae5dc]">Innovink</div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#b08a28]">
              Enterprise Platform
            </div>
          </div>
        </div>

        <div className="mb-5 text-center">
          <div className="mb-1 text-[21px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
            Welcome back
          </div>
          <div className="text-[13px] text-[#9baabf]">
            Sign in to your organization&apos;s workspace
          </div>
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-md border border-white/7 bg-[#1b2840] px-3.5 py-[9px]">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#b08a2810] text-[10px] font-bold text-[#ccaa4a]">
            IN
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-[#eae5dc]">Innovink Workspace</div>
            <div className="text-[10.5px] text-[#5e7088]">
              Supabase Auth · Email/password and magic link
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-white/7 pb-4">
        {(Object.keys(MODE_LABELS) as AuthMode[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setMode(item);
              setMessage(null);
              setErrorMessage(null);
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              mode === item
                ? "bg-[#b08a28] text-[#07101f]"
                : "bg-[#1b2840] text-[#9baabf] hover:text-[#eae5dc]"
            }`}
          >
            {MODE_LABELS[item]}
          </button>
        ))}
      </div>

      <form action={handleSubmit} className="mt-6 space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-[#9baabf]">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-white/10 bg-[#0a1422] px-4 py-3 text-sm text-[#eae5dc] outline-none transition placeholder:text-[#5e7088] focus:border-[#b08a28]"
            placeholder="team@company.com"
          />
        </div>

        {mode === "create-account" ? (
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium text-[#9baabf]">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              className="w-full rounded-md border border-white/10 bg-[#0a1422] px-4 py-3 text-sm text-[#eae5dc] outline-none transition placeholder:text-[#5e7088] focus:border-[#b08a28]"
              placeholder="Amark Singh"
            />
          </div>
        ) : null}

        {mode !== "magic-link" ? (
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-[#9baabf]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              required
              className="w-full rounded-md border border-white/10 bg-[#0a1422] px-4 py-3 text-sm text-[#eae5dc] outline-none transition placeholder:text-[#5e7088] focus:border-[#b08a28]"
              placeholder="Use a strong password"
            />
          </div>
        ) : null}

        {errorMessage ? (
          <p className="rounded-md border border-[#9b3a3a66] bg-[#9b3a3a1a] px-4 py-3 text-sm text-[#f1bcbc]">
            {errorMessage}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-md border border-[#2d7a5840] bg-[#2d7a581a] px-4 py-3 text-sm text-[#9ad0b7]">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-[#b08a28] px-4 py-3 text-sm font-semibold text-[#06100f] transition hover:bg-[#ccaa4a] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Working..." : MODE_LABELS[mode]}
        </button>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 border-t border-white/7 pt-4 text-[9.5px] tracking-[0.02em] text-[#5e7088]">
          <span>256-bit TLS</span>
          <span className="h-[10px] w-px bg-white/7" />
          <span>Invite-aware onboarding</span>
          <span className="h-[10px] w-px bg-white/7" />
          <span>RLS enforced</span>
        </div>
      </form>
      </div>
    </section>
  );
}

function mapAuthErrorMessage(message: string, mode: AuthMode) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("email rate limit exceeded") ||
    normalized.includes("rate limit") ||
    normalized.includes("over_email_send_rate_limit")
  ) {
    if (mode === "create-account") {
      return "Supabase has temporarily throttled signup confirmation emails for this project. Wait a few minutes before creating another new account, or sign in with an existing account instead.";
    }

    if (mode === "magic-link") {
      return "Supabase has temporarily throttled magic-link emails for this project. Wait a few minutes before requesting another email, or use password sign-in if the account already exists.";
    }
  }

  if (normalized.includes("email not confirmed")) {
    return "This account exists but the email session is not confirmed yet. Open the last confirmation email for this address, or wait a moment before requesting another one.";
  }

  return message;
}
