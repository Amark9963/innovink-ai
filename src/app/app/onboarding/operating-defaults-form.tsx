"use client";

import { useActionState } from "react";
import {
  completeWorkspaceOnboardingDefaults,
  type OnboardingActionState,
} from "@/app/app/onboarding/actions";

const INITIAL_STATE: OnboardingActionState = {
  error: null,
};

const TIMEZONE_OPTIONS = [
  "Asia/Singapore",
  "Asia/Kolkata",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
] as const;

const PROGRAM_TYPE_OPTIONS = [
  { value: "hackathon", label: "Hackathons" },
  { value: "innovation_challenge", label: "Innovation challenges" },
  { value: "accelerator", label: "Accelerators" },
  { value: "grant_program", label: "Grant programs" },
  { value: "student_competition", label: "Student competitions" },
  { value: "pitch_competition", label: "Pitch competitions" },
] as const;

export function OperatingDefaultsForm() {
  const [state, formAction, isPending] = useActionState(
    completeWorkspaceOnboardingDefaults,
    INITIAL_STATE,
  );

  return (
    <section className="max-w-4xl rounded-[18px] border border-white/7 bg-[#162034] p-6 shadow-[0_8px_28px_rgba(0,0,0,0.55)] md:p-7">
      <form action={formAction} className="space-y-7">
        <div className="rounded-xl border border-[#b08a2838] bg-[#b08a2810] px-4 py-3 text-[12px] leading-5 text-[#cbb890]">
          These defaults shape how Innovink prepares templates, participant flows, and approval behavior in your first workspace.
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="timezone"
              className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9baabf]"
            >
              Default timezone
            </label>
            <select
              id="timezone"
              name="timezone"
              defaultValue="Asia/Singapore"
              className="w-full rounded-md border border-white/10 bg-[#0a1422] px-4 py-3 text-sm text-[#eae5dc] outline-none transition focus:border-[#b08a28]"
            >
              {TIMEZONE_OPTIONS.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9baabf]">
              Participant self-signup
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <RadioCard
                name="participantSelfSignupAllowed"
                value="yes"
                title="Allowed by default"
                description="Public program registration can be enabled in program setup."
                defaultChecked
              />
              <RadioCard
                name="participantSelfSignupAllowed"
                value="no"
                title="Restricted by default"
                description="Programs start invite-gated unless a PM changes the setting."
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9baabf]">
            Primary program types
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {PROGRAM_TYPE_OPTIONS.map((option, index) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-[#0a1422] px-4 py-3 text-sm text-[#d7e0ea] transition hover:border-[#b08a2838] hover:bg-[#101b2c]"
              >
                <input
                  type="checkbox"
                  name="programTypes"
                  value={option.value}
                  defaultChecked={index < 2}
                  className="mt-1 h-4 w-4 rounded border-white/10 bg-[#07101f] text-[#b08a28] focus:ring-[#b08a28]"
                />
                <span>
                  <span className="block font-medium text-[#eae5dc]">{option.label}</span>
                  <span className="mt-1 block text-[12px] leading-5 text-[#8ea0b6]">
                    Use this to prioritize templates and operating defaults for your workspace.
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9baabf]">
            Publish approvals
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <RadioCard
              name="requireApprovalBeforePublish"
              value="yes"
              title="Approval required"
              description="Launch assets stay approval-gated before publish by default."
              defaultChecked
            />
            <RadioCard
              name="requireApprovalBeforePublish"
              value="no"
              title="Direct publish allowed"
              description="Program managers can publish without the extra approval checkpoint."
            />
          </div>
        </div>

        {state.error ? (
          <p className="rounded-md border border-[#9b3a3a66] bg-[#9b3a3a1a] px-4 py-3 text-sm text-[#f1bcbc]">
            {state.error}
          </p>
        ) : null}

        <div className="flex items-center justify-between border-t border-white/7 pt-5">
          <div className="text-[12px] text-[#5e7088]">
            These defaults can be refined later in workspace and admin settings.
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-[#9baabf]">Step 2 of 2</span>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-[#b08a28] px-5 py-3 text-sm font-semibold text-[#06100f] transition hover:bg-[#ccaa4a] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Saving defaults..." : "Finish onboarding ->"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function RadioCard({
  name,
  value,
  title,
  description,
  defaultChecked = false,
}: {
  name: string;
  value: string;
  title: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-[#0a1422] px-4 py-3 text-sm text-[#d7e0ea] transition hover:border-[#b08a2838] hover:bg-[#101b2c]">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 border-white/10 bg-[#07101f] text-[#b08a28] focus:ring-[#b08a28]"
      />
      <span>
        <span className="block font-medium text-[#eae5dc]">{title}</span>
        <span className="mt-1 block text-[12px] leading-5 text-[#8ea0b6]">{description}</span>
      </span>
    </label>
  );
}
