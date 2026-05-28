"use client";

export function ExecutionExportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/5 hover:text-[#eae5dc]"
    >
      Export Report
    </button>
  );
}
