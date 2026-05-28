import Link from "next/link";
import styles from "./homepage.module.css";

const navLinks = ["Platform", "Solutions", "Enterprise", "Customers", "Resources"];

const capabilities = [
  {
    title: "AI Program Creation",
    desc: "Describe your program and Innova drafts the complete launch kit — brief, timeline, rules, assets — in a single guided session.",
    features: [
      "Natural language brief-to-program",
      "Customisable program templates",
      "AI-assisted risk and gap detection",
    ],
    icon: "gold",
  },
  {
    title: "Landing Pages & Applications",
    desc: "Branded participant portals with custom application forms, eligibility gates, and team management — deployed in minutes.",
    features: [
      "White-label public landing pages",
      "Drag-and-drop form builder",
      "Multi-stage application flows",
    ],
    icon: "blue",
  },
  {
    title: "Judging & Evaluation",
    desc: "Structured judging workflows with automated assignment, scoring rubrics, conflict detection, calibration sessions, and result aggregation.",
    features: [
      "Weighted scoring rubrics",
      "Conflict-of-interest management",
      "Blind and panel judging modes",
    ],
    icon: "green",
  },
  {
    title: "Communications & Approvals",
    desc: "Multi-audience email campaigns, auto-triggered notifications, and structured approval queues that enforce your review governance.",
    features: [
      "Audience-segmented messaging",
      "Scheduled and triggered comms",
      "Multi-level approval workflows",
    ],
    icon: "amber",
  },
  {
    title: "Reporting & Analytics",
    desc: "Real-time dashboards for program managers and sponsor-safe export packages for stakeholders and leadership sign-off.",
    features: [
      "Sponsor-safe report packages",
      "Participation and outcome metrics",
      "Exportable board-ready summaries",
    ],
    icon: "steel",
  },
  {
    title: "Live Operations & Governance",
    desc: "Operations dashboard for the full program run — milestone tracking, participant support, escalation management, and final ceremonies.",
    features: [
      "Real-time operations monitoring",
      "Escalation and incident handling",
      "Post-program audit closure",
    ],
    icon: "muted",
  },
];

const trustControls = [
  {
    title: "Approval workflows",
    desc: "Every asset, communication, and program decision passes through configurable, multi-level approval queues before execution.",
    icon: "gold",
  },
  {
    title: "Role-based access",
    desc: "Granular RBAC across programs, modules, and actions. Org-wide admins, program managers, reviewers, and read-only observers.",
    icon: "blue",
  },
  {
    title: "Full audit trail",
    desc: "Every action — who, what, when — is logged immutably. Exportable for compliance reviews, sponsorship audits, and post-mortems.",
    icon: "green",
  },
  {
    title: "Deterministic AI",
    desc: "Innova proposes; humans approve. No AI action executes without an authorised human confirming the output. Always.",
    icon: "amber",
  },
  {
    title: "SSO & identity",
    desc: "Azure AD, Okta, and Google Workspace SSO. SCIM provisioning. Domain-locked tenants with configurable session policies.",
    icon: "steel",
  },
  {
    title: "Data residency",
    desc: "EU, US, and APAC data residency options. Dedicated tenants available for regulated industries and public-sector customers.",
    icon: "muted",
  },
];

const useCases = [
  {
    title: "Employee Hackathons",
    desc: "Global or regional employee innovation sprints with team formation, submissions, and live judging at scale.",
    tags: ["Internal", "Large-scale", "Multi-site"],
    icon: "gold",
  },
  {
    title: "Corporate Accelerators",
    desc: "Structured cohort programs for startups or internal ventures with applications, mentoring, milestones, and pitch days.",
    tags: ["Cohort-based", "Mentoring", "Milestones"],
    icon: "blue",
  },
  {
    title: "Open Innovation Challenges",
    desc: "Public-facing calls for external innovators, startups, and researchers with complex evaluation and IP considerations.",
    tags: ["External", "Open call", "IP governance"],
    icon: "green",
  },
  {
    title: "Grant Programs",
    desc: "Multi-stage grant applications with eligibility screening, review panels, committee decisions, and disbursement tracking.",
    tags: ["Multi-stage", "Committee", "Compliance"],
    icon: "amber",
  },
  {
    title: "University & Student Programs",
    desc: "University partnerships, student competitions, and graduate challenges with cross-institution coordination and academic governance.",
    tags: ["Academic", "Cross-institution", "Prizes"],
    icon: "steel",
  },
  {
    title: "Internal Venture Programs",
    desc: "Intrapreneurship initiatives with investment committee workflows, stage-gates, portfolio tracking, and executive reporting.",
    tags: ["Stage-gate", "Portfolio", "Executive reporting"],
    icon: "muted",
  },
];

