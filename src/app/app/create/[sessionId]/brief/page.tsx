import Link from "next/link";
import { OperatorShell } from "@/components/enterprise/operator-shell";
import { getProgramBriefVersions } from "@/lib/supabase/queries";
import { loadSessionScreenData } from "@/app/app/create/_lib/load-session-screen-data";
import {
  BriefSummaryCard,
  EmptyStateCard,
  SessionTabs,
  StatusBadge,
  VersionsList,
  formatDateTime,
  getArrayStrings,
} from "@/app/app/create/_components/session-screen-primitives";

type BriefPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function ProgramBriefPage({ params }: BriefPageProps) {
  const { sessionId } = await params;
  const { supabase, data, programs, selectedWorkspace, user, userName } =
    await loadSessionScreenData(sessionId);

  const versions = data.brief
    ? await getProgramBriefVersions(supabase, data.brief.id)
    : [];

  return (
    <OperatorShell
      activeNav="program-brief"
      sessionId={sessionId}
      headerTitle="Program Brief"
      headerSubtitle="AI-generated operating brief for approval"
      organizationName={selectedWorkspace.organizationName}
      userName={userName}
      userEmail={user.email}
      workspaces={data.workspaces}
      programs={programs}
      headerActions={
        <Link
          href={`/app/create?session=${sessionId}`}
          className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/5 hover:text-[#eae5dc]"
        >
          Back to chat
        </Link>
      }
      rightPanel={
        <div className="flex h-full flex-col">
          <div className="border-b border-white/7 px-4 py-4">
            <div className="text-[13px] font-semibold text-[#eae5dc]">Version history</div>
            <div className="mt-1 text-[11px] text-[#5e7088]">
              Structured brief revisions and AI confidence
            </div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {versions.length > 0 ? (
              <VersionsList versions={versions} activeVersionId={data.brief?.activeVersionId ?? null} />
            ) : (
              <EmptyStateCard text="Version history will appear here once Innova creates and updates the brief." />
            )}

            <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b08a28]">
                AI suggestions
              </div>
              {data.brief && getArrayStrings(data.brief.assumptions).length > 0 ? (
                <div className="space-y-3">
                  {getArrayStrings(data.brief.assumptions).slice(0, 3).map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-lg border border-white/7 bg-[#111e30] p-3">
                      <div className="text-[12px] font-semibold text-[#eae5dc]">
                        Assumption {index + 1}
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-[#9baabf]">{item}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyStateCard text="Once the brief evolves, Innova will surface assumptions and refinement suggestions here." />
              )}
            </div>
          </div>
        </div>
      }
    >
      <div className="flex h-full flex-col bg-[#07101f]">
        <SessionTabs sessionId={sessionId} active="brief" data={data} />

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-4 flex items-center gap-2 text-[11px] text-[#5e7088]">
            <Link href="/app/dashboard" className="hover:text-[#9baabf]">
              Programs
            </Link>
            <span>›</span>
            <span className="hover:text-[#9baabf]">{data.brief?.title ?? "Program workspace"}</span>
            <span>›</span>
            <span className="text-[#9baabf]">Program Brief</span>
          </div>

          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
                Program Brief
              </h1>
              <p className="mt-2 text-[12px] text-[#9baabf]">
                AI-generated · last updated {formatDateTime(data.brief?.updatedAt ?? null)}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/app/create?session=${sessionId}`}
                className="rounded-md border border-white/10 px-4 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
              >
                Edit in chat
              </Link>
              <Link
                href={`/app/create/${sessionId}/plan`}
                className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
              >
                Review plan →
              </Link>
            </div>
          </div>

          <div className="mb-5 rounded-lg border border-[#b08a2838] bg-[#b08a2810] px-4 py-3 text-[12px] text-[#e4d8b4]">
            Innova pre-filled this brief from the current chat session. Review the operating details before moving into plan review and approvals.
          </div>

          {data.brief ? (
            <>
              <div className="mb-5 rounded-xl border border-white/7 bg-[#111e30] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-[12.5px] font-medium text-[#eae5dc]">Brief completeness</div>
                  <div className="text-[13px] font-semibold text-[#ccaa4a]">
                    {briefCompleteness(data.brief)}%
                  </div>
                </div>
                <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-[#b08a28]"
                    style={{ width: `${briefCompleteness(data.brief)}%` }}
                  />
                </div>
                <div className="text-[11px] text-[#9baabf]">
                  Confidence: <span className="text-[#eae5dc]">{data.brief.confidenceLevel}</span> · Status:{" "}
                  <span className="text-[#eae5dc]">{data.brief.status}</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/7 bg-[#162034]">
                <section className="border-b border-white/7 p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold text-[#eae5dc]">Program Identity</div>
                      <div className="mt-1 text-[11px] text-[#5e7088]">Core setup and scope definition</div>
                    </div>
                    <StatusBadge tone="green">current</StatusBadge>
                  </div>
                  <BriefSummaryCard brief={data.brief} />
                </section>

                <section className="border-b border-white/7 p-5">
                  <div className="mb-3 text-[13px] font-semibold text-[#eae5dc]">Open Questions</div>
                  {Array.isArray(data.brief.openQuestions) && data.brief.openQuestions.length > 0 ? (
                    <div className="space-y-3">
                      {(data.brief.openQuestions as Array<Record<string, unknown>>).map((question, index) => (
                        <article key={`question-${index}`} className="rounded-lg border border-white/7 bg-[#111e30] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[12.5px] font-semibold text-[#eae5dc]">
                                {typeof question.question === "string"
                                  ? question.question
                                  : `Question ${index + 1}`}
                              </div>
                              {typeof question.whyItMatters === "string" ? (
                                <p className="mt-2 text-[11.5px] leading-6 text-[#9baabf]">
                                  {question.whyItMatters}
                                </p>
                              ) : null}
                            </div>
                            <StatusBadge tone="amber">
                              {typeof question.priority === "string" ? question.priority : "open"}
                            </StatusBadge>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyStateCard text="The brief is currently complete enough for planning. No unresolved operator questions remain." />
                  )}
                </section>

                <section className="p-5">
                  <div className="mb-3 text-[13px] font-semibold text-[#eae5dc]">AI Assumptions</div>
                  {getArrayStrings(data.brief.assumptions).length > 0 ? (
                    <div className="space-y-3">
                      {getArrayStrings(data.brief.assumptions).map((assumption, index) => (
                        <div key={`${assumption}-${index}`} className="rounded-lg border border-white/7 bg-[#111e30] p-4 text-[11.5px] leading-6 text-[#9baabf]">
                          {assumption}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyStateCard text="No material assumptions are currently attached to this brief." />
                  )}
                </section>
              </div>
            </>
          ) : (
            <EmptyStateCard text="This session does not have a structured brief yet. Continue the conversation in the AI workspace to generate one." />
          )}
        </div>
      </div>
    </OperatorShell>
  );
}

function briefCompleteness(brief: Awaited<ReturnType<typeof loadSessionScreenData>>["data"]["brief"]) {
  if (!brief) {
    return 0;
  }

  const base = 72;
  const questionPenalty = Array.isArray(brief.openQuestions) ? Math.min(18, brief.openQuestions.length * 6) : 0;
  const assumptionBonus = getArrayStrings(brief.assumptions).length > 0 ? 6 : 0;

  return Math.max(40, Math.min(98, base + assumptionBonus - questionPenalty));
}
