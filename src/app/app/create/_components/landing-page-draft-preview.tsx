type LandingPageDraftPreviewProps = {
  payload: Record<string, unknown>;
  editable?: {
    enabled: boolean;
    onSectionFieldChange: (
      sectionKey: string,
      field: "headline" | "subheadline" | "body" | "ctaLabel",
      value: string,
    ) => void;
    onTitleChange: (value: string) => void;
  };
};

type DraftSection = {
  sectionKey: string;
  displayOrder?: number;
  headline?: string;
  subheadline?: string;
  body?: string;
  ctaLabel?: string;
};

type DraftTheme = {
  pageBackground: string;
  surfaceBackground: string;
  heroBackground: string;
  heroForeground: string;
  headingColor: string;
  bodyColor: string;
  mutedTextColor: string;
  accentColor: string;
  borderColor: string;
  ctaTextColor: string;
  secondaryButtonBackground: string;
  secondaryButtonTextColor: string;
  secondaryButtonBorderColor: string;
};

const DEFAULT_THEME: DraftTheme = {
  pageBackground: "#f3f1ea",
  surfaceBackground: "#ffffff",
  heroBackground: "linear-gradient(135deg, #07101f 0%, #0c1525 50%, #111e30 100%)",
  heroForeground: "#f4ede2",
  headingColor: "#101a2a",
  bodyColor: "#38485d",
  mutedTextColor: "#70839d",
  accentColor: "#b08a28",
  borderColor: "rgba(16, 26, 42, 0.1)",
  ctaTextColor: "#07101f",
  secondaryButtonBackground: "rgba(255,255,255,0.04)",
  secondaryButtonTextColor: "#d4bf86",
  secondaryButtonBorderColor: "rgba(212, 191, 134, 0.45)",
};

