import { OperatorShell } from "@/components/enterprise/operator-shell";
import { loadSessionScreenData } from "@/app/app/create/_lib/load-session-screen-data";
import { ExecutionExportButton } from "@/app/app/create/_components/execution-export-button";
import { ExecutionReviewWorkspace } from "@/app/app/create/_components/execution-review-workspace";

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
      headerActions={<ExecutionExportButton />}
      mainClassName="overflow-hidden"
    >
      <ExecutionReviewWorkspace sessionId={sessionId} data={data} programs={programs} />
    </OperatorShell>
  );
}
