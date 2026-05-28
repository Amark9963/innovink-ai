import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updateParticipantSubmissionAction } from "@/app/p/[slug]/submit/actions";
import {
  getCurrentUserOrNull,
  getParticipantSubmissionWorkspaceDataBySlug,
  type ProgramFormFieldSummary,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./submission-workspace.module.css";

type ParticipantSubmissionPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    error?: string;
    status?: string;
  }>;
};

export default async function ParticipantSubmissionPage({
  params,
  searchParams,
}: ParticipantSubmissionPageProps) {
  const { slug } = await params;
  const query = (await searchParams) ?? {};
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/p/${slug}/submit`)}`);
  }

  const workspace = await getParticipantSubmissionWorkspaceDataBySlug(supabase, user, slug);

  if (!workspace) {
    redirect(`/p/${slug}/register`);
  }

  if (!workspace.form) {
    redirect(`/p/${slug}/dashboard?error=submission-unavailable`);
  }

  const progress = buildProgress(workspace.fields, workspace.submission.answers);
  const sections = categorizeFields(workspace.fields);
  const statusItems = buildStatusItems(sections, workspace.submission.answers);
  const teamMembers = workspace.team?.members ?? [];
  const initials = getInitials(user.user_metadata.full_name ?? user.email ?? "Participant");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <div className={styles.headerBrandMark}>IN</div>
          <div className={styles.headerBrandDivider} />
          <div>
            <div className={styles.headerBrandName}>Innovink</div>
            <div className={styles.headerProgram}>{workspace.program.name}</div>
          </div>
        </div>

        <div className={styles.headerIdentity}>
          <Link href={`/p/${slug}/dashboard`} className={styles.headerLink}>
            Participant Dashboard
          </Link>
          <div className={styles.headerAvatar}>{initials}</div>
        </div>
      </header>

      <div className={styles.deadlineBanner}>
        <span className={styles.deadlineTitle}>Submission deadline</span>
        <span className={styles.deadlineValue}>
          {formatDateTime(workspace.program.submissionClosesAt) ?? "To be announced"}
        </span>
      </div>

      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarTitle}>
              {workspace.team?.name ?? workspace.submission.title}
            </div>
            <div className={styles.sidebarSubtitle}>
              {workspace.program.name} · {workspace.registration.status.replaceAll("_", " ")}
            </div>

            <div className={styles.progressMeta}>
              <span>Submission progress</span>
              <strong>{progress.percent}%</strong>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress.percent}%` }} />
            </div>

            <div className={styles.statusList}>
              <StatusRow label="Team registered" state="done" />
              {statusItems.map((item) => (
                <StatusRow key={item.label} label={item.label} state={item.state} />
              ))}
            </div>
          </div>

          {teamMembers.length > 0 ? (
            <div className={styles.sidebarCard}>
              <div className={styles.sidebarSectionTitle}>Your Team</div>
              <div className={styles.teamList}>
                {teamMembers.map((member) => (
                  <div key={member.userId} className={styles.teamMember}>
                    <div className={styles.teamAvatar}>
                      {getInitials(member.fullName ?? member.email ?? "U")}
                    </div>
                    <div>
                      <div className={styles.teamName}>
                        {member.fullName ?? member.email ?? "Participant"}
                      </div>
                      <div className={styles.teamRole}>
                        {member.isLead ? "Lead" : "Member"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className={`${styles.sidebarCard} ${styles.supportCard}`}>
            <div className={styles.sidebarSectionTitle}>Submission Support</div>
            <div className={styles.supportBody}>
              Need help before you submit? Reach the organizer team for clarification on deck
              formats, demo evidence, or judging expectations.
            </div>
            <a
              href={`mailto:support@innovink.ai?subject=${encodeURIComponent(
                `${workspace.program.name} submission support`,
              )}`}
              className={styles.supportButton}
            >
              Email Organizer
            </a>
          </div>
        </aside>

        <section className={styles.main}>
          <div className={styles.mainHeader}>
            <div>
              <div className={styles.mainTitle}>Your Submission</div>
              <div className={styles.mainSubtitle}>
                {workspace.program.name} · {workspace.form.name}
              </div>
            </div>

            <div className={styles.headerActions}>
              <div className={styles.autosaveRow}>
                <span className={styles.autosaveDot} />
                <span>Last saved {formatRelative(workspace.submission.updatedAt)}</span>
              </div>
              <button
                type="submit"
                form="participant-submission-form"
                name="intent"
                value="submit"
                className={styles.topSubmitButton}
              >
                {workspace.submission.status === "submitted" ? "Resubmit Package" : "Submit"}
              </button>
            </div>
          </div>

          {query.status ? (
            <div className={styles.successBanner}>{formatStatusMessage(query.status)}</div>
          ) : null}
          {query.error ? (
            <div className={styles.errorBanner}>{formatStatusMessage(query.error)}</div>
          ) : null}

          <div className={styles.tipCard}>
            <div className={styles.tipMark}>IN</div>
            <div className={styles.tipBody}>
              <strong>Innova tip:</strong> Submissions score higher when the problem statement and
              business impact are specific, measurable, and easy for judges to validate quickly.
            </div>
          </div>

          <form
            id="participant-submission-form"
            action={updateParticipantSubmissionAction}
            className={styles.form}
          >
            <input type="hidden" name="slug" value={slug} />

            {sections.overview.length > 0 ? (
              <FieldCard title="Solution Overview" status={getSectionStatus(sections.overview, workspace.submission.answers)}>
                {sections.overview.map((field) => (
                  <FieldBlock
                    key={field.id}
                    field={field}
                    defaultValue={getFieldDefaultValue(field, workspace.submission)}
                  />
                ))}
              </FieldCard>
            ) : null}

            {sections.solution.length > 0 ? (
              <FieldCard title="Proposed Solution" status={getSectionStatus(sections.solution, workspace.submission.answers)}>
                {sections.solution.map((field) => (
                  <FieldBlock
                    key={field.id}
                    field={field}
                    defaultValue={getFieldDefaultValue(field, workspace.submission)}
                  />
                ))}
              </FieldCard>
            ) : null}

            {sections.supporting.length > 0 ? (
              <FieldCard
                title="Supporting Materials"
                status={getSectionStatus(sections.supporting, workspace.submission.answers)}
              >
                {sections.supporting.map((field) => (
                  <FieldBlock
                    key={field.id}
                    field={field}
                    defaultValue={getFieldDefaultValue(field, workspace.submission)}
                    supporting
                  />
                ))}
              </FieldCard>
            ) : null}

            {sections.additional.length > 0 ? (
              <FieldCard
                title="Additional Details"
                status={getSectionStatus(sections.additional, workspace.submission.answers)}
              >
                {sections.additional.map((field) => (
                  <FieldBlock
                    key={field.id}
                    field={field}
                    defaultValue={getFieldDefaultValue(field, workspace.submission)}
                  />
                ))}
              </FieldCard>
            ) : null}

            <div className={styles.footerActions}>
              <Link href={`/p/${slug}/dashboard`} className={styles.secondaryButton}>
                Save &amp; Close
              </Link>
              <button type="submit" name="intent" value="save" className={styles.secondaryButton}>
                Save Draft
              </button>
              <button type="submit" name="intent" value="submit" className={styles.primaryButton}>
                {workspace.submission.status === "submitted"
                  ? "Resubmit Submission"
                  : "Submit Final Package"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function FieldCard({
  title,
  status,
  children,
}: {
  title: string;
  status: "complete" | "progress" | "todo";
  children: ReactNode;
}) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>{title}</div>
        <div
          className={`${styles.statusPill} ${
            status === "complete"
              ? styles.statusPillComplete
              : status === "progress"
                ? styles.statusPillProgress
                : ""
          }`}
        >
          {status === "complete"
            ? "Complete"
            : status === "progress"
              ? "In progress"
              : "Not started"}
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldBlock({
  field,
  defaultValue,
  supporting,
}: {
  field: ProgramFormFieldSummary;
  defaultValue: unknown;
  supporting?: boolean;
}) {
  if (field.fieldType === "section_header") {
    return <div className={styles.inlineSectionHeader}>{field.label}</div>;
  }

  if (field.fieldType === "page_break") {
    return null;
  }

  const inputName = `field:${field.fieldKey}`;

  if (field.fieldType === "single_choice" || field.fieldType === "dropdown") {
    return (
      <div className={styles.fieldBlock}>
        <FieldLabel field={field} />
        <select
          name={inputName}
          required={field.isRequired}
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
          className={styles.select}
        >
          <option value="">Select</option>
          {field.choices.map((choice) => (
            <option key={choice.id} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
        {field.helpText ? <div className={styles.helpText}>{field.helpText}</div> : null}
      </div>
    );
  }

  if (field.fieldType === "multiple_choice") {
    const selectedValues = Array.isArray(defaultValue)
      ? defaultValue.filter((value): value is string => typeof value === "string")
      : [];

    return (
      <div className={styles.fieldBlock}>
        <FieldLabel field={field} />
        <div className={styles.checkboxList}>
          {field.choices.map((choice) => (
            <label key={choice.id} className={styles.checkboxRow}>
              <input
                type="checkbox"
                name={inputName}
                value={choice.value}
                defaultChecked={selectedValues.includes(choice.value)}
              />
              <span>{choice.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.fieldType === "long_text") {
    return (
      <div className={styles.fieldBlock}>
        <FieldLabel field={field} />
        <textarea
          name={inputName}
          required={field.isRequired}
          placeholder={field.placeholder ?? "Add your response"}
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
          className={styles.textarea}
        />
        {field.helpText ? <div className={styles.helpText}>{field.helpText}</div> : null}
      </div>
    );
  }

  if (
    field.fieldType === "file_upload" ||
    field.fieldType === "image_upload" ||
    field.fieldType === "pitch_deck_upload"
  ) {
    return (
      <div className={styles.fieldBlock}>
        <FieldLabel field={field} />
        <div className={styles.uploadZone}>
          <div className={styles.uploadEmoji}>
            {field.fieldType === "image_upload"
              ? "🖼"
              : field.fieldType === "pitch_deck_upload"
                ? "📊"
                : "📎"}
          </div>
          <div className={styles.uploadTitle}>Add a shareable link</div>
          <div className={styles.uploadBody}>
            Use a public or reviewer-accessible link for your file so judges can open it without
            delays.
          </div>
          <input
            type="url"
            name={inputName}
            required={field.isRequired}
            placeholder={field.placeholder ?? "https://drive.google.com/..."}
            defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
            className={styles.input}
          />
        </div>
      </div>
    );
  }

  if (field.fieldType === "consent_checkbox") {
    return (
      <div className={styles.fieldBlock}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            name={inputName}
            value="true"
            required={field.isRequired}
            defaultChecked={defaultValue === true}
          />
          <span>{field.label}</span>
        </label>
        {field.helpText ? <div className={styles.helpText}>{field.helpText}</div> : null}
      </div>
    );
  }

  const inputType =
    field.fieldType === "email"
      ? "email"
      : field.fieldType === "phone"
        ? "tel"
        : field.fieldType === "url" || field.fieldType === "video_link"
          ? "url"
          : field.fieldType === "number"
            ? "number"
            : field.fieldType === "date"
              ? "date"
              : "text";

  return (
    <div className={styles.fieldBlock}>
      <FieldLabel field={field} />
      <input
        type={inputType}
        name={inputName}
        required={field.isRequired}
        placeholder={
          field.placeholder ??
          (supporting && inputType === "url" ? "https://..." : "Enter your response")
        }
        defaultValue={typeof defaultValue === "string" || typeof defaultValue === "number" ? String(defaultValue) : ""}
        className={styles.input}
      />
      {field.helpText ? <div className={styles.helpText}>{field.helpText}</div> : null}
    </div>
  );
}

function FieldLabel({ field }: { field: ProgramFormFieldSummary }) {
  return (
    <label className={styles.label}>
      {field.label}
      {field.isRequired ? <span className={styles.required}>*</span> : null}
    </label>
  );
}

function StatusRow({
  label,
  state,
}: {
  label: string;
  state: "done" | "progress" | "todo";
}) {
  return (
    <div className={styles.statusRow}>
      <div
        className={`${styles.statusIcon} ${
          state === "done"
            ? styles.statusIconDone
            : state === "progress"
              ? styles.statusIconProgress
              : styles.statusIconTodo
        }`}
      >
        {state === "done" ? "✓" : state === "progress" ? "•" : ""}
      </div>
      <span
        className={`${styles.statusLabel} ${
          state === "done"
            ? styles.statusLabelDone
            : state === "progress"
              ? styles.statusLabelProgress
              : styles.statusLabelTodo
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function categorizeFields(fields: ProgramFormFieldSummary[]) {
  const overview: ProgramFormFieldSummary[] = [];
  const solution: ProgramFormFieldSummary[] = [];
  const supporting: ProgramFormFieldSummary[] = [];
  const additional: ProgramFormFieldSummary[] = [];

  for (const field of fields) {
    const descriptor = `${field.fieldKey} ${field.label}`.toLowerCase();

    if (/title|problem statement|problem/.test(descriptor)) {
      overview.push(field);
      continue;
    }

    if (/solution|summary|approach|description/.test(descriptor)) {
      solution.push(field);
      continue;
    }

    if (
      field.fieldType === "file_upload" ||
      field.fieldType === "image_upload" ||
      field.fieldType === "pitch_deck_upload" ||
      field.fieldType === "video_link" ||
      /demo|video|deck|repo|github|prototype|attachment|file|url/.test(descriptor)
    ) {
      supporting.push(field);
      continue;
    }

    additional.push(field);
  }

  return { overview, solution, supporting, additional };
}

function buildProgress(
  fields: ProgramFormFieldSummary[],
  answers: Record<string, unknown>,
) {
  const requiredFields = fields.filter(
    (field) => field.isRequired && field.fieldType !== "page_break" && field.fieldType !== "section_header",
  );

  if (requiredFields.length === 0) {
    return { answered: 0, total: 0, percent: 0 };
  }

  const answered = requiredFields.filter((field) =>
    hasFieldValue(field.fieldType, answers[field.fieldKey]),
  ).length;

  return {
    answered,
    total: requiredFields.length,
    percent: Math.round((answered / requiredFields.length) * 100),
  };
}

function buildStatusItems(
  sections: ReturnType<typeof categorizeFields>,
  answers: Record<string, unknown>,
) {
  const items: Array<{ label: string; state: "done" | "progress" | "todo" }> = [];

  if (sections.overview.length > 0) {
    items.push({
      label: "Problem statement",
      state: mapChecklistState(getSectionStatus(sections.overview, answers)),
    });
  }

  if (sections.solution.length > 0) {
    items.push({
      label: "Solution package",
      state: mapChecklistState(getSectionStatus(sections.solution, answers)),
    });
  }

  if (sections.supporting.length > 0) {
    items.push({
      label: "Supporting materials",
      state: mapChecklistState(getSectionStatus(sections.supporting, answers)),
    });
  }

  if (sections.additional.length > 0) {
    items.push({
      label: "Additional details",
      state: mapChecklistState(getSectionStatus(sections.additional, answers)),
    });
  }

  return items;
}

function getSectionStatus(
  fields: ProgramFormFieldSummary[],
  answers: Record<string, unknown>,
) {
  const activeFields = fields.filter(
    (field) => field.fieldType !== "page_break" && field.fieldType !== "section_header",
  );

  if (activeFields.length === 0) {
    return "todo" as const;
  }

  const answered = activeFields.filter((field) =>
    hasFieldValue(field.fieldType, answers[field.fieldKey]),
  ).length;

  if (answered === 0) {
    return "todo" as const;
  }

  if (answered === activeFields.length) {
    return "complete" as const;
  }

  return "progress" as const;
}

function getFieldDefaultValue(
  field: ProgramFormFieldSummary,
  submission: {
    title: string;
    problemStatement: string | null;
    solutionDescription: string | null;
    demoUrl: string | null;
    githubUrl: string | null;
    aiUsageDisclosure: string | null;
    answers: Record<string, unknown>;
  },
) {
  const direct = submission.answers[field.fieldKey];
  if (direct !== undefined) {
    return direct;
  }

  const descriptor = `${field.fieldKey} ${field.label}`.toLowerCase();

  if (/solution_title|project_title|submission_title|\btitle\b/.test(descriptor)) {
    return submission.title;
  }

  if (/problem_statement|problem/.test(descriptor)) {
    return submission.problemStatement ?? "";
  }

  if (/solution_description|solution_summary|proposed_solution|describe_solution|solution/.test(descriptor)) {
    return submission.solutionDescription ?? "";
  }

  if (/demo_url|demo_video|video_link|video_url|demo/.test(descriptor)) {
    return submission.demoUrl ?? "";
  }

  if (/github_url|repository_url|repo_url|github|repo/.test(descriptor)) {
    return submission.githubUrl ?? "";
  }

  if (/ai_usage_disclosure|ai_tools_used|ai_disclosure/.test(descriptor)) {
    return submission.aiUsageDisclosure ?? "";
  }

  return "";
}

function hasFieldValue(fieldType: string, value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (fieldType === "consent_checkbox") {
    return value === true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "boolean") {
    return value;
  }

  return Boolean(value);
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRelative(value: string) {
  const date = new Date(value);
  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  return `${Math.round(diffHours / 24)} day${diffHours >= 48 ? "s" : ""} ago`;
}

function formatStatusMessage(value: string) {
  if (value === "saved") {
    return "Draft saved. Your submission workspace is up to date.";
  }

  if (value === "submitted") {
    return "Submission received. Your package is now locked for reviewer processing.";
  }

  if (value === "incomplete") {
    return "Complete every required field before final submission.";
  }

  return value.replace(/-/g, " ");
}

function mapChecklistState(value: "complete" | "progress" | "todo") {
  return value === "complete" ? "done" : value;
}
