import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prepareApprovalRequestAction } from "@/app/app/create/actions";
import type { ProgramFormFieldSummary } from "@/lib/supabase/queries";
import {
  getCurrentUserOrNull,
  getLatestAgentSessionForProgram,
  getProgramById,
  getProgramFormManagerData,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

type SubmissionFormRouteProps = {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{
    error?: string;
    field?: string;
    status?: string;
    view?: string;
  }>;
};

export default async function ProgramSubmissionFormManager({
  params,
  searchParams,
}: SubmissionFormRouteProps) {
  const { programId } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const [program, formState, linkedSession] = await Promise.all([
    getProgramById(supabase, programId),
    getProgramFormManagerData(supabase, programId, "submission"),
    getLatestAgentSessionForProgram(supabase, user.id, programId),
  ]);

  if (!program) {
    notFound();
  }

  const selectedField =
    formState.fields.find((field) => field.id === resolvedSearchParams.field) ??
    formState.fields[0] ??
    null;
  const previewMode = resolvedSearchParams.view === "preview";
  const canRequestApproval = Boolean(linkedSession && formState.fields.length > 0);
  const fieldLibrary = buildSubmissionFieldLibrary(linkedSession?.id ?? null);
  const headerStatus = `${formState.fields.length} fields · ${
    formState.form?.status === "active" ? "Active" : "Opens with launch"
  }`;
  const saveAndCloseHref = linkedSession
    ? `/app/create/${linkedSession.id}/assets`
    : "/app/dashboard";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#07101f] text-[#eae5dc]">
      <header className="flex items-center justify-between border-b border-white/7 bg-[#0c1525] px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#b08a2838] bg-[#b08a2812] text-[13px] font-bold text-[#ccaa4a]">
            IN
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
              Innovink
            </div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#3a6e9e]">
              Submission Form Builder
            </div>
          </div>
          <div className="h-5 w-px bg-white/7" />
          <div className="text-[12px] text-[#9baabf]">{program.name}</div>
          <div className="text-[11px] text-[#5e7088]">/ Submission Form</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] text-[#9baabf]">{headerStatus}</div>

          <Link
            href={buildManagerRoute(program.id, {
              fieldId: selectedField?.id ?? null,
              view: previewMode ? "builder" : "preview",
            })}
            className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            {previewMode ? "Builder View" : "Preview"}
          </Link>

          {canRequestApproval ? (
            <form action={prepareApprovalRequestAction}>
              <input type="hidden" name="sessionId" value={linkedSession!.id} />
              <input type="hidden" name="redirectTo" value="approvals" />
              <button
                type="submit"
                className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
              >
                Send for Approval
              </button>
            </form>
          ) : (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-md border border-white/8 px-3 py-2 text-[12px] font-medium text-[#5e7088]"
            >
              Send for Approval
            </button>
          )}

          <Link
            href={saveAndCloseHref}
            className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
          >
            Save &amp; Close
          </Link>
        </div>
      </header>

      {resolvedSearchParams.error ? (
        <div className="border-b border-[#9b3a3a44] bg-[#9b3a3a12] px-6 py-3 text-[12px] text-[#f1bcbc]">
          {resolvedSearchParams.error}
        </div>
      ) : null}

      {resolvedSearchParams.status ? (
        <div className="border-b border-[#2d7a5840] bg-[#2d7a5812] px-6 py-3 text-[12px] text-[#9ad0b7]">
          {resolvedSearchParams.status.replace(/-/g, " ")}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)_320px] overflow-hidden">
        <aside className="overflow-y-auto border-r border-white/7 bg-[#0c1525] px-4 py-4">
          <div className="mb-4 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#5e7088]">
            Workspace
          </div>

          <div className="space-y-2">
            <WorkspaceLink href={linkedSession ? `/app/create?session=${linkedSession.id}` : "/app/create"}>
              AI Workspace
            </WorkspaceLink>
            <WorkspaceLink href={`/app/programs/${program.id}/landing-page`}>
              Landing Page
            </WorkspaceLink>
            <WorkspaceLink href={`/app/programs/${program.id}/registration-form`}>
              Reg Form
            </WorkspaceLink>
            <WorkspaceLink href={`/app/programs/${program.id}/submission-form`} active>
              Sub Form
            </WorkspaceLink>
            <DisabledWorkspaceLink>Judging</DisabledWorkspaceLink>
          </div>

          <div className="mt-6 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#5e7088]">
            Submission Fields
          </div>

          <div className="mt-3 space-y-5">
            {fieldLibrary.map((group) => (
              <div key={group.label}>
                <div className="mb-2 text-[10px] text-[#5e7088]">{group.label}</div>
                <div className="space-y-2">
                  {group.items.map((item) =>
                    linkedSession ? (
                      <Link
                        key={item.label}
                        href={buildCreateHref(linkedSession.id, item.prompt)}
                        className={cn(
                          "flex items-center gap-3 rounded-md border px-3 py-2 text-[11.5px] transition hover:border-white/20 hover:bg-white/[0.03] hover:text-[#eae5dc]",
                          item.highlighted
                            ? "border-[#b08a2838] bg-[#b08a2810] text-[#ccaa4a]"
                            : "border-white/10 bg-[#111e30] text-[#9baabf]",
                        )}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#162034] text-[10px] font-semibold text-[#ccaa4a]">
                          {item.badge}
                        </span>
                        {item.label}
                      </Link>
                    ) : (
                      <div
                        key={item.label}
                        className="flex cursor-not-allowed items-center gap-3 rounded-md border border-white/10 bg-[#111e30] px-3 py-2 text-[11.5px] text-[#5e7088]"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#162034] text-[10px] font-semibold text-[#7c8798]">
                          {item.badge}
                        </span>
                        {item.label}
                      </div>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-md border border-[#3a6e9e33] bg-[#3a6e9e14] p-3">
            <div className="text-[10.5px] font-medium text-[#7fb5e7]">
              {formState.fields.length} fields configured
            </div>
            <div className="mt-1 text-[10.5px] leading-5 text-[#9baabf]">
              Estimated submission time stays strongest when the final package stays under one hour.
            </div>
          </div>
        </aside>

        <main className="overflow-y-auto bg-[#050c17] px-6 py-6">
          {formState.form ? (
            <div className="mx-auto max-w-[760px]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
                    {formState.form.name}
                  </div>
                  <div className="mt-1 text-[12px] text-[#9baabf]">
                    {formState.form.description ?? "Submission package for finalist-ready project review."}
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-[#111e30] px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-[#9baabf]">
                  {formState.form.status}
                </div>
              </div>

              {previewMode ? (
                <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#f7f4eb] shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
                  <div className="border-b border-[#ded8c8] bg-[linear-gradient(135deg,#dbe9f5,#f7f4eb)] px-8 py-8">
                    <div className="text-[24px] font-semibold tracking-[-0.02em] text-[#151515]">
                      Submit Your Solution
                    </div>
                    <div className="mt-2 text-[13px] text-[#5f5a4e]">
                      {program.name} · Due before judging begins
                    </div>
                    <div className="mt-5 flex gap-2">
                      <div className="h-[3px] flex-1 rounded-full bg-[#3a6e9e]" />
                      <div className="h-[3px] flex-1 rounded-full bg-[#3a6e9e]" />
                      <div className="h-[3px] flex-1 rounded-full bg-[#ddd6c6]" />
                    </div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.08em] text-[#7d7667]">
                      Step 2 of 3 · Your Solution
                    </div>
                  </div>

                  <div className="space-y-0 bg-white">
                    {formState.fields.map((field) => (
                      <div key={field.id} className="border-b border-[#ece8db] px-8 py-5">
                        <div className="mb-2 text-[12px] font-semibold text-[#171717]">
                          {field.label}
                          {field.isRequired ? <span className="ml-1 text-[#a93636]">*</span> : null}
                        </div>
                        {renderSubmissionFieldPreview(field, false)}
                        {field.helpText ? (
                          <div className="mt-2 text-[11px] text-[#6b655a]">{field.helpText}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#111e30] shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
                  <div className="border-b border-white/7 bg-[linear-gradient(135deg,#3a6e9e18,#0c1525)] px-8 py-8">
                    <div className="text-[24px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
                      Submit Your Solution
                    </div>
                    <div className="mt-2 text-[13px] text-[#9baabf]">
                      {program.name} · Due before judging begins
                    </div>
                    <div className="mt-5 flex gap-2">
                      <div className="h-[3px] flex-1 rounded-full bg-[#3a6e9e]" />
                      <div className="h-[3px] flex-1 rounded-full bg-[#3a6e9e]" />
                      <div className="h-[3px] flex-1 rounded-full bg-white/10" />
                    </div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.08em] text-[#7c8798]">
                      Step 2 of 3 · Your Solution
                    </div>
                  </div>

                  <div className="bg-[#111e30]">
                    {formState.fields.map((field) => (
                      <Link
                        key={field.id}
                        href={buildManagerRoute(program.id, {
                          fieldId: field.id,
                          view: "builder",
                        })}
                        className={cn(
                          "relative block border-b border-white/7 px-8 py-5 transition hover:bg-white/[0.03]",
                          selectedField?.id === field.id &&
                            "border-l-2 border-l-[#3a6e9e] bg-[#3a6e9e12]",
                        )}
                      >
                        <div className="absolute left-3 top-4 text-[12px] text-[#5e7088]">
                          ⋮⋮
                        </div>
                        <div className="pl-4">
                          <div className="mb-2 text-[12px] font-semibold text-[#eae5dc]">
                            {field.label}
                            {field.isRequired ? <span className="ml-1 text-[#d15858]">*</span> : null}
                          </div>
                          {renderSubmissionFieldPreview(field, true)}
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="flex gap-3 px-8 py-5">
                    <Link
                      href={saveAndCloseHref}
                      className="flex-1 rounded-md border border-white/10 px-4 py-2 text-center text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                    >
                      Back
                    </Link>
                    <Link
                      href={linkedSession ? `/app/create/${linkedSession.id}/approvals` : saveAndCloseHref}
                      className="flex-[2] rounded-md bg-[#b08a28] px-4 py-2 text-center text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                    >
                      Continue to Review →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-[760px] rounded-2xl border border-dashed border-white/10 bg-[#111e30] p-8">
              <div className="text-[20px] font-semibold text-[#eae5dc]">
                No submission form draft exists yet
              </div>
              <div className="mt-3 max-w-[560px] text-[13px] leading-7 text-[#9baabf]">
                This program does not have a generated submission form yet. Continue in the AI workspace or assets review flow to generate the launch kit first, then come back here to review the final project package.
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={linkedSession ? `/app/create/${linkedSession.id}/assets` : "/app/create"}
                  className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                >
                  Review Assets
                </Link>
                <Link
                  href={linkedSession ? `/app/create?session=${linkedSession.id}` : "/app/create"}
                  className="rounded-md border border-white/10 px-4 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                >
                  Open AI Workspace
                </Link>
              </div>
            </div>
          )}
        </main>

        <aside className="overflow-y-auto border-l border-white/7 bg-[#111e30]">
          <div className="border-b border-white/7 px-4 py-4">
            <div className="text-[13px] font-semibold text-[#eae5dc]">Field Settings</div>
            <div className="mt-1 text-[11px] text-[#9baabf]">
              {selectedField ? `${selectedField.label} (selected)` : "No field selected"}
            </div>
          </div>

          {selectedField ? (
            <div className="space-y-4 p-4">
              <SettingsCard title="Field Identity">
                <SettingsRow label="Label" value={selectedField.label} />
                <SettingsRow label="Field key" value={selectedField.fieldKey} mono />
                <SettingsRow label="Type" value={selectedField.fieldType.replace(/_/g, " ")} />
                <SettingsRow label="Enabled" value={selectedField.isEnabled ? "Yes" : "No"} />
              </SettingsCard>

              <SettingsCard title="Field Rules">
                <SettingsRow label="Required" value={selectedField.isRequired ? "Required" : "Optional"} />
                <SettingsRow label="Placeholder" value={selectedField.placeholder ?? "—"} />
                <SettingsRow label="Help text" value={selectedField.helpText ?? "—"} />
              </SettingsCard>

              <SettingsCard title="Judging Visibility">
                <ToggleRow label="Visible to judges" checked={true} />
                <ToggleRow
                  label="Included in AI score"
                  checked={isAiScoreField(selectedField)}
                />
                <ToggleRow label="Show in public gallery" checked={false} />
              </SettingsCard>

              <SettingsCard title="Submission Stats">
                <SettingsRow label="Total fields" value={String(formState.fields.length)} />
                <SettingsRow
                  label="Required"
                  value={String(formState.fields.filter((field) => field.isRequired).length)}
                />
                <SettingsRow
                  label="AI-scored fields"
                  value={String(formState.fields.filter(isAiScoreField).length)}
                />
                <SettingsRow label="Est. time" value="Under 60 min target" />
              </SettingsCard>

              {linkedSession ? (
                <div className="rounded-md border border-[#3a6e9e33] bg-[#3a6e9e14] p-3">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#7fb5e7]">
                    Edit with Innova
                  </div>
                  <div className="mt-2 text-[11px] leading-6 text-[#9baabf]">
                    Refine this submission field in the AI workspace instead of editing hidden server state directly.
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={buildCreateHref(
                        linkedSession.id,
                        `Refine the submission form field "${selectedField.label}" for ${program.name}. Keep the submission package aligned with judging needs.`,
                      )}
                      className="flex-1 rounded-md border border-white/10 px-3 py-2 text-center text-[11px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                    >
                      Edit
                    </Link>
                    <Link
                      href={buildCreateHref(
                        linkedSession.id,
                        `Review the submission form field "${selectedField.label}" and suggest improvements for clarity, evaluator-readiness, and AI scoring alignment.`,
                      )}
                      className="flex-1 rounded-md border border-white/10 px-3 py-2 text-center text-[11px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                    >
                      Ask Innova
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="p-4 text-[12px] text-[#9baabf]">
              Select a field to inspect its validation, judging visibility, and submission packaging guidance.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function buildManagerRoute(
  programId: string,
  options?: { fieldId?: string | null; view?: "builder" | "preview" },
) {
  const params = new URLSearchParams();
  if (options?.fieldId) params.set("field", options.fieldId);
  if (options?.view && options.view !== "builder") params.set("view", options.view);
  const query = params.toString();
  return `/app/programs/${programId}/submission-form${query ? `?${query}` : ""}`;
}

function buildCreateHref(sessionId: string, prompt: string) {
  const params = new URLSearchParams({ session: sessionId, prompt });
  return `/app/create?${params.toString()}`;
}

function renderSubmissionFieldPreview(
  field: ProgramFormFieldSummary,
  builderMode: boolean,
) {
  const sharedClass = builderMode
    ? "border-white/10 bg-[#162034] text-[#5e7088]"
    : "border-[#ddd6c6] bg-[#faf8f2] text-[#7a7468]";

  if (field.fieldType === "long_text") {
    return (
      <div className={cn("min-h-[88px] rounded-md border px-3 py-2 text-[12px]", sharedClass)}>
        {field.placeholder ?? "Describe your submission"}
      </div>
    );
  }

  if (field.fieldType === "url" || field.fieldType === "video_link") {
    return (
      <div className={cn("rounded-md border border-dashed px-3 py-4 text-center text-[12px]", sharedClass)}>
        {field.placeholder ?? "Paste link"}
      </div>
    );
  }

  if (
    field.fieldType === "file_upload" ||
    field.fieldType === "image_upload" ||
    field.fieldType === "pitch_deck_upload"
  ) {
    return (
      <div className={cn("rounded-md border border-dashed px-3 py-4 text-center text-[12px]", sharedClass)}>
        Upload file or attach supporting material
      </div>
    );
  }

  if (field.fieldType === "single_choice") {
    return (
      <div className="space-y-2">
        {field.choices.map((choice) => (
          <div key={choice.id} className={cn("flex items-center gap-2 text-[12px]", builderMode ? "text-[#9baabf]" : "text-[#2d2d2d]")}>
            <span className={cn("h-4 w-4 rounded-full border", builderMode ? "border-white/20" : "border-[#bcb5a6]")} />
            {choice.label}
          </div>
        ))}
      </div>
    );
  }

  if (field.fieldType === "multiple_choice" || field.fieldType === "dropdown") {
    return (
      <div className={cn("rounded-md border px-3 py-2 text-[12px]", sharedClass)}>
        {field.placeholder ?? "Select one or more options"}
      </div>
    );
  }

  return (
    <div className={cn("rounded-md border px-3 py-2 text-[12px]", sharedClass)}>
      {field.placeholder ?? "Enter your response"}
    </div>
  );
}

function isAiScoreField(field: ProgramFormFieldSummary) {
  const key = field.fieldKey.toLowerCase();
  const label = field.label.toLowerCase();
  return (
    key.includes("score") ||
    key.includes("impact") ||
    key.includes("feasibility") ||
    label.includes("score") ||
    label.includes("impact") ||
    label.includes("feasibility")
  );
}

function WorkspaceLink({
  href,
  children,
  active = false,
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md px-3 py-2 text-[12px] transition",
        active
          ? "bg-[#3a6e9e12] text-[#eae5dc]"
          : "text-[#9baabf] hover:bg-white/[0.04] hover:text-[#eae5dc]",
      )}
    >
      {children}
    </Link>
  );
}

function DisabledWorkspaceLink({ children }: { children: ReactNode }) {
  return (
    <div className="cursor-not-allowed rounded-md px-3 py-2 text-[12px] text-[#5e7088]">
      {children}
    </div>
  );
}

function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#162034] p-4">
      <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#5e7088]">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SettingsRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.06em] text-[#5e7088]">{label}</div>
      <div className={cn("mt-1 text-[11.5px] text-[#eae5dc]", mono && "font-mono text-[11px]")}>
        {value}
      </div>
    </div>
  );
}

function ToggleRow({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-3 text-[11.5px] text-[#9baabf]">
      <span
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded-[4px] border",
          checked
            ? "border-[#b08a28] bg-[#b08a28] text-[#07101f]"
            : "border-white/20 bg-transparent text-transparent",
        )}
      >
        ✓
      </span>
      {label}
    </div>
  );
}

function buildSubmissionFieldLibrary(sessionId: string | null) {
  const makePrompt = (label: string, guidance: string) =>
    sessionId
      ? `Add a ${label.toLowerCase()} field to the submission form. ${guidance}`
      : "";

  return [
    {
      label: "Content",
      items: [
        {
          label: "Rich Text",
          badge: "RT",
          prompt: makePrompt("long text", "Optimize it for structured solution explanation and detailed project context."),
        },
        {
          label: "Short Text",
          badge: "ST",
          prompt: makePrompt("short text", "Use it for concise submission labels or titles."),
        },
        {
          label: "URL / Link",
          badge: "URL",
          prompt: makePrompt("url", "Use it for demo links, repositories, or external proof points."),
        },
      ],
    },
    {
      label: "Media",
      items: [
        {
          label: "Video URL",
          badge: "VID",
          prompt: makePrompt("video link", "Use it for a short demo video that judges can review easily."),
        },
        {
          label: "Image Upload",
          badge: "IMG",
          prompt: makePrompt("image upload", "Use it only if supporting visuals genuinely strengthen the submission."),
        },
        {
          label: "File Attach",
          badge: "FILE",
          prompt: makePrompt("pitch deck upload", "Add a deck or attachment field suitable for evaluator review."),
        },
      ],
    },
    {
      label: "Assessment",
      items: [
        {
          label: "AI Scorer",
          badge: "AI",
          prompt: makePrompt("assessment field", "Add an AI-scored assessment prompt aligned with the judging rubric."),
          highlighted: true,
        },
        {
          label: "Rating Scale",
          badge: "RATE",
          prompt: makePrompt("single choice", "Structure the options like a compact scoring or maturity scale."),
        },
      ],
    },
  ];
}
