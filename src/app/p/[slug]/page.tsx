import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedLandingPageBySlug } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./public-landing.module.css";

type PublicLandingPageProps = {
  params: Promise<{ slug: string }>;
};

type GenericSection = {
  id: string;
  sectionKey: string;
  content: unknown;
};

type FeatureCard = {
  title: string;
  body: string;
  meta?: string;
  accent: "gold" | "blue" | "steel";
};

type TimelineEntry = {
  title: string;
  body: string;
  meta?: string;
};

type FaqEntry = {
  question: string;
  answer: string;
};

export default async function PublicLandingPage({ params }: PublicLandingPageProps) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const publishedPage = await getPublishedLandingPageBySlug(supabase, slug);

  if (!publishedPage) {
    notFound();
  }

  const sections = (publishedPage.sections ?? []).map((section) => ({
    id: section.id,
    sectionKey: section.section_key,
    content: section.content,
  })) satisfies GenericSection[];

  const programName = publishedPage.landingPage.title ?? publishedPage.program.name;
  const heroSection = findSection(sections, "hero");
  const overviewSection = findSection(sections, "overview");
  const timelineSection = findSection(sections, "timeline");
  const eligibilitySection = findSection(sections, "eligibility");
  const judgingSection = findSection(sections, "judging");
  const faqSection = findSection(sections, "faq");
  const ctaSection = findSection(sections, "cta");

  const hero = buildHero(heroSection?.content, publishedPage.program.short_description);
  const overview = buildFeatureCards(overviewSection?.content, programName);
  const timelineEntries = buildTimelineEntries(timelineSection?.content);
  const faqEntries = buildFaqEntries(faqSection?.content);
  const eligibilityPoints = buildBulletList(eligibilitySection?.content, [
    "Complete registration with the published participant package before the close date.",
    "Keep your team scope aligned with one clear innovation objective.",
    "Plan for final deliverables that can move cleanly into judging.",
  ]);
  const judgingPoints = buildBulletList(judgingSection?.content, [
    "Final submissions are reviewed against the approved scoring rubric.",
    "Human judges remain the final decision makers even when AI assistance is enabled.",
    "Operational decisions and published results remain governed inside Innovink.",
  ]);
  const cta = buildCta(ctaSection?.content, hero.primaryCtaLabel);
  const registerHref = "/login";

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>INNOVINK</div>
        <div className={styles.navDivider} />
        <div className={styles.navProgram}>{programName}</div>
        <div className={styles.navSpacer} />
        <a href="#overview" className={styles.navLink}>
          About
        </a>
        <a href="#faq" className={styles.navLink}>
          FAQ
        </a>
        <a href="#contact" className={styles.navLink}>
          Contact
        </a>
        <Link href={registerHref} className={styles.registerButtonCompact}>
          {hero.primaryCtaLabel} →
        </Link>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroBadge}>{hero.badge}</div>
        <h1 className={styles.heroTitle}>{hero.title}</h1>
        <p className={styles.heroSubtitle}>{hero.subtitle}</p>
        <div className={styles.heroActions}>
          <Link href={registerHref} className={styles.registerButton}>
            {hero.primaryCtaLabel} →
          </Link>
          <a href="#overview" className={styles.secondaryButton}>
            {hero.secondaryCtaLabel} ↓
          </a>
        </div>
        <div className={styles.heroMetrics}>
          {hero.metrics.map((metric) => (
            <div key={metric.label} className={styles.metric}>
              <div className={styles.metricValue}>{metric.value}</div>
              <div className={styles.metricLabel}>{metric.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.countdownBar}>
        <span className={styles.countdownText}>
          Registration closes {hero.registrationLabel}
        </span>
        <Link href={registerHref} className={styles.countdownButton}>
          Register Now
        </Link>
      </div>

      <section id="overview" className={styles.sectionWrap}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{overview.heading}</h2>
          <p className={styles.sectionSubtitle}>{overview.subheading}</p>
          <div className={styles.cardGrid}>
            {overview.cards.map((card) => (
              <article key={card.title} className={styles.featureCard}>
                <div className={`${styles.featureIcon} ${styles[`featureIcon${capitalize(card.accent)}`]}`}>
                  {card.accent === "gold" ? "◎" : card.accent === "blue" ? "◌" : "◇"}
                </div>
                <div className={styles.featureTitle}>{card.title}</div>
                <div className={styles.featureBody}>{card.body}</div>
                {card.meta ? <div className={styles.featureMeta}>{card.meta}</div> : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.timelineSection}>
        <div className={styles.timelineInner}>
          <h2 className={styles.sectionTitle}>Program Timeline</h2>
          <p className={styles.sectionSubtitle}>Key moments from registration through judging.</p>
          <div className={styles.timelineRail}>
            {timelineEntries.map((entry, index) => (
              <div key={`${entry.title}-${index}`} className={styles.timelineEntry}>
                <div className={styles.timelineDot} />
                <div>
                  <div className={styles.timelineTitle}>
                    {entry.meta ? `${entry.meta} · ` : ""}
                    {entry.title}
                  </div>
                  <div className={styles.timelineBody}>{entry.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionWrapAlt}>
        <div className={styles.sectionColumns}>
          <article className={styles.infoCard}>
            <h3 className={styles.infoCardTitle}>
              {readStringFromUnknown(eligibilitySection?.content, ["title", "headline"]) ??
                "Eligibility"}
            </h3>
            <ul className={styles.infoList}>
              {eligibilityPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
          <article className={styles.infoCard}>
            <h3 className={styles.infoCardTitle}>
              {readStringFromUnknown(judgingSection?.content, ["title", "headline"]) ??
                "Judging"}
            </h3>
            <ul className={styles.infoList}>
              {judgingPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section id="faq" className={styles.sectionWrap}>
        <div className={styles.sectionNarrow}>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <div className={styles.faqList}>
            {faqEntries.map((entry) => (
              <details key={entry.question} className={styles.faqItem} open>
                <summary className={styles.faqQuestion}>{entry.question}</summary>
                <div className={styles.faqAnswer}>{entry.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className={styles.ctaSection}>
        <div className={styles.ctaTitle}>{cta.title}</div>
        <div className={styles.ctaBody}>{cta.body}</div>
        <Link href={registerHref} className={styles.registerButtonLarge}>
          {cta.label} →
        </Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerText}>
          <span className={styles.footerBrand}>{programName}</span> · Powered by{" "}
          <Link href="/" className={styles.footerLink}>
            Innovink
          </Link>{" "}
          Enterprise Platform
        </div>
      </footer>
    </main>
  );
}

function buildHero(content: unknown, fallbackDescription: string | null) {
  const record = asRecord(content);

  return {
    badge:
      readString(record, ["eyebrow", "badge", "programType"]) ??
      "Enterprise Innovation Program · Open Registration",
    title:
      readString(record, ["headline", "title", "heroHeadline"]) ??
      "Join the Program",
    subtitle:
      readString(record, ["subheadline", "subtitle", "description"]) ??
      fallbackDescription ??
      "Review the published challenge, register your team, and move into the governed participant workflow.",
    primaryCtaLabel:
      readString(record, ["primaryCta", "primary_cta", "ctaLabel"]) ?? "Register Your Team",
    secondaryCtaLabel:
      readString(record, ["secondaryCta", "secondary_cta"]) ?? "Learn More",
    registrationLabel:
      readString(record, ["registrationCloseLabel", "registrationWindow", "deadline"]) ?? "soon",
    metrics: [
      {
        value: readString(record, ["teamsTarget", "expectedTeams", "metricOneValue"]) ?? "Open",
        label: readString(record, ["teamsLabel", "metricOneLabel"]) ?? "Registration",
      },
      {
        value: readString(record, ["submissionWindow", "metricTwoValue"]) ?? "Governed",
        label: readString(record, ["submissionLabel", "metricTwoLabel"]) ?? "Submission Flow",
      },
      {
        value: readString(record, ["judgeCount", "metricThreeValue"]) ?? "Human",
        label: readString(record, ["judgeLabel", "metricThreeLabel"]) ?? "Judging",
      },
      {
        value: readString(record, ["trackCount", "metricFourValue"]) ?? "AI-assisted",
        label: readString(record, ["trackLabel", "metricFourLabel"]) ?? "Operations",
      },
    ],
  };
}

function buildFeatureCards(content: unknown, programName: string) {
  const record = asRecord(content);
  const cards = readArray(record, ["tracks", "items", "focusAreas", "pillars"])
    .map((item, index) => buildFeatureCard(item, index))
    .filter((item): item is FeatureCard => item !== null);

  return {
    heading:
      readString(record, ["title", "headline", "sectionTitle"]) ?? "Challenge Tracks",
    subheading:
      readString(record, ["subtitle", "description", "sectionSubtitle"]) ??
      `Published participant guidance for ${programName}.`,
    cards:
      cards.length > 0
        ? cards
        : [
            {
              title: "Program Overview",
              body:
                readString(record, ["body", "description"]) ??
                "This published page is generated from the approved program brief and gives participants the official challenge context.",
              meta: "Overview",
              accent: "gold",
            },
            {
              title: "Submission Readiness",
              body:
                "Registration, submission, and judging experiences stay coordinated through one governed participant flow.",
              meta: "Participant Operations",
              accent: "blue",
            },
            {
              title: "Enterprise Control",
              body:
                "Timeline, approvals, and published outcomes remain human-reviewed even when AI helps draft the operational package.",
              meta: "Governed Delivery",
              accent: "steel",
            },
          ],
  };
}

function buildFeatureCard(item: unknown, index: number): FeatureCard | null {
  const record = asRecord(item);
  const title = readString(record, ["title", "name", "label"]);
  const body = readString(record, ["description", "body", "summary"]);

  if (!title && !body) {
    return null;
  }

  const accents: FeatureCard["accent"][] = ["gold", "blue", "steel"];

  return {
    title: title ?? `Track ${index + 1}`,
    body: body ?? "Program detail generated from the approved landing-page draft.",
    meta: readString(record, ["meta", "badge", "highlight"]) ?? undefined,
    accent: accents[index % accents.length],
  };
}

function buildTimelineEntries(content: unknown) {
  const record = asRecord(content);
  const entries = readArray(record, ["items", "milestones", "steps", "timeline"])
    .map((item) => buildTimelineEntry(item))
    .filter((item): item is TimelineEntry => item !== null);

  return entries.length > 0
    ? entries
    : [
        {
          title: "Registration Window",
          body: "Secure participant access and confirm the team through the published registration flow.",
        },
        {
          title: "Program Build Phase",
          body: "Develop the solution, coordinate with mentors, and prepare the final project package.",
        },
        {
          title: "Judging and Decisions",
          body: "Final submissions move into the governed judging workflow once the deadline closes.",
        },
      ];
}

function buildTimelineEntry(item: unknown): TimelineEntry | null {
  const record = asRecord(item);
  const title = readString(record, ["title", "name", "label"]);
  const body = readString(record, ["description", "body", "summary"]);

  if (!title && !body) {
    return null;
  }

  return {
    title: title ?? "Program milestone",
    body: body ?? "Milestone detail generated from the approved program timeline.",
    meta: readString(record, ["date", "window", "timeframe"]) ?? undefined,
  };
}

function buildFaqEntries(content: unknown) {
  const record = asRecord(content);
  const items = readArray(record, ["items", "questions", "faqs"])
    .map((item) => buildFaqEntry(item))
    .filter((item): item is FaqEntry => item !== null);

  return items.length > 0
    ? items
    : [
        {
          question: "How do I join the program?",
          answer:
            "Use the registration path on this page, authenticate with Innovink, and complete the participant registration package for your team.",
        },
        {
          question: "What happens after registration?",
          answer:
            "Participants move into the governed team, submission, and judging flow defined by the published program setup.",
        },
      ];
}

function buildFaqEntry(item: unknown): FaqEntry | null {
  const record = asRecord(item);
  const question = readString(record, ["question", "title", "q"]);
  const answer = readString(record, ["answer", "body", "a", "description"]);

  if (!question || !answer) {
    return null;
  }

  return { question, answer };
}

function buildBulletList(content: unknown, fallback: string[]) {
  const record = asRecord(content);
  const values = readArray(record, ["items", "points", "criteria", "bullets"])
    .map((item) => {
      if (typeof item === "string" && item.trim()) {
        return item.trim();
      }

      const entry = asRecord(item);
      return readString(entry, ["title", "label", "description", "body"]);
    })
    .filter((item): item is string => Boolean(item));

  return values.length > 0 ? values : fallback;
}

function buildCta(content: unknown, fallbackLabel: string) {
  const record = asRecord(content);

  return {
    title:
      readString(record, ["headline", "title"]) ?? "Ready to participate?",
    body:
      readString(record, ["description", "body", "subtitle"]) ??
      "Move into the registration flow, confirm your team details, and continue through the governed participant journey.",
    label:
      readString(record, ["primaryCta", "ctaLabel", "buttonLabel"]) ??
      fallbackLabel,
  };
}

function findSection(sections: GenericSection[], sectionKey: string) {
  return sections.find((section) => section.sectionKey.toLowerCase() === sectionKey);
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readStringFromUnknown(value: unknown, keys: string[]) {
  return readString(asRecord(value), keys);
}

function readArray(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
