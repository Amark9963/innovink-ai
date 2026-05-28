"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getAdminAiGovernanceData,
  getAdminAutomationGovernanceData,
  getAdminFeatureFlagsData,
  getAdminGovernanceOverviewData,
  getAdminIntegrationsData,
  getAdminRetentionExportData,
  getAdminRolesData,
  getAdminSecuritySsoData,
  getCurrentUserOrNull,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const toggleAiSchema = z.object({
  nextState: z.enum(["true", "false"]),
});

const updateOrganizationMembershipSchema = z.object({
  membershipId: z.uuid(),
  role: z.enum([
    "organization_owner",
    "organization_admin",
    "security_compliance_admin",
    "ai_governance_admin",
  ]),
  status: z.enum(["invited", "active", "suspended", "revoked"]),
});

const saveAiGovernancePoliciesSchema = z.object({
  organizationAiEnabled: z.enum(["true", "false"]),
  emailDraftApprovalRequired: z.enum(["true", "false"]).optional(),
  scoringAdvisoryOnly: z.enum(["true", "false"]).optional(),
  automatedResultAnnouncements: z.enum(["true", "false"]).optional(),
  logAllGeneratedContent: z.enum(["true", "false"]).optional(),
  anonymizePii: z.enum(["true", "false"]).optional(),
  historicalProgramsOptIn: z.enum(["true", "false"]).optional(),
  autoApproveMentorBookingsThreshold: z.coerce.number().min(50).max(100),
  autoFlagLowConfidenceThreshold: z.coerce.number().min(30).max(90),
});

const manageIntegrationSchema = z.object({
  integrationKey: z.string().min(2),
  intent: z.enum(["connect", "reconnect", "disable", "enable", "mark-error"]),
});

const saveSecuritySsoSchema = z.object({
  providerKey: z.string().min(2),
  idpMetadataUrl: z.string(),
  signingCertificateName: z.string().min(1),
  signingCertificateExpiry: z.string().min(1),
  nameIdFormat: z.string().min(1),
  emailAttribute: z.string().min(1),
  displayNameAttribute: z.string().min(1),
  departmentAttribute: z.string().optional().default(""),
  employeeIdAttribute: z.string().optional().default(""),
  roleMappingMode: z.string().min(1),
  scimBearerTokenMasked: z.string().min(1),
  autoProvisionOnLogin: z.enum(["true", "false"]).optional(),
  deprovisionOnDeactivate: z.enum(["true", "false"]).optional(),
  syncGroupsAsRoles: z.enum(["true", "false"]).optional(),
  enforceSsoForStaff: z.enum(["true", "false"]).optional(),
  sessionTimeoutHours: z.coerce.number().min(1).max(72),
  allowPasswordFallback: z.enum(["true", "false"]).optional(),
});

const saveRetentionExportPolicySchema = z.object({
  participantProfiles: z.string().min(1),
  submissionContent: z.string().min(1),
  communications: z.string().min(1),
  activityAuditLogs: z.string().min(1),
  judgeScores: z.string().min(1),
  conflictDeclarations: z.string().min(1),
  moderationDecisions: z.string().min(1),
  erasureRequestRule: z.string().min(1),
  postRetentionAction: z.string().min(1),
  reviewNotificationWindow: z.string().min(1),
  fullParticipantExportRole: z.string().min(1),
  anonymizedAnalyticsExportRole: z.string().min(1),
  submissionContentExportRole: z.string().min(1),
  approvalRequired: z.enum(["true", "false"]).optional(),
});

const saveFeatureFlagsSchema = z.object({
  policyVersionId: z.string().optional(),
});

const saveAutomationGovernanceSchema = z.object({
  safetyMode: z.enum(["human_in_the_loop", "supervised_autonomous", "full_autonomous"]),
  participantCommsThreshold: z.coerce.number().min(1).max(100000),
  bulkStatusChangesThreshold: z.coerce.number().min(1).max(100000),
  requireScoringDeadlineChangesApproval: z.enum(["true", "false"]).optional(),
  requireActiveProgramPhaseChangesApproval: z.enum(["true", "false"]).optional(),
  blockDataDeletion: z.enum(["true", "false"]).optional(),
  blockJudgingAssignmentChanges: z.enum(["true", "false"]).optional(),
  allowExternalNotifications: z.enum(["true", "false"]).optional(),
  dryRunMode: z.enum(["true", "false"]).optional(),
});

