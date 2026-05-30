import Link from "next/link";
import { prepareApprovalRequestAction } from "@/app/app/create/actions";
import type { Json } from "@/lib/supabase/database.types";
import type {
  AgentCreateWorkspaceData,
  AgentArtifactSummary,
  ApprovalRequestItemSummary,
  ExecutionRunStepSummary,
  ProgramPlanItemSummary,
} from "@/lib/supabase/queries";
import { cn } from "@/lib/utils/cn";

type AssetCategory = "all" | "comms" | "landing" | "forms" | "reports" | "operations";
type AssetStatusFilter = "all" | "draft" | "in_review" | "approved";
type AssetView = "grid" | "list";
export type AssetDetailTab = "preview" | "edit" | "history";

type AssetsReviewWorkspaceProps = {
  sessionId: string;
  data: AgentCreateWorkspaceData;
  approvalItems: ApprovalRequestItemSummary[];
  selectedAssetKey: string | null;
  category: AssetCategory;
  statusFilter: AssetStatusFilter;
  view: AssetView;
  detailTab: AssetDetailTab;
};

export type DerivedAsset = {
  id: string;
  itemKey: string;
  title: string;
  description: string | null;
  category: Exclude<AssetCategory, "all">;
  typeLabel: string;
  previewGlyph: string;
  previewTitle: string;
  previewBody: string;
  status: "draft" | "in_review" | "approved";
  statusLabel: string;
  statusTone: "muted" | "amber" | "green";
  meta: string;
  dateLabel: string;
  artifactPayload: Json | null;
  regeneratePrompt: string;
  editPrompt: string;
  editorSurface: "landing-page" | "registration-form" | "submission-form" | "judging" | "sponsor-report" | null;
};

