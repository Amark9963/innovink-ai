import Link from "next/link";
import { OperatorShell } from "@/components/enterprise/operator-shell";
import { generateProgramPlanAction, prepareApprovalRequestAction } from "@/app/app/create/actions";
import { loadSessionScreenData } from "@/app/app/create/_lib/load-session-screen-data";
import {
  EmptyStateCard,
  PayloadHighlights,
  PlanItemsList,
  SessionTabs,
  StatusBadge,
  formatDateTime,
  getArrayStrings,
} from "@/app/app/create/_components/session-screen-primitives";

type PlanPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function ExecutionPlanPage({ params }: PlanPageProps) {
  const { sessionId } = await params;
  const { data, programs, selectedWorkspace, user, userName } =
    await loadSessionScreenData(sessionId);

  const canGeneratePlan =
    data.brief &&
    (data.brief.status === "collecting_requirements" ||
      data.brief.status === "ready_for_plan" ||
      data.brief.status === "plan_generated") &&
    !data.plan;
  const canPrepareApprovals = data.plan && data.approvals.length === 0;

  return (
    <OperatorShell
      activeNav="execution-plan"
      sessionId={sessionId}
      headerTitle="Execution Plan"
      headerSubtitle="Structured delivery phases and approval requirements"
      organizationName={selectedWorkspace.organizationName}
      userName={userName}
      userEmail={user.email}
      workspaces={data.workspaces}
      programs={programs}
      headerActions={
        <div className="flex gap-2">
          <Link
            href={`/app/create/${sessionId}/brief`}
            className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/5 hover:text-[#eae5dc]"
          >
            View brief
          </Link>
          <Link
            href={`/app/create/${sessionId}/approvals`}
            className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/5 hover:text-[#eae5dc]"
          >
            Review approvals
          </Link>
        </div>
      }
      rightPanel={
        <div className="flex h-full flex-col">
          <div className="border-b border-white/7 px-4 py-4">
            <div className="text-[13px] font-semibold text-[#eae5dc]">Plan insights</div>
            <div className="mt-1 text-[11px] text-[#5e7088]">
              Timeline, risks, and approval dependencies
            </div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b08a28]">
                Summary
              </div>
              {data.plan ? (
                <>
                  <div className="text-[15px] font-semibold text-[#eae5dc]">
                    {data.plan.title ?? "Execution plan"}
                  </div>
                  {data.plan.summary ? (
                    <p className="mt-2 text-[11.5px] leading-6 text-[#9baabf]">{data.plan.summary}</p>
                  ) : null}
                  <div className="mt-4 space-y-2 text-[11px] text-[#9baabf]">
                    <div>Created {formatDateTime(data.plan.createdAt)}</div>
                    <div>Status: {data.plan.status}</div>
                    <div>Items: {data.planItems.length}</div>
                  </div>
                </>
              ) : (
                <EmptyStateCard text="Generate the plan from the brief to unlock the phase breakdown and approvals." />
              )}
            </div>

            <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b08a28]">
                Approval requirements
              </div>
              {data.plan && getArrayStrings(data.plan.approvalRequirements).length > 0 ? (
                <div className="space-y-2">
                  {getArrayStrings(data.plan.approvalRequirements).map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-lg border border-white/7 bg-[#111e30] px-3 py-3 text-[11px] leading-5 text-[#9baabf]">
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyStateCard text="Approval requirements will appear here once the plan is generated and analyzed." />
              )}
            </div>

            <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b08a28]">
                Assumptions
              </div>
              {data.plan && getArrayStrings(data.plan.assumptions).length > 0 ? (
                <div className="space-y-2">
                  {getArrayStrings(data.plan.assumptions).map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-lg border border-white/7 bg-[#111e30] px-3 py-3 text-[11px] leading-5 text-[#9baabf]">
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyStateCard text="No explicit assumptions have been attached to the current plan." />
              )}
            </div>
          </div>
        </div>
      }
    >
      <div className="flex h-full flex-col bg-[#07101f]">
        <SessionTabs sessionId={sessionId} active="plan" data={data} />

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-5 rounded-lg border border-[#b08a2838] bg-[#b08a2810] px-4 py-3 text-[12px] text-[#e4d8b4]">
            Innova uses the approved brief to map deterministic work into phased setup items. Review the plan before you open the approval packet.
          </div>

          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
                Execution Plan
              </h1>
              <p className="mt-2 text-[12px] text-[#9baabf]">
                Auto-generated by Innova · last updated {formatDateTime(data.plan?.updatedAt ?? null)}
              </p>
            </div>
            <div className="flex gap-2">
              {canGeneratePlan ? (
                <form action={generateProgramPlanAction}>
                  <input type="hidden" name="sessionId" value={sessionId} />
                  <button
                    type="submit"
                    className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                  >
                    Generate Plan
                  </button>
                </form>
              ) : null}
              {canPrepareApprovals ? (
                <form action={prepareApprovalRequestAction}>
                  <input type="hidden" name="sessionId" value={sessionId} />
                  <button
                    type="submit"
                    className="rounded-md bg-[#2d7a58] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#3e9a70]"
                  >
                    Prepare Approval Packet
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          {data.plan ? (
            <>
              <div className="mb-6 rounded-xl border border-white/7 bg-[#162034] p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="text-[16px] font-semibold text-[#eae5dc]">
                    {data.plan.title ?? "Execution plan"}
                  </div>
                  <StatusBadge tone="gold">{data.plan.status}</StatusBadge>
                  <StatusBadge tone="muted">{data.planItems.length} items</StatusBadge>
                </div>
                {data.plan.summary ? (
                  <p className="text-[12px] leading-6 text-[#9baabf]">{data.plan.summary}</p>
                ) : null}
                <PayloadHighlights payload={data.plan.planPayload} />
              </div>

              <PlanItemsList items={data.planItems} />
            </>
          ) : (
            <EmptyStateCard text="The plan has not been generated yet. Continue refining the brief or generate the plan from this screen." />
          )}
        </div>
      </div>
    </OperatorShell>
  );
}
