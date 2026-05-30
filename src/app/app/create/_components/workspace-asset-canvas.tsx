import Link from "next/link";
import {
  AssetDraftPreview,
  AssetStatusBadge,
  HistoryBlock,
  buildCreateHref,
  buildLiveEditorLabel,
  buildLiveEditorLink,
  type DerivedAsset,
} from "@/app/app/create/_components/assets-review-workspace";
import { LandingPageChatEditor } from "@/app/app/create/_components/landing-page-chat-editor";

type LandingPageEditorMessage = {
  id: string;
  role: "user" | "assistant";
  contentText: string;
  createdAt: string;
};

type WorkspaceAssetCanvasProps = {
  sessionId: string;
  asset: DerivedAsset;
  linkedProgramId: string | null;
  approvalReady: boolean;
  executionStatus: string;
  landingPageEditorMessages?: LandingPageEditorMessage[];
};

export function WorkspaceAssetCanvas({
  sessionId,
  asset,
  linkedProgramId,
  approvalReady,
  executionStatus,
  landingPageEditorMessages = [],
}: WorkspaceAssetCanvasProps) {
  if (asset.editorSurface === "landing-page") {
    return (
      <div className="h-full overflow-y-auto bg-[#07101f] px-4 py-4 md:px-5">
        <LandingPageChatEditor
          key={`workspace-landing-asset-${asset.id}-${landingPageEditorMessages.length}`}
          sessionId={sessionId}
          assetKey={asset.itemKey}
          asset={asset}
          initialMessages={landingPageEditorMessages}
          embeddedInWorkspace
        />
      </div>
    );
  }

  const liveEditorLink = buildLiveEditorLink(asset, linkedProgramId);

  return (
    <div className="grid h-full gap-5 overflow-y-auto bg-[#07101f] px-4 py-4 md:px-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)]">
      <section className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-[#111e30] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <AssetStatusBadge tone={asset.statusTone}>{asset.statusLabel}</AssetStatusBadge>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-[#9baabf]">
              {asset.typeLabel}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-[#9baabf]">
              {asset.meta}
            </span>
          </div>
          <div className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
            {asset.title}
          </div>
          <p className="mt-3 text-[12px] leading-7 text-[#9baabf]">
            This governed draft stays inside the AI Workspace until you need deeper review or the
            live program editor becomes available after deterministic execution.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111e30] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
            Refine with Innova
          </div>
          <div className="mt-4 grid gap-3">
            <Link
              href={buildCreateHref(sessionId, asset.editPrompt)}
              className="rounded-xl border border-white/10 bg-[#162034] px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/[0.03]"
            >
              <div className="text-[12px] font-semibold text-[#eae5dc]">Open in PM workspace chat</div>
              <div className="mt-2 text-[11px] leading-6 text-[#9baabf]">
                Ask Innova to refine copy, fields, scoring logic, or operational structure while
                preserving the current plan context.
              </div>
            </Link>

            {liveEditorLink ? (
              <Link
                href={liveEditorLink}
                className="rounded-xl border border-white/10 bg-[#162034] px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/[0.03]"
              >
                <div className="text-[12px] font-semibold text-[#eae5dc]">
                  {buildLiveEditorLabel(asset)}
                </div>
                <div className="mt-2 text-[11px] leading-6 text-[#9baabf]">
                  Open the provisioned program editor once the live surface exists.
                </div>
              </Link>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-[#162034] px-4 py-4">
                <div className="text-[12px] font-semibold text-[#eae5dc]">
                  Live editor not available yet
                </div>
                <div className="mt-2 text-[11px] leading-6 text-[#9baabf]">
                  This draft is still pre-execution. A native editor will unlock after the program
                  foundation is executed.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <HistoryBlock label="Current status" value={asset.statusLabel} />
          <HistoryBlock label="Asset type" value={asset.typeLabel} />
          <HistoryBlock label="Approval packet" value={approvalReady ? "Prepared" : "Not prepared yet"} />
          <HistoryBlock label="Execution state" value={executionStatus} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-[#b08a2838] bg-[#b08a2810] px-4 py-4 text-[11px] leading-6 text-[#e4d8b4]">
          Innova generated this asset from the current brief and execution plan. Review the
          structured draft here before moving it into governed approval.
        </div>
        <AssetDraftPreview asset={asset} />
      </section>
    </div>
  );
}
