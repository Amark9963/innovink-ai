"use client";

import { useRef, useState } from "react";
import type { DerivedAsset } from "@/app/app/create/_components/assets-review-workspace";

// ─── Types ────────────────────────────────────────────────────────────────────

type AssetType = "registration_form" | "submission_form" | "judging_setup";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type StreamEvent =
  | { type: "status"; title: string; body: string }
  | { type: "delta"; text: string }
  | { type: "done"; status: string; payload: unknown }
  | { type: "error"; message: string };

type FormField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  choices?: Array<{ key: string; label: string; value: string }>;
};

type FormPayload = {
  name: string;
  description: string;
  fields: FormField[];
};

type JudgingCriterion = {
  key: string;
  label: string;
  description: string;
  weight: number;
};

type JudgingRound = {
  name: string;
  roundOrder: number;
  isBlindReview: boolean;
  criteria: JudgingCriterion[];
};

type JudgingPayload = {
  scorecardName: string;
  scorecardDescription: string;
  rounds: JudgingRound[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assetTypeLabel(assetType: AssetType): string {
  switch (assetType) {
    case "registration_form": return "Registration form";
    case "submission_form": return "Submission form";
    case "judging_setup": return "Judging setup";
  }
}

function assetTypeApi(assetType: AssetType): string {
  return assetType; // matches the API's assetType parameter
}

function getInitialPayload(asset: DerivedAsset): Record<string, unknown> | null {
  if (!asset.artifactPayload || typeof asset.artifactPayload !== "object" || Array.isArray(asset.artifactPayload)) {
    return null;
  }
  return asset.artifactPayload as Record<string, unknown>;
}

function fieldTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    short_text: "Short text",
    long_text: "Long text",
    email: "Email",
    url: "URL",
    dropdown: "Dropdown",
    consent_checkbox: "Consent",
    pitch_deck_upload: "File upload",
  };
  return labels[type] ?? type;
}

// ─── Preview components ────────────────────────────────────────────────────────

