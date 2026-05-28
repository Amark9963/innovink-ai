"use client";

import { cn } from "@/lib/utils/cn";

export function SponsorReportExportButton({ disabled }: { disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={
        disabled
          ? undefined
          : () => {
              window.print();
            }
      }
      disabled={disabled}
      className={cn(
        "rounded-md px-3 py-2 text-[12px] font-semibold transition",
        disabled
          ? "cursor-not-allowed bg-[#6c5a22] text-[#07101f]"
          : "bg-[#b08a28] text-[#07101f] hover:bg-[#ccaa4a]",
      )}
    >
      Export PDF
    </button>
  );
}
