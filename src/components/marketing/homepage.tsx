"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./homepage.module.css";

/* ══════════════════════════════════════════════════════════════════════
   INTERACTIVE COMPONENTS
══════════════════════════════════════════════════════════════════════ */

/** Custom cursor \u2014 small gold dot + lagging ring, hides native cursor */
function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = -200, my = -200;
    let rx = -200, ry = -200;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px,${my}px)`;
    };

    const loop = () => {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.transform = `translate(${rx}px,${ry}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const expand   = () => ring.classList.add(styles.ringExpand);
    const contract = () => ring.classList.remove(styles.ringExpand);

    // Only hide the native cursor on pointer-fine (mouse) devices
    const isMouse = window.matchMedia("(pointer: fine)").matches;
    if (isMouse) document.documentElement.style.cursor = "none";

    document.addEventListener("mousemove", onMove);
    document.querySelectorAll("a,button,[data-tilt]").forEach((el) => {
      el.addEventListener("mouseenter", expand);
      el.addEventListener("mouseleave", contract);
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
      document.documentElement.style.cursor = "";
    };
  }, []);

  return (
    <>
      <div ref={dotRef}  className={styles.cursorDot}  aria-hidden="true" />
      <div ref={ringRef} className={styles.cursorRing} aria-hidden="true" />
    </>
  );
}

