"use client";

type AuditExportButtonProps = {
  rows: Array<{
    action: string;
    actorName: string | null;
    createdAt: string;
    scope: string;
    targetTable: string | null;
  }>;
  label?: string;
  filename?: string;
};

export function AuditExportButton({
  rows,
  label = "Export Audit Log",
  filename = "innovink-audit-log.csv",
}: AuditExportButtonProps) {
  function handleExport() {
    const header = ["action", "actor", "created_at", "scope", "target_table"];
    const csvRows = [
      header.join(","),
      ...rows.map((row) =>
        [
          row.action,
          row.actorName ?? "",
          row.createdAt,
          row.scope,
          row.targetTable ?? "",
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={handleExport}>
      {label}
    </button>
  );
}
