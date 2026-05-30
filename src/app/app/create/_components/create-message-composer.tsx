"use client";

import { useRef, useState } from "react";

export function CreateMessageComposer({
  workspaceId,
  sessionId,
  defaultMessage,
  showHelperText = true,
  onOptimisticSubmit,
  onStreamEvent,
}: {
  workspaceId: string;
  sessionId?: string | null;
  defaultMessage?: string;
  showHelperText?: boolean;
  onOptimisticSubmit?: (message: string) => void;
  onStreamEvent?: (event: StreamEvent) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <form
      key={`composer-form-${sessionId ?? "new"}-${defaultMessage ?? ""}`}
      onSubmit={async (event) => {
        event.preventDefault();
        if (isSubmitting) {
          return;
        }

        const message = textareaRef.current?.value?.trim();
        if (!message || message.length < 8) {
          return;
        }

        setIsSubmitting(true);
        onOptimisticSubmit?.(message);

        try {
          const response = await fetch("/api/pm-workspace/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              workspaceId,
              sessionId,
              message,
            }),
          });

          if (!response.ok || !response.body) {
            throw new Error("The PM workspace could not open a live stream.");
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
              onStreamEvent?.(JSON.parse(line) as StreamEvent);
            }
          }

          textareaRef.current!.value = "";
        } catch (error) {
          onStreamEvent?.({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "The PM workspace could not send that instruction.",
          });
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="rounded-[22px] border border-white/8 bg-[#0b1423] px-4 py-3 shadow-[0_-8px_24px_rgba(2,6,14,0.08)]">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            key={`composer-${sessionId ?? "new"}-${defaultMessage ?? ""}`}
            name="message"
            defaultValue={defaultMessage ?? ""}
            required
            minLength={8}
            rows={1}
            placeholder="Describe the program you want to build - type, scope, timeline, requirements..."
            className="min-h-[22px] max-h-[112px] flex-1 resize-none bg-transparent text-[14px] leading-7 text-[#eae5dc] outline-none placeholder:text-[#607089]"
          />
          <ComposerActions isSubmitting={isSubmitting} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[10.5px] text-[#5e7088]">
          <span>{showHelperText ? "Innova structures your input into a governed brief, plan, and approval flow." : ""}</span>
          <span className="shrink-0">{isSubmitting ? "Sending..." : "Enter to send"}</span>
        </div>
      </div>
    </form>
  );
}

function ComposerActions({ isSubmitting }: { isSubmitting: boolean }) {
  const busy = isSubmitting;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        disabled={busy}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5e7088] transition hover:bg-white/[0.03] hover:text-[#9baabf] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PaperclipIcon />
      </button>
      <button
        type="submit"
        disabled={busy}
        className="flex h-9 min-w-[92px] items-center justify-center gap-2 rounded-full bg-[#b08a28] px-3.5 text-[11.5px] font-semibold text-[#06100f] transition hover:bg-[#ccaa4a] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? (
          <>
            <SpinnerIcon />
            Sending...
          </>
        ) : (
          <>
            Send
            <SendIcon />
          </>
        )}
      </button>
    </div>
  );
}

export type StreamEvent =
  | {
      type: "session";
      sessionId: string;
      workspaceId: string;
    }
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
      sessionId: string;
      workspaceId: string;
    }
  | {
      type: "error";
      message: string;
      sessionId?: string;
      workspaceId?: string;
    };

function PaperclipIcon() {
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
      <path d="m13.5 7.5-6 6a3.5 3.5 0 0 1-5-5l7-7a2.3 2.3 0 0 1 3.3 3.3l-7 7a1.2 1.2 0 0 1-1.7-1.7l6-6" />
    </svg>
  );
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
