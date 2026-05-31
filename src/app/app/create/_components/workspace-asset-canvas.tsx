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
import { StructuredAssetChatEditor } from "@/app/app/create/_components/structured-asset-chat-editor";

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
    const currentRevision = resolveLandingPageRevisionLabel(asset);
    const revisionSummary = resolveLandingPageRevisionSummary(asset);
    const previewUrl = resolveLandingPagePreviewUrl(asset);
    const domainName = resolveLandingPageDomainName(asset);
    const previewHref = previewUrl
      ? normalizePreviewHref(previewUrl)
      : linkedProgramId
        ? `/app/programs/${linkedProgramId}/landing-page?preview=draft`
        : null;

    return (
      <div className="h-full overflow-hidden bg-[var(--ws-bg-base)]">
        <LandingPageChatEditor
          key={`workspace-landing-asset-${asset.id}-${landingPageEditorMessages.length}`}
          sessionId={sessionId}
          assetKey={asset.itemKey}
          asset={asset}
          initialMessages={landingPageEditorMessages}
          embeddedInWorkspace
          publishPanel={
            <WorkspacePublishPanel
              sessionId={sessionId}
              assetKey={asset.itemKey}
              currentRevision={currentRevision}
              revisionSummary={revisionSummary}
              previewUrl={previewUrl}
              previewHref={previewHref}
              domainName={domainName}
              onPreparePublishApproval={() => undefined}
            />
          }
        />
      </div>
    );
  }

  // Registration form, submission form, and judging setup — conversational editor
  if (
    asset.editorSurface === "registration-form" ||
    asset.editorSurface === "submission-form" ||
    asset.editorSurface === "judging"
  ) {
    return (
      <div className="h-full overflow-hidden bg-[var(--ws-bg-base)]">
        <StructuredAssetChatEditor
          key={`workspace-structured-asset-${asset.id}`}
          sessionId={sessionId}
          asset={asset}
          embeddedInWorkspace
        />
      </div>
    );
  }

  const liveEditorLink = buildLiveEditorLink(asset, linkedProgramId);

  return (
    <div className="grid h-full gap-5 overflow-y-auto bg-[var(--ws-bg-base)] px-4 py-4 md:px-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)]">
      <section className="space-y-4">
        <div className="rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-panel)] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <AssetStatusBadge tone={asset.statusTone}>{asset.statusLabel}</AssetStatusBadge>
            <span className="rounded-full border border-[color:var(--ws-b-default)] px-3 py-1 text-[11px] text-[var(--ws-t-secondary)]">
              {asset.typeLabel}
            </span>
            <span className="rounded-full border border-[color:var(--ws-b-default)] px-3 py-1 text-[11px] text-[var(--ws-t-secondary)]">
              {asset.meta}
            </span>
          </div>
          <div className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-[var(--ws-t-primary)]">
            {asset.title}
          </div>
          <p className="mt-3 text-[12px] leading-7 text-[var(--ws-t-secondary)]">
            This governed draft stays inside the AI Workspace until you need deeper review or the
            live program editor becomes available after deterministic execution.
          </p>
        </div>

        <div className="rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-panel)] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ws-t-muted)]">
            Refine with Innova
          </div>
          <div className="mt-4 grid gap-3">
            <Link
              href={buildCreateHref(sessionId, asset.editPrompt)}
              className="rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-card)] px-4 py-4 text-left transition hover:border-[color:var(--ws-b-strong)] hover:bg-[var(--ws-bg-elevated)]"
            >
              <div className="text-[12px] font-semibold text-[var(--ws-t-primary)]">Open in PM workspace chat</div>
              <div className="mt-2 text-[11px] leading-6 text-[var(--ws-t-secondary)]">
                Ask Innova to refine copy, fields, scoring logic, or operational structure while
                preserving the current plan context.
              </div>
            </Link>

            {liveEditorLink ? (
              <Link
                href={liveEditorLink}
                className="rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-card)] px-4 py-4 text-left transition hover:border-[color:var(--ws-b-strong)] hover:bg-[var(--ws-bg-elevated)]"
              >
                <div className="text-[12px] font-semibold text-[var(--ws-t-primary)]">
                  {buildLiveEditorLabel(asset)}
                </div>
                <div className="mt-2 text-[11px] leading-6 text-[var(--ws-t-secondary)]">
                  Open the provisioned program editor once the live surface exists.
                </div>
              </Link>
            ) : (
              <div className="rounded-[var(--ws-r-lg)] border border-dashed border-[color:var(--ws-b-default)] bg-[var(--ws-bg-card)] px-4 py-4">
                <div className="text-[12px] font-semibold text-[var(--ws-t-primary)]">
                  Live editor not available yet
                </div>
                <div className="mt-2 text-[11px] leading-6 text-[var(--ws-t-secondary)]">
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
        <div className="rounded-[var(--ws-r-lg)] border border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] px-4 py-4 text-[11px] leading-6 text-[var(--ws-t-secondary)]">
          Innova generated this asset from the current brief and execution plan. Review the
          structured draft here before moving it into governed approval.
        </div>
        <AssetDraftPreview asset={asset} />
      </section>
    </div>
  );
}

function WorkspacePublishPanel({
  sessionId,
  assetKey,
  currentRevision,
  revisionSummary,
  previewUrl,
  previewHref,
  domainName,
  onPreparePublishApproval,
}: {
  sessionId: string;
  assetKey: string;
  currentRevision: string | null;
  revisionSummary: string | null;
  previewUrl: string | null;
  previewHref: string | null;
  domainName: string | null;
  onPreparePublishApproval: () => void;
}) {
  void onPreparePublishApproval;

  return (
    <aside className="flex w-[280px] shrink-0 flex-col overflow-hidden border-l border-l-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-panel)]">
      <div className="shrink-0 border-b border-b-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-surface)] px-3.5 py-3">
        <div className="mb-0.5 text-[9px] font-bold uppercase tracking-[.13em] text-[var(--ws-blue-bright)]">
          Staging & Publish
        </div>
        <div className="text-[13px] font-semibold text-[var(--ws-t-primary)]">Landing page</div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3.5 py-3">
        {previewHref ? (
          <Link
            href={previewHref}
            target="_blank"
            className="rounded-[var(--ws-r-lg)] border border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] px-3 py-2.5 text-center text-[11.5px] font-semibold text-[var(--ws-green-bright)] transition hover:bg-[var(--ws-bg-card)]"
          >
            Open frontend preview &rarr;
          </Link>
        ) : (
          <div className="rounded-[var(--ws-r-lg)] border border-dashed border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3 py-2.5 text-[10.5px] leading-5 text-[var(--ws-t-muted)]">
            Frontend preview unlocks after the landing-page draft is connected to a program surface.
          </div>
        )}

        <div className="rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="text-[9px] font-bold uppercase tracking-[.1em] text-[var(--ws-t-muted)]">
              Current revision
            </div>
            <span className="rounded-[var(--ws-r-xs)] border border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.06em] text-[var(--ws-green-bright)]">
              Draft
            </span>
          </div>
          <div className="text-[12.5px] font-semibold text-[var(--ws-t-primary)]">
            {currentRevision ?? "Draft"}
          </div>
          <div className="mt-1 text-[11px] leading-5 text-[var(--ws-t-muted)]">
            {revisionSummary ?? "Latest governed landing-page draft is ready for preview review."}
          </div>
        </div>

        {previewUrl ? (
          <div className="rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-card)] px-3 py-2.5">
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[.1em] text-[var(--ws-t-muted)]">
              Staging preview
            </div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="flex-1 truncate font-mono text-[10.5px] text-[var(--ws-blue-bright)]">
                {previewUrl}
              </span>
              <button
                type="button"
                className="flex h-[22px] w-[22px] items-center justify-center rounded-[var(--ws-r-sm)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-b-faint)] text-[var(--ws-t-muted)]"
                aria-label="Copy preview URL"
              >
                <CopyIcon />
              </button>
              <Link
                href={previewUrl.startsWith("http") ? previewUrl : `https://${previewUrl}`}
                target="_blank"
                className="flex h-[22px] w-[22px] items-center justify-center rounded-[var(--ws-r-sm)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-b-faint)] text-[var(--ws-t-muted)]"
                aria-label="Open preview URL"
              >
                <OpenExternalIcon />
              </Link>
            </div>
            <div className="text-[10px] text-[var(--ws-t-muted)]">
              Safe to share internally · Not indexed · Auth-gated
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3 py-2.5">
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[.1em] text-[var(--ws-t-muted)]">
              Staging preview
            </div>
            <div className="text-[10.5px] leading-relaxed text-[var(--ws-t-muted)]">
              Ask Innova to create a temporary preview link when you are ready to test this draft outside the editor.
            </div>
          </div>
        )}

        {domainName ? (
          <div className="rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-card)] px-3 py-2.5">
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[.1em] text-[var(--ws-t-muted)]">
              Custom domain
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--ws-r-sm)] border border-[color:var(--ws-amber-bdr)] bg-[var(--ws-amber-sub)]">
                <DomainWarnIcon />
              </div>
              <div>
                <div className="mb-0.5 font-mono text-[12px] font-medium text-[var(--ws-t-primary)]">
                  {domainName}
                </div>
                <div className="text-[10.5px] text-[var(--ws-amber-bright)]">
                  DNS: pending setup
                </div>
                <div className="mt-2 rounded-[var(--ws-r-md)] border border-[color:var(--ws-amber-bdr)] bg-[var(--ws-amber-sub)] px-2 py-2 text-[10.5px] leading-5 text-[var(--ws-t-secondary)]">
                  Innova will validate DNS and SSL before preparing publish approval.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3 py-2.5">
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[.1em] text-[var(--ws-t-muted)]">
              Custom domain
            </div>
            <div className="text-[10.5px] leading-relaxed text-[var(--ws-t-muted)]">
              No custom domain configured yet. Innova can prepare domain guidance before publish approval.
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3 py-2.5">
          <ShieldIcon />
          <p className="text-[10.5px] leading-relaxed text-[var(--ws-t-muted)]">
            <strong className="font-medium text-[var(--ws-t-tertiary)]">
              Drafting is frictionless. Going live is governed.
            </strong>{" "}
            Publishing to a custom domain requires an approval.
          </p>
        </div>
      </div>

      <div className="shrink-0 border-t border-t-[color:var(--ws-b-subtle)] px-3 py-2.5">
        <Link
          href={`/app/create/${sessionId}/assets/${assetKey}`}
          className="block w-full py-1 text-center text-[11px] text-[var(--ws-t-tertiary)] transition-colors hover:text-[var(--ws-t-secondary)]"
        >
          Open full asset review →
        </Link>
      </div>
    </aside>
  );
}

function normalizePreviewHref(previewUrl: string) {
  return previewUrl.startsWith("http") ? previewUrl : `https://${previewUrl}`;
}

function resolveLandingPageRevisionLabel(asset: DerivedAsset) {
  if (
    asset.artifactPayload &&
    typeof asset.artifactPayload === "object" &&
    !Array.isArray(asset.artifactPayload)
  ) {
    const payload = asset.artifactPayload as Record<string, unknown>;
    if (typeof payload.revisionLabel === "string" && payload.revisionLabel.trim().length > 0) {
      return payload.revisionLabel;
    }

    if (typeof payload.revision === "string" && payload.revision.trim().length > 0) {
      return payload.revision;
    }
  }

  return asset.status === "approved" ? "Approved draft" : "Draft";
}

function resolveLandingPagePreviewUrl(asset: DerivedAsset) {
  if (
    asset.artifactPayload &&
    typeof asset.artifactPayload === "object" &&
    !Array.isArray(asset.artifactPayload)
  ) {
    const payload = asset.artifactPayload as Record<string, unknown>;
    return typeof payload.previewUrl === "string" ? payload.previewUrl : null;
  }

  return null;
}

function resolveLandingPageRevisionSummary(asset: DerivedAsset) {
  if (
    asset.artifactPayload &&
    typeof asset.artifactPayload === "object" &&
    !Array.isArray(asset.artifactPayload)
  ) {
    const payload = asset.artifactPayload as Record<string, unknown>;
    const summary =
      typeof payload.revisionSummary === "string"
        ? payload.revisionSummary
        : typeof payload.changeSummary === "string"
          ? payload.changeSummary
          : typeof payload.whatChanged === "string"
            ? payload.whatChanged
            : null;

    return summary && summary.trim().length > 0 ? summary : null;
  }

  return null;
}

function resolveLandingPageDomainName(asset: DerivedAsset) {
  if (
    asset.artifactPayload &&
    typeof asset.artifactPayload === "object" &&
    !Array.isArray(asset.artifactPayload)
  ) {
    const payload = asset.artifactPayload as Record<string, unknown>;
    return typeof payload.domainName === "string" ? payload.domainName : null;
  }

  return null;
}

function CopyIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="5" y="5" width="8" height="8" rx="1" />
      <path d="M3 11V3h8" />
    </svg>
  );
}

function OpenExternalIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 2h4v4M6 10l8-8M6 4H2v10h10v-4" />
    </svg>
  );
}

function DomainWarnIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-[var(--ws-amber-bright)]"
    >
      <path d="M8 1 1 14h14L8 1Z" />
      <path d="M8 6.5v3" />
      <path d="M8 12h.01" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="mt-0.5 shrink-0 text-[var(--ws-gold-bright)]"
    >
      <path d="M8 1 3 3.5v4c0 3.1 2.1 5.9 5 7 2.9-1.1 5-3.9 5-7v-4L8 1Z" />
    </svg>
  );
}
