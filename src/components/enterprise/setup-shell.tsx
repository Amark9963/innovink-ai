type SetupShellProps = {
  title: string;
  description: string;
  preview: React.ReactNode;
  children: React.ReactNode;
};

export function SetupShell({
  title,
  description,
  preview,
  children,
}: SetupShellProps) {
  return (
    <div className="pm-workspace-theme grid min-h-screen grid-cols-[minmax(0,1fr)_320px] grid-rows-[56px_1fr] [grid-template-areas:'hdr_hdr''main_preview'] bg-[var(--ws-bg-base)] text-[var(--ws-t-primary)]">

      {/* Header */}
      <header className="[grid-area:hdr] flex items-center border-b border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-surface)]">
        <div className="flex h-full items-center gap-3 border-r border-[color:var(--ws-b-subtle)] px-5" style={{ minWidth: "200px" }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[13px] font-bold tracking-tight text-[var(--ws-gold-bright)]">
            IN
          </div>
          <div>
            <div className="text-[14px] font-semibold tracking-[-0.025em] text-[var(--ws-t-primary)]">
              Innovink
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-[.14em] text-[var(--ws-gold)]">
              Enterprise
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3 px-6">
          <div className="text-[13px] font-medium text-[var(--ws-t-primary)]">Workspace Setup</div>
          <div className="h-[18px] w-px bg-[var(--ws-b-subtle)]" />
          <div className="text-[12px] text-[var(--ws-t-muted)]">One step to your AI Workspace</div>
        </div>
      </header>

      {/* Main content */}
      <main className="[grid-area:main] overflow-y-auto px-8 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-[540px]">
          <div className="mb-7">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--ws-t-primary)]">
              {title}
            </h1>
            <p className="mt-2 text-[13px] leading-6 text-[var(--ws-t-secondary)]">
              {description}
            </p>
          </div>

          <div className="rounded-[var(--ws-r-2xl)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-6 py-6 shadow-[var(--ws-shadow-md)]">
            {children}
          </div>
        </div>
      </main>

      {/* Preview panel */}
      <aside className="[grid-area:preview] overflow-y-auto border-l border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-panel)] px-5 py-6">
        {preview}
      </aside>

    </div>
  );
}
