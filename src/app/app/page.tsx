import { redirect } from "next/navigation";
import { getCurrentUserOrNull, hasWorkspaceAccess } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppIndexPage() {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const hasWorkspace = await hasWorkspaceAccess(supabase, user);
  redirect(hasWorkspace ? "/app/dashboard" : "/app/onboarding");
}
