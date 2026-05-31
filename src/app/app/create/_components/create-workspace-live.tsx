"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  applyLiveOpsChangeAction,
  createNewProgramWorkspaceAction,
  executeApprovedPlanAction,
  reviewApprovalRequestAction,
  sendCreateAgentMessageAction,
} from "@/app/app/create/actions";
import {
  CreateMessageComposer,
  type StreamEvent,
} from "@/app/app/create/_components/create-message-composer";
import type { WorkspaceStageGuidance } from "@/lib/pm-workspace/stage-guidance";
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
  primaryAction: {
    kind: "generate_plan" | "prepare_approvals" | "review_approvals" | "execute_approved_plan";
    label: string;
    approvalRequestId?: string | null;
  } | null;
  secondaryLink: {
    href: string;
    label: string;
  } | null;
  inlineApprovalRequestId?: string | null;
  inlineApprovalRequestedAt?: string | null;
  inlineApprovalItems?: Array<{
    id: string;
    label: string;
    itemType: string;
    status: "ok" | "pending";
  }> | null;
  inlineBriefCard?: {
    openQuestionCount: number;
    programType: string | null;
    objective: string | null;
    format: string | null;
    audience: string | null;
    regions: string | null;
    teamPolicy: string | null;
    timeline: string | null;
    judging: string | null;
    output: string | null;
  } | null;
  initialProgramName?: string | null;
};

