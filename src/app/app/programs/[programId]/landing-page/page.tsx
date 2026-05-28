import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  createLandingPageDraftAction,
  generateLandingPageDraftAction,
  publishLandingPageAction,
} from "@/app/app/programs/[programId]/landing-page/actions";
import {
  getCurrentUserOrNull,
  getLandingPageManagerData,
  getProgramById,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

type LandingPageRouteProps = {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{
    error?: string;
    status?: string;
    viewport?: string;
  }>;
};

export default async function ProgramLandingPageManager({
  params,
  searchParams,
}: LandingPageRouteProps) {
  const { programId } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const [program, landingPageState] = await Promise.all([
    getProgramById(supabase, programId),
    getLandingPageManagerData(supabase, programId),
  ]);

  if (!program) {
    notFound();
  }

  const publishedSlug = landingPageState.landingPage?.published_slug ?? program.slug;
  const viewport = resolvedSearchParams.viewport === "mobile" ? "mobile" : "desktop";
  const hasDraft = Boolean(landingPageState.activeDraftVersionId);
  const preview = buildLandingPreview(program.name, landingPageState.sections);
  const previewSections = landingPageState.sections.length > 0 ? landingPageState.sections : buildFallbackSections(program.name);

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
              Landing Page Editor
            </div>
          </div>
          <div className="h-5 w-px bg-white/7" />
          <div className="text-[12px] text-[#9baabf]">{program.name}</div>
          <div className="text-[11px] text-[#5e7088]">/ Landing Page Review</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-[2px] rounded-md border border-white/10 bg-[#111e30] p-1">
            <Link
              href={`/app/programs/${program.id}/landing-page`}
              className={cn(
                "rounded-md px-3 py-1.5 text-[11.5px]",
                viewport === "desktop"
                  ? "border border-white/10 bg-[#162034] text-[#eae5dc]"
                  : "text-[#5e7088]",
              )}
            >
              Preview
            </Link>
            <Link
              href={`/app/programs/${program.id}/landing-page?viewport=mobile`}
              className={cn(
                "rounded-md px-3 py-1.5 text-[11.5px]",
                viewport === "mobile"
                  ? "border border-white/10 bg-[#162034] text-[#eae5dc]"
                  : "text-[#5e7088]",
              )}
            >
              Mobile
            </Link>
          </div>

          <Link
            href="/app/dashboard"
            className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            Back to dashboard
          </Link>

          <form action={hasDraft ? generateLandingPageDraftAction : createLandingPageDraftAction}>
            <input type="hidden" name="programId" value={program.id} />
            <button
              type="submit"
              className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
            >
              {hasDraft ? "Regenerate" : "Create Draft"}
            </button>
          </form>

          {landingPageState.landingPage?.published_slug ? (
            <Link
              href={`/p/${landingPageState.landingPage.published_slug}`}
              className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
            >
              View public page
            </Link>
          ) : null}

          {hasDraft ? (
            <form action={publishLandingPageAction}>
              <input type="hidden" name="programId" value={program.id} />
              <input type="hidden" name="versionId" value={landingPageState.activeDraftVersionId!} />
              <input type="hidden" name="publishedSlug" value={publishedSlug} />
              <button
                type="submit"
                className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
              >
                Publish
              </button>
            </form>
          ) : null}
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

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px] overflow-hidden">
        <div className="overflow-y-auto bg-[#f3f2eb] px-6 py-6">
          <div className="mx-auto mb-4 flex w-full max-w-[720px] items-center gap-3">
            <div className="h-px flex-1 bg-[#d6d3c8]" />
            <div className="rounded-full border border-[#d6d3c8] bg-white px-3 py-1 text-[10px] text-[#666]">
              {viewport === "mobile" ? "Mobile preview" : "Desktop preview"}
            </div>
            <div className="h-px flex-1 bg-[#d6d3c8]" />
          </div>

          <div
            className={cn(
              "mx-auto overflow-hidden rounded-lg bg-white shadow-[0_8px_32px_rgba(0,0,0,0.16)]",
              viewport === "mobile" ? "max-w-[390px]" : "max-w-[720px]",
            )}
          >
            <div className="flex h-14 items-center gap-4 bg-[#07101f] px-7">
              <div className="text-[14px] font-bold tracking-[0.02em] text-[#ccaa4a]">
                ACME CORP
              </div>
              <div className="ml-auto flex items-center gap-4 text-[11px] text-[#9baabf]">
                <span>About</span>
                <span>FAQ</span>
                <span className="rounded bg-[#b08a28] px-3 py-1.5 font-semibold text-white">
                  Register
                </span>
              </div>
            </div>

            <div className="bg-[linear-gradient(135deg,#07101f,#0c1525)] px-10 py-14 text-center">
              <div className="mb-4 inline-block rounded-full border border-[#b08a2866] px-3 py-1 text-[10px] tracking-[0.04em] text-[#b08a28]">
                EMPLOYEE INNOVATION PROGRAM
              </div>
              <h1 className="mx-auto max-w-[420px] text-[30px] font-bold leading-[1.2] text-[#eae5dc]">
                {preview.heroTitle}
              </h1>
              <p className="mx-auto mt-4 max-w-[440px] text-[13px] leading-6 text-[#9baabf]">
                {preview.heroSubtitle}
              </p>
              <div className="mt-7 flex justify-center gap-3">
                <span className="rounded bg-[#b08a28] px-6 py-2.5 text-[13px] font-semibold text-white">
                  {preview.primaryCta}
                </span>
                <span className="rounded border border-[#b08a2866] px-6 py-2.5 text-[13px] text-[#ccaa4a]">
                  {preview.secondaryCta}
                </span>
              </div>
              <div className="mt-7 flex justify-center gap-8">
                {preview.metrics.map((metric) => (
                  <div key={metric.label} className="text-center">
                    <div className="text-[20px] font-bold text-[#ccaa4a]">{metric.value}</div>
                    <div className="mt-1 text-[10px] text-[#5e7088]">{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {previewSections.map((section, index) => (
              <section
                key={section.id}
                className={cn(
                  "border-b border-[#ece8db] px-10 py-10",
                  index === 1 && "bg-[#f9f9f7]",
                )}
              >
                <div className="mb-4 text-[16px] font-semibold text-[#1a1a1a]">
                  {formatSectionTitle(section.sectionKey)}
                </div>
                <div className="rounded-lg border border-[#ece8db] bg-[#fcfbf7] p-4">
                  <pre className="whitespace-pre-wrap font-sans text-[12px] leading-7 text-[#4f4f4f]">
                    {JSON.stringify(section.content, null, 2)}
                  </pre>
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside className="flex flex-col overflow-hidden border-l border-white/7 bg-[#111e30]">
          <div className="border-b border-white/7 px-4 py-4">
            <div className="text-[13px] font-semibold text-[#eae5dc]">Page Editor</div>
            <div className="mt-1 text-[11px] text-[#9baabf]">
              {landingPageState.activeDraftVersionNumber
                ? `Innova-generated · Draft v${landingPageState.activeDraftVersionNumber}`
                : "Create a draft to start review"}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <SectionEditorCard
              dotClass="bg-[#b08a28]"
              title="Hero Section"
              fields={[
                { label: "Headline", value: preview.heroTitle },
                { label: "Subheadline", value: preview.heroSubtitle },
                { label: "Primary CTA", value: preview.primaryCta },
                { label: "Secondary CTA", value: preview.secondaryCta },
              ]}
            />

            {previewSections.map((section, index) => (
              <SectionEditorCard
                key={section.id}
                dotClass={index % 2 === 0 ? "bg-[#3a6e9e]" : "bg-[#6e88a5]"}
                title={formatSectionTitle(section.sectionKey)}
                fields={[
                  { label: "Section Key", value: section.sectionKey },
                  { label: "Enabled", value: section.isEnabled ? "Yes" : "No" },
                  { label: "Content", value: JSON.stringify(section.content, null, 2) },
                ]}
                collapsed={index > 0}
              />
            ))}

            <div className="border-t border-white/7 p-4">
              <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#5e7088]">
                Innova Suggestions
              </div>
              <div className="mb-3 rounded-md border border-[#b08a2838] bg-[#b08a2810] p-3">
                <div className="text-[11px] font-medium text-[#ccaa4a]">Add social proof</div>
                <div className="mt-1 text-[10.5px] leading-5 text-[#9baabf]">
                  Past-winner or sponsor proof usually improves registration conversion for enterprise challenge pages.
                </div>
                <form action={generateLandingPageDraftAction} className="mt-2">
                  <input type="hidden" name="programId" value={program.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-white/10 px-3 py-1.5 text-[10px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                  >
                    Regenerate with suggestion
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/7 p-4">
            {!hasDraft ? (
              <form action={createLandingPageDraftAction}>
                <input type="hidden" name="programId" value={program.id} />
                <button
                  type="submit"
                  className="rounded-md border border-white/10 px-3 py-2 text-[11.5px] font-semibold text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                >
                  Create Draft
                </button>
              </form>
            ) : null}

            <form action={generateLandingPageDraftAction}>
              <input type="hidden" name="programId" value={program.id} />
              <button
                type="submit"
                className="rounded-md border border-white/10 px-3 py-2 text-[11.5px] font-semibold text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
              >
                Regenerate
              </button>
            </form>

            {hasDraft ? (
              <form action={publishLandingPageAction} className="flex-1">
                <input type="hidden" name="programId" value={program.id} />
                <input type="hidden" name="versionId" value={landingPageState.activeDraftVersionId!} />
                <input type="hidden" name="publishedSlug" value={publishedSlug} />
                <button
                  type="submit"
                  className="w-full rounded-md bg-[#b08a28] px-3 py-2 text-[11.5px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                >
                  Publish
                </button>
              </form>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionEditorCard({
  title,
  dotClass,
  fields,
  collapsed = false,
}: {
  title: string;
  dotClass: string;
  fields: Array<{ label: string; value: string }>;
  collapsed?: boolean;
}) {
  return (
    <div className="border-b border-white/7">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={cn("h-2.5 w-2.5 rounded-full", dotClass)} />
          <span className="text-[12px] font-medium text-[#eae5dc]">{title}</span>
        </div>
        <span className="text-[#5e7088]">{collapsed ? "▾" : "▴"}</span>
      </div>
      {!collapsed ? (
        <div className="px-4 pb-4">
          {fields.map((field) => (
            <div key={field.label} className="mb-3 last:mb-0">
              <div className="mb-1 text-[10px] uppercase tracking-[0.05em] text-[#5e7088]">
                {field.label}
              </div>
              <div className="rounded-md border border-white/10 bg-[#162034] px-3 py-2 text-[11.5px] leading-6 text-[#c8d3de]">
                {field.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function buildLandingPreview(
  programName: string,
  sections: Array<{ sectionKey: string; content: unknown }>,
) {
  const heroSection = sections.find((section) => section.sectionKey.toLowerCase().includes("hero"));
  const heroContent = asRecord(heroSection?.content);

  return {
    heroTitle:
      readString(heroContent, ["headline", "title", "heroHeadline"]) ?? programName,
    heroSubtitle:
      readString(heroContent, ["subheadline", "subtitle", "description"]) ??
      "Launch-ready public page copy generated from the current program brief and operator plan.",
    primaryCta: readString(heroContent, ["primaryCta", "primary_cta", "ctaLabel"]) ?? "Register Now",
    secondaryCta: readString(heroContent, ["secondaryCta", "secondary_cta"]) ?? "Learn More",
    metrics: [
      { value: "500+", label: "Expected Teams" },
      { value: "$50k", label: "Prize Pool" },
      { value: "12", label: "Expert Judges" },
    ],
  };
}

function buildFallbackSections(programName: string) {
  return [
    {
      id: "focus-areas",
      sectionKey: "focus_areas",
      isEnabled: true,
      content: {
        title: "Focus Areas",
        items: [
          "Supply chain resilience",
          "Customer experience AI",
          "Sustainable operations",
        ],
      },
    },
    {
      id: "key-dates",
      sectionKey: "key_dates",
      isEnabled: true,
      content: {
        title: `${programName} key dates`,
        note: "The AI draft will populate the exact schedule from the approved brief.",
      },
    },
  ];
}

function formatSectionTitle(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}
