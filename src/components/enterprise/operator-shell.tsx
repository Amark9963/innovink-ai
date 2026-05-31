import Link from "next/link";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { ProgramAccessRow, WorkspaceAccessRow } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function signOutAction() {
  "use server";

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

type OperatorShellProps = {
  activeNav:
    | "overview"
    | "ai-workspace"
    | "program-brief"
    | "execution-plan"
    | "draft-assets"
    | "approvals"
    | "execution";
  brandTier?: string;
  headerTitle: string;
  headerSubtitle?: string;
  organizationName?: string;
  userName: string;
  userEmail?: string | null;
  headerActions?: React.ReactNode;
  rightPanel?: React.ReactNode;
  workspaces: WorkspaceAccessRow[];
  programs: ProgramAccessRow[];
  sessionId?: string | null;
  programSetupNavOnly?: boolean;
  workspacePrimaryMode?: boolean;
  hideSidebar?: boolean;
  hideHeader?: boolean;
  children: React.ReactNode;
  mainClassName?: string;
};

export function OperatorShell({
  activeNav,
  brandTier = "Enterprise",
  headerTitle,
  headerSubtitle,
  organizationName,
  userName,
  userEmail,
  headerActions,
  rightPanel,
  workspaces,
  programs,
  sessionId,
  programSetupNavOnly = false,
  workspacePrimaryMode = false,
  hideSidebar = false,
  hideHeader = false,
  children,
  mainClassName,
}: OperatorShellProps) {
  const primaryWorkspace = workspaces[0] ?? null;
  const activePrograms = programs.slice(0, 3);

  return (
    <div
      className={cn(
        "grid h-screen overflow-hidden bg-[#07101f] text-[#eae5dc]",
        hideHeader
          ? hideSidebar
            ? rightPanel
              ? "grid-rows-[1fr] grid-cols-[minmax(0,1fr)_296px] [grid-template-areas:'main_pnl']"
              : "grid-rows-[1fr] grid-cols-[minmax(0,1fr)] [grid-template-areas:'main']"
            : rightPanel
              ? "grid-rows-[1fr] grid-cols-[220px_minmax(0,1fr)_296px] [grid-template-areas:'nav_main_pnl']"
              : "grid-rows-[1fr] grid-cols-[220px_minmax(0,1fr)] [grid-template-areas:'nav_main']"
          : hideSidebar
            ? rightPanel
              ? "grid-rows-[56px_1fr] grid-cols-[minmax(0,1fr)_296px] [grid-template-areas:'hdr_hdr''main_pnl']"
              : "grid-rows-[56px_1fr] grid-cols-[minmax(0,1fr)] [grid-template-areas:'hdr''main']"
            : rightPanel
              ? "grid-rows-[56px_1fr] grid-cols-[220px_minmax(0,1fr)_380px] [grid-template-areas:'hdr_hdr_hdr''nav_main_pnl']"
              : "grid-rows-[56px_1fr] grid-cols-[220px_minmax(0,1fr)] [grid-template-areas:'hdr_hdr''nav_main']",
      )}
    >
      {hideHeader ? null : (
      <header className="[grid-area:hdr] flex items-center border-b border-white/7 bg-[#0c1525]">
        <div
          className={cn(
            "flex h-full items-center gap-3 px-4",
            hideSidebar ? "min-w-[180px]" : "w-[220px] border-r border-white/7",
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#b08a2838] bg-[#b08a281a] text-[13px] font-bold tracking-tight text-[#ccaa4a]">
            IN
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.025em] text-[#eae5dc]">
              Innovink
            </div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#b08a28]">
              {brandTier}
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3 px-5">
          {organizationName ? (
            <>
              <div className="text-[13px] text-[#9baabf]">{organizationName}</div>
              <div className="h-[18px] w-px bg-white/7" />
            </>
          ) : null}
          <div className="text-[13px] text-[#c8d3de]">{headerTitle}</div>
          {headerSubtitle ? (
            <>
              <div className="h-[18px] w-px bg-white/7" />
              <div className="text-[12px] text-[#5e7088]">{headerSubtitle}</div>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2 px-4">
          {headerActions}
          <div className="hidden pr-2 text-right md:block">
            <div className="text-[12px] font-medium text-[#eae5dc]">{userName}</div>
            <div className="text-[10.5px] text-[#5e7088]">
              {userEmail ?? primaryWorkspace?.workspaceName ?? "Operator"}
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#b08a2838] bg-[#b08a2812] text-[11px] font-semibold text-[#ccaa4a]">
            {getInitials(userName)}
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/5 hover:text-[#eae5dc]"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      )}

      {hideSidebar ? null : (
        <aside className="[grid-area:nav] flex flex-col overflow-hidden border-r border-white/7 bg-[#0c1525]">
        <div className="px-[15px] pb-1 pt-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#374d65]">
          {workspacePrimaryMode ? "Navigation" : "Workspace"}
        </div>
        <ShellNavLink href="/app/dashboard" isActive={activeNav === "overview"} label="Overview" />
        <ShellNavLink
          href={sessionId ? `/app/create?session=${sessionId}` : "/app/create"}
          isActive={activeNav === "ai-workspace"}
          label="AI Workspace"
        />
        {workspacePrimaryMode ? null : (
          <>
            <ShellNavLink
              href={sessionId ? `/app/create/${sessionId}/brief` : "/app/create"}
              isActive={activeNav === "program-brief"}
              label="Program Brief"
              disabled={!sessionId}
            />
            <ShellNavLink
              href={sessionId ? `/app/create/${sessionId}/plan` : "/app/create"}
              isActive={activeNav === "execution-plan"}
              label="Execution Plan"
              disabled={!sessionId}
            />
            <ShellNavLink
              href={sessionId ? `/app/create/${sessionId}/assets` : "/app/create"}
              isActive={activeNav === "draft-assets"}
              label="Draft Assets"
              disabled={!sessionId}
            />
            {programSetupNavOnly ? null : (
              <>
                <ShellNavPlaceholder label="Submissions" />
                <ShellNavPlaceholder label="Judging" />
                <ShellNavPlaceholder label="Reports" />
              </>
            )}
            <ShellNavLink
              href={sessionId ? `/app/create/${sessionId}/approvals` : "/app/create"}
              isActive={activeNav === "approvals"}
              label="Approvals"
              disabled={!sessionId}
            />
            <ShellNavLink
              href={sessionId ? `/app/create/${sessionId}/execution` : "/app/create"}
              isActive={activeNav === "execution"}
              label="Execution"
              disabled={!sessionId}
            />
          </>
        )}
        <div className="my-2 h-px bg-white/7" />

        <div className="px-[15px] pb-1 pt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#374d65]">
          Active Programs
        </div>
        <div className="space-y-1 px-0">
          {activePrograms.length > 0 ? (
            activePrograms.map((program, index) => (
              <Link
                key={program.id}
                href={`/app/programs/${program.id}/landing-page`}
                className={cn(
                  "block px-[15px] py-[7px] transition hover:bg-white/[0.035]",
                  index === 0 && activeNav === "overview" ? "bg-white/[0.035]" : "",
                )}
              >
                <div className="mb-0.5 flex items-center gap-[7px]">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      program.status === "published"
                        ? "bg-[#3e9a70]"
                        : program.status === "configured" || program.status === "draft"
                          ? "bg-[#c9973a]"
                          : "bg-[#6080a0]",
                    )}
                  />
                  <span className="truncate text-[12px] font-medium text-[#9baabf]">
                    {program.name}
                  </span>
                </div>
                <div className="pl-3 text-[10.5px] text-[#5e7088]">
                  {program.programType} · {formatProgramStatus(program.status)}
                </div>
              </Link>
            ))
          ) : (
            <div className="px-[15px] py-3 text-[11px] leading-5 text-[#5e7088]">
              No live program records yet.
            </div>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-white/7 px-[15px] py-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#b08a2838] bg-[#b08a2812] text-[10px] font-semibold text-[#ccaa4a]">
            {getInitials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium text-[#9baabf]">{userName}</div>
            <div className="truncate text-[10.5px] text-[#5e7088]">
              {primaryWorkspace?.workspaceRole.replaceAll("_", " ") ?? "Workspace operator"}
            </div>
          </div>
        </div>
        </aside>
      )}

      <main className={cn("[grid-area:main] overflow-y-auto bg-[#07101f]", mainClassName)}>
        {children}
      </main>

      {rightPanel ? (
        <aside className="[grid-area:pnl] flex flex-col overflow-hidden border-l border-white/7 bg-[#111e30]">
          {rightPanel}
        </aside>
      ) : null}
    </div>
  );
}

function ShellNavLink({
  href,
  label,
  isActive,
  disabled = false,
}: {
  href: string;
  label: string;
  isActive: boolean;
  disabled?: boolean;
}) {
  const classes = cn(
    "flex items-center gap-2 border-l-2 border-transparent px-[15px] py-[6.5px] text-[12.5px] text-[#5e7088] transition hover:bg-white/[0.035] hover:text-[#9baabf]",
    isActive ? "border-l-[#b08a28] bg-white/[0.035] font-medium text-[#eae5dc]" : "",
    disabled ? "pointer-events-none opacity-45" : "",
  );

  if (disabled) {
    return <div className={classes}>{label}</div>;
  }

  return (
    <Link href={href} className={classes}>
      <span>{label}</span>
    </Link>
  );
}

function ShellNavPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 border-l-2 border-transparent px-[15px] py-[6.5px] text-[12.5px] text-[#5e7088]">
      <span>{label}</span>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatProgramStatus(status: ProgramAccessRow["status"]) {
  switch (status) {
    case "published":
      return "Live";
    case "configured":
      return "Configured";
    case "draft":
      return "In Setup";
    case "in_review":
      return "In Review";
    case "completed":
      return "Completed";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}
