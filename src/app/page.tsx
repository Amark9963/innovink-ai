import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 py-10 md:py-14">
      <div className="shell space-y-8">
        <section className="panel grid-lines overflow-hidden rounded-[28px]">
          <div className="grid gap-10 px-6 py-8 md:grid-cols-[1.5fr_0.9fr] md:px-10 md:py-10">
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="eyebrow text-xs font-semibold text-accent">
                  Innovink Enterprise
                </p>
                <div className="space-y-4">
                  <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
                    Operational control for serious innovation programs.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-muted md:text-lg">
                    Innovink helps enterprise teams launch, govern, judge, and
                    report innovation programs with structured workflows,
                    controlled AI assistance, and audit-ready operations.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
                >
                  Sign in to Innovink
                </Link>
                <Link
                  href="/app"
                  className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-strong"
                >
                  Open workspace shell
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Multi-tenant control", "Role-aware workspaces, scoped access, and governed program operations."],
                  ["AI with approvals", "Generated launch assets, reports, and workflows remain reviewable before execution."],
                  ["Operational clarity", "Forms, judging, reporting, and dashboards designed for real program teams."],
                ].map(([title, body]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-border bg-surface px-4 py-4"
                  >
                    <h2 className="text-sm font-semibold text-foreground">
                      {title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="panel rounded-[24px] border border-white/70 bg-white/90 p-5">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Program control room
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      First production workflow baseline
                    </p>
                  </div>
                  <span className="rounded-full bg-[#e9f7f1] px-3 py-1 text-xs font-semibold text-success">
                    Governed
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    "Create workspace and program",
                    "Generate AI launch kit via Edge Functions",
                    "Review and publish dynamic landing page",
                    "Register participants and accept submissions",
                    "Assign judges and aggregate scoring",
                    "Generate sponsor-safe and manager reports",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="panel rounded-[24px] px-6 py-6 md:px-8">
            <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="eyebrow text-xs font-semibold text-accent">
                  Foundation
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Enterprise baseline now locked
                </h2>
              </div>
              <p className="max-w-xs text-right text-sm leading-6 text-muted">
                Next.js, Supabase, Edge Functions, dynamic landing pages, and
                corporate-grade UI expectations.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ["Security", "RLS on tenant-owned tables, server-side authorization, signed file access, and audit logs."],
                ["Auth", "Supabase Auth with email/password, magic link, and invite-based staff onboarding."],
                ["Deployment", "Hetzner VPS with Docker Compose and Caddy for controlled rollouts."],
                ["Testing", "Vitest for logic, Playwright for cross-surface workflow verification."],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-border px-4 py-4">
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel rounded-[24px] px-6 py-6 md:px-8">
            <p className="eyebrow text-xs font-semibold text-accent">
              Current state
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Ready for platform foundation work
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-6 text-muted">
              <p>
                The repository is now scaffolded around the locked stack and
                ready for schema, RLS, auth, and deployment implementation.
              </p>
              <p>
                The next step is building the tenant core, not expanding into
                mock dashboards or provider-specific shortcuts.
              </p>
              <div className="rounded-2xl border border-border bg-[#0f22370a] px-4 py-4 font-mono text-[13px] text-foreground">
                dynamic pages
                <br />
                edge-function orchestration
                <br />
                provider-flexible payments
                <br />
                enterprise RBAC baseline
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
