import Link from "next/link";
import { OperatorShell } from "@/components/enterprise/operator-shell";
import { ApprovalsReviewWorkspace } from "@/app/app/create/_components/approvals-review-workspace";
import {
  SessionTabs,
  buildWorkspaceHref,
} from "@/app/app/create/_components/session-screen-primitives";
import { loadSessionScreenData } from "@/app/app/create/_lib/load-session-screen-data";
import { getApprovalRequestItems } from "@/lib/supabase/queries";

type ApprovalsPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
  searchParams?: Promise<{
    approval?: string;
    filter?: string;
  }>;
};

export default async function ApprovalsPage({ params, searchParams }: ApprovalsPageProps) {
  const { sessionId } = await params;
  const query = (await searchParams) ?? {};
  const { supabase, data, programs, selectedWorkspace, user, userName } =
    await loadSessionScreenData(sessionId);

  const selectedApproval =
    data.approvals.find((approval) => approval.id === query.approval) ?? data.approvals[0] ?? null;
  const approvalItems = selectedApproval
    ? await getApprovalRequestItems(supabase, selectedApproval.id)
    : [];
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
      headerActions={
        <Link
          href={buildWorkspaceHref(sessionId, "approvals")}
          className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
        >
          Back to AI Workspace
        </Link>
      }
      workspacePrimaryMode
    >
      <div className="flex h-full flex-col bg-[#07101f]">
        <SessionTabs sessionId={sessionId} active="approvals" data={data} />

        {data.approvals.length > 0 ? (
          <ApprovalsReviewWorkspace
            sessionId={sessionId}
            approvals={data.approvals}
            selectedApprovalId={selectedApproval?.id ?? null}
            selectedItems={approvalItems}
            requestChangesHref={buildCreateHref(
              sessionId,
              "The approval packet needs changes. Please review the current governed items, incorporate the reviewer feedback, and generate a revised packet.",
            )}
            filterQueryParam={query.filter ?? null}
          />
        ) : (
          <div className="px-6 py-6">
            <div className="rounded-lg border border-dashed border-white/10 bg-[#162034] px-4 py-4 text-[12px] leading-6 text-[#9baabf]">
              No approval packet is available yet. Generate the plan and prepare the approval packet first.
            </div>
          </div>
        )}
      </div>
    </OperatorShell>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ApprovalTabs({
  sessionId,
  pendingCount,
  executionCount,
  planReady,
}: {
  sessionId: string;
  pendingCount: number;
  executionCount: number;
  planReady: boolean;
}) {
  const tabs = [
    { label: "Back to AI Workspace", href: `/app/create?session=${sessionId}` },
    { label: "Brief", href: `/app/create/${sessionId}/brief`, badge: "✓" },
    { label: "Plan", href: `/app/create/${sessionId}/plan`, badge: planReady ? "✓" : null },
    { label: "Assets", href: `/app/create/${sessionId}/assets` },
    { label: "Approvals", href: `/app/create/${sessionId}/approvals`, count: pendingCount || null },
    { label: "Execution", href: `/app/create/${sessionId}/execution`, count: executionCount || null },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-white/7 bg-[#0c1525] px-5">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          className={`flex h-11 items-center gap-2 border-b-2 px-3 text-[12px] transition ${
            tab.label === "Approvals"
              ? "border-b-[#b08a28] font-semibold text-[#ccaa4a]"
              : "border-b-transparent text-[#9baabf] hover:text-[#eae5dc]"
          }`}
        >
          <span>{tab.label}</span>
          {tab.badge ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2d7a58] px-1 text-[9px] font-bold text-white">
              {tab.badge}
            </span>
          ) : null}
          {tab.count ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#b08a28] px-1 text-[9px] font-bold text-[#07101f]">
              {tab.count}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

function buildCreateHref(sessionId: string, prompt: string) {
  return `/app/create?session=${sessionId}&prompt=${encodeURIComponent(prompt)}`;
}
