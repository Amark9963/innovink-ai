import { redirect } from "next/navigation";
import { getCurrentUserOrNull, getInitialOnboardingState } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppIndexPage() {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const onboarding = await getInitialOnboardingState(supabase, user);
  redirect(onboarding.isComplete ? "/app/dashboard" : "/app/onboarding");
}