/** Ambient glow \u2014 large radial gradient that lazily follows the mouse */
function AmbientGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };

    const loop = () => {
      cx += (tx - cx) * 0.05;
      cy += (ty - cy) * 0.05;
      el.style.transform = `translate(${cx - 320}px,${cy - 320}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    document.addEventListener("mousemove", onMove);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("mousemove", onMove); };
  }, []);

  return <div ref={ref} className={styles.ambientGlow} aria-hidden="true" />;
}


/** 3-D perspective tilt card */
function TiltCard({ children, className, style, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width  - 0.5) * 2;
    const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
    e.currentTarget.style.transform =
      `perspective(900px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg) scale3d(1.025,1.025,1.025)`;
  };
  const onLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "";
  };
  return (
    <div className={className} style={style} onMouseMove={onMove} onMouseLeave={onLeave} data-tilt="" {...rest}>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════════════════════════════════════ */

function useRevealOnScroll() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add(styles.revealed); io.unobserve(e.target); }
      }),
      { threshold: 0.07, rootMargin: "0px 0px -48px 0px" }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ══════════════════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════════════════ */

const capabilities = [
  { title: "AI Program Creation", desc: "Describe your program and Innova drafts the complete launch kit \u2014 brief, timeline, rules, and assets \u2014 in a single guided session.", features: ["Natural language brief-to-program", "Customisable program templates", "AI-assisted risk and gap detection"], color: "gold", size: "lg" },
  { title: "Landing Pages & Applications", desc: "Branded participant portals with custom application forms, eligibility gates, and team management \u2014 deployed in minutes.", features: ["White-label public landing pages", "Drag-and-drop form builder", "Multi-stage application flows"], color: "blue", size: "sm" },
  { title: "Judging & Evaluation", desc: "Structured judging workflows with automated assignment, scoring rubrics, conflict detection, and result aggregation.", features: ["Weighted scoring rubrics", "Conflict-of-interest management", "Blind and panel judging modes"], color: "green", size: "sm" },
  { title: "Communications & Approvals", desc: "Multi-audience email campaigns, auto-triggered notifications, and structured approval queues that enforce your review governance.", features: ["Audience-segmented messaging", "Scheduled and triggered comms", "Multi-level approval workflows"], color: "amber", size: "lg" },
  { title: "Reporting & Analytics", desc: "Real-time dashboards for program managers and sponsor-safe export packages for stakeholders and leadership sign-off.", features: ["Sponsor-safe report packages", "Participation and outcome metrics", "Exportable board-ready summaries"], color: "steel", size: "lg" },
  { title: "Live Operations & Governance", desc: "Operations dashboard for the full program run \u2014 milestone tracking, participant support, escalation management, and final ceremonies.", features: ["Real-time operations monitoring", "Escalation and incident handling", "Post-program audit closure"], color: "muted", size: "sm" },
];

const hiwSteps = [
  { num: "01", title: "Describe your program", desc: "Tell Innova what you're running \u2014 type, goals, audience, timeline, rules. Natural language or guided prompts.", accent: false, badge: null },
  { num: "02", title: "AI drafts the launch kit", desc: "Innova generates your program brief, landing page, application form, judging rubric, and communications in one pass \u2014 in minutes, not weeks.", accent: true,  badge: "Innova \u00B7 AI Agent" },
  { num: "03", title: "Your team approves",      desc: "Legal, comms, and leadership review each asset in structured approval queues. Nothing goes live without sign-off.", accent: false, badge: null },
  { num: "04", title: "Innovink executes",       desc: "Landing pages go live, invitations go out, applications open. Innovink handles the infrastructure so you don't have to.", accent: false, badge: null },
  { num: "05", title: "AI assists live ops",     desc: "Innova surfaces anomalies, manages judging logistics, tracks milestones, and prepares sponsor-ready reporting in real time.", accent: false, badge: null },
];

const trustControls = [
  { title: "Approval workflows",    desc: "Every asset, communication, and program decision passes through configurable multi-level approval queues before execution.", color: "gold"  },
  { title: "Role-based access",     desc: "Granular RBAC across programs, modules, and actions \u2014 from org-wide admins to read-only observers.", color: "blue"  },
  { title: "Full audit trail",      desc: "Every action \u2014 who, what, when \u2014 is logged immutably and exportable for compliance reviews and post-mortems.", color: "green" },
  { title: "Deterministic AI",      desc: "Innova proposes; humans approve. No AI action executes without an authorised human confirming the output. Always.", color: "amber" },
  { title: "SSO & identity",        desc: "Azure AD, Okta, and Google Workspace SSO. SCIM provisioning. Domain-locked tenants with configurable session policies.", color: "steel" },
  { title: "Data residency",        desc: "EU, US, and APAC data residency options. Dedicated tenants for regulated industries and public-sector customers.", color: "muted" },
];

const useCases = [
  { title: "Employee Hackathons",          desc: "Global or regional innovation sprints with team formation, submissions, and live judging at scale.", tags: ["Internal", "Large-scale", "Multi-site"],         color: "gold"  },
  { title: "Corporate Accelerators",       desc: "Structured cohort programs with applications, mentoring, milestones, and pitch days.", tags: ["Cohort-based", "Mentoring", "Milestones"],       color: "blue"  },
  { title: "Open Innovation Challenges",   desc: "Public calls for external innovators with complex evaluation and IP considerations.", tags: ["External", "Open call", "IP governance"],           color: "green" },
  { title: "Grant Programs",               desc: "Multi-stage applications with eligibility screening, review panels, and disbursement tracking.", tags: ["Multi-stage", "Committee", "Compliance"],       color: "amber" },
  { title: "University & Student Programs",desc: "Cross-institution student competitions with academic governance and prize workflows.", tags: ["Academic", "Cross-institution", "Prizes"],          color: "steel" },
  { title: "Internal Venture Programs",    desc: "Intrapreneurship initiatives with investment committee workflows, stage-gates, and executive reporting.", tags: ["Stage-gate", "Portfolio", "Executive reporting"], color: "muted" },
];

const footerPlatform  = ["AI Program Creation","Landing Pages","Judging & Evaluation","Communications","Reporting & Analytics","Enterprise Controls"];
const footerSolutions = ["Hackathons","Accelerators","Open Challenges","Grant Programs","Student Competitions","Venture Programs"];
const footerCompany   = ["About Innovink","Customers","Security & Trust","Blog","Careers","Contact Sales"];

/* ══════════════════════════════════════════════════════════════════════
   ICONS
══════════════════════════════════════════════════════════════════════ */

const STROKE: Record<string, string> = { gold:"#CCAA4A", blue:"#4D87BC", green:"#3E9A70", amber:"#DBA84A", steel:"#6080A0", muted:"#6080A0" };

function iconClass(c: string) {
  const m: Record<string,string> = { gold:styles.icoGold, blue:styles.icoBlue, green:styles.icoGreen, amber:styles.icoAmber, steel:styles.icoSteel };
  return m[c] ?? styles.icoMuted;
}

function sp(c: string, sz = 18) {
  return { width:sz, height:sz, viewBox:"0 0 16 16", fill:"none", stroke:c, strokeWidth:1.4, strokeLinecap:"round" as const, strokeLinejoin:"round" as const, "aria-hidden":true as const };
}

function CapIcon({ n, c }: { n: number; c: string }) {
  const s = sp(c);
  switch (n) {
    case 0: return <svg {...s}><path d="M14 2H2a1 1 0 00-1 1v7a1 1 0 001 1h3l3 2.5L11 11h3a1 1 0 001-1V3a1 1 0 00-1-1z"/><path d="M11.5 4.5l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z"/></svg>;
    case 1: return <svg {...s}><rect x="1" y="2" width="14" height="10" rx="1"/><path d="M5 15h6M8 12v3"/></svg>;
    case 2: return <svg {...s}><path d="M8 2v11M4 13h8M2 7l3 4M5 7H2M14 7l-3 4M11 7h3"/></svg>;
    case 3: return <svg {...s}><rect x="1.5" y="3.5" width="13" height="9" rx="1"/><path d="M1.5 6l6.5 4 6.5-4"/></svg>;
    case 4: return <svg {...s}><rect x="1.5" y="1.5" width="13" height="13" rx="1"/><path d="M5 11V7M8 11V5M11 11V3.5"/></svg>;
    default:return <svg {...s}><path d="M8 1L2 4v4c0 4 6 7 6 7s6-3 6-7V4L8 1z"/><path d="M5.5 8l1.5 1.5L11 6"/></svg>;
  }
}

function TrustIcon({ n, c }: { n: number; c: string }) {
  const s = sp(c, 16);
  switch (n) {
    case 0: return <svg {...s}><rect x="2" y="2" width="12" height="12" rx="1"/><path d="M5 8l2 2 4-4"/></svg>;
    case 1: return <svg {...s}><circle cx="8" cy="6" r="3"/><path d="M2 15c0-3.5 2.7-6 6-6s6 2.5 6 6"/></svg>;
    case 2: return <svg {...s}><path d="M9 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5L9 1.5z"/><path d="M9 1.5V5.5H13M5 9h6M5 12h4"/></svg>;
    case 3: return <svg {...s}><rect x="3" y="7.5" width="10" height="7" rx="1"/><path d="M5 7.5V5.5a3 3 0 016 0v2"/></svg>;
    case 4: return <svg {...s}><circle cx="5.5" cy="8" r="3.5"/><path d="M9 8h5.5M13.5 6V8M11.5 6V8"/></svg>;
    default:return <svg {...s}><circle cx="8" cy="8" r="6"/><path d="M2.5 8h11M8 2.5c-2 2-3 3.5-3 5.5s1 3.5 3 5.5M8 2.5c2 2 3 3.5 3 5.5s-1 3.5-3 5.5"/></svg>;
  }
}

function UCIcon({ n, c }: { n: number; c: string }) {
  const s = sp(c);
  switch (n) {
    case 0: return <svg {...s}><path d="M9.5 2L3.5 9h4.5l-1.5 5L13 7H8.5z"/></svg>;
    case 1: return <svg {...s}><path d="M8 13V4M4 8l4-4 4 4"/><path d="M3 13h10"/></svg>;
    case 2: return <svg {...s}><circle cx="8" cy="8" r="6"/><path d="M2.5 8h11M8 2.5c-2.5 1.5-3.5 3-3.5 5.5s1 4 3.5 5.5M8 2.5c2.5 1.5 3.5 3 3.5 5.5s-1 4-3.5 5.5"/></svg>;
    case 3: return <svg {...s}><path d="M9 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5L9 1.5z"/><path d="M9 1.5V5.5H13M5 9h6M5 12h3"/></svg>;
    case 4: return <svg {...s}><path d="M2 8L8 5l6 3-6 3-6-3z"/><path d="M14 8v4"/><path d="M5 9.5v2.5c0 1.4 1.3 2.5 3 2.5s3-1.1 3-2.5V9.5"/></svg>;
    default:return <svg {...s}><rect x="2" y="5" width="12" height="9" rx="1"/><path d="M5.5 5V3.5A1.5 1.5 0 017 2h2a1.5 1.5 0 011.5 1.5V5"/><path d="M2 9.5h12"/></svg>;
  }
}


/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */

export function MarketingHomepage() {
  useRevealOnScroll();

  return (
    <main className={styles.page}>
      <CustomCursor />
      <AmbientGlow />

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <div className={styles.mark}>IN</div>
            <span className={styles.brandName}>Innovink</span>
          </div>
          <div className={styles.navLinks}>
            {[
              ["How It Works", "#how-we-work"],
              ["Governance",   "#governance"],
              ["Platform",     "#platform"],
              ["Use Cases",    "#use-cases"],
              ["See It Live",  "#product"],
            ].map(([label, href]) => (
              <a key={label} href={href} className={styles.navLink}>{label}</a>
            ))}
          </div>
          <div className={styles.navActions}>
            <Link href="/login" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}>Sign in</Link>
            <a href="#demo" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}>Request demo</a>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════
         HERO \u2014 typographic statement + mission control dashboard
      ══════════════════════════════════════════════════════════ */}
      <section className={styles.hero}>
        {/* atmosphere */}
        <div className={styles.heroScanLines}  aria-hidden="true" />
        <div className={styles.heroGlowA}      aria-hidden="true" />
        <div className={styles.heroGlowB}      aria-hidden="true" />
        <div className={styles.heroDotGrid}    aria-hidden="true" />
        <div className={styles.heroVignette}   aria-hidden="true" />
        <div className={styles.heroGrain}      aria-hidden="true" />
        <div className={styles.heroBeam}       aria-hidden="true" />

        <div className={styles.heroInner}>
          {/* ── Left: typographic statement ── */}
          <div className={styles.heroLeft}>
            <p className={styles.heroLabel}>
              <span className={styles.heroPulse} aria-hidden="true" />
              Agentic AI &nbsp;&middot;&nbsp; Enterprise Platform
            </p>

            {/* tracked-out heavy caps + weight contrast */}
            <h1 className={styles.heroHl} aria-label="Innovation programs, governed by AI.">
              <span className={styles.hlWrap}>
                <span className={styles.hlLine} style={{ animationDelay: "120ms" }}>INNOVATION</span>
              </span>
              <span className={styles.hlWrap}>
                <span className={styles.hlLine} style={{ animationDelay: "240ms" }}>PROGRAMS,</span>
              </span>
              <span className={styles.hlWrapGold}>
                <span className={styles.hlLineGold} style={{ animationDelay: "400ms" }}>governed by AI.</span>
              </span>
            </h1>

            <p className={styles.heroSub} style={{ animationDelay: "640ms" }}>
              Describe your program. Innova drafts every asset, routes every approval, and
              runs live operations end to end &mdash; so your team focuses on outcomes, not administration.
            </p>

            <div className={styles.heroActions} style={{ animationDelay: "780ms" }}>
              <a href="#demo"    className={`${styles.btn} ${styles.btnPrimary}   ${styles.btnHero}`}>Request a demo &rarr;</a>
              <a href="#product" className={`${styles.btn} ${styles.btnGhost}     ${styles.btnHero}`}>See the platform</a>
            </div>

          </div>

          {/* ── Right: live operations dashboard ── */}
          <div className={styles.heroDash}>
            <div className={styles.dashHdr}>
              <span className={styles.dashLive}><span className={styles.dashLiveDot} aria-hidden="true" />LIVE</span>
              <span className={styles.dashHdrName}>Innova &middot; AI Agent</span>
              <span className={styles.dashHdrTime}>14:32 CET</span>
            </div>
            <div className={styles.dashRule} />
            <div className={styles.dashLabel}>Activity Log</div>
            <div className={styles.dashFeed}>
              {[
                { time:"14:31", text:"Judge Brief finalised by Innova" },
                { time:"14:29", text:"Scoring weights applied \u2014 Impact 40%" },
                { time:"14:26", text:"Approval request routed to Legal" },
                { time:"14:22", text:"Team Apex submitted application" },
                { time:"14:18", text:"Welcome email dispatched \u00B7 312 teams" },
              ].map((item, i) => (
                <div key={i} className={styles.dashRow} style={{ animationDelay:`${1300+i*130}ms` } as React.CSSProperties}>
                  <span className={styles.dashTime}>{item.time}</span>
                  <span className={styles.dashMsg}>{item.text}</span>
                </div>
              ))}
            </div>
            <div className={styles.dashRule} />
            <div className={styles.dashLabel}>Innova Status</div>
            <div className={styles.dashStatus}>
              <span className={styles.dashStatusDot} aria-hidden="true" />
              Analyzing 47 new submissions
            </div>
            <div className={styles.dashRule} />
            <div className={styles.dashStats}>
              {([["312","Teams"],["156","Submits"],["17","Pending"],["24d","Deadline"]] as const).map(([v,l]) => (
                <div key={l} className={styles.dashStat}>
                  <div className={styles.dashStatVal}>{v}</div>
                  <div className={styles.dashStatLbl}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════
         01 \u2014 THE PROBLEM
      ══════════════════════════════════════════════════════════ */}
      <section className={styles.section} id="problem">
        <div className={styles.sectionNum} aria-hidden="true">01</div>
        <div className={styles.container}>
          <div className={styles.sectionLabel} aria-hidden="true">The Problem</div>

          <blockquote className={`${styles.problemQuote} ${styles.revealEl}`} data-reveal>
            Most enterprises run innovation programs on a patchwork of
            disconnected tools \u2014 briefs in Word, applications in Typeform,
            judging in spreadsheets, reporting in Excel.{" "}
            <strong>The result: fragmented operations, governance gaps, and exhausted program managers.</strong>
          </blockquote>

          <div className={styles.problemCards}>
            {[
              { n:"01", title:"No single source of truth",        desc:"Program data lives across a dozen tools. Reporting is manual. Governance is an afterthought." },
              { n:"02", title:"Months of setup, not weeks",        desc:"Every launch requires rebuilding from scratch. Institutional knowledge stays locked in PMs' heads." },
              { n:"03", title:"Approvals and compliance drift",    desc:"Without structured workflows, critical decisions miss signoff. Audit trails are incomplete or absent." },
            ].map((item,i) => (
              <TiltCard key={item.n} className={`${styles.problemCard} ${styles.revealEl}`} data-reveal style={{ "--reveal-delay":`${i*80}ms` } as React.CSSProperties}>
                <div className={styles.problemCardTitle}>{item.title}</div>
                <div className={styles.problemCardDesc}>{item.desc}</div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* Solution strip */}
      <div className={styles.solStrip}>
        <div className={styles.container}>
          <div className={`${styles.solInner} ${styles.revealEl}`} data-reveal>
            <div className={styles.solMark}>IN</div>
            <div>
              <div className={styles.solHeadline}>One platform. Every stage. Full governance.</div>
              <div className={styles.solSub}>Innovink is the operating system for enterprise innovation programs.</div>
            </div>
            <div className={styles.solPoints}>
              {["AI drafts, humans approve, platform executes","Structured approval workflows at every stage","Full audit trail built in from day one"].map((pt) => (
                <div key={pt} className={styles.solPoint}><span className={styles.solCheck}>&#10003;</span>{pt}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
         OUTCOMES STRIP
      ══════════════════════════════════════════════════════════ */}
      <div className={styles.outcomesStrip}>
        <div className={styles.container}>
          <div className={styles.outcomesGrid}>
            {[
              {
                headline: "Weeks, not months.",
                body: "From program brief to live operations \u2014 without rebuilding workflows from scratch every time.",
              },
              {
                headline: "Every decision governed.",
                body: "Approval checkpoints, role boundaries, and full audit trails built into every workflow by default.",
              },
              {
                headline: "AI handles the complexity.",
                body: "Innova drafts, routes, and monitors \u2014 so your team stays focused on strategy and outcomes.",
              },
            ].map((item) => (
              <div key={item.headline} className={`${styles.outcomeCard} ${styles.revealEl}`} data-reveal>
                <div className={styles.outcomeHeadline}>{item.headline}</div>
                <div className={styles.outcomeBody}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
         02 \u2014 HOW IT WORKS \u2014 vertical numbered list
      ══════════════════════════════════════════════════════════ */}
      <section className={`${styles.section} ${styles.sectionAlt}`} id="how-we-work">
        <div className={styles.sectionNum} aria-hidden="true">02</div>
        <div className={styles.container}>
          <div className={styles.sectionLabel} aria-hidden="true">How It Works</div>
          <div className={styles.hiwHeader}>
            <div>
              <div className={`${styles.eyebrow} ${styles.revealEl}`} data-reveal>How It Works</div>
              <h2 className={`${styles.hiwHeadline} ${styles.revealEl}`} data-reveal style={{ "--reveal-delay": "60ms" } as React.CSSProperties}>
                From brief to results<br />in five steps.
              </h2>
            </div>
            <p className={`${styles.hiwHeaderSub} ${styles.revealEl}`} data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
              Innovink replaces the fragmented toolchain with a single governed workflow.
              AI handles the complexity. Your team stays in control at every stage.
            </p>
          </div>

          <div className={styles.hiwList}>
            {hiwSteps.map((step, i) => (
              <div
                key={step.num}
                className={`${styles.hiwRow} ${step.accent ? styles.hiwRowGold : ""} ${styles.revealEl}`}
                data-reveal
                style={{ "--reveal-delay": `${i * 55}ms` } as React.CSSProperties}
              >
                <div className={styles.hiwNum}>{step.num}</div>
                <div className={styles.hiwBody}>
                  {step.badge && (
                    <div className={styles.hiwBadge}>
                      <span className={styles.hiwBadgeDot} />
                      {step.badge}
                    </div>
                  )}
                  <div className={styles.hiwRowTitle}>{step.title}</div>
                  <div className={styles.hiwRowDesc}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
         03 \u2014 GOVERNANCE (trust before features)
      ══════════════════════════════════════════════════════════ */}
      <section className={styles.section} id="governance">
        <div className={styles.sectionNum} aria-hidden="true">03</div>
        <div className={styles.container}>
          <div className={styles.sectionLabel} aria-hidden="true">Governance</div>

          <div className={styles.trustHdr}>
            <div>
              <div className={`${styles.eyebrow} ${styles.revealEl}`} data-reveal>Enterprise Trust</div>
              <h2 className={`${styles.trustHl} ${styles.revealEl}`} data-reveal style={{ "--reveal-delay":"60ms" } as React.CSSProperties}>
                Built for enterprise governance,<br />not venture-backed speed.
              </h2>
              <p className={`${styles.trustSub} ${styles.revealEl}`} data-reveal style={{ "--reveal-delay":"120ms" } as React.CSSProperties}>
                Enterprise programs carry real accountability. Innovink is designed with the controls, auditability,
                and determinism that IT and compliance teams require.
              </p>
            </div>
          </div>

          <div className={styles.trustGrid}>
            {trustControls.map((item, i) => (
              <TiltCard key={item.title} className={`${styles.trustCard} ${styles.revealEl}`} data-reveal style={{ "--reveal-delay":`${(i%3)*60}ms` } as React.CSSProperties}>
                <div className={`${styles.trustIco} ${iconClass(item.color)}`}><TrustIcon n={i} c={STROKE[item.color]} /></div>
                <div className={styles.trustTitle}>{item.title}</div>
                <div className={styles.trustDesc}>{item.desc}</div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
         04 \u2014 THE PLATFORM (bento with 3D tilt)
      ══════════════════════════════════════════════════════════ */}
      <section className={`${styles.section} ${styles.sectionAlt}`} id="platform">
        <div className={styles.sectionNum} aria-hidden="true">04</div>
        <div className={styles.container}>
          <div className={styles.sectionLabel} aria-hidden="true">The Platform</div>

          <div className={styles.secHdr}>
            <div>
              <div className={`${styles.eyebrow} ${styles.revealEl}`} data-reveal>Platform</div>
              <h2 className={`${styles.secTitle} ${styles.revealEl}`} data-reveal style={{ "--reveal-delay":"60ms" } as React.CSSProperties}>
                Everything an innovation<br />program needs.
              </h2>
            </div>
            <p className={`${styles.secSub} ${styles.revealEl}`} data-reveal style={{ "--reveal-delay":"120ms" } as React.CSSProperties}>
              Six integrated modules for the full lifecycle &mdash; from first draft to final report.
            </p>
          </div>

          <div className={styles.bento}>
            {capabilities.map((item, i) => (
              <TiltCard
                key={item.title}
                className={`${styles.bentoCard} ${item.size === "lg" ? styles.bentoLg : ""} ${styles.revealEl}`}
                data-reveal
                style={{ "--reveal-delay":`${i*50}ms` } as React.CSSProperties}
              >
                <div className={`${styles.bentoIco} ${iconClass(item.color)}`}><CapIcon n={i} c={STROKE[item.color]} /></div>
                <div className={styles.bentoTitle}>{item.title}</div>
                <div className={styles.bentoDesc}>{item.desc}</div>
                <div className={styles.bentoFeats}>
                  {item.features.map((f) => (
                    <div key={f} className={styles.bentoFeat}><span className={styles.bentoDot}/>{f}</div>
                  ))}
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
         05 \u2014 BUILT FOR
      ══════════════════════════════════════════════════════════ */}
      <section className={`${styles.section} ${styles.sectionAlt}`} id="use-cases">
        <div className={styles.sectionNum} aria-hidden="true">05</div>
        <div className={styles.container}>
          <div className={styles.sectionLabel} aria-hidden="true">Built For</div>

          <div className={styles.secHdr}>
            <div>
              <div className={`${styles.eyebrow} ${styles.revealEl}`} data-reveal>Use Cases</div>
              <h2 className={`${styles.secTitle} ${styles.revealEl}`} data-reveal style={{ "--reveal-delay":"60ms" } as React.CSSProperties}>
                For every kind of enterprise<br />innovation program.
              </h2>
            </div>
            <p className={`${styles.secSub} ${styles.revealEl}`} data-reveal style={{ "--reveal-delay":"120ms" } as React.CSSProperties}>
              Whether you run one program a year or a global portfolio of dozens, Innovink adapts to your program type, governance model, and scale.
            </p>
          </div>

          <div className={styles.ucGrid}>
            {useCases.map((item, i) => (
              <TiltCard key={item.title} className={`${styles.ucCard} ${styles.revealEl}`} data-reveal style={{ "--reveal-delay":`${(i%3)*70}ms` } as React.CSSProperties}>
                <div className={`${styles.ucIco} ${iconClass(item.color)}`}><UCIcon n={i} c={STROKE[item.color]} /></div>
                <div className={styles.ucTitle}>{item.title}</div>
                <div className={styles.ucDesc}>{item.desc}</div>
                <div className={styles.ucTags}>{item.tags.map((t) => <span key={t} className={styles.ucTag}>{t}</span>)}</div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
         06 \u2014 SEE IT LIVE
      ══════════════════════════════════════════════════════════ */}
      <section className={styles.section} id="product">
        <div className={styles.sectionNum} aria-hidden="true">06</div>
        <div className={styles.container}>
          <div className={styles.sectionLabel} aria-hidden="true">See It Live</div>

          <div className={styles.sectHdrCenter}>
            <div className={`${styles.eyebrow} ${styles.eyebrowCenter} ${styles.revealEl}`} data-reveal>Product</div>
            <h2 className={`${styles.secTitle} ${styles.secTitleCenter} ${styles.revealEl}`} data-reveal style={{ "--reveal-delay":"60ms" } as React.CSSProperties}>The PM command surface</h2>
            <p className={`${styles.secSub} ${styles.secSubCenter} ${styles.revealEl}`} data-reveal style={{ "--reveal-delay":"120ms" } as React.CSSProperties}>
              One workspace to design, run, and govern the entire program lifecycle &mdash; with Innova AI at every stage.
            </p>
          </div>

          <div className={`${styles.bigPreview} ${styles.revealEl}`} data-reveal style={{ "--reveal-delay":"160ms" } as React.CSSProperties}>
            <div className={styles.bpBar}>
              <div className={styles.bpDots}><span style={{background:"#3A3A3A"}}/><span style={{background:"#3A3A3A"}}/><span style={{background:"#3A3A3A"}}/></div>
              <div className={styles.bpUrl}>app.innovink.com &rsaquo; programs &rsaquo; global-innovation-sprint-2026 &rsaquo; workspace</div>
            </div>
            <div className={styles.bpBody}>
              <div className={styles.bpNav}>
                <div className={styles.bpNavTop}>
                  <div className={styles.bpNavBrand}>
                    <div className={styles.bpMark}>IN</div>
                    <span className={styles.bpMarkName}>Innovink</span>
                    <span className={styles.bpEntBadge}>Enterprise</span>
                  </div>
                  <div className={styles.bpProg}>
                    <div className={styles.bpProgName}>Global Innovation Sprint 2026</div>
                    <div className={styles.bpProgMeta}>Employee Hackathon \u00B7 Draft Assets</div>
                    <div className={styles.bpProgBar}><div className={styles.bpProgFill}/></div>
                    <div className={styles.bpProgStats}><span>Stage 4 of 7</span><span style={{color:"var(--gold)"}}>43%</span></div>
                  </div>
                </div>
                <div className={styles.bpDivider}/>
                <div className={`${styles.bpNavItem} ${styles.bpNavActive}`}>AI Workspace</div>
                <div className={styles.bpNavItem}>Program Brief</div>
                <div className={styles.bpNavItem}>Execution Plan</div>
                <div className={styles.bpDivider}/>
                <div className={styles.bpNavFooter}>
                  <div className={styles.bpStat}><span>Approvals</span><span style={{color:"var(--amber-bright)"}}>17 pending</span></div>
                  <div className={styles.bpStat}><span>Assets</span><span>4 / 11 ready</span></div>
                  <div className={styles.bpStat}><span>Launch in</span><span>24 days</span></div>
                </div>
              </div>
              <div className={styles.bpMain}>
                <div className={styles.bpTabs}>
                  <div className={`${styles.bpTab} ${styles.bpTabActive}`}>Innova Chat</div>
                  <div className={`${styles.bpTab} ${styles.bpTabDone}`}>Brief</div>
                  <div className={`${styles.bpTab} ${styles.bpTabDone}`}>Plan</div>
                  <div className={`${styles.bpTab} ${styles.bpTabWarn}`}>Assets 4/11</div>
                  <div className={`${styles.bpTab} ${styles.bpTabWarn}`}>Approvals 17</div>
                  <div className={styles.bpTab} style={{color:"var(--t-muted)"}}>Execution</div>
                  <div className={styles.bpTab} style={{color:"var(--t-muted)",opacity:0.45}}>Live Ops</div>
                </div>
                <div className={styles.bpChat}>
                  <div className={styles.bpMsgPm}><div className={styles.bpBubPm}>What&rsquo;s the current status on Global Innovation Sprint 2026?</div></div>
                  <div className={styles.bpMsgAi}>
                    <div className={styles.bpAv}>IN</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <div className={styles.bpBubAi}>
                        <strong style={{color:"var(--t-primary)"}}>Program is live and on track.</strong>{" "}
                        312 teams registered &mdash; 94% above target. 156 submissions reviewed. Judging is 91% complete with all 42 judges active.
                      </div>
                      <div className={styles.bpInline}>
                        <div className={styles.bpInlineIco} style={{background:"var(--green-sub)",border:"1px solid var(--green-bdr)",color:"var(--green-bright)"}}>&#10003;</div>
                        <div><div className={styles.bpInlineTitle}>Final results ready for approval</div><div className={styles.bpInlineMeta}>Estimated completion in 18 hours</div></div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.bpMsgPm}><div className={styles.bpBubPm}>Prepare a sponsor summary for the board.</div></div>
                  <div className={styles.bpMsgAi}>
                    <div className={styles.bpAv}>IN</div>
                    <div className={styles.bpBubAi} style={{background:"var(--green-sub)",borderColor:"var(--green-bdr)"}}>
                      <span style={{color:"var(--green-bright)",fontWeight:600}}>&#10003; Sponsor report ready.</span>{" "}
                      Executive summary, participation metrics, shortlist of top 12 teams, and ROI analysis compiled &mdash; routed to your approval queue.
                    </div>
                  </div>
                </div>
                <div className={styles.bpInput}>Ask Innova anything about your program…<div className={styles.bpSend}>\u2192</div></div>
              </div>
              <div className={styles.bpRight}>
                <div className={styles.bpRightHdr}>PM Focus &mdash; Live Operations</div>
                <div className={styles.bpRightBody}>
                  <div className={styles.bpLabel}>Program Health</div>
                  {[["Judge Brief","Approved","var(--green-bright)","var(--green-bdr)","var(--green-sub)"],["Scoring Rubric","Approved","var(--green-bright)","var(--green-bdr)","var(--green-sub)"],["Sponsor Report","In Review","var(--amber-bright)","var(--amber-bdr)","var(--amber-sub)"],["Finalist Comms","Scheduled","var(--blue-bright)","var(--blue-bdr)","var(--blue-sub)"]].map(([lbl,badge,dot,bdr,bg]) => (
                    <div key={lbl} className={styles.bpAsset} style={{borderColor:bdr}}>
                      <div className={styles.bpAssetDot} style={{background:dot}}/>
                      <div className={styles.bpAssetName}>{lbl}</div>
                      <span className={styles.bpAssetBadge} style={{background:bg,color:dot,border:`1px solid ${bdr}`}}>{badge}</span>
                    </div>
                  ))}
                  <div className={styles.bpLabel} style={{marginTop:10}}>Milestone Checklist</div>
                  <div className={styles.bpReadiness}>
                    {["Teams registered","Submissions closed","Judging complete","Results approved"].map((lbl) => (
                      <div key={lbl} className={styles.bpReadItem}>
                        <div className={`${styles.bpReadIco} ${styles.bpReadOk}`}>&#10003;</div>
                        {lbl}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
         CTA \u2014 SPLIT PANELS
      ══════════════════════════════════════════════════════════ */}
      <section className={styles.ctaSplit} id="demo">
        <div className={`${styles.ctaLeft} ${styles.revealEl}`} data-reveal>
          <div className={styles.ctaGlow} aria-hidden="true"/>
          <div className={styles.ctaLeftBody}>
            <div className={styles.eyebrow} style={{color:"var(--gold-bright)"}}>Get Started</div>
            <h2 className={styles.ctaLeftHl}>Ready to run your next innovation program?</h2>
            <p className={styles.ctaLeftSub}>From first brief to final results &mdash; Innovink gives your team the platform, the AI, and the governance to run world-class programs at enterprise scale.</p>
            <a href="mailto:hello@innovink.com" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnXl}`}>Request a demo &rarr;</a>
            <div className={styles.ctaNote}>No commitment required &middot; Enterprise onboarding included</div>
            <div className={styles.ctaPricing}>
              Enterprise pricing &nbsp;&middot;&nbsp; Volume licensing &nbsp;&middot;&nbsp; Custom deployments available
            </div>
          </div>
        </div>
        <div className={`${styles.ctaRight} ${styles.revealEl}`} data-reveal style={{ "--reveal-delay":"100ms" } as React.CSSProperties}>
          <div className={styles.ctaRightBody}>
            <div className={styles.eyebrow}>Sign In</div>
            <h3 className={styles.ctaRightHl}>Already have an account?</h3>
            <p className={styles.ctaRightSub}>Access your Innovink workspace directly. Your programs, approvals, and AI agent are waiting.</p>
            <Link href="/login" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnLg}`}>Sign in to Innovink &rarr;</Link>
            <div className={styles.ctaRightFeats}>
              {["Azure AD, Okta, Google Workspace SSO","Role-based access control","Persistent Innova AI workspace"].map((f) => (
                <div key={f} className={styles.ctaRightFeat}><span className={styles.ctaFeatCheck}>&#10003;</span>{f}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div>
              <div className={styles.footerBrand}><div className={styles.mark}>IN</div><span className={styles.footerBrandName}>Innovink</span></div>
              <div className={styles.footerBrandDesc}>The end-to-end platform for enterprise innovation programs. Designed for program managers, transformation offices, and corporate venture teams.</div>
            </div>
            <div><div className={styles.footerColTitle}>Platform</div>{footerPlatform.map((i) => <div key={i} className={styles.footerLink}>{i}</div>)}</div>
            <div><div className={styles.footerColTitle}>Solutions</div>{footerSolutions.map((i) => <div key={i} className={styles.footerLink}>{i}</div>)}</div>
            <div><div className={styles.footerColTitle}>Company</div>{footerCompany.map((i) => <div key={i} className={styles.footerLink}>{i}</div>)}</div>
          </div>
          <div className={styles.footerBottom}>
            <div className={styles.footerCopy}>&copy; 2026 Innovink &mdash; a Solvintell product. All rights reserved.</div>
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
