"use client";

import { useActionState, useState } from "react";
import type { WorkspaceAccessRow } from "@/lib/supabase/queries";
import { slugifySegment } from "@/lib/utils/slugs";
import {
  createProgramAction,
  type CreateProgramActionState,
} from "@/app/app/dashboard/actions";

const INITIAL_STATE: CreateProgramActionState = {
  error: null,
};

type CreateProgramFormProps = {
  workspaces: WorkspaceAccessRow[];
};

export function CreateProgramForm({ workspaces }: CreateProgramFormProps) {
  const [state, formAction, isPending] = useActionState(
    createProgramAction,
    INITIAL_STATE,
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  return (
    <section className="panel rounded-[28px] p-6 md:p-7">
      <div className="border-b border-border pb-4">
        <p className="eyebrow text-xs font-semibold text-accent">
          Program setup
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Create a new governed program
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          This creates the program record and the creator&apos;s
          `program_manager` membership in one trusted transaction.
        </p>
      </div>

      <form action={formAction} className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="workspaceId" className="text-sm font-medium text-foreground">
            Workspace
          </label>
          <select
            id="workspaceId"
            name="workspaceId"
            required
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
            defaultValue={workspaces[0]?.workspaceId}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.workspaceId} value={workspace.workspaceId}>
                {workspace.workspaceName} ({workspace.workspaceRole})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Program name
          </label>
          <input
            id="name"
            name="name"
            value={name}
            onChange={(event) => {
              const nextValue = event.target.value;
              setName(nextValue);

              if (!slug || slug === slugifySegment(name)) {
                setSlug(slugifySegment(nextValue));
              }
            }}
            required
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
            placeholder="Global Innovation Challenge 2026"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="slug" className="text-sm font-medium text-foreground">
            Program slug
          </label>
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
            placeholder="global-innovation-challenge-2026"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="programType" className="text-sm font-medium text-foreground">
            Program type
          </label>
          <input
            id="programType"
            name="programType"
            required
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
            placeholder="Hackathon"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="visibility" className="text-sm font-medium text-foreground">
            Visibility
          </label>
          <select
            id="visibility"
            name="visibility"
            defaultValue="private"
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
          >
            <option value="private">Private</option>
            <option value="workspace">Workspace</option>
            <option value="organization">Organization</option>
            <option value="public">Public</option>
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label
            htmlFor="shortDescription"
            className="text-sm font-medium text-foreground"
          >
            Short description
          </label>
          <textarea
            id="shortDescription"
            name="shortDescription"
            rows={4}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
            placeholder="Enterprise challenge for collecting, evaluating, and scaling innovation ideas across business units."
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="registrationOpensAt"
            className="text-sm font-medium text-foreground"
          >
            Registration opens
          </label>
          <input
            id="registrationOpensAt"
            name="registrationOpensAt"
            type="datetime-local"
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="registrationClosesAt"
            className="text-sm font-medium text-foreground"
          >
            Registration closes
          </label>
          <input
            id="registrationClosesAt"
            name="registrationClosesAt"
            type="datetime-local"
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="startsAt" className="text-sm font-medium text-foreground">
            Program starts
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="submissionClosesAt"
            className="text-sm font-medium text-foreground"
          >
            Submission closes
          </label>
          <input
            id="submissionClosesAt"
            name="submissionClosesAt"
            type="datetime-local"
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="endsAt" className="text-sm font-medium text-foreground">
            Program ends
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </div>

        {state.error ? (
          <p className="md:col-span-2 rounded-2xl border border-[#d9b4b4] bg-[#fff5f5] px-4 py-3 text-sm text-[#9a2c2c]">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="md:col-span-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Creating program..." : "Create program"}
        </button>
      </form>
    </section>
  );
}
