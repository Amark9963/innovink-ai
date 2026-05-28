import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[32px] border border-[#17314f] bg-[linear-gradient(135deg,#0d1f34_0%,#122b46_45%,#16385a_100%)] px-6 py-7 text-white shadow-[0_24px_80px_rgba(9,22,38,0.28)] md:px-8 md:py-8",
        className,
      )}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="eyebrow text-[11px] font-semibold tracking-[0.24em] text-[#d6b36a]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c9d7e6] md:text-base">
            {description}
          </p>
        </div>

        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}

