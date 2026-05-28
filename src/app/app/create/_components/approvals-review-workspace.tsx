"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  executeApprovedPlanAction,
  reviewApprovalRequestAction,
} from "@/app/app/create/actions";
import type {
  ApprovalRequestItemSummary,
  ApprovalRequestSummary,
} from "@/lib/supabase/queries";
import { cn } from "@/lib/utils/cn";

type ApprovalComment = {
  id: string;
  author: string;
  initials: string;
  timestamp: string;
  body: string;
  tone?: "pm" | "reviewer";
};

type ApprovalCommentSectionProps = {
  comments: ApprovalComment[];
  onSendToChat: (message: string) => void;
};

type ApprovalsReviewWorkspaceProps = {
  sessionId: string;
  approvals: ApprovalRequestSummary[];
  selectedApprovalId: string | null;
  selectedItems: ApprovalRequestItemSummary[];
  requestChangesHref: string;
  filterQueryParam?: string | null;
};

export function ApprovalsReviewWorkspace({
  sessionId,
  approvals,
  selectedApprovalId,
  selectedItems,
  requestChangesHref,
  filterQueryParam,
}: ApprovalsReviewWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [commentDraft, setCommentDraft] = useState("");

  const filter = filterQueryParam === "resolved" ? "resolved" : "pending";

  const selectedApproval =
    approvals.find((approval) => approval.id === selectedApprovalId) ?? approvals[0] ?? null;

  const pendingApprovals = approvals.filter((approval) => approval.status === "pending");
  const resolvedApprovals = approvals.filter((approval) => approval.status !== "pending");

  const visibleApprovals = filter === "resolved" ? resolvedApprovals : pendingApprovals;

  const comments = useMemo<ApprovalComment[]>(() => {
    if (!selectedApproval) {
      return [];
    }

    return [
      {
        id: "reviewer",
        author: "Approver",
        initials: "AP",
        timestamp: "Awaiting review",
        body:
          selectedApproval.status === "pending"
            ? "This approval packet is waiting for an operator decision. Review the governed items and either approve execution or send the plan back for changes."
            : `This packet was ${selectedApproval.status}. Use the AI workspace if you need to regenerate or refine the plan.`,
      },
      {
        id: "pm",
        author: "Program Manager",
        initials: "PM",
        timestamp: "Operator note",
        body:
          "If you need revisions, send the feedback back into the AI workspace so Innova can update the brief or plan before a new packet is generated.",
        tone: "pm",
      },
    ];
  }, [selectedApproval]);

  const detailItems = selectedItems.slice(0, 6);

  return (
    <div className="grid h-full grid-cols-[340px_minmax(0,1fr)] overflow-hidden">
      <aside className="overflow-y-auto border-r border-white/7 bg-[#0c1525] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
            Pending · {pendingApprovals.length}
          </div>
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("filter", filter === "pending" ? "resolved" : "pending");
              router.push(`/app/create/${sessionId}/approvals?${params.toString()}`);
            }}
            className="rounded-md border border-white/10 px-3 py-1.5 text-[11px] text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            Filter
          </button>
        </div>

        {visibleApprovals.length > 0 ? (
          visibleApprovals.map((approval) => (
            <Link
              key={approval.id}
              href={buildApprovalHref(sessionId, approval.id, filter)}
              className={cn(
                "mb-3 block rounded-xl border p-4 transition hover:border-white/15 hover:bg-[#162034]",
                approval.id === selectedApproval?.id
                  ? "border-[#b08a2838] bg-[#b08a2810]"
                  : "border-white/10 bg-[#111e30]",
                approval.status !== "pending" && "opacity-65",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-1 h-2.5 w-2.5 rounded-full",
                    approval.riskLevel === "high" && "bg-[#d86a6a]",
                    approval.riskLevel === "medium" && "bg-[#ccaa4a]",
                    approval.riskLevel === "low" && "bg-[#6e88a5]",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-[#eae5dc]">{approval.title}</div>
                  <div className="mt-1 text-[11px] text-[#9baabf]">
                    {approval.summary ?? "Approval packet ready for operator review."}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "rounded-sm border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em]",
                        approval.status === "pending" &&
                          "border-[#c9973a40] bg-[#c9973a12] text-[#e8c26d]",
                        approval.status === "approved" &&
                          "border-[#2d7a5840] bg-[#2d7a5812] text-[#9ad0b7]",
                        approval.status === "rejected" &&
                          "border-[#9b3a3a44] bg-[#9b3a3a12] text-[#f1bcbc]",
                      )}
                    >
                      {approval.status}
                    </span>
                    <div className="text-[10px] text-[#5e7088]">
                      {new Intl.DateTimeFormat("en-SG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(approval.requestedAt))}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 bg-[#111e30] px-4 py-4 text-[12px] leading-6 text-[#9baabf]">
            No {filter} approvals are available right now.
          </div>
        )}

        <div className="mt-6 mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
          Resolved · {resolvedApprovals.length}
        </div>
        {resolvedApprovals.slice(0, 4).map((approval) => (
          <Link
            key={`resolved-${approval.id}`}
            href={buildApprovalHref(sessionId, approval.id, "resolved")}
            className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-[#111e30] p-4 opacity-70 transition hover:opacity-100"
          >
            <div className="text-[#9ad0b7]">✓</div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-[#eae5dc]">{approval.title}</div>
              <div className="mt-1 text-[10.5px] text-[#5e7088]">
                Reviewed{" "}
                {approval.reviewedAt
                  ? new Intl.DateTimeFormat("en-SG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(approval.reviewedAt))
                  : "recently"}
              </div>
            </div>
          </Link>
        ))}
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
                  <span
                    className={cn(
                      "rounded-sm border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em]",
                      selectedApproval.riskLevel === "high" &&
                        "border-[#9b3a3a44] bg-[#9b3a3a12] text-[#f1bcbc]",
                      selectedApproval.riskLevel === "medium" &&
                        "border-[#c9973a40] bg-[#c9973a12] text-[#e8c26d]",
                      selectedApproval.riskLevel === "low" &&
                        "border-white/10 bg-white/[0.03] text-[#9baabf]",
                    )}
                  >
                    {selectedApproval.riskLevel}
                  </span>
                </div>
                <p className="text-[12px] text-[#9baabf]">
                  Submitted {formatShortDateTime(selectedApproval.requestedAt)} · Human review gate before deterministic execution
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={requestChangesHref}
                  className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                >
                  Request Changes
                </Link>
                {selectedApproval.status === "pending" ? (
                  <>
                    <form action={reviewApprovalRequestAction}>
                      <input type="hidden" name="sessionId" value={sessionId} />
                      <input type="hidden" name="approvalRequestId" value={selectedApproval.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <input type="hidden" name="redirectTo" value="approvals" />
                      <button
                        type="submit"
                        className="rounded-md border border-[#9b3a3a44] bg-[#9b3a3a12] px-3 py-2 text-[12px] font-semibold text-[#f1bcbc] transition hover:bg-[#9b3a3a22]"
                      >
                        Reject
                      </button>
                    </form>
                    <form action={reviewApprovalRequestAction}>
                      <input type="hidden" name="sessionId" value={sessionId} />
                      <input type="hidden" name="approvalRequestId" value={selectedApproval.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <input type="hidden" name="redirectTo" value="approvals" />
                      <button
                        type="submit"
                        className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                      >
                        Approve
                      </button>
                    </form>
                  </>
                ) : selectedApproval.status === "approved" ? (
                  <form action={executeApprovedPlanAction}>
                    <input type="hidden" name="sessionId" value={sessionId} />
                    <input type="hidden" name="approvalRequestId" value={selectedApproval.id} />
                    <input type="hidden" name="redirectTo" value="execution" />
                    <button
                      type="submit"
                      className="rounded-md bg-[#2d7a58] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#3e9a70]"
                    >
                      Execute
                    </button>
                  </form>
                ) : null}
              </div>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <SummaryCard
                label="Approver"
                title={selectedApproval.status === "pending" ? "Program Manager" : "Decision captured"}
                subtitle={selectedApproval.status === "pending" ? "Current workspace owner decision required" : selectedApproval.status}
              />
              <SummaryCard
                label="Deadline"
                title={selectedApproval.status === "pending" ? "Review now" : "Resolved"}
                subtitle={selectedApproval.status === "pending" ? "Approval gates execution" : formatShortDateTime(selectedApproval.reviewedAt)}
                tone={selectedApproval.status === "pending" ? "amber" : "default"}
              />
              <SummaryCard
                label="Impact"
                title={`${selectedItems.length} governed items`}
                subtitle="Deterministic execution will use these records directly"
              />
            </div>

            <section className="mb-5 rounded-xl border border-white/10 bg-[#162034] p-5">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
                Approval Context
              </div>
              <p className="text-[12px] leading-6 text-[#9baabf]">
                {selectedApproval.summary ??
                  "This packet contains the current governed outputs from Innova. Review the itemized changes, make a decision, and then move into deterministic execution when ready."}
              </p>
            </section>

            <section className="mb-5 rounded-xl border border-white/10 bg-[#162034] p-5">
              <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
                Itemized Approval Scope
              </div>
              {detailItems.length > 0 ? (
                <div className="space-y-3">
                  {detailItems.map((item) => (
                    <article key={item.id} className="rounded-lg border border-white/7 bg-[#111e30] p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[12.5px] font-semibold text-[#eae5dc]">{item.title}</div>
                          <div className="mt-1 text-[10.5px] uppercase tracking-[0.06em] text-[#5e7088]">
                            {item.itemType.replaceAll("_", " ")}
                          </div>
                        </div>
                        <span className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#9baabf]">
                          {item.status}
                        </span>
                      </div>
                      {item.description ? (
                        <p className="mb-3 text-[11.5px] leading-6 text-[#9baabf]">{item.description}</p>
                      ) : null}
                      <div className="rounded-md border border-white/[0.05] bg-[#0c1525] p-3 font-mono text-[10.5px] leading-6 text-[#9baabf]">
                        {Object.entries(item.payload && typeof item.payload === "object" && !Array.isArray(item.payload) ? item.payload : {})
                          .slice(0, 6)
                          .map(([key, value]) => (
                            <div key={key}>
                              <span className="text-[#eae5dc]">{key}</span>: {summarizeValue(value)}
                            </div>
                          ))}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 bg-[#111e30] px-4 py-4 text-[12px] leading-6 text-[#9baabf]">
                  Itemized child records are not available yet for this packet, but the governed packet can still be reviewed and decided.
                </div>
              )}
            </section>

            <section className="rounded-xl border border-white/10 bg-[#162034] p-5">
              <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
                Comments
              </div>
              <ApprovalCommentSection
                comments={comments}
                onSendToChat={(message) => {
                  const href = `/app/create?session=${sessionId}&prompt=${encodeURIComponent(
                    `Approval review feedback: ${message}`,
                  )}`;
                  router.push(href);
                }}
              />
              <div className="mt-4 flex gap-2">
                <input
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 rounded-md border border-white/10 bg-[#0c1525] px-3 py-2 text-[12px] text-[#eae5dc] outline-none placeholder:text-[#5e7088] focus:border-[#b08a28]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!commentDraft.trim()) {
                      return;
                    }

                    const href = `/app/create?session=${sessionId}&prompt=${encodeURIComponent(
                      `Approval feedback from review: ${commentDraft.trim()}`,
                    )}`;
                    router.push(href);
                  }}
                  className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                >
                  Post
                </button>
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 bg-[#162034] px-4 py-4 text-[12px] leading-6 text-[#9baabf]">
            No approval packet is available yet. Generate the plan and prepare the approval packet first.
          </div>
        )}
      </main>
    </div>
  );
}

function ApprovalCommentSection({ comments, onSendToChat }: ApprovalCommentSectionProps) {
  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="border-l-2 border-white/10 pl-4">
          <div className="mb-2 flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold",
                comment.tone === "pm"
                  ? "border border-[#b08a2838] bg-[#b08a2810] text-[#ccaa4a]"
                  : "border border-[#3a6e9e44] bg-[#3a6e9e12] text-[#c4d8ec]",
              )}
            >
              {comment.initials}
            </div>
            <div className="text-[11.5px] font-medium text-[#eae5dc]">{comment.author}</div>
            <div className="text-[10px] text-[#5e7088]">{comment.timestamp}</div>
          </div>
          <div className="text-[12px] leading-6 text-[#9baabf]">{comment.body}</div>
          {comment.id === "reviewer" ? (
            <button
              type="button"
              onClick={() =>
                onSendToChat(
                  "Please help me address the current approval review comments and update the packet accordingly.",
                )
              }
              className="mt-3 rounded-md border border-white/10 px-3 py-2 text-[11px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
            >
              Ask Innova
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SummaryCard({
  label,
  title,
  subtitle,
  tone = "default",
}: {
  label: string;
  title: string;
  subtitle: string;
  tone?: "default" | "amber";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#162034] p-4">
      <div className="text-[10px] uppercase tracking-[0.06em] text-[#5e7088]">{label}</div>
      <div className={cn("mt-2 text-[13px] font-semibold text-[#eae5dc]", tone === "amber" && "text-[#e8c26d]")}>
        {title}
      </div>
      <div className="mt-1 text-[11px] text-[#9baabf]">{subtitle}</div>
    </div>
  );
}

function buildApprovalHref(sessionId: string, approvalId: string, filter: "pending" | "resolved") {
  const params = new URLSearchParams({
    approval: approvalId,
    filter,
  });

  return `/app/create/${sessionId}/approvals?${params.toString()}`;
}

function formatShortDateTime(value: string | null) {
  if (!value) {
    return "not set";
  }

  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function summarizeValue(value: unknown) {
  if (typeof value === "string") {
    return value.length > 60 ? `${value.slice(0, 60)}...` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `${value.length} items`;
  }

  if (value && typeof value === "object") {
    return `${Object.keys(value as Record<string, unknown>).length} fields`;
  }

  return "set";
}
