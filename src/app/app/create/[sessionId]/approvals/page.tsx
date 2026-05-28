import { OperatorShell } from "@/components/enterprise/operator-shell";
import { getApprovalRequestItems } from "@/lib/supabase/queries";
import { loadSessionScreenData } from "@/app/app/create/_lib/load-session-screen-data";
import {
  ApprovalActions,
  ApprovalItemsList,
  EmptyStateCard,
  SessionTabs,
  StatusBadge,
  formatDateTime,
} from "@/app/app/create/_components/session-screen-primitives";

type ApprovalsPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function ApprovalsPage({ params }: ApprovalsPageProps) {
  const { sessionId } = await params;
  const { supabase, data, programs, selectedWorkspace, user, userName } =
    await loadSessionScreenData(sessionId);

  const selectedApproval = data.approvals[0] ?? null;
  const approvalItems = selectedApproval
    ? await getApprovalRequestItems(supabase, selectedApproval.id)
    : [];

  const pendingCount = data.approvals.filter((item) => item.status === "pending").length;
  const resolvedCount = data.approvals.length - pendingCount;

  return (
    <OperatorShell
      activeNav="approvals"
      sessionId={sessionId}
      headerTitle="Approvals"
      headerSubtitle="Human review gate before deterministic execution"
      organizationName={selectedWorkspace.organizationName}
      userName={userName}
      userEmail={user.email}
      workspaces={data.workspaces}
      programs={programs}
    >
      <div className="flex h-full flex-col bg-[#07101f]">
        <SessionTabs sessionId={sessionId} active="approvals" data={data} />

        <div className="grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)] overflow-hidden">
          <aside className="overflow-y-auto border-r border-white/7 bg-[#0c1525] px-4 py-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
              Pending · {pendingCount}
            </div>
            {data.approvals.length > 0 ? (
              <>
                {data.approvals.map((approval, index) => (
                  <article
                    key={approval.id}
                    className={`mb-3 rounded-xl border p-4 ${
                      index === 0
                        ? "border-[#b08a2838] bg-[#b08a2810]"
                        : approval.status === "pending"
                          ? "border-white/7 bg-[#111e30]"
                          : "border-white/7 bg-[#111e30] opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${
                          approval.riskLevel === "high"
                            ? "bg-[#d86a6a]"
                            : approval.riskLevel === "medium"
                              ? "bg-[#ccaa4a]"
                              : "bg-[#6e88a5]"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold text-[#eae5dc]">
                          {approval.title}
                        </div>
                        <div className="mt-1 text-[11px] text-[#9baabf]">
                          {approval.summary ?? "Approval packet ready for operator review."}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <StatusBadge tone={approval.status === "pending" ? "amber" : "green"}>
                            {approval.status}
                          </StatusBadge>
                          <div className="text-[10px] text-[#5e7088]">
                            {formatDateTime(approval.requestedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                <div className="mt-6 mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
                  Resolved · {resolvedCount}
                </div>
                {data.approvals
                  .filter((approval) => approval.status !== "pending")
                  .map((approval) => (
                    <article key={`resolved-${approval.id}`} className="mb-3 rounded-xl border border-white/7 bg-[#111e30] p-4 opacity-70">
                      <div className="text-[12px] font-semibold text-[#eae5dc]">{approval.title}</div>
                      <div className="mt-1 text-[10.5px] text-[#5e7088]">
                        Reviewed {formatDateTime(approval.reviewedAt)}
                      </div>
                    </article>
                  ))}
              </>
            ) : (
              <EmptyStateCard text="Approval packets will appear here once the execution plan is ready and sent for review." />
            )}
          </aside>

          <main className="overflow-y-auto px-6 py-6">
            {selectedApproval ? (
              <>
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
                        {selectedApproval.title}
                      </h1>
                      <StatusBadge tone={selectedApproval.status === "pending" ? "amber" : "green"}>
                        {selectedApproval.status}
                      </StatusBadge>
                    </div>
                    <p className="text-[12px] text-[#9baabf]">
                      Submitted {formatDateTime(selectedApproval.requestedAt)} · risk {selectedApproval.riskLevel}
                    </p>
                  </div>
                  <div className="min-w-[220px]">
                    <ApprovalActions sessionId={sessionId} approval={selectedApproval} />
                  </div>
                </div>

                <div className="mb-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
                    <div className="text-[10px] uppercase tracking-[0.06em] text-[#5e7088]">Scope</div>
                    <div className="mt-2 text-[13px] font-semibold text-[#eae5dc]">
                      {data.brief?.title ?? "Program workspace"}
                    </div>
                    <div className="mt-1 text-[11px] text-[#9baabf]">Brief-bound approval packet</div>
                  </div>
                  <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
                    <div className="text-[10px] uppercase tracking-[0.06em] text-[#5e7088]">Impact</div>
                    <div className="mt-2 text-[13px] font-semibold text-[#eae5dc]">
                      {approvalItems.length} governed items
                    </div>
                    <div className="mt-1 text-[11px] text-[#9baabf]">Execution will stay deterministic after review</div>
                  </div>
                  <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
                    <div className="text-[10px] uppercase tracking-[0.06em] text-[#5e7088]">Reviewer state</div>
                    <div className="mt-2 text-[13px] font-semibold text-[#eae5dc]">
                      {selectedApproval.status === "pending" ? "Awaiting PM decision" : "Decision captured"}
                    </div>
                    <div className="mt-1 text-[11px] text-[#9baabf]">
                      {selectedApproval.reviewedAt
                        ? `Reviewed ${formatDateTime(selectedApproval.reviewedAt)}`
                        : "No decision recorded yet"}
                    </div>
                  </div>
                </div>

                <div className="mb-5 rounded-xl border border-white/7 bg-[#162034] p-5">
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
                    Approval Context
                  </div>
                  <p className="text-[12px] leading-6 text-[#9baabf]">
                    {selectedApproval.summary ??
                      "This approval packet represents the current execution plan outputs that Innova wants to move into deterministic platform execution."}
                  </p>
                </div>

                <div className="rounded-xl border border-white/7 bg-[#162034] p-5">
                  <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
                    Approval Items
                  </div>
                  {approvalItems.length > 0 ? (
                    <ApprovalItemsList items={approvalItems} />
                  ) : (
                    <EmptyStateCard text="This approval request does not yet have itemized child records. The packet summary is still available for review." />
                  )}
                </div>
              </>
            ) : (
              <EmptyStateCard text="No approval packet is available yet. Generate the plan and prepare the approval packet first." />
            )}
          </main>
        </div>
      </div>
    </OperatorShell>
  );
}
