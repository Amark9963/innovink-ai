import { OperatorShell } from "@/components/enterprise/operator-shell";
import { AssetsReviewWorkspace } from "@/app/app/create/_components/assets-review-workspace";
import { SessionTabs } from "@/app/app/create/_components/session-screen-primitives";
import { loadSessionScreenData } from "@/app/app/create/_lib/load-session-screen-data";
import { getApprovalRequestItems } from "@/lib/supabase/queries";

type AssetsPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
  searchParams?: Promise<{
    asset?: string;
    category?: string;
    status?: string;
    view?: string;
    tab?: string;
  }>;
};

export default async function DraftAssetsPage({
  params,
  searchParams,
}: AssetsPageProps) {
  const { sessionId } = await params;
  const query = (await searchParams) ?? {};
  const { supabase, data, programs, selectedWorkspace, user, userName } =
    await loadSessionScreenData(sessionId);

  const latestApproval = data.approvals[0] ?? null;
  const approvalItems = latestApproval
    ? await getApprovalRequestItems(supabase, latestApproval.id)
    : [];

  return (
    <OperatorShell
      activeNav="draft-assets"
      sessionId={sessionId}
      headerTitle="Draft Assets"
      headerSubtitle="Governed launch-kit review before approvals"
      organizationName={selectedWorkspace.organizationName}
      userName={userName}
      userEmail={user.email}
      workspaces={data.workspaces}
      programs={programs}
      mainClassName="overflow-hidden"
    >
      <div className="flex h-full flex-col bg-[#07101f]">
        <SessionTabs sessionId={sessionId} active="assets" data={data} />
        <AssetsReviewWorkspace
          sessionId={sessionId}
          data={data}
          approvalItems={approvalItems}
          selectedAssetKey={typeof query.asset === "string" ? query.asset : null}
          category={normalizeCategory(query.category)}
          statusFilter={normalizeStatus(query.status)}
          view={normalizeView(query.view)}
          detailTab={normalizeTab(query.tab)}
        />
      </div>
    </OperatorShell>
  );
}

function normalizeCategory(value?: string) {
  switch (value) {
    case "comms":
    case "landing":
    case "forms":
    case "reports":
    case "operations":
      return value;
    default:
      return "all";
  }
}

function normalizeStatus(value?: string) {
  switch (value) {
    case "draft":
    case "in_review":
    case "approved":
      return value;
    default:
      return "all";
  }
}

function normalizeView(value?: string) {
  return value === "list" ? "list" : "grid";
}

function normalizeTab(value?: string) {
  switch (value) {
    case "edit":
    case "history":
      return value;
    default:
      return "preview";
  }
}
