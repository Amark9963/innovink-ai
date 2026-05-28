import { notFound } from "next/navigation";
import { getPublishedLandingPageBySlug } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PublicLandingPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicLandingPage({ params }: PublicLandingPageProps) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const publishedPage = await getPublishedLandingPageBySlug(supabase, slug);

  if (!publishedPage) {
    notFound();
  }

  return (
    <main className="flex-1 py-10 md:py-14">
      <div className="shell space-y-6">
        <section className="panel rounded-[28px] px-6 py-8 md:px-10">
          <p className="eyebrow text-xs font-semibold text-accent">
            {publishedPage.program.slug}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            {publishedPage.landingPage.title ?? publishedPage.program.name}
          </h1>
          {publishedPage.landingPage.seo_description ??
          publishedPage.program.short_description ? (
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted md:text-lg">
              {publishedPage.landingPage.seo_description ??
                publishedPage.program.short_description}
            </p>
          ) : null}
        </section>

        <section className="grid gap-4">
          {publishedPage.sections.map((section) => (
            <article key={section.id} className="panel rounded-[24px] px-6 py-6 md:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                {section.section_key}
              </p>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap font-mono text-[13px] leading-7 text-muted">
                {JSON.stringify(section.content, null, 2)}
              </pre>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
