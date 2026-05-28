import { redirect } from "next/navigation";
import {
  type AgentCreateWorkspaceData,
  type ProgramAccessRow,
  getAgentCreateWorkspaceData,
  getCurrentUserOrNull,
  getProgramAccessRows,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function loadSessionScreenData(sessionId: string) {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const data: AgentCreateWorkspaceData = await getAgentCreateWorkspaceData(supabase, user, {
    sessionId,
  });
  const programs: ProgramAccessRow[] = await getProgramAccessRows(supabase);

  if (data.workspaces.length === 0) {
    redirect("/app/onboarding");
  }

  if (!data.activeSession || data.activeSession.id !== sessionId) {
    redirect("/app/create");
  }

  const selectedWorkspace = data.selectedWorkspace ?? data.workspaces[0];

  return {
    supabase,
    user,
    data,
    programs,
    selectedWorkspace,
    userName: user.user_metadata.full_name ?? user.email ?? "Operator",
  };
}
