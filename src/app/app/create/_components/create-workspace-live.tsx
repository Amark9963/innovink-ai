"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CreateMessageComposer } from "@/app/app/create/_components/create-message-composer";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  AgentCreateWorkspaceData,
  AgentEventSummary,
  AgentMessageSummary,
  AgentRunSummary,
} from "@/lib/supabase/queries";

type CreateWorkspaceLiveProps = {
  workspaceId: string;
  sessionId: string | null;
  initialSessions: AgentCreateWorkspaceData["sessions"];
  initialMessages: AgentMessageSummary[];
  initialRuns: AgentRunSummary[];
  initialEvents: AgentEventSummary[];
  initialPrompt: string;
  initialStatus: string | null;
  initialError: string | null;
  statusCopy: Record<string, string>;
  isFirstRun: boolean;
  templates: ReadonlyArray<{
    name: string;
    description: string;
    badge: string;
    iconClass: string;
    prompt: string;
  }>;
};

type OptimisticMessage = {
  id: string;
  role: "user";
  kind: "chat";
  contentText: string;
  createdAt: string;
  optimistic: true;
};

type RuntimeWorkingState = {
  title: string;
  body: string;
};

export function CreateWorkspaceLive({
  workspaceId,
  sessionId,
  initialSessions,
  initialMessages,
  initialRuns,
  initialEvents,
  initialPrompt,
  initialStatus,
  initialError,
  statusCopy,
  isFirstRun,
  templates,
}: CreateWorkspaceLiveProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState(initialMessages);
  const [runs, setRuns] = useState(initialRuns);
  const [events, setEvents] = useState(initialEvents);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        router.refresh();
      }, 700);
    };

    const channel = supabase
      .channel(`pm-workspace-${sessionId}`)
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
                kind: string;
                content_text: string | null;
                created_at: string;
              }
            | undefined;

          if (!record || !record.content_text) {
            return;
          }

          setMessages((current) =>
            upsertById(
              current,
              {
                id: record.id,
                role: record.role,
                kind: record.kind as AgentMessageSummary["kind"],
                contentText: record.content_text,
                contentPayload: null,
                createdAt: record.created_at,
              },
              (item) => item.createdAt,
            ),
          );

          if (record.role === "assistant") {
            setOptimisticMessages([]);
          }

          scheduleRefresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_runs",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const record = (payload.new || payload.old) as
            | {
                id: string;
                run_type: AgentRunSummary["runType"];
                status: AgentRunSummary["status"];
                goal_text: string | null;
                summary: string | null;
                current_task_id: string | null;
                started_at: string | null;
                completed_at: string | null;
                created_at: string;
              }
            | undefined;

          if (!record) {
            return;
          }

          setRuns((current) =>
            upsertById(
              current,
              {
                id: record.id,
                runType: record.run_type,
                status: record.status,
                goalText: record.goal_text,
                summary: record.summary,
                currentTaskId: record.current_task_id,
                startedAt: record.started_at,
                completedAt: record.completed_at,
                createdAt: record.created_at,
              },
              (item) => item.createdAt,
            ),
          );

          scheduleRefresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_events",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const record = (payload.new || payload.old) as
            | {
                id: string;
                run_id: string | null;
                task_id: string | null;
                tool_call_id: string | null;
                event_type: AgentEventSummary["eventType"];
                severity: AgentEventSummary["severity"];
                title: string;
                body: string | null;
                event_payload: AgentEventSummary["eventPayload"];
                created_at: string;
                visible_to_user?: boolean;
              }
            | undefined;

          if (!record || record.visible_to_user === false) {
            return;
          }

          setEvents((current) =>
            upsertById(
              current,
              {
                id: record.id,
                runId: record.run_id,
                taskId: record.task_id,
                toolCallId: record.tool_call_id,
                eventType: record.event_type,
                severity: record.severity,
                title: record.title,
                body: record.body,
                eventPayload: record.event_payload,
                createdAt: record.created_at,
              },
              (item) => item.createdAt,
            ),
          );

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
  }, [router, sessionId, supabase]);

  const mergedMessages = useMemo(() => {
    const serverIds = new Set(messages.map((message) => message.id));
    const pendingMessages = optimisticMessages.filter((message) => !serverIds.has(message.id));
    return [...messages, ...pendingMessages].sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
  }, [messages, optimisticMessages]);

  const activeRun = useMemo(
    () =>
      runs.find((run) =>
        ["queued", "planning", "running", "waiting_for_input", "waiting_for_approval", "blocked"].includes(
          run.status,
        ),
      ) ?? null,
    [runs],
  );

  const latestEvent = events[0] ?? null;
  const runtimeWorkingState: RuntimeWorkingState | null =
    activeRun || optimisticMessages.length > 0
      ? {
          title: activeRun
            ? `Innova is ${humanizeRunStatus(activeRun.status)}`
            : "Innova is preparing the next run",
          body:
            latestEvent?.body ??
            activeRun?.summary ??
            "The PM workspace is processing your latest instruction and updating the governed runtime trace.",
        }
      : null;

  const onOptimisticSubmit = (message: string) => {
    const now = new Date().toISOString();
    setOptimisticMessages([
      {
        id: `optimistic-${now}`,
        role: "user",
        kind: "chat",
        contentText: message,
        createdAt: now,
        optimistic: true,
      },
    ]);
  };

  const sessionLinks = initialSessions.slice(0, 4);
  const promptLoaded = searchParams.get("prompt") ?? initialPrompt;
  const error = searchParams.get("error") ?? initialError;
  const status = searchParams.get("status") ?? initialStatus;
  const compactTemplates = templates.slice(0, 3);

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col bg-[#07101f]">
      <div className="flex shrink-0 items-center justify-between border-b border-white/7 bg-[#111e30] px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#b08a2838] bg-[#b08a2810] text-[11px] font-semibold text-[#ccaa4a] shadow-[0_0_16px_rgba(176,138,40,0.22)]">
            AI
          </div>
          <div>
            <div className="text-[13px] font-medium text-[#eae5dc]">
              Innova - AI Program Architect
            </div>
            <div className="text-[11px] text-[#9baabf]">
              Ready to build your program · Live workspace runtime enabled
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled={sessionLinks.length === 0}
          className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc] disabled:cursor-not-allowed disabled:opacity-50"
        >
          History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-7">
        {error ? (
          <div className="mx-auto mb-5 max-w-[580px] rounded-lg border border-[#9b3a3a66] bg-[#9b3a3a1a] px-4 py-3 text-[12px] text-[#f1bcbc]">
            {error}
          </div>
        ) : null}
        {status && statusCopy[status] ? (
          <div className="mx-auto mb-5 max-w-[580px] rounded-lg border border-[#3a6e9e40] bg-[#3a6e9e1a] px-4 py-3 text-[12px] text-[#c4d8ec]">
            <div>{statusCopy[status]}</div>
            {sessionId && status === "brief-ready" ? (
              <div className="mt-3">
                <Link
                  href={`/app/create/${sessionId}/brief`}
                  className="inline-flex items-center gap-2 rounded-md border border-[#84b1d640] px-3 py-2 text-[11.5px] font-medium text-[#d9e7f4] transition hover:bg-[#84b1d614]"
                >
                  Review brief
                  <ArrowRightIcon />
                </Link>
              </div>
            ) : null}
            {sessionId && status === "plan-generated" ? (
              <div className="mt-3">
                <Link
                  href={`/app/create/${sessionId}/plan`}
                  className="inline-flex items-center gap-2 rounded-md border border-[#84b1d640] px-3 py-2 text-[11.5px] font-medium text-[#d9e7f4] transition hover:bg-[#84b1d614]"
                >
                  Review plan
                  <ArrowRightIcon />
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
        {promptLoaded ? (
          <div className="mx-auto mb-5 max-w-[580px] rounded-lg border border-[#b08a2838] bg-[#b08a2810] px-4 py-3 text-[12px] text-[#e4d8b4]">
            Innova loaded a follow-up prompt from the review workspace. You can edit it before sending.
          </div>
        ) : null}

        {isFirstRun ? (
          <div className="mx-auto mb-5 max-w-[860px] rounded-xl border border-white/7 bg-[#101a2c] px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-[560px]">
                <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#ccaa4a]">
                  PM command surface
                </div>
                <div className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
                  Give Innova one clear instruction and let the workspace build from there
                </div>
                <p className="mt-2 text-[12.5px] leading-6 text-[#9baabf]">
                  Start with the outcome you want, the audience, the timeline, and any governance constraints. The live thread will carry the draft, open questions, plan, and approval readiness forward.
                </p>
              </div>
              <div className="grid min-w-[260px] gap-2">
                {compactTemplates.map((template) => (
                  <Link
                    key={template.name}
                    href={buildPromptHref(pathname, workspaceId, template.prompt)}
                    className="rounded-lg border border-white/10 bg-[#162034] px-3 py-3 text-[11.5px] text-[#c6d1de] transition hover:border-[#b08a2838] hover:bg-[#1b2840]"
                  >
                    <div className="font-semibold text-[#eae5dc]">{template.name}</div>
                    <div className="mt-1 line-clamp-2 text-[10.5px] leading-5 text-[#8fa0b6]">
                      {template.description}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {runs.length > 0 ? (
          <div className="mx-auto mb-6 max-w-[860px] rounded-xl border border-white/7 bg-[#101a2c] p-5">
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#ccaa4a]">
              Agent runtime
            </div>
            <div className="text-[18px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
              Active PM workspace trace
            </div>
            <p className="mt-2 max-w-[720px] text-[12.5px] leading-6 text-[#9baabf]">
              The workspace now updates from live runtime events instead of waiting for a full page roundtrip to reveal what the agent is doing.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_1.35fr]">
              <div className="space-y-3">
                {runs.slice(0, 3).map((run) => (
                  <article
                    key={run.id}
                    className="rounded-lg border border-white/7 bg-[#162034] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[12.5px] font-semibold text-[#eae5dc]">
                          {humanizeRunType(run.runType)}
                        </div>
                        <div className="mt-1 text-[10.5px] uppercase tracking-[0.08em] text-[#5e7088]">
                          {run.id.slice(0, 8)} · {run.status}
                        </div>
                      </div>
                      <span className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-[0.08em] text-[#9baabf]">
                        {formatDateTime(run.createdAt)}
                      </span>
                    </div>
                    {run.summary ? (
                      <p className="mt-3 text-[11.5px] leading-5 text-[#c4d0df]">
                        {run.summary}
                      </p>
                    ) : null}
                    {run.goalText ? (
                      <p className="mt-3 line-clamp-3 text-[11px] leading-5 text-[#7f90a6]">
                        {run.goalText}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
              <div className="rounded-lg border border-white/7 bg-[#162034] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[12.5px] font-semibold text-[#eae5dc]">
                    Recent runtime events
                  </div>
                  <div className="text-[10.5px] uppercase tracking-[0.08em] text-[#5e7088]">
                    Live visible events
                  </div>
                </div>
                <div className="space-y-3">
                  {events.slice(0, 8).map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-white/7 bg-[#1b2840] px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11.5px] font-semibold text-[#eae5dc]">
                            {event.title}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#5e7088]">
                            {event.eventType} · {event.severity}
                          </div>
                        </div>
                        <div className="text-[10px] text-[#7f90a6]">
                          {formatDateTime(event.createdAt)}
                        </div>
                      </div>
                      {event.body ? (
                        <p className="mt-2 text-[11px] leading-5 text-[#9baabf]">
                          {event.body}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mx-auto max-w-[580px] space-y-4">
          {mergedMessages.length > 0 ? (
            <>
              {mergedMessages.map((message) => {
                const isOptimistic = "optimistic" in message;

                return (
                  <article
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="flex max-w-full gap-3">
                      {message.role !== "user" ? (
                        <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-md bg-[#b08a2810] text-[10px] font-semibold text-[#ccaa4a]">
                          AI
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-3 text-[10.5px] text-[#5e7088]">
                          <span className="font-semibold uppercase tracking-[0.08em]">
                            {message.role === "user" ? "Program Manager" : "Innova"}
                          </span>
                          <span>
                            {isOptimistic ? "Sending..." : formatDateTime(message.createdAt)}
                          </span>
                        </div>
                        <div
                          className={`rounded-[16px] border px-4 py-3 text-[13px] leading-6 ${
                            message.role === "user"
                              ? "border-[#21486f] bg-[#16375a] text-white"
                              : "border-white/7 bg-[#162034] text-[#eae5dc]"
                          } ${isOptimistic ? "opacity-80" : ""}`}
                        >
                          <p className="whitespace-pre-wrap">{message.contentText}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
              {runtimeWorkingState ? (
                <article className="flex justify-start">
                  <div className="flex max-w-full gap-3">
                    <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-md bg-[#b08a2810] text-[10px] font-semibold text-[#ccaa4a]">
                      AI
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-3 text-[10.5px] text-[#5e7088]">
                        <span className="font-semibold uppercase tracking-[0.08em]">
                          Innova
                        </span>
                        <span>Working…</span>
                      </div>
                      <div className="rounded-[16px] border border-[#b08a2838] bg-[#162034] px-4 py-3 text-[13px] leading-6 text-[#eae5dc]">
                        <div className="flex items-center gap-2 text-[#e4d8b4]">
                          <SpinnerIcon />
                          <span className="font-medium">{runtimeWorkingState.title}</span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-[#b8c4d4]">
                          {runtimeWorkingState.body}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ) : null}
            </>
          ) : (
            <EmptyAssistantState
              workspaceId={workspaceId}
              pathname={pathname}
              templates={compactTemplates}
            />
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/7 bg-[#0c1525] px-6 py-4">
        <div className="mx-auto max-w-[720px]">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#5e7088]">
              Mode
            </span>
            <div className="rounded-sm border border-[#b08a2838] bg-[#b08a2810] px-2 py-1 text-[10.5px] text-[#ccaa4a]">
              Full program setup
            </div>
            <div className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] text-[#9baabf]">
              Brief only
            </div>
            <div className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] text-[#9baabf]">
              Plan only
            </div>
          </div>

          {sessionLinks.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {sessionLinks.map((session) => (
                <Link
                  key={session.id}
                  href={`/app/create?session=${session.id}&workspace=${session.workspaceId}`}
                  className={`rounded-sm border px-2 py-1 text-[10.5px] ${
                    session.id === sessionId
                      ? "border-[#b08a2838] bg-[#b08a2810] text-[#ccaa4a]"
                      : "border-white/10 bg-white/[0.03] text-[#9baabf]"
                  }`}
                >
                  {session.title ?? "Untitled workspace"}
                </Link>
              ))}
            </div>
          ) : null}

          <CreateMessageComposer
            key={`composer-${sessionId ?? "new"}-${promptLoaded}`}
            workspaceId={workspaceId}
            sessionId={sessionId}
            defaultMessage={promptLoaded}
            onOptimisticSubmit={onOptimisticSubmit}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyAssistantState({
  workspaceId,
  pathname,
  templates,
}: {
  workspaceId: string;
  pathname: string;
  templates: ReadonlyArray<{
    name: string;
    description: string;
    badge: string;
    iconClass: string;
    prompt: string;
  }>;
}) {
  return (
    <div className="rounded-[20px] border border-white/7 bg-[#162034] px-5 py-5 text-[#eae5dc]">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#b08a2810] text-[10px] font-semibold text-[#ccaa4a]">
          AI
        </div>
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#ccaa4a]">
            Innova ready
          </div>
          <div className="mt-1 text-[14px] font-semibold text-[#eae5dc]">
            State the program outcome you want to achieve
          </div>
        </div>
      </div>
      <p className="mt-4 text-[13px] leading-6 text-[#b8c4d4]">
        Use the composer below to describe the program, timeline, audience, and constraints. Innova will build the governed brief and carry the rest of the workspace forward from there.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {templates.map((template) => (
          <Link
            key={template.name}
            href={buildPromptHref(pathname, workspaceId, template.prompt)}
            className="rounded-md border border-white/10 px-3 py-2 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            {template.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
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

function buildPromptHref(pathname: string, workspaceId: string, prompt: string) {
  return `${pathname}?workspace=${workspaceId}&prompt=${encodeURIComponent(prompt)}`;
}

function humanizeRunType(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function humanizeRunStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function upsertById<T extends { id: string }>(
  current: T[],
  nextItem: T,
  getDate: (item: T) => string,
) {
  const next = [...current];
  const index = next.findIndex((item) => item.id === nextItem.id);

  if (index >= 0) {
    next[index] = nextItem;
  } else {
    next.unshift(nextItem);
  }

  return next.sort(
    (left, right) =>
      new Date(getDate(right)).getTime() - new Date(getDate(left)).getTime(),
  );
}
