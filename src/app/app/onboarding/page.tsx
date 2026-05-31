import { redirect } from "next/navigation";
import { OnboardingForm } from "@/app/app/onboarding/onboarding-form";
import { SetupShell } from "@/components/enterprise/setup-shell";
import { getCurrentUserOrNull, getInitialOnboardingState } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const onboarding = await getInitialOnboardingState(supabase, user);

  if (onboarding.isComplete) {
    redirect("/app/create");
  }

  return (
    <SetupShell
      title="Create your Innovink workspace"
      description="Set up your organization and workspace in one step. Innova will guide your first program from here."
      preview={
        <div className="space-y-3">
          <div className="mb-4 text-[9px] font-bold uppercase tracking-[.14em] text-[var(--ws-gold-bright)]">
            What unlocks next
          </div>

          <div className="rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-4 py-4">
            <div className="mb-1.5 text-[12px] font-semibold text-[var(--ws-t-primary)]">
              AI Workspace
            </div>
            <div className="text-[11px] leading-5 text-[var(--ws-t-secondary)]">
              Your primary home. Describe any program in natural language — Innova structures the brief, plan, and approval flow.
            </div>
          </div>

          <div className="rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-4 py-4">
            <div className="mb-1.5 text-[12px] font-semibold text-[var(--ws-t-primary)]">
              Governed execution
            </div>
            <div className="text-[11px] leading-5 text-[var(--ws-t-secondary)]">
              AI drafts and recommends. You approve. Deterministic backend services execute — nothing goes live without your sign-off.
            </div>
          </div>

          <div className="rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-4 py-4">
            <div className="mb-1.5 text-[12px] font-semibold text-[var(--ws-t-primary)]">
              Full lifecycle in one place
            </div>
            <div className="text-[11px] leading-5 text-[var(--ws-t-secondary)]">
              From first brief to live program — registration, judging, communications, and reporting — all from one operating surface.
            </div>
          </div>

          <p className="pt-2 text-[10.5px] text-[var(--ws-t-muted)]">
            Timezone, program types, and governance settings can all be adjusted later in workspace settings.
          </p>
        </div>
      }
    >
      <OnboardingForm />
    </SetupShell>
  );
}
