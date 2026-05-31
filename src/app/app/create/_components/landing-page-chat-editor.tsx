"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AssetDraftPreview,
  AssetStatusBadge,
  buildCreateHref,
  type DerivedAsset,
} from "@/app/app/create/_components/assets-review-workspace";
import { LandingPageDraftPreview } from "@/app/app/create/_components/landing-page-draft-preview";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LandingPageEditorMessage = {
  id: string;
  role: "user" | "assistant";
  contentText: string;
  createdAt: string;
};

type LandingPageEditorStreamEvent =
  | {
      type: "status";
      title: string;
      body: string;
    }
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "done";
      status: string;
    }
  | {
      type: "error";
      message: string;
    };

type LandingPageChatEditorProps = {
  sessionId: string;
  assetKey: string;
  asset: DerivedAsset;
  initialMessages: LandingPageEditorMessage[];
  embeddedInWorkspace?: boolean;
  publishPanel?: ReactNode;
};

type OptimisticEditorMessage = LandingPageEditorMessage & {
  optimistic: true;
};

type StreamingAssistantState = {
  text: string;
  statusTitle: string | null;
  statusBody: string | null;
};

type RevisionNotice = {
  id: string;
  title: string;
  body: string;
};

type SaveState = "idle" | "saving" | "saved" | "undoing" | "error";