export function LandingPageDraftPreview({
  payload,
  editable,
}: LandingPageDraftPreviewProps) {
  const draftTitle = readString(payload, ["title"]) ?? "Landing Page Draft";
  const sections = getSections(payload);
  const theme = resolveTheme(payload);

  const hero = findSection(sections, "hero");
  const overview = findSection(sections, "overview");
  const timeline = findSection(sections, "timeline");
  const eligibility = findSection(sections, "eligibility");
  const judging = findSection(sections, "judging");
  const faq = findSection(sections, "faq");
  const cta = findSection(sections, "cta");

  const heroTitle = hero?.headline ?? draftTitle;
  const heroSubtitle =
    hero?.subheadline ??
    hero?.body ??
    "The approved landing page draft will guide participants into the governed registration flow.";
  const heroBadge = humanizeSectionKey(payload.themeKey) ?? "Enterprise Program";
  const overviewCards = buildOverviewCards(overview, draftTitle);
  const timelineItems = buildListItems(timeline, [
    "Registration and intake",
    "Project build and support",
    "Submission, judging, and reporting",
  ]);
  const eligibilityItems = buildListItems(eligibility, [
    "Confirm participant eligibility before registration.",
    "Align team scope to one clear innovation objective.",
    "Prepare required deliverables before the judging deadline.",
  ]);
  const judgingItems = buildListItems(judging, [
    "Submissions move into a governed human-review process.",
    "Final scoring remains approval-aware and audit-backed.",
    "Operational outcomes are published only after review.",
  ]);
  const faqItems = buildFaqItems(faq);
  const ctaLabel = cta?.ctaLabel ?? hero?.ctaLabel ?? "Register interest";
  const isEditable = editable?.enabled === true;
  const ctaTargetSection = cta?.sectionKey ?? hero?.sectionKey ?? "cta";

  return (
    <div
      className="overflow-hidden rounded-[28px] border shadow-[0_24px_80px_rgba(3,8,18,0.18)]"
      style={{
        background: theme.pageBackground,
        borderColor: theme.borderColor,
      }}
    >
      <div
        className="flex items-center gap-4 border-b px-6 py-4"
        style={{
          background: "#091221",
          borderColor: "rgba(255,255,255,0.07)",
        }}
      >
        <div className="text-[13px] font-bold tracking-[0.08em]" style={{ color: theme.accentColor }}>
          INNOVINK
        </div>
        <div className="h-4 w-px bg-white/10" />
        <EditableText
          as="div"
          value={draftTitle}
          enabled={isEditable}
          className="truncate text-[12px]"
          style={{ color: "#9baabf" }}
          onCommit={editable?.onTitleChange}
        />
        <div className="ml-auto flex items-center gap-3 text-[11px]" style={{ color: "#9baabf" }}>
          <span>About</span>
          <span>FAQ</span>
          <EditableText
            as="span"
            value={ctaLabel}
            enabled={isEditable}
            className="rounded-full px-3 py-1.5 font-semibold"
            style={{
              background: theme.accentColor,
              color: theme.ctaTextColor,
            }}
            onCommit={(value) =>
              editable?.onSectionFieldChange(ctaTargetSection, "ctaLabel", value)
            }
          />
        </div>
      </div>

      <section
        className="px-8 py-10 md:px-10 md:py-14"
        style={{
          background: theme.heroBackground,
          color: theme.heroForeground,
        }}
      >
        <div
          className="mb-4 inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{
            borderColor: theme.secondaryButtonBorderColor,
            color: theme.accentColor,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          {heroBadge}
        </div>
        <EditableText
          as="h2"
          value={heroTitle}
          enabled={isEditable}
          className="max-w-[760px] text-[30px] font-semibold leading-[1.18] tracking-[-0.03em] md:text-[38px]"
          onCommit={(value) =>
            editable?.onSectionFieldChange(hero?.sectionKey ?? "hero", "headline", value)
          }
        />
        <EditableText
          as="p"
          value={heroSubtitle}
          enabled={isEditable}
          className="mt-4 max-w-[640px] text-[14px] leading-7"
          style={{ color: withAlpha(theme.heroForeground, 0.72) }}
          onCommit={(value) =>
            editable?.onSectionFieldChange(hero?.sectionKey ?? "hero", "subheadline", value)
          }
        />
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <EditableText
            as="span"
            value={ctaLabel}
            enabled={isEditable}
            className="rounded-full px-5 py-3 text-[12px] font-semibold"
            style={{
              background: theme.accentColor,
              color: theme.ctaTextColor,
            }}
            onCommit={(value) =>
              editable?.onSectionFieldChange(ctaTargetSection, "ctaLabel", value)
            }
          />
          <span
            className="rounded-full border px-5 py-3 text-[12px] font-medium"
            style={{
              borderColor: theme.secondaryButtonBorderColor,
              color: theme.secondaryButtonTextColor,
              background: theme.secondaryButtonBackground,
            }}
          >
            Learn more
          </span>
        </div>
      </section>

      <div className="space-y-4 px-5 py-5 md:px-6 md:py-6">
        <SectionSurface
          theme={theme}
          title={overview?.headline ?? "Overview"}
          editable={isEditable}
          onTitleCommit={(value) =>
            editable?.onSectionFieldChange(overview?.sectionKey ?? "overview", "headline", value)
          }
        >
          <div className="grid gap-3 md:grid-cols-3">
            {overviewCards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border px-4 py-4"
                style={{
                  background: withAlpha(theme.accentColor, 0.06),
                  borderColor: theme.borderColor,
                }}
              >
                <div className="text-[13px] font-semibold" style={{ color: theme.headingColor }}>
                  {card.title}
                </div>
                <div className="mt-2 text-[12px] leading-6" style={{ color: theme.bodyColor }}>
                  {card.body}
                </div>
              </div>
            ))}
          </div>
        </SectionSurface>

        <SectionSurface
          theme={theme}
          title={timeline?.headline ?? "Timeline"}
          editable={isEditable}
          onTitleCommit={(value) =>
            editable?.onSectionFieldChange(timeline?.sectionKey ?? "timeline", "headline", value)
          }
        >
          <div className="space-y-3">
            {timelineItems.map((item, index) => (
              <div key={`${item}-${index}`} className="flex gap-3">
                <div
                  className="mt-1.5 h-2.5 w-2.5 rounded-full"
                  style={{ background: theme.accentColor }}
                />
                <div className="text-[12px] leading-6" style={{ color: theme.bodyColor }}>
                  {item}
                </div>
              </div>
            ))}
          </div>
        </SectionSurface>

        <div className="grid gap-4 md:grid-cols-2">
          <SectionSurface
            theme={theme}
            title={eligibility?.headline ?? "Eligibility"}
            editable={isEditable}
            onTitleCommit={(value) =>
              editable?.onSectionFieldChange(
                eligibility?.sectionKey ?? "eligibility",
                "headline",
                value,
              )
            }
          >
            <ul className="space-y-2">
              {eligibilityItems.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className="text-[12px] leading-6"
                  style={{ color: theme.bodyColor }}
                >
                  • {item}
                </li>
              ))}
            </ul>
          </SectionSurface>
          <SectionSurface
            theme={theme}
            title={judging?.headline ?? "Judging"}
            editable={isEditable}
            onTitleCommit={(value) =>
              editable?.onSectionFieldChange(judging?.sectionKey ?? "judging", "headline", value)
            }
          >
            <ul className="space-y-2">
              {judgingItems.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className="text-[12px] leading-6"
                  style={{ color: theme.bodyColor }}
                >
                  • {item}
                </li>
              ))}
            </ul>
          </SectionSurface>
        </div>

        {faqItems.length > 0 ? (
          <SectionSurface
            theme={theme}
            title={faq?.headline ?? "Frequently Asked Questions"}
            editable={isEditable}
            onTitleCommit={(value) =>
              editable?.onSectionFieldChange(faq?.sectionKey ?? "faq", "headline", value)
            }
          >
            <div className="space-y-3">
              {faqItems.map((entry) => (
                <div
                  key={entry.question}
                  className="rounded-2xl border px-4 py-4"
                  style={{
                    background: theme.surfaceBackground,
                    borderColor: theme.borderColor,
                  }}
                >
                  <div className="text-[12px] font-semibold" style={{ color: theme.headingColor }}>
                    {entry.question}
                  </div>
                  <div className="mt-2 text-[12px] leading-6" style={{ color: theme.bodyColor }}>
                    {entry.answer}
                  </div>
                </div>
              ))}
            </div>
          </SectionSurface>
        ) : null}

        <section
          className="rounded-[24px] px-6 py-7 text-center"
          style={{
            background: withAlpha(theme.accentColor, 0.12),
            border: `1px solid ${theme.borderColor}`,
          }}
        >
          <EditableText
            as="div"
            value={cta?.headline ?? "Ready to participate?"}
            enabled={isEditable}
            className="text-[19px] font-semibold"
            style={{ color: theme.headingColor }}
            onCommit={(value) =>
              editable?.onSectionFieldChange(cta?.sectionKey ?? "cta", "headline", value)
            }
          />
          <EditableText
            as="div"
            value={
              cta?.body ??
              "Move into the registration flow, confirm your team details, and continue through the governed participant journey."
            }
            enabled={isEditable}
            className="mx-auto mt-3 max-w-[640px] text-[13px] leading-7"
            style={{ color: theme.bodyColor }}
            onCommit={(value) =>
              editable?.onSectionFieldChange(cta?.sectionKey ?? "cta", "body", value)
            }
          />
          <EditableText
            as="div"
            value={ctaLabel}
            enabled={isEditable}
            className="mt-5 inline-flex rounded-full px-5 py-3 text-[12px] font-semibold"
            style={{ background: theme.accentColor, color: theme.ctaTextColor }}
            onCommit={(value) =>
              editable?.onSectionFieldChange(ctaTargetSection, "ctaLabel", value)
            }
          />
        </section>
      </div>
    </div>
  );
}

