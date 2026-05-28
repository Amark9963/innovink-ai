"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProgramBriefVersionSummary } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils/cn";

type BriefSuggestion = {
  id: string;
  title: string;
  body: string;
  tone: "required" | "recommended" | "optional";
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

type BriefSidePanelProps = {
  versions: ProgramBriefVersionSummary[];
  activeVersionId: string | null;
  suggestions: BriefSuggestion[];
  approveHref: string;
  requestChangesHref: string;
};

export function BriefSidePanel({
  versions,
  activeVersionId,
  suggestions,
  approveHref,
  requestChangesHref,
}: BriefSidePanelProps) {
  const [activeTab, setActiveTab] = useState<"suggestions" | "history">("suggestions");
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(activeVersionId);

  const visibleSuggestions = useMemo(
    () => suggestions.filter((suggestion) => !dismissed.includes(suggestion.id)),
    [dismissed, suggestions],
  );

  const selectedVersion =
    versions.find((version) => version.id === selectedVersionId) ?? versions[0] ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-white/7 bg-[#0c1525] px-3 pt-3">
        <button
          type="button"
          onClick={() => setActiveTab("suggestions")}
          className={cn(
            "rounded-t-md px-3 py-2 text-[11.5px]",
            activeTab === "suggestions"
              ? "border border-b-0 border-white/10 bg-[#111e30] font-medium text-[#eae5dc]"
              : "text-[#5e7088]",
          )}
        >
          AI Suggestions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={cn(
            "rounded-t-md px-3 py-2 text-[11.5px]",
            activeTab === "history"
              ? "border border-b-0 border-white/10 bg-[#111e30] font-medium text-[#eae5dc]"
              : "text-[#5e7088]",
          )}
        >
          Version History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "suggestions" ? (
          <div className="space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b08a28]">
              {visibleSuggestions.length} suggestions from Innova
            </div>

            {visibleSuggestions.length > 0 ? (
              visibleSuggestions.map((suggestion) => (
                <article
                  key={suggestion.id}
                  className={cn(
                    "rounded-xl border bg-[#162034] p-4",
                    suggestion.tone === "required" && "border-[#c9973a40]",
                    suggestion.tone === "recommended" && "border-white/7",
                    suggestion.tone === "optional" && "border-white/7",
                  )}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="text-[12.5px] font-semibold leading-5 text-[#eae5dc]">
                      {suggestion.title}
                    </div>
                    <span
                      className={cn(
                        "rounded-sm border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em]",
                        suggestion.tone === "required" &&
                          "border-[#c9973a40] bg-[#c9973a12] text-[#e8c26d]",
                        suggestion.tone === "recommended" &&
                          "border-white/10 bg-white/[0.03] text-[#9baabf]",
                        suggestion.tone === "optional" &&
                          "border-white/10 bg-white/[0.03] text-[#9baabf]",
                      )}
                    >
                      {suggestion.tone}
                    </span>
                  </div>
                  <p className="mb-3 text-[11.5px] leading-6 text-[#9baabf]">{suggestion.body}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={suggestion.primaryHref}
                      className="rounded-md bg-[#b08a28] px-3 py-2 text-[11px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                    >
                      {suggestion.primaryLabel}
                    </Link>
                    {suggestion.secondaryHref ? (
                      <Link
                        href={suggestion.secondaryHref}
                        className="rounded-md border border-white/10 px-3 py-2 text-[11px] font-semibold text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                      >
                        {suggestion.secondaryLabel}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setDismissed((current) =>
                            current.includes(suggestion.id)
                              ? current
                              : [...current, suggestion.id],
                          )
                        }
                        className="rounded-md border border-white/10 px-3 py-2 text-[11px] font-semibold text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                      >
                        {suggestion.secondaryLabel ?? "Dismiss"}
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-white/10 bg-[#162034] px-4 py-4 text-[12px] leading-6 text-[#9baabf]">
                All current suggestions have been handled. Continue refining the brief in chat or move into the next review step.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b08a28]">
              Version History
            </div>
            <div className="space-y-2">
              {versions.length > 0 ? (
                versions.map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => setSelectedVersionId(version.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition",
                      version.id === selectedVersionId
                        ? "border border-[#b08a2838] bg-[#b08a2810]"
                        : "hover:bg-white/[0.03]",
                    )}
                  >
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        version.id === activeVersionId ? "bg-[#ccaa4a]" : "bg-[#5e7088]",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium text-[#eae5dc]">
                        v{version.versionNumber}
                        {version.id === activeVersionId ? " — Current" : ""}
                      </div>
                      <div className="mt-1 text-[10.5px] text-[#9baabf]">
                        {version.confidenceLevel} confidence · {new Intl.DateTimeFormat("en-SG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(version.createdAt))}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 bg-[#162034] px-4 py-4 text-[12px] leading-6 text-[#9baabf]">
                  Version history will appear here once Innova generates the first saved revision.
                </div>
              )}
            </div>

            {selectedVersion ? (
              <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
                <div className="text-[12px] font-semibold text-[#eae5dc]">
                  v{selectedVersion.versionNumber} snapshot
                </div>
                <div className="mt-2 text-[11px] leading-5 text-[#9baabf]">
                  Source: {selectedVersion.source.replaceAll("_", " ")} · {selectedVersion.confidenceLevel} confidence
                </div>
                <div className="mt-3 text-[11px] leading-6 text-[#9baabf]">
                  Assumptions: {Array.isArray(selectedVersion.assumptions) ? selectedVersion.assumptions.length : 0}
                  {" · "}
                  Open questions: {Array.isArray(selectedVersion.openQuestions) ? selectedVersion.openQuestions.length : 0}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-white/7 p-4">
        <Link
          href={approveHref}
          className="flex-1 rounded-md bg-[#b08a28] px-3 py-2 text-center text-[11.5px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
        >
          Approve Brief →
        </Link>
        <Link
          href={requestChangesHref}
          className="rounded-md border border-white/10 px-3 py-2 text-[11.5px] font-semibold text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
        >
          Request Changes
        </Link>
      </div>
    </div>
  );
}
