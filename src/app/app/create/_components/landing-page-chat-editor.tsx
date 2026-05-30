"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AssetDraftPreview,
  AssetStatusBadge,
  buildCreateHref,
  type DerivedAsset,
} from "@/app/app/create/_components/assets-review-workspace";
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

const starterPrompts = [
  "Make the hero more premium and executive-facing.",
  "Introduce the program as employee-only and shorten the overview.",
  "Add a clearer FAQ section and a stronger registration CTA.",
] as const;

export function LandingPageChatEditor({
  sessionId,
  assetKey,
  asset,
  initialMessages,
  embeddedInWorkspace = false,
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

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.2fr)]">
      <section className="flex min-h-[720px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111e30]">
        <div className="border-b border-white/7 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
                Innova Page Editor
              </div>
              <div className="mt-2 text-[15px] font-semibold text-[#eae5dc]">
                Refine this landing page conversationally
              </div>
            </div>
            {!embeddedInWorkspace ? (
              <Link
                href={buildCreateHref(
                  sessionId,
                  asset.editPrompt,
                )}
                className="rounded-full border border-white/10 px-3 py-2 text-[11px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
              >
                Open in PM workspace
              </Link>
            ) : (
              <span className="rounded-full border border-[#3a6e9e44] bg-[#3a6e9e12] px-3 py-2 text-[11px] font-medium text-[#c4d8ec]">
                Editing inside AI Workspace
              </span>
            )}
          </div>
          <p className="mt-3 max-w-[680px] text-[12px] leading-7 text-[#9baabf]">
            Describe branding, tone, hierarchy, copy, or section changes naturally. Innova will create a new governed draft revision instead of mutating the live page directly.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  if (textareaRef.current) {
                    textareaRef.current.value = prompt;
                    textareaRef.current.focus();
                  }
                }}
                className="rounded-full border border-white/10 bg-[#162034] px-3 py-2 text-left text-[11px] text-[#9baabf] transition hover:border-white/20 hover:text-[#eae5dc]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {mergedMessages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d1727] px-5 py-5 text-[12px] leading-7 text-[#9baabf]">
              Start with a natural request like &ldquo;Make the hero more premium and adjust the colors toward midnight blue and gold,&rdquo; then review the new page revision in the preview.
            </div>
          ) : (
            <div className="space-y-6">
              {mergedMessages.map((message) => (
                <div
                  key={message.id}
                  className={message.role === "user" ? "ml-auto max-w-[82%]" : "max-w-[88%]"}
                >
                  <div className="mb-2 flex items-center gap-2 text-[11px] text-[#6f8199]">
                    <span className="font-semibold text-[#9baabf]">
                      {message.role === "user" ? "You" : "Innova"}
                    </span>
                    <span>{formatTimestamp(message.createdAt)}</span>
                    {"optimistic" in message ? (
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-[#9baabf]">
                        Sending
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={
                      message.role === "user"
                        ? "rounded-2xl border border-white/10 bg-[#182742] px-5 py-4 text-[14px] leading-8 text-[#eae5dc]"
                        : "rounded-2xl border border-white/10 bg-[#0d1727] px-5 py-4 text-[14px] leading-8 text-[#eae5dc]"
                    }
                  >
                    {message.contentText}
                  </div>
                </div>
              ))}

              {streamingAssistant ? (
                <div className="max-w-[88%]">
                  <div className="mb-2 flex items-center gap-2 text-[11px] text-[#6f8199]">
                    <span className="font-semibold text-[#9baabf]">Innova</span>
                    <span>now</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0d1727] px-5 py-4">
                    <div className="mb-2 text-[13px] font-semibold text-[#eae5dc]">
                      {streamingAssistant.statusTitle ?? "Innova is refining the page"}
                    </div>
                    {streamingAssistant.statusBody ? (
                      <div className="mb-3 text-[11.5px] leading-6 text-[#7f92aa]">
                        {streamingAssistant.statusBody}
                      </div>
                    ) : null}
                    {streamingAssistant.text ? (
                      <div className="text-[14px] leading-8 text-[#eae5dc]">
                        {streamingAssistant.text}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[12px] text-[#7f92aa]">
                        <span className="h-2 w-2 rounded-full bg-[#b08a28] animate-pulse" />
                        Preparing the next draft revision
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="border-t border-white/7 px-5 py-4">
          {revisionNotice ? (
            <div className="mb-3 rounded-xl border border-[#2d7a5840] bg-[#2d7a5812] px-4 py-3 text-[11.5px] leading-6 text-[#d6f0e4]">
              <div className="font-semibold text-[#9ad0b7]">{revisionNotice.title}</div>
              <div className="mt-1">{revisionNotice.body}</div>
            </div>
          ) : null}
          {errorMessage ? (
            <div className="mb-3 rounded-xl border border-[#9b3a3a44] bg-[#9b3a3a12] px-4 py-3 text-[11.5px] leading-6 text-[#f1bcbc]">
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="rounded-[22px] border border-white/8 bg-[#0b1423] px-4 py-3 shadow-[0_-8px_24px_rgba(2,6,14,0.08)]">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  name="message"
                  required
                  minLength={8}
                  rows={1}
                  placeholder="Tell Innova how to change the page. Example: Shift the palette to midnight blue and gold, tighten the hero, and add a FAQ section."
                  className="min-h-[22px] max-h-[132px] flex-1 resize-none bg-transparent text-[14px] leading-7 text-[#eae5dc] outline-none placeholder:text-[#607089]"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-9 min-w-[106px] items-center justify-center gap-2 rounded-full bg-[#b08a28] px-3.5 text-[11.5px] font-semibold text-[#06100f] transition hover:bg-[#ccaa4a] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerIcon />
                      Editing...
                    </>
                  ) : (
                    <>
                      Send
                      <SendIcon />
                    </>
                  )}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[10.5px] text-[#5e7088]">
                <span>Innova drafts a new landing-page revision for review. The live page is not changed directly.</span>
                <span className="shrink-0">{isSubmitting ? "Working..." : "Enter to send"}</span>
              </div>
            </div>
          </form>
        </div>
      </section>

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
          <div className="mt-4 text-[18px] font-semibold text-[#eae5dc]">
            {asset.previewTitle}
          </div>
          <p className="mt-3 text-[12px] leading-7 text-[#9baabf]">
            Each successful turn creates a new governed landing-page revision. Review the preview here, then move into approvals when the page is ready.
          </p>
        </div>

        <AssetDraftPreview asset={asset} />
      </section>
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
