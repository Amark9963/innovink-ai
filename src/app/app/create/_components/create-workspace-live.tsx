"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  executeApprovedPlanAction,
  generateProgramPlanAction,
  prepareApprovalRequestAction,
  sendCreateAgentMessageAction,
} from "@/app/app/create/actions";
import {
  CreateMessageComposer,
  type StreamEvent,
} from "@/app/app/create/_components/create-message-composer";
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
  templates: ReadonlyArray<{
    name: string;
    description: string;
    badge: string;
    iconClass: string;
    prompt: string;
  }>;
  stageLabel: string;
  stageTone: "amber" | "gold" | "green";
  userInitial: string;
  canGeneratePlan: boolean;
  canPrepareApprovals: boolean;
  canExecuteApprovedPlan: boolean;
  hasApprovalRequest: boolean;
  hasPendingApproval: boolean;
  latestApprovalId: string | null;
  inlineBriefCard?: {
    openQuestionCount: number;
    programType: string | null;
    format: string | null;
    regions: string | null;
    teamPolicy: string | null;
  } | null;
};

type OptimisticMessage = {
  id: string;
  role: "user";
  kind: "chat";
  contentText: string;
  createdAt: string;
  optimistic: true;
};

type StreamingAssistantState = {
  text: string;
  statusTitle: string | null;
  statusBody: string | null;
  sessionId: string | null;
};

type RuntimeWorkingState = {
  title: string;
  body: string;
  recentEvents: Array<{
    id: string;
    title: string;
  }>;
};

const primaryActionClassName =
  "inline-flex items-center rounded-full bg-[#b08a28] px-3 py-2 text-[11px] font-semibold text-[#06100f] transition hover:bg-[#ccaa4a]";

