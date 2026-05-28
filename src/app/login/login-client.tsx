"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "create-account" | "magic-link";

const PRIMARY_LABELS: Record<AuthMode, string> = {
  "sign-in": "Sign in to Innovink",
  "create-account": "Create account",
  "magic-link": "Send magic link",
};

export function LoginClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

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
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
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
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
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

      router.push(nextPath);
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-[16px] border border-white/10 bg-[#162034] shadow-[0_16px_48px_rgba(0,0,0,0.65)]">
      <div className="h-[2px] bg-[linear-gradient(90deg,#b08a28,#ccaa4a_50%,transparent)]" />
      <div className="px-8 py-8">
        <div className="mb-[26px] flex items-center justify-center gap-[11px]">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#b08a2838] bg-[#b08a2810] text-[15px] font-bold text-[#ccaa4a]">
            IN
          </div>
          <div>
            <div className="text-[18px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
              Innovink
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#b08a28]">
              Enterprise Platform
            </div>
          </div>
        </div>

        <div className="mb-[22px] text-center">
          <div className="mb-[5px] text-[21px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
            Welcome back
          </div>
          <div className="text-[13px] text-[#9baabf]">
            Sign in to your organization&apos;s workspace
          </div>
        </div>

        <div className="mb-5 flex items-center gap-2 rounded-md border border-white/7 bg-[#1b2840] px-[14px] py-[9px]">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#b08a2810] text-[10px] font-bold text-[#ccaa4a]">
            A
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-[#eae5dc]">Innovink Workspace</div>
            <div className="text-[10.5px] text-[#5e7088]">Enterprise · Email sign-in enabled</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setMode("magic-link");
              setMessage("Use your work email to request a secure magic link.");
              setErrorMessage(null);
            }}
            className="text-[11px] text-[#9baabf] transition hover:text-[#eae5dc]"
          >
            Change →
          </button>
        </div>

        <div className="space-y-2">
          <SsoButton
            label="Continue with Microsoft Azure AD"
            icon="MS"
            accent="bg-[#0078D4]"
            onClick={() => {
              setMode("sign-in");
              setMessage("Enterprise SSO rollout is not enabled in this environment yet. Use email sign-in for now.");
              setErrorMessage(null);
            }}
          />
          <SsoButton
            label="Continue with Okta"
            icon="O"
            accent="bg-[#007DC1]"
            onClick={() => {
              setMode("sign-in");
              setMessage("Enterprise SSO rollout is not enabled in this environment yet. Use email sign-in for now.");
              setErrorMessage(null);
            }}
          />
          <SsoButton
            label="Continue with Google Workspace"
            icon="G"
            accent="bg-[#4285F4]"
            onClick={() => {
              setMode("sign-in");
              setMessage("Enterprise SSO rollout is not enabled in this environment yet. Use email sign-in for now.");
              setErrorMessage(null);
            }}
          />
        </div>

        <div className="my-[18px] flex items-center gap-[10px] text-[11.5px] text-[#5e7088] before:h-px before:flex-1 before:bg-white/10 after:h-px after:flex-1 after:bg-white/10">
          <span>or sign in with email</span>
        </div>

        <form action={handleSubmit} className="space-y-5">
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
              placeholder="team@company.com"
              className="w-full rounded-md border border-white/10 bg-[#0a1422] px-4 py-3 text-sm text-[#eae5dc] outline-none transition placeholder:text-[#5e7088] focus:border-[#b08a28]"
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
                placeholder="Amark Singh"
                className="w-full rounded-md border border-white/10 bg-[#0a1422] px-4 py-3 text-sm text-[#eae5dc] outline-none transition placeholder:text-[#5e7088] focus:border-[#b08a28]"
              />
            </div>
          ) : null}

          {mode !== "magic-link" ? (
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-[#9baabf]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  placeholder={mode === "sign-in" ? "Enter your password" : "Use a strong password"}
                  className="w-full rounded-md border border-white/10 bg-[#0a1422] px-4 py-3 pr-11 text-sm text-[#eae5dc] outline-none transition placeholder:text-[#5e7088] focus:border-[#b08a28]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[#5e7088] transition hover:text-[#9baabf]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon />
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setMode(
                  mode === "sign-in" ? "create-account" : mode === "create-account" ? "magic-link" : "sign-in",
                );
                setMessage(null);
                setErrorMessage(null);
              }}
              className="text-[12px] text-[#9baabf] transition hover:text-[#eae5dc]"
            >
              {mode === "sign-in"
                ? "Need an account?"
                : mode === "create-account"
                  ? "Prefer magic link?"
                  : "Use password instead"}
            </button>
            <Link href="/login" className="text-[12px] text-[#9baabf] transition hover:text-[#eae5dc]">
              Forgot password?
            </Link>
          </div>

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
            className="flex w-full items-center justify-center rounded-md bg-[#b08a28] px-4 py-3 text-sm font-semibold text-[#06100f] transition hover:bg-[#ccaa4a] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Working..." : PRIMARY_LABELS[mode]}
          </button>

          <div className="mt-[18px] flex flex-wrap items-center justify-center gap-3 border-t border-white/7 pt-4 text-[9.5px] tracking-[0.02em] text-[#5e7088]">
            <TrustItem label="256-bit TLS" />
            <TrustSeparator />
            <TrustItem label="SOC 2 Type II" />
            <TrustSeparator />
            <TrustItem label="ISO 27001" />
            <TrustSeparator />
            <span>GDPR Compliant</span>
          </div>
        </form>
      </div>
    </section>
  );
}

function SsoButton({
  label,
  icon,
  accent,
  onClick,
}: {
  label: string;
  icon: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-[10px] rounded-md border border-white/10 bg-[#1b2840] px-[14px] py-[10px] text-left text-[13px] text-[#9baabf] transition hover:border-white/20 hover:bg-[#22314b] hover:text-[#eae5dc]"
    >
      <div className={`flex h-[22px] w-[22px] items-center justify-center rounded text-[11px] font-bold text-white ${accent}`}>
        {icon}
      </div>
      <span className="flex-1">{label}</span>
      <span aria-hidden className="text-[14px]">
        →
      </span>
    </button>
  );
}

function TrustItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1">
      <ShieldIcon />
      <span>{label}</span>
    </div>
  );
}

function TrustSeparator() {
  return <span className="h-[10px] w-px bg-white/7" aria-hidden />;
}

function ShieldIcon() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 1L2 4v4c0 4 6 7 6 7s6-3 6-7V4L8 1z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
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
