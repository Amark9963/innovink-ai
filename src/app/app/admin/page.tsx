import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  manageIntegrationConfigurationAction,
  saveAiGovernancePoliciesAction,
  saveAutomationGovernanceAction,
  saveFeatureFlagsAction,
  saveRetentionExportPolicyAction,
  saveSecuritySsoConfigurationAction,
  toggleOrganizationAiAction,
  updateOrganizationMembershipAction,
} from "@/app/app/admin/actions";
import { AuditExportButton } from "@/app/app/admin/audit-export-button";
import type {
  AdminAiGovernanceData,
  AdminAutomationGovernanceData,
  AdminAuditData,
  AdminFeatureFlagData,
  AdminIntegrationsData,
  AdminRetentionExportData,
  AdminRolesData,
  AdminSecuritySsoData,
} from "@/lib/supabase/queries";
import {
  getAdminIntegrationsData,
  getAdminAuditData,
  getAdminAiGovernanceData,
  getAdminAutomationGovernanceData,
  getAdminFeatureFlagsData,
  getAdminGovernanceOverviewData,
  getAdminRetentionExportData,
  getAdminRolesData,
  getAdminSecuritySsoData,
  getCurrentUserOrNull,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./admin.module.css";

type AdminSection =
  | "overview"
  | "roles"
  | "rollout"
  | "automation"
  | "programs"
  | "billing"
  | "security"
  | "ai-controls"
  | "audit"
  | "risks"
  | "integrations"
  | "webhooks";

type AdminPageProps = {
  searchParams: Promise<{
    section?: string;
    status?: string;
    error?: string;
    search?: string;
    role?: string;
    category?: string;
    flagScope?: string;
    flagState?: string;
    user?: string;
    window?: string;
    severity?: string;
    selected?: string;
  }>;
};

const sections: Array<{ id: AdminSection; label: string; group: "org" | "ai" | "integration" }> = [
  { id: "overview", label: "Governance Overview", group: "org" },
  { id: "roles", label: "Users & Roles", group: "org" },
  { id: "programs", label: "All Programs", group: "org" },
  { id: "billing", label: "Billing & Plans", group: "org" },
  { id: "security", label: "Security & SSO", group: "org" },
  { id: "ai-controls", label: "AI Governance", group: "ai" },
  { id: "rollout", label: "Feature Flags & Rollout", group: "ai" },
  { id: "automation", label: "Automation Governance", group: "ai" },
  { id: "audit", label: "AI Audit Log", group: "ai" },
  { id: "risks", label: "Risk Flags", group: "ai" },
  { id: "integrations", label: "Connected Apps", group: "integration" },
  { id: "webhooks", label: "Webhooks", group: "integration" },
];

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const {
    section: rawSection,
    status,
    error,
    search = "",
    role = "all",
    category = "all",
    flagScope = "all",
    flagState = "all",
    user: actor = "all",
    window = "30",
    severity = "all",
    selected = "",
  } = await searchParams;
  const section = resolveSection(rawSection);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login?next=/app/admin");
  }

  const adminData = await getAdminGovernanceOverviewData(supabase, user);

  if (!adminData) {
    notFound();
  }

  const rolesData = section === "roles" ? await getAdminRolesData(supabase, user) : null;
  const aiGovernanceData = section === "ai-controls" ? await getAdminAiGovernanceData(supabase, user) : null;
  const featureFlagsData = section === "rollout" ? await getAdminFeatureFlagsData(supabase, user) : null;
  const automationData = section === "automation" ? await getAdminAutomationGovernanceData(supabase, user) : null;
  const auditData = section === "audit" ? await getAdminAuditData(supabase, user) : null;
  const integrationsData = section === "integrations" ? await getAdminIntegrationsData(supabase, user) : null;
  const securityData = section === "security" ? await getAdminSecuritySsoData(supabase, user) : null;
  const retentionData = section === "billing" ? await getAdminRetentionExportData(supabase, user) : null;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.nav}>
          <div className={styles.sectionLabel}>Organization</div>
          {sections
            .filter((item) => item.group === "org")
            .map((item) => (
              <Link
                key={item.id}
                href={`/app/admin?section=${item.id}`}
                className={section === item.id ? styles.navLinkActive : styles.navLink}
              >
                <span>{item.label}</span>
              </Link>
            ))}

          <div className={styles.sectionLabel}>Innova AI</div>
          {sections
            .filter((item) => item.group === "ai")
            .map((item) => (
              <Link
                key={item.id}
                href={`/app/admin?section=${item.id}`}
                className={section === item.id ? styles.navLinkActive : styles.navLink}
              >
                <span>{item.label}</span>
                {item.id === "risks" && adminData.risks.length > 0 ? (
                  <span className={styles.riskWarn}>{adminData.risks.length}</span>
                ) : null}
              </Link>
            ))}

          <div className={styles.sectionLabel}>Integrations</div>
          {sections
            .filter((item) => item.group === "integration")
            .map((item) => (
              <Link
                key={item.id}
                href={`/app/admin?section=${item.id}`}
                className={section === item.id ? styles.navLinkActive : styles.navLink}
              >
                <span>{item.label}</span>
              </Link>
            ))}
        </aside>

        <main className={styles.main}>
          <div className={styles.header}>
            <div>
              <div className={styles.title}>
                {section === "overview" ? "Governance Overview" : sectionLabel(section)}
              </div>
              <div className={styles.sub}>
                {adminData.organization.name} · {adminData.membershipRole.replaceAll("_", " ")} · enterprise admin surface
              </div>
            </div>
            <div className={styles.actions}>
              <div className={styles.buttonGhost}>
                <AuditExportButton
                  rows={
                    section === "audit" && auditData
                      ? auditData.events.map((row) => ({
                          action: row.title,
                          actorName: row.actorName,
                          createdAt: row.occurredAt,
                          scope: row.category,
                          targetTable: row.severity,
                        }))
                      : adminData.recentAudit
                  }
                  label={section === "audit" ? "Export CSV" : "Export Audit Log"}
                  filename={section === "audit" ? "innovink-admin-audit.csv" : "innovink-audit-log.csv"}
                />
              </div>
              <Link href="/app/admin?section=overview#settings" className={styles.buttonGhost}>
                Settings
              </Link>
            </div>
          </div>

          {status || error ? (
            <div className={styles.notice}>
              {error ? "We could not apply that admin change." : `Status: ${status?.replaceAll("-", " ")}`}
            </div>
          ) : null}

          {section === "overview" ? (
            <>
              <section className={styles.metrics}>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>{adminData.metrics.activePrograms}</div>
                  <div className={styles.metricLabel}>Active programs</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>{adminData.metrics.users}</div>
                  <div className={styles.metricLabel}>Users</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>{adminData.metrics.integrations}</div>
                  <div className={styles.metricLabel}>Integrations</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>{adminData.metrics.aiActions30d}</div>
                  <div className={styles.metricLabel}>AI actions (30d)</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>{adminData.metrics.activePolicies}</div>
                  <div className={styles.metricLabel}>Active policies</div>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardTitle}>Active Risk Flags</div>
                <div className={styles.cardSub}>Real issues derived from governance and integration state, not placeholders.</div>
                <div className={styles.riskList}>
                  {adminData.risks.length ? (
                    adminData.risks.map((risk) => (
                      <div key={risk.id} className={styles.riskRow}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{risk.title}</div>
                          <div className={styles.sub} style={{ marginTop: 4 }}>{risk.detail}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div className={risk.severity === "warning" ? styles.riskWarn : styles.riskInfo}>
                            {risk.severity}
                          </div>
                          <div className={styles.sub} style={{ marginTop: 6 }}>{risk.meta}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.empty}>No active governance risks are currently derived from the organization controls we track.</div>
                  )}
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardTitle}>Innova AI Controls</div>
                <div className={styles.cardSub}>The first admin slice keeps one real org-wide AI toggle and shows real AI governance telemetry.</div>
                <div className={styles.controlList}>
                  <div className={styles.controlRow}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Organization AI access</div>
                      <div className={styles.sub}>Controls whether the organization can actively use Innova workflows.</div>
                    </div>
                    <form action={toggleOrganizationAiAction} className={styles.toggleWrap}>
                      <span className={styles.sub}>{adminData.organization.aiEnabled ? "Enabled" : "Disabled"}</span>
                      <input type="hidden" name="nextState" value={adminData.organization.aiEnabled ? "false" : "true"} />
                      <button
                        className={`${styles.toggle} ${adminData.organization.aiEnabled ? styles.toggleOn : ""}`}
                        type="submit"
                        aria-label={adminData.organization.aiEnabled ? "Disable AI access" : "Enable AI access"}
                      >
                        <span className={styles.toggleKnob} />
                      </button>
                    </form>
                  </div>
                  <div className={styles.controlRow}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>High-risk AI requests (30d)</div>
                      <div className={styles.sub}>Requests recorded with `high` risk classification in the last 30 days.</div>
                    </div>
                    <div className={styles.statusBadge}>{adminData.aiOverview.highRiskRequests30d}</div>
                  </div>
                  <div className={styles.controlRow}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Usage events (30d)</div>
                      <div className={styles.sub}>Observed AI usage events written into the governance telemetry layer.</div>
                    </div>
                    <div className={styles.statusBadge}>{adminData.aiOverview.usageEvents30d}</div>
                  </div>
                  <div className={styles.controlRow}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Token volume (30d)</div>
                      <div className={styles.sub}>Aggregate model token usage from real `ai_usage_events` records.</div>
                    </div>
                    <div className={styles.statusBadge}>{adminData.aiOverview.tokenCount30d.toLocaleString()}</div>
                  </div>
                  <div className={styles.controlRow}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Active providers</div>
                      <div className={styles.sub}>Providers seen in the 30-day usage log.</div>
                    </div>
                    <div className={styles.statusBadge}>
                      {adminData.aiOverview.providers.length ? adminData.aiOverview.providers.join(", ") : "None"}
                    </div>
                  </div>
                </div>
              </section>

              <section className={styles.gridTwo}>
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Recent Audit Activity</div>
                  <div className={styles.auditList}>
                    {adminData.recentAudit.length ? (
                      adminData.recentAudit.map((row) => (
                        <div key={row.id} className={styles.auditRow}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{row.action.replaceAll("_", " ")}</div>
                            <div className={styles.sub}>
                              {row.actorName ?? "System"} · {row.scope} · {row.targetTable ?? "n/a"}
                            </div>
                          </div>
                          <div className={styles.sub}>
                            {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(row.createdAt))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={styles.empty}>No audit records are visible yet for this organization.</div>
                    )}
                  </div>
                </div>

                <div className={styles.card} id="settings">
                  <div className={styles.cardTitle}>Connected Apps</div>
                  {adminData.integrations.length ? (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Integration</th>
                          <th>Status</th>
                          <th>Enabled</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminData.integrations.slice(0, 6).map((integration) => (
                          <tr key={integration.id}>
                            <td>{integration.integrationKey}</td>
                            <td>{integration.configStatus.replaceAll("_", " ")}</td>
                            <td>{integration.enabled ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className={styles.empty}>No integration configurations exist yet for this organization.</div>
                  )}
                </div>
              </section>
            </>
          ) : section === "ai-controls" && aiGovernanceData ? (
            renderAiGovernanceSection(aiGovernanceData)
          ) : section === "rollout" && featureFlagsData ? (
            renderFeatureFlagsSection(featureFlagsData, search, category, flagScope, flagState)
          ) : section === "automation" && automationData ? (
            renderAutomationGovernanceSection(automationData)
          ) : section === "audit" && auditData ? (
            renderAuditSection(auditData, search, category, actor, window, severity)
          ) : section === "integrations" && integrationsData ? (
            renderIntegrationsSection(integrationsData, selected)
          ) : section === "security" && securityData ? (
            renderSecuritySsoSection(securityData)
          ) : section === "billing" && retentionData ? (
            renderRetentionExportSection(retentionData)
          ) : section === "roles" && rolesData ? (
            <>
              <div className={styles.header} style={{ marginBottom: 16 }}>
                <div>
                  <div className={styles.title}>Roles & Access</div>
                  <div className={styles.sub}>
                    {rolesData.organization.name} · {Object.keys(rolesData.summary.roleCounts).length} active org roles ·{" "}
                    {rolesData.summary.totalUsers} users
                  </div>
                </div>
                <form className={styles.actions} action="/app/admin" method="get">
                  <input type="hidden" name="section" value="roles" />
                  <input
                    name="search"
                    defaultValue={search}
                    placeholder="Search users…"
                    style={{
                      width: 220,
                      borderRadius: 12,
                      border: "1px solid rgba(166,185,208,.16)",
                      background: "rgba(255,255,255,.02)",
                      color: "#eae5dc",
                      padding: "10px 12px",
                      fontSize: 12,
                    }}
                  />
                  <select
                    name="role"
                    defaultValue={role}
                    style={{
                      width: 170,
                      borderRadius: 12,
                      border: "1px solid rgba(166,185,208,.16)",
                      background: "rgba(255,255,255,.02)",
                      color: "#eae5dc",
                      padding: "10px 12px",
                      fontSize: 12,
                    }}
                  >
                    <option value="all">All roles</option>
                    <option value="organization_owner">Organization owner</option>
                    <option value="organization_admin">Organization admin</option>
                    <option value="security_compliance_admin">Security compliance admin</option>
                    <option value="ai_governance_admin">AI governance admin</option>
                  </select>
                  <button className={styles.buttonGhost} type="submit">Filter</button>
                </form>
              </div>

              <section className={styles.card}>
                <div className={styles.cardTitle}>Role Permission Matrix</div>
                <div className={styles.cardSub}>Policy-based matrix for the main enterprise roles supported in v1.</div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Permission</th>
                      <th>Workspace Admin</th>
                      <th>Program Manager</th>
                      <th>Sponsor Viewer</th>
                      <th>Judge</th>
                      <th>Mentor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissionRows.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td>{renderPermission(row.workspaceAdmin)}</td>
                        <td>{renderPermission(row.programManager)}</td>
                        <td>{renderPermission(row.sponsorViewer)}</td>
                        <td>{renderPermission(row.judge)}</td>
                        <td>{renderPermission(row.mentor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className={styles.card}>
                <div className={styles.cardTitle}>User access table</div>
                <div className={styles.cardSub}>Real organization memberships with workspace/program role context and safe admin updates.</div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Org Role</th>
                      <th>Workspace Roles</th>
                      <th>Program Roles</th>
                      <th>Last active</th>
                      <th>Status</th>
                      <th>Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterRoleUsers(rolesData.users, search, role).map((row) => (
                      <tr key={row.membershipId}>
                        <td>{row.fullName ?? "Unnamed user"}</td>
                        <td>{row.email ?? "No email"}</td>
                        <td>{humanizeRole(row.organizationRole)}</td>
                        <td>{row.workspaceRoles.length ? row.workspaceRoles.map(humanizeRole).join(", ") : "—"}</td>
                        <td>{row.programRoles.length ? row.programRoles.map(humanizeRole).join(", ") : "—"}</td>
                        <td>{row.lastActiveAt ? formatAdminDate(row.lastActiveAt) : "—"}</td>
                        <td>{row.membershipStatus}</td>
                        <td>
                          <form action={updateOrganizationMembershipAction} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <input type="hidden" name="membershipId" value={row.membershipId} />
                            <select
                              name="role"
                              defaultValue={row.organizationRole}
                              style={{
                                minWidth: 150,
                                borderRadius: 10,
                                border: "1px solid rgba(166,185,208,.16)",
                                background: "rgba(255,255,255,.02)",
                                color: "#eae5dc",
                                padding: "8px 10px",
                                fontSize: 12,
                              }}
                            >
                              <option value="organization_owner">Organization owner</option>
                              <option value="organization_admin">Organization admin</option>
                              <option value="security_compliance_admin">Security compliance admin</option>
                              <option value="ai_governance_admin">AI governance admin</option>
                            </select>
                            <select
                              name="status"
                              defaultValue={row.membershipStatus}
                              style={{
                                minWidth: 120,
                                borderRadius: 10,
                                border: "1px solid rgba(166,185,208,.16)",
                                background: "rgba(255,255,255,.02)",
                                color: "#eae5dc",
                                padding: "8px 10px",
                                fontSize: 12,
                              }}
                            >
                              <option value="invited">Invited</option>
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                              <option value="revoked">Revoked</option>
                            </select>
                            <button className={styles.buttonGhost} type="submit">Save</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filterRoleUsers(rolesData.users, search, role).length === 0 ? (
                  <div className={styles.empty}>No users matched the current role filter.</div>
                ) : null}
              </section>
            </>
          ) : (
            <section className={styles.card}>
              <div className={styles.cardTitle}>{sectionLabel(section)}</div>
              <div className={styles.empty}>
                This admin section is the next step in the journey and now has a working route and nav state, but its dedicated screen is not implemented yet.
                The governance overview is the first fully live admin surface.
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function resolveSection(value: string | undefined): AdminSection {
  if (!value) return "overview";
  return sections.some((section) => section.id === value) ? (value as AdminSection) : "overview";
}

function renderAiGovernanceSection(data: AdminAiGovernanceData) {
  const maxUsageCount = Math.max(...data.usageBreakdown.map((row) => row.count), 1);

  return (
    <>
      <section className={styles.metrics}>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{data.metrics.actions30d.toLocaleString()}</div>
          <div className={styles.metricLabel}>AI actions this month</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{data.metrics.withinPolicyPercent}%</div>
          <div className={styles.metricLabel}>Within policy</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{data.metrics.humanReviewed30d}</div>
          <div className={styles.metricLabel}>Human reviewed</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{data.metrics.policyViolations30d}</div>
          <div className={styles.metricLabel}>Policy violations</div>
        </div>
      </section>

      <div className={styles.aiGrid}>
        <div>
          <div className={styles.aiSectionLabel}>AI Policy Controls</div>

          <form action={saveAiGovernancePoliciesAction} id="ai-governance-form" className={styles.card}>
            <div className={styles.cardTitle}>Content & Generation Policies</div>
            <div className={styles.cardSub}>
              Organization-scoped AI controls backed by governance policy versions and approval telemetry.
            </div>

            <div className={styles.aiSubCard}>
              <div className={styles.cardTitle}>Organization access</div>
              <div className={styles.cardSub}>Top-level control for whether the organization can actively use Innova workflows.</div>
              <label className={styles.selectRow}>
                <span className={styles.aiPolicyTitle}>Organization AI access</span>
                <select
                  className={styles.selectInput}
                  name="organizationAiEnabled"
                  defaultValue={data.policySnapshot.organizationAiEnabled ? "true" : "false"}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </label>
            </div>

            <AiPolicyCheckbox
              name="emailDraftApprovalRequired"
              defaultChecked={data.policySnapshot.emailDraftApprovalRequired}
              title="AI-generated email drafts require human approval"
              description="Outbound communications drafted by Innova remain approval-gated before any send action."
            />
            <AiPolicyCheckbox
              name="scoringAdvisoryOnly"
              defaultChecked={data.policySnapshot.scoringAdvisoryOnly}
              title="AI scoring assistance is advisory only"
              description="Innova can help summarize or calibrate, but judges and program managers remain the final decision makers."
            />
            <AiPolicyCheckbox
              name="automatedResultAnnouncements"
              defaultChecked={data.policySnapshot.automatedResultAnnouncements}
              title="Automated result announcements"
              description="Allow approved result communications to be executed automatically after the PM completes the final decision workflow."
            />
            <AiPolicyCheckbox
              name="logAllGeneratedContent"
              defaultChecked={data.policySnapshot.logAllGeneratedContent}
              title="Log all AI-generated content"
              description="Persist AI-generated outputs and governance metadata so audits and review trails remain visible."
            />

            <div className={styles.aiSubCard}>
              <div className={styles.cardTitle}>Data & Privacy Policies</div>
              <AiPolicyCheckbox
                name="anonymizePii"
                defaultChecked={data.policySnapshot.anonymizePii}
                title="Anonymize PII before AI processing"
                description="Strip or minimize direct identifiers before AI workflows process participant or submission content."
              />
              <AiPolicyCheckbox
                name="historicalProgramsOptIn"
                defaultChecked={data.policySnapshot.historicalProgramsOptIn}
                title="Allow Innova to reference historical programs"
                description="Permit AI workflows to use prior organization program data as guidance for future recommendations."
              />
            </div>

            <div className={styles.aiSubCard}>
              <div className={styles.cardTitle}>Automation Thresholds</div>
              <div className={styles.rangeGroup}>
                <label className={styles.rangeHeader} htmlFor="mentor-threshold">
                  <span>Auto-approve mentor bookings (match score ≥)</span>
                  <span>{data.policySnapshot.autoApproveMentorBookingsThreshold}%</span>
                </label>
                <input
                  id="mentor-threshold"
                  className={styles.rangeInput}
                  type="range"
                  min={50}
                  max={100}
                  name="autoApproveMentorBookingsThreshold"
                  defaultValue={data.policySnapshot.autoApproveMentorBookingsThreshold}
                />
                <div className={styles.rangeScale}>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className={styles.rangeGroup}>
                <label className={styles.rangeHeader} htmlFor="confidence-threshold">
                  <span>Auto-flag submissions for review (AI confidence ≤)</span>
                  <span>{data.policySnapshot.autoFlagLowConfidenceThreshold}%</span>
                </label>
                <input
                  id="confidence-threshold"
                  className={styles.rangeInput}
                  type="range"
                  min={30}
                  max={90}
                  name="autoFlagLowConfidenceThreshold"
                  defaultValue={data.policySnapshot.autoFlagLowConfidenceThreshold}
                />
                <div className={styles.rangeScale}>
                  <span>30%</span>
                  <span>90%</span>
                </div>
              </div>
            </div>

            <div className={styles.aiFooter}>
              <div className={styles.sub}>
                {data.policyRecord.versionNumber
                  ? `Version ${data.policyRecord.versionNumber} · ${data.policyRecord.status ?? "draft"}`
                  : "No organization AI policy has been saved yet."}
              </div>
              <button className={styles.button} type="submit">
                Save policies
              </button>
            </div>
          </form>
        </div>

        <div>
          <div className={styles.aiSectionLabel}>AI Usage Breakdown</div>

          <section className={styles.card}>
            <div className={styles.cardTitle}>Actions by category</div>
            <div className={styles.cardSub}>Last 30 days, grouped from real feature usage and review activity.</div>
            <div className={styles.aiUsageList}>
              {data.usageBreakdown.length ? (
                data.usageBreakdown.map((row) => (
                  <div key={row.key} className={styles.aiUsageRow}>
                    <div className={styles.aiUsageLabel}>{row.label}</div>
                    <div className={styles.aiUsageBar}>
                      <div
                        className={styles.aiUsageFill}
                        style={{ width: `${Math.max((row.count / maxUsageCount) * 100, 8)}%` }}
                      />
                    </div>
                    <div className={styles.aiUsageCount}>{row.count.toLocaleString()}</div>
                  </div>
                ))
              ) : (
                <div className={styles.empty}>No AI requests have been recorded in the last 30 days yet.</div>
              )}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitle}>Policy Violations</div>
            <div className={styles.aiViolationList}>
              {data.violations.length ? (
                data.violations.map((row) => (
                  <div key={row.id} className={styles.aiViolationCard}>
                    <div className={styles.aiViolationStamp}>{formatAdminDateTime(row.occurredAt)} · blocked</div>
                    <div className={styles.aiViolationTitle}>{row.title}</div>
                    <div className={styles.cardSub}>{row.detail}</div>
                  </div>
                ))
              ) : (
                <div className={styles.empty}>No rejected AI reviews were recorded in the last 30 days.</div>
              )}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitle}>Human review queue</div>
            <div className={styles.cardSub}>
              {data.reviewQueue.total} reviewed · {data.reviewQueue.approved} approved · {data.reviewQueue.rejected} rejected · {data.reviewQueue.pending} pending
            </div>
            <div className={styles.aiProviderList}>
              {data.providerPolicies.length ? (
                data.providerPolicies.map((row) => (
                  <div key={row.id} className={styles.aiProviderRow}>
                    <div>
                      <div className={styles.aiProviderTitle}>{humanizeKey(row.providerKey)}</div>
                      <div className={styles.sub}>
                        {row.allowedModelsCount} allowed model{row.allowedModelsCount === 1 ? "" : "s"}
                        {row.tokenLimit ? ` · ${row.tokenLimit.toLocaleString()} monthly token limit` : ""}
                      </div>
                    </div>
                    <div className={row.enabled ? styles.statusBadge : styles.riskInfo}>
                      {row.enabled ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.empty}>No provider policies have been configured yet for this organization.</div>
              )}
            </div>
            <div className={styles.aiFooter} style={{ marginTop: 14 }}>
              <div className={styles.buttonGhost}>
                <AuditExportButton
                  rows={data.exportRows.map((row) => ({
                    action: row.featureKey,
                    actorName: row.reviewerName,
                    createdAt: row.createdAt,
                    scope: row.reviewStatus,
                    targetTable: row.requestStatus,
                  }))}
                  label="Export AI log"
                  filename="innovink-ai-log.csv"
                />
              </div>
              <Link href="/app/admin?section=audit" className={styles.buttonGhost}>
                View review queue
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function AiPolicyCheckbox({
  name,
  title,
  description,
  defaultChecked,
}: {
  name: string;
  title: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className={styles.aiPolicyRow}>
      <input className={styles.aiCheckbox} type="checkbox" name={name} defaultChecked={defaultChecked} />
      <span className={styles.aiPolicyBody}>
        <span className={styles.aiPolicyTitle}>{title}</span>
        <span className={styles.cardSub}>{description}</span>
      </span>
    </label>
  );
}

function renderFeatureFlagsSection(
  data: AdminFeatureFlagData,
  search: string,
  category: string,
  flagScope: string,
  flagState: string,
) {
  const filteredFlags = filterFeatureFlags(data.flags, {
    search,
    category,
    scope: flagScope,
    state: flagState,
  });
  const groupedFlags = [
    { key: "ai_features", label: "AI Features", accentClass: styles.flagGroupAi },
    { key: "judging", label: "Judging", accentClass: styles.flagGroupJudging },
    { key: "automation", label: "Automation", accentClass: styles.flagGroupAutomation },
  ] as const;
  const totalFlags = data.flags.length;
  const enabledOrg = data.flags.filter((flag) => flag.enabled && flag.scope === "organization").length;
  const inRollout = data.flags.filter((flag) => flag.rolloutPercent > 0 && flag.rolloutPercent < 100).length;
  const lockedFlags = data.flags.filter((flag) => flag.locked).length;
  const recentChanges = [...data.flags]
    .filter((flag) => Boolean(flag.changedAt))
    .sort((left, right) => (right.changedAt ?? "").localeCompare(left.changedAt ?? ""))
    .slice(0, 6);
  const partialRollouts = data.flags
    .filter((flag) => flag.rolloutPercent > 0 && flag.rolloutPercent < 100)
    .sort((left, right) => right.rolloutPercent - left.rolloutPercent);

  return (
    <>
      <section className={styles.metrics}>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{totalFlags}</div>
          <div className={styles.metricLabel}>Total flags</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{enabledOrg}</div>
          <div className={styles.metricLabel}>Enabled (org)</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{inRollout}</div>
          <div className={styles.metricLabel}>In rollout</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{lockedFlags}</div>
          <div className={styles.metricLabel}>Locked by Innovink</div>
        </div>
      </section>

      <form className={styles.filterBar} action="/app/admin" method="get">
        <input type="hidden" name="section" value="rollout" />
        <input
          className={styles.filterInput}
          name="search"
          defaultValue={search}
          placeholder="Search flags..."
        />
        <select className={styles.filterSelect} name="category" defaultValue={category}>
          <option value="all">All categories</option>
          <option value="ai_features">AI features</option>
          <option value="judging">Judging</option>
          <option value="automation">Automation</option>
        </select>
        <select className={styles.filterSelect} name="flagScope" defaultValue={flagScope}>
          <option value="all">All scopes</option>
          <option value="organization">Org-level</option>
          <option value="workspace">Workspace-level</option>
          <option value="beta">Beta</option>
        </select>
        <select className={styles.filterSelect} name="flagState" defaultValue={flagState}>
          <option value="all">All states</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
          <option value="rollout">Partial rollout</option>
        </select>
        <button className={styles.buttonGhost} type="submit">Filter</button>
      </form>

      <div className={styles.flagsLayout}>
        <form action={saveFeatureFlagsAction} className={styles.card}>
          <div className={styles.cardTitle}>Feature flags</div>
          <div className={styles.cardSub}>
            Organization-scoped rollout controls persisted through governance policy versions.
          </div>
          <input type="hidden" name="policyVersionId" value={data.policyRecord.id ?? ""} />

          <div className={styles.flagTable}>
            <div className={styles.flagHeader}>
              <span>Flag</span>
              <span>State</span>
              <span>Rollout %</span>
              <span>Scope</span>
              <span>Description</span>
              <span>Changed</span>
            </div>

            {groupedFlags.map((group) => {
              const groupFlags = filteredFlags.filter((flag) => flag.category === group.key);
              if (groupFlags.length === 0) {
                return null;
              }

              return (
                <div key={group.key}>
                  <div className={`${styles.flagGroupLabel} ${group.accentClass}`}>{group.label}</div>
                  {groupFlags.map((flag) => (
                    <div key={flag.key} className={styles.flagRow}>
                      <div>
                        <div className={styles.flagKey}>{flag.label}</div>
                        <div className={styles.flagSub}>{flag.sublabel}</div>
                      </div>
                      <label className={styles.flagToggleWrap}>
                        <input
                          type="checkbox"
                          name={`enabled__${flag.key}`}
                          value="true"
                          defaultChecked={flag.enabled}
                          disabled={flag.locked}
                          className={styles.flagCheckbox}
                        />
                        <span className={`${styles.flagToggle} ${flag.enabled ? styles.flagToggleOn : ""} ${flag.locked ? styles.flagToggleLocked : ""}`}>
                          <span className={styles.flagToggleKnob} />
                        </span>
                      </label>
                      <div>
                        <input
                          className={styles.rolloutRange}
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          name={`rollout__${flag.key}`}
                          defaultValue={flag.rolloutPercent}
                          disabled={flag.locked}
                        />
                        <div className={styles.rolloutValue}>{flag.rolloutPercent}%</div>
                      </div>
                      <div>
                        <select
                          className={styles.flagSelect}
                          name={`scope__${flag.key}`}
                          defaultValue={flag.scope}
                          disabled={flag.locked}
                        >
                          <option value="organization">Org</option>
                          <option value="workspace">Workspace</option>
                          <option value="beta">Beta</option>
                        </select>
                      </div>
                      <div className={styles.flagDescription}>{flag.description}</div>
                      <div className={styles.flagChanged}>{flag.changedAt ? formatAdminDateTime(flag.changedAt) : "Never"}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {filteredFlags.length === 0 ? (
            <div className={styles.empty}>No feature flags matched the current rollout filters.</div>
          ) : null}

          <div className={styles.aiFooter}>
            <div className={styles.sub}>
              {data.policyRecord.versionNumber
                ? `Active rollout policy v${data.policyRecord.versionNumber}`
                : "No saved rollout policy yet"}
            </div>
            <button className={styles.button} type="submit">Save rollout policy</button>
          </div>
        </form>

        <aside className={styles.sideCard}>
          <div className={styles.aiSectionLabel}>Recent changes</div>
          <div className={styles.sideList}>
            {recentChanges.length ? (
              recentChanges.map((flag) => (
                <div key={flag.key} className={styles.sideEntry}>
                  <div className={styles.sideTitle}>
                    {flag.label} {"->"} {flag.rolloutPercent}%
                  </div>
                  <div className={styles.sideMeta}>
                    Org policy update {"·"} {flag.changedAt ? formatAdminDateTime(flag.changedAt) : "Never"}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.empty}>No rollout policy changes have been saved yet.</div>
            )}
          </div>

          <div className={styles.aiSectionLabel} style={{ marginTop: 18 }}>Partial rollout</div>
          <div className={styles.sideList}>
            {partialRollouts.length ? (
              partialRollouts.map((flag) => (
                <div key={flag.key} className={styles.rolloutListRow}>
                  <div>
                    <div className={styles.sideTitle}>{flag.label}</div>
                    <div className={styles.sideMeta}>{humanizeKey(flag.scope)} scope</div>
                  </div>
                  <div className={styles.riskWarn}>{flag.rolloutPercent}%</div>
                </div>
              ))
            ) : (
              <div className={styles.empty}>No partial rollouts are active right now.</div>
            )}
          </div>

          <div className={styles.aiSectionLabel} style={{ marginTop: 18 }}>Rollout recommendation</div>
          <div className={styles.cardSub}>
            Keep high-risk AI capabilities in staged rollout until audit volume stays clean and operator overrides remain low.
          </div>
        </aside>
      </div>
    </>
  );
}

function renderAutomationGovernanceSection(data: AdminAutomationGovernanceData) {
  return (
    <>
      <section className={styles.card}>
        <div className={styles.automationBanner}>
          <div>
            <div className={styles.cardTitle}>Safety mode: {humanizeKey(data.safetyMode)}</div>
            <div className={styles.cardSub}>
              High-impact automation remains governed by explicit policy, approval thresholds, and auditable execution boundaries.
            </div>
          </div>
          <div className={styles.automationModeChip}>{humanizeKey(data.safetyMode)}</div>
        </div>
      </section>

      <div className={styles.flagsLayout}>
        <form action={saveAutomationGovernanceAction} className={styles.card}>
          <div className={styles.cardTitle}>Global policy controls</div>
          <div className={styles.cardSub}>
            Organization-scoped automation governance persisted through policy versions.
          </div>

          <div className={styles.aiSubCard}>
            <label className={styles.selectRow}>
              <span className={styles.aiPolicyTitle}>Safety mode</span>
              <select className={styles.selectInput} name="safetyMode" defaultValue={data.safetyMode}>
                <option value="human_in_the_loop">Human-in-the-loop</option>
                <option value="supervised_autonomous">Supervised autonomous</option>
                <option value="full_autonomous">Full autonomous</option>
              </select>
            </label>
          </div>

          <div className={styles.aiSubCard}>
            <div className={styles.cardTitle}>Approval thresholds</div>
            <div className={styles.ruleConfigRow}>
              <div>
                <div className={styles.aiPolicyTitle}>Require approval: communications to more than N participants</div>
                <div className={styles.sub}>Bulk outbound comms stay review-gated above this threshold.</div>
              </div>
              <input
                className={styles.smallNumberInput}
                name="participantCommsThreshold"
                type="number"
                min={1}
                defaultValue={data.approvalThresholds.participantCommsThreshold}
              />
            </div>
            <div className={styles.ruleConfigRow}>
              <div>
                <div className={styles.aiPolicyTitle}>Require approval: bulk participant status changes</div>
                <div className={styles.sub}>Status actions affecting more than this many participants trigger approval.</div>
              </div>
              <input
                className={styles.smallNumberInput}
                name="bulkStatusChangesThreshold"
                type="number"
                min={1}
                defaultValue={data.approvalThresholds.bulkStatusChangesThreshold}
              />
            </div>
            <AiPolicyCheckbox
              name="requireScoringDeadlineChangesApproval"
              defaultChecked={data.approvalThresholds.requireScoringDeadlineChangesApproval}
              title="Require approval for scoring deadline changes"
              description="Automated deadline extensions or compressions remain review-gated."
            />
            <AiPolicyCheckbox
              name="requireActiveProgramPhaseChangesApproval"
              defaultChecked={data.approvalThresholds.requireActiveProgramPhaseChangesApproval}
              title="Require approval for active program phase changes"
              description="Track and phase changes on running programs require explicit sign-off."
            />
          </div>

          <div className={styles.aiSubCard}>
            <div className={styles.cardTitle}>Automation restrictions</div>
            <AiPolicyCheckbox
              name="blockDataDeletion"
              defaultChecked={data.restrictions.blockDataDeletion}
              title="Block automations from deleting data"
              description="Participant data, submissions, and audit records cannot be deleted by automation."
            />
            <AiPolicyCheckbox
              name="blockJudgingAssignmentChanges"
              defaultChecked={data.restrictions.blockJudgingAssignmentChanges}
              title="Block automations from changing judging assignments"
              description="Judge reassignment remains a manual PM action."
            />
            <AiPolicyCheckbox
              name="allowExternalNotifications"
              defaultChecked={data.restrictions.allowExternalNotifications}
              title="Allow external notifications"
              description="Enables Slack, Teams, and webhook automations without extra approval."
            />
            <AiPolicyCheckbox
              name="dryRunMode"
              defaultChecked={data.restrictions.dryRunMode}
              title="Dry-run mode for new rules"
              description="New rules preview execution before going live."
            />
          </div>

          <div className={styles.aiSubCard}>
            <div className={styles.cardTitle}>Active automation rules ({data.rules.length})</div>
            <div className={styles.automationRuleTable}>
              <div className={styles.automationRuleHeader}>
                <span>Rule</span>
                <span>Trigger to action</span>
                <span>Risk</span>
                <span>Status</span>
              </div>
              {data.rules.map((rule) => (
                <div key={rule.key} className={styles.automationRuleRow}>
                  <div>
                    <div className={styles.flagKey}>{rule.label}</div>
                    <div className={styles.flagSub}>{rule.category}</div>
                  </div>
                  <div className={styles.flagDescription}>{rule.triggerAction}</div>
                  <div>
                    <span
                      className={`${styles.riskBadge} ${
                        rule.riskLevel === "high"
                          ? styles.riskBadgeHigh
                          : rule.riskLevel === "medium"
                            ? styles.riskBadgeMed
                            : styles.riskBadgeLow
                      }`}
                    >
                      {rule.riskLevel}
                    </span>
                  </div>
                  <div className={rule.status === "pending_approval" ? styles.riskWarn : styles.statusBadge}>
                    {humanizeKey(rule.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.aiFooter}>
            <Link href="/app/admin?section=audit" className={styles.buttonGhost}>
              View audit log
            </Link>
            <button className={styles.button} type="submit">Save governance settings</button>
          </div>
        </form>

        <aside className={styles.sideCard}>
          <div className={styles.aiSectionLabel}>Pending approvals</div>
          <div className={styles.sideList}>
            {data.pendingApprovals.length ? (
              data.pendingApprovals.map((item) => (
                <div key={item.id} className={styles.sideEntry}>
                  <div className={styles.sideTitle}>{item.title}</div>
                  <div className={styles.sideMeta}>{item.detail}</div>
                </div>
              ))
            ) : (
              <div className={styles.empty}>No pending approval packets are currently visible for this organization.</div>
            )}
          </div>

          <div className={styles.aiSectionLabel} style={{ marginTop: 18 }}>Automation health</div>
          <div className={styles.sideMetricsCard}>
            <div className={styles.sideMetricRow}><span>Active rules</span><span>{data.health.activeRules}</span></div>
            <div className={styles.sideMetricRow}><span>Runs today</span><span>{data.health.runsToday}</span></div>
            <div className={styles.sideMetricRow}><span>Failed today</span><span>{data.health.failedToday}</span></div>
            <div className={styles.sideMetricRow}><span>Last run</span><span>{data.health.lastRunAt ? formatAdminDateTime(data.health.lastRunAt) : "None"}</span></div>
          </div>

          {data.recentFailures.length ? (
            <div className={styles.failureCard}>
              <div className={styles.failureTitle}>{data.recentFailures.length} failed runs</div>
              <div className={styles.sideMeta}>{data.recentFailures[0]?.detail}</div>
              <Link href="/app/admin?section=audit" className={styles.failureLink}>View failure log</Link>
            </div>
          ) : null}

          <div className={styles.recommendationCard}>
            <div className={styles.recommendationTitle}>Innova</div>
            <div className={styles.sideMeta}>
              Keep dry-run mode enabled for newly created rules until the audit stream shows stable low-risk execution behavior.
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function renderAuditSection(
  data: AdminAuditData,
  search: string,
  category: string,
  actor: string,
  window: string,
  severity: string,
) {
  const filteredEvents = filterAuditEvents(data.events, {
    search,
    category,
    actor,
    window,
    severity,
  });

  const infoCount = filteredEvents.filter((row) => row.severity === "info").length;
  const warningCount = filteredEvents.filter((row) => row.severity === "warning").length;
  const criticalCount = filteredEvents.filter((row) => row.severity === "critical").length;

  const earliest = filteredEvents.at(-1)?.occurredAt ?? null;
  const latest = filteredEvents[0]?.occurredAt ?? null;

  return (
    <>
      <form className={styles.auditFilterBar} action="/app/admin" method="get">
        <input type="hidden" name="section" value="audit" />
        <input
          className={styles.auditSearch}
          name="search"
          defaultValue={search}
          placeholder="Search events, users, resources..."
        />
        <select className={styles.selectInput} name="category" defaultValue={category}>
          <option value="all">All categories</option>
          <option value="user">User actions</option>
          <option value="ai">AI actions</option>
          <option value="system">System events</option>
          <option value="security">Security</option>
        </select>
        <select className={styles.selectInput} name="user" defaultValue={actor}>
          <option value="all">All users</option>
          {data.availableActors.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select className={styles.selectInput} name="window" defaultValue={window}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <select className={styles.selectInput} name="severity" defaultValue={severity}>
          <option value="all">All severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <button className={styles.buttonGhost} type="submit">
          Filter
        </button>
      </form>

      <div className={styles.auditSummary}>
        <div className={styles.sub}>
          Showing {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"}
          {earliest && latest
            ? ` · ${formatAdminDate(latest)} – ${formatAdminDate(earliest)}`
            : ""}
        </div>
        <div className={styles.auditBadges}>
          <span className={styles.riskInfo}>{infoCount} Info</span>
          <span className={styles.riskWarn}>{warningCount} Warning</span>
          <span className={styles.criticalBadge}>{criticalCount} Critical</span>
        </div>
      </div>

      <section className={styles.card} style={{ padding: 0 }}>
        <div className={styles.auditHeaderRow}>
          <div>Timestamp</div>
          <div>Category</div>
          <div />
          <div>Event</div>
          <div>Actor</div>
          <div>Severity</div>
        </div>

        {filteredEvents.length ? (
          filteredEvents.map((row) => (
            <div
              key={row.id}
              className={`${styles.auditEventRow} ${
                row.severity === "critical"
                  ? styles.auditCritical
                  : row.severity === "warning"
                    ? styles.auditWarning
                    : ""
              }`}
            >
              <div className={styles.auditTimestamp}>{formatAdminDateTime(row.occurredAt)}</div>
              <div>
                <span className={row.category === "ai" ? styles.auditCategoryAi : styles.auditCategory}>
                  {row.category}
                </span>
              </div>
              <div className={styles.auditDotWrap}>
                <div
                  className={`${styles.auditDot} ${
                    row.severity === "critical"
                      ? styles.auditDotCritical
                      : row.severity === "warning"
                        ? styles.auditDotWarning
                        : styles.auditDotInfo
                  }`}
                />
              </div>
              <div>
                <div className={styles.auditEventTitle}>{row.title}</div>
                <div className={styles.cardSub}>{row.detail}</div>
              </div>
              <div className={row.actorType === "innova" ? styles.auditActorAi : styles.auditActor}>
                {row.actorName ?? (row.actorType === "innova" ? "Innova AI" : "System")}
              </div>
              <div>
                <span
                  className={
                    row.severity === "critical"
                      ? styles.criticalBadge
                      : row.severity === "warning"
                        ? styles.riskWarn
                        : styles.riskInfo
                  }
                >
                  {row.severity}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.empty}>No audit events matched the current filters.</div>
        )}
      </section>
    </>
  );
}

function renderIntegrationsSection(data: AdminIntegrationsData, selected: string) {
  const configuredMap = new Map(data.integrations.map((row) => [row.integrationKey, row]));
  const connectedItems = integrationCatalog.filter((item) => configuredMap.has(item.key));
  const availableItems = integrationCatalog.filter((item) => !configuredMap.has(item.key));
  const selectedKey = selected || connectedItems[0]?.key || availableItems[0]?.key || "";
  const selectedCatalog = integrationCatalog.find((item) => item.key === selectedKey) ?? null;
  const selectedConfig = selectedCatalog ? configuredMap.get(selectedCatalog.key) ?? null : null;

  const connectedCount = data.integrations.filter(
    (row) => row.enabled && row.configStatus === "configured",
  ).length;
  const attentionCount = data.integrations.filter((row) => row.configStatus === "error").length;
  const apiCallsToday = data.integrations.reduce((sum, row) => {
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    return sum + (typeof metadata.apiCallsToday === "number" ? metadata.apiCallsToday : 0);
  }, 0);

  return (
    <>
      <section className={styles.metrics}>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{connectedCount}</div>
          <div className={styles.metricLabel}>Connected</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{attentionCount}</div>
          <div className={styles.metricLabel}>Needs attention</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{integrationCatalog.length}</div>
          <div className={styles.metricLabel}>Available</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{apiCallsToday.toLocaleString()}</div>
          <div className={styles.metricLabel}>API calls today</div>
        </div>
      </section>

      <div className={styles.aiSectionLabel}>Connected</div>
      <div className={styles.integrationGrid}>
        {connectedItems.length ? (
          connectedItems.map((item) => {
            const config = configuredMap.get(item.key)!;
            const metadata = getIntegrationMetadata(config.metadata);
            return (
              <section
                key={item.key}
                className={`${styles.integrationCard} ${
                  config.configStatus === "error" ? styles.integrationCardWarning : styles.integrationCardConnected
                }`}
              >
                <div className={styles.integrationHeader}>
                  <div className={styles.integrationIdentity}>
                    <div className={styles.integrationLogo}>{item.logo}</div>
                    <div>
                      <div className={styles.integrationTitle}>{item.label}</div>
                      <div className={styles.cardSub}>{item.category}</div>
                    </div>
                  </div>
                  <div
                    className={
                      config.configStatus === "error" ? styles.auditDotWarning : styles.auditDotInfo
                    }
                    style={{ width: 10, height: 10 }}
                  />
                </div>
                <div className={styles.integrationBodyText}>
                  {metadata.summary ?? item.summary}
                </div>
                <div className={styles.integrationFooter}>
                  <div className={styles.sub}>
                    {metadata.statusNote ??
                      `Updated ${formatAdminDate(config.updatedAt)} · ${humanizeKey(config.configStatus)}`}
                  </div>
                  <div className={styles.integrationActions}>
                    <Link
                      href={`/app/admin?section=integrations&selected=${encodeURIComponent(item.key)}`}
                      className={styles.buttonGhost}
                    >
                      Configure
                    </Link>
                    <form action={manageIntegrationConfigurationAction}>
                      <input type="hidden" name="integrationKey" value={item.key} />
                      <input
                        type="hidden"
                        name="intent"
                        value={config.configStatus === "error" ? "reconnect" : config.enabled ? "disable" : "enable"}
                      />
                      <button
                        className={config.configStatus === "error" ? styles.button : styles.buttonGhost}
                        type="submit"
                      >
                        {config.configStatus === "error"
                          ? "Reconnect"
                          : config.enabled
                            ? "Disable"
                            : "Enable"}
                      </button>
                    </form>
                  </div>
                </div>
              </section>
            );
          })
        ) : (
          <div className={styles.empty}>No organization integrations have been configured yet.</div>
        )}
      </div>

      <div className={styles.aiSectionLabel} style={{ marginTop: 24 }}>Available to connect</div>
      <div className={styles.integrationGrid}>
        {availableItems.map((item) => (
          <section key={item.key} className={styles.integrationCard}>
            <div className={styles.integrationHeader}>
              <div className={styles.integrationIdentity}>
                <div className={styles.integrationLogoMuted}>{item.logo}</div>
                <div>
                  <div className={styles.integrationTitle}>{item.label}</div>
                  <div className={styles.cardSub}>{item.category}</div>
                </div>
              </div>
            </div>
            <div className={styles.integrationBodyText}>{item.summary}</div>
            <div className={styles.integrationFooter}>
              <div className={styles.sub}>Not configured</div>
              <div className={styles.integrationActions}>
                <Link
                  href={`/app/admin?section=integrations&selected=${encodeURIComponent(item.key)}`}
                  className={styles.buttonGhost}
                >
                  Configure
                </Link>
                <form action={manageIntegrationConfigurationAction}>
                  <input type="hidden" name="integrationKey" value={item.key} />
                  <input type="hidden" name="intent" value="connect" />
                  <button className={styles.buttonGhost} type="submit">
                    Connect
                  </button>
                </form>
              </div>
            </div>
          </section>
        ))}
      </div>

      {selectedCatalog ? (
        <section className={styles.card} id="api-keys" style={{ marginTop: 24 }}>
          <div className={styles.cardTitle}>{selectedCatalog.label} configuration</div>
          <div className={styles.cardSub}>
            This detail card uses the real org integration row and keeps the actions honest while the deeper OAuth/API-key setup UI is still coming.
          </div>
          <div className={styles.integrationDetailGrid}>
            <div>
              <div className={styles.integrationDetailLabel}>Status</div>
              <div className={styles.integrationDetailValue}>
                {selectedConfig ? humanizeKey(selectedConfig.configStatus) : "Not configured"}
              </div>
            </div>
            <div>
              <div className={styles.integrationDetailLabel}>Category</div>
              <div className={styles.integrationDetailValue}>{selectedCatalog.category}</div>
            </div>
            <div>
              <div className={styles.integrationDetailLabel}>Enablement</div>
              <div className={styles.integrationDetailValue}>
                {selectedConfig?.enabled ? "Enabled" : "Disabled"}
              </div>
            </div>
            <div>
              <div className={styles.integrationDetailLabel}>Last updated</div>
              <div className={styles.integrationDetailValue}>
                {selectedConfig ? formatAdminDateTime(selectedConfig.updatedAt) : "Not yet configured"}
              </div>
            </div>
          </div>
          <div className={styles.aiFooter}>
            <div className={styles.sub}>
              {selectedCatalog.detail}
            </div>
            <div className={styles.integrationActions}>
              <Link href="/app/admin?section=webhooks" className={styles.buttonGhost}>
                API keys
              </Link>
              <form action={manageIntegrationConfigurationAction}>
                <input type="hidden" name="integrationKey" value={selectedCatalog.key} />
                <input
                  type="hidden"
                  name="intent"
                  value={selectedConfig?.configStatus === "error" ? "reconnect" : selectedConfig ? "enable" : "connect"}
                />
                <button className={styles.button} type="submit">
                  {selectedConfig ? "Refresh configuration" : "Connect integration"}
                </button>
              </form>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

function renderSecuritySsoSection(data: AdminSecuritySsoData) {
  return (
    <div className={styles.identityShell}>
      <aside className={styles.identityNav}>
        <div className={styles.sectionLabel}>Identity</div>
        <div className={`${styles.identityNavItem} ${styles.identityNavItemDone}`}>SSO Overview</div>
        <div className={`${styles.identityNavItem} ${styles.identityNavItemActive}`}>SAML / OIDC Config</div>
        <div className={styles.identityNavItem}>SCIM Provisioning</div>
        <div className={styles.identityNavItem}>Attribute Mapping</div>
        <div className={styles.identityNavItem}>Session Policy</div>
        <div className={styles.sectionLabel}>Provisioning</div>
        <div className={styles.identityNavItem}>User sync log</div>
        <div className={styles.identityNavItem}>Audit log</div>
      </aside>

      <div className={styles.identityMain}>
        <div className={styles.aiSectionLabel}>Identity Provider</div>
        <form action={saveSecuritySsoConfigurationAction}>
          <div className={styles.identityProviderRow}>
            {identityProviderOptions.map((provider) => (
              <label
                key={provider.key}
                className={
                  data.configuration.providerKey === provider.key
                    ? styles.identityProviderActive
                    : styles.identityProvider
                }
              >
                <input
                  type="radio"
                  name="providerKey"
                  value={provider.key}
                  defaultChecked={data.configuration.providerKey === provider.key}
                  className={styles.identityProviderInput}
                />
                <span className={styles.integrationLogo}>{provider.logo}</span>
                <span>{provider.label}</span>
              </label>
            ))}
          </div>

          <section className={styles.card}>
            <div className={styles.identitySectionHeader}>
              <span>SAML 2.0 Configuration</span>
              <span className={data.providerConfig.enabled ? styles.statusBadge : styles.riskWarn}>
                {data.providerConfig.enabled ? "Connected" : humanizeKey(data.providerConfig.configStatus)}
              </span>
            </div>
            <div className={styles.identityFieldGroup}>
              <div className={styles.integrationDetailLabel}>Entity ID (SP)</div>
              <div className={styles.identityCodeBlock}>{data.configuration.entityId}</div>
            </div>
            <div className={styles.identityFieldGroup}>
              <div className={styles.integrationDetailLabel}>ACS URL</div>
              <div className={styles.identityCodeBlock}>{data.configuration.acsUrl}</div>
            </div>
            <div className={styles.identityFieldGroup}>
              <div className={styles.integrationDetailLabel}>IdP Metadata URL</div>
              <input
                className={styles.auditSearch}
                name="idpMetadataUrl"
                defaultValue={data.configuration.idpMetadataUrl}
              />
            </div>
            <div className={styles.identityTwoUp}>
              <div className={styles.identityFieldGroup}>
                <div className={styles.integrationDetailLabel}>Signing certificate</div>
                <input
                  className={styles.auditSearch}
                  name="signingCertificateName"
                  defaultValue={data.configuration.signingCertificateName}
                />
              </div>
              <div className={styles.identityFieldGroup}>
                <div className={styles.integrationDetailLabel}>Certificate expiry</div>
                <input
                  className={styles.auditSearch}
                  name="signingCertificateExpiry"
                  defaultValue={data.configuration.signingCertificateExpiry}
                />
              </div>
            </div>
            <div className={styles.identityFieldGroup}>
              <div className={styles.integrationDetailLabel}>Name ID Format</div>
              <select className={styles.selectInput} name="nameIdFormat" defaultValue={data.configuration.nameIdFormat}>
                <option value="emailAddress">emailAddress</option>
                <option value="persistent">persistent</option>
                <option value="transient">transient</option>
              </select>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.identitySectionHeader}>
              <span>Attribute Mapping</span>
            </div>
            <div className={styles.identityAttrHeader}>
              <span>Innovink field</span>
              <span>IdP attribute</span>
              <span>Status</span>
            </div>
            {data.configuration.attributeMappings.map((row) => (
              <div key={row.innovinkField} className={styles.identityAttrRow}>
                <span className={styles.integrationDetailValue}>{row.innovinkField}</span>
                {row.inputType === "select" ? (
                  <select
                    className={styles.selectInput}
                    name="roleMappingMode"
                    defaultValue={row.idpAttribute}
                  >
                    {row.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={styles.auditSearch}
                    name={identityAttributeFieldName(row.innovinkField)}
                    defaultValue={row.idpAttribute}
                  />
                )}
                <span
                  className={
                    row.status === "mapped"
                      ? styles.statusBadge
                      : row.status === "configured"
                        ? styles.riskInfo
                        : row.status === "not_tested"
                          ? styles.riskWarn
                          : styles.criticalBadge
                  }
                >
                  {humanizeStatusLabel(row.status)}
                </span>
              </div>
            ))}
          </section>

          <div className={styles.aiSectionLabel} style={{ marginTop: 18 }}>SCIM Provisioning</div>
          <section className={styles.card}>
            <div className={styles.identitySectionHeader}>
              <span>SCIM 2.0 endpoint</span>
              <span className={data.providerConfig.enabled ? styles.statusBadge : styles.riskWarn}>
                {data.providerConfig.enabled ? "Active" : "Not configured"}
              </span>
            </div>
            <div className={styles.identityFieldGroup}>
              <div className={styles.integrationDetailLabel}>SCIM Base URL</div>
              <div className={styles.identityCodeBlock}>{data.configuration.scimBaseUrl}</div>
            </div>
            <div className={styles.identityFieldGroup}>
              <div className={styles.integrationDetailLabel}>Bearer token</div>
              <div className={styles.identityTokenRow}>
                <input
                  className={styles.auditSearch}
                  name="scimBearerTokenMasked"
                  defaultValue={data.configuration.scimBearerTokenMasked}
                />
                <button className={styles.buttonGhost} type="button">Rotate</button>
              </div>
            </div>
            <div className={styles.identityToggleList}>
              <label className={styles.aiPolicyRow}>
                <input
                  className={styles.aiCheckbox}
                  type="checkbox"
                  name="autoProvisionOnLogin"
                  defaultChecked={data.configuration.autoProvisionOnLogin}
                />
                <span className={styles.aiPolicyTitle}>Auto-provision on first login</span>
              </label>
              <label className={styles.aiPolicyRow}>
                <input
                  className={styles.aiCheckbox}
                  type="checkbox"
                  name="deprovisionOnDeactivate"
                  defaultChecked={data.configuration.deprovisionOnDeactivate}
                />
                <span className={styles.aiPolicyTitle}>Deprovision on IdP deactivation</span>
              </label>
              <label className={styles.aiPolicyRow}>
                <input
                  className={styles.aiCheckbox}
                  type="checkbox"
                  name="syncGroupsAsRoles"
                  defaultChecked={data.configuration.syncGroupsAsRoles}
                />
                <span className={styles.aiPolicyTitle}>Sync groups as roles</span>
              </label>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.identitySectionHeader}>
              <span>Session Policy</span>
            </div>
            <div className={styles.identityToggleList}>
              <label className={styles.aiPolicyRow}>
                <input
                  className={styles.aiCheckbox}
                  type="checkbox"
                  name="enforceSsoForStaff"
                  defaultChecked={data.configuration.sessionPolicy.enforceSsoForStaff}
                />
                <span className={styles.aiPolicyTitle}>Enforce SSO for staff roles</span>
              </label>
              <label className={styles.aiPolicyRow}>
                <input
                  className={styles.aiCheckbox}
                  type="checkbox"
                  name="allowPasswordFallback"
                  defaultChecked={data.configuration.sessionPolicy.allowPasswordFallback}
                />
                <span className={styles.aiPolicyTitle}>Allow password fallback</span>
              </label>
            </div>
            <div className={styles.identityFieldGroup}>
              <div className={styles.integrationDetailLabel}>Session timeout (hours)</div>
              <input
                className={styles.auditSearch}
                name="sessionTimeoutHours"
                type="number"
                min={1}
                max={72}
                defaultValue={data.configuration.sessionPolicy.sessionTimeoutHours}
              />
            </div>
          </section>

          <div className={styles.aiFooter}>
            <button className={styles.button} type="submit">Save configuration</button>
            <button className={styles.buttonGhost} type="submit">Test connection</button>
          </div>
        </form>
      </div>

      <aside className={styles.identitySide}>
        <div className={styles.aiSectionLabel}>Connection health</div>
        <section className={styles.card}>
          <div className={styles.identityHealthRow}>
            <span>Last SSO login</span>
            <span>{data.health.lastSsoLoginAt ? formatAdminDateTime(data.health.lastSsoLoginAt) : "No recent login"}</span>
          </div>
          <div className={styles.identityHealthRow}>
            <span>SCIM last sync</span>
            <span>{data.health.lastScimSyncAt ? formatAdminDateTime(data.health.lastScimSyncAt) : "No recent sync"}</span>
          </div>
          <div className={styles.identityHealthRow}>
            <span>Users provisioned</span>
            <span>{data.health.provisionedUsers.toLocaleString()}</span>
          </div>
          <div className={styles.identityHealthRow}>
            <span>Deprovisioned</span>
            <span>{data.health.deprovisionedUsers30d} this month</span>
          </div>
          <div className={styles.identityHealthRow}>
            <span>Sync errors</span>
            <span className={data.health.syncWarnings ? styles.riskWarn : styles.statusBadge}>
              {data.health.syncWarnings ? `${data.health.syncWarnings} warnings` : "Healthy"}
            </span>
          </div>
        </section>

        <div className={styles.aiSectionLabel}>Recent sync events</div>
        <section className={styles.card}>
          {data.syncEvents.length ? (
            data.syncEvents.map((row) => (
              <div key={row.id} className={styles.identityEventRow}>
                <div className={row.severity === "warning" ? styles.riskWarn : styles.riskInfo}>
                  {row.severity}
                </div>
                <div>
                  <div className={styles.integrationDetailValue}>{row.title}</div>
                  <div className={styles.cardSub}>{row.detail}</div>
                  <div className={styles.sub}>{formatAdminDateTime(row.createdAt)}</div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.empty}>No identity sync events are visible yet for this organization.</div>
          )}
        </section>

        <button className={styles.buttonGhost} type="button" style={{ width: "100%", marginBottom: 12 }}>
          Run SCIM sync now
        </button>

        <section className={styles.card}>
          <div className={styles.cardTitle}>
            {data.configuration.attributeMappings.filter((row) => row.status === "unmapped").length} unmapped attributes
          </div>
          <div className={styles.cardSub}>
            {data.affectedUsersCount} users may be affected until the remaining identity attributes are mapped and validated.
          </div>
        </section>
      </aside>
    </div>
  );
}

function renderRetentionExportSection(data: AdminRetentionExportData) {
  return (
    <div className={styles.retentionShell}>
      <div className={styles.retentionMain}>
        <section className={styles.complianceBanner}>
          <div>
            <div className={styles.cardTitle}>Compliance-governed data management</div>
            <div className={styles.cardSub}>
              These settings control how participant data, submissions, and program records are retained, archived, and exported. Configuration is binding and should align with GDPR, internal governance, and enterprise audit expectations.
            </div>
            <div className={styles.auditBadges} style={{ marginTop: 8 }}>
              <span className={styles.statusBadge}>GDPR Art. 17</span>
              <span className={styles.riskInfo}>ISO 27001</span>
              <span className={styles.riskWarn}>Organization policy</span>
            </div>
          </div>
        </section>

        <form action={saveRetentionExportPolicyAction}>
          <div className={styles.aiSectionLabel}>Data Retention Schedule</div>

          <section className={styles.card}>
            <div className={styles.identitySectionHeader}>
              <span>Participant & Submission Data</span>
            </div>
            <RetentionSelectRow
              title="Participant profiles"
              detail="Name, email, department, registrations, and related participant records."
              name="participantProfiles"
              defaultValue={data.retentionPolicy.schedule.participantProfiles}
              options={[
                "2 years after program closes",
                "1 year after program closes",
                "6 months after program closes",
                "On program close",
                "Indefinite",
              ]}
            />
            <RetentionSelectRow
              title="Submission content"
              detail="Pitch decks, form answers, attachments, and revision history."
              name="submissionContent"
              defaultValue={data.retentionPolicy.schedule.submissionContent}
              options={[
                "5 years after program closes",
                "2 years after program closes",
                "1 year after program closes",
              ]}
            />
            <RetentionSelectRow
              title="Communications"
              detail="Email delivery, notification records, and communication history."
              name="communications"
              defaultValue={data.retentionPolicy.schedule.communications}
              options={[
                "1 year after program closes",
                "6 months after program closes",
                "On program close",
              ]}
            />
            <RetentionSelectRow
              title="Activity & audit logs"
              detail="Login events, program state changes, and governance-relevant access records."
              name="activityAuditLogs"
              defaultValue={data.retentionPolicy.schedule.activityAuditLogs}
              options={[
                "7 years (regulatory minimum)",
                "5 years",
              ]}
            />
          </section>

          <section className={styles.card}>
            <div className={styles.identitySectionHeader}>
              <span>Scoring & Evaluation Data</span>
            </div>
            <RetentionSelectRow
              title="Judge scores & rubrics"
              detail="Per-criterion scores, comments, and calibration outputs."
              name="judgeScores"
              defaultValue={data.retentionPolicy.schedule.judgeScores}
              options={[
                "5 years after program closes",
                "3 years after program closes",
                "1 year after program closes",
              ]}
            />
            <RetentionSelectRow
              title="Conflict of interest declarations"
              detail="Conflict disclosures, declarations, and supporting audit trail."
              name="conflictDeclarations"
              defaultValue={data.retentionPolicy.schedule.conflictDeclarations}
              options={[
                "7 years (regulatory minimum)",
                "5 years",
              ]}
            />
            <RetentionSelectRow
              title="Moderation & final decisions"
              detail="Finalist decisions, override rationale, and moderation outcomes."
              name="moderationDecisions"
              defaultValue={data.retentionPolicy.schedule.moderationDecisions}
              options={[
                "7 years (regulatory minimum)",
                "5 years",
              ]}
            />
          </section>

          <section className={styles.card}>
            <div className={styles.identitySectionHeader}>
              <span>Deletion & Anonymisation Rules</span>
            </div>
            <RetentionSelectRow
              title="Right-to-erasure requests"
              detail="How GDPR/participant deletion requests are handled."
              name="erasureRequestRule"
              defaultValue={data.retentionPolicy.deletionRules.erasureRequestRule}
              options={[
                "Delete within 30 days",
                "Anonymise within 30 days",
              ]}
            />
            <RetentionSelectRow
              title="Post-retention action"
              detail="Default action after the scheduled retention period expires."
              name="postRetentionAction"
              defaultValue={data.retentionPolicy.deletionRules.postRetentionAction}
              options={[
                "Anonymise, keep aggregate records",
                "Hard delete all data",
                "Archive to cold storage",
              ]}
            />
            <RetentionSelectRow
              title="Retention review notification"
              detail="How early admins are alerted before an expiry window arrives."
              name="reviewNotificationWindow"
              defaultValue={data.retentionPolicy.deletionRules.reviewNotificationWindow}
              options={[
                "60 days before expiry",
                "30 days before expiry",
                "14 days before expiry",
              ]}
            />
          </section>

          <div className={styles.aiSectionLabel} style={{ marginTop: 18 }}>Export Controls</div>
          <section className={styles.card}>
            <div className={styles.identitySectionHeader}>
              <span>Who can export what</span>
            </div>
            <RetentionSelectRow
              title="Full participant data export (CSV)"
              detail="All personally identifiable participant data."
              name="fullParticipantExportRole"
              defaultValue={data.exportPolicy.controls.fullParticipantExportRole}
              options={[
                "organization_admin_only",
                "organization_owner_only",
              ]}
              formatter={humanizeExportRole}
            />
            <RetentionSelectRow
              title="Anonymised analytics export"
              detail="Aggregate analytics without direct participant identifiers."
              name="anonymizedAnalyticsExportRole"
              defaultValue={data.exportPolicy.controls.anonymizedAnalyticsExportRole}
              options={[
                "program_manager_and_org_admin",
                "organization_admin_only",
              ]}
              formatter={humanizeExportRole}
            />
            <RetentionSelectRow
              title="Submission content export (ZIP)"
              detail="Submission files, supporting materials, and form answers."
              name="submissionContentExportRole"
              defaultValue={data.exportPolicy.controls.submissionContentExportRole}
              options={[
                "program_manager_and_org_admin",
                "organization_admin_only",
              ]}
              formatter={humanizeExportRole}
            />
            <div className={styles.policyRow}>
              <div>
                <div className={styles.integrationDetailValue}>Export approval workflow</div>
                <div className={styles.cardSub}>Require an additional admin approval for full data exports.</div>
              </div>
              <label className={styles.toggleLabel}>
                <input
                  className={styles.aiCheckbox}
                  type="checkbox"
                  name="approvalRequired"
                  defaultChecked={data.exportPolicy.controls.approvalRequired}
                />
                <span className={data.exportPolicy.controls.approvalRequired ? styles.statusBadge : styles.riskInfo}>
                  {data.exportPolicy.controls.approvalRequired ? "On" : "Off"}
                </span>
              </label>
            </div>
          </section>

          <div className={styles.aiFooter}>
            <button className={styles.button} type="submit">Save policy</button>
            <button className={styles.buttonGhost} type="button">Download DPA summary</button>
          </div>
        </form>
      </div>

      <aside className={styles.retentionSide}>
        <div className={styles.aiSectionLabel}>Upcoming actions</div>
        <section className={styles.card}>
          {data.upcomingActions.length ? (
            data.upcomingActions.map((row) => (
              <div key={row.id} className={styles.identityEventRow}>
                <div>
                  <div className={styles.integrationDetailValue}>{row.title}</div>
                  <div className={styles.cardSub}>{row.detail}</div>
                  <div className={styles.sub}>{row.meta}</div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.empty}>No upcoming retention or export actions are currently derived from policy state.</div>
          )}
        </section>

        <div className={styles.aiSectionLabel}>Tracked records</div>
        <section className={styles.card}>
          <div className={styles.identityHealthRow}>
            <span>Participant records</span>
            <span>{data.stats.participantRecords.toLocaleString()}</span>
          </div>
          <div className={styles.identityHealthRow}>
            <span>Submission records</span>
            <span>{data.stats.submissions.toLocaleString()}</span>
          </div>
          <div className={styles.identityHealthRow}>
            <span>Audit events</span>
            <span>{data.stats.auditEvents.toLocaleString()}</span>
          </div>
          <div className={styles.identityHealthRow}>
            <span>Active programs</span>
            <span>{data.stats.activePrograms.toLocaleString()}</span>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardTitle}>Policy review due</div>
          <div className={styles.cardSub}>
            {data.annualReviewDueAt
              ? `Annual review due ${formatAdminDate(data.annualReviewDueAt)}.`
              : "Save the first organization retention policy to start annual review tracking."}
          </div>
        </section>
      </aside>
    </div>
  );
}

function RetentionSelectRow({
  title,
  detail,
  name,
  defaultValue,
  options,
  formatter,
}: {
  title: string;
  detail: string;
  name: string;
  defaultValue: string;
  options: string[];
  formatter?: (value: string) => string;
}) {
  return (
    <div className={styles.policyRow}>
      <div>
        <div className={styles.integrationDetailValue}>{title}</div>
        <div className={styles.cardSub}>{detail}</div>
      </div>
      <select className={styles.retentionSelect} name={name} defaultValue={defaultValue}>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatter ? formatter(option) : option}
          </option>
        ))}
      </select>
    </div>
  );
}

function sectionLabel(section: AdminSection) {
  return sections.find((item) => item.id === section)?.label ?? "Admin";
}

function filterRoleUsers(
  users: AdminRolesData["users"],
  search: string,
  role: string,
) {
  const normalizedSearch = search.trim().toLowerCase();
  return users.filter((row) => {
    const matchesRole = role === "all" ? true : row.organizationRole === role;
    const matchesSearch = normalizedSearch
      ? [row.fullName ?? "", row.email ?? "", row.organizationRole]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)
      : true;
    return matchesRole && matchesSearch;
  });
}

function filterFeatureFlags(
  flags: AdminFeatureFlagData["flags"],
  filters: {
    search: string;
    category: string;
    scope: string;
    state: string;
  },
) {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return flags.filter((flag) => {
    const matchesSearch = normalizedSearch
      ? [flag.key, flag.sublabel, flag.description].join(" ").toLowerCase().includes(normalizedSearch)
      : true;
    const matchesCategory = filters.category === "all" ? true : flag.category === filters.category;
    const matchesScope = filters.scope === "all" ? true : flag.scope === filters.scope;
    const matchesState =
      filters.state === "all"
        ? true
        : filters.state === "enabled"
          ? flag.enabled
          : filters.state === "disabled"
            ? !flag.enabled
            : flag.rolloutPercent > 0 && flag.rolloutPercent < 100;

    return matchesSearch && matchesCategory && matchesScope && matchesState;
  });
}

function humanizeRole(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAdminDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatAdminDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function humanizeKey(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getIntegrationMetadata(value: unknown) {
  const metadata =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    summary: typeof metadata.summary === "string" ? metadata.summary : null,
    statusNote: typeof metadata.statusNote === "string" ? metadata.statusNote : null,
  };
}

const integrationCatalog = [
  {
    key: "outlook_exchange",
    label: "Outlook / Exchange",
    category: "Email delivery",
    logo: "Ou",
    summary: "Connect organizational email delivery for program communications and notifications.",
    detail: "Use this integration for operational mail delivery, PM communications, and participant notifications.",
  },
  {
    key: "zoom",
    label: "Zoom",
    category: "Video conferencing",
    logo: "Zo",
    summary: "Create mentor and judge meeting links automatically from Innovink workflows.",
    detail: "Best for mentor sessions, office hours, and structured virtual events tied to programs.",
  },
  {
    key: "slack",
    label: "Slack",
    category: "Notifications",
    logo: "Sl",
    summary: "Route workflow alerts, approvals, and operations notifications into Slack channels.",
    detail: "Useful for PM ops channels, launch readiness alerts, and live intervention workflows.",
  },
  {
    key: "salesforce",
    label: "Salesforce",
    category: "CRM sync",
    logo: "Sf",
    summary: "Sync consented participant and sponsor signals into Salesforce for downstream workflows.",
    detail: "Supports sponsor-safe reporting and opt-in talent or pipeline synchronization.",
  },
  {
    key: "azure_ad_sso",
    label: "Azure AD / SSO",
    category: "Identity provider",
    logo: "Az",
    summary: "Federate enterprise identity and support workforce SSO for staff-style roles.",
    detail: "Pairs with the broader security and SSO admin controls already planned in the product.",
  },
  {
    key: "hubspot",
    label: "HubSpot",
    category: "Marketing sync",
    logo: "Hs",
    summary: "Sync participant and campaign signals into HubSpot for approved follow-up workflows.",
    detail: "Useful when programs feed recruitment, innovation marketing, or ecosystem engagement pipelines.",
  },
  {
    key: "microsoft_teams",
    label: "Microsoft Teams",
    category: "Video conferencing",
    logo: "Tm",
    summary: "Alternative collaboration and session platform for organizations standardized on Teams.",
    detail: "Can support mentor sessions, PM review cadences, and internal innovation team operations.",
  },
  {
    key: "webflow",
    label: "Webflow",
    category: "Landing page CMS",
    logo: "Wf",
    summary: "Publish or mirror approved landing experiences into an external Webflow-managed site.",
    detail: "This is for organizations that still want a separate external CMS for public program presence.",
  },
  {
    key: "jira",
    label: "Jira",
    category: "Project tracking",
    logo: "Ji",
    summary: "Mirror approved operations tasks into Jira for broader delivery or escalation tracking.",
    detail: "Useful when innovation programs need to hand work into transformation or engineering teams.",
  },
  {
    key: "google_drive",
    label: "Google Drive",
    category: "File storage",
    logo: "Gd",
    summary: "Coordinate approved exports and shared documents with a Google Drive file boundary.",
    detail: "Use only where storage governance allows it and document retention policies are aligned.",
  },
  {
    key: "webhooks",
    label: "Webhooks",
    category: "Custom HTTP callbacks",
    logo: "Wh",
    summary: "Emit signed callbacks for external systems that need trusted workflow events.",
    detail: "This maps closely to the dedicated webhooks admin screen and should remain tightly governed.",
  },
  {
    key: "zapier",
    label: "Zapier",
    category: "Automation workflows",
    logo: "Za",
    summary: "Trigger lightweight downstream automation where approved enterprise connectors do not exist yet.",
    detail: "Keep this controlled through the automation governance layer, not broad unrestricted access.",
  },
] as const;

const identityProviderOptions = [
  { key: "azure_ad_sso", label: "Microsoft Entra ID", logo: "M" },
  { key: "okta_sso", label: "Okta", logo: "O" },
  { key: "google_workspace_sso", label: "Google Workspace", logo: "G" },
  { key: "custom_saml", label: "Custom SAML", logo: "Cs" },
] as const;

function renderPermission(value: "yes" | "no" | "partial") {
  return value === "yes" ? "Yes" : value === "partial" ? "Partial" : "No";
}

function filterAuditEvents(
  events: AdminAuditData["events"],
  filters: {
    search: string;
    category: string;
    actor: string;
    window: string;
    severity: string;
  },
) {
  const normalizedSearch = filters.search.trim().toLowerCase();
  const days = Number(filters.window || "30");
  const cutoff = Number.isFinite(days)
    ? new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    : null;

  return events.filter((row) => {
    const matchesSearch = normalizedSearch
      ? [row.title, row.detail, row.actorName ?? "", row.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)
      : true;
    const matchesCategory = filters.category === "all" ? true : row.category === filters.category;
    const matchesActor = filters.actor === "all" ? true : (row.actorName ?? "") === filters.actor;
    const matchesSeverity = filters.severity === "all" ? true : row.severity === filters.severity;
    const matchesWindow = cutoff ? new Date(row.occurredAt) >= cutoff : true;

    return matchesSearch && matchesCategory && matchesActor && matchesSeverity && matchesWindow;
  });
}

function humanizeStatusLabel(value: string) {
  if (value === "not_tested") {
    return "Not tested";
  }

  return humanizeKey(value);
}

function identityAttributeFieldName(field: string) {
  switch (field) {
    case "email":
      return "emailAttribute";
    case "display_name":
      return "displayNameAttribute";
    case "department":
      return "departmentAttribute";
    case "employee_id":
      return "employeeIdAttribute";
    default:
      return "customAttribute";
  }
}

function humanizeExportRole(value: string) {
  switch (value) {
    case "organization_admin_only":
      return "Org admin only";
    case "organization_owner_only":
      return "Org owner only";
    case "program_manager_and_org_admin":
      return "PM + Org admin";
    default:
      return humanizeKey(value);
  }
}

const permissionRows = [
  {
    label: "Create programs",
    workspaceAdmin: "yes",
    programManager: "yes",
    sponsorViewer: "no",
    judge: "no",
    mentor: "no",
  },
  {
    label: "Manage users & roles",
    workspaceAdmin: "yes",
    programManager: "no",
    sponsorViewer: "no",
    judge: "no",
    mentor: "no",
  },
  {
    label: "View all submissions",
    workspaceAdmin: "yes",
    programManager: "yes",
    sponsorViewer: "partial",
    judge: "partial",
    mentor: "no",
  },
  {
    label: "Score & judge submissions",
    workspaceAdmin: "yes",
    programManager: "no",
    sponsorViewer: "no",
    judge: "yes",
    mentor: "no",
  },
  {
    label: "Send communications",
    workspaceAdmin: "yes",
    programManager: "yes",
    sponsorViewer: "no",
    judge: "no",
    mentor: "no",
  },
  {
    label: "View audit log",
    workspaceAdmin: "yes",
    programManager: "no",
    sponsorViewer: "no",
    judge: "no",
    mentor: "no",
  },
  {
    label: "Manage AI / integrations",
    workspaceAdmin: "yes",
    programManager: "no",
    sponsorViewer: "no",
    judge: "no",
    mentor: "no",
  },
] as const;
