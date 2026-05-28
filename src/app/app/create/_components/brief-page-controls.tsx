"use client";

export function ExportBriefButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
    >
      Export PDF
    </button>
  );
}
