import { supabase } from "./supabaseClient";
import { generateLinkToken, getDefaultSlug } from "./link-utils";
import type { Role } from "./types";

export interface UserLink {
  id: string;
  user_id: string;
  slug: string;
  token: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  last_used_at?: string;
  role?: Role;
}

/**
 * Fetches the active link record for a specific user.
 */
export async function fetchUserLink(userId: string): Promise<UserLink | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_links")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data as UserLink;
}

/**
 * Fetches a link record by its slug (used during login validation).
 */
export async function fetchLinkBySlug(slug: string): Promise<UserLink | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_links")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data as UserLink;
}

/**
 * Creates (or upserts) a link record for the given user.
 * If the user already has an active link it is returned as-is.
 */
export async function createUserLink(
  userId: string,
  role: Role,
  userName: string
): Promise<UserLink | null> {
  if (!supabase) return null;

  // Check for an existing active link first
  const existing = await fetchUserLink(userId);
  if (existing) return existing;

  const slug = getDefaultSlug(userId);
  const token = generateLinkToken();

  const { data, error } = await supabase
    .from("user_links")
    .insert({
      user_id: userId,
      slug,
      token,
      role,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Failed to create user link:", error.message);
    return null;
  }
  return data as UserLink;
}

/**
 * Invalidates all existing links for a user and creates a new one.
 * The new slug gets an incremented counter suffix, e.g. "-002" instead of "-001".
 */
export async function regenerateLink(
  userId: string,
  role: Role,
  userName: string
): Promise<UserLink | null> {
  if (!supabase) return null;

  // Deactivate all existing links
  await invalidateOldLinks(userId);

  // Build a new slug with incremented counter
  const slug = await buildNextSlug(userId, role);
  const token = generateLinkToken();

  const { data, error } = await supabase
    .from("user_links")
    .insert({
      user_id: userId,
      slug,
      token,
      role,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Failed to regenerate user link:", error.message);
    return null;
  }
  return data as UserLink;
}

/**
 * Marks all link records for a user as inactive.
 */
export async function invalidateOldLinks(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("user_links")
    .update({ is_active: false })
    .eq("user_id", userId);

  if (error) {
    console.error("[Supabase] Failed to invalidate old links:", error.message);
  }
}

/**
 * Records the last-access timestamp for a slug (call on successful login).
 */
export async function updateLastUsed(slug: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("user_links")
    .update({ last_used_at: new Date().toISOString() })
    .eq("slug", slug);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Looks up previous slugs for a user and returns a new slug with the next
 * counter number. E.g. if the latest was "engineer-max-mueller-001" → returns
 * "engineer-max-mueller-002".
 */
async function buildNextSlug(
  userId: string,
  role: Role
): Promise<string> {
  if (!supabase) return getDefaultSlug(userId);

  const { data } = await supabase
    .from("user_links")
    .select("slug")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const slugs: string[] = (data ?? []).map((r: { slug: string }) => r.slug);

  // Find the highest counter suffix already used
  const maxCounter = slugs.reduce((max, slug) => {
    const match = slug.match(/-(\d+)$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);

  const base = getDefaultSlug(userId).replace(/-\d+$/, ""); // strip trailing counter
  const next = String(maxCounter + 1).padStart(3, "0");
  return `${base}-${next}`;
}