export function LandingPageChatEditor({
  sessionId,
  assetKey,
  asset,
  initialMessages,
  embeddedInWorkspace = false,
  publishPanel,
}: LandingPageChatEditorProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [messages, setMessages] = useState(initialMessages);
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticEditorMessage[]
  >([]);
  const [streamingAssistant, setStreamingAssistant] =
    useState<StreamingAssistantState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [revisionNotice, setRevisionNotice] = useState<RevisionNotice | null>(null);
  const [draftPayload, setDraftPayload] = useState<Record<string, unknown>>(() =>
    getLandingPagePayload(asset),
  );
  const [savedDraftPayload, setSavedDraftPayload] = useState<Record<string, unknown>>(() =>
    getLandingPagePayload(asset),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        router.refresh();
      }, 650);
    };

    const channel = supabase
      .channel(`landing-page-editor-${sessionId}-${assetKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const record = (payload.new || payload.old) as
            | {
                id: string;
                role: "user" | "assistant" | "system" | "tool";
                content_text: string | null;
                content_payload: unknown;
                created_at: string;
              }
            | undefined;

          if (!record || !record.content_text) {
            return;
          }

          if (!isLandingPageEditorMessage(record.content_payload, assetKey)) {
            return;
          }

          if (
            (record.role !== "user" && record.role !== "assistant") ||
            !record.content_text
          ) {
            return;
          }

          const role = record.role;
          const contentText = record.content_text;

          setMessages((current) =>
            upsertMessage(current, {
              id: record.id,
              role,
              contentText,
              createdAt: record.created_at,
            }),
          );

          if (record.role === "assistant") {
            setOptimisticMessages([]);
            setStreamingAssistant(null);
            setErrorMessage(null);
          }

          scheduleRefresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_artifacts",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const record = (payload.new || payload.old) as
            | {
                artifact_type: string;
              }
            | undefined;

          if (record?.artifact_type !== "landing_page") {
            return;
          }

          scheduleRefresh();
        },
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [assetKey, router, sessionId, supabase]);

  const mergedMessages = useMemo(() => {
    const ids = new Set(messages.map((message) => message.id));
    const pendingMessages = optimisticMessages.filter((message) => !ids.has(message.id));

    return [...messages, ...pendingMessages].sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
  }, [messages, optimisticMessages]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draftPayload) !== JSON.stringify(savedDraftPayload),
    [draftPayload, savedDraftPayload],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const instruction = textareaRef.current?.value?.trim() ?? "";
    if (instruction.length < 8) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setRevisionNotice(null);
    setOptimisticMessages((current) => [
      ...current,
      {
        id: `optimistic-${Date.now()}`,
        role: "user",
        contentText: instruction,
        createdAt: new Date().toISOString(),
        optimistic: true,
      },
    ]);
    setStreamingAssistant({
      text: "",
      statusTitle: "Innova is refining the page",
      statusBody:
        "Reviewing the latest landing page draft, applying your instruction, and preparing a new governed revision.",
    });

    try {
      const response = await fetch("/api/pm-workspace/assets/landing-page/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          assetKey,
          message: instruction,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("The landing page editor could not open a live stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          handleStreamEvent(JSON.parse(line) as LandingPageEditorStreamEvent);
        }
      }

      if (textareaRef.current) {
        textareaRef.current.value = "";
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The landing page editor could not send that instruction.";
      setStreamingAssistant(null);
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    if (!hasUnsavedChanges || saveState === "saving") {
      return;
    }

    setSaveState("saving");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/pm-workspace/assets/landing-page/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          assetKey,
          draftPayload,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "The manual landing page save failed.");
      }

      setSavedDraftPayload(draftPayload);
      setSaveState("saved");
      setRevisionNotice({
        id: `${Date.now()}`,
        title: "Manual draft saved",
        body: "Your inline page edits were saved as a new governed draft revision.",
      });
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "The manual landing page save failed.",
      );
    }
  }

  async function handleUndoDraft() {
    if (saveState === "undoing") {
      return;
    }

    setSaveState("undoing");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/pm-workspace/assets/landing-page/undo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          assetKey,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { draftPayload?: Record<string, unknown>; error?: string }
        | null;

      if (!response.ok || !payload?.draftPayload) {
        throw new Error(payload?.error ?? "There is no previous landing page revision to restore.");
      }

      setDraftPayload(payload.draftPayload);
      setSavedDraftPayload(payload.draftPayload);
      setSaveState("saved");
      setRevisionNotice({
        id: `${Date.now()}`,
        title: "Previous revision restored",
        body: "Undo created a new governed draft from the previous landing-page revision.",
      });
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "The landing page undo action failed.",
      );
    }
  }

  function handleSectionFieldChange(
    sectionKey: string,
    field: "headline" | "subheadline" | "body" | "ctaLabel",
    value: string,
  ) {
    setSaveState("idle");
    setDraftPayload((current) => updateLandingPageSection(current, sectionKey, field, value));
  }

  function handleTitleChange(value: string) {
    setSaveState("idle");
    setDraftPayload((current) => ({
      ...current,
      title: value,
    }));
  }

  function handleStreamEvent(event: LandingPageEditorStreamEvent) {
    if (event.type === "status") {
      setStreamingAssistant((current) => ({
        text: current?.text ?? "",
        statusTitle: event.title,
        statusBody: event.body,
      }));
      return;
    }

    if (event.type === "delta") {
      setStreamingAssistant((current) => ({
        text: `${current?.text ?? ""}${event.text}`,
        statusTitle: current?.statusTitle ?? "Innova is refining the page",
        statusBody: current?.statusBody ?? null,
      }));
      return;
    }

    if (event.type === "done") {
      setRevisionNotice({
        id: `${Date.now()}`,
        title: "New revision created",
        body: "The latest governed landing-page draft has been saved. Review the preview and continue refining if needed.",
      });
      setTimeout(() => {
        router.refresh();
      }, 250);
      return;
    }

    setStreamingAssistant(null);
    setErrorMessage(event.message);
  }

  const canvasMode = Boolean(publishPanel);
  const previewUrl = resolvePreviewUrl(asset);
  const previewStatusLabel = previewUrl ? "Preview ready" : "Draft preview";

  return (
    <div
      className={
        canvasMode
          ? "pm-workspace-theme grid h-full grid-cols-[320px_minmax(640px,1fr)_280px] overflow-hidden bg-[var(--ws-bg-base)]"
          : "grid gap-5 xl:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.2fr)]"
      }
    >
      <section
        className={
          canvasMode
            ? "flex min-h-0 flex-col overflow-hidden border-r border-r-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-base)]"
            : "flex min-h-[720px] flex-col overflow-hidden rounded-2xl border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-panel)]"
        }
      >
        <div
          className={
            canvasMode
              ? "shrink-0 border-b border-b-[color:var(--ws-b-faint)] bg-[var(--ws-bg-surface)] px-3.5 py-3"
              : "border-b border-b-[color:var(--ws-b-subtle)] px-5 py-4"
          }
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div
                className={
                  canvasMode
                    ? "text-[9px] font-bold uppercase tracking-[.12em] text-[var(--ws-gold-bright)]"
                    : "text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ws-t-tertiary)]"
                }
              >
                Innova Page Editor
              </div>
              <div
                className={
                  canvasMode
                    ? "mt-1 text-[12px] font-medium leading-snug text-[var(--ws-t-primary)]"
                    : "mt-2 text-[15px] font-semibold text-[var(--ws-t-primary)]"
                }
              >
                Refine this landing page conversationally
              </div>
            </div>
            {!embeddedInWorkspace ? (
              <Link
                href={buildCreateHref(
                  sessionId,
                  asset.editPrompt,
                )}
                className="rounded-full border border-[color:var(--ws-b-default)] px-3 py-2 text-[11px] font-medium text-[var(--ws-t-secondary)] transition hover:bg-[var(--ws-b-faint)] hover:text-[var(--ws-t-primary)]"
              >
                Open in PM workspace
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href={`/app/create?session=${sessionId}&panel=assets`}
                  className="rounded-[var(--ws-r-xs)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-2 py-1 text-[9px] font-bold uppercase tracking-[.06em] text-[var(--ws-t-tertiary)] transition hover:border-[color:var(--ws-b-default)] hover:text-[var(--ws-t-primary)]"
                >
                  Workspace
                </Link>
                <span className="rounded-[var(--ws-r-xs)] border border-[color:var(--ws-blue-bdr)] bg-[var(--ws-blue-sub)] px-2 py-1 text-[9px] font-bold uppercase tracking-[.06em] text-[var(--ws-blue-bright)]">
                  Canvas
                </span>
              </div>
            )}
          </div>
        </div>

        {canvasMode && revisionNotice ? (
          <div className="flex shrink-0 items-start gap-2 border-b border-b-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] px-3.5 py-2.5">
            <RevisionCheckIcon />
            <div className="text-[11px] leading-5 text-[var(--ws-t-secondary)]">
              <strong className="font-semibold text-[var(--ws-green-bright)]">
                {revisionNotice.title}
              </strong>{" "}
              {revisionNotice.body}
            </div>
          </div>
        ) : null}

        <div className={canvasMode ? "flex-1 overflow-y-auto px-3.5 py-3" : "flex-1 overflow-y-auto px-5 py-5"}>
          {mergedMessages.length === 0 ? (
            <div
              className={
                canvasMode
                  ? "rounded-[var(--ws-r-lg)] border border-dashed border-[color:var(--ws-b-default)] bg-[var(--ws-bg-input)] px-3 py-3 text-[11px] leading-5 text-[var(--ws-t-secondary)]"
                  : "rounded-2xl border border-dashed border-[color:var(--ws-b-default)] bg-[var(--ws-bg-input)] px-5 py-5 text-[12px] leading-7 text-[var(--ws-t-secondary)]"
              }
            >
              Start with a natural request like &ldquo;Make the hero more premium and adjust the colors toward midnight blue and gold,&rdquo; then review the new page revision in the preview.
            </div>
          ) : (
            <div className={canvasMode ? "flex flex-col gap-3" : "space-y-6"}>
              {mergedMessages.map((message) => (
                <div
                  key={message.id}
                  className={message.role === "user" ? "ml-auto max-w-[86%]" : "max-w-[92%]"}
                >
                  <div className="mb-1.5 flex items-center gap-2 text-[10.5px] text-[var(--ws-t-muted)]">
                    <span className="font-semibold text-[var(--ws-t-secondary)]">
                      {message.role === "user" ? "You" : "Innova"}
                    </span>
                    <span>{formatTimestamp(message.createdAt)}</span>
                    {"optimistic" in message ? (
                      <span className="rounded-full border border-[color:var(--ws-b-default)] px-2 py-0.5 text-[10px] text-[var(--ws-t-secondary)]">
                        Sending
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={
                      message.role === "user"
                        ? canvasMode
                          ? "rounded-[var(--ws-r-md)] rounded-tr-[2px] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-elevated)] px-3 py-2.5 text-[12px] leading-5 text-[var(--ws-t-primary)]"
                          : "rounded-2xl border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-elevated)] px-5 py-4 text-[14px] leading-8 text-[var(--ws-t-primary)]"
                        : canvasMode
                          ? "rounded-[var(--ws-r-md)] rounded-tl-[2px] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3 py-2.5 text-[12px] leading-5 text-[var(--ws-t-secondary)]"
                          : "rounded-2xl border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-input)] px-5 py-4 text-[14px] leading-8 text-[var(--ws-t-primary)]"
                    }
                  >
                    {message.contentText}
                  </div>
                </div>
              ))}

              {streamingAssistant ? (
                <div className="max-w-[88%]">
                  <div className="mb-2 flex items-center gap-2 text-[11px] text-[var(--ws-t-muted)]">
                    <span className="font-semibold text-[var(--ws-t-secondary)]">Innova</span>
                    <span>now</span>
                  </div>
                  <div className="rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3 py-3">
                    <div className="mb-2 text-[12px] font-semibold text-[var(--ws-t-primary)]">
                      {streamingAssistant.statusTitle ?? "Innova is refining the page"}
                    </div>
                    {streamingAssistant.statusBody ? (
                      <div className="mb-3 text-[11px] leading-5 text-[var(--ws-t-tertiary)]">
                        {streamingAssistant.statusBody}
                      </div>
                    ) : null}
                    {streamingAssistant.text ? (
                      <div className="text-[12px] leading-5 text-[var(--ws-t-primary)]">
                        {streamingAssistant.text}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[12px] text-[var(--ws-t-tertiary)]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--ws-gold)]" />
                        Preparing the next draft revision
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className={canvasMode ? "shrink-0 border-t border-t-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-surface)] px-3 py-3" : "border-t border-t-[color:var(--ws-b-subtle)] px-5 py-4"}>
          {!canvasMode && revisionNotice ? (
            <div className="mb-3 rounded-xl border border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] px-4 py-3 text-[11.5px] leading-6 text-[var(--ws-t-primary)]">
              <div className="font-semibold text-[var(--ws-green-bright)]">{revisionNotice.title}</div>
              <div className="mt-1">{revisionNotice.body}</div>
            </div>
          ) : null}
          {errorMessage ? (
            <div className="mb-3 rounded-xl border border-[color:var(--ws-red-bdr)] bg-[var(--ws-red-sub)] px-4 py-3 text-[11.5px] leading-6 text-[var(--ws-red-bright)]">
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className={canvasMode ? "rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-input)] px-3.5 py-3" : "rounded-[22px] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-input)] px-4 py-3 shadow-[0_-8px_24px_rgba(2,6,14,0.08)]"}>
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  name="message"
                  required
                  minLength={8}
                  rows={canvasMode ? 3 : 1}
                  placeholder={canvasMode ? "Tell Innova what to change..." : "Tell Innova how to change the page. Example: Shift the palette to midnight blue and gold, tighten the hero, and add a FAQ section."}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.shiftKey) {
                      return;
                    }

                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }}
                  className={canvasMode ? "min-h-[58px] max-h-[132px] flex-1 resize-none bg-transparent text-[13px] leading-6 text-[var(--ws-t-primary)] outline-none placeholder:text-[var(--ws-t-muted)]" : "min-h-[22px] max-h-[132px] flex-1 resize-none bg-transparent text-[14px] leading-7 text-[var(--ws-t-primary)] outline-none placeholder:text-[var(--ws-t-muted)]"}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={canvasMode ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ws-r-lg)] bg-[var(--ws-gold)] text-[var(--ws-bg-base)] transition hover:bg-[var(--ws-gold-bright)] disabled:cursor-not-allowed disabled:opacity-70" : "flex h-9 min-w-[106px] items-center justify-center gap-2 rounded-full bg-[var(--ws-gold)] px-3.5 text-[11.5px] font-semibold text-[var(--ws-bg-base)] transition hover:bg-[var(--ws-gold-bright)] disabled:cursor-not-allowed disabled:opacity-70"}
                >
                  {isSubmitting && !canvasMode ? (
                    <>
                      <SpinnerIcon />
                      Editing...
                    </>
                  ) : isSubmitting ? (
                    <SpinnerIcon />
                  ) : (
                    <>
                      {!canvasMode ? "Send" : null}
                      <SendIcon />
                    </>
                  )}
                </button>
              </div>
              <div className={canvasMode ? "mt-2 text-right text-[9.5px] leading-4 text-[var(--ws-t-muted)]" : "mt-2 flex items-center justify-between gap-3 px-1 text-[10.5px] text-[var(--ws-t-tertiary)]"}>
                {!canvasMode ? (
                  <span>Innova drafts a new landing-page revision for review. The live page is not changed directly.</span>
                ) : null}
                {!canvasMode ? (
                  <span className="shrink-0">{isSubmitting ? "Working..." : "Enter to send"}</span>
                ) : (
                  <span>Enter to send - Shift+Enter for newline</span>
                )}
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className={canvasMode ? "flex min-h-0 flex-col overflow-hidden bg-[var(--ws-bg-base)]" : "space-y-4"}>
        <div
          className={
            canvasMode
              ? "flex h-9 shrink-0 items-center gap-2 border-b border-b-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-surface)] px-3.5"
              : "rounded-2xl border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-panel)] p-5"
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <AssetStatusBadge tone={asset.statusTone}>{asset.statusLabel}</AssetStatusBadge>
            <span className="rounded-full border border-[color:var(--ws-b-default)] px-3 py-1 text-[11px] text-[var(--ws-t-secondary)]">
              {asset.typeLabel}
            </span>
            <span className="rounded-full border border-[color:var(--ws-b-default)] px-3 py-1 text-[11px] text-[var(--ws-t-secondary)]">
              {asset.meta}
            </span>
          </div>
          {canvasMode ? (
            <>
              <span
                className={`ml-auto rounded-[var(--ws-r-xs)] border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[.06em] ${
                  hasUnsavedChanges
                    ? "border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[var(--ws-gold-bright)]"
                    : "border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] text-[var(--ws-green-bright)]"
                }`}
              >
                {hasUnsavedChanges ? "Unsaved changes" : previewStatusLabel}
              </span>
              <button
                type="button"
                onClick={handleUndoDraft}
                disabled={saveState === "undoing"}
                className="rounded-[var(--ws-r-xs)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[.06em] text-[var(--ws-t-tertiary)] transition hover:border-[color:var(--ws-b-default)] hover:text-[var(--ws-t-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveState === "undoing" ? "Undoing" : "Undo"}
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={!hasUnsavedChanges || saveState === "saving"}
                className="rounded-[var(--ws-r-xs)] border border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[.06em] text-[var(--ws-gold-bright)] transition hover:bg-[var(--ws-bg-card)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved" : "Save draft"}
              </button>
              <span className="rounded-[var(--ws-r-xs)] border border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[.06em] text-[var(--ws-green-bright)]">
                {previewStatusLabel}
              </span>
            </>
          ) : (
            <>
              <div className="mt-4 text-[18px] font-semibold text-[var(--ws-t-primary)]">
                {asset.previewTitle}
              </div>
              <p className="mt-3 text-[12px] leading-7 text-[var(--ws-t-secondary)]">
                Each successful turn creates a new governed landing-page revision. Review the preview here, then move into approvals when the page is ready.
              </p>
            </>
          )}
        </div>

        <div className={canvasMode ? "flex-1 overflow-y-auto p-4" : ""}>
          {canvasMode ? (
            <LandingPageDraftPreview
              payload={draftPayload}
              editable={{
                enabled: true,
                onSectionFieldChange: handleSectionFieldChange,
                onTitleChange: handleTitleChange,
              }}
            />
          ) : (
            <AssetDraftPreview asset={asset} />
          )}
        </div>
      </section>
      {publishPanel}
    </div>
  );
}

function upsertMessage(
  current: LandingPageEditorMessage[],
  incoming: LandingPageEditorMessage,
) {
  const existingIndex = current.findIndex((message) => message.id === incoming.id);
  if (existingIndex === -1) {
    return [...current, incoming].sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
  }

  const next = [...current];
  next[existingIndex] = incoming;
  return next;
}

function isLandingPageEditorMessage(value: unknown, assetKey: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    payload.assetType === "landing_page" &&
    typeof payload.assetKey === "string" &&
    payload.assetKey === assetKey
  );
}

function resolvePreviewUrl(asset: DerivedAsset) {
  if (
    asset.artifactPayload &&
    typeof asset.artifactPayload === "object" &&
    !Array.isArray(asset.artifactPayload)
  ) {
    const payload = asset.artifactPayload as Record<string, unknown>;
    return typeof payload.previewUrl === "string" && payload.previewUrl.trim().length > 0
      ? payload.previewUrl
      : null;
  }

  return null;
}

function getLandingPagePayload(asset: DerivedAsset) {
  if (
    asset.artifactPayload &&
    typeof asset.artifactPayload === "object" &&
    !Array.isArray(asset.artifactPayload)
  ) {
    return structuredClone(asset.artifactPayload as Record<string, unknown>);
  }

  return {
    title: asset.previewTitle,
    sections: [],
  };
}

function updateLandingPageSection(
  payload: Record<string, unknown>,
  sectionKey: string,
  field: "headline" | "subheadline" | "body" | "ctaLabel",
  value: string,
) {
  const existingSections = Array.isArray(payload.sections)
    ? payload.sections.filter(
        (section): section is Record<string, unknown> =>
          typeof section === "object" && section !== null && !Array.isArray(section),
      )
    : [];

  const normalizedSectionKey = sectionKey.trim().length > 0 ? sectionKey.trim() : "section";
  const existingIndex = existingSections.findIndex(
    (section) =>
      typeof section.sectionKey === "string" &&
      section.sectionKey.toLowerCase() === normalizedSectionKey.toLowerCase(),
  );
  const nextSections = [...existingSections];

  if (existingIndex === -1) {
    nextSections.push({
      sectionKey: normalizedSectionKey,
      displayOrder: nextSections.length + 1,
      [field]: value,
    });
  } else {
    nextSections[existingIndex] = {
      ...nextSections[existingIndex],
      [field]: value,
    };
  }

  return {
    ...payload,
    sections: nextSections,
    revisionSummary: "Manual inline edits saved from the page editor.",
  };
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function SendIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2 1 7l5 3 2 5 6-13Z" />
      <path d="m6 10 3-3" />
    </svg>
  );
}

function RevisionCheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-[var(--ws-green-bright)]"
      aria-hidden
    >
      <path d="M13.5 4.5 6.5 11.5 3 8" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
      className="animate-spin"
    >
      <path d="M12 2v4" />
      <path d="M12 18v4" opacity="0.3" />
      <path d="M4.93 4.93l2.83 2.83" opacity="0.6" />
      <path d="M16.24 16.24l2.83 2.83" opacity="0.3" />
      <path d="M2 12h4" opacity="0.5" />
      <path d="M18 12h4" opacity="0.3" />
      <path d="M4.93 19.07l2.83-2.83" opacity="0.4" />
      <path d="M16.24 7.76l2.83-2.83" opacity="0.3" />
    </svg>
  );
}