function SectionSurface({
  theme,
  title,
  editable = false,
  onTitleCommit,
  children,
}: {
  theme: DraftTheme;
  title: string;
  editable?: boolean;
  onTitleCommit?: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-[24px] border px-5 py-5"
      style={{
        background: theme.surfaceBackground,
        borderColor: theme.borderColor,
      }}
    >
      <EditableText
        as="div"
        value={title}
        enabled={editable}
        className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: theme.mutedTextColor }}
        onCommit={onTitleCommit}
      />
      {children}
    </section>
  );
}

function EditableText({
  as,
  value,
  enabled,
  className,
  style,
  onCommit,
}: {
  as: "div" | "h2" | "p" | "span";
  value: string;
  enabled: boolean;
  className?: string;
  style?: CSSProperties;
  onCommit?: (value: string) => void;
}) {
  const Component = as;
  const editableClass = enabled
    ? "cursor-text rounded-[10px] outline outline-1 outline-transparent transition hover:outline-[rgba(16,26,42,0.24)] focus:outline-[rgba(176,138,40,0.75)]"
    : "";

  return (
    <Component
      contentEditable={enabled}
      suppressContentEditableWarning
      className={`${className ?? ""} ${editableClass}`.trim()}
      style={style}
      onBlur={(event) => {
        if (!enabled || !onCommit) {
          return;
        }

        const nextValue = event.currentTarget.textContent?.trim() ?? "";
        if (nextValue.length > 0 && nextValue !== value) {
          onCommit(nextValue);
        }
      }}
      onKeyDown={(event) => {
        if (!enabled || event.key !== "Enter") {
          return;
        }

        event.preventDefault();
        event.currentTarget.blur();
      }}
    >
      {value}
    </Component>
  );
}

function getSections(payload: Record<string, unknown>) {
  const raw = payload.sections;
  if (!Array.isArray(raw)) {
    return [] as DraftSection[];
  }

  return raw
    .filter(
      (section): section is Record<string, unknown> =>
        typeof section === "object" && section !== null && !Array.isArray(section),
    )
    .map((section) => ({
      sectionKey: readString(section, ["sectionKey"]) ?? "section",
      displayOrder: typeof section.displayOrder === "number" ? section.displayOrder : undefined,
      headline: readString(section, ["headline", "title"]) ?? undefined,
      subheadline: readString(section, ["subheadline", "subtitle"]) ?? undefined,
      body: readString(section, ["body", "description"]) ?? undefined,
      ctaLabel: readString(section, ["ctaLabel", "primaryCta"]) ?? undefined,
    }))
    .sort((left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0));
}

