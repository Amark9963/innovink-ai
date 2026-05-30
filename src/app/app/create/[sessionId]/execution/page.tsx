import Link from "next/link";
import { OperatorShell } from "@/components/enterprise/operator-shell";
import { loadSessionScreenData } from "@/app/app/create/_lib/load-session-screen-data";
import { ExecutionExportButton } from "@/app/app/create/_components/execution-export-button";
import { ExecutionReviewWorkspace } from "@/app/app/create/_components/execution-review-workspace";
import {
  SessionTabs,
  buildWorkspaceHref,
} from "@/app/app/create/_components/session-screen-primitives";

type ExecutionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function ExecutionPage({ params }: ExecutionPageProps) {
  const { sessionId } = await params;
  const { data, programs, selectedWorkspace, user, userName } =
    await loadSessionScreenData(sessionId);

  return (
    <OperatorShell
      activeNav="execution"
      sessionId={sessionId}
      headerTitle="Execution"
      headerSubtitle="Deterministic execution state and live operator signals"
      organizationName={selectedWorkspace.organizationName}
      userName={userName}
      userEmail={user.email}
      workspaces={data.workspaces}
      programs={programs}
      headerActions={
        <>
          <Link
            href={buildWorkspaceHref(sessionId, "execution")}
            className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            Back to AI Workspace
          </Link>
          <ExecutionExportButton />
        </>
      }
      workspacePrimaryMode
      mainClassName="overflow-hidden"
    >
      <div className="flex h-full flex-col bg-[#07101f]">
        <SessionTabs sessionId={sessionId} active="execution" data={data} />
        <ExecutionReviewWorkspace sessionId={sessionId} data={data} programs={programs} />
      </div>
    </OperatorShell>
  );
}