export async function toggleOrganizationAiAction(formData: FormData) {
  const parsed = toggleAiSchema.safeParse({
    nextState: formData.get("nextState"),
  });

  if (!parsed.success) {
    redirect("/app/admin?error=invalid-toggle");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login?next=/app/admin");
  }

  const adminData = await getAdminGovernanceOverviewData(supabase, user);

  if (!adminData) {
    redirect("/app/dashboard");
  }

  const { error } = await supabase
    .from("organizations")
    .update({ ai_enabled: parsed.data.nextState === "true" })
    .eq("id", adminData.organization.id);

  if (error) {
    throw error;
  }

  redirect(`/app/admin?status=ai-${parsed.data.nextState === "true" ? "enabled" : "disabled"}`);
}

export async function updateOrganizationMembershipAction(formData: FormData) {
  const parsed = updateOrganizationMembershipSchema.safeParse({
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    redirect("/app/admin?section=roles&error=invalid-membership-update");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login?next=/app/admin?section=roles");
  }

  const adminData = await getAdminRolesData(supabase, user);

  if (!adminData) {
    redirect("/app/dashboard");
  }

  const target = adminData.users.find((row) => row.membershipId === parsed.data.membershipId);
  if (!target) {
    redirect("/app/admin?section=roles&error=membership-not-found");
  }

  if (target.userId === user.id && parsed.data.status !== "active") {
    redirect("/app/admin?section=roles&error=cannot-revoke-self");
  }

  const { error } = await supabase
    .from("organization_memberships")
    .update({
      role: parsed.data.role,
      status: parsed.data.status,
    })
    .eq("id", parsed.data.membershipId);

  if (error) {
    throw error;
  }

  redirect("/app/admin?section=roles&status=membership-updated");
}

export async function saveAiGovernancePoliciesAction(formData: FormData) {
  const parsed = saveAiGovernancePoliciesSchema.safeParse({
    organizationAiEnabled: formData.get("organizationAiEnabled"),
    emailDraftApprovalRequired: formData.get("emailDraftApprovalRequired") ? "true" : "false",
    scoringAdvisoryOnly: formData.get("scoringAdvisoryOnly") ? "true" : "false",
    automatedResultAnnouncements: formData.get("automatedResultAnnouncements") ? "true" : "false",
    logAllGeneratedContent: formData.get("logAllGeneratedContent") ? "true" : "false",
    anonymizePii: formData.get("anonymizePii") ? "true" : "false",
    historicalProgramsOptIn: formData.get("historicalProgramsOptIn") ? "true" : "false",
    autoApproveMentorBookingsThreshold: formData.get("autoApproveMentorBookingsThreshold"),
    autoFlagLowConfidenceThreshold: formData.get("autoFlagLowConfidenceThreshold"),
  });

  if (!parsed.success) {
    redirect("/app/admin?section=ai-controls&error=invalid-ai-policy");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login?next=/app/admin?section=ai-controls");
  }

  const aiGovernanceData = await getAdminAiGovernanceData(supabase, user);

  if (!aiGovernanceData) {
    redirect("/app/dashboard");
  }

  const policyPayload = {
    policyKey: "organization_ai_governance",
    organizationAiEnabled: parsed.data.organizationAiEnabled === "true",
    emailDraftApprovalRequired: parsed.data.emailDraftApprovalRequired === "true",
    scoringAdvisoryOnly: parsed.data.scoringAdvisoryOnly === "true",
    automatedResultAnnouncements: parsed.data.automatedResultAnnouncements === "true",
    logAllGeneratedContent: parsed.data.logAllGeneratedContent === "true",
    anonymizePii: parsed.data.anonymizePii === "true",
    historicalProgramsOptIn: parsed.data.historicalProgramsOptIn === "true",
    autoApproveMentorBookingsThreshold: parsed.data.autoApproveMentorBookingsThreshold,
    autoFlagLowConfidenceThreshold: parsed.data.autoFlagLowConfidenceThreshold,
  };

  const { error: organizationError } = await supabase
    .from("organizations")
    .update({
      ai_enabled: parsed.data.organizationAiEnabled === "true",
    })
    .eq("id", aiGovernanceData.organization.id);

  if (organizationError) {
    throw organizationError;
  }

  let governancePolicyId = aiGovernanceData.policyRecord.id;

  if (!governancePolicyId) {
    const newPolicyId = crypto.randomUUID();
    const { error: policyInsertError } = await supabase.from("governance_policies").insert({
      id: newPolicyId,
      organization_id: aiGovernanceData.organization.id,
      scope_type: "organization",
      policy_type: "ai_policy",
      status: "draft",
      created_by: user.id,
    });

    if (policyInsertError) {
      throw policyInsertError;
    }

    governancePolicyId = newPolicyId;
  }

  const nextVersionNumber = (aiGovernanceData.policyRecord.versionNumber ?? 0) + 1;
  const versionId = crypto.randomUUID();

  const { error: versionInsertError } = await supabase.from("governance_policy_versions").insert({
    id: versionId,
    governance_policy_id: governancePolicyId,
    version_number: nextVersionNumber,
    created_by: user.id,
    change_summary: "Updated organization AI governance controls",
    policy_payload: policyPayload,
  });

  if (versionInsertError) {
    throw versionInsertError;
  }

  const { error: policyUpdateError } = await supabase
    .from("governance_policies")
    .update({
      active_version_id: versionId,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", governancePolicyId);

  if (policyUpdateError) {
    throw policyUpdateError;
  }

  redirect("/app/admin?section=ai-controls&status=ai-governance-saved");
}

export async function manageIntegrationConfigurationAction(formData: FormData) {
  const parsed = manageIntegrationSchema.safeParse({
    integrationKey: formData.get("integrationKey"),
    intent: formData.get("intent"),
  });

  if (!parsed.success) {
    redirect("/app/admin?section=integrations&error=invalid-integration-action");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login?next=/app/admin?section=integrations");
  }

  const integrationsData = await getAdminIntegrationsData(supabase, user);

  if (!integrationsData) {
    redirect("/app/dashboard");
  }

  const existing = integrationsData.integrations.find(
    (row) => row.integrationKey === parsed.data.integrationKey,
  );

  const existingMetadata =
    existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? (existing.metadata as Record<string, unknown>)
      : {};

  const nextMetadata = {
    ...existingMetadata,
    lastAction: parsed.data.intent,
    lastConfiguredAt: new Date().toISOString(),
  };

  const nextConfigStatus =
    parsed.data.intent === "mark-error"
      ? "error"
      : parsed.data.intent === "disable"
        ? "disabled"
        : "configured";

  const nextEnabled = parsed.data.intent === "disable" ? false : true;

  if (existing) {
    const { error } = await supabase
      .from("integration_configurations")
      .update({
        enabled: nextEnabled,
        config_status: nextConfigStatus,
        metadata: nextMetadata,
      })
      .eq("id", existing.id);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from("integration_configurations").insert({
      organization_id: integrationsData.organization.id,
      scope_type: "organization",
      integration_key: parsed.data.integrationKey,
      enabled: nextEnabled,
      config_status: nextConfigStatus,
      created_by: user.id,
      metadata: nextMetadata,
    });

    if (error) {
      throw error;
    }
  }

  redirect(
    `/app/admin?section=integrations&selected=${encodeURIComponent(parsed.data.integrationKey)}&status=integration-${parsed.data.intent}`,
  );
}

export async function saveSecuritySsoConfigurationAction(formData: FormData) {
  const parsed = saveSecuritySsoSchema.safeParse({
    providerKey: formData.get("providerKey"),
    idpMetadataUrl: formData.get("idpMetadataUrl"),
    signingCertificateName: formData.get("signingCertificateName"),
    signingCertificateExpiry: formData.get("signingCertificateExpiry"),
    nameIdFormat: formData.get("nameIdFormat"),
    emailAttribute: formData.get("emailAttribute"),
    displayNameAttribute: formData.get("displayNameAttribute"),
    departmentAttribute: formData.get("departmentAttribute"),
    employeeIdAttribute: formData.get("employeeIdAttribute"),
    roleMappingMode: formData.get("roleMappingMode"),
    scimBearerTokenMasked: formData.get("scimBearerTokenMasked"),
    autoProvisionOnLogin: formData.get("autoProvisionOnLogin") ? "true" : "false",
    deprovisionOnDeactivate: formData.get("deprovisionOnDeactivate") ? "true" : "false",
    syncGroupsAsRoles: formData.get("syncGroupsAsRoles") ? "true" : "false",
    enforceSsoForStaff: formData.get("enforceSsoForStaff") ? "true" : "false",
    sessionTimeoutHours: formData.get("sessionTimeoutHours"),
    allowPasswordFallback: formData.get("allowPasswordFallback") ? "true" : "false",
  });

  if (!parsed.success) {
    redirect("/app/admin?section=security&error=invalid-security-config");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login?next=/app/admin?section=security");
  }

  const securityData = await getAdminSecuritySsoData(supabase, user);

  if (!securityData) {
    redirect("/app/dashboard");
  }

  const providerMetadata =
    securityData.providerConfig.metadata &&
    typeof securityData.providerConfig.metadata === "object" &&
    !Array.isArray(securityData.providerConfig.metadata)
      ? (securityData.providerConfig.metadata as Record<string, unknown>)
      : {};

  const nextProviderMetadata = {
    ...providerMetadata,
    summary: `${parsed.data.providerKey} identity integration configured for ${securityData.organization.name}.`,
    statusNote: `Updated ${new Date().toISOString()}`,
    idpMetadataUrl: parsed.data.idpMetadataUrl,
  };

  if (securityData.providerConfig.integrationId) {
    const { error } = await supabase
      .from("integration_configurations")
      .update({
        integration_key: parsed.data.providerKey,
        enabled: true,
        config_status: "configured",
        metadata: nextProviderMetadata,
      })
      .eq("id", securityData.providerConfig.integrationId);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from("integration_configurations").insert({
      organization_id: securityData.organization.id,
      scope_type: "organization",
      integration_key: parsed.data.providerKey,
      enabled: true,
      config_status: "configured",
      created_by: user.id,
      metadata: nextProviderMetadata,
    });

    if (error) {
      throw error;
    }
  }

  let governancePolicyId = securityData.policyRecord.id;

  if (!governancePolicyId) {
    const newPolicyId = crypto.randomUUID();
    const { error } = await supabase.from("governance_policies").insert({
      id: newPolicyId,
      organization_id: securityData.organization.id,
      scope_type: "organization",
      policy_type: "integration_policy",
      status: "draft",
      created_by: user.id,
    });

    if (error) {
      throw error;
    }

    governancePolicyId = newPolicyId;
  }

  const nextVersionNumber = (securityData.policyRecord.versionNumber ?? 0) + 1;
  const versionId = crypto.randomUUID();

  const policyPayload = {
    policyKey: "organization_identity_provisioning",
    providerKey: parsed.data.providerKey,
    entityId: `https://app.innovink.io/saml/${securityData.organization.slug}/metadata`,
    acsUrl: `https://app.innovink.io/saml/${securityData.organization.slug}/acs`,
    idpMetadataUrl: parsed.data.idpMetadataUrl,
    signingCertificateName: parsed.data.signingCertificateName,
    signingCertificateExpiry: parsed.data.signingCertificateExpiry,
    nameIdFormat: parsed.data.nameIdFormat,
    attributeMappings: [
      {
        innovinkField: "email",
        idpAttribute: parsed.data.emailAttribute,
        status: "mapped",
        inputType: "text",
      },
      {
        innovinkField: "display_name",
        idpAttribute: parsed.data.displayNameAttribute,
        status: "mapped",
        inputType: "text",
      },
      {
        innovinkField: "department",
        idpAttribute: parsed.data.departmentAttribute,
        status: parsed.data.departmentAttribute ? "not_tested" : "unmapped",
        inputType: "text",
      },
      {
        innovinkField: "employee_id",
        idpAttribute: parsed.data.employeeIdAttribute,
        status: parsed.data.employeeIdAttribute ? "not_tested" : "unmapped",
        inputType: "text",
      },
      {
        innovinkField: "innovink_role",
        idpAttribute: parsed.data.roleMappingMode,
        status: "configured",
        inputType: "select",
        options: [
          { value: "rule_based", label: "Rule-based (see role mapping)" },
          { value: "idp_group_claim", label: "IdP group claim" },
          { value: "default_participant", label: "Default: participant" },
        ],
      },
    ],
    scimBaseUrl: `https://app.innovink.io/scim/v2/${securityData.organization.slug}`,
    scimBearerTokenMasked: parsed.data.scimBearerTokenMasked,
    autoProvisionOnLogin: parsed.data.autoProvisionOnLogin === "true",
    deprovisionOnDeactivate: parsed.data.deprovisionOnDeactivate === "true",
    syncGroupsAsRoles: parsed.data.syncGroupsAsRoles === "true",
    sessionPolicy: {
      enforceSsoForStaff: parsed.data.enforceSsoForStaff === "true",
      sessionTimeoutHours: parsed.data.sessionTimeoutHours,
      allowPasswordFallback: parsed.data.allowPasswordFallback === "true",
    },
  };

  const { error: versionInsertError } = await supabase.from("governance_policy_versions").insert({
    id: versionId,
    governance_policy_id: governancePolicyId,
    version_number: nextVersionNumber,
    created_by: user.id,
    change_summary: "Updated SSO / SCIM organization configuration",
    policy_payload: policyPayload,
  });

  if (versionInsertError) {
    throw versionInsertError;
  }

  const { error: policyUpdateError } = await supabase
    .from("governance_policies")
    .update({
      active_version_id: versionId,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", governancePolicyId);

  if (policyUpdateError) {
    throw policyUpdateError;
  }

  redirect("/app/admin?section=security&status=identity-configuration-saved");
}

export async function saveRetentionExportPolicyAction(formData: FormData) {
  const parsed = saveRetentionExportPolicySchema.safeParse({
    participantProfiles: formData.get("participantProfiles"),
    submissionContent: formData.get("submissionContent"),
    communications: formData.get("communications"),
    activityAuditLogs: formData.get("activityAuditLogs"),
    judgeScores: formData.get("judgeScores"),
    conflictDeclarations: formData.get("conflictDeclarations"),
    moderationDecisions: formData.get("moderationDecisions"),
    erasureRequestRule: formData.get("erasureRequestRule"),
    postRetentionAction: formData.get("postRetentionAction"),
    reviewNotificationWindow: formData.get("reviewNotificationWindow"),
    fullParticipantExportRole: formData.get("fullParticipantExportRole"),
    anonymizedAnalyticsExportRole: formData.get("anonymizedAnalyticsExportRole"),
    submissionContentExportRole: formData.get("submissionContentExportRole"),
    approvalRequired: formData.get("approvalRequired") ? "true" : "false",
  });

  if (!parsed.success) {
    redirect("/app/admin?section=billing&error=invalid-retention-policy");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login?next=/app/admin?section=billing");
  }

  const retentionData = await getAdminRetentionExportData(supabase, user);

  if (!retentionData) {
    redirect("/app/dashboard");
  }

  const retentionPayload = {
    policyKey: "organization_retention_schedule",
    schedule: {
      participantProfiles: parsed.data.participantProfiles,
      submissionContent: parsed.data.submissionContent,
      communications: parsed.data.communications,
      activityAuditLogs: parsed.data.activityAuditLogs,
      judgeScores: parsed.data.judgeScores,
      conflictDeclarations: parsed.data.conflictDeclarations,
      moderationDecisions: parsed.data.moderationDecisions,
    },
    deletionRules: {
      erasureRequestRule: parsed.data.erasureRequestRule,
      postRetentionAction: parsed.data.postRetentionAction,
      reviewNotificationWindow: parsed.data.reviewNotificationWindow,
    },
  };

  if (retentionData.retentionPolicy.id) {
    const { error } = await supabase
      .from("retention_policies")
      .update({
        status: "active",
        policy_payload: retentionPayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", retentionData.retentionPolicy.id);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from("retention_policies").insert({
      organization_id: retentionData.organization.id,
      scope_type: "organization",
      status: "active",
      created_by: user.id,
      policy_payload: retentionPayload,
    });

    if (error) {
      throw error;
    }
  }

  let governancePolicyId = retentionData.exportPolicy.id;

  if (!governancePolicyId) {
    const newPolicyId = crypto.randomUUID();
    const { error } = await supabase.from("governance_policies").insert({
      id: newPolicyId,
      organization_id: retentionData.organization.id,
      scope_type: "organization",
      policy_type: "export_policy",
      status: "draft",
      created_by: user.id,
    });

    if (error) {
      throw error;
    }

    governancePolicyId = newPolicyId;
  }

  const versionId = crypto.randomUUID();
  const nextVersionNumber = (retentionData.exportPolicy.versionNumber ?? 0) + 1;
  const exportPayload = {
    policyKey: "organization_export_controls",
    fullParticipantExportRole: parsed.data.fullParticipantExportRole,
    anonymizedAnalyticsExportRole: parsed.data.anonymizedAnalyticsExportRole,
    submissionContentExportRole: parsed.data.submissionContentExportRole,
    approvalRequired: parsed.data.approvalRequired === "true",
  };

  const { error: versionInsertError } = await supabase.from("governance_policy_versions").insert({
    id: versionId,
    governance_policy_id: governancePolicyId,
    version_number: nextVersionNumber,
    created_by: user.id,
    change_summary: "Updated organization retention and export policy",
    policy_payload: exportPayload,
  });

  if (versionInsertError) {
    throw versionInsertError;
  }

  const { error: policyUpdateError } = await supabase
    .from("governance_policies")
    .update({
      active_version_id: versionId,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", governancePolicyId);

  if (policyUpdateError) {
    throw policyUpdateError;
  }

  redirect("/app/admin?section=billing&status=retention-policy-saved");
}

export async function saveFeatureFlagsAction(formData: FormData) {
  const parsed = saveFeatureFlagsSchema.safeParse({
    policyVersionId: formData.get("policyVersionId")?.toString() ?? undefined,
  });

  if (!parsed.success) {
    redirect("/app/admin?section=rollout&error=invalid-rollout-policy");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login?next=/app/admin?section=rollout");
  }

  const featureFlagsData = await getAdminFeatureFlagsData(supabase, user);

  if (!featureFlagsData) {
    redirect("/app/dashboard");
  }

  const flags = featureFlagsData.flags.map((flag) => {
    const rolloutValue = Number(formData.get(`rollout__${flag.key}`) ?? flag.rolloutPercent);
    const scopeValue = formData.get(`scope__${flag.key}`);

    return {
      ...flag,
      enabled: flag.locked ? flag.enabled : formData.get(`enabled__${flag.key}`) === "true",
      rolloutPercent: Number.isFinite(rolloutValue) ? Math.max(0, Math.min(100, rolloutValue)) : flag.rolloutPercent,
      scope:
        scopeValue === "workspace" || scopeValue === "beta" || scopeValue === "organization"
          ? scopeValue
          : flag.scope,
      changedAt: new Date().toISOString(),
    };
  });

  let governancePolicyId = featureFlagsData.policyRecord.id;

  if (!governancePolicyId) {
    const newPolicyId = crypto.randomUUID();
    const { error: policyInsertError } = await supabase.from("governance_policies").insert({
      id: newPolicyId,
      organization_id: featureFlagsData.organization.id,
      scope_type: "organization",
      policy_type: "automation_governance_policy",
      status: "draft",
      created_by: user.id,
    });

    if (policyInsertError) {
      throw policyInsertError;
    }

    governancePolicyId = newPolicyId;
  }

  const nextVersionNumber = (featureFlagsData.policyRecord.versionNumber ?? 0) + 1;
  const versionId = crypto.randomUUID();

  const { error: versionInsertError } = await supabase.from("governance_policy_versions").insert({
    id: versionId,
    governance_policy_id: governancePolicyId,
    version_number: nextVersionNumber,
    created_by: user.id,
    change_summary: "Updated feature flags and rollout controls",
    policy_payload: {
      policyKey: "organization_feature_flags",
      flags,
    },
  });

  if (versionInsertError) {
    throw versionInsertError;
  }

  const { error: policyUpdateError } = await supabase
    .from("governance_policies")
    .update({
      active_version_id: versionId,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", governancePolicyId);

  if (policyUpdateError) {
    throw policyUpdateError;
  }

  redirect("/app/admin?section=rollout&status=rollout-policy-saved");
}

export async function saveAutomationGovernanceAction(formData: FormData) {
  const parsed = saveAutomationGovernanceSchema.safeParse({
    safetyMode: formData.get("safetyMode"),
    participantCommsThreshold: formData.get("participantCommsThreshold"),
    bulkStatusChangesThreshold: formData.get("bulkStatusChangesThreshold"),
    requireScoringDeadlineChangesApproval: formData.get("requireScoringDeadlineChangesApproval")
      ? "true"
      : "false",
    requireActiveProgramPhaseChangesApproval: formData.get("requireActiveProgramPhaseChangesApproval")
      ? "true"
      : "false",
    blockDataDeletion: formData.get("blockDataDeletion") ? "true" : "false",
    blockJudgingAssignmentChanges: formData.get("blockJudgingAssignmentChanges") ? "true" : "false",
    allowExternalNotifications: formData.get("allowExternalNotifications") ? "true" : "false",
    dryRunMode: formData.get("dryRunMode") ? "true" : "false",
  });

  if (!parsed.success) {
    redirect("/app/admin?section=automation&error=invalid-automation-policy");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login?next=/app/admin?section=automation");
  }

  const automationData = await getAdminAutomationGovernanceData(supabase, user);

  if (!automationData) {
    redirect("/app/dashboard");
  }

  let governancePolicyId = automationData.policyRecord.id;

  if (!governancePolicyId) {
    const newPolicyId = crypto.randomUUID();
    const { error: policyInsertError } = await supabase.from("governance_policies").insert({
      id: newPolicyId,
      organization_id: automationData.organization.id,
      scope_type: "organization",
      policy_type: "automation_governance_policy",
      status: "draft",
      created_by: user.id,
    });

    if (policyInsertError) {
      throw policyInsertError;
    }

    governancePolicyId = newPolicyId;
  }

  const versionId = crypto.randomUUID();
  const nextVersionNumber = (automationData.policyRecord.versionNumber ?? 0) + 1;

  const { error: versionInsertError } = await supabase.from("governance_policy_versions").insert({
    id: versionId,
    governance_policy_id: governancePolicyId,
    version_number: nextVersionNumber,
    created_by: user.id,
    change_summary: "Updated automation governance controls",
    policy_payload: {
      policyKey: "organization_automation_governance",
      safetyMode: parsed.data.safetyMode,
      participantCommsThreshold: parsed.data.participantCommsThreshold,
      bulkStatusChangesThreshold: parsed.data.bulkStatusChangesThreshold,
      requireScoringDeadlineChangesApproval:
        parsed.data.requireScoringDeadlineChangesApproval === "true",
      requireActiveProgramPhaseChangesApproval:
        parsed.data.requireActiveProgramPhaseChangesApproval === "true",
      blockDataDeletion: parsed.data.blockDataDeletion === "true",
      blockJudgingAssignmentChanges: parsed.data.blockJudgingAssignmentChanges === "true",
      allowExternalNotifications: parsed.data.allowExternalNotifications === "true",
      dryRunMode: parsed.data.dryRunMode === "true",
      rules: automationData.rules,
    },
  });

  if (versionInsertError) {
    throw versionInsertError;
  }

  const { error: policyUpdateError } = await supabase
    .from("governance_policies")
    .update({
      active_version_id: versionId,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", governancePolicyId);

  if (policyUpdateError) {
    throw policyUpdateError;
  }

  redirect("/app/admin?section=automation&status=automation-policy-saved");
}
