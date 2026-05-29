"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "create-account" | "magic-link";

const HEADING: Record<AuthMode, string> = {
  "sign-in": "Welcome back",
  "create-account": "Create your account",
  "magic-link": "Magic link sign-in",
};

const SUBHEADING: Record<AuthMode, string> = {
  "sign-in": "Sign in to your Innovink workspace.",
  "create-account": "Set up your Innovink workspace account.",
  "magic-link": "Enter your work email to receive a secure link.",
};

const SUBMIT_LABEL: Record<AuthMode, string> = {
  "sign-in": "Sign in to Innovink",
  "create-account": "Create account",
  "magic-link": "Send magic link",
};

export function LoginClient({
  nextPath,
  confirmed = false,
}: {
  nextPath: string;
  confirmed?: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  function switchMode(next: AuthMode) {
    setMode(next);
    setMessage(null);
    setErrorMessage(null);
  }

  async function handleSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "").trim();

    setMessage(null);
    setErrorMessage(null);

    if (!email) {
      setErrorMessage("Work email is required.");
      return;
    }

    startTransition(async () => {
      if (mode === "magic-link") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?auth_flow=magic-link&next=${encodeURIComponent(nextPath)}`,
          },
        });
        if (error) { setErrorMessage(mapAuthErrorMessage(error.message, mode)); return; }
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
            data: { full_name: fullName || undefined },
            emailRedirectTo: `${window.location.origin}/auth/callback?auth_flow=signup&next=${encodeURIComponent(nextPath)}`,
          },
        });
        if (error) { setErrorMessage(mapAuthErrorMessage(error.message, mode)); return; }
        setMessage("Account created. Check your email to confirm the session.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setErrorMessage(mapAuthErrorMessage(error.message, mode)); return; }
      router.push(nextPath);
      router.refresh();
    });
  }

  const ssoMessage = "Enterprise SSO rollout is not enabled yet. Use email sign-in for now.";

  return (
    <section className="overflow-hidden rounded-[24px] border border-white/[0.09] bg-[linear-gradient(168deg,rgba(15,24,42,0.99),rgba(8,14,28,1))] shadow-[0_24px_72px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)]">
      {/* Gold top accent */}
      <div className="h-[2px] bg-[linear-gradient(90deg,transparent_0%,#9a7822_15%,#d6b15c_45%,#d6b15c_55%,#9a7822_85%,transparent_100%)]" />

      <div className="px-8 py-8">

        {/* Heading */}
        <div className="mb-7">
          <h2 className="text-[28px] font-semibold tracking-[-0.035em] text-[#f0ece4]">
            {HEADING[mode]}
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[#4a6278]">
            {SUBHEADING[mode]}
          </p>
        </div>

        {/* Confirmed banner */}
        {confirmed && (
          <div className="mb-6 rounded-[12px] border border-[#2d7a5840] bg-[#2d7a581a] px-4 py-3 text-[13px] leading-5 text-[#9ad0b7]">
            Email confirmed. Sign in to continue.
          </div>
        )}

        {/* SSO — single column */}
        <div className="mb-6 space-y-2">
          <SsoButton
            label="Continue with Microsoft Azure AD"
            icon={<MicrosoftIcon />}
            onClick={() => { setMessage(ssoMessage); setErrorMessage(null); }}
          />
          <SsoButton
            label="Continue with Okta"
            icon={<OktaIcon />}
            onClick={() => { setMessage(ssoMessage); setErrorMessage(null); }}
          />
          <SsoButton
            label="Continue with Google Workspace"
            icon={<GoogleIcon />}
            onClick={() => { setMessage(ssoMessage); setErrorMessage(null); }}
          />
        </div>

        {/* Divider */}
        <div className="mb-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-[#2e4255] before:h-px before:flex-1 before:bg-white/[0.07] after:h-px after:flex-1 after:bg-white/[0.07]">
          <span>{mode === "magic-link" ? "or magic link" : "or sign in with email"}</span>
        </div>

        {/* Form */}
        <form action={handleSubmit} className="space-y-4">
          <FormField label="Work email">
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="w-full rounded-[12px] border border-white/[0.08] bg-[#07111f] px-4 py-3.5 text-[14px] text-[#f0ece4] outline-none transition-all placeholder:text-[#2e4255] focus:border-[#b08a2860] focus:bg-[#091628] focus:shadow-[0_0_0_3px_rgba(176,138,40,0.10)]"
            />
          </FormField>

          {mode === "create-account" && (
            <FormField label="Full name">
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Your full name"
                className="w-full rounded-[12px] border border-white/[0.08] bg-[#07111f] px-4 py-3.5 text-[14px] text-[#f0ece4] outline-none transition-all placeholder:text-[#2e4255] focus:border-[#b08a2860] focus:bg-[#091628] focus:shadow-[0_0_0_3px_rgba(176,138,40,0.10)]"
              />
            </FormField>
          )}

          {mode !== "magic-link" && (
            <FormField label="Password">
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  placeholder={mode === "sign-in" ? "Enter your password" : "Create a strong password"}
                  className="w-full rounded-[12px] border border-white/[0.08] bg-[#07111f] px-4 py-3.5 pr-12 text-[14px] text-[#f0ece4] outline-none transition-all placeholder:text-[#2e4255] focus:border-[#b08a2860] focus:bg-[#091628] focus:shadow-[0_0_0_3px_rgba(176,138,40,0.10)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#2e4255] transition hover:text-[#7a90ab]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon />
                </button>
              </div>
            </FormField>
          )}

          {/* Mode switcher + forgot */}
          <div className="flex items-center justify-between pt-0.5 text-[12.5px]">
            <button
              type="button"
              onClick={() =>
                switchMode(mode === "sign-in" ? "create-account" : mode === "create-account" ? "magic-link" : "sign-in")
              }
              className="text-[#4a6278] transition hover:text-[#9fb1c7]"
            >
              {mode === "sign-in"
                ? "Need an account?"
                : mode === "create-account"
                  ? "Use magic link instead"
                  : "Use password instead"}
            </button>
            {mode !== "create-account" && (
              <Link href="/login" className="text-[#4a6278] transition hover:text-[#9fb1c7]">
                Forgot password?
              </Link>
            )}
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="rounded-[12px] border border-[#9b3a3a4a] bg-[#9b3a3a16] px-4 py-3 text-[13px] leading-5 text-[#f1bcbc]">
              {errorMessage}
            </div>
          )}

          {/* Message */}
          {message && (
            <div className="rounded-[12px] border border-[#2d7a5840] bg-[#2d7a581a] px-4 py-3 text-[13px] leading-5 text-[#9ad0b7]">
              {message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#b08a28] px-4 py-3.5 text-[14px] font-semibold text-[#06100f] transition-all hover:bg-[#c49a35] hover:shadow-[0_4px_24px_rgba(176,138,40,0.32)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPending ? (
              <>
                <SpinnerIcon />
                Working&hellip;
              </>
            ) : (
              <>
                {SUBMIT_LABEL[mode]}
                <ArrowIcon />
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#3a5268]">
        {label}
      </div>
      {children}
    </div>
  );
}

function SsoButton({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[12px] border border-white/[0.07] bg-[#0c1a2e] px-4 py-3 text-[13px] font-medium text-[#6a8099] transition hover:border-white/[0.13] hover:bg-[#112035] hover:text-[#bdd0e2]"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      <ChevronRightIcon />
    </button>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" fill="none" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function OktaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#007DC1" />
      <circle cx="12" cy="12" r="5" fill="white" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden className="animate-spin">
      <path d="M12 2v4" />
      <path d="M12 18v4" opacity="0.3" />
      <path d="M4.93 4.93l2.83 2.83" opacity="0.6" />
      <path d="M16.24 16.24l2.83 2.83" opacity="0.3" />
      <path d="M2 12h4" opacity="0.5" />
      <path d="M18 12h4" opacity="0.3" />
      <path d="M4.93 19.07l2.83-2.83" opacity="0.4" />
      <path d="M16.24 7.76l2.83-2.83" opacity="0.3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
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
      return "Supabase has temporarily throttled signup confirmation emails. Wait a few minutes before creating another account, or sign in with an existing account instead.";
    }
    if (mode === "magic-link") {
      return "Supabase has temporarily throttled magic-link emails. Wait a few minutes before requesting another, or use password sign-in if the account already exists.";
    }
  }

  if (normalized.includes("email not confirmed")) {
    return "This account exists but the email is not confirmed yet. Open the last confirmation email, or wait a moment before requesting another.";
  }

  return message;
}