export function AssetsReviewWorkspace({
  sessionId,
  data,
  approvalItems,
  selectedAssetKey,
  category,
  statusFilter,
  view,
  detailTab,
}: AssetsReviewWorkspaceProps) {
  const assets = deriveAssets(
    data.planItems,
    approvalItems,
    data.latestExecutionSteps,
    data.artifacts,
  );
  const selectedAsset =
    assets.find((asset) => asset.itemKey === selectedAssetKey) ?? assets[0] ?? null;
  const linkedProgramId = data.brief?.programId ?? null;

  const visibleAssets = assets.filter((asset) => {
    if (category !== "all" && asset.category !== category) {
      return false;
    }

    if (statusFilter !== "all" && asset.status !== statusFilter) {
      return false;
    }

    return true;
  });

  const counts = {
    all: assets.length,
    comms: assets.filter((asset) => asset.category === "comms").length,
    landing: assets.filter((asset) => asset.category === "landing").length,
    forms: assets.filter((asset) => asset.category === "forms").length,
    reports: assets.filter((asset) => asset.category === "reports").length,
    operations: assets.filter((asset) => asset.category === "operations").length,
    draft: assets.filter((asset) => asset.status === "draft").length,
    in_review: assets.filter((asset) => asset.status === "in_review").length,
    approved: assets.filter((asset) => asset.status === "approved").length,
  };

  const approvalReady = data.approvals.length > 0;

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_380px] overflow-hidden">
      <main className="overflow-y-auto px-6 py-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-[18px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
              Draft Assets
            </div>
            <div className="mt-1 text-[12px] text-[#9baabf]">
              {assets.length} assets derived from the current plan · {counts.in_review + counts.draft} pending review
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={buildCreateHref(
                sessionId,
                "Generate an additional program asset from the current plan and make sure it aligns with the existing launch kit.",
              )}
              className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
            >
              Generate Asset
            </Link>
            {approvalReady ? (
              <Link
                href={`/app/create/${sessionId}/approvals`}
                className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
              >
                Review Approvals →
              </Link>
            ) : (
              <form action={prepareApprovalRequestAction}>
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="redirectTo" value="approvals" />
                <button
                  type="submit"
                  className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                >
                  Send for Approval
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[#5e7088]">Filter:</span>
          {(
            [
              ["all", "All"],
              ["comms", "Comms"],
              ["landing", "Landing"],
              ["forms", "Forms"],
              ["reports", "Reports"],
              ["operations", "Ops"],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href={buildAssetRoute(sessionId, {
                asset: selectedAsset?.itemKey ?? null,
                category: key,
                status: statusFilter,
                view,
                tab: detailTab,
              })}
              className={filterChip(category === key)}
            >
              {label} ({counts[key]})
            </Link>
          ))}

          <div className="ml-auto flex flex-wrap gap-2">
            {(
              [
                ["draft", "Draft"],
                ["in_review", "In Review"],
                ["approved", "Approved"],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                href={buildAssetRoute(sessionId, {
                  asset: selectedAsset?.itemKey ?? null,
                  category,
                  status: statusFilter === key ? "all" : key,
                  view,
                  tab: detailTab,
                })}
                className={filterChip(statusFilter === key)}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-5 flex items-center justify-end gap-2">
          <Link
            href={buildAssetRoute(sessionId, {
              asset: selectedAsset?.itemKey ?? null,
              category,
              status: statusFilter,
              view: "grid",
              tab: detailTab,
            })}
            className={viewButton(view === "grid")}
          >
            Grid
          </Link>
          <Link
            href={buildAssetRoute(sessionId, {
              asset: selectedAsset?.itemKey ?? null,
              category,
              status: statusFilter,
              view: "list",
              tab: detailTab,
            })}
            className={viewButton(view === "list")}
          >
            List
          </Link>
        </div>

        {visibleAssets.length > 0 ? (
          view === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {visibleAssets.map((asset) => (
                <Link
                  key={asset.id}
                  href={
                    selectedAsset?.itemKey === asset.itemKey
                      ? buildAssetDetailRoute(sessionId, asset.itemKey, "preview")
                      : buildAssetRoute(sessionId, {
                          asset: asset.itemKey,
                          category,
                          status: statusFilter,
                          view,
                          tab: detailTab,
                        })
                  }
                  className={cn(
                    "overflow-hidden rounded-xl border bg-[#111e30] transition hover:border-white/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
                    selectedAsset?.itemKey === asset.itemKey
                      ? "border-[#b08a28] shadow-[0_0_0_1px_#b08a28]"
                      : "border-white/10",
                  )}
                >
                  <div className="relative flex h-[130px] items-center justify-center bg-[linear-gradient(135deg,#0c1525,#162034)] text-[32px]">
                    <span className="absolute left-2 top-2">
                      <AssetStatusBadge tone={asset.statusTone}>{asset.statusLabel}</AssetStatusBadge>
                    </span>
                    <span className="absolute right-2 top-2 rounded bg-[#07101fb3] px-2 py-1 text-[9px] font-medium text-[#c8d3de]">
                      {asset.typeLabel}
                    </span>
                    <div className="text-center">
                      <div className="text-[28px]">{asset.previewGlyph}</div>
                      <div className="mt-2 text-[10px] font-semibold text-[#ccaa4a]">
                        {asset.previewTitle}
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-[12px] font-medium text-[#eae5dc]">{asset.title}</div>
                    <div className="mt-1 text-[11px] text-[#9baabf]">{asset.meta}</div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <AssetStatusBadge tone={asset.statusTone}>{asset.statusLabel}</AssetStatusBadge>
                      {selectedAsset?.itemKey === asset.itemKey ? (
                        <span className="text-[10px] font-medium text-[#ccaa4a]">Open full asset</span>
                      ) : (
                        <span className="text-[10px] text-[#5e7088]">{asset.dateLabel}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleAssets.map((asset) => (
                <Link
                  key={asset.id}
                  href={
                    selectedAsset?.itemKey === asset.itemKey
                      ? buildAssetDetailRoute(sessionId, asset.itemKey, "preview")
                      : buildAssetRoute(sessionId, {
                          asset: asset.itemKey,
                          category,
                          status: statusFilter,
                          view,
                          tab: detailTab,
                        })
                  }
                  className={cn(
                    "flex items-center gap-4 rounded-xl border bg-[#111e30] p-4 transition hover:border-white/20",
                    selectedAsset?.itemKey === asset.itemKey ? "border-[#b08a28]" : "border-white/10",
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#162034] text-[20px]">
                    {asset.previewGlyph}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-[#eae5dc]">{asset.title}</div>
                    <div className="mt-1 text-[11px] text-[#9baabf]">{asset.description ?? asset.previewBody}</div>
                  </div>
                  <div className="text-right">
                    <AssetStatusBadge tone={asset.statusTone}>{asset.statusLabel}</AssetStatusBadge>
                    <div className="mt-2 text-[10px] text-[#5e7088]">{asset.dateLabel}</div>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 bg-[#162034] px-4 py-4 text-[12px] leading-6 text-[#9baabf]">
            No assets match the current filters yet. Adjust the filters or continue refining the plan in the AI workspace.
          </div>
        )}
      </main>

      <aside className="flex flex-col overflow-hidden border-l border-white/7 bg-[#111e30]">
        {selectedAsset ? (
          <>
            <div className="border-b border-white/7 px-4 py-4">
              <div className="text-[13px] font-semibold text-[#eae5dc]">{selectedAsset.title}</div>
              <div className="mt-1 text-[11px] text-[#9baabf]">
                {selectedAsset.typeLabel} · {selectedAsset.statusLabel} · {selectedAsset.dateLabel}
              </div>
            </div>

            <div className="flex border-b border-white/7 bg-[#0c1525] px-3 pt-3">
              {(
                [
                  ["preview", "Preview"],
                  ["edit", "Edit"],
                  ["history", "History"],
                ] as const
              ).map(([key, label]) => (
                <Link
                  key={key}
                  href={buildAssetRoute(sessionId, {
                    asset: selectedAsset.itemKey,
                    category,
                    status: statusFilter,
                    view,
                    tab: key,
                  })}
                  className={cn(
                    "rounded-t-md px-3 py-2 text-[11.5px]",
                    detailTab === key
                      ? "border border-b-0 border-white/10 bg-[#111e30] font-medium text-[#eae5dc]"
                      : "text-[#5e7088]",
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {detailTab === "preview" ? (
                <div className="rounded-lg bg-[#162034] p-4 text-[12px] leading-7 text-[#c8d3de]">
                  <h3 className="mb-2 text-[13px] font-semibold text-[#eae5dc]">{selectedAsset.previewTitle}</h3>
                  <p className="text-[11px] text-[#9baabf]">{selectedAsset.previewBody}</p>
                  {selectedAsset.description ? (
                    <p className="mt-4 text-[11.5px] leading-6 text-[#c8d3de]">{selectedAsset.description}</p>
                  ) : null}
                  <div className="mt-5 rounded-md border border-[#b08a2838] bg-[#b08a2810] px-3 py-3 text-[11px] text-[#e4d8b4]">
                    Innova generated this asset from the current plan and brief context. Review the content before you open the governed approval packet.
                  </div>
                </div>
              ) : null}

              {detailTab === "edit" ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-white/10 bg-[#162034] p-4">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
                      Edit with Innova
                    </div>
                    <p className="text-[11.5px] leading-6 text-[#9baabf]">
                      Use the AI workspace to regenerate or refine this asset with controlled prompts rather than editing hidden state directly.
                    </p>
                  </div>
                  <Link
                    href={buildCreateHref(sessionId, selectedAsset.editPrompt)}
                    className="block rounded-md border border-white/10 px-3 py-2 text-center text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                  >
                    Open in Innova Chat
                  </Link>
                  <Link
                    href={buildAssetDetailRoute(sessionId, selectedAsset.itemKey, "preview")}
                    className="block rounded-md border border-white/10 px-3 py-2 text-center text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                  >
                    Open full asset
                  </Link>
                  {selectedAsset.editorSurface === "landing-page" && linkedProgramId ? (
                    <Link
                      href={`/app/programs/${linkedProgramId}/landing-page`}
                      className="block rounded-md border border-white/10 px-3 py-2 text-center text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                    >
                      Open landing editor
                    </Link>
                  ) : null}
                  {selectedAsset.editorSurface === "registration-form" && linkedProgramId ? (
                    <Link
                      href={`/app/programs/${linkedProgramId}/registration-form`}
                      className="block rounded-md border border-white/10 px-3 py-2 text-center text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                    >
                      Open registration editor
                    </Link>
                  ) : null}
                  {selectedAsset.editorSurface === "submission-form" && linkedProgramId ? (
                    <Link
                      href={`/app/programs/${linkedProgramId}/submission-form`}
                      className="block rounded-md border border-white/10 px-3 py-2 text-center text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                    >
                      Open submission editor
                    </Link>
                  ) : null}
                  {selectedAsset.editorSurface === "judging" && linkedProgramId ? (
                    <Link
                      href={`/app/programs/${linkedProgramId}/judging`}
                      className="block rounded-md border border-white/10 px-3 py-2 text-center text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                    >
                      Open judging setup
                    </Link>
                  ) : null}
                  {selectedAsset.editorSurface === "sponsor-report" && linkedProgramId ? (
                    <Link
                      href={`/app/programs/${linkedProgramId}/sponsor-report`}
                      className="block rounded-md border border-white/10 px-3 py-2 text-center text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                    >
                      Open sponsor report
                    </Link>
                  ) : null}
                </div>
              ) : null}

              {detailTab === "history" ? (
                <div className="space-y-3">
                  <HistoryBlock label="Current status" value={selectedAsset.statusLabel} />
                  <HistoryBlock label="Asset type" value={selectedAsset.typeLabel} />
                  <HistoryBlock label="Approval packet" value={approvalReady ? "Prepared" : "Not prepared yet"} />
                  <HistoryBlock
                    label="Execution state"
                    value={
                      data.executionRuns.length > 0
                        ? data.executionRuns[0]?.status ?? "No run"
                        : "No deterministic run yet"
                    }
                  />
                </div>
              ) : null}
            </div>

            <div className="flex gap-2 border-t border-white/7 p-4">
              <Link
                href={buildCreateHref(sessionId, selectedAsset.regeneratePrompt)}
                className="rounded-md border border-white/10 px-3 py-2 text-[11.5px] font-semibold text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
              >
                Regenerate
              </Link>
              {approvalReady ? (
                <Link
                  href={`/app/create/${sessionId}/approvals`}
                  className="flex-1 rounded-md bg-[#b08a28] px-3 py-2 text-center text-[11.5px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                >
                  Review Approvals →
                </Link>
              ) : (
                <form action={prepareApprovalRequestAction} className="flex-1">
                  <input type="hidden" name="sessionId" value={sessionId} />
                  <input type="hidden" name="redirectTo" value="approvals" />
                  <button
                    type="submit"
                    className="w-full rounded-md bg-[#b08a28] px-3 py-2 text-center text-[11.5px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                  >
                    Send for Approval
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="p-4 text-[12px] text-[#9baabf]">
            Select an asset to review its draft, operator notes, and approval readiness.
          </div>
        )}
      </aside>
    </div>
  );
}

export function deriveAssets(
  planItems: ProgramPlanItemSummary[],
  approvalItems: ApprovalRequestItemSummary[],
  latestExecutionSteps: ExecutionRunStepSummary[],
  artifacts: AgentArtifactSummary[],
) {
  const approvalMap = new Map(approvalItems.map((item) => [item.itemKey, item]));
  const stepMap = new Map(latestExecutionSteps.map((step) => [step.stepKey, step]));
  const artifactMap = new Map<AgentArtifactSummary["artifactType"], AgentArtifactSummary>();
  for (const artifact of artifacts) {
    if (!artifactMap.has(artifact.artifactType)) {
      artifactMap.set(artifact.artifactType, artifact);
    }
  }

  return planItems
    .filter((item) => assetConfig(item.itemType))
    .map((item) => {
      const config = assetConfig(item.itemType)!;
      const approval = approvalMap.get(item.itemKey) ?? null;
      const step = stepMap.get(item.itemKey) ?? null;
      const artifact = artifactMap.get(item.itemType as AgentArtifactSummary["artifactType"]) ?? null;
      const status: DerivedAsset["status"] =
        step?.status === "completed" || approval?.status === "approved"
          ? "approved"
          : approval?.status === "pending"
            ? "in_review"
            : "draft";

      const statusLabel =
        status === "approved" ? "Approved" : status === "in_review" ? "In Review" : "Draft";
      const statusTone =
        status === "approved" ? "green" : status === "in_review" ? "amber" : "muted";

      return {
        id: item.id,
        itemKey: item.itemKey,
        title: item.title,
        description: item.description,
        category: config.category,
        typeLabel: config.typeLabel,
        previewGlyph: config.previewGlyph,
        previewTitle:
          (typeof artifact?.artifactPayload === "object" &&
          artifact?.artifactPayload &&
          !Array.isArray(artifact.artifactPayload) &&
          typeof (artifact.artifactPayload as Record<string, unknown>).title === "string"
            ? ((artifact.artifactPayload as Record<string, unknown>).title as string)
            : null) ??
          config.previewTitle,
        previewBody: artifact?.summary ?? config.previewBody,
        status,
        statusLabel,
        statusTone,
        meta: buildAssetMeta(config.meta, artifact?.artifactPayload),
        artifactPayload: artifact?.artifactPayload ?? null,
        dateLabel:
          status === "approved"
            ? "Execution ready"
            : status === "in_review"
              ? "Pending packet"
              : artifact?.createdAt
                ? "Draft generated"
                : "Awaiting draft",
        regeneratePrompt: `Regenerate the ${item.title} asset for this program and keep it aligned with the current brief and plan.`,
        editPrompt: `Refine the ${item.title} asset. Keep the program goals the same, but improve clarity, structure, and operator readiness.`,
        editorSurface: config.editorSurface,
      } satisfies DerivedAsset;
    });
}

function buildAssetMeta(
  fallback: string,
  payload: AgentArtifactSummary["artifactPayload"] | undefined,
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return fallback;
  }

  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.sections)) {
    return `${record.sections.length} sections`;
  }

  if (Array.isArray(record.fields)) {
    return `${record.fields.length} fields`;
  }

  if (Array.isArray(record.rounds)) {
    return `${record.rounds.length} rounds`;
  }

  return fallback;
}

function assetConfig(itemType: string) {
  const normalized = itemType.toLowerCase();

  if (normalized.includes("communications")) {
    return {
      category: "comms" as const,
      typeLabel: "EMAIL",
      previewGlyph: "CM",
      previewTitle: "Program Launch Announcement",
      previewBody: "Audience-specific launch communications, reminders, and updates generated from the current plan.",
      meta: "Multi-segment launch comms",
      editorSurface: null,
    };
  }

  if (normalized.includes("landing")) {
    return {
      category: "landing" as const,
      typeLabel: "PAGE",
      previewGlyph: "LP",
      previewTitle: "Public Landing Page",
      previewBody: "Public-facing registration page content, hero framing, and program positioning for launch.",
      meta: "Public landing experience",
      editorSurface: "landing-page" as const,
    };
  }

  if (normalized.includes("registration")) {
    return {
      category: "forms" as const,
      typeLabel: "FORM",
      previewGlyph: "RF",
      previewTitle: "Registration Form",
      previewBody: "Draft intake form structure, eligibility capture, and team-registration flow.",
      meta: "Participant intake flow",
      editorSurface: "registration-form" as const,
    };
  }

  if (normalized.includes("submission")) {
    return {
      category: "forms" as const,
      typeLabel: "FORM",
      previewGlyph: "SF",
      previewTitle: "Submission Form",
      previewBody: "Submission requirements, evidence capture, and team project handoff fields.",
      meta: "Submission requirements",
      editorSurface: "submission-form" as const,
    };
  }

  if (normalized.includes("judging")) {
    return {
      category: "reports" as const,
      typeLabel: "DOC",
      previewGlyph: "JR",
      previewTitle: "Judging Rubric",
      previewBody: "Scoring rubric, judge instructions, and approval-sensitive evaluation setup.",
      meta: "Evaluation package",
      editorSurface: "judging" as const,
    };
  }

  if (normalized.includes("sponsor")) {
    return {
      category: "reports" as const,
      typeLabel: "PDF",
      previewGlyph: "SR",
      previewTitle: "Sponsor Overview Deck",
      previewBody: "Sponsor-safe reporting pack, visibility boundaries, and downstream reporting expectations.",
      meta: "Sponsor reporting",
      editorSurface: "sponsor-report" as const,
    };
  }

  if (
    normalized.includes("mentoring") ||
    normalized.includes("launch_readiness") ||
    normalized.includes("operations_control")
  ) {
    return {
      category: "operations" as const,
      typeLabel: "OPS",
      previewGlyph: "OP",
      previewTitle: "Operations Control Pack",
      previewBody: "Operational readiness rules, pending actions, mentoring setup, and launch-control recommendations.",
      meta: "Operational controls",
      editorSurface: null,
    };
  }

  return null;
}

export function buildAssetRoute(
  sessionId: string,
  state: {
    asset: string | null;
    category: AssetCategory;
    status: AssetStatusFilter;
    view: AssetView;
    tab: AssetDetailTab;
  },
) {
  const params = new URLSearchParams();
  if (state.asset) params.set("asset", state.asset);
  if (state.category !== "all") params.set("category", state.category);
  if (state.status !== "all") params.set("status", state.status);
  if (state.view !== "grid") params.set("view", state.view);
  if (state.tab !== "preview") params.set("tab", state.tab);

  const query = params.toString();
  return `/app/create/${sessionId}/assets${query ? `?${query}` : ""}`;
}

export function buildCreateHref(sessionId: string, prompt: string) {
  return `/app/create?session=${sessionId}&prompt=${encodeURIComponent(prompt)}`;
}

export function buildAssetDetailRoute(
  sessionId: string,
  assetKey: string,
  tab: AssetDetailTab,
) {
  const params = new URLSearchParams();
  if (tab !== "preview") params.set("tab", tab);

  const query = params.toString();
  return `/app/create/${sessionId}/assets/${assetKey}${query ? `?${query}` : ""}`;
}

function filterChip(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1.5 text-[11.5px] transition",
    active
      ? "border-[#b08a2838] bg-[#b08a2810] text-[#ccaa4a]"
      : "border-white/10 bg-[#111e30] text-[#9baabf] hover:border-white/20 hover:text-[#eae5dc]",
  );
}

function viewButton(active: boolean) {
  return cn(
    "rounded-md border px-3 py-2 text-[12px] transition",
    active
      ? "border-white/10 bg-[#111e30] text-[#eae5dc]"
      : "border-white/10 bg-transparent text-[#5e7088] hover:text-[#eae5dc]",
  );
}

export function AssetStatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "muted" | "amber" | "green";
}) {
  return (
    <span
      className={cn(
        "rounded-sm border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em]",
        tone === "green" && "border-[#2d7a5840] bg-[#2d7a5812] text-[#9ad0b7]",
        tone === "amber" && "border-[#c9973a40] bg-[#c9973a12] text-[#e8c26d]",
        tone === "muted" && "border-white/10 bg-white/[0.03] text-[#9baabf]",
      )}
    >
      {children}
    </span>
  );
}

export function HistoryBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#162034] p-4">
      <div className="text-[10px] uppercase tracking-[0.06em] text-[#5e7088]">{label}</div>
      <div className="mt-2 text-[12px] font-medium text-[#eae5dc]">{value}</div>
    </div>
  );
}

export function buildLiveEditorLink(
  asset: DerivedAsset,
  programId: string | null,
) {
  if (!programId) {
    return null;
  }

  switch (asset.editorSurface) {
    case "landing-page":
      return `/app/programs/${programId}/landing-page`;
    case "registration-form":
      return `/app/programs/${programId}/registration-form`;
    case "submission-form":
      return `/app/programs/${programId}/submission-form`;
    case "judging":
      return `/app/programs/${programId}/judging`;
    case "sponsor-report":
      return `/app/programs/${programId}/sponsor-report`;
    default:
      return null;
  }
}

export function buildLiveEditorLabel(asset: DerivedAsset) {
  switch (asset.editorSurface) {
    case "landing-page":
      return "Open landing editor";
    case "registration-form":
      return "Open registration editor";
    case "submission-form":
      return "Open submission editor";
    case "judging":
      return "Open judging setup";
    case "sponsor-report":
      return "Open sponsor report";
    default:
      return "Open live editor";
  }
}

export function AssetDraftPreview({ asset }: { asset: DerivedAsset }) {
  const payload = asset.artifactPayload;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#111e30] p-5 text-[12px] text-[#9baabf]">
        No structured preview is available yet for this draft. Use Innova to refine the asset and return here for review.
      </div>
    );
  }

  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.sections)) {
    const sections = record.sections.filter(
      (section): section is Record<string, unknown> =>
        typeof section === "object" && section !== null && !Array.isArray(section),
    );

    return (
      <div className="space-y-3">
        {sections.map((section, index) => (
          <div
            key={`${String(section.sectionKey ?? index)}-${index}`}
            className="rounded-2xl border border-white/10 bg-[#111e30] p-5"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
              {typeof section.sectionKey === "string"
                ? section.sectionKey.replaceAll("_", " ")
                : `Section ${index + 1}`}
            </div>
            {typeof section.headline === "string" ? (
              <div className="mt-3 text-[16px] font-semibold text-[#eae5dc]">
                {section.headline}
              </div>
            ) : null}
            {typeof section.subheadline === "string" ? (
              <div className="mt-2 text-[12px] leading-7 text-[#c8d3de]">
                {section.subheadline}
              </div>
            ) : null}
            {typeof section.body === "string" ? (
              <div className="mt-3 text-[12px] leading-7 text-[#9baabf]">
                {section.body}
              </div>
            ) : null}
            {typeof section.ctaLabel === "string" ? (
              <div className="mt-4 inline-flex rounded-md border border-[#b08a2838] bg-[#b08a2810] px-3 py-2 text-[11px] font-medium text-[#e4d8b4]">
                CTA: {section.ctaLabel}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  if (Array.isArray(record.fields)) {
    const fields = record.fields.filter(
      (field): field is Record<string, unknown> =>
        typeof field === "object" && field !== null && !Array.isArray(field),
    );

    return (
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#111e30]">
        <div className="border-b border-white/7 px-5 py-4 text-[13px] font-semibold text-[#eae5dc]">
          Draft form fields
        </div>
        <div className="divide-y divide-white/7">
          {fields.map((field, index) => (
            <div key={`${String(field.key ?? index)}-${index}`} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[12px] font-semibold text-[#eae5dc]">
                    {typeof field.label === "string" ? field.label : `Field ${index + 1}`}
                  </div>
                  <div className="mt-2 text-[11px] text-[#9baabf]">
                    {typeof field.type === "string"
                      ? field.type.replaceAll("_", " ")
                      : "field"}
                  </div>
                </div>
                <AssetStatusBadge tone={field.required === true ? "amber" : "muted"}>
                  {field.required === true ? "Required" : "Optional"}
                </AssetStatusBadge>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (Array.isArray(record.rounds)) {
    const rounds = record.rounds.filter(
      (round): round is Record<string, unknown> =>
        typeof round === "object" && round !== null && !Array.isArray(round),
    );

    return (
      <div className="space-y-3">
        {rounds.map((round, index) => (
          <div
            key={`${String(round.name ?? index)}-${index}`}
            className="rounded-2xl border border-white/10 bg-[#111e30] p-5"
          >
            <div className="text-[15px] font-semibold text-[#eae5dc]">
              {typeof round.name === "string" ? round.name : `Round ${index + 1}`}
            </div>
            <div className="mt-2 text-[11px] text-[#9baabf]">
              {round.isBlindReview === true ? "Blind review enabled" : "Standard review"}
            </div>
            {Array.isArray(round.criteria) ? (
              <div className="mt-4 space-y-2">
                {round.criteria.map((criterion, criterionIndex) => {
                  if (
                    typeof criterion !== "object" ||
                    criterion === null ||
                    Array.isArray(criterion)
                  ) {
                    return null;
                  }

                  const criterionRecord = criterion as Record<string, unknown>;
                  return (
                    <div
                      key={`${String(criterionRecord.key ?? criterionIndex)}-${criterionIndex}`}
                      className="rounded-xl border border-white/7 bg-[#162034] px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[12px] font-medium text-[#eae5dc]">
                            {typeof criterionRecord.label === "string"
                              ? criterionRecord.label
                              : `Criterion ${criterionIndex + 1}`}
                          </div>
                          {typeof criterionRecord.description === "string" ? (
                            <div className="mt-2 text-[11px] leading-6 text-[#9baabf]">
                              {criterionRecord.description}
                            </div>
                          ) : null}
                        </div>
                        {typeof criterionRecord.weight === "number" ? (
                          <span className="text-[11px] font-medium text-[#ccaa4a]">
                            {criterionRecord.weight}%
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111e30] p-5">
      <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] leading-6 text-[#9baabf]">
        {JSON.stringify(record, null, 2)}
      </pre>
    </div>
  );
}
