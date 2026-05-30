import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

type TypedSupabaseClient = SupabaseClient<Database>;

export type WorkspaceAccessRow = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceRole: Database["public"]["Enums"]["workspace_membership_role"];
  organizationId: string;
  organizationName: string;
  aiSettings: Database["public"]["Tables"]["workspaces"]["Row"]["ai_settings"];
};

export type InitialOnboardingDefaults = {
  completedAt: string;
  timezone: string;
  programTypes: string[];
  participantSelfSignupAllowed: boolean;
  requireApprovalBeforePublish: boolean;
};

export type ProgramAccessRow = {
  id: string;
  name: string;
  slug: string;
  status: Database["public"]["Enums"]["program_status"];
  visibility: Database["public"]["Enums"]["visibility_scope"];
  programType: string;
  shortDescription: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  submissionClosesAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
};

export type ProgramDetailRow = {
  id: string;
  name: string;
  slug: string;
  status: Database["public"]["Enums"]["program_status"];
  visibility: Database["public"]["Enums"]["visibility_scope"];
  programType: string;
  shortDescription: string | null;
  longDescription: string | null;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
};

export type LandingPageVersionSummary = {
  id: string;
  versionNumber: number;
  status: Database["public"]["Enums"]["landing_page_status"];
  createdAt: string;
};

export type LandingPageSectionRow = {
  id: string;
  sectionKey: string;
  displayOrder: number;
  isEnabled: boolean;
  content: Database["public"]["Tables"]["landing_page_sections"]["Row"]["content"];
};

export type LandingPageManagerData = {
  landingPage: Database["public"]["Tables"]["landing_pages"]["Row"] | null;
  versions: LandingPageVersionSummary[];
  activeDraftVersionId: string | null;
  activeDraftVersionNumber: number | null;
  publishedVersionId: string | null;
  sections: LandingPageSectionRow[];
};

export type ProgramFormVersionSummary = {
  id: string;
  versionNumber: number;
  createdAt: string;
};

export type ProgramFormFieldChoiceSummary = {
  id: string;
  choiceKey: string;
  label: string;
  value: string;
  displayOrder: number;
};

export type ProgramFormFieldSummary = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: Database["public"]["Enums"]["form_field_type"];
  placeholder: string | null;
  helpText: string | null;
  isRequired: boolean;
  isEnabled: boolean;
  displayOrder: number;
  fieldConfig: Database["public"]["Tables"]["form_fields"]["Row"]["field_config"];
  validationRules: Database["public"]["Tables"]["form_fields"]["Row"]["validation_rules"];
  choices: ProgramFormFieldChoiceSummary[];
};

export type ProgramFormManagerData = {
  form: Database["public"]["Tables"]["forms"]["Row"] | null;
  versions: ProgramFormVersionSummary[];
  activeVersionId: string | null;
  activeVersionNumber: number | null;
  fields: ProgramFormFieldSummary[];
};

export type PublicRegistrationPageData = {
  program: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string | null;
    programType: string;
    registrationClosesAt: string | null;
    startsAt: string | null;
  };
  landingPage: {
    title: string | null;
    seoDescription: string | null;
    publishedSlug: string | null;
  };
  registrationForm: {
    id: string;
    name: string;
    description: string | null;
    activeVersionId: string | null;
  } | null;
  fields: ProgramFormFieldSummary[];
};

export type ParticipantDashboardData = {
  program: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string | null;
    registrationClosesAt: string | null;
    submissionClosesAt: string | null;
    startsAt: string | null;
    endsAt: string | null;
  };
  registration: {
    id: string;
    status: Database["public"]["Enums"]["participant_status"];
    createdAt: string;
  } | null;
  team: {
    id: string;
    name: string;
    slug: string;
    teamBio: string | null;
    projectIdea: string | null;
    isLead: boolean;
    members: Array<{
      userId: string;
      fullName: string | null;
      email: string | null;
      isLead: boolean;
    }>;
  } | null;
  submission: {
    id: string;
    title: string;
    status: Database["public"]["Enums"]["submission_status"];
    updatedAt: string;
    completionPercent: number;
    answeredRequired: number;
    totalRequired: number;
  } | null;
  mentorSessions: Array<{
    id: string;
    title: string;
    startsAt: string;
    status: Database["public"]["Enums"]["mentor_booking_status"];
  }>;
};

export type ParticipantSubmissionWorkspaceData = {
  program: ParticipantDashboardData["program"];
  registration: NonNullable<ParticipantDashboardData["registration"]>;
  team: ParticipantDashboardData["team"];
  submission: {
    id: string;
    title: string;
    problemStatement: string | null;
    solutionDescription: string | null;
    demoUrl: string | null;
    githubUrl: string | null;
    aiUsageDisclosure: string | null;
    status: Database["public"]["Enums"]["submission_status"];
    updatedAt: string;
    answers: Record<string, unknown>;
  };
  form: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  fields: ProgramFormFieldSummary[];
};

export type ParticipantTeamManagementData = {
  program: ParticipantDashboardData["program"];
  team: NonNullable<ParticipantDashboardData["team"]>;
  registration: NonNullable<ParticipantDashboardData["registration"]>;
  pendingInvites: Array<{
    id: string;
    email: string;
    status: Database["public"]["Enums"]["team_invite_status"];
    invitedBy: string;
    invitedUserId: string | null;
    expiresAt: string | null;
    createdAt: string;
    respondedAt: string | null;
  }>;
};

export type ParticipantNotificationsData = {
  program: ParticipantDashboardData["program"];
  team: ParticipantDashboardData["team"];
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    status: Database["public"]["Enums"]["notification_item_status"];
    sourceType: string | null;
    actionRequired: boolean;
    deepLink: string | null;
    createdAt: string;
  }>;
};

export type ParticipantResultsData = {
  program: ParticipantDashboardData["program"];
  registration: NonNullable<ParticipantDashboardData["registration"]>;
  team: ParticipantDashboardData["team"];
  submission: ParticipantDashboardData["submission"];
  participantStatusHistory: Array<{
    id: string;
    previousStatus: Database["public"]["Enums"]["participant_status"] | null;
    newStatus: Database["public"]["Enums"]["participant_status"];
    changeReason: string | null;
    createdAt: string;
  }>;
  submissionStatusHistory: Array<{
    id: string;
    previousStatus: Database["public"]["Enums"]["submission_status"] | null;
    newStatus: Database["public"]["Enums"]["submission_status"];
    changeReason: string | null;
    createdAt: string;
  }>;
  certificates: Array<{
    id: string;
    certificateType: Database["public"]["Enums"]["certificate_type"];
    title: string;
    filePath: string | null;
    issuedAt: string;
    verificationCode: string | null;
    recipientName: string;
  }>;
};

export type JudgeAssignmentSummary = {
  id: string;
  submissionId: string;
  programId: string;
  status: Database["public"]["Enums"]["assignment_status"];
  dueAt: string | null;
  assignedAt: string;
  completedAt: string | null;
  notes: string | null;
  submissionTitle: string;
  teamName: string | null;
  problemStatement: string | null;
  solutionDescription: string | null;
  demoUrl: string | null;
  githubUrl: string | null;
  teamMembers: Array<{
    userId: string;
    fullName: string | null;
    email: string | null;
    isLead: boolean;
  }>;
  conflict: {
    id: string;
    reason: string;
  } | null;
  scoreSubmission: {
    id: string;
    status: Database["public"]["Enums"]["score_entry_status"];
    totalScore: number | null;
    submittedAt: string | null;
  } | null;
};

export type JudgePortalData = {
  program: {
    id: string;
    name: string;
    shortDescription: string | null;
    submissionClosesAt: string | null;
  };
  judgeRole: Database["public"]["Enums"]["program_membership_role"];
  progress: {
    assignmentsTotal: number;
    assignmentsCompleted: number;
    assignmentsInProgress: number;
    assignmentsNotStarted: number;
    daysLeft: number | null;
  };
  assignments: JudgeAssignmentSummary[];
};

export type JudgeScorecardWorkspaceData = {
  program: JudgePortalData["program"];
  judgeRole: JudgePortalData["judgeRole"];
  assignment: JudgeAssignmentSummary;
  scorecard: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  criteria: Array<{
    id: string;
    criterionKey: string;
    label: string;
    description: string | null;
    weight: number;
    scaleType: Database["public"]["Enums"]["score_scale_type"];
    scaleConfig: Database["public"]["Tables"]["scorecard_criteria"]["Row"]["scale_config"];
    judgeGuidance: string | null;
    requiresComment: boolean;
    displayOrder: number;
    existingScore: number | null;
    existingComment: string | null;
  }>;
  submissionAnswers: Record<string, unknown>;
};

export type JudgeCalibrationAnchor = {
  rangeLabel: string;
  note: string;
  highlighted?: boolean;
};

export type JudgeCalibrationExerciseSummary = {
  id: string;
  scorecardId: string;
  title: string;
  referenceCode: string | null;
  instructions: string | null;
  problemSummary: string | null;
  solutionSummary: string | null;
  validationSummary: string | null;
  teamSummary: string | null;
  pitchDeckUrl: string | null;
  demoUrl: string | null;
  consensusTotalScore: number | null;
  managerNote: string | null;
  scoringAnchors: JudgeCalibrationAnchor[];
};

export type ProgramJudgeCalibrationManagerData = {
  exercise: JudgeCalibrationExerciseSummary | null;
  scorecard: {
    id: string;
    name: string;
  } | null;
  criteria: Array<{
    id: string;
    label: string;
    weight: number;
    description: string | null;
    displayOrder: number;
  }>;
  totalJudges: number;
  completedJudges: number;
  meanScore: number | null;
  scoreMin: number | null;
  scoreMax: number | null;
  stdDeviation: number | null;
  judgeTotals: Array<{
    judgeUserId: string;
    judgeName: string | null;
    totalScore: number | null;
  }>;
};

export type JudgeCalibrationWorkspaceData = {
  program: JudgePortalData["program"];
  judgeRole: JudgePortalData["judgeRole"];
  exercise: JudgeCalibrationExerciseSummary | null;
  scorecard: {
    id: string;
    name: string;
  } | null;
  criteria: Array<{
    id: string;
    label: string;
    description: string | null;
    weight: number;
    displayOrder: number;
    existingScore: number | null;
  }>;
  existingSubmission: {
    id: string;
    status: Database["public"]["Enums"]["score_entry_status"];
    totalScore: number | null;
    notes: string | null;
    submittedAt: string | null;
  } | null;
  alignment: {
    completedJudges: number;
    totalJudges: number;
    meanScore: number | null;
    scoreMin: number | null;
    scoreMax: number | null;
    stdDeviation: number | null;
    judgeTotals: Array<{
      judgeUserId: string;
      judgeName: string | null;
      totalScore: number | null;
    }>;
  };
};

export type MentorPortalData = {
  program: {
    id: string;
    name: string;
    shortDescription: string | null;
    startsAt: string | null;
    endsAt: string | null;
  };
  programRole: Database["public"]["Enums"]["program_membership_role"] | null;
  profile: {
    id: string | null;
    displayName: string;
    title: string | null;
    organizationName: string | null;
    bio: string | null;
    maxMentoringLoad: number | null;
    expertiseTags: string[];
    stagePreferences: string[];
    sessionFormatPreferences: string[];
    languages: string[];
    regions: string[];
  };
  membership: {
    id: string | null;
    status: Database["public"]["Enums"]["mentor_membership_status"] | "pending_profile";
    autoConfirmAllowed: boolean;
    maxSessions: number | null;
  };
  stats: {
    assignedTeams: number;
    upcomingSessions: number;
    pendingBookings: number;
    availabilitySlots: number;
  };
  sessions: Array<{
    id: string;
    sessionType: Database["public"]["Enums"]["mentor_session_type"];
    status: Database["public"]["Enums"]["mentor_booking_status"];
    startsAt: string;
    endsAt: string;
    timezone: string;
    teamNames: string[];
    participantNames: string[];
  }>;
  availabilitySlots: Array<{
    id: string;
    sessionType: Database["public"]["Enums"]["mentor_session_type"];
    startsAt: string;
    endsAt: string;
    timezone: string;
    capacity: number;
    isAvailable: boolean;
  }>;
  bookingRequests: Array<{
    id: string;
    sessionType: Database["public"]["Enums"]["mentor_session_type"];
    status: Database["public"]["Enums"]["mentor_booking_status"];
    requestedStartsAt: string;
    requestedEndsAt: string;
    teamName: string | null;
    requesterName: string | null;
    sessionGoals: string | null;
  }>;
  matchRecommendations: Array<{
    id: string;
    teamId: string | null;
    teamName: string | null;
    participantName: string | null;
    score: number | null;
    status: Database["public"]["Enums"]["mentor_match_status"];
    reasoningSummary: string | null;
  }>;
};

export type MentorSessionDetailData = {
  portal: MentorPortalData;
  session: {
    id: string;
    sessionType: Database["public"]["Enums"]["mentor_session_type"];
    status: Database["public"]["Enums"]["mentor_booking_status"];
    startsAt: string;
    endsAt: string;
    timezone: string;
    sessionContext: Database["public"]["Tables"]["mentor_sessions"]["Row"]["session_context"];
    teamNames: string[];
    participantNames: string[];
    notes: Array<{
      id: string;
      content: string;
      noteType: string;
      visibility: Database["public"]["Enums"]["mentor_note_visibility"];
      createdAt: string;
      authorName: string | null;
    }>;
  };
};

export type ProgramMentorOversightData = {
  program: {
    id: string;
    name: string;
    shortDescription: string | null;
  };
  metrics: {
    mentorsConfirmed: number;
    mentorsPending: number;
    totalCapacity: number;
    scheduledSessions: number;
    pendingBookings: number;
    flaggedMatches: number;
    unmatchedTeams: number;
  };
  mentors: Array<{
    membershipId: string;
    profileId: string;
    displayName: string;
    title: string | null;
    organizationName: string | null;
    status: Database["public"]["Enums"]["mentor_membership_status"];
    expertiseTags: string[];
    maxSessions: number | null;
    confirmedSessions: number;
    availabilitySlots: number;
    nextSessionAt: string | null;
    autoConfirmAllowed: boolean;
  }>;
  flaggedRecommendations: Array<{
    id: string;
    teamName: string | null;
    mentorName: string | null;
    score: number | null;
    status: Database["public"]["Enums"]["mentor_match_status"];
    reasoningSummary: string | null;
  }>;
};

export type ProgramMentorMatchmakingData = {
  oversight: ProgramMentorOversightData;
  latestRun: {
    id: string;
    status: Database["public"]["Enums"]["mentor_match_run_status"];
    createdAt: string;
    runScope: string;
  } | null;
  recommendations: Array<{
    id: string;
    teamId: string | null;
    teamName: string | null;
    mentorMembershipId: string;
    mentorName: string | null;
    score: number | null;
    status: Database["public"]["Enums"]["mentor_match_status"];
    reasoningSummary: string | null;
  }>;
};

export type AdminGovernanceOverviewData = {
  organization: {
    id: string;
    name: string;
    slug: string;
    aiEnabled: boolean;
  };
  membershipRole: Database["public"]["Enums"]["organization_membership_role"];
  metrics: {
    activePrograms: number;
    users: number;
    integrations: number;
    aiActions30d: number;
    activePolicies: number;
  };
  risks: Array<{
    id: string;
    title: string;
    detail: string;
    severity: "warning" | "info";
    meta: string;
  }>;
  aiOverview: {
    highRiskRequests30d: number;
    usageEvents30d: number;
    tokenCount30d: number;
    estimatedCost30d: number;
    providers: string[];
  };
  recentAudit: Array<{
    id: string;
    action: string;
    createdAt: string;
    scope: Database["public"]["Enums"]["audit_scope"];
    actorName: string | null;
    targetTable: string | null;
  }>;
  governancePolicies: Array<{
    id: string;
    policyType: Database["public"]["Enums"]["governance_policy_type"];
    status: Database["public"]["Enums"]["governance_record_status"];
    scopeType: Database["public"]["Enums"]["governance_scope_type"];
    updatedAt: string;
  }>;
  integrations: Array<{
    id: string;
    integrationKey: string;
    enabled: boolean;
    configStatus: Database["public"]["Enums"]["integration_config_status"];
    updatedAt: string;
  }>;
};

export type AdminRolesData = {
  organization: AdminGovernanceOverviewData["organization"];
  membershipRole: AdminGovernanceOverviewData["membershipRole"];
  users: Array<{
    membershipId: string;
    userId: string;
    fullName: string | null;
    email: string | null;
    organizationRole: Database["public"]["Enums"]["organization_membership_role"];
    membershipStatus: Database["public"]["Enums"]["membership_status"];
    workspaceRoles: Database["public"]["Enums"]["workspace_membership_role"][];
    programRoles: Database["public"]["Enums"]["program_membership_role"][];
    lastActiveAt: string | null;
  }>;
  summary: {
    totalUsers: number;
    activeUsers: number;
    invitedUsers: number;
    roleCounts: Record<string, number>;
  };
};

export type AdminAiGovernancePolicySnapshot = {
  organizationAiEnabled: boolean;
  emailDraftApprovalRequired: boolean;
  scoringAdvisoryOnly: boolean;
  automatedResultAnnouncements: boolean;
  logAllGeneratedContent: boolean;
  anonymizePii: boolean;
  historicalProgramsOptIn: boolean;
  autoApproveMentorBookingsThreshold: number;
  autoFlagLowConfidenceThreshold: number;
};

export type AdminAiGovernanceData = {
  organization: AdminGovernanceOverviewData["organization"];
  membershipRole: AdminGovernanceOverviewData["membershipRole"];
  metrics: {
    actions30d: number;
    withinPolicyPercent: number;
    humanReviewed30d: number;
    policyViolations30d: number;
  };
  policySnapshot: AdminAiGovernancePolicySnapshot;
  policyRecord: {
    id: string | null;
    status: Database["public"]["Enums"]["governance_record_status"] | null;
    versionNumber: number | null;
    updatedAt: string | null;
  };
  providerPolicies: Array<{
    id: string;
    providerKey: string;
    enabled: boolean;
    allowedModelsCount: number;
    tokenLimit: number | null;
    updatedAt: string;
  }>;
  usageBreakdown: Array<{
    key: string;
    label: string;
    count: number;
  }>;
  violations: Array<{
    id: string;
    occurredAt: string;
    title: string;
    detail: string;
  }>;
  reviewQueue: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  exportRows: Array<{
    createdAt: string;
    featureKey: string;
    riskLevel: Database["public"]["Enums"]["ai_risk_level"];
    requestStatus: string;
    reviewStatus: Database["public"]["Enums"]["ai_review_status"] | "not_reviewed";
    reviewerName: string | null;
    feedback: string | null;
  }>;
};

export type AdminAuditEventCategory = "user" | "ai" | "system" | "security";
export type AdminAuditEventSeverity = "info" | "warning" | "critical";

export type AdminAuditData = {
  organization: AdminGovernanceOverviewData["organization"];
  membershipRole: AdminGovernanceOverviewData["membershipRole"];
  events: Array<{
    id: string;
    occurredAt: string;
    category: AdminAuditEventCategory;
    severity: AdminAuditEventSeverity;
    title: string;
    detail: string;
    actorName: string | null;
    actorType: "human" | "innova" | "system";
    sourceType: "audit_log" | "ai_review";
  }>;
  availableActors: string[];
};

export type AdminIntegrationsData = {
  organization: AdminGovernanceOverviewData["organization"];
  membershipRole: AdminGovernanceOverviewData["membershipRole"];
  integrations: Array<{
    id: string;
    integrationKey: string;
    enabled: boolean;
    configStatus: Database["public"]["Enums"]["integration_config_status"];
    updatedAt: string;
    metadata: Database["public"]["Tables"]["integration_configurations"]["Row"]["metadata"];
  }>;
};

export type AdminSecuritySsoData = {
  organization: AdminGovernanceOverviewData["organization"];
  membershipRole: AdminGovernanceOverviewData["membershipRole"];
  providerConfig: {
    integrationId: string | null;
    providerKey: string;
    enabled: boolean;
    configStatus: Database["public"]["Enums"]["integration_config_status"];
    metadata: Database["public"]["Tables"]["integration_configurations"]["Row"]["metadata"] | null;
    updatedAt: string | null;
  };
  policyRecord: {
    id: string | null;
    status: Database["public"]["Enums"]["governance_record_status"] | null;
    versionNumber: number | null;
    updatedAt: string | null;
  };
  configuration: {
    providerKey: string;
    entityId: string;
    acsUrl: string;
    idpMetadataUrl: string;
    signingCertificateName: string;
    signingCertificateExpiry: string;
    nameIdFormat: string;
    attributeMappings: Array<{
      innovinkField: string;
      idpAttribute: string;
      status: "mapped" | "not_tested" | "unmapped" | "configured";
      inputType: "text" | "select";
      options?: Array<{ value: string; label: string }>;
    }>;
    scimBaseUrl: string;
    scimBearerTokenMasked: string;
    autoProvisionOnLogin: boolean;
    deprovisionOnDeactivate: boolean;
    syncGroupsAsRoles: boolean;
    sessionPolicy: {
      enforceSsoForStaff: boolean;
      sessionTimeoutHours: number;
      allowPasswordFallback: boolean;
    };
  };
  health: {
    lastSsoLoginAt: string | null;
    lastScimSyncAt: string | null;
    provisionedUsers: number;
    deprovisionedUsers30d: number;
    syncWarnings: number;
  };
  syncEvents: Array<{
    id: string;
    title: string;
    detail: string;
    createdAt: string;
    severity: "info" | "warning";
  }>;
  affectedUsersCount: number;
};

export type AdminRetentionExportData = {
  organization: AdminGovernanceOverviewData["organization"];
  membershipRole: AdminGovernanceOverviewData["membershipRole"];
  retentionPolicy: {
    id: string | null;
    status: Database["public"]["Enums"]["governance_record_status"] | null;
    updatedAt: string | null;
    schedule: {
      participantProfiles: string;
      submissionContent: string;
      communications: string;
      activityAuditLogs: string;
      judgeScores: string;
      conflictDeclarations: string;
      moderationDecisions: string;
    };
    deletionRules: {
      erasureRequestRule: string;
      postRetentionAction: string;
      reviewNotificationWindow: string;
    };
  };
  exportPolicy: {
    id: string | null;
    status: Database["public"]["Enums"]["governance_record_status"] | null;
    versionNumber: number | null;
    updatedAt: string | null;
    controls: {
      fullParticipantExportRole: string;
      anonymizedAnalyticsExportRole: string;
      submissionContentExportRole: string;
      approvalRequired: boolean;
    };
  };
  stats: {
    participantRecords: number;
    submissions: number;
    auditEvents: number;
    activePrograms: number;
  };
  upcomingActions: Array<{
    id: string;
    title: string;
    detail: string;
    meta: string;
  }>;
  annualReviewDueAt: string | null;
};

export type AdminFeatureFlagData = {
  organization: AdminGovernanceOverviewData["organization"];
  membershipRole: AdminGovernanceOverviewData["membershipRole"];
  policyRecord: {
    id: string | null;
    status: Database["public"]["Enums"]["governance_record_status"] | null;
    versionNumber: number | null;
    updatedAt: string | null;
  };
  flags: Array<{
    key: string;
    label: string;
    sublabel: string;
    category: "ai_features" | "judging" | "automation";
    enabled: boolean;
    rolloutPercent: number;
    scope: "organization" | "workspace" | "beta";
    description: string;
    changedAt: string | null;
    locked: boolean;
  }>;
};

export type AdminAutomationGovernanceData = {
  organization: AdminGovernanceOverviewData["organization"];
  membershipRole: AdminGovernanceOverviewData["membershipRole"];
  policyRecord: {
    id: string | null;
    status: Database["public"]["Enums"]["governance_record_status"] | null;
    versionNumber: number | null;
    updatedAt: string | null;
  };
  safetyMode: "human_in_the_loop" | "supervised_autonomous" | "full_autonomous";
  approvalThresholds: {
    participantCommsThreshold: number;
    bulkStatusChangesThreshold: number;
    requireScoringDeadlineChangesApproval: boolean;
    requireActiveProgramPhaseChangesApproval: boolean;
  };
  restrictions: {
    blockDataDeletion: boolean;
    blockJudgingAssignmentChanges: boolean;
    allowExternalNotifications: boolean;
    dryRunMode: boolean;
  };
  rules: Array<{
    key: string;
    label: string;
    category: string;
    triggerAction: string;
    riskLevel: "low" | "medium" | "high";
    status: "active" | "pending_approval" | "disabled";
  }>;
  pendingApprovals: Array<{
    id: string;
    title: string;
    detail: string;
    createdAt: string;
  }>;
  health: {
    activeRules: number;
    runsToday: number;
    failedToday: number;
    lastRunAt: string | null;
  };
  recentFailures: Array<{
    id: string;
    title: string;
    detail: string;
    createdAt: string;
  }>;
};

export type ModerationJudgeScoreRow = {
  judgeUserId: string;
  judgeName: string | null;
  judgeEmail: string | null;
  totalScore: number | null;
  submittedAt: string | null;
  criterionScores: Array<{
    criterionId: string;
    label: string;
    score: number | null;
  }>;
  comments: string[];
};

export type ModerationConflictRow = {
  id: string;
  judgeUserId: string;
  judgeName: string | null;
  reason: string;
  createdAt: string;
};

