import Link from "next/link";
import { refineLandingPageAssetDraftAction } from "@/app/app/create/actions";
import { OperatorShell } from "@/components/enterprise/operator-shell";
import {
  AssetDraftPreview,
  AssetStatusBadge,
  buildCreateHref,
  buildLiveEditorLabel,
  buildLiveEditorLink,
  buildAssetRoute,
  deriveAssets,
  type AssetDetailTab,
  HistoryBlock,
} from "@/app/app/create/_components/assets-review-workspace";
import { SessionTabs } from "@/app/app/create/_components/session-screen-primitives";
import { loadSessionScreenData } from "@/app/app/create/_lib/load-session-screen-data";
import { getApprovalRequestItems } from "@/lib/supabase/queries";

type AssetDetailPageProps = {
  params: Promise<{
    sessionId: string;
    assetKey: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    status?: string;
    tab?: string;
  }>;
};

export default async function AssetDetailPage({
  params,
  searchParams,
}: AssetDetailPageProps) {
  const { sessionId, assetKey } = await params;
  const query = (await searchParams) ?? {};
  const detailTab = normalizeTab(query.tab);
  const { supabase, data, programs, selectedWorkspace, user, userName } =
    await loadSessionScreenData(sessionId);

  const latestApproval = data.approvals[0] ?? null;
  const approvalItems = latestApproval
    ? await getApprovalRequestItems(supabase, latestApproval.id)
    : [];

  const assets = deriveAssets(
    data.planItems,
    approvalItems,
    data.latestExecutionSteps,
    data.artifacts,
  );
  const selectedAsset = assets.find((asset) => asset.itemKey === assetKey) ?? null;
  const linkedProgramId = data.brief?.programId ?? null;
  const approvalReady = data.approvals.length > 0;

  return (
    <OperatorShell
      activeNav="draft-assets"
      sessionId={sessionId}
      headerTitle={selectedAsset?.title ?? "Asset Draft"}
      headerSubtitle="Focused launch-kit review and refinement before approvals"
      organizationName={selectedWorkspace.organizationName}
      userName={userName}
      userEmail={user.email}
      workspaces={data.workspaces}
      programs={programs}
      headerActions={
        <Link
          href={buildAssetRoute(sessionId, {
            asset: assetKey,
            category: "all",
            status: "all",
            view: "grid",
            tab: "preview",
          })}
          className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
        >
          Back to Draft Assets
        </Link>
      }
      mainClassName="overflow-hidden"
    >
      <div className="flex h-full flex-col bg-[#07101f]">
        <SessionTabs sessionId={sessionId} active="assets" data={data} />

        {typeof query.error === "string" ? (
          <div className="border-b border-[#9b3a3a44] bg-[#9b3a3a12] px-6 py-3 text-[12px] text-[#f1bcbc]">
            {query.error}
          </div>
        ) : null}

        {typeof query.status === "string" ? (
          <div className="border-b border-[#2d7a5840] bg-[#2d7a5812] px-6 py-3 text-[12px] text-[#9ad0b7]">
            {query.status.replace(/-/g, " ")}
          </div>
        ) : null}

        {selectedAsset ? (
          <div className="grid h-full grid-cols-[minmax(0,1fr)_340px] overflow-hidden">
            <main className="overflow-y-auto px-6 py-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[22px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
                    {selectedAsset.title}
                  </div>
                  <div className="mt-2 text-[12px] text-[#9baabf]">
                    {selectedAsset.typeLabel} · {selectedAsset.statusLabel} ·{" "}
                    {selectedAsset.dateLabel}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={buildCreateHref(sessionId, selectedAsset.regeneratePrompt)}
                    className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                  >
                    Regenerate
                  </Link>
                  {approvalReady ? (
                    <Link
                      href={`/app/create/${sessionId}/approvals`}
                      className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                    >
                      Review approvals
                    </Link>
                  ) : (
                    <Link
                      href={buildAssetRoute(sessionId, {
                        asset: assetKey,
                        category: "all",
                        status: "all",
                        view: "grid",
                        tab: "preview",
                      })}
                      className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                    >
                      Return to approvals flow
                    </Link>
                  )}
                </div>
              </div>

              <div className="mb-6 flex border-b border-white/7">
                {(
                  [
                    ["preview", "Preview"],
                    ["edit", "Edit"],
                    ["history", "History"],
                  ] as const
                ).map(([key, label]) => (
                  <Link
                    key={key}
                    href={`/app/create/${sessionId}/assets/${assetKey}${key === "preview" ? "" : `?tab=${key}`}`}
                    className={`border-b-2 px-4 py-3 text-[12px] font-medium transition ${
                      detailTab === key
                        ? "border-[#b08a28] text-[#eae5dc]"
                        : "border-transparent text-[#5e7088] hover:text-[#eae5dc]"
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              {detailTab === "preview" ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-white/10 bg-[#111e30] p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <AssetStatusBadge tone={selectedAsset.statusTone}>
                        {selectedAsset.statusLabel}
                      </AssetStatusBadge>
                      <span className="text-[11px] uppercase tracking-[0.08em] text-[#5e7088]">
                        {selectedAsset.typeLabel}
                      </span>
                    </div>
                    <h3 className="text-[18px] font-semibold text-[#eae5dc]">
                      {selectedAsset.previewTitle}
                    </h3>
                    <p className="mt-3 text-[13px] leading-7 text-[#c8d3de]">
                      {selectedAsset.previewBody}
                    </p>
                    {selectedAsset.description ? (
                      <p className="mt-4 text-[12px] leading-7 text-[#9baabf]">
                        {selectedAsset.description}
                      </p>
                    ) : null}
                  </div>

                  <AssetDraftPreview asset={selectedAsset} />
                </div>
              ) : null}

              {detailTab === "edit" ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-[#111e30] p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
                      Refine with Innova
                    </div>
                    <p className="mt-3 text-[12px] leading-7 text-[#9baabf]">
                      This asset is still pre-execution. Refine it through the PM workspace first, then move into approvals. Once execution provisions the live program surface, you can continue in the native editor.
                    </p>
                  </div>

                  {selectedAsset.editorSurface === "landing-page" ? (
                    <div className="space-y-4">
                      <form
                        action={refineLandingPageAssetDraftAction}
                        className="rounded-2xl border border-white/10 bg-[#111e30] p-5"
                      >
                        <input type="hidden" name="sessionId" value={sessionId} />
                        <input type="hidden" name="assetKey" value={assetKey} />
                        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
                          Conversational landing-page editor
                        </div>
                        <textarea
                          name="instruction"
                          rows={6}
                          placeholder="Tell Innova how to change the page. Example: Make the hero more premium, shorten the overview, add an FAQ section, and change the CTA to Join the hackathon."
                          className="w-full rounded-xl border border-white/10 bg-[#162034] px-4 py-3 text-[12px] leading-6 text-[#eae5dc] outline-none transition placeholder:text-[#5e7088] focus:border-[#b08a2866]"
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            "Make the hero more premium and executive-facing.",
                            "Shorten the overview and add a clearer FAQ section.",
                            "Rewrite the CTA for employee-only participation.",
                          ].map((prompt) => (
                            <div
                              key={prompt}
                              className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-[#9baabf]"
                            >
                              {prompt}
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="text-[11px] leading-6 text-[#9baabf]">
                            Innova will generate a new draft revision and keep this asset in governed review.
                          </div>
                          <button
                            type="submit"
                            className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                          >
                            Ask Innova
                          </button>
                        </div>
                      </form>

                      <div className="grid gap-3 md:grid-cols-2">
                        <Link
                          href={buildCreateHref(sessionId, selectedAsset.editPrompt)}
                          className="rounded-xl border border-white/10 bg-[#111e30] px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/[0.03]"
                        >
                          <div className="text-[12px] font-semibold text-[#eae5dc]">
                            Open in PM workspace chat
                          </div>
                          <div className="mt-2 text-[11px] leading-6 text-[#9baabf]">
                            Use the broader PM workspace if you want Innova to consider the full brief, plan, and adjacent assets together.
                          </div>
                        </Link>

                        {buildLiveEditorLink(selectedAsset, linkedProgramId) ? (
                          <Link
                            href={buildLiveEditorLink(selectedAsset, linkedProgramId)!}
                            className="rounded-xl border border-white/10 bg-[#111e30] px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/[0.03]"
                          >
                            <div className="text-[12px] font-semibold text-[#eae5dc]">
                              {buildLiveEditorLabel(selectedAsset)}
                            </div>
                            <div className="mt-2 text-[11px] leading-6 text-[#9baabf]">
                              Open the live program editor after the deterministic program surface exists.
                            </div>
                          </Link>
                        ) : (
                          <div className="rounded-xl border border-dashed border-white/10 bg-[#111e30] px-4 py-4">
                            <div className="text-[12px] font-semibold text-[#eae5dc]">
                              Live editor not available yet
                            </div>
                            <div className="mt-2 text-[11px] leading-6 text-[#9baabf]">
                              This draft is still operating inside the PM workspace. A native editor will unlock once deterministic execution creates the live program surface.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Link
                        href={buildCreateHref(sessionId, selectedAsset.editPrompt)}
                        className="rounded-xl border border-white/10 bg-[#111e30] px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/[0.03]"
                      >
                        <div className="text-[12px] font-semibold text-[#eae5dc]">
                          Open in Innova Chat
                        </div>
                        <div className="mt-2 text-[11px] leading-6 text-[#9baabf]">
                          Ask Innova to refine copy, structure, fields, or judging logic while keeping the current plan context.
                        </div>
                      </Link>

                      {buildLiveEditorLink(selectedAsset, linkedProgramId) ? (
                        <Link
                          href={buildLiveEditorLink(selectedAsset, linkedProgramId)!}
                          className="rounded-xl border border-white/10 bg-[#111e30] px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/[0.03]"
                        >
                          <div className="text-[12px] font-semibold text-[#eae5dc]">
                            {buildLiveEditorLabel(selectedAsset)}
                          </div>
                          <div className="mt-2 text-[11px] leading-6 text-[#9baabf]">
                            Open the live program editor after the deterministic program surface exists.
                          </div>
                        </Link>
                      ) : (
                        <div className="rounded-xl border border-dashed border-white/10 bg-[#111e30] px-4 py-4">
                          <div className="text-[12px] font-semibold text-[#eae5dc]">
                            Live editor not available yet
                          </div>
                          <div className="mt-2 text-[11px] leading-6 text-[#9baabf]">
                            This draft is still operating inside the PM workspace. A native editor will unlock once deterministic execution creates the live program surface.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}

              {detailTab === "history" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <HistoryBlock label="Current status" value={selectedAsset.statusLabel} />
                  <HistoryBlock label="Asset type" value={selectedAsset.typeLabel} />
                  <HistoryBlock
                    label="Approval packet"
                    value={approvalReady ? "Prepared" : "Not prepared yet"}
                  />
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
            </main>

            <aside className="flex flex-col overflow-y-auto border-l border-white/7 bg-[#111e30] p-5">
              <div className="rounded-2xl border border-white/10 bg-[#162034] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ccaa4a]">
                  Asset Summary
                </div>
                <div className="mt-3 text-[16px] font-semibold text-[#eae5dc]">
                  {selectedAsset.title}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AssetStatusBadge tone={selectedAsset.statusTone}>
                    {selectedAsset.statusLabel}
                  </AssetStatusBadge>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-[#9baabf]">
                    {selectedAsset.typeLabel}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-[#9baabf]">
                    {selectedAsset.meta}
                  </span>
                </div>
                <dl className="mt-5 space-y-3 text-[11.5px]">
                  <SummaryRow label="Generated" value={selectedAsset.dateLabel} />
                  <SummaryRow
                    label="Approval"
                    value={approvalReady ? "Packet prepared" : "Pre-approval draft"}
                  />
                  <SummaryRow
                    label="Execution"
                    value={
                      data.executionRuns.length > 0
                        ? data.executionRuns[0]?.status ?? "No run"
                        : "No deterministic run yet"
                    }
                  />
                </dl>
              </div>

              <div className="mt-4 rounded-2xl border border-[#b08a2838] bg-[#b08a2810] px-4 py-4 text-[11px] leading-6 text-[#e4d8b4]">
                Innova generated this asset from the current brief and execution plan. Review and refine here before you move into governed approval.
              </div>
            </aside>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-[12px] text-[#9baabf]">
            That asset could not be found in the current draft set.
          </div>
        )}
      </div>
    </OperatorShell>
  );
}

function normalizeTab(value?: string): AssetDetailTab {
  switch (value) {
    case "edit":
    case "history":
      return value;
    default:
      return "preview";
  }
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="uppercase tracking-[0.08em] text-[#5e7088]">{label}</dt>
      <dd className="text-right text-[#eae5dc]">{value}</dd>
    </div>
  );
}
