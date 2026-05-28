import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prepareApprovalRequestAction } from "@/app/app/create/actions";
import { publishProgramRegistrationFormAction } from "@/app/app/programs/[programId]/registration-form/actions";
import type { ProgramFormFieldSummary } from "@/lib/supabase/queries";
import {
  getCurrentUserOrNull,
  getLatestAgentSessionForProgram,
  getProgramById,
  getProgramFormManagerData,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

type RegistrationFormRouteProps = {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{
    error?: string;
    field?: string;
    status?: string;
    view?: string;
  }>;
};

export default async function ProgramRegistrationFormManager({
  params,
  searchParams,
}: RegistrationFormRouteProps) {
  const { programId } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const [program, formState, linkedSession] = await Promise.all([
    getProgramById(supabase, programId),
    getProgramFormManagerData(supabase, programId, "registration"),
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
  const libraryItems = buildFieldLibraryItems(linkedSession?.id ?? null);
  const headerStatus = `${formState.fields.length} fields · ${
    formState.form?.status === "active" ? "Published" : "Auto-saved"
  }`;

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
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#b08a28]">
              Registration Form Builder
            </div>
          </div>
          <div className="h-5 w-px bg-white/7" />
          <div className="text-[12px] text-[#9baabf]">{program.name}</div>
          <div className="text-[11px] text-[#5e7088]">/ Registration Form</div>
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
            {previewMode ? "Builder View" : "Preview Form"}
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

          {formState.form ? (
            <form action={publishProgramRegistrationFormAction}>
              <input type="hidden" name="programId" value={program.id} />
              <input type="hidden" name="formId" value={formState.form.id} />
              <button
                type="submit"
                className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
              >
                Publish Form
              </button>
            </form>
          ) : (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-md bg-[#6c5a22] px-4 py-2 text-[12px] font-semibold text-[#07101f]"
            >
              Publish Form
            </button>
          )}
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
            <WorkspaceLink href={linkedSession ? `/app/create/${linkedSession.id}/brief` : "/app/create"}>
              Program Brief
            </WorkspaceLink>
            <WorkspaceLink href={`/app/programs/${program.id}/landing-page`}>
              Landing Page
            </WorkspaceLink>
            <WorkspaceLink href={`/app/programs/${program.id}/registration-form`} active>
              Reg Form
            </WorkspaceLink>
            <DisabledWorkspaceLink>Sub Form</DisabledWorkspaceLink>
            <DisabledWorkspaceLink>Judging</DisabledWorkspaceLink>
          </div>

          <div className="mt-6 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#5e7088]">
            Add Field
          </div>

          <div className="mt-3 space-y-5">
            {libraryItems.map((group) => (
              <div key={group.label}>
                <div className="mb-2 text-[10px] text-[#5e7088]">{group.label}</div>
                <div className="space-y-2">
                  {group.items.map((item) =>
                    linkedSession ? (
                      <Link
                        key={item.label}
                        href={buildCreateHref(linkedSession.id, item.prompt)}
                        className="flex items-center gap-3 rounded-md border border-white/10 bg-[#111e30] px-3 py-2 text-[11.5px] text-[#9baabf] transition hover:border-white/20 hover:bg-white/[0.03] hover:text-[#eae5dc]"
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

          <div className="mt-5 rounded-md border border-[#b08a2838] bg-[#b08a2810] p-3">
            <div className="text-[10.5px] font-medium text-[#ccaa4a]">Innova recommends</div>
            <div className="mt-1 text-[10.5px] leading-5 text-[#9baabf]">
              Add an innovation-experience question before final approval. Programs like this often use it to route mentoring and judging expectations.
            </div>
            {linkedSession ? (
              <Link
                href={buildCreateHref(
                  linkedSession.id,
                  "Add an innovation-experience field to the registration form and keep the rest of the structure unchanged.",
                )}
                className="mt-3 inline-flex rounded-md border border-white/10 px-3 py-1.5 text-[10.5px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
              >
                Add Field
              </Link>
            ) : null}
          </div>
        </aside>

        <main className="overflow-y-auto bg-[#050c17] px-6 py-6">
          {formState.form ? (
            <div className="mx-auto max-w-[720px]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
                    {formState.form.name}
                  </div>
                  <div className="mt-1 text-[12px] text-[#9baabf]">
                    {formState.form.description ?? "Registration intake for this program."}
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-[#111e30] px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-[#9baabf]">
                  {formState.form.status}
                </div>
              </div>

              {previewMode ? (
                <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#f7f4eb] shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
                  <div className="border-b border-[#ded8c8] bg-[linear-gradient(135deg,#e7d2a0,#f7f4eb)] px-8 py-8">
                    <div className="text-[24px] font-semibold tracking-[-0.02em] text-[#151515]">
                      Join the Sprint
                    </div>
                    <div className="mt-2 text-[13px] text-[#5f5a4e]">
                      Register your team for {program.name}.
                    </div>
                    <div className="mt-5 flex gap-2">
                      <div className="h-[3px] flex-1 rounded-full bg-[#b08a28]" />
                      <div className="h-[3px] flex-1 rounded-full bg-[#ddd6c6]" />
                      <div className="h-[3px] flex-1 rounded-full bg-[#ddd6c6]" />
                    </div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.08em] text-[#7d7667]">
                      Step 1 of 3 · Team Info
                    </div>
                  </div>

                  <div className="space-y-0 bg-white">
                    {formState.fields.map((field) => (
                      <div key={field.id} className="border-b border-[#ece8db] px-8 py-5">
                        <div className="mb-2 text-[12px] font-semibold text-[#171717]">
                          {field.label}
                          {field.isRequired ? <span className="ml-1 text-[#a93636]">*</span> : null}
                        </div>
                        {renderFieldPreview(field)}
                        {field.helpText ? (
                          <div className="mt-2 text-[11px] text-[#6b655a]">{field.helpText}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#111e30] shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
                  <div className="border-b border-white/7 bg-[linear-gradient(135deg,#b08a2815,#0c1525)] px-8 py-8">
                    <div className="text-[24px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
                      Join the Sprint
                    </div>
                    <div className="mt-2 text-[13px] text-[#9baabf]">
                      Register your team for {program.name}
                    </div>
                    <div className="mt-5 flex gap-2">
                      <div className="h-[3px] flex-1 rounded-full bg-[#b08a28]" />
                      <div className="h-[3px] flex-1 rounded-full bg-white/10" />
                      <div className="h-[3px] flex-1 rounded-full bg-white/10" />
                    </div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.08em] text-[#7c8798]">
                      Step 1 of 3 · Team Info
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
                            "border-l-2 border-l-[#b08a28] bg-[#b08a2810]",
                        )}
                      >
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#5e7088]">
                          ⋮⋮
                        </div>
                        <div className="pl-4">
                          <div className="mb-2 text-[12px] font-semibold text-[#eae5dc]">
                            {field.label}
                            {field.isRequired ? <span className="ml-1 text-[#d15858]">*</span> : null}
                          </div>
                          {renderFieldBuilderPreview(field)}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-[720px] rounded-2xl border border-dashed border-white/10 bg-[#111e30] p-8">
              <div className="text-[20px] font-semibold text-[#eae5dc]">
                No registration form draft exists yet
              </div>
              <div className="mt-3 max-w-[560px] text-[13px] leading-7 text-[#9baabf]">
                This program does not have a generated registration form yet. Continue in the AI workspace or assets review flow to generate the launch kit first, then come back here to review and publish the form.
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
              {formState.activeVersionNumber
                ? `Draft v${formState.activeVersionNumber}`
                : "No active form version"}
            </div>
          </div>

          {selectedField ? (
            <div className="space-y-4 p-4">
              <SettingsCard title="Field Identity">
                <SettingsRow label="Label" value={selectedField.label} />
                <SettingsRow label="Field key" value={selectedField.fieldKey} mono />
                <SettingsRow
                  label="Type"
                  value={selectedField.fieldType.replace(/_/g, " ")}
                />
                <SettingsRow
                  label="Enabled"
                  value={selectedField.isEnabled ? "Yes" : "No"}
                />
              </SettingsCard>

              <SettingsCard title="Validation">
                <SettingsRow
                  label="Required"
                  value={selectedField.isRequired ? "Required" : "Optional"}
                />
                <SettingsRow
                  label="Placeholder"
                  value={selectedField.placeholder ?? "—"}
                />
                <SettingsRow label="Help text" value={selectedField.helpText ?? "—"} />
                <SettingsRow
                  label="Rules"
                  value={formatJsonInline(selectedField.validationRules)}
                />
              </SettingsCard>

              {selectedField.choices.length > 0 ? (
                <SettingsCard title="Choices">
                  <div className="space-y-2">
                    {selectedField.choices.map((choice) => (
                      <div
                        key={choice.id}
                        className="rounded-md border border-white/10 bg-[#162034] px-3 py-2"
                      >
                        <div className="text-[11.5px] font-medium text-[#eae5dc]">
                          {choice.label}
                        </div>
                        <div className="mt-1 text-[10.5px] text-[#5e7088]">
                          value: {choice.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </SettingsCard>
              ) : null}

              {linkedSession ? (
                <div className="rounded-md border border-[#b08a2838] bg-[#b08a2810] p-3">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#ccaa4a]">
                    Edit with Innova
                  </div>
                  <div className="mt-2 text-[11px] leading-6 text-[#9baabf]">
                    Use the AI workspace to refine the selected field instead of editing hidden server state directly.
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={buildCreateHref(
                        linkedSession.id,
                        `Refine the registration form field "${selectedField.label}" for ${program.name}. Keep the rest of the form unchanged.`,
                      )}
                      className="flex-1 rounded-md border border-white/10 px-3 py-2 text-center text-[11px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                    >
                      Edit
                    </Link>
                    <Link
                      href={buildCreateHref(
                        linkedSession.id,
                        `Review the registration form field "${selectedField.label}" and suggest improvements for clarity, validation, and enterprise readiness.`,
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
              Select a field to inspect its validation, metadata, and review guidance.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function buildManagerRoute(
  programId: string,
  options?: {
    fieldId?: string | null;
    view?: "builder" | "preview";
  },
) {
  const params = new URLSearchParams();

  if (options?.fieldId) {
    params.set("field", options.fieldId);
  }

  if (options?.view && options.view !== "builder") {
    params.set("view", options.view);
  }

  const query = params.toString();
  return `/app/programs/${programId}/registration-form${query ? `?${query}` : ""}`;
}

function buildCreateHref(sessionId: string, prompt: string) {
  const params = new URLSearchParams({
    session: sessionId,
    prompt,
  });
  return `/app/create?${params.toString()}`;
}

function renderFieldPreview(field: ProgramFormFieldSummary) {
  if (field.fieldType === "single_choice") {
    return (
      <div className="space-y-2">
        {field.choices.map((choice) => (
          <label key={choice.id} className="flex items-center gap-2 text-[12px] text-[#2d2d2d]">
            <span className="h-4 w-4 rounded-full border border-[#bcb5a6]" />
            {choice.label}
          </label>
        ))}
      </div>
    );
  }

  if (field.fieldType === "multiple_choice") {
    return (
      <div className="space-y-2">
        {field.choices.map((choice) => (
          <label key={choice.id} className="flex items-center gap-2 text-[12px] text-[#2d2d2d]">
            <span className="h-4 w-4 rounded-[4px] border border-[#bcb5a6]" />
            {choice.label}
          </label>
        ))}
      </div>
    );
  }

  if (field.fieldType === "dropdown") {
    return (
      <div className="rounded-md border border-[#ddd6c6] bg-[#faf8f2] px-3 py-2 text-[12px] text-[#7a7468]">
        {field.placeholder ?? "Select an option"}
      </div>
    );
  }

  if (field.fieldType === "long_text") {
    return (
      <div className="min-h-[72px] rounded-md border border-[#ddd6c6] bg-[#faf8f2] px-3 py-2 text-[12px] text-[#7a7468]">
        {field.placeholder ?? "Enter your response"}
      </div>
    );
  }

  if (field.fieldType === "file_upload" || field.fieldType === "pitch_deck_upload") {
    return (
      <div className="rounded-md border border-dashed border-[#c6b88e] bg-[#faf7ee] px-3 py-4 text-center text-[12px] text-[#7a7468]">
        Upload file
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#ddd6c6] bg-[#faf8f2] px-3 py-2 text-[12px] text-[#7a7468]">
      {field.placeholder ?? "Enter your response"}
    </div>
  );
}

function renderFieldBuilderPreview(field: ProgramFormFieldSummary) {
  if (field.fieldType === "single_choice") {
    return (
      <div className="space-y-2">
        {field.choices.map((choice) => (
          <div key={choice.id} className="flex items-center gap-2 text-[12px] text-[#9baabf]">
            <span className="h-4 w-4 rounded-full border border-white/20" />
            {choice.label}
          </div>
        ))}
      </div>
    );
  }

  if (field.fieldType === "multiple_choice") {
    return (
      <div className="space-y-2">
        {field.choices.map((choice) => (
          <div key={choice.id} className="flex items-center gap-2 text-[12px] text-[#9baabf]">
            <span className="h-4 w-4 rounded-[4px] border border-white/20" />
            {choice.label}
          </div>
        ))}
      </div>
    );
  }

  if (field.fieldType === "dropdown") {
    return (
      <div className="rounded-md border border-white/10 bg-[#162034] px-3 py-2 text-[12px] text-[#5e7088]">
        {field.placeholder ?? "Select an option"}
      </div>
    );
  }

  if (field.fieldType === "long_text") {
    return (
      <div className="min-h-[64px] rounded-md border border-white/10 bg-[#162034] px-3 py-2 text-[12px] text-[#5e7088]">
        {field.placeholder ?? "Enter your response"}
      </div>
    );
  }

  if (field.fieldType === "file_upload" || field.fieldType === "pitch_deck_upload") {
    return (
      <div className="rounded-md border border-dashed border-[#b08a2838] bg-[#162034] px-3 py-4 text-center text-[12px] text-[#5e7088]">
        Upload file
      </div>
    );
  }

  return (
    <div className="rounded-md border border-white/10 bg-[#162034] px-3 py-2 text-[12px] text-[#5e7088]">
      {field.placeholder ?? "Enter your response"}
    </div>
  );
}

function formatJsonInline(value: unknown) {
  if (!value || typeof value !== "object") {
    return "—";
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== null && entryValue !== "" && entryValue !== false)
    .map(([key, entryValue]) => `${key}: ${String(entryValue)}`);

  return entries.length > 0 ? entries.join(" · ") : "—";
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
          ? "bg-[#b08a2810] text-[#eae5dc]"
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

function buildFieldLibraryItems(sessionId: string | null) {
  const makePrompt = (label: string, guidance: string) =>
    sessionId
      ? `Add a ${label.toLowerCase()} field to the registration form. ${guidance}`
      : "";

  return [
    {
      label: "Basic",
      items: [
        { label: "Short Text", badge: "ST", prompt: makePrompt("Short Text", "Use it where a concise text answer is appropriate.") },
        { label: "Long Text", badge: "LT", prompt: makePrompt("Long Text", "Use it for a longer descriptive answer from applicants.") },
        { label: "Email", badge: "EM", prompt: makePrompt("Email", "Validate it as a work email where appropriate.") },
        { label: "Number", badge: "NO", prompt: makePrompt("Number", "Add numeric validation and a sensible placeholder.") },
      ],
    },
    {
      label: "Selection",
      items: [
        { label: "Single Choice", badge: "SC", prompt: makePrompt("Single Choice", "Provide enterprise-appropriate options for the current program.") },
        { label: "Multi-Select", badge: "MS", prompt: makePrompt("Multi-Select", "Use it where applicants may pick more than one relevant option.") },
        { label: "Dropdown", badge: "DD", prompt: makePrompt("Dropdown", "Keep the option list concise and easy to scan.") },
      ],
    },
    {
      label: "Advanced",
      items: [
        { label: "File Upload", badge: "FU", prompt: makePrompt("File Upload", "Only add it if the registration stage genuinely needs supporting material.") },
        { label: "Team Member", badge: "TM", prompt: makePrompt("Team Member", "Support multi-member team registration cleanly.") },
        { label: "AI Screener", badge: "AI", prompt: makePrompt("AI Screener", "Suggest an AI-assist intake field that remains transparent and governed.") },
      ],
    },
  ];
}
