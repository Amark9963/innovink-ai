import { redirect } from "next/navigation";
import { LoginClient } from "@/app/login/login-client";
import { getCurrentUserOrNull, hasWorkspaceAccess } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
    confirmed?: string;
  }>;
};


export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = (await searchParams) ?? {};
  const nextPath = typeof query.next === "string" && query.next.startsWith("/") ? query.next : null;
  const confirmed = query.confirmed === "1";
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (user) {
    if (nextPath) {
      redirect(nextPath);
    }

    const hasWorkspace = await hasWorkspaceAccess(supabase, user);
    redirect(hasWorkspace ? "/app/dashboard" : "/app/onboarding");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07101f] text-[#eae5dc]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(176,138,40,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(58,110,158,0.1),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(159,177,199,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(159,177,199,0.06)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(420px,480px)] lg:items-stretch">
          <section className="relative hidden min-h-[760px] overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(160deg,rgba(10,24,42,0.99),rgba(6,13,24,1))] shadow-[0_32px_80px_rgba(0,0,0,0.55)] lg:flex lg:flex-col">
            {/* Ambient glows */}
            <div className="pointer-events-none absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(176,138,40,0.13),transparent_60%)]" />
            <div className="pointer-events-none absolute -bottom-40 -left-20 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(58,110,158,0.11),transparent_60%)]" />

            {/* Dot grid */}
            <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,rgba(159,177,199,0.055)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_40%,black_10%,transparent_75%)]" />

            {/* Brand mark */}
            <div className="relative z-10 flex items-center gap-3 px-8 py-7">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#b08a2840] bg-[#b08a2812] text-[15px] font-bold text-[#d6b15c]">
                IN
              </div>
              <div>
                <div className="text-[17px] font-semibold tracking-[-0.025em] text-[#f3efe7]">Innovink</div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#c79a35]">Agentic AI Platform</div>
              </div>
            </div>

            {/* Display statement */}
            <div className="relative z-10 flex flex-1 flex-col justify-center px-10 pb-10">
              <div className="mb-7 inline-flex items-center gap-2 self-start rounded-full border border-[#27405f] bg-[#0f1e35] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d6b15c]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d6b15c]" />
                Innova &middot; AI Agent
              </div>

              <h1 className="text-[60px] font-semibold leading-[1.01] tracking-[-0.055em] text-[#f3efe7]">
                Innovation<br />
                programs,<br />
                <span className="bg-[linear-gradient(118deg,#d6b15c_0%,#f2dc90_38%,#c79a35_65%,#d6b15c_100%)] bg-clip-text text-transparent">
                  run by AI.
                </span>
              </h1>

              <p className="mt-6 max-w-[380px] text-[16px] leading-[1.7] text-[#6a7f99]">
                One governed workspace from brief to final results.
              </p>
            </div>

            {/* Minimal trust footer */}
            <div className="relative z-10 flex items-center gap-3 border-t border-white/[0.07] px-8 py-4 text-[10px] font-medium uppercase tracking-[0.15em] text-[#3d5268]">
              <span>256-bit TLS</span>
              <span className="h-[10px] w-px bg-white/[0.08]" />
              <span>SOC 2 Type II</span>
              <span className="h-[10px] w-px bg-white/[0.08]" />
              <span>ISO 27001</span>
              <span className="h-[10px] w-px bg-white/[0.08]" />
              <span>GDPR</span>
            </div>
          </section>

          <section className="flex min-h-[720px] items-center justify-center rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(10,22,38,0.9),rgba(7,17,31,0.96))] px-4 py-5 shadow-[0_32px_80px_rgba(0,0,0,0.42)] sm:px-6 lg:min-h-[760px] lg:px-7">
            <div className="w-full max-w-[436px]">
              <div className="mb-5 lg:hidden">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#27405f] bg-[#102038] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d6b15c]">
                  <span className="h-2 w-2 rounded-full bg-[#d6b15c]" />
                  Innovink Agentic AI
                </div>
                <h1 className="text-[30px] font-semibold leading-[1.04] tracking-[-0.04em] text-[#f3efe7]">
                  Secure access for enterprise innovation teams.
                </h1>
                <p className="mt-3 text-[14px] leading-7 text-[#9fb1c7]">
                  Sign in to manage programs, approvals, participant journeys, and governed AI workflows.
                </p>
              </div>

              <LoginClient nextPath={nextPath ?? "/app"} confirmed={confirmed} />

              <div className="mt-5 text-center text-[11.5px] text-[#5e7088]">
                Powered by <span className="font-medium text-[#ccaa4a]">Innovink</span> Enterprise ·{" "}
                <span>Privacy Policy</span> · <span>Terms of Service</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