type OptimisticMessage = {
  id: string;
  clientMessageId: string;
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

type BuildStep = {
  step: string;
  label: string;
  status: "pending" | "running" | "done";
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
  "inline-flex items-center rounded-full bg-[var(--ws-gold)] px-3 py-2 text-[11px] font-semibold text-[var(--ws-bg-base)] transition hover:bg-[var(--ws-gold-bright)]";

const secondaryActionClassName =
  "inline-flex items-center rounded-full border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-input)] px-3 py-2 text-[11px] font-medium text-[var(--ws-t-secondary)] transition hover:bg-[var(--ws-bg-card)] hover:text-[var(--ws-t-primary)]";

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
  primaryAction,
  secondaryLink,
  inlineApprovalRequestId,
  inlineApprovalRequestedAt,
  inlineApprovalItems,
  inlineBriefCard,
  initialProgramName,
}: CreateWorkspaceLiveProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const promptLoaded = searchParams.get("prompt") ?? initialPrompt;
  const error = searchParams.get("error") ?? initialError;
  const status = searchParams.get("status") ?? initialStatus;
  const [messages, setMessages] = useState(initialMessages);
  const [runs, setRuns] = useState(initialRuns);
  const [events, setEvents] = useState(initialEvents);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const pendingClientMessageIdRef = useRef<string | null>(null);
  const confirmRequestCounterRef = useRef(0);
  const [streamingAssistant, setStreamingAssistant] =
    useState<StreamingAssistantState | null>(null);
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([]);
  const [showRuntimeDetails, setShowRuntimeDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // When router.refresh() brings new server data, merge any messages/runs/events
  // that the realtime subscription may have missed into local state.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMessages((current) => {
        const currentIds = new Set(current.map((m) => m.id));
        const fresh = initialMessages.filter((m) => !currentIds.has(m.id));
        if (fresh.length === 0) return current;
        if (fresh.some((message) => message.role === "assistant")) {
          setStreamingAssistant(null);
        }
        return [...current, ...fresh].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialMessages]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRuns((current) => {
        const currentIds = new Set(current.map((r) => r.id));
        const fresh = initialRuns.filter((r) => !currentIds.has(r.id));
        if (fresh.length === 0) return current;
        return [...current, ...fresh].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialRuns]);
  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNowMs(Date.now()), 0);
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

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

          if (record.role === "user") {
            const payloadRecord =
              record.content_payload &&
              typeof record.content_payload === "object" &&
              !Array.isArray(record.content_payload)
                ? (record.content_payload as Record<string, unknown>)
                : {};
            const clientMessageId =
              typeof payloadRecord.clientMessageId === "string"
                ? payloadRecord.clientMessageId
                : null;

            setOptimisticMessages((current) =>
              current.filter((message) =>
                clientMessageId
                  ? message.clientMessageId !== clientMessageId
                  : normalizeMessageText(message.contentText) !==
                    normalizeMessageText(record.content_text ?? ""),
              ),
            );
          }

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
    const confirmedClientMessageIds = new Set(
      messages
        .filter((message) => message.role === "user")
        .map((message) => {
          const payload =
            message.contentPayload &&
            typeof message.contentPayload === "object" &&
            !Array.isArray(message.contentPayload)
              ? (message.contentPayload as Record<string, unknown>)
              : {};
          return typeof payload.clientMessageId === "string"
            ? payload.clientMessageId
            : null;
        })
        .filter((id): id is string => Boolean(id)),
    );
    const confirmedUserTexts = new Set(
      messages
        .filter((message) => message.role === "user")
        .map((message) => normalizeMessageText(message.contentText)),
    );
    const pendingMessages = optimisticMessages.filter(
      (message) =>
        !confirmedClientMessageIds.has(message.clientMessageId) &&
        !confirmedUserTexts.has(normalizeMessageText(message.contentText)),
    );

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

    const activeRunTimestamp = new Date(
      activeRun.startedAt ?? activeRun.createdAt,
    ).getTime();
    // Avoid showing stale runs that were left running by a previous failed or
    // interrupted request. Fresh optimistic/streaming state covers live sends.
    if (!nowMs || nowMs - activeRunTimestamp > 2 * 60 * 1000) {
      return false;
    }

    const latestAssistantTimestamp = latestAssistantMessage
      ? new Date(latestAssistantMessage.createdAt).getTime()
      : 0;
    if (latestAssistantTimestamp >= activeRunTimestamp) {
      return false;
    }

    const latestUserTimestamp = [...mergedMessages]
      .reverse()
      .find((message) => message.role === "user")
      ?.createdAt;
    if (!latestUserTimestamp) {
      return true;
    }

    const latestUserTime = new Date(latestUserTimestamp).getTime();

    return activeRunTimestamp >= latestUserTime - 5000;
  }, [activeRun, latestAssistantMessage, mergedMessages, nowMs]);
  const runtimeWorkingState: RuntimeWorkingState | null =
    shouldShowActiveRun || optimisticMessages.length > 0 || streamingAssistant
      ? {
          title:
            streamingAssistant?.statusTitle ??
            "Preparing workspace update",
          body:
            streamingAssistant?.statusBody ??
            latestActiveRunEvent?.body ??
            activeRun?.summary ??
            "Processing the latest request.",
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
  const hasStreamingAssistant = Boolean(streamingAssistant);
  const hasRuntimeWorkingState = Boolean(runtimeWorkingState);

  // On first render: jump instantly to the bottom so the conversation
  // starts at the latest message, exactly like ChatGPT / Claude.
  const initialScrollDone = useRef(false);
  useEffect(() => {
    if (initialScrollDone.current) return;
    const container = threadRef.current;
    if (container && mergedMessages.length > 0) {
      const raf = requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
        initialScrollDone.current = true;
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [mergedMessages.length]);

  // Scroll rules:
  // 1. User just sent a message → always scroll (they want to see the response)
  // 2. Innova is responding → only scroll if already near the bottom
  //    (don't interrupt if the PM scrolled up to re-read earlier context)
  useEffect(() => {
    const container = threadRef.current;
    if (!container) return;

    if (optimisticMessages.length > 0 || error) {
      // User just submitted — always bring them to the bottom
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < 120) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [
    mergedMessages.length,
    optimisticMessages.length,
    hasStreamingAssistant,
    hasRuntimeWorkingState,
    error,
    status,
    promptLoaded,
  ]);

  // True while the build sequence is running — used to disable Accept button.
  const isBuildActive = buildSteps.length > 0 || Boolean(streamingAssistant);

  // Triggered when PM clicks Accept on the build proposal card.
  const onAcceptBuild = async () => {
    if (isBuildActive) return;
    const sessionIdToUse = sessionId ?? streamingAssistant?.sessionId ?? null;
    if (!sessionIdToUse) {
      onStreamEvent({
        type: "error",
        message: "The workspace is still initializing. Please try again in a moment.",
      });
      return;
    }
    confirmRequestCounterRef.current += 1;
    const clientMessageId =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `accept-${confirmRequestCounterRef.current}`;
    const message = "Generate the execution plan for this program.";
    onOptimisticSubmit(message, clientMessageId);
    try {
      const response = await fetch("/api/pm-workspace/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          sessionId: sessionIdToUse,
          message,
          clientMessageId,
        }),
      });
      if (!response.ok || !response.body) {
        setBuildSteps([]);
        throw new Error("The execution plan could not be generated. Please try again.");
      }
      setBuildSteps([]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          onStreamEvent(JSON.parse(line) as StreamEvent);
        }
      }
    } catch (error) {
      setBuildSteps([]);
      onStreamEvent({
        type: "error",
        message: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
    }
  };

  const onOptimisticSubmit = (message: string, clientMessageId: string) => {
    // Clear any stale error from the URL so the banner doesn't persist
    const currentParams = new URLSearchParams(searchParams.toString());
    if (currentParams.has("error")) {
      currentParams.delete("error");
    }
    currentParams.delete("prompt");
    router.replace(`${pathname}?${currentParams.toString()}`, { scroll: false });

    const now = new Date().toISOString();
    setOptimisticMessages([
      {
        id: `optimistic-${clientMessageId}`,
        clientMessageId,
        role: "user",
        kind: "chat",
        contentText: message,
        createdAt: now,
        optimistic: true,
      },
    ]);
    setStreamingAssistant({
      text: "",
      statusTitle: "Preparing workspace update",
      statusBody: "Processing the latest request.",
      sessionId,
    });
  };

  const onConfirmBriefUpdates = async () => {
    if (isBuildActive) return;

    const sessionIdToUse = sessionId ?? streamingAssistant?.sessionId ?? null;
    if (!sessionIdToUse) {
      onStreamEvent({
        type: "error",
        message: "The workspace is still initializing. Please try again in a moment.",
      });
      return;
    }

    confirmRequestCounterRef.current += 1;
    const clientMessageId =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `confirm-${confirmRequestCounterRef.current}`;
    const message = "Confirm & Apply";
    onOptimisticSubmit(message, clientMessageId);

    try {
      const response = await fetch("/api/pm-workspace/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          sessionId: sessionIdToUse,
          message,
          clientMessageId,
          confirmBriefUpdates: true,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("The brief confirmation could not be recorded. Please try again.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          onStreamEvent(JSON.parse(line) as StreamEvent);
        }
      }
    } catch (error) {
      onStreamEvent({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "The brief confirmation could not be recorded. Please try again.",
      });
    }
  };

  const onStreamEvent = (event: StreamEvent) => {
    if (event.type === "session") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("session", event.sessionId);
      params.set("workspace", event.workspaceId);
      params.delete("prompt");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      setStreamingAssistant((current) => ({
        text: current?.text ?? "",
        statusTitle: current?.statusTitle ?? "Preparing workspace update",
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

    if (event.type === "build_step") {
      setBuildSteps((current) => {
        const existing = current.find((s) => s.step === event.step);
        if (existing) {
          return current.map((s) =>
            s.step === event.step ? { ...s, status: event.status, label: event.label } : s,
          );
        }
        return [...current, { step: event.step, label: event.label, status: event.status }];
      });
      return;
    }

    if (event.type === "done") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("session", event.sessionId);
      params.set("workspace", event.workspaceId);
      params.set("status", event.status);
      params.delete("error"); // clear any stale error from a previous failed message
      params.delete("prompt");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      setOptimisticMessages([]);
      setStreamingAssistant((current) =>
        current?.text.trim() ? current : null,
      );
      if (event.status === "program-built") {
        // Keep buildSteps visible until page refreshes so PM sees completion
        setTimeout(() => setBuildSteps([]), 1500);
      } else {
        setBuildSteps([]);
      }
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
      params.delete("prompt");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      setStreamingAssistant(null);
      setOptimisticMessages([]);
      router.refresh();
    }
  };

  const currentSessionTitle =
    initialSessions.find((session) => session.id === sessionId)?.title ??
    initialSessions[0]?.title ??
    "New Program";
  const historySessions = initialSessions.slice(0, 8);

  // Adaptive placeholder — guides the PM with the right input for each stage
  const composerPlaceholder = (() => {
    if (mergedMessages.length === 0) return "Describe the program you want to build…";
    if (buildSteps.length > 0) return "Building your program…";
    if (stageTone === "gold" && stageLabel.includes("Drafting")) return "Tell Innova about your program…";
    if (stageTone === "amber") return "Answer Innova's question, or ask to change anything…";
    if (stageLabel === "Brief ready") return "Say 'looks good' to build, or ask to change something…";
    if (stageLabel.includes("review") || stageLabel.includes("Review")) return "Ask about the review items, or make changes…";
    if (stageLabel === "Ready to execute" || stageLabel.includes("execute")) return "Click Confirm & Apply above, or ask Innova anything…";
    if (stageLabel === "Live" || stageLabel.includes("live-ops")) return "Ask Innova to adjust your live program…";
    return "Ask Innova anything about your program…";
  })();

  const [showProgramSwitcher, setShowProgramSwitcher] = useState(false);

  // Close program switcher when clicking outside
  useEffect(() => {
    if (!showProgramSwitcher) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-program-switcher]")) {
        setShowProgramSwitcher(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showProgramSwitcher]);

  return (
    <div className="pm-workspace-theme relative flex h-full flex-col overflow-hidden bg-[var(--ws-bg-base)]">
      <header className="flex h-11 shrink-0 items-center gap-1.5 border-b border-b-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-surface)] px-3.5">
        <div className="flex w-full items-center gap-1.5">
          <Link
            href="/app/dashboard"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--ws-r-md)] text-[var(--ws-t-tertiary)] transition hover:bg-[var(--ws-b-faint)] hover:text-[var(--ws-t-secondary)]"
            title="Back to dashboard"
          >
            <BackIcon />
          </Link>
          {/* Program switcher */}
          <div className="relative" data-program-switcher>
            <button
              type="button"
              onClick={() => setShowProgramSwitcher((v) => !v)}
              className="flex shrink-0 items-center gap-1.5 rounded-[var(--ws-r-md)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-card)] px-2.5 py-1 text-xs font-medium text-[var(--ws-t-secondary)] transition hover:border-[color:var(--ws-b-strong)] hover:bg-[var(--ws-bg-elevated)] hover:text-[var(--ws-t-primary)]"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ws-green-bright)] shadow-[0_0_5px_var(--ws-green)]" />
              <span className="max-w-[200px] truncate">{currentSessionTitle}</span>
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
                className={`shrink-0 transition-transform ${showProgramSwitcher ? "rotate-180" : ""}`}
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>

            {showProgramSwitcher ? (
              <div className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[260px] overflow-hidden rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-surface)] shadow-[var(--ws-shadow-xl)]">
                {/* New program — inline name entry */}
                <NewProgramEntry
                  workspaceId={workspaceId}
                  onClose={() => setShowProgramSwitcher(false)}
                />

                {/* Session list */}
                {historySessions.length > 0 ? (
                  <div className="py-1">
                    <div className="px-3.5 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[.1em] text-[var(--ws-t-muted)]">
                      Recent programs
                    </div>
                    {historySessions.map((session) => (
                      <Link
                        key={session.id}
                        href={`/app/create?session=${session.id}&workspace=${session.workspaceId}`}
                        onClick={() => setShowProgramSwitcher(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 text-[11.5px] transition hover:bg-[var(--ws-b-faint)] ${
                          session.id === sessionId
                            ? "bg-[var(--ws-b-faint)] text-[var(--ws-t-primary)]"
                            : "text-[var(--ws-t-secondary)]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            session.id === sessionId
                              ? "bg-[var(--ws-green-bright)] shadow-[0_0_5px_var(--ws-green)]"
                              : "bg-[var(--ws-t-muted)]"
                          }`}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {session.title ?? "Untitled program"}
                        </span>
                        {session.id === sessionId ? (
                          <span className="shrink-0 rounded-[var(--ws-r-xs)] bg-[var(--ws-b-subtle)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[.06em] text-[var(--ws-t-muted)]">
                            Active
                          </span>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <StagePill tone={stageTone} label={stageLabel} />
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowRuntimeDetails(true)}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--ws-r-md)] text-[var(--ws-t-tertiary)] transition hover:bg-[var(--ws-b-faint)] hover:text-[var(--ws-t-secondary)]"
              title="Show trace"
            >
              <TraceIcon />
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              disabled={historySessions.length === 0}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--ws-r-md)] text-[var(--ws-t-tertiary)] transition hover:bg-[var(--ws-b-faint)] hover:text-[var(--ws-t-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
              title="Session history"
            >
              <HistoryIcon />
            </button>
            <div className="mx-1 h-4 w-px bg-[var(--ws-b-subtle)]" />
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-elevated)] text-[9px] font-semibold text-[var(--ws-t-secondary)]">
              {userInitial}
            </div>
          </div>
        </div>
      </header>

      {mergedMessages.length === 0 && !error && !status && !promptLoaded ? (
        /* Empty / onboarding state — vertically centred */
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10">
          <div className="w-full max-w-[560px]">
            <EmptyAssistantState
              workspaceId={workspaceId}
              sessionId={sessionId}
              pathname={pathname}
              templates={templates.slice(0, 3)}
              programName={initialProgramName ?? null}
            />
          </div>
        </div>
      ) : (
        /* Conversation thread — scrollable */
        <div ref={threadRef} className="flex-1 overflow-y-auto px-6 py-7">
          <div className="mx-auto max-w-[660px] space-y-5">
            <div className="space-y-7">
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
                    primaryAction={primaryAction}
                    secondaryLink={secondaryLink}
                    inlineApprovalRequestId={inlineApprovalRequestId}
                    inlineApprovalRequestedAt={inlineApprovalRequestedAt}
                    inlineApprovalItems={inlineApprovalItems}
                    programTitle={currentSessionTitle}
                    inlineBriefCard={
                      message.id === latestAssistantMessage?.id &&
                      isBriefRelatedMessage(message)
                        ? inlineBriefCard
                        : null
                    }
                    onAcceptBuild={onAcceptBuild}
                    onConfirmBriefUpdates={onConfirmBriefUpdates}
                    isBuildActive={isBuildActive}
                  />
                ),
              )}
              {streamingAssistant?.text ? (
                <AssistantStreamingTurn text={streamingAssistant.text} />
              ) : null}
              {runtimeWorkingState && !streamingAssistant?.text ? (
                <WorkingTurn state={runtimeWorkingState} />
              ) : null}
              {/* Live build progress — shown while sequential build is executing */}
              {buildSteps.length > 0 ? (
                <BuildProgressCard steps={buildSteps} />
              ) : null}
              {/* Scroll anchor — auto-scroll targets this on every new message */}
              {error ? (
                <ThreadNotice
                  tone="error"
                  title="Message did not process"
                  body={
                    error.includes("Edge Function") ||
                    error.includes("non-2xx") ||
                    error.includes("agent run") ||
                    error.includes("workspace could not") ||
                    error.includes("PM workspace")
                      ? "Innova couldn't process the last message. Please try again."
                      : error
                  }
                />
              ) : null}
              {status &&
              statusCopy[status] &&
              !["brief-updated", "brief-ready", "workspace-guidance"].includes(status) ? (
                <ThreadNotice tone="info" title="Workspace updated" body={statusCopy[status]} />
              ) : null}
              {promptLoaded ? (
                <ThreadNotice
                  tone="amber"
                  title="Prompt loaded"
                  body="Innova loaded a follow-up prompt from a review surface. Refine it here before sending."
                />
              ) : null}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-t-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-surface)] px-6 py-3">
        <div className="mx-auto max-w-[660px]">
          <CreateMessageComposer
            key={`composer-${sessionId ?? "new"}-${promptLoaded}`}
            workspaceId={workspaceId}
            sessionId={sessionId}
            defaultMessage={promptLoaded}
            placeholder={composerPlaceholder}
            showHelperText={mergedMessages.length === 0}
            onOptimisticSubmit={onOptimisticSubmit}
            onStreamEvent={onStreamEvent}
            clientMessageIdRef={pendingClientMessageIdRef}
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
                className={`flex items-center justify-between rounded-[var(--ws-r-lg)] border px-3 py-3 text-[12px] transition ${
                  session.id === sessionId
                    ? "border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[var(--ws-t-primary)]"
                    : "border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] text-[var(--ws-t-secondary)] hover:bg-[var(--ws-bg-elevated)] hover:text-[var(--ws-t-primary)]"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{session.title ?? "Untitled session"}</div>
                  <div className="mt-1 text-[10.5px] text-[var(--ws-t-muted)]">
                    {session.id === sessionId ? "Current session" : "Open session"}
                  </div>
                </div>
                <span className="ml-3 shrink-0 text-[10px] uppercase tracking-[0.08em] text-[var(--ws-t-muted)]">
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
                  <div key={run.id} className="rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold text-[var(--ws-t-primary)]">
                        {humanizeRunType(run.runType)}
                      </div>
                      <span
                        className={`rounded-[var(--ws-r-xs)] border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] ${
                          run.status === "completed"
                            ? "border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] text-[var(--ws-green-bright)]"
                            : "border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[var(--ws-gold-bright)]"
                        }`}
                      >
                        {run.status}
                      </span>
                    </div>
                    {run.summary ? (
                      <p className="mt-2 text-[11px] leading-5 text-[var(--ws-t-secondary)]">{run.summary}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <DrawerSectionLabel label="Events" />
          <div className="space-y-2">
            {events.slice(0, 8).map((event) => (
              <div key={event.id} className="rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3 py-3">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 text-[10px] text-[var(--ws-t-muted)]">
                    {formatTime(event.createdAt)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11.5px] text-[var(--ws-t-primary)]">{event.title}</div>
                    {event.body ? (
                      <div className="mt-1 text-[11px] leading-5 text-[var(--ws-t-secondary)]">{event.body}</div>
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
      ? "border-[color:var(--ws-amber-bdr)] bg-[var(--ws-amber-sub)] text-[var(--ws-amber-bright)]"
      : tone === "green"
        ? "border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] text-[var(--ws-green-bright)]"
        : "border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[var(--ws-gold-bright)]";

  // Dot pulses for active/in-progress tones, static for completed (green)
  const dotClass = tone === "green" ? "h-1 w-1 rounded-full bg-current" : "h-1 w-1 rounded-full bg-current animate-pulse";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-[var(--ws-r-xs)] border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[.06em] whitespace-nowrap ${toneClass}`}
    >
      <span className={dotClass} />
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
      <div className="mb-1.5 flex items-center gap-1 text-[11px] text-[var(--ws-t-muted)]">
        <span>You</span>
        <span className="text-[var(--ws-b-subtle)]">&middot;</span>
        <span>{isOptimistic ? "Sending..." : formatDateTime(message.createdAt)}</span>
        <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-elevated)] text-[8px] font-bold text-[var(--ws-t-secondary)]">
          {userInitial}
        </div>
      </div>
      <div
        className={`max-w-[500px] rounded-[12px_12px_4px_12px] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3.5 py-2.5 text-[14px] leading-relaxed text-[var(--ws-t-primary)] ${
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
  primaryAction,
  secondaryLink,
  inlineApprovalRequestId,
  inlineApprovalRequestedAt,
  inlineApprovalItems,
  programTitle,
  inlineBriefCard,
  onAcceptBuild,
  onConfirmBriefUpdates,
  isBuildActive,
}: {
  message: AgentMessageSummary;
  isLatest: boolean;
  workspaceId: string;
  sessionId: string | null;
  latestUserMessage: string | null;
  primaryAction: CreateWorkspaceLiveProps["primaryAction"];
  secondaryLink: CreateWorkspaceLiveProps["secondaryLink"];
  inlineApprovalRequestId?: string | null;
  inlineApprovalRequestedAt?: string | null;
  inlineApprovalItems?: CreateWorkspaceLiveProps["inlineApprovalItems"];
  programTitle: string;
  inlineBriefCard?: {
    openQuestionCount: number;
    programType: string | null;
    objective: string | null;
    format: string | null;
    audience: string | null;
    regions: string | null;
    teamPolicy: string | null;
    timeline: string | null;
    judging: string | null;
    output: string | null;
  } | null;
  onAcceptBuild?: () => void;
  onConfirmBriefUpdates?: () => void;
  isBuildActive?: boolean;
}) {
  const isWarning =
    (message.contentText ?? "").includes("could not") ||
    (message.contentText ?? "").includes("retry");
  const revealText = useProgressiveRevealText(message.contentText ?? "", isLatest && !isWarning);

  return (
    <article className="flex flex-col items-start">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-[var(--ws-t-muted)]">
        <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[8px] font-black tracking-[-0.03em] text-[var(--ws-gold-bright)]">
          IN
        </div>
        <span className="font-semibold text-[var(--ws-t-secondary)]">Innova</span>
        <span>{formatDateTime(message.createdAt)}</span>
      </div>
      <div className="pl-[26px]">
        {isWarning ? (
          <div className="max-w-[500px] rounded-[var(--ws-r-xl)] border border-[color:var(--ws-amber-bdr)] bg-[var(--ws-amber-sub)] px-4 py-3 text-[13px] leading-6 text-[var(--ws-t-primary)]">
            {message.contentText}
          </div>
        ) : (
          <>
            <div className="max-w-[560px] text-[14px] leading-[1.68] text-[var(--ws-t-secondary)]">
              {formatAssistantParagraphs(revealText)}
            </div>
            {inlineBriefCard ? (
              <InlineBriefCard brief={inlineBriefCard} />
            ) : null}
            {isLatest && sessionId ? (
            <InlineActionStrip
              workspaceId={workspaceId}
              sessionId={sessionId}
              latestUserMessage={latestUserMessage}
              primaryAction={primaryAction}
              secondaryLink={secondaryLink}
              inlineApprovalRequestId={inlineApprovalRequestId}
              inlineApprovalRequestedAt={inlineApprovalRequestedAt}
              inlineApprovalItems={inlineApprovalItems}
              programTitle={programTitle}
              message={message}
              onAcceptBuild={onAcceptBuild}
              onConfirmBriefUpdates={onConfirmBriefUpdates}
              isBuildActive={isBuildActive}
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
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-[var(--ws-t-muted)]">
        <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[8px] font-black tracking-[-0.03em] text-[var(--ws-gold-bright)]">
          IN
        </div>
        <span className="font-semibold text-[var(--ws-t-secondary)]">Innova</span>
      </div>
      <div className="pl-[26px]">
        <div className="flex items-center gap-3 rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-4 py-3">
          <ThinkingDots />
          <span className="text-[13px] text-[var(--ws-t-secondary)]">{state.title}</span>
        </div>
      </div>
    </article>
  );
}

function AssistantStreamingTurn({ text }: { text: string }) {
  return (
    <article className="flex flex-col items-start">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-[var(--ws-t-muted)]">
        <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[8px] font-black tracking-[-0.03em] text-[var(--ws-gold-bright)]">
          IN
        </div>
        <span className="font-semibold text-[var(--ws-t-secondary)]">Innova</span>
        <span>Streaming live</span>
      </div>
      <div className="pl-[26px]">
        <div className="max-w-[560px] text-[14px] leading-[1.68] text-[var(--ws-t-secondary)]">
          {formatAssistantParagraphs(text)}
          <span className="ml-1 inline-block h-5 w-[2px] animate-pulse bg-[var(--ws-t-tertiary)] align-middle" />
        </div>
      </div>
    </article>
  );
}

function InlineActionStrip({
  workspaceId,
  sessionId,
  latestUserMessage,
  primaryAction,
  secondaryLink,
  inlineApprovalRequestId,
  inlineApprovalRequestedAt,
  inlineApprovalItems,
  programTitle,
  message,
  onAcceptBuild,
  onConfirmBriefUpdates,
  isBuildActive,
}: {
  workspaceId: string;
  sessionId: string;
  latestUserMessage: string | null;
  primaryAction: CreateWorkspaceLiveProps["primaryAction"];
  secondaryLink: CreateWorkspaceLiveProps["secondaryLink"];
  inlineApprovalRequestId?: string | null;
  inlineApprovalRequestedAt?: string | null;
  inlineApprovalItems?: CreateWorkspaceLiveProps["inlineApprovalItems"];
  programTitle: string;
  message: AgentMessageSummary;
  onAcceptBuild?: () => void;
  onConfirmBriefUpdates?: () => void;
  isBuildActive?: boolean;
}) {
  const payload =
    message.contentPayload && typeof message.contentPayload === "object"
      ? (message.contentPayload as Record<string, unknown>)
      : null;
  // Build proposal — shown when Innova has proposed the full build sequence
  const buildProposal =
    payload?.buildProposal &&
    typeof payload.buildProposal === "object" &&
    !Array.isArray(payload.buildProposal) &&
    Array.isArray((payload.buildProposal as Record<string, unknown>).steps)
      ? (payload.buildProposal as { steps: Array<{ key: string; label: string }> })
      : null;
  const briefActionProposal =
    payload?.briefActionProposal &&
    typeof payload.briefActionProposal === "object" &&
    !Array.isArray(payload.briefActionProposal)
      ? (payload.briefActionProposal as {
          kind?: string;
          title?: string;
          body?: string;
          primaryLabel?: string;
          secondaryLabel?: string;
          steps?: Array<{ key: string; label: string }>;
        })
      : null;
  const hasGeneratedAssets =
    Array.isArray(payload?.generatedAssets) && payload.generatedAssets.length > 0;
  const launchKitReady =
    payload?.launchKitReady &&
    typeof payload.launchKitReady === "object" &&
    !Array.isArray(payload.launchKitReady)
      ? (payload.launchKitReady as {
          title?: string;
          body?: string;
          items?: Array<{
            key: string;
            label: string;
            description?: string;
            kind: "plan" | "asset" | "approvals";
            assetKey?: string | null;
          }>;
        })
      : null;
  const nextStepGuidance =
    payload?.nextStepGuidance &&
    typeof payload.nextStepGuidance === "object" &&
    !Array.isArray(payload.nextStepGuidance)
      ? (payload.nextStepGuidance as WorkspaceStageGuidance)
      : null;
  const isError =
    (message.contentText ?? "").includes("could not") ||
    (message.contentText ?? "").includes("retry");

  // Live ops proposal — shows before/after diff with Apply/Decline
  const liveOpsProposal =
    payload?.liveOpsProposal &&
    typeof payload.liveOpsProposal === "object" &&
    !Array.isArray(payload.liveOpsProposal)
      ? (payload.liveOpsProposal as {
          programId: string;
          changeType: string;
          fieldPath: string;
          proposedValue: string;
          currentValue: string | null;
          changeDescription: string;
        })
      : null;

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

      {/* generate_plan CTA removed — replaced by InnovaProposalCard + Accept → build_full_program flow */}

      {hasGeneratedAssets &&
      !nextStepGuidance &&
      (!secondaryLink || !secondaryLink.href.includes("/assets")) ? (
        <Link
          href={`/app/create/${sessionId}/assets`}
          className={secondaryActionClassName}
        >
          Review asset drafts
        </Link>
      ) : null}

      {/* prepare_approvals CTA removed — handled inside build_full_program flow */}

      {primaryAction?.kind === "review_approvals" &&
      inlineApprovalRequestId &&
      inlineApprovalItems &&
      inlineApprovalItems.length > 0 ? (
        <WorkspaceInlineApprovalCard
          sessionId={sessionId}
          approvalRequestId={inlineApprovalRequestId}
          requestedAt={inlineApprovalRequestedAt}
          items={inlineApprovalItems}
          programTitle={programTitle}
        />
      ) : null}

      {primaryAction?.kind === "execute_approved_plan" && !launchKitReady ? (
        <form action={executeApprovedPlanAction} className="w-full max-w-[500px]">
          <input type="hidden" name="sessionId" value={sessionId} />
          <input
            type="hidden"
            name="approvalRequestId"
            value={primaryAction.approvalRequestId ?? ""}
          />
          <div className="flex items-center justify-between gap-3 rounded-[var(--ws-r-lg)] border border-[color:var(--ws-green-bdr)] bg-[var(--ws-bg-elevated)] p-3.5">
            <div>
              <div className="mb-0.5 text-[9.5px] font-bold uppercase tracking-[.08em] text-[var(--ws-green-bright)]">
                Deterministic execution
              </div>
              <div className="text-[13px] leading-snug text-[var(--ws-t-secondary)]">
                {primaryAction.label}
              </div>
              <div className="mt-1 text-[10.5px] text-[var(--ws-t-muted)]">
                Provisions program, registration, and judging · Irreversible
              </div>
            </div>
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--ws-r-md)] border-none bg-[var(--ws-gold)] px-3.5 py-[7px] text-[11.5px] font-bold text-[var(--ws-bg-base)] transition hover:bg-[var(--ws-gold-bright)]"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 3l8 5-8 5V3z"/></svg>
              Execute now
            </button>
          </div>
        </form>
      ) : null}

      {liveOpsProposal ? (
        <LiveOpsProposalCard
          sessionId={sessionId}
          workspaceId={workspaceId}
          proposal={liveOpsProposal}
        />
      ) : null}

      {buildProposal && onAcceptBuild ? (
        <InnovaProposalCard
          workspaceId={workspaceId}
          sessionId={sessionId}
          proposal={buildProposal}
          onAccept={onAcceptBuild}
          isBuildActive={isBuildActive ?? false}
        />
      ) : null}

      {briefActionProposal ? (
        <BriefActionProposalCard
          workspaceId={workspaceId}
          sessionId={sessionId}
          proposal={briefActionProposal}
          onAcceptBuild={onAcceptBuild}
          onConfirmBriefUpdates={onConfirmBriefUpdates}
          isBuildActive={isBuildActive ?? false}
        />
      ) : null}

      {launchKitReady ? (
        <LaunchKitReadyCard
          sessionId={sessionId}
          kit={launchKitReady}
          executeApprovalRequestId={
            primaryAction?.kind === "execute_approved_plan"
              ? primaryAction.approvalRequestId ?? null
              : null
          }
        />
      ) : null}

      {nextStepGuidance &&
      !briefActionProposal &&
      !launchKitReady &&
      !buildProposal &&
      !liveOpsProposal &&
      !(primaryAction?.kind === "review_approvals" && inlineApprovalItems?.length) ? (
        <WorkspaceNextStepCard
          workspaceId={workspaceId}
          sessionId={sessionId}
          guidance={nextStepGuidance}
        />
      ) : null}

      {/* Post-build: guide PM to landing page editor */}
      {payload?.buildComplete === true && !launchKitReady ? (
        <div className="mt-2 flex flex-col gap-2">
          <Link
            href={`/app/create?session=${sessionId}&panel=assets`}
            className="flex items-center gap-2 rounded-[var(--ws-r-lg)] border border-[color:var(--ws-blue-bdr)] bg-[var(--ws-blue-sub)] px-3.5 py-2.5 text-[11.5px] font-semibold text-[var(--ws-blue-bright)] transition hover:bg-[var(--ws-bg-elevated)]"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 2h12v12H2z"/><path d="M2 6h12"/><path d="M6 6v8"/></svg>
            Open landing page editor →
          </Link>
          {primaryAction?.kind === "execute_approved_plan" ? (
            <form action={executeApprovedPlanAction} className="w-full">
              <input type="hidden" name="sessionId" value={sessionId} />
              <input type="hidden" name="approvalRequestId" value={primaryAction.approvalRequestId ?? ""} />
              <div className="flex items-center justify-between gap-3 rounded-[var(--ws-r-lg)] border border-[color:var(--ws-green-bdr)] bg-[var(--ws-bg-elevated)] p-3.5">
                <div>
                  <div className="text-[9.5px] font-bold uppercase tracking-[.08em] text-[var(--ws-green-bright)]">Ready to confirm</div>
                  <div className="text-[13px] text-[var(--ws-t-secondary)]">Provision your live program</div>
                  <div className="mt-0.5 text-[10.5px] text-[var(--ws-t-muted)]">Irreversible — review the landing page first</div>
                </div>
                <button type="submit" className="flex shrink-0 items-center gap-1.5 rounded-[var(--ws-r-md)] bg-[var(--ws-gold)] px-3.5 py-[7px] text-[11.5px] font-bold text-[#06100f] border-none cursor-pointer hover:bg-[var(--ws-gold-bright)]">
                  Confirm & Apply
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

    </div>
  );
}

function LiveOpsProposalCard({
  sessionId,
  workspaceId,
  proposal,
}: {
  sessionId: string;
  workspaceId: string;
  proposal: {
    programId: string;
    changeType: string;
    fieldPath: string;
    proposedValue: string;
    currentValue: string | null;
    changeDescription: string;
  };
}) {
  function formatDisplayValue(value: string | null, fieldPath: string): string {
    if (!value) return "Not set";
    if (fieldPath.endsWith("_at")) {
      try {
        return new Date(value).toLocaleDateString("en-GB", {
          day: "numeric", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
      } catch {
        return value;
      }
    }
    return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  }

  return (
    <div className="mt-2 max-w-[560px] overflow-hidden rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-card)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-b-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3.5 py-3">
        <div>
          <div className="mb-0.5 text-[9px] font-bold uppercase tracking-[.1em] text-[var(--ws-blue-bright)]">
            Proposed live change
          </div>
          <div className="text-[13px] font-semibold text-[var(--ws-t-primary)]">
            {proposal.changeDescription}
          </div>
        </div>
        <span className="shrink-0 rounded-[var(--ws-r-xs)] border border-[color:var(--ws-blue-bdr)] bg-[var(--ws-blue-sub)] px-[7px] py-0.5 text-[9px] font-bold uppercase tracking-[.06em] text-[var(--ws-blue-bright)]">
          Live program
        </span>
      </div>

      {/* Diff */}
      <div className="px-3.5 py-3 space-y-2">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 rounded-[var(--ws-r-xs)] bg-[var(--ws-red-sub)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[.06em] text-[var(--ws-red-bright)]">
            Before
          </span>
          <span className="text-[12px] text-[var(--ws-t-muted)] line-through">
            {formatDisplayValue(proposal.currentValue, proposal.fieldPath)}
          </span>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 rounded-[var(--ws-r-xs)] bg-[var(--ws-green-sub)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[.06em] text-[var(--ws-green-bright)]">
            After
          </span>
          <span className="text-[12px] font-medium text-[var(--ws-t-primary)]">
            {formatDisplayValue(proposal.proposedValue, proposal.fieldPath)}
          </span>
        </div>
      </div>

      {/* Footer — Apply or decline */}
      <div className="flex items-center gap-2 border-t border-t-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3.5 py-2.5">
        <p className="flex-1 text-[10.5px] text-[var(--ws-t-muted)]">
          This change will apply immediately to the live program.
        </p>
        <div className="flex shrink-0 gap-2">
          {/* Decline — sends a message to Innova */}
          <form action={sendCreateAgentMessageAction}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="message" value="Don't apply that change." />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-[var(--ws-r-md)] border border-[color:var(--ws-b-default)] bg-transparent px-3.5 py-1.5 text-[11.5px] font-medium text-[var(--ws-t-secondary)]"
            >
              Decline
            </button>
          </form>
          {/* Apply — calls the governed server action */}
          <form action={applyLiveOpsChangeAction}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="programId" value={proposal.programId} />
            <input type="hidden" name="fieldPath" value={proposal.fieldPath} />
            <input type="hidden" name="proposedValue" value={proposal.proposedValue} />
            <input type="hidden" name="changeDescription" value={proposal.changeDescription} />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-[var(--ws-r-md)] border border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] px-3.5 py-1.5 text-[11.5px] font-semibold text-[var(--ws-green-bright)]"
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 8l4 4 8-8"/></svg>
              Apply change
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function WorkspaceNextStepCard({
  workspaceId,
  sessionId,
  guidance,
}: {
  workspaceId: string;
  sessionId: string;
  guidance: WorkspaceStageGuidance;
}) {
  const action = guidance.nextStep?.action;
  const secondaryAction = guidance.nextStep?.secondaryAction;
  const actionLabel = action?.label ?? guidance.nextStep?.label ?? "Continue";

  return (
    <div className="mt-2 w-full max-w-[560px] overflow-hidden rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-card)]">
      <div className="border-b border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3.5 py-3">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[.12em] text-[var(--ws-blue-bright)]">
            Recommended next step
          </span>
          <span className="rounded-[var(--ws-r-xs)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-b-faint)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.06em] text-[var(--ws-t-muted)]">
            {guidance.stageStatus.replaceAll("_", " ")}
          </span>
        </div>
        <div className="text-[13.5px] font-semibold text-[var(--ws-t-primary)]">
          {guidance.title}
        </div>
        <p className="mt-1.5 text-[11.5px] leading-5 text-[var(--ws-t-secondary)]">
          {guidance.summary}
        </p>
      </div>

      <div className="px-3.5 py-3">
        <div className="flex items-start gap-3 rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3 py-2.5">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--ws-r-sm)] border border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] text-[var(--ws-green-bright)]">
            <ApprovalCheckIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-semibold text-[var(--ws-t-primary)]">
              {guidance.nextStep.label}
            </span>
            <span className="mt-0.5 block text-[10.5px] leading-4 text-[var(--ws-t-muted)]">
              {guidance.nextStep.description}
            </span>
          </span>
        </div>

        {guidance.followingStep ? (
          <div className="mt-2 flex items-start gap-3 rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3 py-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--ws-r-sm)] border border-[color:var(--ws-b-default)] bg-[var(--ws-b-faint)] text-[var(--ws-t-muted)]">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 8h8" />
                <path d="m9 5 3 3-3 3" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-medium text-[var(--ws-t-secondary)]">
                Then: {guidance.followingStep.label}
              </span>
              <span className="mt-0.5 block text-[10.5px] leading-4 text-[var(--ws-t-muted)]">
                {guidance.followingStep.description}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 border-t border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3.5 py-2.5">
        <p className="flex-1 text-[10.5px] leading-4 text-[var(--ws-t-muted)]">
          {guidance.guardrail}
        </p>
        <div className="flex shrink-0 items-center gap-2">
        {secondaryAction?.type === "link" ? (
          <Link
            href={secondaryAction.href}
            className="rounded-[var(--ws-r-md)] border border-[color:var(--ws-b-default)] bg-transparent px-3 py-1.5 text-[11.5px] font-medium text-[var(--ws-t-secondary)] transition hover:border-[color:var(--ws-b-strong)] hover:text-[var(--ws-t-primary)]"
          >
            {secondaryAction.label} →
          </Link>
        ) : secondaryAction?.type === "send_message" ? (
          <form action={sendCreateAgentMessageAction}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="message" value={secondaryAction.message} />
            <button
              type="submit"
              className="rounded-[var(--ws-r-md)] border border-[color:var(--ws-b-default)] bg-transparent px-3 py-1.5 text-[11.5px] font-medium text-[var(--ws-t-secondary)] transition hover:border-[color:var(--ws-b-strong)] hover:text-[var(--ws-t-primary)]"
            >
              {secondaryAction.label}
            </button>
          </form>
        ) : null}
        {action?.type === "link" ? (
          <Link
            href={action.href}
            className="shrink-0 rounded-[var(--ws-r-md)] border border-[color:var(--ws-blue-bdr)] bg-[var(--ws-blue-sub)] px-3.5 py-1.5 text-[11.5px] font-semibold text-[var(--ws-blue-bright)] transition hover:bg-[var(--ws-bg-card)] hover:text-[var(--ws-t-primary)]"
          >
            {actionLabel} →
          </Link>
        ) : action?.type === "send_message" ? (
          <form action={sendCreateAgentMessageAction} className="shrink-0">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="message" value={action.message} />
            <button
              type="submit"
              className="rounded-[var(--ws-r-md)] border border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] px-3.5 py-1.5 text-[11.5px] font-semibold text-[var(--ws-green-bright)] transition hover:bg-[var(--ws-bg-card)] hover:text-[var(--ws-t-primary)]"
            >
              {actionLabel}
            </button>
          </form>
        ) : null}
        </div>
      </div>
    </div>
  );
}

function LaunchKitReadyCard({
  sessionId,
  kit,
  executeApprovalRequestId,
}: {
  sessionId: string;
  kit: {
    title?: string;
    body?: string;
    items?: Array<{
      key: string;
      label: string;
      description?: string;
      kind: "plan" | "asset" | "approvals";
      assetKey?: string | null;
    }>;
  };
  executeApprovalRequestId?: string | null;
}) {
  const items = Array.isArray(kit.items) ? kit.items : [];

  return (
    <div className="mt-2 w-full max-w-[560px] overflow-hidden rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-card)]">
      <div className="border-b border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3.5 py-3">
        <div className="mb-1 text-[9px] font-bold uppercase tracking-[.12em] text-[var(--ws-green-bright)]">
          Launch kit ready
        </div>
        <div className="text-[13.5px] font-semibold text-[var(--ws-t-primary)]">
          {kit.title ?? "Generated workspace package"}
        </div>
        <p className="mt-1.5 text-[11.5px] leading-5 text-[var(--ws-t-secondary)]">
          {kit.body ??
            "Review each generated workstream, refine drafts with Innova, then move into governed approval."}
        </p>
      </div>

      <div className="grid gap-2 p-3">
        {items.map((item) => (
          <Link
            key={item.key}
            href={buildLaunchKitItemHref(sessionId, item)}
            className="group flex items-start gap-3 rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3 py-2.5 transition hover:border-[color:var(--ws-b-strong)] hover:bg-[var(--ws-bg-hover)]"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--ws-r-sm)] border border-[color:var(--ws-blue-bdr)] bg-[var(--ws-blue-sub)] text-[var(--ws-blue-bright)]">
              {launchKitItemIcon(item.kind)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-semibold text-[var(--ws-t-primary)]">
                {item.label}
              </span>
              {item.description ? (
                <span className="mt-0.5 block text-[10.5px] leading-4 text-[var(--ws-t-muted)]">
                  {item.description}
                </span>
              ) : null}
            </span>
            <span className="mt-1 text-[13px] text-[var(--ws-t-muted)] transition group-hover:text-[var(--ws-t-secondary)]">
              →
            </span>
          </Link>
        ))}
      </div>

      {executeApprovalRequestId ? (
        <form action={executeApprovedPlanAction} className="border-t border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3 py-2.5">
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="approvalRequestId" value={executeApprovalRequestId} />
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[.1em] text-[var(--ws-green-bright)]">
                Approved for execution
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--ws-t-muted)]">
                Provision program, registration, and judging services.
              </div>
            </div>
            <button
              type="submit"
              className="shrink-0 rounded-[var(--ws-r-md)] border-none bg-[var(--ws-gold)] px-3.5 py-1.5 text-[11.5px] font-bold text-[var(--ws-bg-base)] transition hover:bg-[var(--ws-gold-bright)]"
            >
              Execute now
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function WorkspaceInlineApprovalCard({
  sessionId,
  approvalRequestId,
  requestedAt,
  items,
  programTitle,
}: {
  sessionId: string;
  approvalRequestId: string;
  requestedAt?: string | null;
  items: Array<{
    id: string;
    label: string;
    itemType: string;
    status: "ok" | "pending";
  }>;
  programTitle: string;
}) {
  return (
    <div className="max-w-[560px] overflow-hidden rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-card)]">
      <div className="flex items-start justify-between gap-3 border-b border-b-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3.5 py-3">
        <div>
          <div className="mb-0.5 text-[9px] font-bold uppercase tracking-[.1em] text-[var(--ws-gold-bright)]">
            Approval packet
          </div>
          <div className="text-[13.5px] font-semibold text-[var(--ws-t-primary)]">
            Foundation setup — {programTitle}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--ws-t-muted)]">
            {items.length} items · {formatDateTime(requestedAt ?? null)}
          </div>
        </div>
        <span className="shrink-0 rounded-[var(--ws-r-xs)] border border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] px-[7px] py-0.5 text-[9px] font-bold uppercase tracking-[.06em] text-[var(--ws-gold-bright)]">
          Ready
        </span>
      </div>
      <div className="flex flex-col gap-1.5 px-3.5 py-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 border-b border-b-[color:var(--ws-b-faint)] py-1.5 last:border-b-0"
          >
            <div
              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[var(--ws-r-sm)] border ${
                item.status === "ok"
                  ? "border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)]"
                  : "border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)]"
              }`}
            >
              {item.status === "ok" ? <ApprovalCheckIcon /> : <ApprovalWarnIcon />}
            </div>
            <span className="flex-1 text-[12px] text-[var(--ws-t-secondary)]">{item.label}</span>
            <span className="shrink-0 text-[9.5px] font-semibold uppercase tracking-[.06em] text-[var(--ws-t-muted)]">
              {humanizeApprovalItemType(item.itemType)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-t-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3.5 py-2.5">
        <span className="flex-1 text-[10.5px] text-[var(--ws-t-muted)]">
          Risk level: <strong className="font-medium text-[var(--ws-t-tertiary)]">Low</strong>
        </span>
        <div className="flex shrink-0 gap-2">
          <form action={reviewApprovalRequestAction}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="approvalRequestId" value={approvalRequestId} />
            <input type="hidden" name="decision" value="rejected" />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-[var(--ws-r-md)] border border-[color:var(--ws-b-default)] bg-transparent px-3.5 py-1.5 text-[11.5px] font-medium text-[var(--ws-t-secondary)]"
            >
              Request changes
            </button>
          </form>
          <form action={reviewApprovalRequestAction}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="approvalRequestId" value={approvalRequestId} />
            <input type="hidden" name="decision" value="approved" />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-[var(--ws-r-md)] border border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] px-3.5 py-1.5 text-[11.5px] font-semibold text-[var(--ws-green-bright)]"
            >
              <ApprovalCheckIcon />
              Approve & continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function InlineBriefCard({
  brief,
}: {
  brief: {
    openQuestionCount: number;
    programType: string | null;
    objective: string | null;
    format: string | null;
    audience: string | null;
    regions: string | null;
    teamPolicy: string | null;
    timeline: string | null;
    judging: string | null;
    output: string | null;
  };
}) {
  const isReady = brief.openQuestionCount === 0;
  const statusTone = isReady
    ? "border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] text-[var(--ws-green-bright)]"
    : "border-[color:var(--ws-amber-bdr)] bg-[var(--ws-amber-sub)] text-[var(--ws-amber-bright)]";

  return (
    <div
      className={`mb-3 mt-3 max-w-[500px] rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-subtle)] border-l-2 bg-[var(--ws-bg-card)] p-3.5 ${
        isReady ? "border-l-[color:var(--ws-green-bdr)]" : "border-l-[color:var(--ws-amber-bdr)]"
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="text-[11.5px] font-semibold tracking-[-.01em] text-[var(--ws-t-primary)]">
          {isReady
            ? "Brief - all fields ready"
            : `Brief updated - ${brief.openQuestionCount} ${brief.openQuestionCount === 1 ? "input" : "inputs"} needed`}
        </div>
        <div className={`shrink-0 rounded-[var(--ws-r-xs)] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.06em] ${statusTone}`}>
          {isReady ? "Ready" : "Draft"}
        </div>
      </div>
      <InlineBriefRow label="Type" value={brief.programType ?? "Internal Hackathon"} primary />
      <InlineBriefRow
        label="Audience"
        value={brief.audience ?? "Not yet defined"}
        needsInput={!brief.audience}
      />
      <InlineBriefRow
        label="Regions"
        value={brief.regions ?? "Unspecified"}
        needsInput={!brief.regions}
      />
      <InlineBriefRow
        label="Team size"
        value={brief.teamPolicy ?? "Not yet defined"}
        needsInput={!brief.teamPolicy}
        primary={Boolean(brief.teamPolicy)}
      />
      <InlineBriefRow
        label="Timeline"
        value={brief.timeline ?? "Not yet defined"}
        needsInput={!brief.timeline}
        primary={Boolean(brief.timeline)}
      />
      <InlineBriefRow
        label="Judging"
        value={brief.judging ?? "Not yet defined"}
        needsInput={!brief.judging}
      />
      <InlineBriefRow
        label="Output"
        value={brief.output ?? "Not yet defined"}
        needsInput={!brief.output}
      />
    </div>
  );
}

function InlineBriefRow({
  label,
  value,
  needsInput = false,
  primary = false,
}: {
  label: string;
  value: string;
  needsInput?: boolean;
  primary?: boolean;
}) {
  return (
    <div className="mb-1 grid grid-cols-[68px_1fr] gap-x-2.5 last:mb-0">
      <div className="pt-px text-[10px] font-semibold uppercase tracking-[.07em] text-[var(--ws-t-muted)]">
        {label}
      </div>
      <div className={`text-[12px] leading-snug ${primary ? "font-medium text-[var(--ws-t-primary)]" : "text-[var(--ws-t-secondary)]"}`}>
        {value}
        {needsInput ? (
          <span className="ml-2 inline-flex items-center gap-1 rounded-[var(--ws-r-xs)] border border-[color:var(--ws-amber-bdr)] bg-[var(--ws-amber-sub)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--ws-amber-bright)]">
            <WarnTriangleIcon />
            needs input
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ── InnovaProposalCard ────────────────────────────────────────────────────────
// Shows when Innova proposes the guided setup sequence. PM starts with the plan.
function InnovaProposalCard({
  workspaceId,
  sessionId,
  proposal,
  onAccept,
  isBuildActive,
}: {
  workspaceId: string;
  sessionId: string | null;
  proposal: {
    steps: Array<{ key: string; label: string }>;
  };
  onAccept: () => void;
  isBuildActive: boolean;
}) {
  return (
    <div className="mt-3 max-w-[560px] overflow-hidden rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-card)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3.5 py-3">
        <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[7px] font-black text-[var(--ws-gold-bright)]">IN</div>
        <div className="text-[12.5px] font-semibold text-[var(--ws-t-primary)]">Ready for staged setup</div>
        <span className="ml-auto shrink-0 rounded-[var(--ws-r-xs)] border border-[color:var(--ws-blue-bdr)] bg-[var(--ws-blue-sub)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.06em] text-[var(--ws-blue-bright)]">
          Proposed
        </span>
      </div>

      {/* Steps list */}
      <div className="px-3.5 py-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.1em] text-[var(--ws-t-muted)]">
          Guided setup stages
        </div>
        <div className="space-y-1.5">
          {proposal.steps.map((s) => (
            <div key={s.key} className="flex items-center gap-2.5">
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-elevated)]">
                <svg width="7" height="7" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-[var(--ws-t-muted)]"><path d="M2 8l4 4 8-8"/></svg>
              </div>
              <span className="text-[12px] text-[var(--ws-t-secondary)]">{s.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10.5px] leading-relaxed text-[var(--ws-t-muted)]">
          The primary action starts with the execution plan. Innova will recommend the next stage after each step completes.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3.5 py-2.5">
        {/* Make changes — sends a regular message */}
        <form action={sendCreateAgentMessageAction} className="flex-1">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          {sessionId ? <input type="hidden" name="sessionId" value={sessionId} /> : null}
          <input type="hidden" name="message" value="I want to make some changes first." />
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1 rounded-[var(--ws-r-md)] border border-[color:var(--ws-b-default)] bg-transparent px-3.5 py-1.5 text-[11.5px] font-medium text-[var(--ws-t-secondary)] transition hover:border-[color:var(--ws-b-strong)] hover:text-[var(--ws-t-primary)]"
          >
            Make changes
          </button>
        </form>
        {/* Accept — triggers the full build */}
        <button
          type="button"
          onClick={onAccept}
          disabled={isBuildActive}
          className="flex shrink-0 items-center gap-1.5 rounded-[var(--ws-r-md)] bg-[var(--ws-gold)] px-4 py-1.5 text-[11.5px] font-semibold text-[#06100f] transition hover:bg-[var(--ws-gold-bright)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 8l4 4 8-8"/></svg>
          Generate plan
        </button>
      </div>
    </div>
  );
}

function BriefActionProposalCard({
  workspaceId,
  sessionId,
  proposal,
  onAcceptBuild,
  onConfirmBriefUpdates,
  isBuildActive,
}: {
  workspaceId: string;
  sessionId: string;
  proposal: {
    kind?: string;
    title?: string;
    body?: string;
    primaryLabel?: string;
    secondaryLabel?: string;
    steps?: Array<{ key: string; label: string }>;
  };
  onAcceptBuild?: () => void;
  onConfirmBriefUpdates?: () => void;
  isBuildActive: boolean;
}) {
  const isAcceptBuild = proposal.kind === "accept_build";
  const steps = Array.isArray(proposal.steps) ? proposal.steps : [];
  const primaryLabel = proposal.primaryLabel ?? (isAcceptBuild ? "Accept" : "Confirm & Apply");
  const secondaryLabel = proposal.secondaryLabel ?? "Make changes";

  return (
    <div className="mt-3 max-w-[560px] overflow-hidden rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-card)]">
      <div className="flex items-center gap-3 border-b border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3.5 py-3">
        <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[7px] font-black text-[var(--ws-gold-bright)]">IN</div>
        <div>
          <div className="text-[12.5px] font-semibold text-[var(--ws-t-primary)]">{proposal.title ?? "Review brief update"}</div>
          {proposal.body ? <div className="mt-0.5 text-[10.5px] text-[var(--ws-t-muted)]">{proposal.body}</div> : null}
        </div>
        <span className="ml-auto shrink-0 rounded-[var(--ws-r-xs)] border border-[color:var(--ws-amber-bdr)] bg-[var(--ws-amber-sub)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.06em] text-[var(--ws-amber-bright)]">
          PM decision
        </span>
      </div>

      {steps.length > 0 ? (
        <div className="px-3.5 py-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.1em] text-[var(--ws-t-muted)]">
            Guided setup stages
          </div>
          <div className="space-y-1.5">
            {steps.map((step) => (
              <div key={step.key} className="flex items-center gap-2.5">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-elevated)]">
                  <svg width="7" height="7" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-[var(--ws-t-muted)]"><path d="M2 8l4 4 8-8"/></svg>
                </div>
                <span className="text-[12px] text-[var(--ws-t-secondary)]">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2 border-t border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] px-3.5 py-2.5">
        <form action={sendCreateAgentMessageAction} className="flex-1">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="message" value="I want to make some changes first." />
          <button type="submit" className="flex w-full items-center justify-center gap-1 rounded-[var(--ws-r-md)] border border-[color:var(--ws-b-default)] bg-transparent px-3.5 py-1.5 text-[11.5px] font-medium text-[var(--ws-t-secondary)] transition hover:border-[color:var(--ws-b-strong)] hover:text-[var(--ws-t-primary)]">
            {secondaryLabel}
          </button>
        </form>

        {isAcceptBuild && onAcceptBuild ? (
          <button type="button" onClick={onAcceptBuild} disabled={isBuildActive} className="flex shrink-0 items-center gap-1.5 rounded-[var(--ws-r-md)] bg-[var(--ws-gold)] px-4 py-1.5 text-[11.5px] font-semibold text-[#06100f] transition hover:bg-[var(--ws-gold-bright)] disabled:cursor-not-allowed disabled:opacity-50">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 8l4 4 8-8"/></svg>
            {primaryLabel}
          </button>
        ) : onConfirmBriefUpdates ? (
          <button type="button" onClick={onConfirmBriefUpdates} disabled={isBuildActive} className="flex shrink-0 items-center gap-1.5 rounded-[var(--ws-r-md)] bg-[var(--ws-gold)] px-4 py-1.5 text-[11.5px] font-semibold text-[#06100f] transition hover:bg-[var(--ws-gold-bright)] disabled:cursor-not-allowed disabled:opacity-50">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 8l4 4 8-8"/></svg>
            {primaryLabel}
          </button>
        ) : (
          <form action={sendCreateAgentMessageAction}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="message" value="Confirm and apply the latest brief updates. Tell me what is still needed next." />
            <button type="submit" className="flex shrink-0 items-center gap-1.5 rounded-[var(--ws-r-md)] bg-[var(--ws-gold)] px-4 py-1.5 text-[11.5px] font-semibold text-[#06100f] transition hover:bg-[var(--ws-gold-bright)]">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 8l4 4 8-8"/></svg>
              {primaryLabel}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── BuildProgressCard ─────────────────────────────────────────────────────────
// Shown in the thread while the sequential build is running.
function BuildProgressCard({ steps }: { steps: BuildStep[] }) {
  if (steps.length === 0) return null;

  const stepIcons = {
    done: (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--ws-green-sub)] border border-[color:var(--ws-green-bdr)]">
        <svg width="7" height="7" viewBox="0 0 16 16" fill="none" stroke="var(--ws-green-bright)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 8l4 4 8-8"/></svg>
      </div>
    ),
    running: (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--ws-gold-sub)] border border-[color:var(--ws-gold-bdr)]">
        <span className="h-1.5 w-1.5 animate-spin rounded-full border border-[var(--ws-gold-bright)] border-t-transparent" />
      </div>
    ),
    pending: (
      <div className="h-4 w-4 shrink-0 rounded-full border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-elevated)]" />
    ),
  };

  return (
    <div className="mt-3 max-w-[400px] overflow-hidden rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3.5 py-3">
      <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[.1em] text-[var(--ws-gold-bright)]">
        Building your program
      </div>
      <div className="space-y-1.5">
        {steps.map((s) => (
          <div key={s.step} className="flex items-center gap-2.5">
            {stepIcons[s.status]}
            <span className={`text-[12px] ${s.status === "done" ? "text-[var(--ws-t-primary)]" : s.status === "running" ? "text-[var(--ws-gold-bright)]" : "text-[var(--ws-t-muted)]"}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewProgramEntry({
  onClose,
  workspaceId,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  return (
    <form
      action={createNewProgramWorkspaceAction}
      onSubmit={onClose}
      className="border-b border-[color:var(--ws-b-subtle)] px-3.5 py-3"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ws-gold-bright)]">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M8 3v10M3 8h10" />
        </svg>
        New program
      </div>
      <div className="flex items-center gap-2">
        <input
          autoFocus
          type="text"
          name="programName"
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          placeholder="Program name..."
          className="min-w-0 flex-1 rounded-[var(--ws-r-sm)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-input)] px-2.5 py-1.5 text-[11.5px] text-[var(--ws-t-primary)] outline-none placeholder:text-[var(--ws-t-muted)] focus:border-[color:var(--ws-gold-bdr)]"
        />
        <NewProgramStartButton />
      </div>
      <p className="mt-1.5 text-[10px] text-[var(--ws-t-muted)]">Press Enter or click Start. Name is optional.</p>
    </form>
  );
}

function NewProgramStartButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-[var(--ws-r-sm)] bg-[var(--ws-gold)] px-2.5 py-1.5 text-[11px] font-semibold text-[#06100f] transition hover:bg-[var(--ws-gold-bright)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Starting..." : "Start"}
    </button>
  );
}

function EmptyAssistantState({
  workspaceId,
  sessionId,
  pathname,
  templates,
  programName,
}: {
  workspaceId: string;
  sessionId?: string | null;
  pathname: string;
  programName?: string | null;
  templates: ReadonlyArray<{
    name: string;
    description: string;
    badge: string;
    iconClass: string;
    prompt: string;
  }>;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Mark */}
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[10px] border border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[16px] font-black tracking-[-0.04em] text-[var(--ws-gold-bright)]">
        IN
      </div>

      {/* Heading — personalised when PM entered a name */}
      <h2 className="mb-2 text-[20px] font-semibold tracking-[-0.025em] text-[var(--ws-t-primary)]">
        {programName
          ? `Let's build ${programName}`
          : "What program are you building?"}
      </h2>
      <p className="mb-8 max-w-[420px] text-[13.5px] leading-[1.7] text-[var(--ws-t-tertiary)]">
        {programName
          ? `Tell Innova about ${programName} — the format, audience, timeline, and any key constraints. Innova will structure the brief and drive everything forward.`
          : "Tell Innova about the innovation challenge, hackathon, accelerator, or grant you want to run. Innova structures the brief, surfaces gaps, and drives it forward."}
      </p>

      {/* Template cards */}
      <div className="w-full space-y-2.5">
        <div className="mb-2 text-[9px] font-bold uppercase tracking-[.12em] text-[var(--ws-t-muted)]">
          Start from a template
        </div>
        {templates.map((template) => (
          <Link
            key={template.name}
            href={buildPromptHref(pathname, workspaceId, template.prompt, sessionId)}
            className="flex items-start gap-3 rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-card)] px-4 py-3.5 text-left transition hover:border-[color:var(--ws-b-strong)] hover:bg-[var(--ws-bg-elevated)]"
          >
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--ws-r-sm)] text-[11px] ${template.iconClass}`}
            >
              ✦
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold text-[var(--ws-t-primary)]">
                {template.name}
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-[var(--ws-t-muted)]">
                {template.description}
              </div>
            </div>
            <span className="mt-0.5 shrink-0 rounded-[var(--ws-r-xs)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-b-faint)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[.06em] text-[var(--ws-t-muted)]">
              {template.badge}
            </span>
          </Link>
        ))}
      </div>

      {/* Governance note */}
      <p className="mt-6 text-[11px] text-[var(--ws-t-muted)]">
        <span className="text-[var(--ws-t-tertiary)]">Innova drafts.</span>{" "}
        <span className="text-[var(--ws-t-tertiary)]">You approve.</span>{" "}
        Nothing goes live without your sign-off.
      </p>
    </div>
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
      ? "border-[color:var(--ws-red-bdr)] bg-[var(--ws-red-sub)] text-[var(--ws-red-bright)]"
      : tone === "amber"
        ? "border-[color:var(--ws-amber-bdr)] bg-[var(--ws-amber-sub)] text-[var(--ws-amber-bright)]"
        : "border-[color:var(--ws-blue-bdr)] bg-[var(--ws-blue-sub)] text-[var(--ws-blue-bright)]";

  return (
    <div className={`rounded-[var(--ws-r-xl)] border px-4 py-3 ${toneClass}`}>
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
        className="absolute inset-0 bg-black/70"
      />
      <aside className="relative z-10 flex h-full w-[380px] flex-col border-l border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-surface)] shadow-[var(--ws-shadow-xl)]">
        <div className="flex items-center gap-3 border-b border-[color:var(--ws-b-subtle)] px-4 py-3">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--ws-gold-bright)]">
              {kicker}
            </div>
            <div className="mt-1 text-[14px] font-semibold text-[var(--ws-t-primary)]">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-[var(--ws-r-md)] text-[var(--ws-t-tertiary)] transition hover:bg-[var(--ws-b-faint)] hover:text-[var(--ws-t-primary)]"
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
    <div className="mb-2 mt-4 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--ws-t-muted)] first:mt-0">
      {label}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex shrink-0 items-center gap-[3px]">
      <span className="h-[5px] w-[5px] animate-bounce rounded-full bg-[var(--ws-gold-bright)] opacity-80 [animation-delay:0s] [animation-duration:1.1s]" />
      <span className="h-[5px] w-[5px] animate-bounce rounded-full bg-[var(--ws-gold-bright)] opacity-80 [animation-delay:0.18s] [animation-duration:1.1s]" />
      <span className="h-[5px] w-[5px] animate-bounce rounded-full bg-[var(--ws-gold-bright)] opacity-80 [animation-delay:0.36s] [animation-duration:1.1s]" />
    </div>
  );
}

// Only attach the inline brief card to messages that actually concern the brief.
// A conversational reply to "hi" or "thanks" should NOT show the brief card even
// if it happens to be the latest message — that makes the conversation confusing.
function isBriefRelatedMessage(message: AgentMessageSummary): boolean {
  if (message.kind === "brief_update" || message.kind === "question") return true;
  const payload =
    message.contentPayload &&
    typeof message.contentPayload === "object" &&
    !Array.isArray(message.contentPayload)
      ? (message.contentPayload as Record<string, unknown>)
      : null;
  if (!payload) return false;
  return Boolean(
    payload.briefStatus ||
    payload.openQuestions ||
    payload.structuredBrief ||
    payload.confidenceLevel,
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

function buildPromptHref(
  pathname: string,
  workspaceId: string,
  prompt: string,
  sessionId?: string | null,
) {
  const params = new URLSearchParams({
    workspace: workspaceId,
    prompt,
  });

  if (sessionId) {
    params.set("session", sessionId);
  }

  return `${pathname}?${params.toString()}`;
}

function buildLaunchKitItemHref(
  sessionId: string,
  item: {
    kind: "plan" | "asset" | "approvals";
    assetKey?: string | null;
  },
) {
  const params = new URLSearchParams({ session: sessionId });

  if (item.kind === "plan") {
    params.set("panel", "plan");
  } else if (item.kind === "approvals") {
    params.set("panel", "approvals");
  } else {
    params.set("panel", "assets");
    if (item.assetKey) {
      params.set("asset", item.assetKey);
    }
  }

  return `/app/create?${params.toString()}`;
}

function launchKitItemIcon(kind: "plan" | "asset" | "approvals") {
  if (kind === "plan") {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 3h10v10H3z" />
        <path d="M5.5 6h5" />
        <path d="M5.5 9h3" />
      </svg>
    );
  }

  if (kind === "approvals") {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4l5-2z" />
        <path d="M5.5 8l1.5 1.5L10.5 6" />
      </svg>
    );
  }

  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 2.5h7l3 3V13.5H3z" />
      <path d="M10 2.5V6h3" />
      <path d="M5.5 9h5" />
    </svg>
  );
}

function normalizeMessageText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function humanizeRunType(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function humanizeApprovalItemType(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
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

function ApprovalCheckIcon() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-[var(--ws-green-bright)]"
    >
      <path d="M2 8l4 4 8-8" />
    </svg>
  );
}

function ApprovalWarnIcon() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-[var(--ws-gold-bright)]"
    >
      <path d="M8 1 1 14h14L8 1z" />
      <path d="M8 6.5v3" />
      <path d="M8 12h.01" />
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