const secondaryActionClassName =
  "inline-flex items-center rounded-full border border-white/10 bg-[#101a2c] px-3 py-2 text-[11px] font-medium text-[#9baabf] transition hover:bg-[#162034] hover:text-[#eae5dc]";

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
  templates,
  stageLabel,
  stageTone,
  userInitial,
  canGeneratePlan,
  canPrepareApprovals,
  canExecuteApprovedPlan,
  hasApprovalRequest,
  hasPendingApproval,
  latestApprovalId,
  inlineBriefCard,
}: CreateWorkspaceLiveProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState(initialMessages);
  const [runs, setRuns] = useState(initialRuns);
  const [events, setEvents] = useState(initialEvents);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [streamingAssistant, setStreamingAssistant] =
    useState<StreamingAssistantState | null>(null);
  const [showRuntimeDetails, setShowRuntimeDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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
                content_payload: AgentMessageSummary["contentPayload"];
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
                contentPayload: record.content_payload,
                createdAt: record.created_at,
              },
              (item) => item.createdAt,
            ),
          );

          if (record.role === "assistant") {
            setOptimisticMessages([]);
            setStreamingAssistant(null);
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
      runs.find((run) => ["queued", "planning", "running"].includes(run.status)) ?? null,
    [runs],
  );
  const latestActiveRunEvent = useMemo(
    () => (activeRun ? events.find((event) => event.runId === activeRun.id) ?? null : null),
    [activeRun, events],
  );
  const latestUserMessage = useMemo(
    () => [...mergedMessages].reverse().find((message) => message.role === "user")?.contentText ?? null,
    [mergedMessages],
  );
  const latestAssistantMessage = useMemo(
    () =>
      [...mergedMessages].reverse().find(
        (message) => message.role === "assistant",
      ) ?? null,
    [mergedMessages],
  );
  const shouldShowActiveRun = useMemo(() => {
    if (!activeRun) {
      return false;
    }

    if (!latestAssistantMessage) {
      return true;
    }

    const activeRunTimestamp = new Date(
      activeRun.startedAt ?? activeRun.createdAt,
    ).getTime();
    const latestAssistantTimestamp = new Date(
      latestAssistantMessage.createdAt,
    ).getTime();

    return activeRunTimestamp >= latestAssistantTimestamp;
  }, [activeRun, latestAssistantMessage]);
  const runtimeWorkingState: RuntimeWorkingState | null =
    shouldShowActiveRun || optimisticMessages.length > 0 || streamingAssistant
      ? {
          title:
            streamingAssistant?.statusTitle ??
            (activeRun
              ? `Innova is ${humanizeRunStatus(activeRun.status)}`
              : "Innova is preparing the next run"),
          body:
            streamingAssistant?.statusBody ??
            latestActiveRunEvent?.body ??
            activeRun?.summary ??
            "The PM workspace is processing your latest instruction and updating the governed runtime trace.",
          recentEvents:
            activeRun && shouldShowActiveRun
              ? events
                  .filter((event) => event.runId === activeRun.id)
                  .slice(0, 3)
                  .map((event) => ({
                    id: event.id,
                    title: event.title,
                  }))
              : [],
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
    setStreamingAssistant({
      text: "",
      statusTitle: "Innova is starting the run",
      statusBody: "The PM workspace is opening a live agent run for your latest instruction.",
      sessionId,
    });
  };

  const onStreamEvent = (event: StreamEvent) => {
    if (event.type === "session") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("session", event.sessionId);
      params.set("workspace", event.workspaceId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      setStreamingAssistant((current) => ({
        text: current?.text ?? "",
        statusTitle: current?.statusTitle ?? "Innova is starting the run",
        statusBody: current?.statusBody ?? null,
        sessionId: event.sessionId,
      }));
      return;
    }

    if (event.type === "status") {
      setStreamingAssistant((current) => ({
        text: current?.text ?? "",
        statusTitle: event.title,
        statusBody: event.body,
        sessionId: current?.sessionId ?? sessionId,
      }));
      return;
    }

    if (event.type === "delta") {
      setStreamingAssistant((current) => ({
        text: `${current?.text ?? ""}${event.text}`,
        statusTitle: current?.statusTitle ?? "Innova is responding",
        statusBody: current?.statusBody ?? "The live PM workspace response is streaming in.",
        sessionId: current?.sessionId ?? sessionId,
      }));
      return;
    }

    if (event.type === "done") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("session", event.sessionId);
      params.set("workspace", event.workspaceId);
      params.set("status", event.status);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      setOptimisticMessages([]);
      setStreamingAssistant(null);
      router.refresh();
      return;
    }

    if (event.type === "error") {
      const params = new URLSearchParams(searchParams.toString());
      if (event.sessionId) {
        params.set("session", event.sessionId);
      }
      if (event.workspaceId) {
        params.set("workspace", event.workspaceId);
      }
      params.set("error", event.message);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      setStreamingAssistant(null);
      setOptimisticMessages([]);
      router.refresh();
    }
  };

  const promptLoaded = searchParams.get("prompt") ?? initialPrompt;
  const error = searchParams.get("error") ?? initialError;
  const status = searchParams.get("status") ?? initialStatus;
  const currentSessionTitle =
    initialSessions.find((session) => session.id === sessionId)?.title ??
    initialSessions[0]?.title ??
    "New Program";
  const historySessions = initialSessions.slice(0, 8);

  return (
    <div className="relative flex h-[calc(100vh-56px)] flex-col overflow-hidden bg-[#07101f]">
      <header className="border-b border-white/7 bg-[#0c1525] px-4 py-2.5">
        <div className="flex w-full items-center gap-2">
          <Link
            href="/app/dashboard"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5e7088] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
            title="Back to dashboard"
          >
            <BackIcon />
          </Link>
          <div className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-[-0.01em] text-[#eae5dc]">
            {currentSessionTitle}
          </div>
          <StagePill tone={stageTone} label={stageLabel} />
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowRuntimeDetails(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#5e7088] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
              title="Show trace"
            >
              <TraceIcon />
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              disabled={historySessions.length === 0}
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#5e7088] transition hover:bg-white/[0.04] hover:text-[#eae5dc] disabled:cursor-not-allowed disabled:opacity-40"
              title="Session history"
            >
              <HistoryIcon />
            </button>
            <div className="mx-1 h-4 w-px bg-white/7" />
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#111b2d] text-[10px] font-semibold text-[#9baabf]">
              {userInitial}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-7">
        <div className="mx-auto max-w-[660px] space-y-5">
          {error ? <ThreadNotice tone="error" title="Workspace issue" body={error} /> : null}
          {status && statusCopy[status] ? (
            <ThreadNotice tone="info" title="Workspace updated" body={statusCopy[status]} />
          ) : null}
          {promptLoaded ? (
            <ThreadNotice
              tone="amber"
              title="Prompt loaded"
              body="Innova loaded a follow-up prompt from a review surface. Refine it here before sending."
            />
          ) : null}

          <div className="space-y-7">
            {mergedMessages.length > 0 ? (
              <>
                {mergedMessages.map((message) =>
                  message.role === "user" ? (
                    <UserTurn key={message.id} message={message} userInitial={userInitial} />
                  ) : (
                    <AssistantTurn
                      key={message.id}
                      message={message}
                      isLatest={message.id === latestAssistantMessage?.id}
                      workspaceId={workspaceId}
                      sessionId={sessionId}
                      latestUserMessage={latestUserMessage}
                      canGeneratePlan={canGeneratePlan}
                      canPrepareApprovals={canPrepareApprovals}
                      canExecuteApprovedPlan={canExecuteApprovedPlan}
                      hasApprovalRequest={hasApprovalRequest}
                      hasPendingApproval={hasPendingApproval}
                      latestApprovalId={latestApprovalId}
                      inlineBriefCard={message.id === mergedMessages.find((item) => item.role === "assistant")?.id ? inlineBriefCard : null}
                    />
                  ),
                )}
                {streamingAssistant?.text ? (
                  <AssistantStreamingTurn text={streamingAssistant.text} />
                ) : null}
                {runtimeWorkingState && !streamingAssistant?.text ? (
                  <WorkingTurn state={runtimeWorkingState} />
                ) : null}
              </>
            ) : (
              <EmptyAssistantState
                workspaceId={workspaceId}
                pathname={pathname}
                templates={templates.slice(0, 3)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/7 bg-[#0c1525] px-6 py-3">
        <div className="mx-auto max-w-[660px]">
          <CreateMessageComposer
            key={`composer-${sessionId ?? "new"}-${promptLoaded}`}
            workspaceId={workspaceId}
            sessionId={sessionId}
            defaultMessage={promptLoaded}
            onOptimisticSubmit={onOptimisticSubmit}
            onStreamEvent={onStreamEvent}
          />
        </div>
      </div>

      {showHistory ? (
        <DrawerShell
          kicker="History"
          title="Recent sessions"
          onClose={() => setShowHistory(false)}
        >
          <div className="space-y-2">
            {historySessions.map((session) => (
              <Link
                key={session.id}
                href={`/app/create?session=${session.id}&workspace=${session.workspaceId}`}
                className={`flex items-center justify-between rounded-xl border px-3 py-3 text-[12px] transition ${
                  session.id === sessionId
                    ? "border-[#b08a2838] bg-[#b08a2810] text-[#eae5dc]"
                    : "border-white/7 bg-[#162034] text-[#9baabf] hover:bg-[#1b2840] hover:text-[#eae5dc]"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{session.title ?? "Untitled session"}</div>
                  <div className="mt-1 text-[10.5px] text-[#5e7088]">
                    {session.id === sessionId ? "Current session" : "Open session"}
                  </div>
                </div>
                <span className="ml-3 shrink-0 text-[10px] uppercase tracking-[0.08em] text-[#5e7088]">
                  {session.id === sessionId ? "Live" : "Open"}
                </span>
              </Link>
            ))}
          </div>
        </DrawerShell>
      ) : null}

      {showRuntimeDetails ? (
        <DrawerShell
          kicker="Trace"
          title="Agent runtime activity"
          onClose={() => setShowRuntimeDetails(false)}
        >
          {runs.length > 0 ? (
            <>
              <DrawerSectionLabel label="Runs" />
              <div className="space-y-2">
                {runs.slice(0, 3).map((run) => (
                  <div key={run.id} className="rounded-xl border border-white/7 bg-[#162034] px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold text-[#eae5dc]">
                        {humanizeRunType(run.runType)}
                      </div>
                      <span
                        className={`rounded-sm border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] ${
                          run.status === "completed"
                            ? "border-[#2d7a5840] bg-[#2d7a5814] text-[#9ad0b7]"
                            : "border-[#b08a2838] bg-[#b08a2810] text-[#e8c26d]"
                        }`}
                      >
                        {run.status}
                      </span>
                    </div>
                    {run.summary ? (
                      <p className="mt-2 text-[11px] leading-5 text-[#9baabf]">{run.summary}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <DrawerSectionLabel label="Events" />
          <div className="space-y-2">
            {events.slice(0, 8).map((event) => (
              <div key={event.id} className="rounded-xl border border-white/7 bg-[#162034] px-3 py-3">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 text-[10px] text-[#5e7088]">
                    {formatTime(event.createdAt)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11.5px] text-[#eae5dc]">{event.title}</div>
                    {event.body ? (
                      <div className="mt-1 text-[11px] leading-5 text-[#9baabf]">{event.body}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DrawerShell>
      ) : null}
    </div>
  );
}

function StagePill({
  label,
  tone,
}: {
  label: string;
  tone: "amber" | "gold" | "green";
}) {
  const toneClass =
    tone === "amber"
      ? "border-[#c9973a40] bg-[#c9973a12] text-[#e8c26d]"
      : tone === "green"
        ? "border-[#2d7a5840] bg-[#2d7a5814] text-[#9ad0b7]"
        : "border-[#b08a2838] bg-[#b08a2810] text-[#ccaa4a]";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${toneClass}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function UserTurn({
  message,
  userInitial,
}: {
  message: AgentMessageSummary | OptimisticMessage;
  userInitial: string;
}) {
  const isOptimistic = "optimistic" in message;

  return (
    <article className="flex flex-col items-end">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] text-[#5e7088]">
        <span className="font-medium text-[#9baabf]">You</span>
        <span>&middot;</span>
        <span>{isOptimistic ? "Sending..." : formatDateTime(message.createdAt)}</span>
        <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/10 bg-[#111b2d] text-[8px] font-bold text-[#9baabf]">
          {userInitial}
        </div>
      </div>
      <div
        className={`max-w-[520px] rounded-[20px] rounded-br-[4px] border border-white/7 bg-[#162034] px-4 py-3 text-[14px] leading-7 text-[#eae5dc] ${
          isOptimistic ? "opacity-80" : ""
        }`}
      >
        <p className="whitespace-pre-wrap">{message.contentText}</p>
      </div>
    </article>
  );
}

function AssistantTurn({
  message,
  isLatest,
  workspaceId,
  sessionId,
  latestUserMessage,
  canGeneratePlan,
  canPrepareApprovals,
  canExecuteApprovedPlan,
  hasApprovalRequest,
  hasPendingApproval,
  latestApprovalId,
  inlineBriefCard,
}: {
  message: AgentMessageSummary;
  isLatest: boolean;
  workspaceId: string;
  sessionId: string | null;
  latestUserMessage: string | null;
  canGeneratePlan: boolean;
  canPrepareApprovals: boolean;
  canExecuteApprovedPlan: boolean;
  hasApprovalRequest: boolean;
  hasPendingApproval: boolean;
  latestApprovalId: string | null;
  inlineBriefCard?: {
    openQuestionCount: number;
    programType: string | null;
    format: string | null;
    regions: string | null;
    teamPolicy: string | null;
  } | null;
}) {
  const isWarning =
    (message.contentText ?? "").includes("could not") ||
    (message.contentText ?? "").includes("retry");
  const revealText = useProgressiveRevealText(message.contentText ?? "", isLatest && !isWarning);

  return (
    <article className="flex flex-col items-start">
      <div className="mb-2 flex items-center gap-2 text-[11px] text-[#5e7088]">
        <div className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-[#b08a2838] bg-[#b08a2810] text-[8px] font-bold tracking-[-0.03em] text-[#ccaa4a]">
          IN
        </div>
        <span className="font-medium text-[#9baabf]">Innova</span>
        <span>{formatDateTime(message.createdAt)}</span>
      </div>
      <div className="pl-[26px]">
        {isWarning ? (
          <div className="max-w-[500px] rounded-2xl border border-[#c9973a40] bg-[#c9973a12] px-4 py-3 text-[13px] leading-6 text-[#d9e0e7]">
            {message.contentText}
          </div>
        ) : (
          <>
            <div className="max-w-[560px] text-[14px] leading-8 text-[#c8d3de]">
              {formatAssistantParagraphs(revealText)}
            </div>
            {inlineBriefCard && inlineBriefCard.openQuestionCount > 0 ? (
              <InlineBriefCard brief={inlineBriefCard} />
            ) : null}
            {isLatest && sessionId ? (
              <InlineActionStrip
                workspaceId={workspaceId}
                sessionId={sessionId}
                latestUserMessage={latestUserMessage}
                canGeneratePlan={canGeneratePlan}
                canPrepareApprovals={canPrepareApprovals}
                canExecuteApprovedPlan={canExecuteApprovedPlan}
                hasApprovalRequest={hasApprovalRequest}
                hasPendingApproval={hasPendingApproval}
                latestApprovalId={latestApprovalId}
                message={message}
              />
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

function WorkingTurn({ state }: { state: RuntimeWorkingState }) {
  return (
    <article className="flex flex-col items-start">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] text-[#5e7088]">
        <div className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-[#b08a2838] bg-[#b08a2810] text-[8px] font-bold tracking-[-0.03em] text-[#ccaa4a]">
          IN
        </div>
      </div>
      <div className="pl-[26px]">
        <div className="flex max-w-[500px] items-start gap-3 rounded-2xl border border-white/7 bg-[#0f1a2d] px-4 py-3">
          <ThinkingDots />
          <div>
            <div className="text-[12px] font-medium text-[#eae5dc]">{state.title}</div>
            <div className="mt-1 text-[11px] leading-5 text-[#8ea0b7]">{state.body}</div>
            {state.recentEvents.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {state.recentEvents.map((event) => (
                  <span
                    key={event.id}
                    className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[10px] text-[#9baabf]"
                  >
                    {event.title}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function AssistantStreamingTurn({ text }: { text: string }) {
  return (
    <article className="flex flex-col items-start">
      <div className="mb-2 flex items-center gap-2 text-[11px] text-[#5e7088]">
        <div className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-[#b08a2838] bg-[#b08a2810] text-[8px] font-bold tracking-[-0.03em] text-[#ccaa4a]">
          IN
        </div>
        <span className="font-medium text-[#9baabf]">Innova</span>
        <span>Streaming live</span>
      </div>
      <div className="pl-[26px]">
        <div className="max-w-[560px] text-[14px] leading-8 text-[#c8d3de]">
          {formatAssistantParagraphs(text)}
          <span className="ml-1 inline-block h-5 w-[2px] animate-pulse bg-[#6f8097] align-middle" />
        </div>
      </div>
    </article>
  );
}

function InlineActionStrip({
  workspaceId,
  sessionId,
  latestUserMessage,
  canGeneratePlan,
  canPrepareApprovals,
  canExecuteApprovedPlan,
  hasApprovalRequest,
  hasPendingApproval,
  latestApprovalId,
  message,
}: {
  workspaceId: string;
  sessionId: string;
  latestUserMessage: string | null;
  canGeneratePlan: boolean;
  canPrepareApprovals: boolean;
  canExecuteApprovedPlan: boolean;
  hasApprovalRequest: boolean;
  hasPendingApproval: boolean;
  latestApprovalId: string | null;
  message: AgentMessageSummary;
}) {
  const payload =
    message.contentPayload && typeof message.contentPayload === "object"
      ? (message.contentPayload as Record<string, unknown>)
      : null;
  const stage =
    typeof payload?.workspaceStage === "string"
      ? payload.workspaceStage
      : null;
  const hasGeneratedAssets =
    Array.isArray(payload?.generatedAssets) && payload.generatedAssets.length > 0;
  const isError =
    (message.contentText ?? "").includes("could not") ||
    (message.contentText ?? "").includes("retry");

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {isError && latestUserMessage ? (
        <form action={sendCreateAgentMessageAction}>
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="message" value={latestUserMessage} />
          <button type="submit" className={primaryActionClassName}>
            Retry last request
          </button>
        </form>
      ) : null}

      {stage === "brief_clarification" ? (
        <form action={sendCreateAgentMessageAction}>
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="sessionId" value={sessionId} />
          <input
            type="hidden"
            name="message"
            value="What inputs are still missing before the brief is ready for planning?"
          />
          <button type="submit" className={secondaryActionClassName}>
            What is still missing?
          </button>
        </form>
      ) : null}

      {canGeneratePlan ? (
        <form action={generateProgramPlanAction}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <button type="submit" className={primaryActionClassName}>
            Generate execution plan
          </button>
        </form>
      ) : null}

      {hasGeneratedAssets ? (
        <Link
          href={`/app/create/${sessionId}/assets`}
          className={secondaryActionClassName}
        >
          Review asset drafts
        </Link>
      ) : null}

      {canPrepareApprovals ? (
        <form action={prepareApprovalRequestAction}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <button type="submit" className={primaryActionClassName}>
            Prepare approval packet
          </button>
        </form>
      ) : null}

      {hasPendingApproval ? (
        <Link href={`/app/create/${sessionId}/approvals`} className={primaryActionClassName}>
          Review approvals
        </Link>
      ) : null}

      {canExecuteApprovedPlan && latestApprovalId ? (
        <form action={executeApprovedPlanAction}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="approvalRequestId" value={latestApprovalId} />
          <button type="submit" className={primaryActionClassName}>
            Execute approved foundation
          </button>
        </form>
      ) : null}

      {!hasPendingApproval ? (
        <Link
          href={`/app/create/${sessionId}/${getInlineDeepLinkTarget({
            canGeneratePlan,
            canPrepareApprovals,
            canExecuteApprovedPlan,
            hasApprovalRequest,
            hasPendingApproval,
          })}`}
          className={secondaryActionClassName}
        >
          {getInlineDeepLinkLabel({
            canGeneratePlan,
            canPrepareApprovals,
            canExecuteApprovedPlan,
            hasApprovalRequest,
            hasPendingApproval,
          })}
        </Link>
      ) : null}
    </div>
  );
}

function InlineBriefCard({
  brief,
}: {
  brief: {
    openQuestionCount: number;
    programType: string | null;
    format: string | null;
    regions: string | null;
    teamPolicy: string | null;
  };
}) {
  return (
    <div className="mt-3 max-w-[500px] rounded-2xl border border-white/7 border-l-2 border-l-[#b08a28] bg-[#162034] px-4 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[11.5px] font-semibold text-[#eae5dc]">
          Brief updated - {brief.openQuestionCount} inputs needed
        </div>
        <div className="rounded-md border border-[#c9973a40] bg-[#c9973a12] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#e8c26d]">
          Draft
        </div>
      </div>
      <InlineBriefRow label="Type" value={brief.programType ?? "Internal Hackathon"} />
      <InlineBriefRow label="Format" value={brief.format ?? "Not yet defined"} />
      <InlineBriefRow
        label="Regions"
        value={brief.regions ?? "Unspecified"}
        needsInput={!brief.regions}
      />
      <InlineBriefRow
        label="Team size"
        value={brief.teamPolicy ?? "Not yet defined"}
        needsInput={!brief.teamPolicy}
      />
    </div>
  );
}

function InlineBriefRow({
  label,
  value,
  needsInput = false,
}: {
  label: string;
  value: string;
  needsInput?: boolean;
}) {
  return (
    <div className="mb-2 grid grid-cols-[68px_1fr] gap-x-3 last:mb-0">
      <div className="pt-0.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#7f90a6]">
        {label}
      </div>
      <div className={`text-[12px] leading-5 ${needsInput ? "text-[#9baabf]" : "text-[#d9e0e7]"}`}>
        {value}
        {needsInput ? (
          <span className="ml-2 inline-flex items-center gap-1 rounded-md border border-[#c9973a40] bg-[#c9973a12] px-1.5 py-0.5 text-[9px] font-semibold text-[#e8c26d]">
            <WarnTriangleIcon />
            needs input
          </span>
        ) : null}
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
    <article className="flex flex-col items-start">
      <div className="mb-2 flex items-center gap-2 text-[11px] text-[#5e7088]">
        <div className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-[#b08a2838] bg-[#b08a2810] text-[8px] font-bold tracking-[-0.03em] text-[#ccaa4a]">
          IN
        </div>
        <span className="font-medium text-[#9baabf]">Innova</span>
      </div>
      <div className="pl-[26px]">
        <div className="max-w-[560px] text-[14px] leading-8 text-[#c8d3de]">
          State the program outcome you want to achieve, the audience, the timeline, and any governance constraints. Innova will structure the brief, surface missing inputs, and move the workspace toward plan and approvals.
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {templates.map((template) => (
            <Link
              key={template.name}
              href={buildPromptHref(pathname, workspaceId, template.prompt)}
              className="rounded-md border border-white/10 bg-[#101a2c] px-3 py-2 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-[#162034] hover:text-[#eae5dc]"
            >
              {template.name}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

function ThreadNotice({
  tone,
  title,
  body,
}: {
  tone: "info" | "amber" | "error";
  title: string;
  body: string;
}) {
  const toneClass =
    tone === "error"
      ? "border-[#9b3a3a66] bg-[#9b3a3a14] text-[#f1bcbc]"
      : tone === "amber"
        ? "border-[#b08a2838] bg-[#b08a2810] text-[#eadcb6]"
        : "border-[#3a6e9e40] bg-[#3a6e9e14] text-[#d7e5f2]";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em]">{title}</div>
      <div className="mt-1 text-[12px] leading-6">{body}</div>
    </div>
  );
}

function DrawerShell({
  kicker,
  title,
  onClose,
  children,
}: {
  kicker: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-30 flex justify-end">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-[#01040a]/70"
      />
      <aside className="relative z-10 flex h-full w-[380px] flex-col border-l border-white/7 bg-[#0c1525] shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
        <div className="flex items-center gap-3 border-b border-white/7 px-4 py-3">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#ccaa4a]">
              {kicker}
            </div>
            <div className="mt-1 text-[14px] font-semibold text-[#eae5dc]">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-[#5e7088] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </aside>
    </div>
  );
}

function DrawerSectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-2 mt-4 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#5e7088] first:mt-0">
      {label}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="h-1 w-1 animate-pulse rounded-full bg-[#6f8097]" />
      <span className="h-1 w-1 animate-pulse rounded-full bg-[#6f8097] [animation-delay:0.15s]" />
      <span className="h-1 w-1 animate-pulse rounded-full bg-[#6f8097] [animation-delay:0.3s]" />
    </div>
  );
}

function formatAssistantParagraphs(text: string) {
  return text.split(/\n{2,}/).map((paragraph, index) => (
    <p key={`${paragraph.slice(0, 20)}-${index}`} className={index === 0 ? "" : "mt-3"}>
      {paragraph}
    </p>
  ));
}

function useProgressiveRevealText(text: string, enabled: boolean) {
  const [visibleLength, setVisibleLength] = useState(enabled ? 0 : text.length);

  useEffect(() => {
    if (!enabled || text.length === 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setVisibleLength(0);
    });

    const interval = setInterval(() => {
      setVisibleLength((current) => {
        const next = current + Math.max(6, Math.ceil(text.length / 40));
        if (next >= text.length) {
          clearInterval(interval);
          return text.length;
        }
        return next;
      });
    }, 24);

    return () => {
      cancelAnimationFrame(frame);
      clearInterval(interval);
    };
  }, [enabled, text]);

  return enabled ? text.slice(0, visibleLength) : text;
}

function buildPromptHref(pathname: string, workspaceId: string, prompt: string) {
  return `${pathname}?workspace=${workspaceId}&prompt=${encodeURIComponent(prompt)}`;
}

function getInlineDeepLinkTarget({
  canGeneratePlan,
  canPrepareApprovals,
  canExecuteApprovedPlan,
  hasApprovalRequest,
  hasPendingApproval,
}: {
  canGeneratePlan: boolean;
  canPrepareApprovals: boolean;
  canExecuteApprovedPlan: boolean;
  hasApprovalRequest: boolean;
  hasPendingApproval: boolean;
}) {
  if (canExecuteApprovedPlan) {
    return "execution";
  }

  if (hasPendingApproval || hasApprovalRequest || canPrepareApprovals) {
    return "approvals";
  }

  if (canGeneratePlan) {
    return "brief";
  }

  return "plan";
}

function getInlineDeepLinkLabel({
  canGeneratePlan,
  canPrepareApprovals,
  canExecuteApprovedPlan,
  hasApprovalRequest,
  hasPendingApproval,
}: {
  canGeneratePlan: boolean;
  canPrepareApprovals: boolean;
  canExecuteApprovedPlan: boolean;
  hasApprovalRequest: boolean;
  hasPendingApproval: boolean;
}) {
  if (canExecuteApprovedPlan) {
    return "Open execution";
  }

  if (hasPendingApproval || hasApprovalRequest || canPrepareApprovals) {
    return "Review approvals";
  }

  if (canGeneratePlan) {
    return "Open full brief";
  }

  return "Open plan workspace";
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
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) {
    return "Now";
  }

  return new Intl.DateTimeFormat("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
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

function BackIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 3 5 8l5 5" />
    </svg>
  );
}

function TraceIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3.5l2 1.5" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1.5 8A6.5 6.5 0 1014.5 8c0-1.7-.65-3.24-1.71-4.4" />
      <path d="M1.5 3.5V8h4.5" />
    </svg>
  );
}

function WarnTriangleIcon() {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 1 1 14h14L8 1z" />
      <path d="M8 7v3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 4 12 12" />
      <path d="m12 4-8 8" />
    </svg>
  );
}
