type SetupShellProps = {
  title: string;
  description: string;
  progressLabel: string;
  steps: Array<{
    label: string;
    description: string;
    status: "done" | "active" | "pending";
  }>;
  preview: React.ReactNode;
  children: React.ReactNode;
};

export function SetupShell({
  title,
  description,
  progressLabel,
  steps,
  preview,
  children,
}: SetupShellProps) {
  const activeCount = steps.filter((step) => step.status === "done").length + 1;

  return (
    <div className="grid min-h-screen grid-cols-[220px_minmax(0,1fr)_300px] grid-rows-[56px_1fr] [grid-template-areas:'hdr_hdr_hdr''steps_content_preview'] bg-[#07101f] text-[#eae5dc]">
      <header className="[grid-area:hdr] flex items-center border-b border-white/7 bg-[#0c1525]">
        <div className="flex h-full w-[220px] items-center gap-3 border-r border-white/7 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#b08a2838] bg-[#b08a281a] text-[13px] font-bold tracking-tight text-[#ccaa4a]">
            IN
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.025em] text-[#eae5dc]">
              Innovink
            </div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#b08a28]">
              Enterprise
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3 px-5">
          <div className="text-[13px] font-medium text-[#eae5dc]">Workspace Setup</div>
          <div className="h-[18px] w-px bg-white/7" />
          <div className="text-[12px] text-[#5e7088]">Configure your Innovink workspace</div>
        </div>

        <div className="flex items-center gap-3 px-5">
          <div className="flex items-center gap-[6px]">
            {steps.map((step, index) => (
              <div
                key={`${step.label}-${index}`}
                className={`h-[5px] w-[5px] rounded-full ${
                  step.status === "done" || step.status === "active" ? "bg-[#b08a28]" : "bg-white/15"
                } ${step.status === "active" ? "shadow-[0_0_6px_rgba(176,138,40,0.8)]" : ""}`}
              />
            ))}
          </div>
          <div className="text-[11px] text-[#9baabf]">
            {progressLabel || `Step ${activeCount} of ${steps.length}`}
          </div>
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-[11px] text-[#5e7088] transition hover:bg-white/[0.04] hover:text-[#9baabf]"
          >
            Skip for now
          </button>
        </div>
      </header>

      <aside className="[grid-area:steps] overflow-y-auto border-r border-white/7 bg-[#0c1525] py-6">
        <div className="mb-4 px-5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#374d65]">
          Setup Progress
        </div>
        <div className="space-y-1">
          {steps.map((step, index) => (
            <div
              key={`${step.label}-${index}`}
              className={`flex items-start gap-3 px-5 py-2.5 ${
                step.status === "active" ? "bg-white/[0.035]" : ""
              }`}
            >
              <div
                className={`mt-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-bold ${
                  step.status === "done"
                    ? "bg-[#2d7a58] text-white"
                    : step.status === "active"
                      ? "bg-[#b08a28] text-[#07101f]"
                      : "border border-white/10 bg-white/[0.03] text-[#5e7088]"
                }`}
              >
                {step.status === "done" ? "✓" : index + 1}
              </div>
              <div>
                <div
                  className={`text-[12.5px] ${
                    step.status === "active"
                      ? "font-semibold text-[#eae5dc]"
                      : step.status === "done"
                        ? "font-medium text-[#9baabf]"
                        : "text-[#5e7088]"
                  }`}
                >
                  {step.label}
                </div>
                <div className="mt-0.5 text-[10.5px] text-[#5e7088]">
                  {step.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="[grid-area:content] overflow-y-auto bg-[#07101f] px-9 py-8">
        <div className="mb-7 max-w-4xl">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#9baabf]">
            {description}
          </p>
        </div>
        {children}
      </main>

      <aside className="[grid-area:preview] overflow-y-auto border-l border-white/7 bg-[#111e30] p-5">
        {preview}
      </aside>
    </div>
  );
}