function findSection(sections: DraftSection[], sectionKey: string) {
  return sections.find((section) => section.sectionKey.toLowerCase() === sectionKey);
}

function buildOverviewCards(section: DraftSection | undefined, fallbackTitle: string) {
  const baseText =
    section?.body ??
    `${fallbackTitle} is structured for enterprise launch, participant routing, and governed review.`;
  const chunks = baseText
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (chunks.length === 0) {
    return [
      { title: "Program overview", body: baseText },
      { title: "Participant flow", body: "Registration, submission, and judging remain aligned to the approved plan." },
      { title: "Governance", body: "Human approval and deterministic execution remain the source of truth." },
    ];
  }

  return chunks.map((chunk, index) => ({
    title:
      index === 0
        ? "Program overview"
        : index === 1
          ? "Participant flow"
          : "Governance",
    body: chunk,
  }));
}

function buildListItems(section: DraftSection | undefined, fallback: string[]) {
  const source = section?.body?.trim();
  if (!source) {
    return fallback;
  }

  const split = source
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return split.length > 0 ? split : fallback;
}

function buildFaqItems(section: DraftSection | undefined) {
  if (!section) {
    return [];
  }

  const body = section.body?.trim();
  if (!body) {
    return [];
  }

  const entries = body
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (entries.length === 0) {
    return [];
  }

  return entries.map((entry, index) => ({
    question: index === 0 ? section.headline ?? "What should participants know?" : `Question ${index + 1}`,
    answer: entry,
  }));
}

function resolveTheme(payload: Record<string, unknown>): DraftTheme {
  const themeRecord = asRecord(payload.theme);
  const themeKey = readString(payload, ["themeKey"]) ?? "enterprise-navy";
  const base =
    themeKey.includes("light") || themeKey.includes("ivory")
      ? {
          ...DEFAULT_THEME,
          pageBackground: "#f7f4eb",
          surfaceBackground: "#fffdf8",
          heroBackground: "linear-gradient(135deg, #f7f4eb 0%, #f1ebde 100%)",
          heroForeground: "#132238",
          headingColor: "#122033",
          bodyColor: "#314559",
          mutedTextColor: "#6c7f95",
          secondaryButtonBackground: "rgba(255,255,255,0.72)",
          secondaryButtonTextColor: "#7d6320",
          secondaryButtonBorderColor: "rgba(176, 138, 40, 0.36)",
        }
      : DEFAULT_THEME;

  return {
    pageBackground: readString(themeRecord, ["pageBackground"]) ?? base.pageBackground,
    surfaceBackground: readString(themeRecord, ["surfaceBackground"]) ?? base.surfaceBackground,
    heroBackground: readString(themeRecord, ["heroBackground"]) ?? base.heroBackground,
    heroForeground: readString(themeRecord, ["heroForeground"]) ?? base.heroForeground,
    headingColor: readString(themeRecord, ["headingColor"]) ?? base.headingColor,
    bodyColor: readString(themeRecord, ["bodyColor"]) ?? base.bodyColor,
    mutedTextColor: readString(themeRecord, ["mutedTextColor"]) ?? base.mutedTextColor,
    accentColor: readString(themeRecord, ["accentColor"]) ?? base.accentColor,
    borderColor: readString(themeRecord, ["borderColor"]) ?? base.borderColor,
    ctaTextColor: readString(themeRecord, ["ctaTextColor"]) ?? base.ctaTextColor,
    secondaryButtonBackground:
      readString(themeRecord, ["secondaryButtonBackground"]) ?? base.secondaryButtonBackground,
    secondaryButtonTextColor:
      readString(themeRecord, ["secondaryButtonTextColor"]) ?? base.secondaryButtonTextColor,
    secondaryButtonBorderColor:
      readString(themeRecord, ["secondaryButtonBorderColor"]) ?? base.secondaryButtonBorderColor,
  };
}

function humanizeSectionKey(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value
    .replaceAll(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function withAlpha(color: string, alpha: number) {
  if (color.startsWith("#")) {
    const normalized = color.replace("#", "");
    const hex =
      normalized.length === 3
        ? normalized
            .split("")
            .map((character) => `${character}${character}`)
            .join("")
        : normalized;

    if (hex.length === 6) {
      const red = Number.parseInt(hex.slice(0, 2), 16);
      const green = Number.parseInt(hex.slice(2, 4), 16);
      const blue = Number.parseInt(hex.slice(4, 6), 16);
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }
  }

  return color;
}
import type { CSSProperties, ReactNode } from "react";
