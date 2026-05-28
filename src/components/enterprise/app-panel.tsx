import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type AppPanelProps = ComponentPropsWithoutRef<"section"> & {
  children: ReactNode;
};

export function AppPanel({
  children,
  className,
  ...props
}: AppPanelProps) {
  return (
    <section
      className={cn(
        "panel rounded-[28px] border border-border/90 bg-white/88 p-5 shadow-[0_20px_50px_rgba(14,32,51,0.08)] backdrop-blur",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

