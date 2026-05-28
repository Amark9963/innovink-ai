import { describe, expect, it } from "vitest";
import { ensureSlugOrThrow, slugifySegment } from "@/lib/utils/slugs";

describe("slugifySegment", () => {
  it("normalizes corporate names into URL-safe slugs", () => {
    expect(slugifySegment("Acme Innovation Lab")).toBe("acme-innovation-lab");
    expect(slugifySegment("North Star / APAC 2026")).toBe("north-star-apac-2026");
  });

  it("strips punctuation-only input to an empty slug", () => {
    expect(slugifySegment("...")).toBe("");
  });
});

describe("ensureSlugOrThrow", () => {
  it("throws when no valid slug can be derived", () => {
    expect(() => ensureSlugOrThrow("!!!", "Organization slug")).toThrow(
      "Organization slug must include letters or numbers.",
    );
  });
});
