import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type WorkspaceColumnsProps = {
  sidebar: ReactNode;
  main: ReactNode;
  panel?: ReactNode;
  className?: string;
};

export function WorkspaceColumns({
  sidebar,
  main,
  panel,
  className,
}: WorkspaceColumnsProps) {
  return (
    <section
      className={cn(
        "grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]",
        className,
      )}
    >
      <aside className="space-y-6">{sidebar}</aside>
      <div className="space-y-6">{main}</div>
      <aside className="space-y-6">{panel}</aside>
    </section>
  );
}
