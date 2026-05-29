import { redirect } from "next/navigation";
import { OnboardingForm } from "@/app/app/onboarding/onboarding-form";
import { OperatingDefaultsForm } from "@/app/app/onboarding/operating-defaults-form";
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
    redirect("/app/dashboard");
  }

  const isDefaultsStep = onboarding.hasWorkspaceAccess;

  return (
    <SetupShell
      title={
        isDefaultsStep
          ? "Set your workspace operating defaults"
          : "Create your initial governed workspace"
      }
      description={
        isDefaultsStep
          ? "Define the starting defaults that shape templates, governance behavior, and participant setup for your first Innovink workspace."
          : "Set up the first organization and workspace that will anchor Innovink tenant access, role-aware operator surfaces, and the AI-led program workflow."
      }
      progressLabel={isDefaultsStep ? "Step 2 of 2" : "Step 1 of 2"}
      steps={[
        {
          label: "Workspace Foundation",
          description: "Create the tenant, owner scope, and first workspace",
          status: isDefaultsStep ? "done" : "active",
        },
        {
          label: "Operating Defaults",
          description: "Set default timezone, program types, and governance behavior",
          status: isDefaultsStep ? "active" : "pending",
        },
      ]}
      preview={
        <div className="space-y-3">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5e7088]">
            {isDefaultsStep ? "Defaults Preview" : "Workspace Preview"}
          </div>

          <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
            <div className="mb-2 text-[12px] font-semibold text-[#eae5dc]">
              {isDefaultsStep ? "Saved foundation" : "Governance foundation"}
            </div>
            <div className="text-[11px] leading-5 text-[#9baabf]">
              {isDefaultsStep
                ? `Workspace ${onboarding.primaryWorkspace?.workspaceName ?? "foundation"} is ready. This step adds the defaults that guide template selection and governance behavior.`
                : "This step creates the organization, owner membership, workspace, and active workspace-admin membership in one trusted transaction."}
            </div>
          </div>

          <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
            <div className="mb-2 text-[12px] font-semibold text-[#eae5dc]">
              {isDefaultsStep ? "What these defaults shape" : "What unlocks next"}
            </div>
            <div className="space-y-1.5 text-[11.5px] text-[#9baabf]">
              {isDefaultsStep ? (
                <>
                  <div>&bull; Default program templates</div>
                  <div>&bull; Participant registration behavior</div>
                  <div>&bull; Publish approval expectations</div>
                </>
              ) : (
                <>
                  <div>&bull; PM dashboard and operator shell</div>
                  <div>&bull; AI program workspace</div>
                  <div>&bull; Template-aware program creation</div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
            <div className="mb-2 text-[12px] font-semibold text-[#eae5dc]">
              {isDefaultsStep ? "After this step" : "Operator access"}
            </div>
            <div className="text-[11px] leading-5 text-[#9baabf]">
              {isDefaultsStep
                ? "Innovink will route you into the PM dashboard with the tenant foundation and operating defaults both in place."
                : "Supabase Auth is already active. Once this workspace exists, operators continue into the default-governance step before the PM dashboard opens."}
            </div>
          </div>
        </div>
      }
    >
      {isDefaultsStep ? <OperatingDefaultsForm /> : <OnboardingForm />}
    </SetupShell>
  );
}