export type ProgramJudgingModerationCandidate = {
  submissionId: string;
  title: string;
  status: Database["public"]["Enums"]["submission_status"];
  submittedAt: string | null;
  teamName: string | null;
  teamMembers: Array<{
    userId: string;
    fullName: string | null;
    email: string | null;
    isLead: boolean;
  }>;
  problemStatement: string | null;
  solutionDescription: string | null;
  demoUrl: string | null;
  githubUrl: string | null;
  averageScore: number | null;
  scoreMin: number | null;
  scoreMax: number | null;
  variance: number | null;
  submittedScoresCount: number;
  rank: number | null;
  latestDecisionNote: string | null;
  judgeScores: ModerationJudgeScoreRow[];
  conflicts: ModerationConflictRow[];
};

export type ProgramJudgingModerationData = {
  program: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string | null;
  };
  criteria: Array<{
    id: string;
    label: string;
    displayOrder: number;
  }>;
  candidates: ProgramJudgingModerationCandidate[];
  pendingCount: number;
  decidedCount: number;
  finalistsCount: number;
  winnersCount: number;
  rejectedCount: number;
};

export type JudgingRoundSummary = {
  id: string;
  name: string;
  roundOrder: number;
  isBlindReview: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

export type ScorecardSummary = {
  id: string;
  evaluationRoundId: string | null;
  name: string;
  description: string | null;
  totalWeight: number | null;
  isActive: boolean;
  createdAt: string;
};

export type ScorecardCriterionSummary = {
  id: string;
  scorecardId: string;
  criterionKey: string;
  label: string;
  description: string | null;
  weight: number;
  scaleType: Database["public"]["Enums"]["score_scale_type"];
  scaleConfig: Database["public"]["Tables"]["scorecard_criteria"]["Row"]["scale_config"];
  judgeGuidance: string | null;
  requiresComment: boolean;
  displayOrder: number;
};

export type JudgingJudgeSummary = {
  userId: string;
  membershipId: string;
  fullName: string | null;
  email: string | null;
  progressCompleted: number;
  progressTotal: number;
  lastActivityAt: string | null;
  assignmentCount: number;
  conflictCount: number;
  isJudgeManager: boolean;
};

export type ProgramJudgingManagerData = {
  rounds: JudgingRoundSummary[];
  scorecards: ScorecardSummary[];
  criteria: ScorecardCriterionSummary[];
  judges: JudgingJudgeSummary[];
  totalAssignments: number;
  totalConflicts: number;
};

export type SponsorSummary = {
  id: string;
  name: string;
  tier: string | null;
  websiteUrl: string | null;
  logoPath: string | null;
  sponsorUserId: string | null;
};

export type ReportTemplateSummary = {
  id: string;
  name: string;
  templateKey: string;
  visibility: Database["public"]["Enums"]["report_visibility"];
  templateSchema: Database["public"]["Tables"]["report_templates"]["Row"]["template_schema"];
  updatedAt: string;
};

export type GeneratedReportSummary = {
  id: string;
  reportTemplateId: string | null;
  visibility: Database["public"]["Enums"]["report_visibility"];
  status: Database["public"]["Enums"]["report_status"];
  title: string;
  summary: string | null;
  content: Database["public"]["Tables"]["generated_reports"]["Row"]["content"];
  updatedAt: string;
};

export type SponsorReportSummary = {
  id: string;
  sponsorId: string;
  generatedReportId: string | null;
  title: string;
  summary: string | null;
  reportPayload: Database["public"]["Tables"]["sponsor_reports"]["Row"]["report_payload"];
  updatedAt: string;
};

export type ProgramSponsorReportManagerData = {
  sponsors: SponsorSummary[];
  selectedSponsor: SponsorSummary | null;
  reportTemplates: ReportTemplateSummary[];
  generatedReport: GeneratedReportSummary | null;
  sponsorReport: SponsorReportSummary | null;
};

export type LinkedAgentSessionSummary = {
  id: string;
  briefId: string | null;
  title: string | null;
  updatedAt: string;
};

export type AgentSessionSummary = {
  id: string;
  briefId: string | null;
  workspaceId: string;
  title: string | null;
  status: Database["public"]["Enums"]["agent_session_status"];
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentMessageSummary = {
  id: string;
  role: Database["public"]["Enums"]["agent_message_role"];
  kind: Database["public"]["Enums"]["agent_message_kind"];
  contentText: string | null;
  contentPayload: Database["public"]["Tables"]["agent_messages"]["Row"]["content_payload"];
  createdAt: string;
};

export type AgentRunSummary = {
  id: string;
  runType: Database["public"]["Enums"]["agent_run_type"];
  status: Database["public"]["Enums"]["agent_run_status"];
  goalText: string | null;
  summary: string | null;
  currentTaskId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type AgentEventSummary = {
  id: string;
  runId: string | null;
  taskId: string | null;
  toolCallId: string | null;
  eventType: Database["public"]["Enums"]["agent_event_type"];
  severity: Database["public"]["Enums"]["agent_event_severity"];
  title: string;
  body: string | null;
  eventPayload: Database["public"]["Tables"]["agent_events"]["Row"]["event_payload"];
  createdAt: string;
};

export type ProgramBriefSummary = {
  id: string;
  organizationId: string | null;
  workspaceId: string;
  programId: string | null;
  title: string | null;
  detectedProgramType: string | null;
  status: Database["public"]["Enums"]["brief_status"];
  confidenceLevel: string;
  currentBrief: Database["public"]["Tables"]["program_briefs"]["Row"]["current_brief"];
  assumptions: Database["public"]["Tables"]["program_briefs"]["Row"]["assumptions"];
  openQuestions: Database["public"]["Tables"]["program_briefs"]["Row"]["open_questions"];
  activeVersionId: string | null;
  activePlanId: string | null;
  updatedAt: string;
};

export type ProgramPlanSummary = {
  id: string;
  title: string | null;
  summary: string | null;
  status: Database["public"]["Enums"]["plan_status"];
  planPayload: Database["public"]["Tables"]["program_plans"]["Row"]["plan_payload"];
  assumptions: Database["public"]["Tables"]["program_plans"]["Row"]["assumptions"];
  approvalRequirements: Database["public"]["Tables"]["program_plans"]["Row"]["approval_requirements"];
  createdAt: string;
  updatedAt: string;
};

export type ProgramPlanItemSummary = {
  id: string;
  itemKey: string;
  itemType: string;
  title: string;
  description: string | null;
  displayOrder: number;
  requiresApproval: boolean;
  payload: Database["public"]["Tables"]["program_plan_items"]["Row"]["payload"];
};

export type ApprovalRequestSummary = {
  id: string;
  title: string;
  summary: string | null;
  status: Database["public"]["Enums"]["approval_status"];
  riskLevel: Database["public"]["Enums"]["ai_risk_level"];
  requestedAt: string;
  reviewedAt: string | null;
};

export type ApprovalRequestItemSummary = {
  id: string;
  title: string;
  description: string | null;
  itemKey: string;
  itemType: string;
  status: Database["public"]["Enums"]["approval_status"];
  payload: Database["public"]["Tables"]["approval_request_items"]["Row"]["payload"];
  createdAt: string;
};

export type ExecutionRunSummary = {
  id: string;
  status: Database["public"]["Enums"]["execution_status"];
  executionKind: string;
  summary: string | null;
  outputPayload: Database["public"]["Tables"]["execution_runs"]["Row"]["output_payload"];
  errorPayload: Database["public"]["Tables"]["execution_runs"]["Row"]["error_payload"];
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type ExecutionRunStepSummary = {
  id: string;
  executionRunId: string;
  stepKey: string;
  stepType: string;
  title: string;
  displayOrder: number;
  status: Database["public"]["Enums"]["execution_status"];
  targetType: string | null;
  targetId: string | null;
  outputPayload: Database["public"]["Tables"]["execution_run_steps"]["Row"]["output_payload"];
  errorPayload: Database["public"]["Tables"]["execution_run_steps"]["Row"]["error_payload"];
};

export type AgentArtifactSummary = {
  id: string;
  artifactType: Database["public"]["Enums"]["agent_artifact_type"];
  status: Database["public"]["Enums"]["agent_artifact_status"];
  sourceTable: string;
  sourceId: string;
  versionLabel: string | null;
  title: string | null;
  summary: string | null;
  artifactPayload: Database["public"]["Tables"]["agent_artifacts"]["Row"]["artifact_payload"];
  createdAt: string;
};

export type ProgramBriefVersionSummary = {
  id: string;
  versionNumber: number;
  confidenceLevel: string;
  source: Database["public"]["Enums"]["brief_source"];
  structuredBrief: Database["public"]["Tables"]["program_brief_versions"]["Row"]["structured_brief"];
  assumptions: Database["public"]["Tables"]["program_brief_versions"]["Row"]["assumptions"];
  openQuestions: Database["public"]["Tables"]["program_brief_versions"]["Row"]["open_questions"];
  createdAt: string;
};

export type AgentCreateWorkspaceData = {
  workspaces: WorkspaceAccessRow[];
  selectedWorkspace: WorkspaceAccessRow | null;
  sessions: AgentSessionSummary[];
  activeSession: AgentSessionSummary | null;
  runs: AgentRunSummary[];
  events: AgentEventSummary[];
  messages: AgentMessageSummary[];
  brief: ProgramBriefSummary | null;
  plan: ProgramPlanSummary | null;
  planItems: ProgramPlanItemSummary[];
  approvals: ApprovalRequestSummary[];
  artifacts: AgentArtifactSummary[];
  executionRuns: ExecutionRunSummary[];
  latestExecutionSteps: ExecutionRunStepSummary[];
};

export async function getCurrentUserOrNull(supabase: TypedSupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getWorkspaceAccessRows(
  supabase: TypedSupabaseClient,
  user: User,
) {
  const { data, error } = await supabase
    .from("workspace_memberships")
    .select(
      "workspace_id, role, status, workspaces!inner(id, name, slug, organization_id, ai_settings, organizations!inner(name))",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    workspaceId: row.workspace_id,
    workspaceName: row.workspaces.name,
    workspaceSlug: row.workspaces.slug,
    workspaceRole: row.role,
    organizationId: row.workspaces.organization_id,
    organizationName: row.workspaces.organizations.name,
    aiSettings: row.workspaces.ai_settings,
  })) satisfies WorkspaceAccessRow[];
}

export async function hasWorkspaceAccess(
  supabase: TypedSupabaseClient,
  user: User,
) {
  const memberships = await getWorkspaceAccessRows(supabase, user);
  return memberships.length > 0;
}

function isRecord(value: Json): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getInitialOnboardingDefaults(
  workspace: Pick<WorkspaceAccessRow, "aiSettings">,
): InitialOnboardingDefaults | null {
  if (!isRecord(workspace.aiSettings)) {
    return null;
  }

  const onboarding = workspace.aiSettings.onboarding;

  if (!isRecord(onboarding)) {
    return null;
  }

  const completedAt =
    typeof onboarding.completedAt === "string" && onboarding.completedAt.length > 0
      ? onboarding.completedAt
      : null;
  const timezone =
    typeof onboarding.timezone === "string" && onboarding.timezone.length > 0
      ? onboarding.timezone
      : null;
  const programTypes = Array.isArray(onboarding.programTypes)
    ? onboarding.programTypes.filter((value): value is string => typeof value === "string")
    : [];
  const participantSelfSignupAllowed =
    typeof onboarding.participantSelfSignupAllowed === "boolean"
      ? onboarding.participantSelfSignupAllowed
      : null;
  const requireApprovalBeforePublish =
    typeof onboarding.requireApprovalBeforePublish === "boolean"
      ? onboarding.requireApprovalBeforePublish
      : null;

  if (
    !completedAt ||
    !timezone ||
    programTypes.length === 0 ||
    participantSelfSignupAllowed === null ||
    requireApprovalBeforePublish === null
  ) {
    return null;
  }

  return {
    completedAt,
    timezone,
    programTypes,
    participantSelfSignupAllowed,
    requireApprovalBeforePublish,
  };
}

export async function getInitialOnboardingState(
  supabase: TypedSupabaseClient,
  user: User,
) {
  const workspaces = await getWorkspaceAccessRows(supabase, user);
  const primaryWorkspace = workspaces[0] ?? null;
  const defaults = primaryWorkspace ? getInitialOnboardingDefaults(primaryWorkspace) : null;

  return {
    workspaces,
    primaryWorkspace,
    hasWorkspaceAccess: workspaces.length > 0,
    isComplete: Boolean(defaults),
    defaults,
  };
}

export async function getAgentCreateWorkspaceData(
  supabase: TypedSupabaseClient,
  user: User,
  options?: {
    sessionId?: string | null;
    workspaceId?: string | null;
  },
) {
  const workspaces = await getWorkspaceAccessRows(supabase, user);

  if (workspaces.length === 0) {
    return {
      workspaces,
      selectedWorkspace: null,
      sessions: [],
      activeSession: null,
      runs: [],
      events: [],
      messages: [],
      brief: null,
      plan: null,
      planItems: [],
      approvals: [],
      artifacts: [],
      executionRuns: [],
      latestExecutionSteps: [],
    } satisfies AgentCreateWorkspaceData;
  }

  const fallbackWorkspace =
    workspaces.find((workspace) => workspace.workspaceId === options?.workspaceId) ??
    workspaces[0];

  const { data: sessions, error: sessionsError } = await supabase
    .from("agent_sessions")
    .select("id, brief_id, workspace_id, title, status, last_message_at, created_at, updated_at")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false })
    .limit(16);

  if (sessionsError) {
    throw sessionsError;
  }

  const mappedSessions = (sessions ?? []).map((session) => ({
    id: session.id,
    briefId: session.brief_id,
    workspaceId: session.workspace_id,
    title: session.title,
    status: session.status,
    lastMessageAt: session.last_message_at,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  })) satisfies AgentSessionSummary[];

  let activeSession =
    mappedSessions.find((session) => session.id === options?.sessionId) ??
    mappedSessions.find((session) => session.workspaceId === fallbackWorkspace.workspaceId) ??
    mappedSessions[0] ??
    null;

  if (!activeSession && options?.sessionId) {
    const { data: explicitSession, error: explicitSessionError } = await supabase
      .from("agent_sessions")
      .select("id, brief_id, workspace_id, title, status, last_message_at, created_at, updated_at")
      .eq("id", options.sessionId)
      .eq("created_by", user.id)
      .maybeSingle();

    if (explicitSessionError) {
      throw explicitSessionError;
    }

    if (explicitSession) {
      activeSession = {
        id: explicitSession.id,
        briefId: explicitSession.brief_id,
        workspaceId: explicitSession.workspace_id,
        title: explicitSession.title,
        status: explicitSession.status,
        lastMessageAt: explicitSession.last_message_at,
        createdAt: explicitSession.created_at,
        updatedAt: explicitSession.updated_at,
      } satisfies AgentSessionSummary;
    }
  }

  const selectedWorkspace =
    workspaces.find(
      (workspace) =>
        workspace.workspaceId ===
        (activeSession?.workspaceId ?? fallbackWorkspace.workspaceId),
    ) ?? fallbackWorkspace;

  if (!activeSession) {
    return {
      workspaces,
      selectedWorkspace,
      sessions: mappedSessions,
      activeSession: null,
      runs: [],
      events: [],
      messages: [],
      brief: null,
      plan: null,
      planItems: [],
      approvals: [],
      artifacts: [],
      executionRuns: [],
      latestExecutionSteps: [],
    } satisfies AgentCreateWorkspaceData;
  }

  const { data: messageRows, error: messagesError } = await supabase
    .from("agent_messages")
    .select("id, role, kind, content_text, content_payload, created_at")
    .eq("session_id", activeSession.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    throw messagesError;
  }

  const messages = (messageRows ?? []).map((message) => ({
    id: message.id,
    role: message.role,
    kind: message.kind,
    contentText: message.content_text,
    contentPayload: message.content_payload,
    createdAt: message.created_at,
  })) satisfies AgentMessageSummary[];

  const [{ data: runRows, error: runsError }, { data: eventRows, error: eventsError }] =
    await Promise.all([
      supabase
        .from("agent_runs")
        .select(
          "id, run_type, status, goal_text, summary, current_task_id, started_at, completed_at, created_at",
        )
        .eq("session_id", activeSession.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("agent_events")
        .select(
          "id, run_id, task_id, tool_call_id, event_type, severity, title, body, event_payload, created_at",
        )
        .eq("session_id", activeSession.id)
        .eq("visible_to_user", true)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (runsError) {
    throw runsError;
  }

  if (eventsError) {
    throw eventsError;
  }

  const runs = (runRows ?? []).map((run) => ({
    id: run.id,
    runType: run.run_type,
    status: run.status,
    goalText: run.goal_text,
    summary: run.summary,
    currentTaskId: run.current_task_id,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    createdAt: run.created_at,
  })) satisfies AgentRunSummary[];

  const events = (eventRows ?? []).map((event) => ({
    id: event.id,
    runId: event.run_id,
    taskId: event.task_id,
    toolCallId: event.tool_call_id,
    eventType: event.event_type,
    severity: event.severity,
    title: event.title,
    body: event.body,
    eventPayload: event.event_payload,
    createdAt: event.created_at,
  })) satisfies AgentEventSummary[];

  if (!activeSession.briefId) {
    return {
      workspaces,
      selectedWorkspace,
      sessions: mappedSessions,
      activeSession,
      runs,
      events,
      messages,
      brief: null,
      plan: null,
      planItems: [],
      approvals: [],
      artifacts: [],
      executionRuns: [],
      latestExecutionSteps: [],
    } satisfies AgentCreateWorkspaceData;
  }

  const { data: briefRow, error: briefError } = await supabase
    .from("program_briefs")
    .select(
      "id, organization_id, workspace_id, program_id, title, detected_program_type, status, confidence_level, current_brief, assumptions, open_questions, active_version_id, active_plan_id, updated_at",
    )
    .eq("id", activeSession.briefId)
    .maybeSingle();

  if (briefError) {
    throw briefError;
  }

  if (!briefRow) {
    return {
      workspaces,
      selectedWorkspace,
      sessions: mappedSessions,
      activeSession,
      runs,
      events,
      messages,
      brief: null,
      plan: null,
      planItems: [],
      approvals: [],
      artifacts: [],
      executionRuns: [],
      latestExecutionSteps: [],
    } satisfies AgentCreateWorkspaceData;
  }

  const brief = {
    id: briefRow.id,
    organizationId: briefRow.organization_id,
    workspaceId: briefRow.workspace_id,
    programId: briefRow.program_id,
    title: briefRow.title,
    detectedProgramType: briefRow.detected_program_type,
    status: briefRow.status,
    confidenceLevel: briefRow.confidence_level,
    currentBrief: briefRow.current_brief,
    assumptions: briefRow.assumptions,
    openQuestions: briefRow.open_questions,
    activeVersionId: briefRow.active_version_id,
    activePlanId: briefRow.active_plan_id,
    updatedAt: briefRow.updated_at,
  } satisfies ProgramBriefSummary;

  let plan: ProgramPlanSummary | null = null;
  let planItems: ProgramPlanItemSummary[] = [];

  if (brief.activePlanId) {
    const [{ data: planRow, error: planError }, { data: itemRows, error: itemError }] =
      await Promise.all([
        supabase
          .from("program_plans")
          .select(
            "id, title, summary, status, plan_payload, assumptions, approval_requirements, created_at, updated_at",
          )
          .eq("id", brief.activePlanId)
          .maybeSingle(),
        supabase
          .from("program_plan_items")
          .select(
            "id, item_key, item_type, title, description, display_order, requires_approval, payload",
          )
          .eq("plan_id", brief.activePlanId)
          .order("display_order", { ascending: true }),
      ]);

    if (planError) {
      throw planError;
    }

    if (itemError) {
      throw itemError;
    }

    if (planRow) {
      plan = {
        id: planRow.id,
        title: planRow.title,
        summary: planRow.summary,
        status: planRow.status,
        planPayload: planRow.plan_payload,
        assumptions: planRow.assumptions,
        approvalRequirements: planRow.approval_requirements,
        createdAt: planRow.created_at,
        updatedAt: planRow.updated_at,
      } satisfies ProgramPlanSummary;
    }

    planItems = (itemRows ?? []).map((item) => ({
      id: item.id,
      itemKey: item.item_key,
      itemType: item.item_type,
      title: item.title,
      description: item.description,
      displayOrder: item.display_order,
      requiresApproval: item.requires_approval,
      payload: item.payload,
    })) satisfies ProgramPlanItemSummary[];
  }

  const [
    { data: approvalRows, error: approvalError },
    { data: artifactRows, error: artifactsError },
    { data: executionRows, error: executionError },
  ] = await Promise.all([
    supabase
      .from("approval_requests")
      .select("id, title, summary, status, risk_level, requested_at, reviewed_at")
      .eq("brief_id", brief.id)
      .order("requested_at", { ascending: false })
      .limit(8),
    supabase
      .from("agent_artifacts")
      .select(
        "id, artifact_type, status, source_table, source_id, version_label, title, summary, artifact_payload, created_at",
      )
      .eq("session_id", activeSession.id)
      .in("artifact_type", [
        "landing_page",
        "registration_form",
        "submission_form",
        "judging_setup",
      ])
      .order("created_at", { ascending: false })
      .limit(16),
    supabase
      .from("execution_runs")
      .select(
        "id, status, execution_kind, summary, output_payload, error_payload, started_at, completed_at, created_at",
      )
      .eq("brief_id", brief.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  if (approvalError) {
    throw approvalError;
  }

  if (artifactsError) {
    throw artifactsError;
  }

  if (executionError) {
    throw executionError;
  }

  const approvals = (approvalRows ?? []).map((approval) => ({
    id: approval.id,
    title: approval.title,
    summary: approval.summary,
    status: approval.status,
    riskLevel: approval.risk_level,
    requestedAt: approval.requested_at,
    reviewedAt: approval.reviewed_at,
  })) satisfies ApprovalRequestSummary[];

  const artifacts = (artifactRows ?? []).map((artifact) => ({
    id: artifact.id,
    artifactType: artifact.artifact_type,
    status: artifact.status,
    sourceTable: artifact.source_table,
    sourceId: artifact.source_id,
    versionLabel: artifact.version_label,
    title: artifact.title,
    summary: artifact.summary,
    artifactPayload: artifact.artifact_payload,
    createdAt: artifact.created_at,
  })) satisfies AgentArtifactSummary[];

  const executionRuns = (executionRows ?? []).map((run) => ({
    id: run.id,
    status: run.status,
    executionKind: run.execution_kind,
    summary: run.summary,
    outputPayload: run.output_payload,
    errorPayload: run.error_payload,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    createdAt: run.created_at,
  })) satisfies ExecutionRunSummary[];

  let latestExecutionSteps: ExecutionRunStepSummary[] = [];

  if (executionRuns[0]) {
    const { data: stepRows, error: stepError } = await supabase
      .from("execution_run_steps")
      .select(
        "id, execution_run_id, step_key, step_type, title, display_order, status, target_type, target_id, output_payload, error_payload",
      )
      .eq("execution_run_id", executionRuns[0].id)
      .order("display_order", { ascending: true });

    if (stepError) {
      throw stepError;
    }

    latestExecutionSteps = (stepRows ?? []).map((step) => ({
      id: step.id,
      executionRunId: step.execution_run_id,
      stepKey: step.step_key,
      stepType: step.step_type,
      title: step.title,
      displayOrder: step.display_order,
      status: step.status,
      targetType: step.target_type,
      targetId: step.target_id,
      outputPayload: step.output_payload,
      errorPayload: step.error_payload,
    })) satisfies ExecutionRunStepSummary[];
  }

  return {
    workspaces,
    selectedWorkspace,
    sessions: mappedSessions,
    activeSession,
    runs,
    events,
    messages,
    brief,
    plan,
    planItems,
    approvals,
    artifacts,
    executionRuns,
    latestExecutionSteps,
  } satisfies AgentCreateWorkspaceData;
}

export async function getProgramAccessRows(supabase: TypedSupabaseClient) {
  const { data, error } = await supabase
    .from("programs")
    .select(
      "id, name, slug, status, visibility, program_type, short_description, registration_opens_at, registration_closes_at, submission_closes_at, starts_at, ends_at, workspace_id, workspaces!inner(id, name, slug)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    visibility: row.visibility,
    programType: row.program_type,
    shortDescription: row.short_description,
    registrationOpensAt: row.registration_opens_at,
    registrationClosesAt: row.registration_closes_at,
    submissionClosesAt: row.submission_closes_at,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    workspaceId: row.workspace_id,
    workspaceName: row.workspaces.name,
    workspaceSlug: row.workspaces.slug,
  })) satisfies ProgramAccessRow[];
}

export async function getProgramBriefVersions(
  supabase: TypedSupabaseClient,
  briefId: string,
) {
  const { data, error } = await supabase
    .from("program_brief_versions")
    .select(
      "id, version_number, confidence_level, source, structured_brief, assumptions, open_questions, created_at",
    )
    .eq("brief_id", briefId)
    .order("version_number", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((version) => ({
    id: version.id,
    versionNumber: version.version_number,
    confidenceLevel: version.confidence_level,
    source: version.source,
    structuredBrief: version.structured_brief,
    assumptions: version.assumptions,
    openQuestions: version.open_questions,
    createdAt: version.created_at,
  })) satisfies ProgramBriefVersionSummary[];
}

export async function getApprovalRequestItems(
  supabase: TypedSupabaseClient,
  approvalRequestId: string,
) {
  const { data, error } = await supabase
    .from("approval_request_items")
    .select("id, title, description, item_key, item_type, status, payload, created_at")
    .eq("approval_request_id", approvalRequestId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    itemKey: item.item_key,
    itemType: item.item_type,
    status: item.status,
    payload: item.payload,
    createdAt: item.created_at,
  })) satisfies ApprovalRequestItemSummary[];
}

export async function getExecutionRunDetail(
  supabase: TypedSupabaseClient,
  runId: string,
) {
  const [{ data: run, error: runError }, { data: steps, error: stepsError }] =
    await Promise.all([
      supabase
        .from("execution_runs")
        .select(
          "id, status, execution_kind, summary, output_payload, error_payload, started_at, completed_at, created_at",
        )
        .eq("id", runId)
        .maybeSingle(),
      supabase
        .from("execution_run_steps")
        .select(
          "id, execution_run_id, step_key, step_type, title, display_order, status, target_type, target_id, output_payload, error_payload",
        )
        .eq("execution_run_id", runId)
        .order("display_order", { ascending: true }),
    ]);

  if (runError) {
    throw runError;
  }

  if (stepsError) {
    throw stepsError;
  }

  return {
    run: run
      ? ({
          id: run.id,
          status: run.status,
          executionKind: run.execution_kind,
          summary: run.summary,
          outputPayload: run.output_payload,
          errorPayload: run.error_payload,
          startedAt: run.started_at,
          completedAt: run.completed_at,
          createdAt: run.created_at,
        } satisfies ExecutionRunSummary)
      : null,
    steps: (steps ?? []).map((step) => ({
      id: step.id,
      executionRunId: step.execution_run_id,
      stepKey: step.step_key,
      stepType: step.step_type,
      title: step.title,
      displayOrder: step.display_order,
      status: step.status,
      targetType: step.target_type,
      targetId: step.target_id,
      outputPayload: step.output_payload,
      errorPayload: step.error_payload,
    })) satisfies ExecutionRunStepSummary[],
  };
}

export async function getProgramById(
  supabase: TypedSupabaseClient,
  programId: string,
) {
  const { data, error } = await supabase
    .from("programs")
    .select(
      "id, name, slug, status, visibility, program_type, short_description, long_description, workspace_id, workspaces!inner(id, name, slug)",
    )
    .eq("id", programId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    status: data.status,
    visibility: data.visibility,
    programType: data.program_type,
    shortDescription: data.short_description,
    longDescription: data.long_description,
    workspaceId: data.workspace_id,
    workspaceName: data.workspaces.name,
    workspaceSlug: data.workspaces.slug,
  } satisfies ProgramDetailRow;
}

export async function getLandingPageManagerData(
  supabase: TypedSupabaseClient,
  programId: string,
) {
  const { data: landingPage, error: landingPageError } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("program_id", programId)
    .maybeSingle();

  if (landingPageError) {
    throw landingPageError;
  }

  if (!landingPage) {
    return {
      landingPage: null,
      versions: [],
      activeDraftVersionId: null,
      activeDraftVersionNumber: null,
      publishedVersionId: null,
      sections: [],
    } satisfies LandingPageManagerData;
  }

  const { data: versions, error: versionsError } = await supabase
    .from("landing_page_versions")
    .select("id, version_number, status, created_at")
    .eq("landing_page_id", landingPage.id)
    .order("version_number", { ascending: false });

  if (versionsError) {
    throw versionsError;
  }

  const activeDraftVersion =
    versions?.find((version) => version.status === "draft" || version.status === "preview") ??
    versions?.[0] ??
    null;

  const { data: sections, error: sectionsError } = activeDraftVersion
    ? await supabase
        .from("landing_page_sections")
        .select("id, section_key, display_order, is_enabled, content")
        .eq("landing_page_version_id", activeDraftVersion.id)
        .order("display_order", { ascending: true })
    : { data: [], error: null };

  if (sectionsError) {
    throw sectionsError;
  }

  return {
    landingPage,
    versions: (versions ?? []).map((version) => ({
      id: version.id,
      versionNumber: version.version_number,
      status: version.status,
      createdAt: version.created_at,
    })),
    activeDraftVersionId: activeDraftVersion?.id ?? null,
    activeDraftVersionNumber: activeDraftVersion?.version_number ?? null,
    publishedVersionId: landingPage.published_version_id,
    sections: (sections ?? []).map((section) => ({
      id: section.id,
      sectionKey: section.section_key,
      displayOrder: section.display_order,
      isEnabled: section.is_enabled,
      content: section.content,
    })),
  } satisfies LandingPageManagerData;
}

export async function getProgramFormManagerData(
  supabase: TypedSupabaseClient,
  programId: string,
  kind: Database["public"]["Enums"]["form_kind"],
) {
  const { data: form, error: formError } = await supabase
    .from("forms")
    .select("*")
    .eq("program_id", programId)
    .eq("kind", kind)
    .maybeSingle();

  if (formError) {
    throw formError;
  }

  if (!form) {
    return {
      form: null,
      versions: [],
      activeVersionId: null,
      activeVersionNumber: null,
      fields: [],
    } satisfies ProgramFormManagerData;
  }

  const { data: versions, error: versionsError } = await supabase
    .from("form_versions")
    .select("id, version_number, created_at")
    .eq("form_id", form.id)
    .order("version_number", { ascending: false });

  if (versionsError) {
    throw versionsError;
  }

  const activeVersion =
    versions?.find((version) => version.id === form.active_version_id) ??
    versions?.[0] ??
    null;

  const { data: fields, error: fieldsError } = activeVersion
    ? await supabase
        .from("form_fields")
        .select(
          "id, field_key, label, field_type, placeholder, help_text, is_required, is_enabled, display_order, field_config, validation_rules",
        )
        .eq("form_version_id", activeVersion.id)
        .order("display_order", { ascending: true })
    : { data: [], error: null };

  if (fieldsError) {
    throw fieldsError;
  }

  const fieldIds = (fields ?? []).map((field) => field.id);

  const { data: choices, error: choicesError } =
    fieldIds.length > 0
      ? await supabase
          .from("form_field_choices")
          .select("id, form_field_id, choice_key, label, value, display_order")
          .in("form_field_id", fieldIds)
          .order("display_order", { ascending: true })
      : { data: [], error: null };

  if (choicesError) {
    throw choicesError;
  }

  const choicesByFieldId = new Map<string, ProgramFormFieldChoiceSummary[]>();

  for (const choice of choices ?? []) {
    const fieldChoices = choicesByFieldId.get(choice.form_field_id) ?? [];
    fieldChoices.push({
      id: choice.id,
      choiceKey: choice.choice_key,
      label: choice.label,
      value: choice.value,
      displayOrder: choice.display_order,
    });
    choicesByFieldId.set(choice.form_field_id, fieldChoices);
  }

  return {
    form,
    versions: (versions ?? []).map((version) => ({
      id: version.id,
      versionNumber: version.version_number,
      createdAt: version.created_at,
    })),
    activeVersionId: activeVersion?.id ?? null,
    activeVersionNumber: activeVersion?.version_number ?? null,
    fields: (fields ?? []).map((field) => ({
      id: field.id,
      fieldKey: field.field_key,
      label: field.label,
      fieldType: field.field_type,
      placeholder: field.placeholder,
      helpText: field.help_text,
      isRequired: field.is_required,
      isEnabled: field.is_enabled,
      displayOrder: field.display_order,
      fieldConfig: field.field_config,
      validationRules: field.validation_rules,
      choices: choicesByFieldId.get(field.id) ?? [],
    })),
  } satisfies ProgramFormManagerData;
}

export async function getLatestAgentSessionForProgram(
  supabase: TypedSupabaseClient,
  userId: string,
  programId: string,
) {
  const { data, error } = await supabase
    .from("agent_sessions")
    .select("id, brief_id, title, updated_at")
    .eq("program_id", programId)
    .eq("created_by", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    briefId: data.brief_id,
    title: data.title,
    updatedAt: data.updated_at,
  } satisfies LinkedAgentSessionSummary;
}

export async function getProgramJudgingManagerData(
  supabase: TypedSupabaseClient,
  programId: string,
) {
  const [
    { data: rounds, error: roundsError },
    { data: scorecards, error: scorecardsError },
    { data: memberships, error: membershipsError },
    { count: totalAssignments, error: assignmentsCountError },
    { count: totalConflicts, error: conflictsCountError },
  ] = await Promise.all([
    supabase
      .from("evaluation_rounds")
      .select("id, name, round_order, is_blind_review, starts_at, ends_at")
      .eq("program_id", programId)
      .order("round_order", { ascending: true }),
    supabase
      .from("scorecards")
      .select("id, evaluation_round_id, name, description, total_weight, is_active, created_at")
      .eq("program_id", programId)
      .order("created_at", { ascending: true }),
    supabase
      .from("program_memberships")
      .select("id, user_id, role")
      .eq("program_id", programId)
      .eq("status", "active")
      .in("role", ["judge", "judge_manager"]),
    supabase
      .from("judge_assignments")
      .select("id", { count: "exact", head: true })
      .eq("program_id", programId),
    supabase
      .from("judge_conflicts")
      .select("id", { count: "exact", head: true })
      .eq("program_id", programId),
  ]);

  if (roundsError) {
    throw roundsError;
  }

  if (scorecardsError) {
    throw scorecardsError;
  }

  if (membershipsError) {
    throw membershipsError;
  }

  if (assignmentsCountError) {
    throw assignmentsCountError;
  }

  if (conflictsCountError) {
    throw conflictsCountError;
  }

  const judgeUserIds = (memberships ?? []).map((membership) => membership.user_id);

  const [
    { data: profiles, error: profilesError },
    { data: progressRows, error: progressError },
    { data: assignmentRows, error: assignmentRowsError },
    { data: conflictRows, error: conflictRowsError },
  ] = judgeUserIds.length > 0
    ? await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", judgeUserIds),
        supabase
          .from("judge_progress")
          .select("judge_user_id, assignments_completed, assignments_total, last_activity_at")
          .eq("program_id", programId)
          .in("judge_user_id", judgeUserIds),
        supabase
          .from("judge_assignments")
          .select("judge_user_id")
          .eq("program_id", programId)
          .in("judge_user_id", judgeUserIds),
        supabase
          .from("judge_conflicts")
          .select("judge_user_id")
          .eq("program_id", programId)
          .in("judge_user_id", judgeUserIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (profilesError) {
    throw profilesError;
  }

  if (progressError) {
    throw progressError;
  }

  if (assignmentRowsError) {
    throw assignmentRowsError;
  }

  if (conflictRowsError) {
    throw conflictRowsError;
  }

  const scorecardIds = (scorecards ?? []).map((scorecard) => scorecard.id);
  const { data: criteria, error: criteriaError } =
    scorecardIds.length > 0
      ? await supabase
          .from("scorecard_criteria")
          .select(
            "id, scorecard_id, criterion_key, label, description, weight, scale_type, scale_config, judge_guidance, requires_comment, display_order",
          )
          .in("scorecard_id", scorecardIds)
          .order("display_order", { ascending: true })
      : { data: [], error: null };

  if (criteriaError) {
    throw criteriaError;
  }

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const progressByJudgeId = new Map(
    (progressRows ?? []).map((row) => [row.judge_user_id, row]),
  );
  const assignmentCountByJudgeId = new Map<string, number>();
  const conflictCountByJudgeId = new Map<string, number>();

  for (const row of assignmentRows ?? []) {
    assignmentCountByJudgeId.set(
      row.judge_user_id,
      (assignmentCountByJudgeId.get(row.judge_user_id) ?? 0) + 1,
    );
  }

  for (const row of conflictRows ?? []) {
    conflictCountByJudgeId.set(
      row.judge_user_id,
      (conflictCountByJudgeId.get(row.judge_user_id) ?? 0) + 1,
    );
  }

  return {
    rounds: (rounds ?? []).map((round) => ({
      id: round.id,
      name: round.name,
      roundOrder: round.round_order,
      isBlindReview: round.is_blind_review,
      startsAt: round.starts_at,
      endsAt: round.ends_at,
    })),
    scorecards: (scorecards ?? []).map((scorecard) => ({
      id: scorecard.id,
      evaluationRoundId: scorecard.evaluation_round_id,
      name: scorecard.name,
      description: scorecard.description,
      totalWeight:
        typeof scorecard.total_weight === "number"
          ? scorecard.total_weight
          : scorecard.total_weight
            ? Number(scorecard.total_weight)
            : null,
      isActive: scorecard.is_active,
      createdAt: scorecard.created_at,
    })),
    criteria: (criteria ?? []).map((criterion) => ({
      id: criterion.id,
      scorecardId: criterion.scorecard_id,
      criterionKey: criterion.criterion_key,
      label: criterion.label,
      description: criterion.description,
      weight:
        typeof criterion.weight === "number"
          ? criterion.weight
          : Number(criterion.weight),
      scaleType: criterion.scale_type,
      scaleConfig: criterion.scale_config,
      judgeGuidance: criterion.judge_guidance,
      requiresComment: criterion.requires_comment,
      displayOrder: criterion.display_order,
    })),
    judges: (memberships ?? []).map((membership) => {
      const profile = profileById.get(membership.user_id) ?? null;
      const progress = progressByJudgeId.get(membership.user_id) ?? null;
      return {
        userId: membership.user_id,
        membershipId: membership.id,
        fullName: profile?.full_name ?? null,
        email: profile?.email ?? null,
        progressCompleted: progress?.assignments_completed ?? 0,
        progressTotal: progress?.assignments_total ?? 0,
        lastActivityAt: progress?.last_activity_at ?? null,
        assignmentCount: assignmentCountByJudgeId.get(membership.user_id) ?? 0,
        conflictCount: conflictCountByJudgeId.get(membership.user_id) ?? 0,
        isJudgeManager: membership.role === "judge_manager",
      };
    }),
    totalAssignments: totalAssignments ?? 0,
    totalConflicts: totalConflicts ?? 0,
  } satisfies ProgramJudgingManagerData;
}

export async function getProgramSponsorReportManagerData(
  supabase: TypedSupabaseClient,
  programId: string,
  sponsorId?: string | null,
) {
  const [
    { data: sponsors, error: sponsorsError },
    { data: reportTemplates, error: templatesError },
    { data: generatedReports, error: reportsError },
  ] = await Promise.all([
    supabase
      .from("sponsors")
      .select("id, name, tier, website_url, logo_path, sponsor_user_id")
      .eq("program_id", programId)
      .order("created_at", { ascending: true }),
    supabase
      .from("report_templates")
      .select("id, name, template_key, visibility, template_schema, updated_at")
      .eq("program_id", programId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("generated_reports")
      .select("id, report_template_id, visibility, status, title, summary, content, updated_at")
      .eq("program_id", programId)
      .eq("visibility", "sponsor")
      .order("updated_at", { ascending: false }),
  ]);

  if (sponsorsError) {
    throw sponsorsError;
  }

  if (templatesError) {
    throw templatesError;
  }

  if (reportsError) {
    throw reportsError;
  }

  const mappedSponsors = (sponsors ?? []).map((sponsor) => ({
    id: sponsor.id,
    name: sponsor.name,
    tier: sponsor.tier,
    websiteUrl: sponsor.website_url,
    logoPath: sponsor.logo_path,
    sponsorUserId: sponsor.sponsor_user_id,
  })) satisfies SponsorSummary[];

  const selectedSponsor =
    mappedSponsors.find((sponsor) => sponsor.id === sponsorId) ??
    mappedSponsors[0] ??
    null;

  const { data: sponsorReports, error: sponsorReportsError } = selectedSponsor
    ? await supabase
        .from("sponsor_reports")
        .select("id, sponsor_id, generated_report_id, title, summary, report_payload, updated_at")
        .eq("program_id", programId)
        .eq("sponsor_id", selectedSponsor.id)
        .order("updated_at", { ascending: false })
    : { data: [], error: null };

  if (sponsorReportsError) {
    throw sponsorReportsError;
  }

  const sponsorReport = (sponsorReports ?? [])[0] ?? null;
  const generatedReport =
    (generatedReports ?? []).find((report) => report.id === sponsorReport?.generated_report_id) ??
    (generatedReports ?? [])[0] ??
    null;

  return {
    sponsors: mappedSponsors,
    selectedSponsor,
    reportTemplates: (reportTemplates ?? []).map((template) => ({
      id: template.id,
      name: template.name,
      templateKey: template.template_key,
      visibility: template.visibility,
      templateSchema: template.template_schema,
      updatedAt: template.updated_at,
    })),
    generatedReport: generatedReport
      ? {
          id: generatedReport.id,
          reportTemplateId: generatedReport.report_template_id,
          visibility: generatedReport.visibility,
          status: generatedReport.status,
          title: generatedReport.title,
          summary: generatedReport.summary,
          content: generatedReport.content,
          updatedAt: generatedReport.updated_at,
        }
      : null,
    sponsorReport: sponsorReport
      ? {
          id: sponsorReport.id,
          sponsorId: sponsorReport.sponsor_id,
          generatedReportId: sponsorReport.generated_report_id,
          title: sponsorReport.title,
          summary: sponsorReport.summary,
          reportPayload: sponsorReport.report_payload,
          updatedAt: sponsorReport.updated_at,
        }
      : null,
  } satisfies ProgramSponsorReportManagerData;
}

export async function getPublishedLandingPageBySlug(
  supabase: TypedSupabaseClient,
  slug: string,
) {
  const { data: publishedPage, error: publishedPageError } = await supabase
    .from("published_pages")
    .select("id, program_id, landing_page_id, landing_page_version_id, slug, published_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (publishedPageError) {
    throw publishedPageError;
  }

  if (!publishedPage) {
    return null;
  }

  const [{ data: program, error: programError }, { data: landingPage, error: landingPageError }, { data: sections, error: sectionsError }] =
    await Promise.all([
      supabase
        .from("programs")
        .select("id, name, slug, short_description")
        .eq("id", publishedPage.program_id)
        .single(),
      supabase
        .from("landing_pages")
        .select("title, seo_title, seo_description, theme_key, published_slug, brand_config")
        .eq("id", publishedPage.landing_page_id)
        .single(),
      supabase
        .from("landing_page_sections")
        .select("id, section_key, display_order, is_enabled, content")
        .eq("landing_page_version_id", publishedPage.landing_page_version_id)
        .eq("is_enabled", true)
        .order("display_order", { ascending: true }),
    ]);

  if (programError) {
    throw programError;
  }

  if (landingPageError) {
    throw landingPageError;
  }

  if (sectionsError) {
    throw sectionsError;
  }

  return {
    publishedPage,
    program,
    landingPage,
    sections: sections ?? [],
  };
}

export async function getPublicRegistrationPageBySlug(
  supabase: TypedSupabaseClient,
  slug: string,
) {
  const landingPage = await getPublishedLandingPageBySlug(supabase, slug);

  if (!landingPage) {
    return null;
  }

  const { data: form, error: formError } = await supabase
    .from("forms")
    .select("id, name, description, active_version_id")
    .eq("program_id", landingPage.program.id)
    .eq("kind", "registration")
    .eq("status", "active")
    .maybeSingle();

  if (formError) {
    throw formError;
  }

  const { data: publicProgram, error: publicProgramError } = await supabase
    .from("programs")
    .select("id, name, slug, short_description, program_type, registration_closes_at, starts_at")
    .eq("id", landingPage.program.id)
    .single();

  if (publicProgramError) {
    throw publicProgramError;
  }

  let fields: ProgramFormFieldSummary[] = [];

  if (form?.active_version_id) {
    const { data: fieldRows, error: fieldError } = await supabase
      .from("form_fields")
      .select(
        "id, field_key, label, field_type, placeholder, help_text, is_required, is_enabled, display_order, field_config, validation_rules, form_field_choices(id, choice_key, label, value, display_order)",
      )
      .eq("form_version_id", form.active_version_id)
      .eq("is_enabled", true)
      .order("display_order", { ascending: true });

    if (fieldError) {
      throw fieldError;
    }

    fields = (fieldRows ?? []).map((field) => ({
      id: field.id,
      fieldKey: field.field_key,
      label: field.label,
      fieldType: field.field_type,
      placeholder: field.placeholder,
      helpText: field.help_text,
      isRequired: field.is_required,
      isEnabled: field.is_enabled,
      displayOrder: field.display_order,
      fieldConfig: field.field_config,
      validationRules: field.validation_rules,
      choices: (field.form_field_choices ?? [])
        .map((choice) => ({
          id: choice.id,
          choiceKey: choice.choice_key,
          label: choice.label,
          value: choice.value,
          displayOrder: choice.display_order,
        }))
        .sort((left, right) => left.displayOrder - right.displayOrder),
    })) satisfies ProgramFormFieldSummary[];
  }

  return {
    program: {
      id: publicProgram.id,
      name: publicProgram.name,
      slug: publicProgram.slug,
      shortDescription: publicProgram.short_description,
      programType: publicProgram.program_type,
      registrationClosesAt: publicProgram.registration_closes_at,
      startsAt: publicProgram.starts_at,
    },
    landingPage: {
      title: landingPage.landingPage.title,
      seoDescription: landingPage.landingPage.seo_description,
      publishedSlug: landingPage.landingPage.published_slug,
    },
    registrationForm: form
      ? {
          id: form.id,
          name: form.name,
          description: form.description,
          activeVersionId: form.active_version_id,
        }
      : null,
    fields,
  } satisfies PublicRegistrationPageData;
}

export async function getParticipantDashboardDataBySlug(
  supabase: TypedSupabaseClient,
  user: User,
  slug: string,
) {
  const landingPage = await getPublishedLandingPageBySlug(supabase, slug);

  if (!landingPage) {
    return null;
  }

  const programId = landingPage.program.id;

  const [{ data: program, error: programError }, { data: registration, error: registrationError }] =
    await Promise.all([
      supabase
        .from("programs")
        .select(
          "id, name, slug, short_description, registration_closes_at, submission_closes_at, starts_at, ends_at",
        )
        .eq("id", programId)
        .single(),
      supabase
        .from("program_registrations")
        .select("id, status, created_at")
        .eq("program_id", programId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  if (programError) {
    throw programError;
  }

  if (registrationError) {
    throw registrationError;
  }

  if (!registration) {
    return {
      program: {
        id: program.id,
        name: program.name,
        slug: program.slug,
        shortDescription: program.short_description,
        registrationClosesAt: program.registration_closes_at,
        submissionClosesAt: program.submission_closes_at,
        startsAt: program.starts_at,
        endsAt: program.ends_at,
      },
      registration: null,
      team: null,
      submission: null,
      mentorSessions: [],
    } satisfies ParticipantDashboardData;
  }

  const { data: membershipRows, error: membershipError } = await supabase
    .from("team_members")
    .select("team_id, is_lead")
    .eq("user_id", user.id);

  if (membershipError) {
    throw membershipError;
  }

  const teamMembership = (membershipRows ?? []).find((row) => Boolean(row.team_id)) ?? null;
  let team: ParticipantDashboardData["team"] = null;
  let submission: ParticipantDashboardData["submission"] = null;
  let mentorSessions: ParticipantDashboardData["mentorSessions"] = [];

  if (teamMembership?.team_id) {
    const [{ data: teamRow, error: teamError }, { data: teamMembers, error: teamMembersError }] =
      await Promise.all([
        supabase
          .from("teams")
          .select("id, name, slug, team_bio, project_idea")
          .eq("id", teamMembership.team_id)
          .single(),
        supabase
          .from("team_members")
          .select("user_id, is_lead")
          .eq("team_id", teamMembership.team_id),
      ]);

    if (teamError) {
      throw teamError;
    }

    if (teamMembersError) {
      throw teamMembersError;
    }

    const memberIds = (teamMembers ?? []).map((member) => member.user_id);
    const { data: profiles, error: profilesError } = memberIds.length
      ? await supabase.from("profiles").select("id, full_name, email").in("id", memberIds)
      : { data: [], error: null as null | Error };

    if (profilesError) {
      throw profilesError;
    }

    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

    team = {
      id: teamRow.id,
      name: teamRow.name,
      slug: teamRow.slug,
      teamBio: teamRow.team_bio,
      projectIdea: teamRow.project_idea,
      isLead: teamMembership.is_lead,
      members: (teamMembers ?? []).map((member) => ({
        userId: member.user_id,
        fullName: profileMap.get(member.user_id)?.full_name ?? null,
        email: profileMap.get(member.user_id)?.email ?? null,
        isLead: member.is_lead,
      })),
    };

    const [{ data: submissionRow, error: submissionError }, { data: mentorSessionRows, error: mentorSessionError }] =
      await Promise.all([
        supabase
          .from("submissions")
          .select("id, title, status, updated_at")
          .eq("program_id", programId)
          .eq("team_id", teamMembership.team_id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("mentor_session_participants")
          .select("mentor_session_id, mentor_sessions!inner(id, status, starts_at, session_type)")
          .eq("team_id", teamMembership.team_id),
      ]);

    if (submissionError) {
      throw submissionError;
    }

    if (mentorSessionError) {
      throw mentorSessionError;
    }

    mentorSessions = (mentorSessionRows ?? [])
      .map((row) => ({
        id: row.mentor_sessions.id,
        title: row.mentor_sessions.session_type.replaceAll("_", " "),
        startsAt: row.mentor_sessions.starts_at,
        status: row.mentor_sessions.status,
      }))
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
      .slice(0, 3);

    if (submissionRow) {
      const [{ data: answerRows, error: answerError }, submissionFormState] = await Promise.all([
        supabase
          .from("submission_answers")
          .select("form_field_key, answer")
          .eq("submission_id", submissionRow.id),
        getProgramFormManagerData(supabase, programId, "submission"),
      ]);

      if (answerError) {
        throw answerError;
      }

      const requiredFields = submissionFormState.fields.filter((field) => field.isRequired);
      const answerMap = new Map(
        (answerRows ?? []).map((answer) => [answer.form_field_key, answer.answer]),
      );
      const answeredRequired = requiredFields.filter((field) =>
        hasSubmissionAnswerValue(field.fieldType, answerMap.get(field.fieldKey)),
      ).length;
      const totalRequired = requiredFields.length;

      submission = {
        id: submissionRow.id,
        title: submissionRow.title,
        status: submissionRow.status,
        updatedAt: submissionRow.updated_at,
        answeredRequired,
        totalRequired,
        completionPercent:
          totalRequired > 0 ? Math.round((answeredRequired / totalRequired) * 100) : 0,
      };
    }
  }

  return {
    program: {
      id: program.id,
      name: program.name,
      slug: program.slug,
      shortDescription: program.short_description,
      registrationClosesAt: program.registration_closes_at,
      submissionClosesAt: program.submission_closes_at,
      startsAt: program.starts_at,
      endsAt: program.ends_at,
    },
    registration: {
      id: registration.id,
      status: registration.status,
      createdAt: registration.created_at,
    },
    team,
    submission,
    mentorSessions,
  } satisfies ParticipantDashboardData;
}

function hasSubmissionAnswerValue(fieldType: string, value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (fieldType === "consent_checkbox") {
    return value === true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }

  return Boolean(value);
}

export async function getParticipantSubmissionWorkspaceDataBySlug(
  supabase: TypedSupabaseClient,
  user: User,
  slug: string,
) {
  const dashboard = await getParticipantDashboardDataBySlug(supabase, user, slug);

  if (!dashboard?.registration) {
    return null;
  }

  const formState = await getProgramFormManagerData(supabase, dashboard.program.id, "submission");

  let submission = await supabase
    .from("submissions")
    .select(
      "id, title, problem_statement, solution_description, demo_url, github_url, ai_usage_disclosure, status, updated_at, team_id, program_registration_id",
    )
    .eq("program_id", dashboard.program.id)
    .eq("program_registration_id", dashboard.registration.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (submission.error) {
    throw submission.error;
  }

  if (!submission.data && dashboard.team) {
    submission = await supabase
      .from("submissions")
      .select(
        "id, title, problem_statement, solution_description, demo_url, github_url, ai_usage_disclosure, status, updated_at, team_id, program_registration_id",
      )
      .eq("program_id", dashboard.program.id)
      .eq("team_id", dashboard.team.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (submission.error) {
      throw submission.error;
    }
  }

  let submissionRow = submission.data;

  if (!submissionRow) {
    const { data: createdSubmission, error: createSubmissionError } = await supabase
      .from("submissions")
      .insert({
        program_id: dashboard.program.id,
        team_id: dashboard.team?.id ?? null,
        program_registration_id: dashboard.registration.id,
        created_by: user.id,
        title: dashboard.team?.name
          ? `${dashboard.team.name} submission`
          : `${dashboard.program.name} submission`,
        status: "draft",
      })
      .select(
        "id, title, problem_statement, solution_description, demo_url, github_url, ai_usage_disclosure, status, updated_at, team_id, program_registration_id",
      )
      .single();

    if (createSubmissionError) {
      throw createSubmissionError;
    }

    submissionRow = createdSubmission;
  }

  const { data: answerRows, error: answersError } = await supabase
    .from("submission_answers")
    .select("form_field_key, answer")
    .eq("submission_id", submissionRow.id);

  if (answersError) {
    throw answersError;
  }

  return {
    program: dashboard.program,
    registration: dashboard.registration,
    team: dashboard.team,
    submission: {
      id: submissionRow.id,
      title: submissionRow.title,
      problemStatement: submissionRow.problem_statement,
      solutionDescription: submissionRow.solution_description,
      demoUrl: submissionRow.demo_url,
      githubUrl: submissionRow.github_url,
      aiUsageDisclosure: submissionRow.ai_usage_disclosure,
      status: submissionRow.status,
      updatedAt: submissionRow.updated_at,
      answers: Object.fromEntries(
        (answerRows ?? []).map((answer) => [answer.form_field_key, answer.answer]),
      ),
    },
    form: formState.form
      ? {
          id: formState.form.id,
          name: formState.form.name,
          description: formState.form.description,
        }
      : null,
    fields: formState.fields,
  } satisfies ParticipantSubmissionWorkspaceData;
}

export async function getParticipantTeamManagementDataBySlug(
  supabase: TypedSupabaseClient,
  user: User,
  slug: string,
) {
  const dashboard = await getParticipantDashboardDataBySlug(supabase, user, slug);

  if (!dashboard?.registration || !dashboard.team) {
    return null;
  }

  const { data: invites, error: invitesError } = await supabase
    .from("team_invites")
    .select(
      "id, email, status, invited_by, invited_user_id, expires_at, created_at, responded_at",
    )
    .eq("team_id", dashboard.team.id)
    .order("created_at", { ascending: false });

  if (invitesError) {
    throw invitesError;
  }

  return {
    program: dashboard.program,
    team: dashboard.team,
    registration: dashboard.registration,
    pendingInvites: (invites ?? []).map((invite) => ({
      id: invite.id,
      email: invite.email,
      status: invite.status,
      invitedBy: invite.invited_by,
      invitedUserId: invite.invited_user_id,
      expiresAt: invite.expires_at,
      createdAt: invite.created_at,
      respondedAt: invite.responded_at,
    })),
  } satisfies ParticipantTeamManagementData;
}

export async function getParticipantNotificationsDataBySlug(
  supabase: TypedSupabaseClient,
  user: User,
  slug: string,
) {
  const dashboard = await getParticipantDashboardDataBySlug(supabase, user, slug);

  if (!dashboard?.registration) {
    return null;
  }

  const { data: notifications, error: notificationsError } = await supabase
    .from("notification_inbox_items")
    .select(
      "id, title, body, status, source_type, action_required, deep_link, created_at",
    )
    .eq("user_id", user.id)
    .eq("program_id", dashboard.program.id)
    .order("created_at", { ascending: false });

  if (notificationsError) {
    throw notificationsError;
  }

  return {
    program: dashboard.program,
    team: dashboard.team,
    notifications: (notifications ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      status: item.status,
      sourceType: item.source_type,
      actionRequired: item.action_required,
      deepLink: item.deep_link,
      createdAt: item.created_at,
    })),
  } satisfies ParticipantNotificationsData;
}

export async function getParticipantResultsDataBySlug(
  supabase: TypedSupabaseClient,
  user: User,
  slug: string,
) {
  const dashboard = await getParticipantDashboardDataBySlug(supabase, user, slug);

  if (!dashboard?.registration) {
    return null;
  }

  const [{ data: participantHistory, error: participantHistoryError }, { data: certificates, error: certificatesError }] =
    await Promise.all([
      supabase
        .from("participant_status_history")
        .select("id, previous_status, new_status, change_reason, created_at")
        .eq("program_registration_id", dashboard.registration.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("certificate_recipients")
        .select(
          "id, recipient_name, certificates!inner(id, certificate_type, title, file_path, issued_at, verification_code)",
        )
        .or(
          dashboard.team
            ? `user_id.eq.${user.id},team_id.eq.${dashboard.team.id}`
            : `user_id.eq.${user.id}`,
        ),
    ]);

  if (participantHistoryError) {
    throw participantHistoryError;
  }

  if (certificatesError) {
    throw certificatesError;
  }

  let submissionStatusHistory: ParticipantResultsData["submissionStatusHistory"] = [];

  if (dashboard.submission) {
    const { data: submissionHistory, error: submissionHistoryError } = await supabase
      .from("submission_status_history")
      .select("id, previous_status, new_status, change_reason, created_at")
      .eq("submission_id", dashboard.submission.id)
      .order("created_at", { ascending: false });

    if (submissionHistoryError) {
      throw submissionHistoryError;
    }

    submissionStatusHistory = (submissionHistory ?? []).map((item) => ({
      id: item.id,
      previousStatus: item.previous_status,
      newStatus: item.new_status,
      changeReason: item.change_reason,
      createdAt: item.created_at,
    }));
  }

  return {
    program: dashboard.program,
    registration: dashboard.registration,
    team: dashboard.team,
    submission: dashboard.submission,
    participantStatusHistory: (participantHistory ?? []).map((item) => ({
      id: item.id,
      previousStatus: item.previous_status,
      newStatus: item.new_status,
      changeReason: item.change_reason,
      createdAt: item.created_at,
    })),
    submissionStatusHistory,
    certificates: (certificates ?? []).map((recipient) => ({
      id: recipient.certificates.id,
      certificateType: recipient.certificates.certificate_type,
      title: recipient.certificates.title,
      filePath: recipient.certificates.file_path,
      issuedAt: recipient.certificates.issued_at,
      verificationCode: recipient.certificates.verification_code,
      recipientName: recipient.recipient_name,
    })),
  } satisfies ParticipantResultsData;
}

export async function getJudgePortalData(
  supabase: TypedSupabaseClient,
  user: User,
  programId: string,
) {
  const [{ data: membership, error: membershipError }, { data: program, error: programError }] =
    await Promise.all([
      supabase
        .from("program_memberships")
        .select("role")
        .eq("program_id", programId)
        .eq("user_id", user.id)
        .in("role", ["judge", "judge_manager"])
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("programs")
        .select("id, name, short_description, submission_closes_at")
        .eq("id", programId)
        .single(),
    ]);

  if (membershipError) {
    throw membershipError;
  }

  if (programError) {
    throw programError;
  }

  if (!membership) {
    return null;
  }

  const [{ data: assignmentRows, error: assignmentsError }, { data: conflicts, error: conflictsError }, { data: scoreSubmissions, error: scoreSubmissionsError }, { data: judgeProgress, error: judgeProgressError }] =
    await Promise.all([
      supabase
        .from("judge_assignments")
        .select(
          "id, submission_id, program_id, status, due_at, assigned_at, completed_at, notes, submissions!inner(id, title, problem_statement, solution_description, demo_url, github_url, team_id)",
        )
        .eq("program_id", programId)
        .eq("judge_user_id", user.id)
        .order("assigned_at", { ascending: true }),
      supabase
        .from("judge_conflicts")
        .select("id, submission_id, reason")
        .eq("program_id", programId)
        .eq("judge_user_id", user.id),
      supabase
        .from("score_submissions")
        .select("id, submission_id, status, total_score, submitted_at")
        .eq("program_id", programId)
        .eq("judge_user_id", user.id),
      supabase
        .from("judge_progress")
        .select("assignments_total, assignments_completed, last_activity_at")
        .eq("program_id", programId)
        .eq("judge_user_id", user.id)
        .maybeSingle(),
    ]);

  if (assignmentsError) {
    throw assignmentsError;
  }
  if (conflictsError) {
    throw conflictsError;
  }
  if (scoreSubmissionsError) {
    throw scoreSubmissionsError;
  }
  if (judgeProgressError) {
    throw judgeProgressError;
  }

  const teamIds = Array.from(
    new Set(
      (assignmentRows ?? [])
        .map((row) => row.submissions.team_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [{ data: teams, error: teamsError }, { data: teamMembers, error: teamMembersError }] =
    teamIds.length > 0
      ? await Promise.all([
          supabase.from("teams").select("id, name").in("id", teamIds),
          supabase.from("team_members").select("team_id, user_id, is_lead").in("team_id", teamIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];

  if (teamsError) {
    throw teamsError;
  }
  if (teamMembersError) {
    throw teamMembersError;
  }

  const memberIds = Array.from(
    new Set((teamMembers ?? []).map((member) => member.user_id)),
  );
  const { data: profiles, error: profilesError } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", memberIds)
    : { data: [], error: null };

  if (profilesError) {
    throw profilesError;
  }

  const teamMap = new Map((teams ?? []).map((team) => [team.id, team]));
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const teamMembersByTeamId = new Map<string, JudgeAssignmentSummary["teamMembers"]>();
  for (const member of teamMembers ?? []) {
    const bucket = teamMembersByTeamId.get(member.team_id) ?? [];
    const profile = profileMap.get(member.user_id) ?? null;
    bucket.push({
      userId: member.user_id,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
      isLead: member.is_lead,
    });
    teamMembersByTeamId.set(member.team_id, bucket);
  }

  const conflictBySubmissionId = new Map(
    (conflicts ?? []).map((conflict) => [conflict.submission_id ?? "", conflict]),
  );
  const scoreSubmissionBySubmissionId = new Map(
    (scoreSubmissions ?? []).map((item) => [item.submission_id, item]),
  );

  const assignments = (assignmentRows ?? []).map((row) => {
    const teamId = row.submissions.team_id;
    const conflict = conflictBySubmissionId.get(row.submission_id) ?? null;
    const scoreSubmission = scoreSubmissionBySubmissionId.get(row.submission_id) ?? null;

    return {
      id: row.id,
      submissionId: row.submission_id,
      programId: row.program_id,
      status: row.status,
      dueAt: row.due_at,
      assignedAt: row.assigned_at,
      completedAt: row.completed_at,
      notes: row.notes,
      submissionTitle: row.submissions.title,
      teamName: teamId ? teamMap.get(teamId)?.name ?? null : null,
      problemStatement: row.submissions.problem_statement,
      solutionDescription: row.submissions.solution_description,
      demoUrl: row.submissions.demo_url,
      githubUrl: row.submissions.github_url,
      teamMembers: teamId ? teamMembersByTeamId.get(teamId) ?? [] : [],
      conflict: conflict
        ? {
            id: conflict.id,
            reason: conflict.reason,
          }
        : null,
      scoreSubmission: scoreSubmission
        ? {
            id: scoreSubmission.id,
            status: scoreSubmission.status,
            totalScore:
              typeof scoreSubmission.total_score === "number"
                ? scoreSubmission.total_score
                : scoreSubmission.total_score
                  ? Number(scoreSubmission.total_score)
                  : null,
            submittedAt: scoreSubmission.submitted_at,
          }
        : null,
    } satisfies JudgeAssignmentSummary;
  });

  const assignmentsCompleted =
    judgeProgress?.assignments_completed ??
    assignments.filter((assignment) => assignment.scoreSubmission?.status === "submitted").length;
  const assignmentsTotal = judgeProgress?.assignments_total ?? assignments.length;
  const assignmentsInProgress = assignments.filter(
    (assignment) => assignment.scoreSubmission?.status === "draft",
  ).length;
  const assignmentsNotStarted = Math.max(
    0,
    assignmentsTotal - assignmentsCompleted - assignmentsInProgress,
  );

  const daysLeft = program.submission_closes_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(program.submission_closes_at).getTime() - Date.now()) / 86400000,
        ),
      )
    : null;

  return {
    program: {
      id: program.id,
      name: program.name,
      shortDescription: program.short_description,
      submissionClosesAt: program.submission_closes_at,
    },
    judgeRole: membership.role,
    progress: {
      assignmentsTotal,
      assignmentsCompleted,
      assignmentsInProgress,
      assignmentsNotStarted,
      daysLeft,
    },
    assignments,
  } satisfies JudgePortalData;
}

export async function getJudgeScorecardWorkspaceData(
  supabase: TypedSupabaseClient,
  user: User,
  programId: string,
  assignmentId: string,
) {
  const portal = await getJudgePortalData(supabase, user, programId);

  if (!portal) {
    return null;
  }

  const assignment = portal.assignments.find((item) => item.id === assignmentId) ?? null;
  if (!assignment) {
    return null;
  }

  const [{ data: scorecard, error: scorecardError }, { data: answers, error: answersError }] =
    await Promise.all([
      supabase
        .from("scorecards")
        .select("id, name, description")
        .eq("program_id", programId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("submission_answers")
        .select("form_field_key, answer")
        .eq("submission_id", assignment.submissionId),
    ]);

  if (scorecardError) {
    throw scorecardError;
  }

  if (answersError) {
    throw answersError;
  }

  if (!scorecard) {
    return {
      program: portal.program,
      judgeRole: portal.judgeRole,
      assignment,
      scorecard: null,
      criteria: [],
      submissionAnswers: Object.fromEntries(
        (answers ?? []).map((answer) => [answer.form_field_key, answer.answer]),
      ),
    } satisfies JudgeScorecardWorkspaceData;
  }

  const [{ data: criteriaRows, error: criteriaError }, existingScoreSubmission] = await Promise.all([
    supabase
      .from("scorecard_criteria")
      .select(
        "id, criterion_key, label, description, weight, scale_type, scale_config, judge_guidance, requires_comment, display_order",
      )
      .eq("scorecard_id", scorecard.id)
      .order("display_order", { ascending: true }),
    assignment.scoreSubmission
      ? supabase
          .from("score_submissions")
          .select("id")
          .eq("id", assignment.scoreSubmission.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (criteriaError) {
    throw criteriaError;
  }
  if (existingScoreSubmission.error) {
    throw existingScoreSubmission.error;
  }

  const scoreSubmissionId = existingScoreSubmission.data?.id ?? null;

  const [{ data: scoreRows, error: scoreRowsError }, { data: commentRows, error: commentRowsError }] =
    scoreSubmissionId
      ? await Promise.all([
          supabase
            .from("scores")
            .select("scorecard_criterion_id, numeric_score")
            .eq("score_submission_id", scoreSubmissionId),
          supabase
            .from("score_comments")
            .select("scorecard_criterion_id, comment_text")
            .eq("score_submission_id", scoreSubmissionId),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];

  if (scoreRowsError) {
    throw scoreRowsError;
  }
  if (commentRowsError) {
    throw commentRowsError;
  }

  const scoreByCriterionId = new Map(
    (scoreRows ?? []).map((row) => [
      row.scorecard_criterion_id,
      typeof row.numeric_score === "number"
        ? row.numeric_score
        : row.numeric_score
          ? Number(row.numeric_score)
          : null,
    ]),
  );
  const commentByCriterionId = new Map(
    (commentRows ?? []).map((row) => [row.scorecard_criterion_id ?? "", row.comment_text]),
  );

  return {
    program: portal.program,
    judgeRole: portal.judgeRole,
    assignment,
    scorecard: {
      id: scorecard.id,
      name: scorecard.name,
      description: scorecard.description,
    },
    criteria: (criteriaRows ?? []).map((criterion) => ({
      id: criterion.id,
      criterionKey: criterion.criterion_key,
      label: criterion.label,
      description: criterion.description,
      weight:
        typeof criterion.weight === "number" ? criterion.weight : Number(criterion.weight),
      scaleType: criterion.scale_type,
      scaleConfig: criterion.scale_config,
      judgeGuidance: criterion.judge_guidance,
      requiresComment: criterion.requires_comment,
      displayOrder: criterion.display_order,
      existingScore: scoreByCriterionId.get(criterion.id) ?? null,
      existingComment: commentByCriterionId.get(criterion.id) ?? null,
    })),
    submissionAnswers: Object.fromEntries(
      (answers ?? []).map((answer) => [answer.form_field_key, answer.answer]),
    ),
  } satisfies JudgeScorecardWorkspaceData;
}

export async function getProgramJudgeCalibrationManagerData(
  supabase: TypedSupabaseClient,
  programId: string,
) {
  const [{ data: exercise, error: exerciseError }, { data: judgeMemberships, error: judgeMembershipsError }] =
    await Promise.all([
      supabase
        .from("judge_calibration_exercises")
        .select(
          "id, scorecard_id, title, reference_code, instructions, problem_summary, solution_summary, validation_summary, team_summary, pitch_deck_url, demo_url, consensus_total_score, manager_note, scoring_anchors",
        )
        .eq("program_id", programId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("program_memberships")
        .select("user_id")
        .eq("program_id", programId)
        .eq("status", "active")
        .in("role", ["judge", "judge_manager"]),
    ]);

  if (exerciseError) {
    throw exerciseError;
  }
  if (judgeMembershipsError) {
    throw judgeMembershipsError;
  }

  if (!exercise) {
    return {
      exercise: null,
      scorecard: null,
      criteria: [],
      totalJudges: judgeMemberships?.length ?? 0,
      completedJudges: 0,
      meanScore: null,
      scoreMin: null,
      scoreMax: null,
      stdDeviation: null,
      judgeTotals: [],
    } satisfies ProgramJudgeCalibrationManagerData;
  }

  const [
    { data: scorecard, error: scorecardError },
    { data: criteriaRows, error: criteriaError },
    { data: submissions, error: submissionsError },
  ] = await Promise.all([
    supabase
      .from("scorecards")
      .select("id, name")
      .eq("id", exercise.scorecard_id)
      .maybeSingle(),
    supabase
      .from("scorecard_criteria")
      .select("id, label, description, weight, display_order")
      .eq("scorecard_id", exercise.scorecard_id)
      .order("display_order", { ascending: true }),
    supabase
      .from("judge_calibration_submissions")
      .select("judge_user_id, total_score, status")
      .eq("calibration_exercise_id", exercise.id),
  ]);

  if (scorecardError) {
    throw scorecardError;
  }
  if (criteriaError) {
    throw criteriaError;
  }
  if (submissionsError) {
    throw submissionsError;
  }

  const judgeIds = Array.from(
    new Set((submissions ?? []).map((submission) => submission.judge_user_id)),
  );
  const { data: profiles, error: profilesError } = judgeIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", judgeIds)
    : { data: [], error: null };

  if (profilesError) {
    throw profilesError;
  }

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const submittedTotals = (submissions ?? [])
    .filter((submission) => submission.status === "submitted")
    .map((submission) =>
      typeof submission.total_score === "number"
        ? submission.total_score
        : submission.total_score
          ? Number(submission.total_score)
          : null,
    )
    .filter((value): value is number => value !== null);

  const stats = buildScoreStats(submittedTotals);

  return {
    exercise: mapCalibrationExercise(exercise),
    scorecard: scorecard
      ? {
          id: scorecard.id,
          name: scorecard.name,
        }
      : null,
    criteria: (criteriaRows ?? []).map((criterion) => ({
      id: criterion.id,
      label: criterion.label,
      description: criterion.description,
      weight: typeof criterion.weight === "number" ? criterion.weight : Number(criterion.weight),
      displayOrder: criterion.display_order,
    })),
    totalJudges: judgeMemberships?.length ?? 0,
    completedJudges: (submissions ?? []).filter((submission) => submission.status === "submitted").length,
    meanScore: stats.mean,
    scoreMin: stats.min,
    scoreMax: stats.max,
    stdDeviation: stats.stdDeviation,
    judgeTotals: (submissions ?? [])
      .filter((submission) => submission.status === "submitted")
      .map((submission) => ({
      judgeUserId: submission.judge_user_id,
      judgeName: profileMap.get(submission.judge_user_id)?.full_name ?? null,
      totalScore:
        typeof submission.total_score === "number"
          ? submission.total_score
          : submission.total_score
            ? Number(submission.total_score)
            : null,
    })),
  } satisfies ProgramJudgeCalibrationManagerData;
}

export async function getJudgeCalibrationWorkspaceData(
  supabase: TypedSupabaseClient,
  user: User,
  programId: string,
) {
  const portal = await getJudgePortalData(supabase, user, programId);

  if (!portal) {
    return null;
  }

  const managerData = await getProgramJudgeCalibrationManagerData(supabase, programId);
  if (!managerData.exercise || !managerData.scorecard) {
    return {
      program: portal.program,
      judgeRole: portal.judgeRole,
      exercise: null,
      scorecard: null,
      criteria: [],
      existingSubmission: null,
      alignment: {
        completedJudges: managerData.completedJudges,
        totalJudges: managerData.totalJudges,
        meanScore: managerData.meanScore,
        scoreMin: managerData.scoreMin,
        scoreMax: managerData.scoreMax,
        stdDeviation: managerData.stdDeviation,
        judgeTotals: managerData.judgeTotals,
      },
    } satisfies JudgeCalibrationWorkspaceData;
  }

  const { data: calibrationSubmission, error: calibrationSubmissionError } = await supabase
    .from("judge_calibration_submissions")
    .select("id, status, total_score, notes, submitted_at")
    .eq("calibration_exercise_id", managerData.exercise.id)
    .eq("judge_user_id", user.id)
    .maybeSingle();

  if (calibrationSubmissionError) {
    throw calibrationSubmissionError;
  }

  const { data: calibrationScores, error: calibrationScoresError } =
    calibrationSubmission
      ? await supabase
          .from("judge_calibration_scores")
          .select("scorecard_criterion_id, numeric_score")
          .eq("calibration_submission_id", calibrationSubmission.id)
      : { data: [], error: null };

  if (calibrationScoresError) {
    throw calibrationScoresError;
  }

  const scoreMap = new Map(
    (calibrationScores ?? []).map((row) => [
      row.scorecard_criterion_id,
      typeof row.numeric_score === "number"
        ? row.numeric_score
        : row.numeric_score
          ? Number(row.numeric_score)
          : null,
    ]),
  );

  return {
    program: portal.program,
    judgeRole: portal.judgeRole,
    exercise: managerData.exercise,
    scorecard: managerData.scorecard,
    criteria: managerData.criteria.map((criterion) => ({
      id: criterion.id,
      label: criterion.label,
      description: criterion.description,
      weight: criterion.weight,
      displayOrder: criterion.displayOrder,
      existingScore: scoreMap.get(criterion.id) ?? null,
    })),
    existingSubmission: calibrationSubmission
      ? {
          id: calibrationSubmission.id,
          status: calibrationSubmission.status,
          totalScore:
            typeof calibrationSubmission.total_score === "number"
              ? calibrationSubmission.total_score
              : calibrationSubmission.total_score
                ? Number(calibrationSubmission.total_score)
                : null,
          notes: calibrationSubmission.notes,
          submittedAt: calibrationSubmission.submitted_at,
        }
      : null,
    alignment: {
      completedJudges: managerData.completedJudges,
      totalJudges: managerData.totalJudges,
      meanScore: managerData.meanScore,
      scoreMin: managerData.scoreMin,
      scoreMax: managerData.scoreMax,
      stdDeviation: managerData.stdDeviation,
      judgeTotals: managerData.judgeTotals,
    },
  } satisfies JudgeCalibrationWorkspaceData;
}

export async function getProgramJudgingModerationData(
  supabase: TypedSupabaseClient,
  user: User,
  programId: string,
) {
  const [{ data: membership, error: membershipError }, { data: program, error: programError }] =
    await Promise.all([
      supabase
        .from("program_memberships")
        .select("role")
        .eq("program_id", programId)
        .eq("user_id", user.id)
        .in("role", ["program_manager", "program_editor", "judge_manager"])
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("programs")
        .select("id, name, slug, short_description")
        .eq("id", programId)
        .maybeSingle(),
    ]);

  if (membershipError) {
    throw membershipError;
  }

  if (programError) {
    throw programError;
  }

  if (!membership || !program) {
    return null;
  }

  const [{ data: scorecards, error: scorecardsError }, { data: submissions, error: submissionsError }] =
    await Promise.all([
      supabase
        .from("scorecards")
        .select("id, is_active, created_at")
        .eq("program_id", programId)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("submissions")
        .select(
          "id, title, status, submitted_at, problem_statement, solution_description, demo_url, github_url, team_id",
        )
        .eq("program_id", programId)
        .in("status", [
          "submitted",
          "under_review",
          "needs_revision",
          "shortlisted",
          "finalist",
          "winner",
          "rejected",
        ]),
    ]);

  if (scorecardsError) {
    throw scorecardsError;
  }

  if (submissionsError) {
    throw submissionsError;
  }

  const activeScorecardId = (scorecards ?? []).find((scorecard) => scorecard.is_active)?.id ?? scorecards?.[0]?.id ?? null;

  const [{ data: criteriaRows, error: criteriaError }, { data: scoreSubmissions, error: scoreSubmissionsError }, { data: conflicts, error: conflictsError }, { data: historyRows, error: historyRowsError }] =
    await Promise.all([
      activeScorecardId
        ? supabase
            .from("scorecard_criteria")
            .select("id, label, display_order")
            .eq("scorecard_id", activeScorecardId)
            .order("display_order", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("score_submissions")
        .select("id, submission_id, judge_user_id, total_score, submitted_at, status")
        .eq("program_id", programId)
        .eq("status", "submitted"),
      supabase
        .from("judge_conflicts")
        .select("id, submission_id, judge_user_id, reason, created_at")
        .eq("program_id", programId),
      supabase
        .from("submission_status_history")
        .select("submission_id, change_reason, created_at")
        .in(
          "new_status",
          ["shortlisted", "finalist", "winner", "rejected"] satisfies Database["public"]["Enums"]["submission_status"][],
        )
        .order("created_at", { ascending: false }),
    ]);

  if (criteriaError) {
    throw criteriaError;
  }
  if (scoreSubmissionsError) {
    throw scoreSubmissionsError;
  }
  if (conflictsError) {
    throw conflictsError;
  }
  if (historyRowsError) {
    throw historyRowsError;
  }

  const scoreSubmissionIds = (scoreSubmissions ?? []).map((submission) => submission.id);
  const teamIds = Array.from(
    new Set(
      (submissions ?? [])
        .map((submission) => submission.team_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const judgeUserIds = Array.from(
    new Set([
      ...(scoreSubmissions ?? []).map((submission) => submission.judge_user_id),
      ...(conflicts ?? []).map((conflict) => conflict.judge_user_id),
    ]),
  );

  const [
    { data: scoreRows, error: scoreRowsError },
    { data: commentRows, error: commentRowsError },
    { data: teams, error: teamsError },
    { data: teamMembers, error: teamMembersError },
    { data: judgeProfiles, error: judgeProfilesError },
  ] = await Promise.all([
    scoreSubmissionIds.length > 0
      ? supabase
          .from("scores")
          .select("score_submission_id, scorecard_criterion_id, numeric_score")
          .in("score_submission_id", scoreSubmissionIds)
      : Promise.resolve({ data: [], error: null }),
    scoreSubmissionIds.length > 0
      ? supabase
          .from("score_comments")
          .select("score_submission_id, comment_text")
          .in("score_submission_id", scoreSubmissionIds)
      : Promise.resolve({ data: [], error: null }),
    teamIds.length > 0
      ? supabase.from("teams").select("id, name").in("id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    teamIds.length > 0
      ? supabase.from("team_members").select("team_id, user_id, is_lead").in("team_id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    judgeUserIds.length > 0
      ? supabase.from("profiles").select("id, full_name, email").in("id", judgeUserIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (scoreRowsError) {
    throw scoreRowsError;
  }
  if (commentRowsError) {
    throw commentRowsError;
  }
  if (teamsError) {
    throw teamsError;
  }
  if (teamMembersError) {
    throw teamMembersError;
  }
  if (judgeProfilesError) {
    throw judgeProfilesError;
  }

  const participantIds = Array.from(
    new Set((teamMembers ?? []).map((member) => member.user_id)),
  );
  const { data: participantProfiles, error: participantProfilesError } = participantIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", participantIds)
    : { data: [], error: null };

  if (participantProfilesError) {
    throw participantProfilesError;
  }

  const criteria = (criteriaRows ?? []).map((criterion) => ({
    id: criterion.id,
    label: criterion.label,
    displayOrder: criterion.display_order,
  }));

  const teamMap = new Map((teams ?? []).map((team) => [team.id, team.name]));
  const judgeProfileMap = new Map(
    (judgeProfiles ?? []).map((profile) => [profile.id, profile]),
  );
  const participantProfileMap = new Map(
    (participantProfiles ?? []).map((profile) => [profile.id, profile]),
  );

  const teamMembersByTeamId = new Map<string, ProgramJudgingModerationCandidate["teamMembers"]>();
  for (const member of teamMembers ?? []) {
    const bucket = teamMembersByTeamId.get(member.team_id) ?? [];
    const profile = participantProfileMap.get(member.user_id) ?? null;
    bucket.push({
      userId: member.user_id,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
      isLead: member.is_lead,
    });
    teamMembersByTeamId.set(member.team_id, bucket);
  }

  const scoresBySubmissionId = new Map<string, typeof scoreSubmissions>();
  for (const scoreSubmission of scoreSubmissions ?? []) {
    const bucket = scoresBySubmissionId.get(scoreSubmission.submission_id) ?? [];
    bucket.push(scoreSubmission);
    scoresBySubmissionId.set(scoreSubmission.submission_id, bucket);
  }

  const criterionScoresBySubmissionId = new Map<string, Array<{ scorecard_criterion_id: string; numeric_score: number | null }>>();
  for (const score of scoreRows ?? []) {
    const bucket = criterionScoresBySubmissionId.get(score.score_submission_id) ?? [];
    bucket.push({
      scorecard_criterion_id: score.scorecard_criterion_id,
      numeric_score:
        typeof score.numeric_score === "number"
          ? score.numeric_score
          : score.numeric_score
            ? Number(score.numeric_score)
            : null,
    });
    criterionScoresBySubmissionId.set(score.score_submission_id, bucket);
  }

  const commentsBySubmissionId = new Map<string, string[]>();
  for (const comment of commentRows ?? []) {
    const bucket = commentsBySubmissionId.get(comment.score_submission_id) ?? [];
    bucket.push(comment.comment_text);
    commentsBySubmissionId.set(comment.score_submission_id, bucket);
  }

  const conflictsBySubmissionId = new Map<string, ModerationConflictRow[]>();
  for (const conflict of conflicts ?? []) {
    if (!conflict.submission_id) {
      continue;
    }

    const bucket = conflictsBySubmissionId.get(conflict.submission_id) ?? [];
    const judge = judgeProfileMap.get(conflict.judge_user_id) ?? null;
    bucket.push({
      id: conflict.id,
      judgeUserId: conflict.judge_user_id,
      judgeName: judge?.full_name ?? null,
      reason: conflict.reason,
      createdAt: conflict.created_at,
    });
    conflictsBySubmissionId.set(conflict.submission_id, bucket);
  }

  const latestHistoryBySubmissionId = new Map<string, string>();
  for (const historyRow of historyRows ?? []) {
    if (!latestHistoryBySubmissionId.has(historyRow.submission_id) && historyRow.change_reason) {
      latestHistoryBySubmissionId.set(historyRow.submission_id, historyRow.change_reason);
    }
  }

  const candidates = (submissions ?? []).map((submission) => {
    const relatedScoreSubmissions = scoresBySubmissionId.get(submission.id) ?? [];
    const numericTotals = relatedScoreSubmissions
      .map((scoreSubmission) =>
        typeof scoreSubmission.total_score === "number"
          ? scoreSubmission.total_score
          : scoreSubmission.total_score
            ? Number(scoreSubmission.total_score)
            : null,
      )
      .filter((value): value is number => value !== null);

    const averageScore =
      numericTotals.length > 0
        ? Number(
            (numericTotals.reduce((sum, value) => sum + value, 0) / numericTotals.length).toFixed(1),
          )
        : null;
    const scoreMin = numericTotals.length > 0 ? Math.min(...numericTotals) : null;
    const scoreMax = numericTotals.length > 0 ? Math.max(...numericTotals) : null;
    const variance =
      scoreMin !== null && scoreMax !== null ? Number((scoreMax - scoreMin).toFixed(1)) : null;

    return {
      submissionId: submission.id,
      title: submission.title,
      status: submission.status,
      submittedAt: submission.submitted_at,
      teamName: submission.team_id ? teamMap.get(submission.team_id) ?? null : null,
      teamMembers: submission.team_id ? teamMembersByTeamId.get(submission.team_id) ?? [] : [],
      problemStatement: submission.problem_statement,
      solutionDescription: submission.solution_description,
      demoUrl: submission.demo_url,
      githubUrl: submission.github_url,
      averageScore,
      scoreMin,
      scoreMax,
      variance,
      submittedScoresCount: relatedScoreSubmissions.length,
      rank: null,
      latestDecisionNote: latestHistoryBySubmissionId.get(submission.id) ?? null,
      judgeScores: relatedScoreSubmissions
        .map((scoreSubmission) => {
          const judge = judgeProfileMap.get(scoreSubmission.judge_user_id) ?? null;
          const criterionScoreMap = new Map(
            (criterionScoresBySubmissionId.get(scoreSubmission.id) ?? []).map((row) => [
              row.scorecard_criterion_id,
              row.numeric_score,
            ]),
          );

          return {
            judgeUserId: scoreSubmission.judge_user_id,
            judgeName: judge?.full_name ?? null,
            judgeEmail: judge?.email ?? null,
            totalScore:
              typeof scoreSubmission.total_score === "number"
                ? scoreSubmission.total_score
                : scoreSubmission.total_score
                  ? Number(scoreSubmission.total_score)
                  : null,
            submittedAt: scoreSubmission.submitted_at,
            criterionScores: criteria.map((criterion) => ({
              criterionId: criterion.id,
              label: criterion.label,
              score: criterionScoreMap.get(criterion.id) ?? null,
            })),
            comments: commentsBySubmissionId.get(scoreSubmission.id) ?? [],
          } satisfies ModerationJudgeScoreRow;
        })
        .sort((a, b) => (b.totalScore ?? -1) - (a.totalScore ?? -1)),
      conflicts: (conflictsBySubmissionId.get(submission.id) ?? []).sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : -1,
      ),
    } satisfies ProgramJudgingModerationCandidate;
  });

  const rankedCandidates = [...candidates]
    .filter((candidate) => candidate.averageScore !== null)
    .sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1));
  const rankBySubmissionId = new Map(
    rankedCandidates.map((candidate, index) => [candidate.submissionId, index + 1]),
  );

  const candidatesWithRank = candidates
    .map((candidate) => ({
      ...candidate,
      rank: rankBySubmissionId.get(candidate.submissionId) ?? null,
    }))
    .sort((a, b) => {
      const aPending = isPendingModerationStatus(a.status) ? 0 : 1;
      const bPending = isPendingModerationStatus(b.status) ? 0 : 1;
      if (aPending !== bPending) {
        return aPending - bPending;
      }

      if ((b.averageScore ?? -1) !== (a.averageScore ?? -1)) {
        return (b.averageScore ?? -1) - (a.averageScore ?? -1);
      }

      return a.title.localeCompare(b.title);
    });

  return {
    program: {
      id: program.id,
      name: program.name,
      slug: program.slug,
      shortDescription: program.short_description,
    },
    criteria,
    candidates: candidatesWithRank,
    pendingCount: candidatesWithRank.filter((candidate) => isPendingModerationStatus(candidate.status)).length,
    decidedCount: candidatesWithRank.filter((candidate) => !isPendingModerationStatus(candidate.status)).length,
    finalistsCount: candidatesWithRank.filter((candidate) => candidate.status === "finalist").length,
    winnersCount: candidatesWithRank.filter((candidate) => candidate.status === "winner").length,
    rejectedCount: candidatesWithRank.filter((candidate) => candidate.status === "rejected").length,
  } satisfies ProgramJudgingModerationData;
}

export async function getMentorPortalData(
  supabase: TypedSupabaseClient,
  user: User,
  programId: string,
) {
  const [{ data: membership, error: membershipError }, { data: program, error: programError }] =
    await Promise.all([
      supabase
        .from("program_memberships")
        .select("role")
        .eq("program_id", programId)
        .eq("user_id", user.id)
        .in("role", ["mentor", "mentor_manager", "program_manager"])
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("programs")
        .select("id, name, short_description, starts_at, ends_at")
        .eq("id", programId)
        .maybeSingle(),
    ]);

  if (membershipError) throw membershipError;
  if (programError) throw programError;
  if (!membership || !program) return null;

  const { data: mentorProfile, error: mentorProfileError } = await supabase
    .from("mentor_profiles")
    .select(
      "id, display_name, title, organization_name, bio, max_mentoring_load, stage_preferences, session_format_preferences, languages, regions",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (mentorProfileError) throw mentorProfileError;

  const mentorMembership = mentorProfile
    ? await supabase
        .from("mentor_program_memberships")
        .select("id, status, auto_confirm_allowed, max_sessions")
        .eq("program_id", programId)
        .eq("mentor_profile_id", mentorProfile.id)
        .maybeSingle()
    : { data: null, error: null };

  if (mentorMembership.error) throw mentorMembership.error;

  const expertiseTags = mentorProfile
    ? await supabase
        .from("mentor_expertise_tags")
        .select("tag_value")
        .eq("mentor_profile_id", mentorProfile.id)
        .order("tag_value", { ascending: true })
    : { data: [], error: null };

  if (expertiseTags.error) throw expertiseTags.error;

  let sessions: MentorPortalData["sessions"] = [];
  let availabilitySlots: MentorPortalData["availabilitySlots"] = [];
  let bookingRequests: MentorPortalData["bookingRequests"] = [];
  let matchRecommendations: MentorPortalData["matchRecommendations"] = [];

  if (mentorMembership.data?.id) {
    const mentorMembershipId = mentorMembership.data.id;
    const [
      { data: sessionRows, error: sessionsError },
      { data: slotRows, error: slotsError },
      { data: bookingRows, error: bookingsError },
      { data: recommendationRows, error: recommendationsError },
    ] = await Promise.all([
      supabase
        .from("mentor_sessions")
        .select("id, session_type, status, starts_at, ends_at, timezone")
        .eq("program_id", programId)
        .eq("mentor_program_membership_id", mentorMembershipId)
        .order("starts_at", { ascending: true }),
      supabase
        .from("mentor_availability_slots")
        .select("id, session_type, starts_at, ends_at, timezone, capacity, is_available")
        .eq("mentor_program_membership_id", mentorMembershipId)
        .order("starts_at", { ascending: true }),
      supabase
        .from("mentor_booking_requests")
        .select(
          "id, session_type, status, requested_starts_at, requested_ends_at, team_id, requester_user_id, session_goals",
        )
        .eq("program_id", programId)
        .eq("mentor_program_membership_id", mentorMembershipId)
        .order("requested_starts_at", { ascending: true }),
      supabase
        .from("mentor_match_recommendations")
        .select("id, team_id, participant_user_id, score, status, reasoning_summary")
        .eq("mentor_program_membership_id", mentorMembershipId)
        .order("created_at", { ascending: false }),
    ]);

    if (sessionsError) throw sessionsError;
    if (slotsError) throw slotsError;
    if (bookingsError) throw bookingsError;
    if (recommendationsError) throw recommendationsError;

    const sessionIds = (sessionRows ?? []).map((row) => row.id);
    const teamIds = new Set<string>();
    const profileIds = new Set<string>();

    for (const row of bookingRows ?? []) {
      if (row.team_id) teamIds.add(row.team_id);
      profileIds.add(row.requester_user_id);
    }

    for (const row of recommendationRows ?? []) {
      if (row.team_id) teamIds.add(row.team_id);
      if (row.participant_user_id) profileIds.add(row.participant_user_id);
    }

    const sessionParticipants = sessionIds.length
      ? await supabase
          .from("mentor_session_participants")
          .select("mentor_session_id, team_id, user_id")
          .in("mentor_session_id", sessionIds)
      : { data: [], error: null };

    if (sessionParticipants.error) throw sessionParticipants.error;

    for (const row of sessionParticipants.data ?? []) {
      if (row.team_id) teamIds.add(row.team_id);
      if (row.user_id) profileIds.add(row.user_id);
    }

    const [teamsResult, profilesResult] = await Promise.all([
      teamIds.size
        ? supabase.from("teams").select("id, name").in("id", Array.from(teamIds))
        : Promise.resolve({ data: [], error: null }),
      profileIds.size
        ? supabase.from("profiles").select("id, full_name").in("id", Array.from(profileIds))
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (teamsResult.error) throw teamsResult.error;
    if (profilesResult.error) throw profilesResult.error;

    const teamNameMap = new Map((teamsResult.data ?? []).map((row) => [row.id, row.name]));
    const profileNameMap = new Map(
      (profilesResult.data ?? []).map((row) => [row.id, row.full_name ?? null]),
    );
    const participantsBySessionId = new Map<
      string,
      { teamNames: Set<string>; participantNames: Set<string> }
    >();

    for (const row of sessionParticipants.data ?? []) {
      const bucket =
        participantsBySessionId.get(row.mentor_session_id) ??
        { teamNames: new Set<string>(), participantNames: new Set<string>() };

      if (row.team_id) {
        const teamName = teamNameMap.get(row.team_id);
        if (teamName) bucket.teamNames.add(teamName);
      }

      if (row.user_id) {
        const participantName = profileNameMap.get(row.user_id);
        if (participantName) bucket.participantNames.add(participantName);
      }

      participantsBySessionId.set(row.mentor_session_id, bucket);
    }

    sessions = (sessionRows ?? []).map((row) => {
      const participantBucket = participantsBySessionId.get(row.id);

      return {
        id: row.id,
        sessionType: row.session_type,
        status: row.status,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        timezone: row.timezone,
        teamNames: Array.from(participantBucket?.teamNames ?? []),
        participantNames: Array.from(participantBucket?.participantNames ?? []),
      };
    });

    availabilitySlots = (slotRows ?? []).map((row) => ({
      id: row.id,
      sessionType: row.session_type,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      timezone: row.timezone,
      capacity: row.capacity,
      isAvailable: row.is_available,
    }));

    bookingRequests = (bookingRows ?? []).map((row) => ({
      id: row.id,
      sessionType: row.session_type,
      status: row.status,
      requestedStartsAt: row.requested_starts_at,
      requestedEndsAt: row.requested_ends_at,
      teamName: row.team_id ? teamNameMap.get(row.team_id) ?? null : null,
      requesterName: profileNameMap.get(row.requester_user_id) ?? null,
      sessionGoals: row.session_goals,
    }));

    matchRecommendations = (recommendationRows ?? []).map((row) => ({
      id: row.id,
      teamId: row.team_id,
      teamName: row.team_id ? teamNameMap.get(row.team_id) ?? null : null,
      participantName: row.participant_user_id
        ? profileNameMap.get(row.participant_user_id) ?? null
        : null,
      score: row.score,
      status: row.status,
      reasoningSummary: row.reasoning_summary,
    }));
  }

  return {
    program: {
      id: program.id,
      name: program.name,
      shortDescription: program.short_description,
      startsAt: program.starts_at,
      endsAt: program.ends_at,
    },
    programRole: membership.role,
    profile: {
      id: mentorProfile?.id ?? null,
      displayName: mentorProfile?.display_name ?? user.email?.split("@")[0] ?? "Mentor",
      title: mentorProfile?.title ?? null,
      organizationName: mentorProfile?.organization_name ?? null,
      bio: mentorProfile?.bio ?? null,
      maxMentoringLoad: mentorProfile?.max_mentoring_load ?? null,
      expertiseTags: (expertiseTags.data ?? []).map((row) => row.tag_value),
      stagePreferences: parseJsonStringArray(mentorProfile?.stage_preferences ?? []),
      sessionFormatPreferences: parseJsonStringArray(
        mentorProfile?.session_format_preferences ?? [],
      ),
      languages: parseJsonStringArray(mentorProfile?.languages ?? []),
      regions: parseJsonStringArray(mentorProfile?.regions ?? []),
    },
    membership: {
      id: mentorMembership.data?.id ?? null,
      status: mentorMembership.data?.status ?? "pending_profile",
      autoConfirmAllowed: mentorMembership.data?.auto_confirm_allowed ?? false,
      maxSessions: mentorMembership.data?.max_sessions ?? null,
    },
    stats: {
      assignedTeams: new Set(sessions.flatMap((session) => session.teamNames)).size,
      upcomingSessions: sessions.filter(
        (session) =>
          new Date(session.startsAt).getTime() >= Date.now() &&
          !["cancelled", "completed"].includes(session.status),
      ).length,
      pendingBookings: bookingRequests.filter((request) =>
        ["requested", "pending_approval", "draft"].includes(request.status),
      ).length,
      availabilitySlots: availabilitySlots.filter(
        (slot) => slot.isAvailable && new Date(slot.startsAt).getTime() >= Date.now(),
      ).length,
    },
    sessions,
    availabilitySlots,
    bookingRequests,
    matchRecommendations,
  } satisfies MentorPortalData;
}

export async function getMentorSessionDetailData(
  supabase: TypedSupabaseClient,
  user: User,
  programId: string,
  sessionId: string,
) {
  const portal = await getMentorPortalData(supabase, user, programId);

  if (!portal?.membership.id) {
    return null;
  }

  const { data: sessionRow, error: sessionError } = await supabase
    .from("mentor_sessions")
    .select("id, session_type, status, starts_at, ends_at, timezone, session_context")
    .eq("id", sessionId)
    .eq("program_id", programId)
    .eq("mentor_program_membership_id", portal.membership.id)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!sessionRow) return null;

  const [{ data: participantRows, error: participantsError }, { data: noteRows, error: notesError }] =
    await Promise.all([
      supabase
        .from("mentor_session_participants")
        .select("team_id, user_id")
        .eq("mentor_session_id", sessionId),
      supabase
        .from("mentor_session_notes")
        .select("id, content, note_type, visibility, created_at, author_user_id")
        .eq("mentor_session_id", sessionId)
        .order("created_at", { ascending: false }),
    ]);

  if (participantsError) throw participantsError;
  if (notesError) throw notesError;

  const teamIds = Array.from(
    new Set(
      (participantRows ?? [])
        .map((row) => row.team_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const profileIds = Array.from(
    new Set([
      ...(participantRows ?? [])
        .map((row) => row.user_id)
        .filter((value): value is string => Boolean(value)),
      ...(noteRows ?? []).map((row) => row.author_user_id),
    ]),
  );

  const [teamsResult, profilesResult] = await Promise.all([
    teamIds.length
      ? supabase.from("teams").select("id, name").in("id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (teamsResult.error) throw teamsResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const teamNameMap = new Map((teamsResult.data ?? []).map((row) => [row.id, row.name]));
  const profileNameMap = new Map(
    (profilesResult.data ?? []).map((row) => [row.id, row.full_name ?? null]),
  );

  return {
    portal,
    session: {
      id: sessionRow.id,
      sessionType: sessionRow.session_type,
      status: sessionRow.status,
      startsAt: sessionRow.starts_at,
      endsAt: sessionRow.ends_at,
      timezone: sessionRow.timezone,
      sessionContext: sessionRow.session_context,
      teamNames: Array.from(
        new Set(
          (participantRows ?? [])
            .map((row) => (row.team_id ? teamNameMap.get(row.team_id) ?? null : null))
            .filter((value): value is string => Boolean(value)),
        ),
      ),
      participantNames: Array.from(
        new Set(
          (participantRows ?? [])
            .map((row) => (row.user_id ? profileNameMap.get(row.user_id) ?? null : null))
            .filter((value): value is string => Boolean(value)),
        ),
      ),
      notes: (noteRows ?? []).map((row) => ({
        id: row.id,
        content: row.content,
        noteType: row.note_type,
        visibility: row.visibility,
        createdAt: row.created_at,
        authorName: profileNameMap.get(row.author_user_id) ?? null,
      })),
    },
  } satisfies MentorSessionDetailData;
}

export async function getProgramMentorOversightData(
  supabase: TypedSupabaseClient,
  user: User,
  programId: string,
) {
  const [{ data: membership, error: membershipError }, { data: program, error: programError }] =
    await Promise.all([
      supabase
        .from("program_memberships")
        .select("role")
        .eq("program_id", programId)
        .eq("user_id", user.id)
        .in("role", ["program_manager", "program_editor", "mentor_manager"])
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("programs")
        .select("id, name, short_description")
        .eq("id", programId)
        .maybeSingle(),
    ]);

  if (membershipError) throw membershipError;
  if (programError) throw programError;
  if (!membership || !program) return null;

  const { data: mentorMemberships, error: mentorMembershipsError } = await supabase
    .from("mentor_program_memberships")
    .select("id, mentor_profile_id, status, max_sessions, auto_confirm_allowed")
    .eq("program_id", programId)
    .order("created_at", { ascending: true });

  if (mentorMembershipsError) throw mentorMembershipsError;

  const profileIds = Array.from(new Set((mentorMemberships ?? []).map((row) => row.mentor_profile_id)));
  const membershipIds = (mentorMemberships ?? []).map((row) => row.id);

  const [
    profilesResult,
    expertiseResult,
    sessionsResult,
    availabilityResult,
    bookingResult,
    latestRunResult,
  ] = await Promise.all([
    profileIds.length
      ? supabase
          .from("mentor_profiles")
          .select("id, display_name, title, organization_name")
          .in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length
      ? supabase
          .from("mentor_expertise_tags")
          .select("mentor_profile_id, tag_value")
          .in("mentor_profile_id", profileIds)
      : Promise.resolve({ data: [], error: null }),
    membershipIds.length
      ? supabase
          .from("mentor_sessions")
          .select("mentor_program_membership_id, status, starts_at")
          .eq("program_id", programId)
          .in("mentor_program_membership_id", membershipIds)
      : Promise.resolve({ data: [], error: null }),
    membershipIds.length
      ? supabase
          .from("mentor_availability_slots")
          .select("mentor_program_membership_id, starts_at, is_available")
          .in("mentor_program_membership_id", membershipIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("mentor_booking_requests")
      .select("status")
      .eq("program_id", programId),
    supabase
      .from("mentor_match_runs")
      .select("id, status, created_at, run_scope")
      .eq("program_id", programId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (expertiseResult.error) throw expertiseResult.error;
  if (sessionsResult.error) throw sessionsResult.error;
  if (availabilityResult.error) throw availabilityResult.error;
  if (bookingResult.error) throw bookingResult.error;
  if (latestRunResult.error) throw latestRunResult.error;

  const flaggedRecommendationsResult = latestRunResult.data
    ? await supabase
        .from("mentor_match_recommendations")
        .select("id, team_id, mentor_program_membership_id, score, status, reasoning_summary")
        .eq("mentor_match_run_id", latestRunResult.data.id)
        .in("status", ["suggested", "rejected", "expired"])
    : { data: [], error: null };

  if (flaggedRecommendationsResult.error) throw flaggedRecommendationsResult.error;

  const flaggedTeamIds = Array.from(
    new Set(
      (flaggedRecommendationsResult.data ?? [])
        .map((row) => row.team_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const flaggedMentorMembershipIds = Array.from(
    new Set((flaggedRecommendationsResult.data ?? []).map((row) => row.mentor_program_membership_id)),
  );

  const [flaggedTeamsResult, flaggedMentorMembershipsResult] = await Promise.all([
    flaggedTeamIds.length
      ? supabase.from("teams").select("id, name").in("id", flaggedTeamIds)
      : Promise.resolve({ data: [], error: null }),
    flaggedMentorMembershipIds.length
      ? supabase
          .from("mentor_program_memberships")
          .select("id, mentor_profile_id")
          .in("id", flaggedMentorMembershipIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (flaggedTeamsResult.error) throw flaggedTeamsResult.error;
  if (flaggedMentorMembershipsResult.error) throw flaggedMentorMembershipsResult.error;

  const profileMap = new Map((profilesResult.data ?? []).map((row) => [row.id, row]));
  const expertiseMap = new Map<string, string[]>();
  for (const row of expertiseResult.data ?? []) {
    const bucket = expertiseMap.get(row.mentor_profile_id) ?? [];
    bucket.push(row.tag_value);
    expertiseMap.set(row.mentor_profile_id, bucket);
  }

  const sessionsByMembershipId = new Map<string, Array<{ status: string; starts_at: string }>>();
  for (const row of sessionsResult.data ?? []) {
    const bucket = sessionsByMembershipId.get(row.mentor_program_membership_id) ?? [];
    bucket.push(row);
    sessionsByMembershipId.set(row.mentor_program_membership_id, bucket);
  }

  const availabilityByMembershipId = new Map<string, number>();
  for (const row of availabilityResult.data ?? []) {
    if (!row.is_available || new Date(row.starts_at).getTime() < Date.now()) continue;
    availabilityByMembershipId.set(
      row.mentor_program_membership_id,
      (availabilityByMembershipId.get(row.mentor_program_membership_id) ?? 0) + 1,
    );
  }

  const mentorProfileIdByMembershipId = new Map(
    (flaggedMentorMembershipsResult.data ?? []).map((row) => [row.id, row.mentor_profile_id]),
  );
  const flaggedTeamMap = new Map((flaggedTeamsResult.data ?? []).map((row) => [row.id, row.name]));

  const mentors = (mentorMemberships ?? []).map((row) => {
    const profile = profileMap.get(row.mentor_profile_id) ?? null;
    const sessionRows = sessionsByMembershipId.get(row.id) ?? [];
    const nextSessionAt =
      sessionRows
        .map((session) => session.starts_at)
        .filter((startsAt) => new Date(startsAt).getTime() >= Date.now())
        .sort()[0] ?? null;

    return {
      membershipId: row.id,
      profileId: row.mentor_profile_id,
      displayName: profile?.display_name ?? "Mentor",
      title: profile?.title ?? null,
      organizationName: profile?.organization_name ?? null,
      status: row.status,
      expertiseTags: expertiseMap.get(row.mentor_profile_id) ?? [],
      maxSessions: row.max_sessions,
      confirmedSessions: sessionRows.filter((session) =>
        ["confirmed", "completed"].includes(session.status),
      ).length,
      availabilitySlots: availabilityByMembershipId.get(row.id) ?? 0,
      nextSessionAt,
      autoConfirmAllowed: row.auto_confirm_allowed,
    };
  });

  return {
    program: {
      id: program.id,
      name: program.name,
      shortDescription: program.short_description,
    },
    metrics: {
      mentorsConfirmed: mentors.filter((mentor) => mentor.status === "active").length,
      mentorsPending: mentors.filter((mentor) => mentor.status === "invited").length,
      totalCapacity: mentors.reduce((sum, mentor) => sum + (mentor.maxSessions ?? 0), 0),
      scheduledSessions: mentors.reduce((sum, mentor) => sum + mentor.confirmedSessions, 0),
      pendingBookings: (bookingResult.data ?? []).filter((row) =>
        ["requested", "pending_approval"].includes(row.status),
      ).length,
      flaggedMatches: (flaggedRecommendationsResult.data ?? []).length,
      unmatchedTeams: flaggedTeamIds.length,
    },
    mentors,
    flaggedRecommendations: (flaggedRecommendationsResult.data ?? []).map((row) => {
      const mentorProfileId = mentorProfileIdByMembershipId.get(row.mentor_program_membership_id);
      const mentorProfile = mentorProfileId ? profileMap.get(mentorProfileId) ?? null : null;

      return {
        id: row.id,
        teamName: row.team_id ? flaggedTeamMap.get(row.team_id) ?? null : null,
        mentorName: mentorProfile?.display_name ?? null,
        score: row.score,
        status: row.status,
        reasoningSummary: row.reasoning_summary,
      };
    }),
  } satisfies ProgramMentorOversightData;
}

export async function getProgramMentorMatchmakingData(
  supabase: TypedSupabaseClient,
  user: User,
  programId: string,
) {
  const oversight = await getProgramMentorOversightData(supabase, user, programId);

  if (!oversight) {
    return null;
  }

  const { data: latestRun, error: latestRunError } = await supabase
    .from("mentor_match_runs")
    .select("id, status, created_at, run_scope")
    .eq("program_id", programId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRunError) throw latestRunError;

  if (!latestRun) {
    return {
      oversight,
      latestRun: null,
      recommendations: [],
    } satisfies ProgramMentorMatchmakingData;
  }

  const { data: recommendations, error: recommendationsError } = await supabase
    .from("mentor_match_recommendations")
    .select("id, team_id, mentor_program_membership_id, score, status, reasoning_summary")
    .eq("mentor_match_run_id", latestRun.id)
    .order("score", { ascending: false, nullsFirst: false });

  if (recommendationsError) throw recommendationsError;

  const teamIds = Array.from(
    new Set(
      (recommendations ?? [])
        .map((row) => row.team_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const mentorMembershipIds = Array.from(
    new Set((recommendations ?? []).map((row) => row.mentor_program_membership_id)),
  );

  const [teamsResult, mentorMembershipsResult] = await Promise.all([
    teamIds.length
      ? supabase.from("teams").select("id, name").in("id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    mentorMembershipIds.length
      ? supabase
          .from("mentor_program_memberships")
          .select("id, mentor_profile_id")
          .in("id", mentorMembershipIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (teamsResult.error) throw teamsResult.error;
  if (mentorMembershipsResult.error) throw mentorMembershipsResult.error;

  const mentorProfileIds = Array.from(
    new Set((mentorMembershipsResult.data ?? []).map((row) => row.mentor_profile_id)),
  );
  const mentorProfilesResult = mentorProfileIds.length
    ? await supabase.from("mentor_profiles").select("id, display_name").in("id", mentorProfileIds)
    : { data: [], error: null };

  if (mentorProfilesResult.error) throw mentorProfilesResult.error;

  const mentorMembershipProfileMap = new Map(
    (mentorMembershipsResult.data ?? []).map((row) => [row.id, row.mentor_profile_id]),
  );
  const mentorProfileMap = new Map(
    (mentorProfilesResult.data ?? []).map((row) => [row.id, row.display_name]),
  );
  const teamMap = new Map((teamsResult.data ?? []).map((row) => [row.id, row.name]));

  return {
    oversight,
    latestRun: {
      id: latestRun.id,
      status: latestRun.status,
      createdAt: latestRun.created_at,
      runScope: latestRun.run_scope,
    },
    recommendations: (recommendations ?? []).map((row) => ({
      id: row.id,
      teamId: row.team_id,
      teamName: row.team_id ? teamMap.get(row.team_id) ?? null : null,
      mentorMembershipId: row.mentor_program_membership_id,
      mentorName:
        mentorProfileMap.get(
          mentorMembershipProfileMap.get(row.mentor_program_membership_id) ?? "",
        ) ?? null,
      score: row.score,
      status: row.status,
      reasoningSummary: row.reasoning_summary,
    })),
  } satisfies ProgramMentorMatchmakingData;
}

const defaultAdminAiGovernancePolicySnapshot: AdminAiGovernancePolicySnapshot = {
  organizationAiEnabled: true,
  emailDraftApprovalRequired: true,
  scoringAdvisoryOnly: true,
  automatedResultAnnouncements: false,
  logAllGeneratedContent: true,
  anonymizePii: true,
  historicalProgramsOptIn: false,
  autoApproveMentorBookingsThreshold: 85,
  autoFlagLowConfidenceThreshold: 60,
};

const defaultSecuritySsoConfiguration: AdminSecuritySsoData["configuration"] = {
  providerKey: "azure_ad_sso",
  entityId: "https://app.innovink.io/saml/organization/metadata",
  acsUrl: "https://app.innovink.io/saml/organization/acs",
  idpMetadataUrl: "",
  signingCertificateName: "Not uploaded",
  signingCertificateExpiry: "Unknown",
  nameIdFormat: "emailAddress",
  attributeMappings: [
    {
      innovinkField: "email",
      idpAttribute: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      status: "mapped",
      inputType: "text",
    },
    {
      innovinkField: "display_name",
      idpAttribute: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      status: "mapped",
      inputType: "text",
    },
    {
      innovinkField: "department",
      idpAttribute: "",
      status: "not_tested",
      inputType: "text",
    },
    {
      innovinkField: "employee_id",
      idpAttribute: "",
      status: "unmapped",
      inputType: "text",
    },
    {
      innovinkField: "innovink_role",
      idpAttribute: "rule_based",
      status: "configured",
      inputType: "select",
      options: [
        { value: "rule_based", label: "Rule-based (see role mapping)" },
        { value: "idp_group_claim", label: "IdP group claim" },
        { value: "default_participant", label: "Default: participant" },
      ],
    },
  ],
  scimBaseUrl: "https://app.innovink.io/scim/v2/organization",
  scimBearerTokenMasked: "scim_not_configured",
  autoProvisionOnLogin: true,
  deprovisionOnDeactivate: true,
  syncGroupsAsRoles: false,
  sessionPolicy: {
    enforceSsoForStaff: true,
    sessionTimeoutHours: 12,
    allowPasswordFallback: false,
  },
};

const defaultRetentionSchedule: AdminRetentionExportData["retentionPolicy"]["schedule"] = {
  participantProfiles: "2 years after program closes",
  submissionContent: "5 years after program closes",
  communications: "1 year after program closes",
  activityAuditLogs: "7 years (regulatory minimum)",
  judgeScores: "5 years after program closes",
  conflictDeclarations: "7 years (regulatory minimum)",
  moderationDecisions: "7 years (regulatory minimum)",
};

const defaultDeletionRules: AdminRetentionExportData["retentionPolicy"]["deletionRules"] = {
  erasureRequestRule: "Delete within 30 days",
  postRetentionAction: "Anonymise, keep aggregate records",
  reviewNotificationWindow: "60 days before expiry",
};

const defaultExportControls: AdminRetentionExportData["exportPolicy"]["controls"] = {
  fullParticipantExportRole: "organization_admin_only",
  anonymizedAnalyticsExportRole: "program_manager_and_org_admin",
  submissionContentExportRole: "program_manager_and_org_admin",
  approvalRequired: true,
};

const defaultFeatureFlags: AdminFeatureFlagData["flags"] = [
  {
    key: "innova_auto_brief",
    label: "innova_auto_brief",
    sublabel: "Auto-generate program brief from template",
    category: "ai_features",
    enabled: true,
    rolloutPercent: 100,
    scope: "organization",
    description: "Innova generates initial brief from selected template and constraints.",
    changedAt: "2026-01-15T09:00:00.000Z",
    locked: false,
  },
  {
    key: "innova_comms_gen",
    label: "innova_comms_gen",
    sublabel: "AI-powered communication generation",
    category: "ai_features",
    enabled: true,
    rolloutPercent: 75,
    scope: "workspace",
    description: "Innova drafts welcome, reminder, and feedback emails.",
    changedAt: "2026-01-18T10:02:00.000Z",
    locked: false,
  },
  {
    key: "innova_recommendations",
    label: "innova_recommendations",
    sublabel: "Proactive operational recommendations",
    category: "ai_features",
    enabled: true,
    rolloutPercent: 50,
    scope: "beta",
    description: "Innova surfaces operational risks and suggested interventions to PMs.",
    changedAt: "2026-01-20T16:44:00.000Z",
    locked: false,
  },
  {
    key: "judge_calibration",
    label: "judge_calibration",
    sublabel: "Pre-scoring calibration exercise",
    category: "judging",
    enabled: true,
    rolloutPercent: 100,
    scope: "organization",
    description: "Require judges to complete calibration before live scoring opens.",
    changedAt: "2025-12-10T09:00:00.000Z",
    locked: false,
  },
  {
    key: "blind_scoring",
    label: "blind_scoring",
    sublabel: "Hide team names during scoring",
    category: "judging",
    enabled: false,
    rolloutPercent: 0,
    scope: "organization",
    description: "Judge sees anonymised submission IDs instead of team names.",
    changedAt: null,
    locked: false,
  },
  {
    key: "auto_reminders",
    label: "auto_reminders",
    sublabel: "Automated deadline reminder emails",
    category: "automation",
    enabled: true,
    rolloutPercent: 100,
    scope: "organization",
    description: "Trigger reminder series at 7d, 3d, and 1d before submission deadlines.",
    changedAt: "2026-01-10T09:00:00.000Z",
    locked: false,
  },
  {
    key: "auto_mentor_match",
    label: "auto_mentor_match",
    sublabel: "Innova-suggested mentor assignments",
    category: "automation",
    enabled: true,
    rolloutPercent: 25,
    scope: "beta",
    description: "AI suggests mentor-team pairings based on expertise and availability.",
    changedAt: "2026-01-19T14:30:00.000Z",
    locked: false,
  },
  {
    key: "innova_diff_review",
    label: "innova_diff_review",
    sublabel: "Section regenerate with diff comparison",
    category: "ai_features",
    enabled: true,
    rolloutPercent: 100,
    scope: "organization",
    description: "Before/after comparison when a PM regenerates an asset section.",
    changedAt: "2026-01-12T09:00:00.000Z",
    locked: false,
  },
  {
    key: "locked_provider_fallback",
    label: "locked_provider_fallback",
    sublabel: "Provider fallback routing",
    category: "automation",
    enabled: true,
    rolloutPercent: 100,
    scope: "organization",
    description: "Internal Innovink runtime fallback used for safe provider failover handling.",
    changedAt: "2026-01-11T09:00:00.000Z",
    locked: true,
  },
] as const;

const defaultAutomationRules: AdminAutomationGovernanceData["rules"] = [
  {
    key: "deadline_reminder_7d",
    label: "deadline_reminder_7d",
    category: "Communications",
    triggerAction: "7 days before deadline -> send reminder to unsubmitted teams",
    riskLevel: "low",
    status: "active",
  },
  {
    key: "mentor_unmatch_alert",
    label: "mentor_unmatch_alert",
    category: "Mentor ops",
    triggerAction: "Team unmatched for >3 days -> alert PM in Innova panel",
    riskLevel: "low",
    status: "active",
  },
  {
    key: "bulk_reject_notify",
    label: "bulk_reject_notify",
    category: "Participant comms",
    triggerAction: "Phase closes + team not advanced -> send rejection comms",
    riskLevel: "high",
    status: "pending_approval",
  },
  {
    key: "judge_overdue_nudge",
    label: "judge_overdue_nudge",
    category: "Judge management",
    triggerAction: "Judge has unscored submissions >48h -> send automated nudge",
    riskLevel: "medium",
    status: "active",
  },
] as const;

const defaultAutomationGovernanceSnapshot = {
  safetyMode: "human_in_the_loop" as const,
  participantCommsThreshold: 50,
  bulkStatusChangesThreshold: 10,
  requireScoringDeadlineChangesApproval: true,
  requireActiveProgramPhaseChangesApproval: true,
  blockDataDeletion: true,
  blockJudgingAssignmentChanges: true,
  allowExternalNotifications: false,
  dryRunMode: true,
};

function coerceFeatureFlagCategory(value: unknown): AdminFeatureFlagData["flags"][number]["category"] {
  return value === "judging" || value === "automation" ? value : "ai_features";
}

function coerceFeatureFlagScope(value: unknown): AdminFeatureFlagData["flags"][number]["scope"] {
  return value === "workspace" || value === "beta" ? value : "organization";
}

function coerceFeatureFlags(payload: Json | null): AdminFeatureFlagData["flags"] {
  const source =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const payloadFlags = Array.isArray(source.flags) ? source.flags : [];
  const payloadMap = new Map<string, Record<string, unknown>>();

  for (const flag of payloadFlags) {
    if (flag && typeof flag === "object" && !Array.isArray(flag)) {
      const key = typeof flag.key === "string" ? flag.key : null;
      if (key) {
        payloadMap.set(key, flag as Record<string, unknown>);
      }
    }
  }

  return defaultFeatureFlags.map((flag) => {
    const override = payloadMap.get(flag.key);

    return {
      ...flag,
      enabled: typeof override?.enabled === "boolean" ? override.enabled : flag.enabled,
      rolloutPercent: Math.max(
        0,
        Math.min(100, toFiniteNumber(override?.rolloutPercent, flag.rolloutPercent)),
      ),
      scope: coerceFeatureFlagScope(override?.scope),
      category: coerceFeatureFlagCategory(override?.category),
      changedAt: typeof override?.changedAt === "string" ? override.changedAt : flag.changedAt,
      locked: typeof override?.locked === "boolean" ? override.locked : flag.locked,
      description: typeof override?.description === "string" ? override.description : flag.description,
      sublabel: typeof override?.sublabel === "string" ? override.sublabel : flag.sublabel,
      label: typeof override?.label === "string" ? override.label : flag.label,
    };
  });
}

function coerceAutomationGovernanceSnapshot(
  payload: Json | null,
): Pick<AdminAutomationGovernanceData, "safetyMode" | "approvalThresholds" | "restrictions" | "rules"> {
  const source =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const rules = Array.isArray(source.rules) ? source.rules : [];
  const ruleOverrides = new Map<string, Record<string, unknown>>();

  for (const rule of rules) {
    if (rule && typeof rule === "object" && !Array.isArray(rule)) {
      const key = typeof rule.key === "string" ? rule.key : null;
      if (key) {
        ruleOverrides.set(key, rule as Record<string, unknown>);
      }
    }
  }

  return {
    safetyMode:
      source.safetyMode === "supervised_autonomous" || source.safetyMode === "full_autonomous"
        ? source.safetyMode
        : defaultAutomationGovernanceSnapshot.safetyMode,
    approvalThresholds: {
      participantCommsThreshold: Math.max(
        1,
        toFiniteNumber(source.participantCommsThreshold, defaultAutomationGovernanceSnapshot.participantCommsThreshold),
      ),
      bulkStatusChangesThreshold: Math.max(
        1,
        toFiniteNumber(source.bulkStatusChangesThreshold, defaultAutomationGovernanceSnapshot.bulkStatusChangesThreshold),
      ),
      requireScoringDeadlineChangesApproval:
        typeof source.requireScoringDeadlineChangesApproval === "boolean"
          ? source.requireScoringDeadlineChangesApproval
          : defaultAutomationGovernanceSnapshot.requireScoringDeadlineChangesApproval,
      requireActiveProgramPhaseChangesApproval:
        typeof source.requireActiveProgramPhaseChangesApproval === "boolean"
          ? source.requireActiveProgramPhaseChangesApproval
          : defaultAutomationGovernanceSnapshot.requireActiveProgramPhaseChangesApproval,
    },
    restrictions: {
      blockDataDeletion:
        typeof source.blockDataDeletion === "boolean"
          ? source.blockDataDeletion
          : defaultAutomationGovernanceSnapshot.blockDataDeletion,
      blockJudgingAssignmentChanges:
        typeof source.blockJudgingAssignmentChanges === "boolean"
          ? source.blockJudgingAssignmentChanges
          : defaultAutomationGovernanceSnapshot.blockJudgingAssignmentChanges,
      allowExternalNotifications:
        typeof source.allowExternalNotifications === "boolean"
          ? source.allowExternalNotifications
          : defaultAutomationGovernanceSnapshot.allowExternalNotifications,
      dryRunMode:
        typeof source.dryRunMode === "boolean"
          ? source.dryRunMode
          : defaultAutomationGovernanceSnapshot.dryRunMode,
    },
    rules: defaultAutomationRules.map((rule) => {
      const override = ruleOverrides.get(rule.key);
      return {
        ...rule,
        riskLevel:
          override?.riskLevel === "medium" || override?.riskLevel === "high"
            ? override.riskLevel
            : rule.riskLevel,
        status:
          override?.status === "pending_approval" || override?.status === "disabled"
            ? override.status
            : rule.status,
        triggerAction:
          typeof override?.triggerAction === "string" ? override.triggerAction : rule.triggerAction,
      };
    }),
  };
}

function humanizeGovernanceKey(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function coerceAdminAiPolicySnapshot(
  payload: Json | null,
  organizationAiEnabled: boolean,
): AdminAiGovernancePolicySnapshot {
  const source =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};

  return {
    organizationAiEnabled,
    emailDraftApprovalRequired:
      typeof source.emailDraftApprovalRequired === "boolean"
        ? source.emailDraftApprovalRequired
        : defaultAdminAiGovernancePolicySnapshot.emailDraftApprovalRequired,
    scoringAdvisoryOnly:
      typeof source.scoringAdvisoryOnly === "boolean"
        ? source.scoringAdvisoryOnly
        : defaultAdminAiGovernancePolicySnapshot.scoringAdvisoryOnly,
    automatedResultAnnouncements:
      typeof source.automatedResultAnnouncements === "boolean"
        ? source.automatedResultAnnouncements
        : defaultAdminAiGovernancePolicySnapshot.automatedResultAnnouncements,
    logAllGeneratedContent:
      typeof source.logAllGeneratedContent === "boolean"
        ? source.logAllGeneratedContent
        : defaultAdminAiGovernancePolicySnapshot.logAllGeneratedContent,
    anonymizePii:
      typeof source.anonymizePii === "boolean"
        ? source.anonymizePii
        : defaultAdminAiGovernancePolicySnapshot.anonymizePii,
    historicalProgramsOptIn:
      typeof source.historicalProgramsOptIn === "boolean"
        ? source.historicalProgramsOptIn
        : defaultAdminAiGovernancePolicySnapshot.historicalProgramsOptIn,
    autoApproveMentorBookingsThreshold: toFiniteNumber(
      source.autoApproveMentorBookingsThreshold,
      defaultAdminAiGovernancePolicySnapshot.autoApproveMentorBookingsThreshold,
    ),
    autoFlagLowConfidenceThreshold: toFiniteNumber(
      source.autoFlagLowConfidenceThreshold,
      defaultAdminAiGovernancePolicySnapshot.autoFlagLowConfidenceThreshold,
    ),
  };
}

function coerceSecuritySsoConfiguration(payload: Json | null) {
  const source =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};

  const attributeMappings: AdminSecuritySsoData["configuration"]["attributeMappings"] = Array.isArray(
    source.attributeMappings,
  )
    ? source.attributeMappings.flatMap((row) => {
          if (!row || typeof row !== "object" || Array.isArray(row)) {
            return [];
          }
          const value = row as Record<string, unknown>;
          const inputType = value.inputType === "select" ? "select" : "text";
          const status = ["mapped", "not_tested", "unmapped", "configured"].includes(
            String(value.status ?? ""),
          )
            ? (value.status as "mapped" | "not_tested" | "unmapped" | "configured")
            : "unmapped";
          const options = Array.isArray(value.options)
            ? value.options
                .flatMap((option) => {
                  if (!option || typeof option !== "object" || Array.isArray(option)) {
                    return [];
                  }
                  const optionValue = option as Record<string, unknown>;
                  if (typeof optionValue.value !== "string" || typeof optionValue.label !== "string") {
                    return [];
                  }
                  return [{ value: optionValue.value, label: optionValue.label }];
                })
            : undefined;

          return [{
            innovinkField:
              typeof value.innovinkField === "string"
                ? value.innovinkField
                : "custom_field",
            idpAttribute: typeof value.idpAttribute === "string" ? value.idpAttribute : "",
            status,
            inputType,
            options,
          }];
        })
    : [...defaultSecuritySsoConfiguration.attributeMappings];

  return {
    providerKey:
      typeof source.providerKey === "string"
        ? source.providerKey
        : defaultSecuritySsoConfiguration.providerKey,
    entityId:
      typeof source.entityId === "string"
        ? source.entityId
        : defaultSecuritySsoConfiguration.entityId,
    acsUrl:
      typeof source.acsUrl === "string"
        ? source.acsUrl
        : defaultSecuritySsoConfiguration.acsUrl,
    idpMetadataUrl:
      typeof source.idpMetadataUrl === "string"
        ? source.idpMetadataUrl
        : defaultSecuritySsoConfiguration.idpMetadataUrl,
    signingCertificateName:
      typeof source.signingCertificateName === "string"
        ? source.signingCertificateName
        : defaultSecuritySsoConfiguration.signingCertificateName,
    signingCertificateExpiry:
      typeof source.signingCertificateExpiry === "string"
        ? source.signingCertificateExpiry
        : defaultSecuritySsoConfiguration.signingCertificateExpiry,
    nameIdFormat:
      typeof source.nameIdFormat === "string"
        ? source.nameIdFormat
        : defaultSecuritySsoConfiguration.nameIdFormat,
    attributeMappings,
    scimBaseUrl:
      typeof source.scimBaseUrl === "string"
        ? source.scimBaseUrl
        : defaultSecuritySsoConfiguration.scimBaseUrl,
    scimBearerTokenMasked:
      typeof source.scimBearerTokenMasked === "string"
        ? source.scimBearerTokenMasked
        : defaultSecuritySsoConfiguration.scimBearerTokenMasked,
    autoProvisionOnLogin:
      typeof source.autoProvisionOnLogin === "boolean"
        ? source.autoProvisionOnLogin
        : defaultSecuritySsoConfiguration.autoProvisionOnLogin,
    deprovisionOnDeactivate:
      typeof source.deprovisionOnDeactivate === "boolean"
        ? source.deprovisionOnDeactivate
        : defaultSecuritySsoConfiguration.deprovisionOnDeactivate,
    syncGroupsAsRoles:
      typeof source.syncGroupsAsRoles === "boolean"
        ? source.syncGroupsAsRoles
        : defaultSecuritySsoConfiguration.syncGroupsAsRoles,
    sessionPolicy: {
      enforceSsoForStaff:
        typeof source.sessionPolicy === "object" &&
        source.sessionPolicy !== null &&
        !Array.isArray(source.sessionPolicy) &&
        typeof (source.sessionPolicy as Record<string, unknown>).enforceSsoForStaff === "boolean"
          ? ((source.sessionPolicy as Record<string, unknown>).enforceSsoForStaff as boolean)
          : defaultSecuritySsoConfiguration.sessionPolicy.enforceSsoForStaff,
      sessionTimeoutHours:
        typeof source.sessionPolicy === "object" &&
        source.sessionPolicy !== null &&
        !Array.isArray(source.sessionPolicy) &&
        typeof (source.sessionPolicy as Record<string, unknown>).sessionTimeoutHours === "number"
          ? ((source.sessionPolicy as Record<string, unknown>).sessionTimeoutHours as number)
          : defaultSecuritySsoConfiguration.sessionPolicy.sessionTimeoutHours,
      allowPasswordFallback:
        typeof source.sessionPolicy === "object" &&
        source.sessionPolicy !== null &&
        !Array.isArray(source.sessionPolicy) &&
        typeof (source.sessionPolicy as Record<string, unknown>).allowPasswordFallback === "boolean"
          ? ((source.sessionPolicy as Record<string, unknown>).allowPasswordFallback as boolean)
          : defaultSecuritySsoConfiguration.sessionPolicy.allowPasswordFallback,
    },
  };
}

function coerceRetentionSchedule(payload: Json | null) {
  const source =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};

  return {
    participantProfiles:
      typeof source.participantProfiles === "string"
        ? source.participantProfiles
        : defaultRetentionSchedule.participantProfiles,
    submissionContent:
      typeof source.submissionContent === "string"
        ? source.submissionContent
        : defaultRetentionSchedule.submissionContent,
    communications:
      typeof source.communications === "string"
        ? source.communications
        : defaultRetentionSchedule.communications,
    activityAuditLogs:
      typeof source.activityAuditLogs === "string"
        ? source.activityAuditLogs
        : defaultRetentionSchedule.activityAuditLogs,
    judgeScores:
      typeof source.judgeScores === "string"
        ? source.judgeScores
        : defaultRetentionSchedule.judgeScores,
    conflictDeclarations:
      typeof source.conflictDeclarations === "string"
        ? source.conflictDeclarations
        : defaultRetentionSchedule.conflictDeclarations,
    moderationDecisions:
      typeof source.moderationDecisions === "string"
        ? source.moderationDecisions
        : defaultRetentionSchedule.moderationDecisions,
  };
}

function coerceDeletionRules(payload: Json | null) {
  const source =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};

  return {
    erasureRequestRule:
      typeof source.erasureRequestRule === "string"
        ? source.erasureRequestRule
        : defaultDeletionRules.erasureRequestRule,
    postRetentionAction:
      typeof source.postRetentionAction === "string"
        ? source.postRetentionAction
        : defaultDeletionRules.postRetentionAction,
    reviewNotificationWindow:
      typeof source.reviewNotificationWindow === "string"
        ? source.reviewNotificationWindow
        : defaultDeletionRules.reviewNotificationWindow,
  };
}

function coerceExportControls(payload: Json | null) {
  const source =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};

  return {
    fullParticipantExportRole:
      typeof source.fullParticipantExportRole === "string"
        ? source.fullParticipantExportRole
        : defaultExportControls.fullParticipantExportRole,
    anonymizedAnalyticsExportRole:
      typeof source.anonymizedAnalyticsExportRole === "string"
        ? source.anonymizedAnalyticsExportRole
        : defaultExportControls.anonymizedAnalyticsExportRole,
    submissionContentExportRole:
      typeof source.submissionContentExportRole === "string"
        ? source.submissionContentExportRole
        : defaultExportControls.submissionContentExportRole,
    approvalRequired:
      typeof source.approvalRequired === "boolean"
        ? source.approvalRequired
        : defaultExportControls.approvalRequired,
  };
}

function mapAiUsageCategory(featureKey: string) {
  const normalized = featureKey.toLowerCase();
  if (
    normalized.includes("email") ||
    normalized.includes("comm") ||
    normalized.includes("campaign")
  ) {
    return "email-drafting";
  }
  if (
    normalized.includes("mentor") ||
    normalized.includes("match")
  ) {
    return "matchmaking-suggestions";
  }
  if (
    normalized.includes("judge") ||
    normalized.includes("score") ||
    normalized.includes("calibration")
  ) {
    return "scoring-calibration";
  }
  if (
    normalized.includes("brief") ||
    normalized.includes("plan") ||
    normalized.includes("landing") ||
    normalized.includes("form") ||
    normalized.includes("program")
  ) {
    return "program-setup-assist";
  }
  return "other";
}

function mapAiUsageLabel(category: string) {
  switch (category) {
    case "email-drafting":
      return "Email drafting";
    case "matchmaking-suggestions":
      return "Matchmaking suggestions";
    case "program-setup-assist":
      return "Program setup assist";
    case "scoring-calibration":
      return "Scoring calibration";
    default:
      return "Other";
  }
}

function humanizeActionLabel(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function humanizeFeatureKey(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatShortDateForPolicy(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function deriveAuditSeverity(action: string, sourceType: "audit_log" | "ai_review", reviewStatus?: string | null) {
  const normalized = action.toLowerCase();

  if (sourceType === "ai_review" && reviewStatus === "rejected") {
    return "critical" satisfies AdminAuditEventSeverity;
  }

  if (
    normalized.includes("blocked") ||
    normalized.includes("violation") ||
    normalized.includes("error") ||
    normalized.includes("breach")
  ) {
    return "critical" satisfies AdminAuditEventSeverity;
  }

  if (
    normalized.includes("role") ||
    normalized.includes("policy") ||
    normalized.includes("revoke") ||
    normalized.includes("suspend") ||
    normalized.includes("approve")
  ) {
    return "warning" satisfies AdminAuditEventSeverity;
  }

  return "info" satisfies AdminAuditEventSeverity;
}

function deriveAuditCategory(action: string, sourceType: "audit_log" | "ai_review", targetTable?: string | null) {
  const normalized = `${action} ${targetTable ?? ""}`.toLowerCase();

  if (sourceType === "ai_review" || normalized.includes("ai_") || normalized.includes("innova")) {
    return "ai" satisfies AdminAuditEventCategory;
  }

  if (
    normalized.includes("auth") ||
    normalized.includes("security") ||
    normalized.includes("role") ||
    normalized.includes("membership")
  ) {
    return "security" satisfies AdminAuditEventCategory;
  }

  if (
    normalized.includes("publish") ||
    normalized.includes("launch") ||
    normalized.includes("schedule") ||
    normalized.includes("system")
  ) {
    return "system" satisfies AdminAuditEventCategory;
  }

  return "user" satisfies AdminAuditEventCategory;
}

export async function getAdminGovernanceOverviewData(
  supabase: TypedSupabaseClient,
  user: User,
) {
  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select("organization_id, role, status, organizations!inner(id, name, slug, ai_enabled)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", [
      "organization_owner",
      "organization_admin",
      "security_compliance_admin",
      "ai_governance_admin",
    ]);

  if (membershipsError) {
    throw membershipsError;
  }

  const adminMembership = memberships?.[0];

  if (!adminMembership) {
    return null;
  }

  const organization = Array.isArray(adminMembership.organizations)
    ? adminMembership.organizations[0]
    : adminMembership.organizations;

  if (!organization) {
    return null;
  }

  const organizationId = organization.id;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysIso = thirtyDaysAgo.toISOString();

  const [
    { count: userCount, error: userCountError },
    { data: workspaceRows, error: workspaceRowsError },
    { data: integrationRows, error: integrationRowsError },
    { data: governanceRows, error: governanceRowsError },
    { data: retentionRows, error: retentionRowsError },
    { data: aiRequestRows, error: aiRequestRowsError },
    { data: aiUsageRows, error: aiUsageRowsError },
    { data: auditRows, error: auditRowsError },
  ] = await Promise.all([
    supabase
      .from("organization_memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    supabase
      .from("workspaces")
      .select("id")
      .eq("organization_id", organizationId),
    supabase
      .from("integration_configurations")
      .select("id, integration_key, enabled, config_status, updated_at")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("governance_policies")
      .select("id, policy_type, status, scope_type, updated_at")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("retention_policies")
      .select("id, status, scope_type, updated_at")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("ai_requests")
      .select("id, risk_level, status, created_at")
      .eq("organization_id", organizationId)
      .gte("created_at", thirtyDaysIso),
    supabase
      .from("ai_usage_events")
      .select("id, provider_name, token_count, estimated_cost, created_at")
      .eq("organization_id", organizationId)
      .gte("created_at", thirtyDaysIso),
    supabase
      .from("audit_logs")
      .select("id, action, created_at, scope, actor_user_id, target_table")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (userCountError) throw userCountError;
  if (workspaceRowsError) throw workspaceRowsError;
  if (integrationRowsError) throw integrationRowsError;
  if (governanceRowsError) throw governanceRowsError;
  if (retentionRowsError) throw retentionRowsError;
  if (aiRequestRowsError) throw aiRequestRowsError;
  if (aiUsageRowsError) throw aiUsageRowsError;
  if (auditRowsError) throw auditRowsError;

  const actorIds = Array.from(
    new Set(
      (auditRows ?? [])
        .map((row) => row.actor_user_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const actorProfiles = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [], error: null };

  if (actorProfiles.error) {
    throw actorProfiles.error;
  }

  const actorNameMap = new Map(
    (actorProfiles.data ?? []).map((profile) => [profile.id, profile.full_name ?? null]),
  );

  const workspaceIds = (workspaceRows ?? []).map((row) => row.id);
  const programRows = workspaceIds.length
    ? await supabase
        .from("programs")
        .select("id, status")
        .in("workspace_id", workspaceIds)
    : { data: [], error: null };

  if (programRows.error) {
    throw programRows.error;
  }

  const retentionPolicyRows = (retentionRows ?? []).map((row) => ({
    id: row.id,
    policyType: "retention_policy" as const,
    status: row.status,
    scopeType: row.scope_type,
    updatedAt: row.updated_at,
  }));

  const governancePolicies = [
    ...(governanceRows ?? []).map((row) => ({
      id: row.id,
      policyType: row.policy_type,
      status: row.status,
      scopeType: row.scope_type,
      updatedAt: row.updated_at,
    })),
    ...retentionPolicyRows,
  ];

  const risks: AdminGovernanceOverviewData["risks"] = [];

  const erroredIntegrations = (integrationRows ?? []).filter((row) => row.config_status === "error");
  if (erroredIntegrations.length > 0) {
    risks.push({
      id: "integration-errors",
      title: "Integration configuration requires attention",
      detail: `${erroredIntegrations.length} integration configuration${erroredIntegrations.length === 1 ? "" : "s"} reported an error state.`,
      severity: "warning",
      meta: erroredIntegrations.map((row) => row.integration_key).join(", "),
    });
  }

  const inactivePolicies = governancePolicies.filter((row) => row.status !== "active");
  if (inactivePolicies.length > 0) {
    risks.push({
      id: "policy-review",
      title: "Governance policy review needed",
      detail: `${inactivePolicies.length} governance or retention polic${inactivePolicies.length === 1 ? "y is" : "ies are"} not active yet.`,
      severity: "warning",
      meta: inactivePolicies
        .slice(0, 3)
        .map((row) => row.policyType.replaceAll("_", " "))
        .join(", "),
    });
  }

  const activePrograms = (programRows.data ?? []).filter((row) =>
    ["drafting", "review", "ready", "published", "live"].includes(row.status),
  ).length;
  const aiActions30d = (aiRequestRows ?? []).length;
  const highRiskRequests30d = (aiRequestRows ?? []).filter((row) => row.risk_level === "high").length;
  const activePolicies = governancePolicies.filter((row) => row.status === "active").length;
  const tokenCount30d = (aiUsageRows ?? []).reduce((sum, row) => sum + (row.token_count ?? 0), 0);
  const estimatedCost30d = Number(
    (aiUsageRows ?? []).reduce((sum, row) => sum + Number(row.estimated_cost ?? 0), 0).toFixed(4),
  );
  const providers = Array.from(
    new Set(
      (aiUsageRows ?? [])
        .map((row) => row.provider_name)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      aiEnabled: organization.ai_enabled,
    },
    membershipRole: adminMembership.role,
    metrics: {
      activePrograms,
      users: userCount ?? 0,
      integrations: (integrationRows ?? []).length,
      aiActions30d,
      activePolicies,
    },
    risks,
    aiOverview: {
      highRiskRequests30d,
      usageEvents30d: (aiUsageRows ?? []).length,
      tokenCount30d,
      estimatedCost30d,
      providers,
    },
    recentAudit: (auditRows ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      createdAt: row.created_at,
      scope: row.scope,
      actorName: row.actor_user_id ? actorNameMap.get(row.actor_user_id) ?? null : null,
      targetTable: row.target_table,
    })),
    governancePolicies,
    integrations: (integrationRows ?? []).map((row) => ({
      id: row.id,
      integrationKey: row.integration_key,
      enabled: row.enabled,
      configStatus: row.config_status,
      updatedAt: row.updated_at,
    })),
  } satisfies AdminGovernanceOverviewData;
}

export async function getAdminAiGovernanceData(
  supabase: TypedSupabaseClient,
  user: User,
) {
  const adminData = await getAdminGovernanceOverviewData(supabase, user);

  if (!adminData) {
    return null;
  }

  const organizationId = adminData.organization.id;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysIso = thirtyDaysAgo.toISOString();

  const [
    { data: aiPolicyRows, error: aiPolicyRowsError },
    { data: providerPolicyRows, error: providerPolicyRowsError },
    { data: aiRequestRows, error: aiRequestRowsError },
    { data: aiReviewRows, error: aiReviewRowsError },
  ] = await Promise.all([
    supabase
      .from("governance_policies")
      .select("id, status, active_version_id, updated_at")
      .eq("organization_id", organizationId)
      .eq("scope_type", "organization")
      .eq("policy_type", "ai_policy")
      .order("updated_at", { ascending: false }),
    supabase
      .from("ai_provider_policies")
      .select("id, provider_key, enabled, allowed_models, usage_limits, updated_at")
      .eq("organization_id", organizationId)
      .eq("scope_type", "organization")
      .order("updated_at", { ascending: false }),
    supabase
      .from("ai_requests")
      .select("id, feature_key, risk_level, status, created_at")
      .eq("organization_id", organizationId)
      .gte("created_at", thirtyDaysIso)
      .order("created_at", { ascending: false }),
    supabase
      .from("ai_output_reviews")
      .select("id, ai_request_id, review_status, feedback, reviewed_at, reviewer_user_id")
      .gte("reviewed_at", thirtyDaysIso)
      .order("reviewed_at", { ascending: false }),
  ]);

  if (aiPolicyRowsError) throw aiPolicyRowsError;
  if (providerPolicyRowsError) throw providerPolicyRowsError;
  if (aiRequestRowsError) throw aiRequestRowsError;
  if (aiReviewRowsError) throw aiReviewRowsError;

  const activeVersionIds = (aiPolicyRows ?? [])
    .map((row) => row.active_version_id)
    .filter((value): value is string => Boolean(value));

  const activeVersionRows = activeVersionIds.length
    ? await supabase
        .from("governance_policy_versions")
        .select("id, governance_policy_id, version_number, policy_payload")
        .in("id", activeVersionIds)
    : { data: [], error: null };

  if (activeVersionRows.error) {
    throw activeVersionRows.error;
  }

  const reviewerIds = Array.from(
    new Set(
      (aiReviewRows ?? [])
        .map((row) => row.reviewer_user_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const reviewerProfiles = reviewerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", reviewerIds)
    : { data: [], error: null };

  if (reviewerProfiles.error) {
    throw reviewerProfiles.error;
  }

  const reviewerNameMap = new Map(
    (reviewerProfiles.data ?? []).map((row) => [row.id, row.full_name ?? null]),
  );

  const aiRequestMap = new Map((aiRequestRows ?? []).map((row) => [row.id, row]));
  const activeVersionMap = new Map(
    (activeVersionRows.data ?? []).map((row) => [row.governance_policy_id, row]),
  );

  const primaryPolicyRow = (aiPolicyRows ?? [])[0] ?? null;
  const primaryVersion = primaryPolicyRow ? activeVersionMap.get(primaryPolicyRow.id) ?? null : null;
  const policySnapshot = coerceAdminAiPolicySnapshot(
    primaryVersion?.policy_payload ?? null,
    adminData.organization.aiEnabled,
  );

  const requestCount = (aiRequestRows ?? []).length;
  const reviewCount = (aiReviewRows ?? []).length;
  const rejectedReviews = (aiReviewRows ?? []).filter((row) => row.review_status === "rejected");
  const withinPolicyPercent =
    requestCount === 0
      ? 100
      : Number((((requestCount - rejectedReviews.length) / requestCount) * 100).toFixed(1));

  const usageCounts = new Map<string, number>();
  for (const row of aiRequestRows ?? []) {
    const category = mapAiUsageCategory(row.feature_key);
    usageCounts.set(category, (usageCounts.get(category) ?? 0) + 1);
  }

  const usageBreakdown = Array.from(usageCounts.entries())
    .map(([key, count]) => ({
      key,
      label: mapAiUsageLabel(key),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const reviewQueue = {
    total: reviewCount,
    approved: (aiReviewRows ?? []).filter((row) => row.review_status === "approved").length,
    rejected: rejectedReviews.length,
    pending: (aiReviewRows ?? []).filter((row) => row.review_status === "pending").length,
  };

  const violations = rejectedReviews.slice(0, 6).map((row) => {
    const request = aiRequestMap.get(row.ai_request_id);
    return {
      id: row.id,
      occurredAt: row.reviewed_at,
      title: `${mapAiUsageLabel(mapAiUsageCategory(request?.feature_key ?? "other"))} blocked`,
      detail:
        row.feedback?.trim() ||
        `A ${request?.risk_level ?? "managed"} risk AI request was rejected during human review.`,
    };
  });

  const exportRows = (aiRequestRows ?? []).map((row) => {
    const matchingReview = (aiReviewRows ?? []).find((review) => review.ai_request_id === row.id) ?? null;
    const reviewStatus: AdminAiGovernanceData["exportRows"][number]["reviewStatus"] =
      matchingReview?.review_status ?? "not_reviewed";
    return {
      createdAt: row.created_at,
      featureKey: row.feature_key,
      riskLevel: row.risk_level,
      requestStatus: row.status,
      reviewStatus,
      reviewerName: matchingReview?.reviewer_user_id
        ? reviewerNameMap.get(matchingReview.reviewer_user_id) ?? null
        : null,
      feedback: matchingReview?.feedback ?? null,
    };
  });

  return {
    organization: adminData.organization,
    membershipRole: adminData.membershipRole,
    metrics: {
      actions30d: requestCount,
      withinPolicyPercent,
      humanReviewed30d: reviewCount,
      policyViolations30d: rejectedReviews.length,
    },
    policySnapshot,
    policyRecord: {
      id: primaryPolicyRow?.id ?? null,
      status: primaryPolicyRow?.status ?? null,
      versionNumber: primaryVersion?.version_number ?? null,
      updatedAt: primaryPolicyRow?.updated_at ?? null,
    },
    providerPolicies: (providerPolicyRows ?? []).map((row) => {
      const usageLimits =
        row.usage_limits && typeof row.usage_limits === "object" && !Array.isArray(row.usage_limits)
          ? (row.usage_limits as Record<string, unknown>)
          : {};
      const allowedModels = Array.isArray(row.allowed_models) ? row.allowed_models : [];
      return {
        id: row.id,
        providerKey: row.provider_key,
        enabled: row.enabled,
        allowedModelsCount: allowedModels.length,
        tokenLimit:
          typeof usageLimits.monthlyTokenLimit === "number" ? usageLimits.monthlyTokenLimit : null,
        updatedAt: row.updated_at,
      };
    }),
    usageBreakdown,
    violations,
    reviewQueue,
    exportRows,
  } satisfies AdminAiGovernanceData;
}

export async function getAdminAuditData(
  supabase: TypedSupabaseClient,
  user: User,
) {
  const adminData = await getAdminGovernanceOverviewData(supabase, user);

  if (!adminData) {
    return null;
  }

  const organizationId = adminData.organization.id;
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysIso = ninetyDaysAgo.toISOString();

  const [{ data: auditRows, error: auditRowsError }, { data: aiReviewRows, error: aiReviewRowsError }] =
    await Promise.all([
      supabase
        .from("audit_logs")
        .select("id, action, created_at, actor_user_id, target_table, metadata")
        .eq("organization_id", organizationId)
        .gte("created_at", ninetyDaysIso)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("ai_output_reviews")
        .select(
          "id, review_status, feedback, reviewed_at, reviewer_user_id, ai_requests!inner(id, feature_key, requested_by, organization_id, risk_level)",
        )
        .eq("ai_requests.organization_id", organizationId)
        .gte("reviewed_at", ninetyDaysIso)
        .order("reviewed_at", { ascending: false })
        .limit(120),
    ]);

  if (auditRowsError) throw auditRowsError;
  if (aiReviewRowsError) throw aiReviewRowsError;

  const actorIds = Array.from(
    new Set(
      [
        ...(auditRows ?? []).map((row) => row.actor_user_id),
        ...(aiReviewRows ?? []).map((row) => row.reviewer_user_id),
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  const actorProfiles = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [], error: null };

  if (actorProfiles.error) {
    throw actorProfiles.error;
  }

  const actorNameMap = new Map(
    (actorProfiles.data ?? []).map((row) => [row.id, row.full_name ?? null]),
  );

  const auditEvents: AdminAuditData["events"] = (auditRows ?? []).map((row) => {
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const metadataSummary =
      typeof metadata.summary === "string"
        ? metadata.summary
        : typeof metadata.detail === "string"
          ? metadata.detail
          : row.target_table
            ? `Affected resource: ${row.target_table.replaceAll("_", " ")}.`
            : "Organization audit event recorded.";
    const actorName = row.actor_user_id ? actorNameMap.get(row.actor_user_id) ?? null : null;
    const category = deriveAuditCategory(row.action, "audit_log", row.target_table);
    const severity = deriveAuditSeverity(row.action, "audit_log");

    return {
      id: `audit-${row.id}`,
      occurredAt: row.created_at,
      category,
      severity,
      title: humanizeActionLabel(row.action),
      detail: metadataSummary,
      actorName,
      actorType: actorName ? ("human" as const) : ("system" as const),
      sourceType: "audit_log" as const,
    };
  });

  const aiReviewEvents: AdminAuditData["events"] = (aiReviewRows ?? []).map((row) => {
    const request = Array.isArray(row.ai_requests) ? row.ai_requests[0] : row.ai_requests;
    const actorName = row.reviewer_user_id ? actorNameMap.get(row.reviewer_user_id) ?? null : null;
    const featureKey = request?.feature_key ?? "ai action";
    return {
      id: `review-${row.id}`,
      occurredAt: row.reviewed_at,
      category: "ai" as const,
      severity: deriveAuditSeverity(featureKey, "ai_review", row.review_status),
      title: `${humanizeFeatureKey(featureKey)} review ${row.review_status}`,
      detail:
        row.feedback?.trim() ||
        `AI request with ${request?.risk_level ?? "managed"} risk was marked ${row.review_status}.`,
      actorName,
      actorType: actorName ? ("human" as const) : ("innova" as const),
      sourceType: "ai_review" as const,
    };
  });

  const events = [...auditEvents, ...aiReviewEvents].sort((a, b) =>
    new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  const availableActors = Array.from(
    new Set(
      events
        .map((row) => row.actorName)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return {
    organization: adminData.organization,
    membershipRole: adminData.membershipRole,
    events,
    availableActors,
  } satisfies AdminAuditData;
}

export async function getAdminIntegrationsData(
  supabase: TypedSupabaseClient,
  user: User,
) {
  const adminData = await getAdminGovernanceOverviewData(supabase, user);

  if (!adminData) {
    return null;
  }

  const { data: integrationRows, error: integrationRowsError } = await supabase
    .from("integration_configurations")
    .select("id, integration_key, enabled, config_status, updated_at, metadata")
    .eq("organization_id", adminData.organization.id)
    .eq("scope_type", "organization")
    .order("updated_at", { ascending: false });

  if (integrationRowsError) {
    throw integrationRowsError;
  }

  return {
    organization: adminData.organization,
    membershipRole: adminData.membershipRole,
    integrations: (integrationRows ?? []).map((row) => ({
      id: row.id,
      integrationKey: row.integration_key,
      enabled: row.enabled,
      configStatus: row.config_status,
      updatedAt: row.updated_at,
      metadata: row.metadata,
    })),
  } satisfies AdminIntegrationsData;
}

export async function getAdminSecuritySsoData(
  supabase: TypedSupabaseClient,
  user: User,
) {
  const adminData = await getAdminGovernanceOverviewData(supabase, user);

  if (!adminData) {
    return null;
  }

  const organizationId = adminData.organization.id;

  const [
    { data: identityIntegrationRows, error: identityIntegrationRowsError },
    { data: policyRows, error: policyRowsError },
    { data: membershipRows, error: membershipRowsError },
    { data: auditRows, error: auditRowsError },
  ] = await Promise.all([
    supabase
      .from("integration_configurations")
      .select("id, integration_key, enabled, config_status, metadata, updated_at")
      .eq("organization_id", organizationId)
      .eq("scope_type", "organization")
      .in("integration_key", ["azure_ad_sso", "okta_sso", "google_workspace_sso", "custom_saml"])
      .order("updated_at", { ascending: false }),
    supabase
      .from("governance_policies")
      .select("id, status, active_version_id, updated_at")
      .eq("organization_id", organizationId)
      .eq("scope_type", "organization")
      .eq("policy_type", "integration_policy")
      .order("updated_at", { ascending: false }),
    supabase
      .from("organization_memberships")
      .select("id, status")
      .eq("organization_id", organizationId),
    supabase
      .from("audit_logs")
      .select("id, action, created_at, metadata")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(120),
  ]);

  if (identityIntegrationRowsError) throw identityIntegrationRowsError;
  if (policyRowsError) throw policyRowsError;
  if (membershipRowsError) throw membershipRowsError;
  if (auditRowsError) throw auditRowsError;

  const activeVersionIds = (policyRows ?? [])
    .map((row) => row.active_version_id)
    .filter((value): value is string => Boolean(value));

  const versionRows = activeVersionIds.length
    ? await supabase
        .from("governance_policy_versions")
        .select("id, governance_policy_id, version_number, policy_payload")
        .in("id", activeVersionIds)
    : { data: [], error: null };

  if (versionRows.error) {
    throw versionRows.error;
  }

  const versionMap = new Map(
    (versionRows.data ?? []).map((row) => [row.governance_policy_id, row]),
  );

  const primaryPolicy = (policyRows ?? [])[0] ?? null;
  const primaryVersion = primaryPolicy ? versionMap.get(primaryPolicy.id) ?? null : null;
  const configuration = coerceSecuritySsoConfiguration(primaryVersion?.policy_payload ?? null);

  const providerConfigRow =
    (identityIntegrationRows ?? []).find((row) => row.integration_key === configuration.providerKey) ??
    (identityIntegrationRows ?? [])[0] ??
    null;

  const activeMemberships = (membershipRows ?? []).filter((row) => row.status === "active").length;
  const revokedMemberships30d = (auditRows ?? []).filter((row) => {
    if (!row.action.toLowerCase().includes("revoke")) return false;
    return new Date(row.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }).length;

  const identityEvents = (auditRows ?? []).filter((row) => {
    const action = row.action.toLowerCase();
    return (
      action.includes("sso") ||
      action.includes("scim") ||
      action.includes("login") ||
      action.includes("provision") ||
      action.includes("deprovision") ||
      action.includes("group")
    );
  });

  const syncEvents = identityEvents.slice(0, 6).map((row) => {
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const detail =
      typeof metadata.summary === "string"
        ? metadata.summary
        : typeof metadata.detail === "string"
          ? metadata.detail
          : humanizeActionLabel(row.action);
    const lowerAction = row.action.toLowerCase();
    return {
      id: row.id,
      title: humanizeActionLabel(row.action),
      detail,
      createdAt: row.created_at,
      severity:
        lowerAction.includes("warn") ||
        lowerAction.includes("fail") ||
        lowerAction.includes("missing")
          ? ("warning" as const)
          : ("info" as const),
    };
  });

  const affectedUsersCount = Math.max(
    0,
    Math.round(activeMemberships * configuration.attributeMappings.filter((row) => row.status === "unmapped").length * 0.02),
  );

  const lastSsoLoginAt =
    identityEvents.find((row) => row.action.toLowerCase().includes("login"))?.created_at ?? null;
  const lastScimSyncAt =
    identityEvents.find((row) => row.action.toLowerCase().includes("scim"))?.created_at ?? null;

  return {
    organization: adminData.organization,
    membershipRole: adminData.membershipRole,
    providerConfig: {
      integrationId: providerConfigRow?.id ?? null,
      providerKey: configuration.providerKey,
      enabled: providerConfigRow?.enabled ?? false,
      configStatus: providerConfigRow?.config_status ?? "not_configured",
      metadata: providerConfigRow?.metadata ?? null,
      updatedAt: providerConfigRow?.updated_at ?? null,
    },
    policyRecord: {
      id: primaryPolicy?.id ?? null,
      status: primaryPolicy?.status ?? null,
      versionNumber: primaryVersion?.version_number ?? null,
      updatedAt: primaryPolicy?.updated_at ?? null,
    },
    configuration,
    health: {
      lastSsoLoginAt,
      lastScimSyncAt,
      provisionedUsers: activeMemberships,
      deprovisionedUsers30d: revokedMemberships30d,
      syncWarnings: syncEvents.filter((row) => row.severity === "warning").length,
    },
    syncEvents,
    affectedUsersCount,
  } satisfies AdminSecuritySsoData;
}

export async function getAdminRetentionExportData(
  supabase: TypedSupabaseClient,
  user: User,
) {
  const adminData = await getAdminGovernanceOverviewData(supabase, user);

  if (!adminData) {
    return null;
  }

  const organizationId = adminData.organization.id;

  const [
    { data: retentionRows, error: retentionRowsError },
    { data: exportPolicyRows, error: exportPolicyRowsError },
    { data: workspaceRows, error: workspaceRowsError },
    { count: auditCount, error: auditCountError },
  ] = await Promise.all([
    supabase
      .from("retention_policies")
      .select("id, status, updated_at, policy_payload")
      .eq("organization_id", organizationId)
      .eq("scope_type", "organization")
      .order("updated_at", { ascending: false }),
    supabase
      .from("governance_policies")
      .select("id, status, active_version_id, updated_at")
      .eq("organization_id", organizationId)
      .eq("scope_type", "organization")
      .eq("policy_type", "export_policy")
      .order("updated_at", { ascending: false }),
    supabase
      .from("workspaces")
      .select("id")
      .eq("organization_id", organizationId),
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);

  if (retentionRowsError) throw retentionRowsError;
  if (exportPolicyRowsError) throw exportPolicyRowsError;
  if (workspaceRowsError) throw workspaceRowsError;
  if (auditCountError) throw auditCountError;

  const activeVersionIds = (exportPolicyRows ?? [])
    .map((row) => row.active_version_id)
    .filter((value): value is string => Boolean(value));

  const exportVersionRows = activeVersionIds.length
    ? await supabase
        .from("governance_policy_versions")
        .select("id, governance_policy_id, version_number, policy_payload")
        .in("id", activeVersionIds)
    : { data: [], error: null };

  if (exportVersionRows.error) {
    throw exportVersionRows.error;
  }

  const workspaceIds = (workspaceRows ?? []).map((row) => row.id);
  const programRows = workspaceIds.length
    ? await supabase.from("programs").select("id").in("workspace_id", workspaceIds)
    : { data: [], error: null };

  if (programRows.error) {
    throw programRows.error;
  }

  const programIds = (programRows.data ?? []).map((row) => row.id);

  const [registrationsResult, submissionsResult] = await Promise.all([
    programIds.length
      ? supabase
          .from("program_registrations")
          .select("id", { count: "exact", head: true })
          .in("program_id", programIds)
      : Promise.resolve({ count: 0, error: null }),
    programIds.length
      ? supabase
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .in("program_id", programIds)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  if (registrationsResult.error) throw registrationsResult.error;
  if (submissionsResult.error) throw submissionsResult.error;

  const primaryRetention = (retentionRows ?? [])[0] ?? null;
  const primaryExportPolicy = (exportPolicyRows ?? [])[0] ?? null;
  const exportVersionMap = new Map(
    (exportVersionRows.data ?? []).map((row) => [row.governance_policy_id, row]),
  );
  const activeExportVersion = primaryExportPolicy
    ? exportVersionMap.get(primaryExportPolicy.id) ?? null
    : null;

  const retentionPayload =
    primaryRetention?.policy_payload && typeof primaryRetention.policy_payload === "object"
      ? (primaryRetention.policy_payload as Record<string, unknown>)
      : {};

  const annualReviewDueAt = primaryRetention?.updated_at
    ? new Date(new Date(primaryRetention.updated_at).setFullYear(new Date(primaryRetention.updated_at).getFullYear() + 1)).toISOString()
    : null;

  const upcomingActions: AdminRetentionExportData["upcomingActions"] = [];

  if (!primaryRetention) {
    upcomingActions.push({
      id: "retention-policy-missing",
      title: "Retention policy needs review",
      detail: "No organization-level retention schedule has been saved yet.",
      meta: "Action required",
    });
  } else if (annualReviewDueAt) {
    upcomingActions.push({
      id: "annual-review",
      title: "Policy review due",
      detail: "Annual review window for the organization retention schedule.",
      meta: formatShortDateForPolicy(annualReviewDueAt),
    });
  }

  if (!primaryExportPolicy) {
    upcomingActions.push({
      id: "export-policy-missing",
      title: "Export policy not finalized",
      detail: "Who-can-export controls still need an active organization-level export policy.",
      meta: "Pending governance",
    });
  }

  if ((registrationsResult.count ?? 0) > 0) {
    upcomingActions.push({
      id: "participant-records",
      title: "Participant data under retention schedule",
      detail: `${registrationsResult.count?.toLocaleString() ?? "0"} participant registration records are governed by the current policy.`,
      meta: "Tracked records",
    });
  }

  return {
    organization: adminData.organization,
    membershipRole: adminData.membershipRole,
    retentionPolicy: {
      id: primaryRetention?.id ?? null,
      status: primaryRetention?.status ?? null,
      updatedAt: primaryRetention?.updated_at ?? null,
      schedule: coerceRetentionSchedule(
        typeof retentionPayload.schedule === "object" && retentionPayload.schedule !== null
          ? (retentionPayload.schedule as Json)
          : null,
      ),
      deletionRules: coerceDeletionRules(
        typeof retentionPayload.deletionRules === "object" && retentionPayload.deletionRules !== null
          ? (retentionPayload.deletionRules as Json)
          : null,
      ),
    },
    exportPolicy: {
      id: primaryExportPolicy?.id ?? null,
      status: primaryExportPolicy?.status ?? null,
      versionNumber: activeExportVersion?.version_number ?? null,
      updatedAt: primaryExportPolicy?.updated_at ?? null,
      controls: coerceExportControls(activeExportVersion?.policy_payload ?? null),
    },
    stats: {
      participantRecords: registrationsResult.count ?? 0,
      submissions: submissionsResult.count ?? 0,
      auditEvents: auditCount ?? 0,
      activePrograms: programIds.length,
    },
    upcomingActions,
    annualReviewDueAt,
  } satisfies AdminRetentionExportData;
}

export async function getAdminFeatureFlagsData(
  supabase: TypedSupabaseClient,
  user: User,
) {
  const adminData = await getAdminGovernanceOverviewData(supabase, user);

  if (!adminData) {
    return null;
  }

  const organizationId = adminData.organization.id;

  const { data: policyRows, error: policyRowsError } = await supabase
    .from("governance_policies")
    .select("id, status, active_version_id, updated_at")
    .eq("organization_id", organizationId)
    .eq("scope_type", "organization")
    .eq("policy_type", "automation_governance_policy")
    .order("updated_at", { ascending: false });

  if (policyRowsError) {
    throw policyRowsError;
  }

  const activeVersionIds = (policyRows ?? [])
    .map((row) => row.active_version_id)
    .filter((value): value is string => Boolean(value));

  const activeVersionRows = activeVersionIds.length
    ? await supabase
        .from("governance_policy_versions")
        .select("id, governance_policy_id, version_number, policy_payload")
        .in("id", activeVersionIds)
    : { data: [], error: null };

  if (activeVersionRows.error) {
    throw activeVersionRows.error;
  }

  const versionMap = new Map(
    (activeVersionRows.data ?? []).map((row) => [row.governance_policy_id, row]),
  );

  const primaryPolicyRow = (policyRows ?? []).find((row) => {
    const version = versionMap.get(row.id);
    const payload =
      version?.policy_payload && typeof version.policy_payload === "object" && !Array.isArray(version.policy_payload)
        ? (version.policy_payload as Record<string, unknown>)
        : {};

    return payload.policyKey === "organization_feature_flags";
  }) ?? null;

  const primaryVersion = primaryPolicyRow ? versionMap.get(primaryPolicyRow.id) ?? null : null;

  return {
    organization: adminData.organization,
    membershipRole: adminData.membershipRole,
    policyRecord: {
      id: primaryPolicyRow?.id ?? null,
      status: primaryPolicyRow?.status ?? null,
      versionNumber: primaryVersion?.version_number ?? null,
      updatedAt: primaryPolicyRow?.updated_at ?? null,
    },
    flags: coerceFeatureFlags(primaryVersion?.policy_payload ?? null),
  } satisfies AdminFeatureFlagData;
}

export async function getAdminAutomationGovernanceData(
  supabase: TypedSupabaseClient,
  user: User,
) {
  const adminData = await getAdminGovernanceOverviewData(supabase, user);

  if (!adminData) {
    return null;
  }

  const organizationId = adminData.organization.id;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [
    { data: policyRows, error: policyRowsError },
    { data: auditRows, error: auditRowsError },
    { data: approvalRows, error: approvalRowsError },
  ] = await Promise.all([
      supabase
        .from("governance_policies")
        .select("id, status, active_version_id, updated_at")
        .eq("organization_id", organizationId)
        .eq("scope_type", "organization")
        .eq("policy_type", "automation_governance_policy")
        .order("updated_at", { ascending: false }),
      supabase
        .from("audit_logs")
        .select("id, action, created_at, metadata")
        .eq("organization_id", organizationId)
        .gte("created_at", todayIso)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("approval_requests")
        .select("id, title, summary, requested_at, status")
        .eq("organization_id", organizationId)
        .eq("status", "pending")
        .order("requested_at", { ascending: false })
        .limit(3),
    ]);

  if (policyRowsError) throw policyRowsError;
  if (auditRowsError) throw auditRowsError;
  if (approvalRowsError) throw approvalRowsError;

  const activeVersionIds = (policyRows ?? [])
    .map((row) => row.active_version_id)
    .filter((value): value is string => Boolean(value));

  const activeVersionRows = activeVersionIds.length
    ? await supabase
        .from("governance_policy_versions")
        .select("id, governance_policy_id, version_number, policy_payload")
        .in("id", activeVersionIds)
    : { data: [], error: null };

  if (activeVersionRows.error) {
    throw activeVersionRows.error;
  }

  const versionMap = new Map(
    (activeVersionRows.data ?? []).map((row) => [row.governance_policy_id, row]),
  );

  const primaryPolicyRow = (policyRows ?? []).find((row) => {
    const version = versionMap.get(row.id);
    const payload =
      version?.policy_payload && typeof version.policy_payload === "object" && !Array.isArray(version.policy_payload)
        ? (version.policy_payload as Record<string, unknown>)
        : {};

    return payload.policyKey === "organization_automation_governance";
  }) ?? null;

  const primaryVersion = primaryPolicyRow ? versionMap.get(primaryPolicyRow.id) ?? null : null;
  const snapshot = coerceAutomationGovernanceSnapshot(primaryVersion?.policy_payload ?? null);

  const pendingApprovals = (approvalRows ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      detail: row.summary ?? "Pending approval inside the organization workflow queue.",
      createdAt: row.requested_at,
    }));

  const failedAuditRows = (auditRows ?? []).filter((row) => row.action.includes("failed"));

  return {
    organization: adminData.organization,
    membershipRole: adminData.membershipRole,
    policyRecord: {
      id: primaryPolicyRow?.id ?? null,
      status: primaryPolicyRow?.status ?? null,
      versionNumber: primaryVersion?.version_number ?? null,
      updatedAt: primaryPolicyRow?.updated_at ?? null,
    },
    safetyMode: snapshot.safetyMode,
    approvalThresholds: snapshot.approvalThresholds,
    restrictions: snapshot.restrictions,
    rules: snapshot.rules,
    pendingApprovals,
    health: {
      activeRules: snapshot.rules.filter((rule) => rule.status === "active").length,
      runsToday: (auditRows ?? []).filter((row) => row.action.includes("automation")).length,
      failedToday: failedAuditRows.length,
      lastRunAt: (auditRows ?? [])[0]?.created_at ?? null,
    },
    recentFailures: failedAuditRows.slice(0, 3).map((row) => ({
      id: row.id,
      title: humanizeGovernanceKey(row.action),
      detail: "An automation-related audit event was recorded and should be reviewed by an operator.",
      createdAt: row.created_at,
    })),
  } satisfies AdminAutomationGovernanceData;
}

export async function getAdminRolesData(
  supabase: TypedSupabaseClient,
  user: User,
) {
  const adminData = await getAdminGovernanceOverviewData(supabase, user);

  if (!adminData) {
    return null;
  }

  const organizationId = adminData.organization.id;
  const { data: orgMemberships, error: orgMembershipsError } = await supabase
    .from("organization_memberships")
    .select("id, user_id, role, status")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (orgMembershipsError) {
    throw orgMembershipsError;
  }

  const { data: workspaces, error: workspacesError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("organization_id", organizationId);

  if (workspacesError) {
    throw workspacesError;
  }

  const workspaceIds = (workspaces ?? []).map((row) => row.id);
  const programRows = workspaceIds.length
    ? await supabase.from("programs").select("id, workspace_id").in("workspace_id", workspaceIds)
    : { data: [], error: null };

  if (programRows.error) {
    throw programRows.error;
  }

  const userIds = Array.from(new Set((orgMemberships ?? []).map((row) => row.user_id)));
  const programIds = (programRows.data ?? []).map((row) => row.id);

  const [profilesResult, workspaceMembershipsResult, programMembershipsResult, auditRowsResult] =
    await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("id, full_name, email").in("id", userIds)
        : Promise.resolve({ data: [], error: null }),
      workspaceIds.length
        ? supabase
            .from("workspace_memberships")
            .select("user_id, role, status")
            .in("workspace_id", workspaceIds)
        : Promise.resolve({ data: [], error: null }),
      programIds.length
        ? supabase
            .from("program_memberships")
            .select("user_id, role, status")
            .in("program_id", programIds)
        : Promise.resolve({ data: [], error: null }),
      userIds.length
        ? supabase
            .from("audit_logs")
            .select("actor_user_id, created_at")
            .in("actor_user_id", userIds)
            .order("created_at", { ascending: false })
            .limit(200)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (profilesResult.error) throw profilesResult.error;
  if (workspaceMembershipsResult.error) throw workspaceMembershipsResult.error;
  if (programMembershipsResult.error) throw programMembershipsResult.error;
  if (auditRowsResult.error) throw auditRowsResult.error;

  const profileMap = new Map((profilesResult.data ?? []).map((row) => [row.id, row]));
  const workspaceRolesByUserId = new Map<string, Set<Database["public"]["Enums"]["workspace_membership_role"]>>();
  const programRolesByUserId = new Map<string, Set<Database["public"]["Enums"]["program_membership_role"]>>();
  const lastActiveByUserId = new Map<string, string>();

  for (const row of workspaceMembershipsResult.data ?? []) {
    if (row.status !== "active") continue;
    const bucket = workspaceRolesByUserId.get(row.user_id) ?? new Set();
    bucket.add(row.role);
    workspaceRolesByUserId.set(row.user_id, bucket);
  }

  for (const row of programMembershipsResult.data ?? []) {
    if (row.status !== "active") continue;
    const bucket = programRolesByUserId.get(row.user_id) ?? new Set();
    bucket.add(row.role);
    programRolesByUserId.set(row.user_id, bucket);
  }

  for (const row of auditRowsResult.data ?? []) {
    if (!row.actor_user_id || lastActiveByUserId.has(row.actor_user_id)) continue;
    lastActiveByUserId.set(row.actor_user_id, row.created_at);
  }

  const users = (orgMemberships ?? []).map((membership) => {
    const profile = profileMap.get(membership.user_id) ?? null;
    return {
      membershipId: membership.id,
      userId: membership.user_id,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
      organizationRole: membership.role,
      membershipStatus: membership.status,
      workspaceRoles: Array.from(workspaceRolesByUserId.get(membership.user_id) ?? []),
      programRoles: Array.from(programRolesByUserId.get(membership.user_id) ?? []),
      lastActiveAt: lastActiveByUserId.get(membership.user_id) ?? null,
    };
  });

  const roleCounts = users.reduce<Record<string, number>>((acc, row) => {
    acc[row.organizationRole] = (acc[row.organizationRole] ?? 0) + 1;
    return acc;
  }, {});

  return {
    organization: adminData.organization,
    membershipRole: adminData.membershipRole,
    users,
    summary: {
      totalUsers: users.length,
      activeUsers: users.filter((row) => row.membershipStatus === "active").length,
      invitedUsers: users.filter((row) => row.membershipStatus === "invited").length,
      roleCounts,
    },
  } satisfies AdminRolesData;
}

function isPendingModerationStatus(status: Database["public"]["Enums"]["submission_status"]) {
  return !["shortlisted", "finalist", "winner", "rejected"].includes(status);
}

function mapCalibrationExercise(exercise: {
  id: string;
  scorecard_id: string;
  title: string;
  reference_code: string | null;
  instructions: string | null;
  problem_summary: string | null;
  solution_summary: string | null;
  validation_summary: string | null;
  team_summary: string | null;
  pitch_deck_url: string | null;
  demo_url: string | null;
  consensus_total_score: number | null;
  manager_note: string | null;
  scoring_anchors: Json;
}) {
  return {
    id: exercise.id,
    scorecardId: exercise.scorecard_id,
    title: exercise.title,
    referenceCode: exercise.reference_code,
    instructions: exercise.instructions,
    problemSummary: exercise.problem_summary,
    solutionSummary: exercise.solution_summary,
    validationSummary: exercise.validation_summary,
    teamSummary: exercise.team_summary,
    pitchDeckUrl: exercise.pitch_deck_url,
    demoUrl: exercise.demo_url,
    consensusTotalScore:
      typeof exercise.consensus_total_score === "number"
        ? exercise.consensus_total_score
        : exercise.consensus_total_score
          ? Number(exercise.consensus_total_score)
          : null,
    managerNote: exercise.manager_note,
    scoringAnchors: parseCalibrationAnchors(exercise.scoring_anchors),
  } satisfies JudgeCalibrationExerciseSummary;
}

function parseCalibrationAnchors(value: Json): JudgeCalibrationAnchor[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const anchors: JudgeCalibrationAnchor[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const rangeLabel =
      "rangeLabel" in item && typeof item.rangeLabel === "string"
        ? item.rangeLabel
        : null;
    const note =
      "note" in item && typeof item.note === "string"
        ? item.note
        : null;
    const highlighted =
      "highlighted" in item && typeof item.highlighted === "boolean"
        ? item.highlighted
        : false;

    if (!rangeLabel || !note) {
      continue;
    }

    anchors.push({ rangeLabel, note, highlighted });
  }

  return anchors;
}

function parseJsonStringArray(value: Json): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function buildScoreStats(values: number[]) {
  if (values.length === 0) {
    return {
      mean: null,
      min: null,
      max: null,
      stdDeviation: null,
    };
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return {
    mean: Number(mean.toFixed(1)),
    min: Number(Math.min(...values).toFixed(1)),
    max: Number(Math.max(...values).toFixed(1)),
    stdDeviation: Number(Math.sqrt(variance).toFixed(1)),
  };
}
