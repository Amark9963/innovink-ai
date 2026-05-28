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

type LandingPageRouteProps = {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{ error?: string; status?: string }>;
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

  const publishedSlug =
    landingPageState.landingPage?.published_slug ?? program.slug;

  return (
    <div className="space-y-6">
      <section className="panel rounded-[28px] px-6 py-7 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow text-xs font-semibold text-accent">
              AI landing page creator
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              {program.name}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted md:text-base">
              Generate structured draft sections through an Edge Function, review
              the output internally, and publish the approved version to the
              public route when it is ready.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/app/dashboard"
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-strong"
            >
              Back to dashboard
            </Link>
            {landingPageState.landingPage?.published_slug ? (
              <Link
                href={`/p/${landingPageState.landingPage.published_slug}`}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
              >
                View public page
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {resolvedSearchParams.error ? (
        <p className="rounded-2xl border border-[#d9b4b4] bg-[#fff5f5] px-4 py-3 text-sm text-[#9a2c2c]">
          {resolvedSearchParams.error}
        </p>
      ) : null}

      {resolvedSearchParams.status ? (
        <p className="rounded-2xl border border-[#b7d4c4] bg-[#eff8f3] px-4 py-3 text-sm text-success">
          {resolvedSearchParams.status.replace(/-/g, " ")}
        </p>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <section className="panel rounded-[28px] p-6 md:p-7">
            <div className="border-b border-border pb-4">
              <p className="eyebrow text-xs font-semibold text-accent">
                Draft workflow
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Create and generate
              </h2>
            </div>

            <div className="mt-5 space-y-4 text-sm leading-7 text-muted">
              <p>
                Each AI run creates a new landing page draft version. Drafts are
                reviewable records, not silent edits to the published page.
              </p>
              <div className="flex flex-wrap gap-3">
                <form action={createLandingPageDraftAction}>
                  <input type="hidden" name="programId" value={program.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-strong"
                  >
                    Create empty draft
                  </button>
                </form>

                <form action={generateLandingPageDraftAction}>
                  <input type="hidden" name="programId" value={program.id} />
                  <button
                    type="submit"
                    className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
                  >
                    Generate AI draft
                  </button>
                </form>
              </div>
            </div>
          </section>

          <section className="panel rounded-[28px] p-6 md:p-7">
            <div className="border-b border-border pb-4">
              <p className="eyebrow text-xs font-semibold text-accent">
                Publish control
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Public route activation
              </h2>
            </div>

            {landingPageState.activeDraftVersionId ? (
              <form action={publishLandingPageAction} className="mt-5 space-y-4">
                <input type="hidden" name="programId" value={program.id} />
                <input
                  type="hidden"
                  name="versionId"
                  value={landingPageState.activeDraftVersionId}
                />
                <div className="space-y-2">
                  <label
                    htmlFor="publishedSlug"
                    className="text-sm font-medium text-foreground"
                  >
                    Public slug
                  </label>
                  <input
                    id="publishedSlug"
                    name="publishedSlug"
                    defaultValue={publishedSlug}
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
                >
                  Publish active draft
                </button>
              </form>
            ) : (
              <p className="mt-5 text-sm leading-7 text-muted">
                Create a draft version first before publishing a public route.
              </p>
            )}
          </section>

          <section className="panel rounded-[28px] p-6 md:p-7">
            <div className="border-b border-border pb-4">
              <p className="eyebrow text-xs font-semibold text-accent">
                Version ledger
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Reviewable history
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {landingPageState.versions.length > 0 ? (
                landingPageState.versions.map((version) => (
                  <div
                    key={version.id}
                    className="rounded-2xl border border-border bg-surface px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">
                        Version {version.versionNumber}
                      </p>
                      <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted">
                        {version.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted">{version.createdAt}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-6 text-sm leading-7 text-muted">
                  No landing page versions exist yet for this program.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="panel rounded-[28px] p-6 md:p-7">
          <div className="border-b border-border pb-4">
            <p className="eyebrow text-xs font-semibold text-accent">
              Active draft preview
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {landingPageState.activeDraftVersionNumber
                ? `Draft version ${landingPageState.activeDraftVersionNumber}`
                : "No active draft"}
            </h2>
          </div>

          <div className="mt-5 space-y-4">
            {landingPageState.sections.length > 0 ? (
              landingPageState.sections.map((section) => (
                <article
                  key={section.id}
                  className="rounded-[24px] border border-border bg-surface px-5 py-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                      {section.sectionKey}
                    </p>
                    <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted">
                      {section.isEnabled ? "enabled" : "disabled"}
                    </span>
                  </div>

                  <pre className="mt-4 overflow-x-auto whitespace-pre-wrap font-mono text-[13px] leading-6 text-muted">
                    {JSON.stringify(section.content, null, 2)}
                  </pre>
                </article>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-surface px-5 py-8 text-sm leading-7 text-muted">
                Once a draft exists, the current section snapshot will render
                here for structured review before publish.
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
