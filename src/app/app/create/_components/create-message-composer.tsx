"use client";

import { useFormStatus } from "react-dom";
import { sendCreateAgentMessageAction } from "@/app/app/create/actions";

export function CreateMessageComposer({
  workspaceId,
  sessionId,
  defaultMessage,
}: {
  workspaceId: string;
  sessionId?: string | null;
  defaultMessage?: string;
}) {
  return (
    <form action={sendCreateAgentMessageAction}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {sessionId ? <input type="hidden" name="sessionId" value={sessionId} /> : null}
      <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-[#0a1422] px-4 py-3">
        <textarea
          key={`composer-${sessionId ?? "new"}-${defaultMessage ?? ""}`}
          name="message"
          defaultValue={defaultMessage ?? ""}
          required
          minLength={8}
          rows={4}
          placeholder="Describe the program you want to build - type, scope, timeline, requirements... e.g. 'Run a global employee hackathon for APAC and Europe, teams of 4, registration next Monday, six week sprint, two judging rounds, sponsor-safe report required.'"
          className="min-h-[110px] flex-1 resize-none bg-transparent text-[13px] leading-6 text-[#eae5dc] outline-none placeholder:text-[#5e7088]"
        />
        <ComposerActions />
      </div>
    </form>
  );
}

function ComposerActions() {
  const { pending } = useFormStatus();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="flex h-8 w-8 items-center justify-center rounded-md text-[#5e7088] transition hover:bg-white/[0.03] hover:text-[#9baabf] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PaperclipIcon />
      </button>
      <button
        type="submit"
        disabled={pending}
        className="flex min-w-[104px] items-center justify-center gap-2 rounded-md bg-[#b08a28] px-3 py-2 text-[11.5px] font-semibold text-[#06100f] transition hover:bg-[#ccaa4a] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? (
          <>
            <SpinnerIcon />
            Generating...
          </>
        ) : (
          <>
            Generate
            <SendIcon />
          </>
        )}
      </button>
    </div>
  );
}

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
