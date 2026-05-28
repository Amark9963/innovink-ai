import { redirect } from "next/navigation";
import { LoginClient } from "@/app/login/login-client";
import { getCurrentUserOrNull, hasWorkspaceAccess } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (user) {
    const hasWorkspace = await hasWorkspaceAccess(supabase, user);
    redirect(hasWorkspace ? "/app/dashboard" : "/app/onboarding");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-y-auto bg-[#07101f] px-5 py-10">
      <div className="pointer-events-none fixed right-[-120px] top-[-120px] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(176,138,40,0.06),transparent_65%)]" />
      <div className="pointer-events-none fixed bottom-[-150px] left-[-100px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(58,110,158,0.04),transparent_65%)]" />

      <div className="relative z-10 w-full max-w-[424px]">
        <LoginClient />
        <div className="mt-5 text-center text-[11.5px] text-[#5e7088]">
          Powered by <span className="font-medium text-[#ccaa4a]">Innovink</span> Enterprise ·{" "}
          <span>Privacy Policy</span> · <span>Terms of Service</span>
        </div>
      </div>
    </main>
  );
}