function FormPreview({ payload }: { payload: FormPayload | null }) {
  if (!payload || !Array.isArray(payload.fields) || payload.fields.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <div className="mb-3 text-[14px] font-semibold text-[var(--ws-t-primary)]">
            Form preview
          </div>
          <p className="text-[12px] text-[var(--ws-t-muted)]">
            No fields yet. Ask Innova to add or adjust fields.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto p-5">
      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-[.12em] text-[var(--ws-gold-bright)] mb-1">
          {payload.name ?? "Form"}
        </div>
        <p className="text-[11.5px] text-[var(--ws-t-muted)] leading-relaxed">
          {payload.description}
        </p>
      </div>

      <div className="space-y-2">
        {payload.fields.map((field, idx) => (
          <div
            key={field.key ?? idx}
            className="rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3.5 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[12px] font-medium text-[var(--ws-t-primary)]">
                    {field.label}
                  </span>
                  {field.required ? (
                    <span className="text-[var(--ws-amber-bright)] text-[11px]">*</span>
                  ) : null}
                </div>
                {field.helpText ? (
                  <p className="text-[10.5px] text-[var(--ws-t-muted)] leading-relaxed">
                    {field.helpText}
                  </p>
                ) : null}
                {field.type === "dropdown" && Array.isArray(field.choices) && field.choices.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {field.choices.map((choice) => (
                      <span
                        key={choice.key}
                        className="rounded-[var(--ws-r-xs)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-elevated)] px-1.5 py-0.5 text-[9.5px] text-[var(--ws-t-secondary)]"
                      >
                        {choice.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <span className="shrink-0 rounded-[var(--ws-r-xs)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-b-faint)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[.06em] text-[var(--ws-t-muted)]">
                {fieldTypeLabel(field.type)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[var(--ws-r-md)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-b-faint)] px-3 py-2 text-[10px] text-[var(--ws-t-muted)]">
        {payload.fields.length} field{payload.fields.length !== 1 ? "s" : ""} ·{" "}
        {payload.fields.filter((f) => f.required).length} required · Draft only
      </div>
    </div>
  );
}

function JudgingPreview({ payload }: { payload: JudgingPayload | null }) {
  if (!payload || !Array.isArray(payload.rounds) || payload.rounds.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <div className="mb-3 text-[14px] font-semibold text-[var(--ws-t-primary)]">
            Judging setup preview
          </div>
          <p className="text-[12px] text-[var(--ws-t-muted)]">
            No rounds yet. Ask Innova to configure rounds and criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto p-5">
      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-[.12em] text-[var(--ws-gold-bright)] mb-1">
          {payload.scorecardName ?? "Judging setup"}
        </div>
        <p className="text-[11.5px] text-[var(--ws-t-muted)] leading-relaxed">
          {payload.scorecardDescription}
        </p>
      </div>

      {payload.rounds.map((round, roundIdx) => {
        const totalWeight = round.criteria?.reduce((sum, c) => sum + (c.weight ?? 0), 0) ?? 0;
        return (
          <div
            key={round.roundOrder ?? roundIdx}
            className="mb-4 rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3.5 py-2.5">
              <div>
                <span className="text-[12.5px] font-semibold text-[var(--ws-t-primary)]">
                  {round.name}
                </span>
                <span className="ml-2 text-[10px] text-[var(--ws-t-muted)]">
                  Round {round.roundOrder}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {round.isBlindReview ? (
                  <span className="rounded-[var(--ws-r-xs)] border border-[color:var(--ws-blue-bdr)] bg-[var(--ws-blue-sub)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[.06em] text-[var(--ws-blue-bright)]">
                    Blind
                  </span>
                ) : null}
                <span
                  className={`rounded-[var(--ws-r-xs)] border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[.06em] ${
                    totalWeight === 100
                      ? "border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] text-[var(--ws-green-bright)]"
                      : "border-[color:var(--ws-amber-bdr)] bg-[var(--ws-amber-sub)] text-[var(--ws-amber-bright)]"
                  }`}
                >
                  {totalWeight === 100 ? "100%" : `${totalWeight}% ≠ 100`}
                </span>
              </div>
            </div>

            <div className="divide-y divide-[var(--ws-b-faint)]">
              {(round.criteria ?? []).map((criterion, cIdx) => (
                <div key={criterion.key ?? cIdx} className="flex items-start gap-3 px-3.5 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-[var(--ws-t-primary)] mb-0.5">
                      {criterion.label}
                    </div>
                    <p className="text-[10.5px] text-[var(--ws-t-muted)] leading-relaxed">
                      {criterion.description}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center justify-center min-w-[36px]">
                    <span className="text-[13px] font-bold text-[var(--ws-gold-bright)]">
                      {criterion.weight}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Starter chips ─────────────────────────────────────────────────────────────

function getStarterChips(assetType: AssetType): string[] {
  switch (assetType) {
    case "registration_form":
      return [
        "Add a company size field",
        "Make the motivation field optional",
        "Add a LinkedIn profile field",
        "Remove the region dropdown — make it free text",
      ];
    case "submission_form":
      return [
        "Add a team size field",
        "Make the demo URL required",
        "Add a section for expected budget",
        "Rename 'pitch deck' to 'supporting materials'",
      ];
    case "judging_setup":
      return [
        "Add a 'Market fit' criterion at 20%",
        "Make round 1 a blind review",
        "Split innovation and feasibility equally",
        "Add a second round for finalists",
      ];
  }
}

// ─── Main component ────────────────────────────────────────────────────────────

export function StructuredAssetChatEditor({
  sessionId,
  asset,
  embeddedInWorkspace = false,
}: {
  sessionId: string;
  asset: DerivedAsset;
  embeddedInWorkspace?: boolean;
}) {
  const assetType = assetTypeApi(
    asset.editorSurface === "registration-form"
      ? "registration_form"
      : asset.editorSurface === "submission-form"
        ? "submission_form"
        : "judging_setup",
  ) as AssetType;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [currentPayload, setCurrentPayload] = useState<Record<string, unknown> | null>(
    getInitialPayload(asset),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messageIdRef = useRef(0);
  const label = assetTypeLabel(assetType);
  const starterChips = getStarterChips(assetType);

  async function handleSubmit(message: string) {
    if (!message.trim() || isSubmitting) return;

    const userMsg: ChatMessage = {
      id: `u-${messageIdRef.current++}`,
      role: "user",
      text: message.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsSubmitting(true);
    setStreamingText("");
    setStatusText(null);
    setError(null);

    if (textareaRef.current) {
      textareaRef.current.value = "";
    }

    try {
      const response = await fetch("/api/pm-workspace/assets/structured/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          assetKey: asset.itemKey,
          assetType,
          message: message.trim(),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("The asset editor could not connect to the refinement service.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;

          if (event.type === "status") {
            setStatusText(event.title);
          } else if (event.type === "delta") {
            accText += event.text;
            setStreamingText(accText);
          } else if (event.type === "done") {
            if (event.payload && typeof event.payload === "object") {
              setCurrentPayload(event.payload as Record<string, unknown>);
            }
            const assistantMsg: ChatMessage = {
              id: `a-${messageIdRef.current++}`,
              role: "assistant",
              text: accText || `I updated the ${label.toLowerCase()} based on your request.`,
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setStreamingText(null);
            setStatusText(null);
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStreamingText(null);
      setStatusText(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  const containerClass = embeddedInWorkspace
    ? "grid h-full grid-cols-[300px_1fr] overflow-hidden bg-[var(--ws-bg-base)]"
    : "grid h-screen grid-cols-[300px_1fr] overflow-hidden bg-[var(--ws-bg-base)]";

  return (
    <div className={containerClass}>

      {/* ── LEFT: Chat ────────────────────────────────────────────────────── */}
      <div className="flex flex-col overflow-hidden border-r border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-base)]">

        {/* Chat header */}
        <div className="shrink-0 border-b border-[color:var(--ws-b-faint)] bg-[var(--ws-bg-surface)] px-3.5 py-2.5">
          <div className="text-[9px] font-bold uppercase tracking-[.12em] text-[var(--ws-gold-bright)] mb-0.5">
            Innova Editor
          </div>
          <div className="text-[12px] font-semibold text-[var(--ws-t-primary)] truncate">
            {asset.title}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3">
          {messages.length === 0 && !statusText && !streamingText ? (
            // Empty state with starter chips
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <div className="flex h-[16px] w-[16px] items-center justify-center rounded-[3px] border border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[7px] font-black text-[var(--ws-gold-bright)]">
                  IN
                </div>
                <span className="text-[11px] font-semibold text-[var(--ws-t-secondary)]">
                  Innova
                </span>
              </div>
              <p className="text-[12.5px] text-[var(--ws-t-secondary)] leading-[1.6] mb-4">
                This {label.toLowerCase()} is ready for review. Tell me what to change.
              </p>
              <div className="flex flex-col gap-1.5">
                {starterChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleSubmit(chip)}
                    className="rounded-[var(--ws-r-md)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-card)] px-3 py-2 text-left text-[11px] text-[var(--ws-t-secondary)] transition hover:border-[color:var(--ws-b-strong)] hover:bg-[var(--ws-bg-elevated)] hover:text-[var(--ws-t-primary)]"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                {msg.role === "assistant" ? (
                  <div className="mb-1 flex items-center gap-1">
                    <div className="flex h-[14px] w-[14px] items-center justify-center rounded-[3px] border border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[6px] font-black text-[var(--ws-gold-bright)]">
                      IN
                    </div>
                    <span className="text-[10px] font-semibold text-[var(--ws-t-secondary)]">
                      Innova
                    </span>
                  </div>
                ) : null}
                <div
                  className={`max-w-[230px] rounded-[var(--ws-r-md)] px-3 py-2 text-[12px] leading-[1.55] ${
                    msg.role === "user"
                      ? "bg-[var(--ws-bg-card)] border border-[color:var(--ws-b-subtle)] text-[var(--ws-t-primary)] rounded-[var(--ws-r-xl)_var(--ws-r-xl)_4px_var(--ws-r-xl)]"
                      : "bg-transparent text-[var(--ws-t-secondary)]"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}

          {/* Streaming / working state */}
          {isSubmitting && (
            <div className="flex flex-col items-start">
              <div className="mb-1 flex items-center gap-1">
                <div className="flex h-[14px] w-[14px] items-center justify-center rounded-[3px] border border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[6px] font-black text-[var(--ws-gold-bright)]">
                  IN
                </div>
                <span className="text-[10px] font-semibold text-[var(--ws-t-secondary)]">
                  Innova
                </span>
              </div>
              {streamingText ? (
                <p className="text-[12px] text-[var(--ws-t-secondary)] leading-[1.55]">
                  {streamingText}
                  <span className="ml-0.5 inline-block h-4 w-[1.5px] animate-pulse bg-[var(--ws-t-tertiary)] align-middle" />
                </p>
              ) : (
                <div className="flex items-center gap-2 rounded-[var(--ws-r-md)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3 py-2">
                  <div className="flex gap-[3px]">
                    <span className="h-[4px] w-[4px] animate-bounce rounded-full bg-[var(--ws-gold-bright)] opacity-80 [animation-duration:1.1s] [animation-delay:0s]" />
                    <span className="h-[4px] w-[4px] animate-bounce rounded-full bg-[var(--ws-gold-bright)] opacity-80 [animation-duration:1.1s] [animation-delay:0.18s]" />
                    <span className="h-[4px] w-[4px] animate-bounce rounded-full bg-[var(--ws-gold-bright)] opacity-80 [animation-duration:1.1s] [animation-delay:0.36s]" />
                  </div>
                  <span className="text-[11.5px] text-[var(--ws-t-secondary)]">
                    {statusText ?? `Refining ${label.toLowerCase()}...`}
                  </span>
                </div>
              )}
            </div>
          )}

          {error ? (
            <div className="rounded-[var(--ws-r-md)] border border-[color:var(--ws-red-bdr)] bg-[var(--ws-red-sub)] px-3 py-2.5 text-[11.5px] text-[var(--ws-red-bright)]">
              {error}
            </div>
          ) : null}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-surface)] px-3.5 py-3">
          <div className="flex items-end gap-2 rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-input)] py-2 pl-3 pr-2 focus-within:border-[color:var(--ws-gold-bdr)] focus-within:shadow-[0_0_0_2px_var(--ws-gold-glow)] transition-all">
            <textarea
              ref={textareaRef}
              disabled={isSubmitting}
              rows={1}
              placeholder={`Refine the ${label.toLowerCase()}...`}
              className="flex-1 resize-none bg-transparent text-[12.5px] leading-[1.5] text-[var(--ws-t-primary)] outline-none placeholder:text-[var(--ws-t-muted)] disabled:cursor-not-allowed min-h-[20px] max-h-[80px] overflow-y-auto font-[inherit]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const val = textareaRef.current?.value?.trim() ?? "";
                  if (val) handleSubmit(val);
                }
              }}
            />
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                const val = textareaRef.current?.value?.trim() ?? "";
                if (val) handleSubmit(val);
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--ws-r-md)] bg-[var(--ws-gold)] disabled:opacity-50 transition hover:bg-[var(--ws-gold-bright)]"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#06100F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>
          </div>
          <p className="mt-1.5 text-[9.5px] text-[var(--ws-t-muted)] text-center">
            Innova drafts · Nothing applies without your review
          </p>
        </div>
      </div>

      {/* ── RIGHT: Structured preview ──────────────────────────────────────── */}
      <div className="flex flex-col overflow-hidden bg-[var(--ws-bg-base)]">

        {/* Preview header */}
        <div className="shrink-0 flex items-center gap-2.5 border-b border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-surface)] px-4 py-2.5">
          <span className="text-[11.5px] font-medium text-[var(--ws-t-secondary)]">
            Preview — {label} · Draft
          </span>
          <span className="ml-auto text-[9.5px] font-semibold uppercase tracking-[.06em] rounded-[var(--ws-r-xs)] border border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] px-1.5 py-0.5 text-[var(--ws-green-bright)]">
            Live preview
          </span>
        </div>

        {/* Preview body */}
        <div className="flex-1 overflow-hidden">
          {assetType === "judging_setup" ? (
            <JudgingPreview payload={currentPayload as JudgingPayload | null} />
          ) : (
            <FormPreview payload={currentPayload as FormPayload | null} />
          )}
        </div>

        {/* Preview footer — governance note */}
        <div className="shrink-0 border-t border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-surface)] px-4 py-2.5">
          <p className="text-[10px] text-[var(--ws-t-muted)]">
            <span className="text-[var(--ws-t-tertiary)] font-medium">
              Innova drafts a new {label.toLowerCase()} revision for review.
            </span>{" "}
            The live form is not changed directly. Changes require approval and deterministic execution.
          </p>
        </div>

      </div>
    </div>
  );
}