const footerPlatform = [
  "AI Program Creation",
  "Landing Pages",
  "Judging & Evaluation",
  "Communications",
  "Reporting & Analytics",
  "Enterprise Controls",
];

const footerSolutions = [
  "Hackathons",
  "Accelerators",
  "Open Challenges",
  "Grant Programs",
  "Student Competitions",
  "Venture Programs",
];

const footerCompany = [
  "About Innovink",
  "Customers",
  "Security & Trust",
  "Blog",
  "Careers",
  "Contact Sales",
];

function iconTone(icon: string) {
  switch (icon) {
    case "gold":
      return styles.icoGold;
    case "blue":
      return styles.icoBlue;
    case "green":
      return styles.icoGreen;
    case "amber":
      return styles.icoAmber;
    case "steel":
      return styles.icoSteel;
    default:
      return styles.icoMuted;
  }
}

function SimpleIcon({ icon }: { icon: string }) {
  const stroke =
    icon === "gold"
      ? "#CCAA4A"
      : icon === "blue"
        ? "#4D87BC"
        : icon === "green"
          ? "#3E9A70"
          : icon === "amber"
            ? "#DBA84A"
            : icon === "steel"
              ? "#6080A0"
              : "#9BAABF";

  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3.5l2 1.5" />
    </svg>
  );
}

