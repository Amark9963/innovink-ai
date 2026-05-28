import { redirect } from "next/navigation";
import { SetupShell } from "@/components/enterprise/setup-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrNull, hasWorkspaceAccess } from "@/lib/supabase/queries";
import { OnboardingForm } from "@/app/app/onboarding/onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  if (await hasWorkspaceAccess(supabase, user)) {
    redirect("/app/dashboard");
  }

  return (
    <SetupShell
      title="Create your first governed workspace"
      description="Set up the initial organization and workspace that will anchor Innovink tenant access, role-aware operator surfaces, and the first AI-driven program workflow."
      progressLabel="Step 1 of 4"
      steps={[
        {
          label: "Organization Profile",
          description: "Create the tenant and owner scope",
          status: "active",
        },
        {
          label: "Program Types",
          description: "Enable supported program families",
          status: "pending",
        },
        {
          label: "Team & Roles",
          description: "Invite colleagues and assign access",
          status: "pending",
        },
        {
          label: "Integrations",
          description: "Configure email and connected systems",
          status: "pending",
        },
      ]}
      preview={
        <div className="space-y-3">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5e7088]">
            Workspace Preview
          </div>
          <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
            <div className="mb-2 text-[12px] font-semibold text-[#eae5dc]">
              Governance foundation
            </div>
            <div className="text-[11px] leading-5 text-[#9baabf]">
              This step creates the organization, owner membership, workspace, and
              active workspace-admin membership in one trusted transaction.
            </div>
          </div>
          <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
            <div className="mb-2 text-[12px] font-semibold text-[#eae5dc]">
              Next surfaces
            </div>
            <div className="space-y-1.5 text-[11.5px] text-[#9baabf]">
              <div>• AI program workspace</div>
              <div>• Template-aware program creation</div>
              <div>• Approval-gated launch assets</div>
            </div>
          </div>
          <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
            <div className="mb-2 text-[12px] font-semibold text-[#eae5dc]">
              Auth model
            </div>
            <div className="text-[11px] leading-5 text-[#9baabf]">
              Supabase Auth is already active. Once this workspace exists, operators
              land in the PM dashboard and can begin AI-led program setup.
            </div>
          </div>
        </div>
      }
    >
      <OnboardingForm />
    </SetupShell>
  );
}
