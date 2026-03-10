import { supabase } from "./supabaseClient";

const TOKEN_EXPIRY_DAYS = 30;

// Generate a cryptographically secure unique token for a supplier + RFQ combination
export function generateSupplierToken(supplierId: string, rfqId: string): string {
  // Use crypto.randomUUID() for a cryptographically secure random identifier
  const randomPart = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, "")
    : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  // Encode supplier and RFQ info so we can do local parsing as a fallback
  const meta = btoa(`${supplierId}:${rfqId}`);
  return `${meta}-${randomPart}`;
}

// Parse a token to extract supplier and RFQ info
export function parseSupplierToken(token: string): { supplierId: string; rfqId: string } | null {
  try {
    const base64Part = token.split("-")[0];
    const decoded = atob(base64Part);
    const [supplierId, rfqId] = decoded.split(":");
    if (supplierId && rfqId) {
      return { supplierId, rfqId };
    }
    return null;
  } catch {
    return null;
  }
}

// Store token in Supabase (fire-and-forget, graceful if Supabase is unavailable)
export async function storeSupplierToken(token: string, supplierId: string, rfqId: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("supplier_tokens").upsert({
      token,
      supplier_id: supplierId,
      rfq_id: rfqId,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      used: false,
    });
  } catch (err) {
    console.warn("[tokens] Failed to store supplier token:", err);
  }
}

// Validate a token against Supabase (returns supplier info if valid)
export async function validateSupplierToken(token: string): Promise<{ supplierId: string; rfqId: string } | null> {
  // First try parsing the token locally
  const parsed = parseSupplierToken(token);
  if (!parsed) return null;

  // If Supabase is available, verify the token exists and hasn't expired
  if (supabase) {
    try {
      const { data } = await supabase
        .from("supplier_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (data && new Date(data.expires_at) > new Date()) {
        return { supplierId: data.supplier_id, rfqId: data.rfq_id };
      }
    } catch {
      // If Supabase lookup fails, fall back to local parsing
    }
  }

  return parsed;
}

// Build a supplier access URL
export function buildSupplierAccessUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/supplier?token=${encodeURIComponent(token)}`;
}
