const NON_ALPHANUMERIC = /[^a-z0-9]+/g;
const DUPLICATE_DASHES = /-{2,}/g;
const EDGE_DASHES = /^-+|-+$/g;

export function slugifySegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(NON_ALPHANUMERIC, "-")
    .replace(DUPLICATE_DASHES, "-")
    .replace(EDGE_DASHES, "");
}

export function ensureSlugOrThrow(value: string, fieldName: string) {
  const slug = slugifySegment(value);

  if (!slug) {
    throw new Error(`${fieldName} must include letters or numbers.`);
  }

  return slug;
}
