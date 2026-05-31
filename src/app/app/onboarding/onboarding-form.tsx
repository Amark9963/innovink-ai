"use client";

import { useActionState, useState } from "react";
import {
  createWorkspaceWithDefaults,
  type OnboardingActionState,
} from "@/app/app/onboarding/actions";
import { slugifySegment } from "@/lib/utils/slugs";

const INITIAL_STATE: OnboardingActionState = { error: null };

const TIMEZONE_OPTIONS = [
  { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
  { value: "Asia/Tokyo", label: "Tokyo (GMT+9)" },
  { value: "Asia/Kolkata", label: "India (GMT+5:30)" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "Europe/London", label: "London (GMT+0/+1)" },
  { value: "Europe/Paris", label: "Paris (GMT+1/+2)" },
  { value: "America/New_York", label: "New York (GMT-5/-4)" },
  { value: "America/Chicago", label: "Chicago (GMT-6/-5)" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-8/-7)" },
  { value: "America/Sao_Paulo", label: "São Paulo (GMT-3)" },
  { value: "Australia/Sydney", label: "Sydney (GMT+10/+11)" },
] as const;

const PROGRAM_TYPES = [
  { value: "hackathon", label: "Hackathon" },
  { value: "innovation_challenge", label: "Innovation Challenge" },
  { value: "accelerator", label: "Accelerator" },
  { value: "grant_program", label: "Grant Program" },
  { value: "student_competition", label: "Student Competition" },
  { value: "pitch_competition", label: "Pitch Competition" },
] as const;

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(
    createWorkspaceWithDefaults,
    INITIAL_STATE,
  );

  const [orgName, setOrgName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceNameTouched, setWorkspaceNameTouched] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["hackathon", "innovation_challenge"]);

  function toggleType(value: string) {
    setSelectedTypes((current) =>
      current.includes(value)
        ? current.length > 1 ? current.filter((t) => t !== value) : current
        : [...current, value],
    );
  }

  return (
    <form action={formAction} className="space-y-5">

      {/* Org + workspace names */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="organizationName"
            className="block text-[10.5px] font-semibold uppercase tracking-[.08em] text-[var(--ws-t-muted)]"
          >
            Organization name
          </label>
          <input
            id="organizationName"
            name="organizationName"
            value={orgName}
            onChange={(e) => {
              const next = e.target.value;
              setOrgName(next);
              if (!workspaceNameTouched) {
                setWorkspaceName(next);
              }
            }}
            required
            autoFocus
            placeholder="Acme Innovation"
            className="w-full rounded-[var(--ws-r-md)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-input)] px-3.5 py-2.5 text-[13px] text-[var(--ws-t-primary)] outline-none transition placeholder:text-[var(--ws-t-muted)] focus:border-[color:var(--ws-gold-bdr)] focus:shadow-[0_0_0_3px_var(--ws-gold-glow)]"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="workspaceName"
            className="block text-[10.5px] font-semibold uppercase tracking-[.08em] text-[var(--ws-t-muted)]"
          >
            Workspace name
          </label>
          <input
            id="workspaceName"
            name="workspaceName"
            value={workspaceName}
            onChange={(e) => {
              setWorkspaceName(e.target.value);
              setWorkspaceNameTouched(true);
            }}
            required
            placeholder="Global Programs"
            className="w-full rounded-[var(--ws-r-md)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-input)] px-3.5 py-2.5 text-[13px] text-[var(--ws-t-primary)] outline-none transition placeholder:text-[var(--ws-t-muted)] focus:border-[color:var(--ws-gold-bdr)] focus:shadow-[0_0_0_3px_var(--ws-gold-glow)]"
          />
          {(orgName || workspaceName) && (
            <p className="text-[10.5px] text-[var(--ws-t-muted)]">
              URL: <span className="font-mono text-[var(--ws-t-tertiary)]">/{slugifySegment(workspaceName || orgName)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Timezone */}
      <div className="space-y-1.5">
        <label
          htmlFor="timezone"
          className="block text-[10.5px] font-semibold uppercase tracking-[.08em] text-[var(--ws-t-muted)]"
        >
          Default timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          defaultValue="Asia/Singapore"
          className="w-full rounded-[var(--ws-r-md)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-input)] px-3.5 py-2.5 text-[13px] text-[var(--ws-t-primary)] outline-none transition focus:border-[color:var(--ws-gold-bdr)] focus:shadow-[0_0_0_3px_var(--ws-gold-glow)]"
        >
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Program types */}
      <div className="space-y-2">
        <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-[var(--ws-t-muted)]">
          Program focus <span className="ml-1 normal-case tracking-normal font-normal text-[var(--ws-t-muted)]">— select all that apply</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PROGRAM_TYPES.map((type) => {
            const active = selectedTypes.includes(type.value);
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => toggleType(type.value)}
                className={`rounded-[var(--ws-r-md)] border px-3 py-1.5 text-[11.5px] font-medium transition ${
                  active
                    ? "border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[var(--ws-gold-bright)]"
                    : "border-[color:var(--ws-b-default)] bg-transparent text-[var(--ws-t-muted)] hover:border-[color:var(--ws-b-strong)] hover:text-[var(--ws-t-secondary)]"
                }`}
              >
                {type.label}
              </button>
            );
          })}
        </div>
        {/* Hidden inputs for selected types */}
        {selectedTypes.map((t) => (
          <input key={t} type="hidden" name="programTypes" value={t} />
        ))}
      </div>

      {/* Error */}
      {state.error ? (
        <p className="rounded-[var(--ws-r-md)] border border-[color:var(--ws-red-bdr)] bg-[var(--ws-red-sub)] px-4 py-3 text-[12.5px] text-[var(--ws-red-bright)]">
          {state.error}
        </p>
      ) : null}

      {/* Submit */}
      <div className="flex items-center justify-between border-t border-[color:var(--ws-b-subtle)] pt-4">
        <p className="text-[11px] text-[var(--ws-t-muted)]">
          Settings can be adjusted anytime in workspace settings.
        </p>
        <button
          type="submit"
          disabled={isPending || !orgName.trim() || !workspaceName.trim()}
          className="rounded-[var(--ws-r-md)] bg-[var(--ws-gold)] px-5 py-2.5 text-[12.5px] font-semibold text-[#06100f] transition hover:bg-[var(--ws-gold-bright)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Setting up workspace…" : "Launch workspace →"}
        </button>
      </div>

    </form>
  );
}