export function MarketingHomepage() {
  return (
    <main className={styles.page}>
      <nav className={styles.mktNav}>
        <div className={styles.mktNavInner}>
          <div className={styles.mktNavBrand}>
            <div className={styles.mark}>IN</div>
            <div className={styles.brandName}>Innovink</div>
          </div>
          <div className={styles.mktNavLinks}>
            {navLinks.map((label) => (
              <a key={label} href={`#${label.toLowerCase()}`} className={styles.mktNavLink}>
                {label}
              </a>
            ))}
          </div>
          <div className={styles.mktNavActions}>
            <Link href="/login" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}>
              Sign in
            </Link>
            <a href="#get-started" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}>
              Request demo
            </a>
          </div>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroBeam} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div>
            <div className={styles.heroEyebrow}>
              <div className={styles.heroEyebrowDot} />
              Agentic AI · Enterprise Innovation Platform
            </div>
            <h1 className={styles.heroHeadline}>
              Your Innovation Programs.
              <br />
              <em>Run by Agentic AI.</em>
            </h1>
            <p className={styles.heroSub}>
              Innova — Innovink’s AI agent — designs your program brief, drafts every asset,
              routes approvals, and operates live programs end to end. Your team governs every
              decision. Innova does the work.
            </p>
            <div className={styles.heroAgentCaps}>
              {[
                "Plans & briefs programs",
                "Drafts all launch assets",
                "Routes approvals",
                "Runs live operations",
              ].map((item) => (
                <div key={item} className={styles.heroCap}>
                  <div className={styles.heroCapDot} />
                  {item}
                </div>
              ))}
            </div>
            <div className={styles.heroActions}>
              <a href="#get-started" className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: "13px 28px", fontSize: "14px" }}>
                Request a demo →
              </a>
              <a href="#product" className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: "13px 28px", fontSize: "14px" }}>
                See it live
              </a>
            </div>
            <div className={styles.heroProof}>
              <div className={styles.heroProofAvs}>
                {["MC", "SR", "PL", "DW"].map((value) => (
                  <div key={value} className={styles.heroProofAv}>
                    {value}
                  </div>
                ))}
              </div>
              <span>
                Built for program managers running{" "}
                <strong style={{ color: "var(--t-secondary)" }}>
                  global innovation challenges
                </strong>{" "}
                at enterprise scale
              </span>
            </div>
          </div>

          <div className={styles.heroPreview}>
            <div className={styles.heroPreviewFrame}>
              <div className={styles.previewTitlebar}>
                <div className={styles.previewDot} style={{ background: "#3A3A3A" }} />
                <div className={styles.previewDot} style={{ background: "#3A3A3A", marginLeft: 2 }} />
                <div className={styles.previewDot} style={{ background: "#3A3A3A", marginLeft: 2 }} />
                <div className={styles.previewUrl}>app.innovink.com › programs › global-innovation-sprint-2026</div>
              </div>
              <div className={styles.previewBody}>
                <div className={styles.previewNav}>
                  <div className={styles.previewNavBrand}>
                    <div className={styles.previewBrandMark}>IN</div>
                    <div className={styles.previewBrandName}>Innovink</div>
                  </div>
                  <div className={`${styles.previewNavItem} ${styles.previewNavItemActive}`}>AI Workspace</div>
                  <div className={styles.previewNavItem}>Program Brief</div>
                  <div className={styles.previewNavItem}>Timeline</div>
                  <div style={{ height: 1, background: "var(--b-subtle)", margin: "8px 0" }} />
                  <div className={styles.previewNavItem}>Approvals</div>
                  <div style={{ marginTop: 4, padding: "6px 12px" }}>
                    <div style={{ fontSize: "8.5px", color: "var(--t-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                      Progress
                    </div>
                    <div style={{ fontSize: "9.5px", color: "var(--t-secondary)", marginBottom: 4 }}>
                      Draft Assets — 43%
                    </div>
                    <div className={styles.previewProgBar}>
                      <div className={styles.previewProgFill} style={{ width: "43%" }} />
                    </div>
                  </div>
                </div>
                <div className={styles.previewMain}>
                  <div className={styles.previewChatHdr}>
                    <div className={`${styles.previewTab} ${styles.previewTabActive}`}>Innova Chat</div>
                    <div className={styles.previewTab}>Brief ✓</div>
                    <div className={styles.previewTab}>Plan ✓</div>
                    <div className={styles.previewTab} style={{ color: "var(--amber-bright)" }}>
                      Assets 4/11
                    </div>
                  </div>
                  <div className={styles.previewChat}>
                    <div className={styles.previewMsgAi}>
                      <div className={styles.previewAv}>IN</div>
                      <div className={styles.previewBubbleAi}>
                        Two assets are blocked: the <strong style={{ color: "var(--t-primary)" }}>Judge Brief</strong> and the{" "}
                        <strong style={{ color: "var(--t-primary)" }}>Scoring Rubric</strong>. Shall I walk you through the open decisions?
                      </div>
                    </div>
                    <div className={styles.previewMsgPm}>
                      <div className={styles.previewBubblePm}>Yes — start with the judge brief.</div>
                    </div>
                    <div className={styles.previewMsgAi}>
                      <div className={styles.previewAv}>IN</div>
                      <div className={styles.previewBubbleAi}>
                        The scoring weights are unset. I recommend:{" "}
                        <span style={{ color: "var(--gold-bright)" }}>
                          Impact 40% / Feasibility 30% / Originality 30%
                        </span>
                        . Want me to apply these?
                      </div>
                    </div>
                    <div className={styles.previewMsgPm}>
                      <div className={styles.previewBubblePm}>Yes, apply those weights and finalize.</div>
                    </div>
                    <div className={styles.previewTyping}>
                      <div className={styles.previewAv}>IN</div>
                      <div className={styles.previewTypingDots}>
                        <div className={styles.typingDot} style={{ animationDelay: "0s" }} />
                        <div className={styles.typingDot} style={{ animationDelay: "0.2s" }} />
                        <div className={styles.typingDot} style={{ animationDelay: "0.4s" }} />
                      </div>
                    </div>
                  </div>
                  <div className={styles.previewInput}>Reply to Innova…</div>
                </div>
                <div className={styles.previewRight}>
                  <div className={styles.previewRightHdr}>PM Focus — Assets</div>
                  <div className={styles.previewRightBody}>
                    <div style={{ fontSize: 9, color: "var(--t-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                      Needs Your Input
                    </div>
                    <div className={styles.previewRightItem} style={{ borderColor: "var(--amber-bdr)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <div className={styles.previewRightItemTitle} style={{ color: "var(--t-primary)" }}>
                          Judge Brief
                        </div>
                        <span className={`${styles.previewBadgeSm} ${styles.previewBadgeAmber}`}>Blocked</span>
                      </div>
                      <div className={styles.previewRightItemMeta}>Scoring weights unset</div>
                    </div>
                    <div style={{ fontSize: 9, color: "var(--t-muted)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "8px 0 4px" }}>
                      Launch Readiness
                    </div>
                    <div className={styles.previewRightCheck}>
                      <div className={`${styles.previewCheckIco} ${styles.previewCheckOk}`}>✓</div>
                      Registration form live
                    </div>
                    <div className={styles.previewRightCheck}>
                      <div className={`${styles.previewCheckIco} ${styles.previewCheckOk}`}>✓</div>
                      Communications scheduled
                    </div>
                    <div className={styles.previewRightCheck}>
                      <div className={`${styles.previewCheckIco} ${styles.previewCheckWarn}`}>!</div>
                      Judging package incomplete
                    </div>
                    <div className={styles.previewRightCheck}>
                      <div className={`${styles.previewCheckIco} ${styles.previewCheckMiss}`}>–</div>
                      Finalist workflow
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.previewFloatCard}>
              <div className={styles.previewFloatCardTitle}>Program Health</div>
              {[
                ["Teams registered", "312", "var(--green-bright)"],
                ["Submissions", "156", "var(--gold-bright)"],
                ["Approvals pending", "17", "var(--amber-bright)"],
                ["Days to deadline", "24", "var(--t-primary)"],
              ].map(([label, value, color]) => (
                <div key={label} className={styles.previewStatRow}>
                  <span className={styles.previewStatLabel}>{label}</span>
                  <span className={styles.previewStatVal} style={{ color }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.problemGrid}>
            <div>
              <div className={styles.sectEyebrow}>The Problem</div>
              <h2 className={styles.sectTitle}>Innovation programs deserve better infrastructure</h2>
              <p className={styles.problemLead}>
                Most enterprises run innovation programs on a patchwork of disconnected tools —
                program briefs in Word, applications in Typeform, judging in spreadsheets,
                communications in Mailchimp, and reporting in Excel. The result is fragmented
                operations, governance gaps, and exhausted program managers.
              </p>
              {[
                [
                  "No single source of truth",
                  "Program data lives across a dozen tools. Reporting is manual. Governance is an afterthought.",
                  "amber",
                ],
                [
                  "Months of setup, not weeks",
                  "Every program launch requires rebuilding workflows from scratch. Institutional knowledge stays locked in PMs’ heads.",
                  "blue",
                ],
                [
                  "Approvals and compliance drift",
                  "Without structured workflows, critical decisions miss proper signoff. Audit trails are incomplete or non-existent.",
                  "muted",
                ],
              ].map(([title, desc, icon]) => (
                <div key={title} className={styles.painItem}>
                  <div className={`${styles.painIco} ${iconTone(icon)}`}>
                    <SimpleIcon icon={icon} />
                  </div>
                  <div>
                    <div className={styles.painTitle}>{title}</div>
                    <div className={styles.painDesc}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div className={styles.solutionCard}>
                <div className={styles.solutionBrand}>
                  <div className={styles.solutionMark}>IN</div>
                  <div>
                    <div className={styles.solutionName}>Innovink</div>
                    <div className={styles.solutionTier}>The innovation OS</div>
                  </div>
                </div>
                <div className={styles.solutionHeadline}>One platform. Every stage. Full governance.</div>
                <div className={styles.solutionBody}>
                  Innovink is the operating system for enterprise innovation programs — a
                  single platform that handles program design, participant management, judging,
                  communications, approvals, and live operations end to end.
                </div>
                <div className={styles.solutionPoints}>
                  {[
                    "AI drafts program assets from your brief in minutes, not weeks",
                    "Structured approval workflows keep every decision accountable",
                    "Real-time operations dashboard from launch through final results",
                    "Sponsor-safe reporting and full audit trail built in from day one",
                  ].map((item) => (
                    <div key={item} className={styles.solutionPoint}>
                      <div className={styles.solutionCheck}>✓</div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.sectHdrCenter}>
            <div className={`${styles.sectEyebrow} ${styles.centerEyebrow}`}>How It Works</div>
            <h2 className={styles.sectTitle}>From brief to results in five steps</h2>
            <p className={`${styles.sectSub} ${styles.sectSubCenter}`}>
              Innovink replaces the fragmented toolchain with a single, governed workflow. AI
              handles the operational complexity. Your team stays in control at every stage.
            </p>
          </div>
          <div className={styles.hiwSteps}>
            {[
              {
                title: "Describe your program",
                desc: "Tell Innova what you’re running — type, goals, audience, timeline, rules. Natural language or guided prompts.",
                accent: false,
              },
              {
                title: "AI drafts the launch kit",
                desc: "Innova generates your program brief, landing page, application form, judging rubric, and communications in one pass.",
                accent: true,
              },
              {
                title: "Your team approves",
                desc: "Legal, comms, and leadership review each asset in structured approval queues. Nothing goes live without sign-off.",
                accent: false,
              },
              {
                title: "Innovink executes",
                desc: "Landing pages go live, invitations go out, applications open. Innovink handles the infrastructure so you don’t have to.",
                accent: false,
              },
              {
                title: "AI assists live operations",
                desc: "Innova surfaces anomalies, manages judging logistics, tracks milestones, and prepares sponsor-ready reporting in real time.",
                accent: false,
              },
            ].map((item) => (
              <div key={item.title} className={styles.hiwStep}>
                <div className={`${styles.hiwNum} ${item.accent ? styles.hiwNumAccent : ""}`}>
                  <SimpleIcon icon={item.accent ? "gold" : "muted"} />
                </div>
                <div className={styles.hiwTitle}>{item.title}</div>
                <div className={styles.hiwDesc}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectEyebrow}>Platform</div>
          <h2 className={styles.sectTitle}>Everything an innovation program needs</h2>
          <p className={styles.sectSub}>
            Six integrated modules designed for the full program lifecycle — from first draft to final report.
          </p>
          <div className={styles.capGrid}>
            {capabilities.map((item) => (
              <div key={item.title} className={styles.capCard}>
                <div className={`${styles.capIco} ${iconTone(item.icon)}`}>
                  <SimpleIcon icon={item.icon} />
                </div>
                <div className={styles.capTitle}>{item.title}</div>
                <div className={styles.capDesc}>{item.desc}</div>
                <div className={styles.capFeatures}>
                  {item.features.map((feature) => (
                    <div key={feature} className={styles.capFeat}>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.enterpriseGrid}>
            <div>
              <div className={styles.sectEyebrow}>Enterprise Trust</div>
              <div className={styles.enterpriseHeadline}>
                Built for enterprise governance, not venture-backed speed
              </div>
              <div className={styles.enterpriseSub}>
                Enterprise innovation programs carry real accountability — to sponsors, to
                participants, to legal, and to leadership. Innovink is designed from the ground
                up with the controls, auditability, and determinism that enterprise IT and
                compliance teams require.
              </div>
              <div className={styles.trustBadges}>
                {["SOC 2 Type II", "ISO 27001", "GDPR Compliant", "256-bit TLS", "SSO / SAML 2.0"].map((badge) => (
                  <div key={badge} className={styles.trustBadge}>
                    {badge}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className={styles.controlList}>
                {trustControls.map((item) => (
                  <div key={item.title} className={styles.controlItem}>
                    <div className={`${styles.controlIco} ${iconTone(item.icon)}`}>
                      <SimpleIcon icon={item.icon} />
                    </div>
                    <div className={styles.controlTitle}>{item.title}</div>
                    <div className={styles.controlDesc}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectEyebrow}>Use Cases</div>
          <h2 className={styles.sectTitle}>For every kind of enterprise innovation program</h2>
          <p className={styles.sectSub}>
            Whether you run one program a year or a global portfolio of dozens, Innovink adapts
            to your program type, your governance model, and your scale.
          </p>
          <div className={styles.usecaseGrid}>
            {useCases.map((item) => (
              <div key={item.title} className={styles.usecaseCard}>
                <div className={`${styles.usecaseIco} ${iconTone(item.icon)}`}>
                  <SimpleIcon icon={item.icon} />
                </div>
                <div className={styles.usecaseTitle}>{item.title}</div>
                <div className={styles.usecaseDesc}>{item.desc}</div>
                <div className={styles.usecaseTags}>
                  {item.tags.map((tag) => (
                    <span key={tag} className={styles.usecaseTag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`} id="product">
        <div className={styles.container}>
          <div className={styles.sectHdrCenter}>
            <div className={`${styles.sectEyebrow} ${styles.centerEyebrow}`}>Product</div>
            <h2 className={styles.sectTitle}>The PM command surface</h2>
            <p className={`${styles.sectSub} ${styles.sectSubCenter}`}>
              Innovink gives program managers a single workspace to design, run, and govern the
              entire program lifecycle — with Innova AI embedded at every stage.
            </p>
          </div>
          <div className={styles.bigPreview}>
            <div className={styles.bigPreviewTitlebar}>
              <div className={styles.previewDot} style={{ background: "#3A3A3A" }} />
              <div className={styles.previewDot} style={{ background: "#3A3A3A", marginLeft: 2 }} />
              <div className={styles.previewDot} style={{ background: "#3A3A3A", marginLeft: 2 }} />
              <div className={styles.previewUrl} style={{ maxWidth: 380 }}>
                app.innovink.com › programs › global-innovation-sprint-2026 › workspace
              </div>
            </div>
            <div className={styles.bigPreviewBody}>
              <div className={styles.bigPrevNav}>
                <div className={styles.bigPrevNavTop}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 5, background: "var(--gold-sub)", border: "1px solid var(--gold-bdr)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--gold-bright)" }}>
                      IN
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t-primary)" }}>Innovink</div>
                    <span className={`${styles.previewBadgeSm} ${styles.previewBadgeAmber}`} style={{ marginLeft: "auto", background: "var(--gold-sub)", color: "var(--gold-bright)", borderColor: "var(--gold-bdr)" }}>
                      Enterprise
                    </span>
                  </div>
                </div>
                <div className={styles.bigPrevProgInfo}>
                  <div className={styles.bigPrevProgName}>Global Innovation Sprint 2026</div>
                  <div className={styles.bigPrevProgMeta}>Employee Hackathon — Draft Assets</div>
                  <div className={styles.bigPrevProgBar}>
                    <div className={styles.bigPrevProgFill} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: "9.5px", color: "var(--t-muted)" }}>Stage 4 of 7</span>
                    <span style={{ fontSize: "9.5px", color: "var(--gold)" }}>43%</span>
                  </div>
                </div>
                <div style={{ height: 1, background: "var(--b-subtle)", margin: "6px 0" }} />
                <div className={`${styles.bigPrevNavItem} ${styles.bigPrevNavItemActive}`}>AI Workspace</div>
                <div className={styles.bigPrevNavItem}>Program Brief</div>
                <div className={styles.bigPrevNavItem}>Execution Plan</div>
                <div style={{ height: 1, background: "var(--b-subtle)", margin: "6px 0" }} />
                <div className={styles.bigPrevNavFooter}>
                  <div className={styles.bigPrevStat}>
                    <span>Approvals</span>
                    <span className={styles.bigPrevStatWarn}>17 pending</span>
                  </div>
                  <div className={styles.bigPrevStat}>
                    <span>Assets</span>
                    <span>4 / 11 ready</span>
                  </div>
                  <div className={styles.bigPrevStat}>
                    <span>Launch in</span>
                    <span>24 days</span>
                  </div>
                </div>
              </div>
              <div className={styles.bigPrevMain}>
                <div className={styles.bigPrevTabs}>
                  <div className={`${styles.bigPrevTab} ${styles.bigPrevTabActive}`}>Innova Chat</div>
                  <div className={`${styles.bigPrevTab} ${styles.bigPrevTabDone}`}>Brief</div>
                  <div className={`${styles.bigPrevTab} ${styles.bigPrevTabDone}`}>Plan</div>
                  <div className={`${styles.bigPrevTab} ${styles.bigPrevTabWarn}`}>Assets 4/11</div>
                  <div className={`${styles.bigPrevTab} ${styles.bigPrevTabWarn}`}>Approvals 17</div>
                  <div className={styles.bigPrevTab} style={{ color: "var(--t-muted)" }}>Execution</div>
                  <div className={styles.bigPrevTab} style={{ color: "var(--t-muted)", opacity: 0.5 }}>Live Ops</div>
                </div>
                <div className={styles.bigPrevChat}>
                  <div className={styles.bigPrevMsgAi}>
                    <div className={styles.bigPrevAiAv}>IN</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div className={styles.bigPrevBubbleAi}>
                        <strong style={{ color: "var(--t-primary)" }}>
                          Program Health — Draft Assets Stage.
                        </strong>{" "}
                        Two assets are currently blocked and require your input before the
                        judging package is complete.
                      </div>
                      <div className={styles.bigPrevInlineCard}>
                        <div style={{ width: 28, height: 28, borderRadius: "var(--r-md)", background: "var(--amber-sub)", border: "1px solid var(--amber-bdr)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ color: "var(--amber-bright)" }}>!</span>
                        </div>
                        <div>
                          <div className={styles.bigPrevInlineTitle}>2 assets need your input</div>
                          <div className={styles.bigPrevInlineMeta}>Judge Brief — Scoring Rubric</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.bigPrevMsgPm}>
                    <div className={styles.bigPrevBubblePm}>Walk me through the judge brief first.</div>
                  </div>
                  <div className={styles.bigPrevMsgAi}>
                    <div className={styles.bigPrevAiAv}>IN</div>
                    <div className={styles.bigPrevBubbleAi}>
                      The scoring weights are unset. Based on the program brief and your industry vertical, I recommend:{" "}
                      <span style={{ color: "var(--gold-bright)", fontWeight: 600 }}>
                        Impact 40% · Feasibility 30% · Originality 30%
                      </span>
                      . Want me to apply these and complete the judging package?
                    </div>
                  </div>
                  <div className={styles.bigPrevMsgPm}>
                    <div className={styles.bigPrevBubblePm}>Yes — apply those weights. Confirm when it’s done.</div>
                  </div>
                  <div className={styles.bigPrevMsgAi}>
                    <div className={styles.bigPrevAiAv}>IN</div>
                    <div className={styles.bigPrevBubbleAi} style={{ background: "var(--green-sub)", borderColor: "var(--green-bdr)" }}>
                      <span style={{ color: "var(--green-bright)", fontWeight: 600 }}>✓ Judging package is complete.</span>{" "}
                      Scoring rubric updated, judge brief finalised, and conflict-of-interest policy applied. Routed to Legal & Compliance for approval.
                    </div>
                  </div>
                </div>
                <div className={styles.bigPrevChatInput}>
                  Ask Innova anything about your program…
                  <div className={styles.bigPrevSend}>→</div>
                </div>
              </div>
              <div className={styles.bigPrevRight}>
                <div className={styles.bigPrevRightHdr}>PM Focus — Asset Draft</div>
                <div className={styles.bigPrevRightBody}>
                  <div>
                    <div className={styles.bigPrevSectionLabel}>Needs Your Input</div>
                    <div className={styles.bigPrevAlert}>
                      <div className={styles.bigPrevAlertText}>
                        <strong style={{ color: "var(--t-primary)" }}>2 blocked assets</strong> are preventing the judging package from being submitted for approval.
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className={styles.bigPrevSectionLabel}>Draft Assets</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {[
                        ["Judge Brief", "Blocked", "var(--amber-bright)"],
                        ["Scoring Rubric", "Blocked", "var(--amber-bright)"],
                        ["Registration Form", "Approved", "var(--green-bright)"],
                        ["Welcome Email", "Approved", "var(--green-bright)"],
                      ].map(([label, badge, color]) => (
                        <div key={label} className={styles.bigPrevAssetItem} style={{ borderColor: badge === "Blocked" ? "var(--amber-bdr)" : "var(--b-subtle)" }}>
                          <div className={styles.bigPrevAssetDot} style={{ background: color }} />
                          <div className={styles.bigPrevAssetName}>{label}</div>
                          <span className={styles.bigPrevAssetBadge} style={{ background: badge === "Blocked" ? "var(--amber-sub)" : "var(--green-sub)", color, border: `1px solid ${badge === "Blocked" ? "var(--amber-bdr)" : "var(--green-bdr)"}` }}>
                            {badge}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className={styles.bigPrevSectionLabel}>Launch Readiness</div>
                    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--b-subtle)", borderRadius: "var(--r-md)", padding: "8px 10px" }}>
                      {[
                        ["Registration form live", "ok"],
                        ["Comms scheduled", "ok"],
                        ["Judging package", "warn"],
                        ["Finalist workflow", "miss"],
                      ].map(([label, state]) => (
                        <div key={label} className={styles.previewRightCheck} style={{ padding: "4px 0" }}>
                          <div
                            className={`${styles.previewCheckIco} ${
                              state === "ok"
                                ? styles.previewCheckOk
                                : state === "warn"
                                  ? styles.previewCheckWarn
                                  : styles.previewCheckMiss
                            }`}
                          >
                            {state === "ok" ? "✓" : state === "warn" ? "!" : "–"}
                          </div>
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection} id="get-started">
        <div className={styles.ctaInner}>
          <div className={`${styles.sectEyebrow} ${styles.centerEyebrow}`}>Get Started</div>
          <h2 className={styles.ctaHeadline}>
            Ready to run your next
            <br />
            innovation program?
          </h2>
          <p className={styles.ctaSub}>
            From first brief to final results — Innovink gives your team the platform, the AI,
            and the governance to run world-class programs at enterprise scale.
          </p>
          <div className={styles.ctaActions}>
            <a href="#get-started" className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: "14px 32px", fontSize: 15, fontWeight: 600 }}>
              Request a demo →
            </a>
            <a href="#product" className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: "14px 28px", fontSize: 14 }}>
              Talk to our team
            </a>
            <Link href="/login" className={`${styles.btn} ${styles.btnGhost}`} style={{ padding: "14px 24px", fontSize: 14, color: "var(--t-tertiary)" }}>
              Sign in →
            </Link>
          </div>
          <div className={styles.ctaNote}>
            No commitment required · Enterprise onboarding included · SOC 2 Type II certified
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div className={styles.mark}>IN</div>
                <div className={styles.footerBrandName}>Innovink</div>
              </div>
              <div className={styles.footerBrandDesc}>
                The end-to-end platform for enterprise innovation programs. Designed for program
                managers, transformation offices, and corporate venture teams.
              </div>
              <div className={styles.trustBadges} style={{ marginTop: 16 }}>
                {["SOC 2", "ISO 27001", "GDPR"].map((badge) => (
                  <div key={badge} className={styles.trustBadge}>
                    {badge}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className={styles.footerColTitle}>Platform</div>
              {footerPlatform.map((item) => (
                <div key={item} className={styles.footerLink}>
                  {item}
                </div>
              ))}
            </div>
            <div>
              <div className={styles.footerColTitle}>Solutions</div>
              {footerSolutions.map((item) => (
                <div key={item} className={styles.footerLink}>
                  {item}
                </div>
              ))}
            </div>
            <div>
              <div className={styles.footerColTitle}>Company</div>
              {footerCompany.map((item) => (
                <div key={item} className={styles.footerLink}>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.footerBottom}>
            <div className={styles.footerCopy}>© 2026 Innovink — a Solvintell product. All rights reserved.</div>
            <div className={styles.footerLegal}>
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
              <a href="#cookies">Cookie Settings</a>
              <a href="#security">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
