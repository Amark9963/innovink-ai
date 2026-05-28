import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SponsorReportExportButton } from "@/app/app/programs/[programId]/sponsor-report/export-button";
import {
  scheduleSponsorReportAction,
  sendSponsorReportNowAction,
} from "@/app/app/programs/[programId]/sponsor-report/actions";
import type {
  ProgramSponsorReportManagerData,
  SponsorSummary,
} from "@/lib/supabase/queries";
import {
  getCurrentUserOrNull,
  getLatestAgentSessionForProgram,
  getProgramById,
  getProgramSponsorReportManagerData,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

type SponsorReportRouteProps = {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{
    error?: string;
    sponsor?: string;
    status?: string;
  }>;
};

export default async function ProgramSponsorReportManager({
  params,
  searchParams,
}: SponsorReportRouteProps) {
  const { programId } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const [program, reportState, linkedSession] = await Promise.all([
    getProgramById(supabase, programId),
    getProgramSponsorReportManagerData(supabase, programId, resolvedSearchParams.sponsor),
    getLatestAgentSessionForProgram(supabase, user.id, programId),
  ]);

  if (!program) {
    notFound();
  }

  const sponsor = reportState.selectedSponsor;
  const generatedReport = reportState.generatedReport;
  const sponsorReport = reportState.sponsorReport;
  const reportContent = asRecord(generatedReport?.content);
  const sponsorPayload = asRecord(sponsorReport?.reportPayload);
  const sections = readStringArray(reportContent.sections) ?? readStringArray(sponsorPayload.sections) ?? [];
  const notes = readStringArray(reportContent.notes) ?? [];
  const canSend = Boolean(sponsor && generatedReport);

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
              Sponsor Report
            </div>
          </div>
          <div className="h-5 w-px bg-white/7" />
          <div className="text-[12px] text-[#9baabf]">{program.name}</div>
          <div className="text-[11px] text-[#5e7088]">/ Sponsor Report</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-white/10 bg-[#111e30] p-1">
            {reportState.sponsors.length > 0 ? (
              reportState.sponsors.slice(0, 3).map((item) => (
                <Link
                  key={item.id}
                  href={buildManagerRoute(program.id, item.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[11px] transition",
                    sponsor?.id === item.id
                      ? "border border-white/10 bg-[#162034] text-[#eae5dc]"
                      : "text-[#5e7088] hover:text-[#eae5dc]",
                  )}
                >
                  {item.name}
                </Link>
              ))
            ) : (
              <span className="px-3 py-1.5 text-[11px] text-[#5e7088]">No sponsors</span>
            )}
          </div>

          {canSend ? (
            <form action={scheduleSponsorReportAction}>
              <input type="hidden" name="programId" value={program.id} />
              <input type="hidden" name="sponsorId" value={sponsor!.id} />
              <input type="hidden" name="generatedReportId" value={generatedReport!.id} />
              <button
                type="submit"
                className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
              >
                Schedule Send
              </button>
            </form>
          ) : (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-md border border-white/8 px-3 py-2 text-[12px] font-medium text-[#5e7088]"
            >
              Schedule Send
            </button>
          )}

          <SponsorReportExportButton disabled={!generatedReport} />

          <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-[#b08a2838] bg-[#b08a2812] text-[11px] font-semibold text-[#ccaa4a]">
            PS
          </div>
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

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] overflow-hidden">
        <div className="overflow-y-auto bg-[#efe9df] px-8 py-8">
          <div className="mx-auto mb-4 flex max-w-[680px] items-center gap-3">
            <div className="h-px flex-1 bg-[#d6d1c6]" />
            <div className="rounded-full border border-[#d6d1c6] bg-white px-3 py-1 text-[10px] text-[#666]">
              Sponsor View · {sponsor?.name ?? "No sponsor selected"}
            </div>
            <div className="h-px flex-1 bg-[#d6d1c6]" />
          </div>

          {generatedReport && sponsor ? (
            <div className="mx-auto max-w-[680px] overflow-hidden rounded bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
              <div className="bg-[linear-gradient(135deg,#07101F,#0C1525)] px-10 py-10">
                <div className="mb-5 flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ccaa4a]">
                    ACME CORPORATION
                  </div>
                  <div className="text-[10px] text-[#5E7088]">
                    Prepared for {sponsor.name} · {formatShortDate(generatedReport.updatedAt)}
                  </div>
                </div>

                <div className="text-[26px] font-bold text-[#EAE5DC]">
                  {generatedReport.title}
                </div>
                <div className="mt-2 text-[13px] text-[#9BAABF]">
                  {generatedReport.summary ??
                    "Sponsor-safe program reporting scaffold prepared for governed external updates."}
                </div>

                <div className="mt-5 flex gap-6 border-t border-white/8 pt-5">
                  {buildHeaderMetrics(sponsor, reportState).map((metric) => (
                    <div key={metric.label}>
                      <div className="text-[20px] font-bold text-[#CCAA4A]">{metric.value}</div>
                      <div className="mt-1 text-[10px] text-[#5E7088]">{metric.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <ReportSection title="Your Sponsorship at a Glance">
                <p className="text-[12px] leading-7 text-[#555]">
                  {buildSponsorSummaryCopy(sponsor, sponsorReport, sections)}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {buildSponsorKpis(reportState, sponsor).map((kpi) => (
                    <div
                      key={kpi.label}
                      className="rounded-md border border-[#e8e3d8] bg-[#f9f8f5] px-3 py-4 text-center"
                    >
                      <div className={cn("text-[22px] font-bold", kpi.valueTone)}>{kpi.value}</div>
                      <div className="mt-1 text-[10px] text-[#888]">{kpi.label}</div>
                      <div className={cn("mt-1 text-[10px]", kpi.noteTone ?? "text-[#888]")}>{kpi.note}</div>
                    </div>
                  ))}
                </div>
              </ReportSection>

              <ReportSection title="Report Scope">
                <div className="grid grid-cols-2 gap-3">
                  {sections.length > 0 ? (
                    sections.map((section) => (
                      <div
                        key={section}
                        className="rounded-md border border-[#e8e3d8] bg-[#fcfbf7] px-3 py-3 text-[11.5px] text-[#333]"
                      >
                        {section}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md border border-[#e8e3d8] bg-[#fcfbf7] px-3 py-3 text-[11.5px] text-[#555]">
                      No sponsor-visible sections are configured yet.
                    </div>
                  )}
                </div>
              </ReportSection>

              <ReportSection title="Progress Snapshot" subtle>
                <div className="space-y-3">
                  {notes.length > 0 ? (
                    notes.map((note) => (
                      <div key={note} className="text-[12px] leading-7 text-[#333]">
                        {note}
                      </div>
                    ))
                  ) : (
                    <div className="text-[12px] leading-7 text-[#555]">
                      Sponsor-safe reporting is enabled, but the live program has not yet accumulated participant, submission, or judging outcomes to surface here.
                    </div>
                  )}
                </div>
              </ReportSection>

              <div className="flex items-center justify-between bg-[#f9f8f5] px-10 py-5">
                <div className="text-[10px] text-[#aaa]">
                  Generated by Innova AI · Confidential · Sponsor-safe visibility only
                </div>
                <div className="text-[10px] font-medium text-[#B08A28]">
                  innovink.solvintell.com
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-[680px] rounded-xl border border-dashed border-[#d6d1c6] bg-white px-6 py-8 text-[13px] leading-7 text-[#555]">
              No sponsor-safe report scaffold exists yet for this program. Generate sponsor reporting from the PM workspace first, then return here to review and deliver the sponsor-facing package.
            </div>
          )}
        </div>

        <aside className="overflow-y-auto border-l border-white/7 bg-[#111e30] px-5 py-5">
          <div className="mb-1 text-[13px] font-semibold text-[#eae5dc]">Report Configuration</div>
          <div className="mb-4 text-[11px] text-[#9baabf]">
            {sponsor ? `${sponsor.name} · ${sponsor.tier ?? "Sponsor"}` : "No sponsor selected"}
          </div>

          <ConfigSection title="Sections to Include">
            {buildSectionToggles(sections).map((section) => (
              <ToggleRow
                key={section.label}
                label={section.label}
                enabled={section.enabled}
              />
            ))}
          </ConfigSection>

          <ConfigSection title="Delivery">
            <ConfigField label="Recipient">
              {sponsor ? (
                sponsor.name
              ) : (
                "No sponsor contact attached"
              )}
            </ConfigField>
            <ConfigField label="Status">
              {generatedReport?.status ?? "No report"}
            </ConfigField>
            <ConfigField label="Template">
              {reportState.reportTemplates[0]?.name ?? "No sponsor template"}
            </ConfigField>
          </ConfigSection>

          <ConfigSection title="Branding">
            <ToggleRow label="Include sponsor-safe scope" enabled />
            <ToggleRow label="Acme branding" enabled />
            <ToggleRow label="Innova attribution" enabled />
          </ConfigSection>

          {linkedSession ? (
            <div className="mb-4 rounded-md border border-[#b08a2838] bg-[#b08a2810] p-3">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#ccaa4a]">
                Edit with Innova
              </div>
              <div className="mt-2 text-[11px] leading-6 text-[#9baabf]">
                Refine sponsor-safe sections, visibility boundaries, or delivery guidance from the PM workspace.
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href={buildCreateHref(
                    linkedSession.id,
                    `Refine the sponsor-safe report for ${sponsor?.name ?? "this sponsor"} and keep the report aligned with governed external visibility boundaries.`,
                  )}
                  className="flex-1 rounded-md border border-white/10 px-3 py-2 text-center text-[11px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                >
                  Edit Report
                </Link>
                <Link
                  href={buildCreateHref(
                    linkedSession.id,
                    "Review the sponsor-safe report package and suggest PM actions before release.",
                  )}
                  className="flex-1 rounded-md border border-white/10 px-3 py-2 text-center text-[11px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                >
                  Ask Innova
                </Link>
              </div>
            </div>
          ) : null}

          <div className="space-y-2 pt-1">
            <SponsorPreviewButton sponsorId={sponsor?.id ?? null} programId={program.id} />
            {canSend ? (
              <form action={sendSponsorReportNowAction}>
                <input type="hidden" name="programId" value={program.id} />
                <input type="hidden" name="sponsorId" value={sponsor!.id} />
                <input type="hidden" name="generatedReportId" value={generatedReport!.id} />
                <button
                  type="submit"
                  className="w-full rounded-md bg-[#b08a28] px-3 py-2 text-[11.5px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                >
                  Send Now
                </button>
              </form>
            ) : (
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-md bg-[#6c5a22] px-3 py-2 text-[11.5px] font-semibold text-[#07101f]"
              >
                Send Now
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function buildManagerRoute(programId: string, sponsorId?: string | null) {
  const params = new URLSearchParams();
  if (sponsorId) params.set("sponsor", sponsorId);
  const query = params.toString();
  return `/app/programs/${programId}/sponsor-report${query ? `?${query}` : ""}`;
}

function buildCreateHref(sessionId: string, prompt: string) {
  const params = new URLSearchParams({ session: sessionId, prompt });
  return `/app/create?${params.toString()}`;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : null;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function buildHeaderMetrics(
  sponsor: SponsorSummary,
  reportState: ProgramSponsorReportManagerData,
) {
  return [
    {
      label: "Sponsor tier",
      value: sponsor.tier ?? "Partner",
    },
    {
      label: "Visible sections",
      value: String(
        readStringArray(asRecord(reportState.generatedReport?.content).sections)?.length ?? 0,
      ),
    },
    {
      label: "Report status",
      value: reportState.generatedReport?.status ?? "draft",
    },
  ];
}

function buildSponsorSummaryCopy(
  sponsor: SponsorSummary,
  sponsorReport: ProgramSponsorReportManagerData["sponsorReport"],
  sections: string[],
) {
  const sectionSummary =
    sections.length > 0
      ? `${sections.slice(0, 3).join(", ")}${sections.length > 3 ? ", and more" : ""}`
      : "program highlights and milestone summaries";

  return sponsorReport?.summary
    ? sponsorReport.summary
    : `${sponsor.name}'s sponsor-safe report package currently focuses on ${sectionSummary}. Internal judging notes and operator-only commentary remain excluded by design.`;
}

function buildSponsorKpis(
  reportState: ProgramSponsorReportManagerData,
  sponsor: SponsorSummary,
) {
  const status = reportState.generatedReport?.status ?? "draft";

  return [
    {
      label: "Sponsor tier",
      value: sponsor.tier ?? "Partner",
      valueTone: "text-[#B08A28]",
      note: "current package scope",
    },
    {
      label: "Template",
      value: reportState.reportTemplates.length > 0 ? String(reportState.reportTemplates.length) : "0",
      valueTone: "text-[#3A6E9E]",
      note: "sponsor-safe templates",
    },
    {
      label: "Status",
      value: status,
      valueTone: status === "published" ? "text-[#2D7A58]" : "text-[#B08A28]",
      note: status === "published" ? "ready for sponsor delivery" : "pending release",
      noteTone: status === "published" ? "text-[#2D7A58]" : "text-[#888]",
    },
  ];
}

function buildSectionToggles(sections: string[]) {
  const normalized = new Set(sections.map((section) => section.toLowerCase()));
  return [
    { label: "Sponsorship highlights", enabled: true },
    { label: "Registration stats", enabled: normalized.has("participation and pipeline summary") || sections.length > 0 },
    { label: "Registration chart", enabled: sections.length > 0 },
    { label: "Upcoming milestones", enabled: normalized.has("next milestones and sponsor-visible outcomes") || sections.length > 0 },
    { label: "Submission preview", enabled: normalized.has("shortlisted or highlighted innovations") },
    { label: "Judge scoring summary", enabled: false },
  ];
}

function ReportSection({
  title,
  subtle = false,
  children,
}: {
  title: string;
  subtle?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "border-b border-[#f0ede8] px-10 py-8",
        subtle && "bg-[#f9f8f5]",
      )}
    >
      <div className="mb-3 text-[14px] font-semibold text-[#1a1a1a]">{title}</div>
      {children}
    </section>
  );
}

function ConfigSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5 border-b border-white/7 pb-5">
      <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#5e7088]">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ConfigField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.06em] text-[#5e7088]">{label}</div>
      <div className="mt-1 rounded-md border border-white/10 bg-[#162034] px-3 py-2 text-[11.5px] text-[#eae5dc]">
        {children}
      </div>
    </div>
  );
}

function ToggleRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-[#9baabf]">{label}</span>
      <span
        className={cn(
          "relative inline-flex h-4 w-7 rounded-full border",
          enabled
            ? "border-[#b08a28] bg-[#b08a28]"
            : "border-white/10 bg-[#162034]",
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] h-2.5 w-2.5 rounded-full bg-white transition",
            enabled ? "left-[14px]" : "left-[2px]",
          )}
        />
      </span>
    </div>
  );
}

function SponsorPreviewButton({
  programId,
  sponsorId,
}: {
  programId: string;
  sponsorId: string | null;
}) {
  return (
    <Link
      href={buildManagerRoute(programId, sponsorId)}
      className="block w-full rounded-md border border-white/10 px-3 py-2 text-center text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
    >
      Preview as Sponsor
    </Link>
  );
}
