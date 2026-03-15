import type { Role } from "./types";

// Map each user id to their slug prefix so links are human-readable
const USER_SLUG_MAP: Record<string, { prefix: string; suffix: string }> = {
  "USR-001": { prefix: "engineer", suffix: "max-mueller-001" },
  "USR-002": { prefix: "procurement", suffix: "anna-schmidt-001" },
  "USR-003": { prefix: "supplier-a", suffix: "steel-corp-001" },
  "USR-004": { prefix: "supplier-b", suffix: "metalworks-001" },
  "USR-005": { prefix: "hop", suffix: "dr-klaus-weber-001" },
  "USR-006": { prefix: "supplier-c", suffix: "precision-parts-001" },
  "USR-007": { prefix: "supplier-d", suffix: "alloytech-001" },
  "USR-008": { prefix: "supplier-e", suffix: "euroforge-001" },
};

/**
 * Returns the canonical slug for a user (used when seeding / looking up).
 * Example: "engineer-max-mueller-001"
 */
export function getDefaultSlug(userId: string): string {
  const entry = USER_SLUG_MAP[userId];
  if (!entry) return `user-${userId.toLowerCase()}`;
  return `${entry.prefix}-${entry.suffix}`;
}

/**
 * Generates a slug from a role label and user name, sanitised for URLs.
 * Example: generateUniqueSlug("Max Mueller", "engineer") → "engineer-max-mueller"
 */
export function generateUniqueSlug(userName: string, role: Role): string {
  const rolePrefix = role.replace(/_/g, "-");
  const namePart = userName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `${rolePrefix}-${namePart}`;
}

/**
 * Generates a cryptographically random token string.
 * Only runs in browser context (the login page is a client component).
 */
export function generateLinkToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Returns the full login URL for a given slug.
 */
export function buildLoginUrl(slug: string, baseUrl?: string): string {
  const base =
    baseUrl ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  return `${base}/login/${slug}`;
}
