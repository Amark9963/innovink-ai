"use client";

import { useActionState, useState } from "react";
import {
  createWorkspaceOnboarding,
  type OnboardingActionState,
} from "@/app/app/onboarding/actions";
import { slugifySegment } from "@/lib/utils/slugs";

const INITIAL_STATE: OnboardingActionState = {
  error: null,
};

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(
    createWorkspaceOnboarding,
    INITIAL_STATE,
  );
  const [organizationName, setOrganizationName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");

  return (
    <section className="max-w-4xl rounded-xl border border-white/7 bg-[#162034] p-6 shadow-[0_8px_28px_rgba(0,0,0,0.55)] md:p-7">
      <form action={formAction} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="organizationName"
            className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9baabf]"
          >
            Organization name
          </label>
          <input
            id="organizationName"
            name="organizationName"
            value={organizationName}
            onChange={(event) => {
              const nextValue = event.target.value;
              setOrganizationName(nextValue);

              if (!organizationSlug || organizationSlug === slugifySegment(organizationName)) {
                setOrganizationSlug(slugifySegment(nextValue));
              }
            }}
            required
            className="w-full rounded-md border border-white/10 bg-[#0a1422] px-4 py-3 text-sm text-[#eae5dc] outline-none transition placeholder:text-[#5e7088] focus:border-[#b08a28]"
            placeholder="Acme Innovation Group"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="organizationSlug"
            className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9baabf]"
          >
            Organization slug
          </label>
          <input
            id="organizationSlug"
            name="organizationSlug"
            value={organizationSlug}
            onChange={(event) => setOrganizationSlug(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-[#0a1422] px-4 py-3 text-sm text-[#eae5dc] outline-none transition placeholder:text-[#5e7088] focus:border-[#b08a28]"
            placeholder="acme-innovation-group"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="workspaceName" className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9baabf]">
            Workspace name
          </label>
          <input
            id="workspaceName"
            name="workspaceName"
            value={workspaceName}
            onChange={(event) => {
              const nextValue = event.target.value;
              setWorkspaceName(nextValue);

              if (!workspaceSlug || workspaceSlug === slugifySegment(workspaceName)) {
                setWorkspaceSlug(slugifySegment(nextValue));
              }
            }}
            required
            className="w-full rounded-md border border-white/10 bg-[#0a1422] px-4 py-3 text-sm text-[#eae5dc] outline-none transition placeholder:text-[#5e7088] focus:border-[#b08a28]"
            placeholder="Global Programs"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="workspaceSlug" className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9baabf]">
            Workspace slug
          </label>
          <input
            id="workspaceSlug"
            name="workspaceSlug"
            value={workspaceSlug}
            onChange={(event) => setWorkspaceSlug(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-[#0a1422] px-4 py-3 text-sm text-[#eae5dc] outline-none transition placeholder:text-[#5e7088] focus:border-[#b08a28]"
            placeholder="global-programs"
          />
        </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="billingEmail" className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9baabf]">
            Billing email
          </label>
          <input
            id="billingEmail"
            name="billingEmail"
            type="email"
            className="w-full rounded-md border border-white/10 bg-[#0a1422] px-4 py-3 text-sm text-[#eae5dc] outline-none transition placeholder:text-[#5e7088] focus:border-[#b08a28]"
            placeholder="finance@company.com"
          />
        </div>

        {state.error ? (
          <p className="rounded-md border border-[#9b3a3a66] bg-[#9b3a3a1a] px-4 py-3 text-sm text-[#f1bcbc]">
            {state.error}
          </p>
        ) : null}

        <div className="flex items-center justify-between border-t border-white/7 pt-5">
          <div className="text-[12px] text-[#5e7088]">
            Tenant creation is audited and role-aware from the first record.
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-[#b08a28] px-5 py-3 text-sm font-semibold text-[#06100f] transition hover:bg-[#ccaa4a] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Creating workspace..." : "Continue →"}
          </button>
        </div>
      </form>
    </section>
  );
}
