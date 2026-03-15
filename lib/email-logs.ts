import { supabase } from "./supabaseClient";

export type EmailType =
  | "request_created"
  | "rfq_sent"
  | "quotation_received"
  | "quotations_ready"
  | "hop_decision";

export interface EmailLog {
  id?: string;
  recipientEmail: string;
  recipientRole?: string;
  emailType: EmailType;
  requestId?: string;
  subject?: string;
  body?: string;
  sentAt?: string;
  status: "sent" | "failed";
  createdAt?: string;
}

// Persist an email log entry to Supabase (fire-and-forget)
export async function insertEmailLog(log: EmailLog): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("email_logs").insert({
      recipient_email: log.recipientEmail,
      recipient_role: log.recipientRole ?? null,
      email_type: log.emailType,
      request_id: log.requestId ?? null,
      subject: log.subject ?? null,
      body: log.body ?? null,
      sent_at: log.sentAt ?? new Date().toISOString(),
      status: log.status,
    });
  } catch (err) {
    console.warn("[email-logs] Failed to insert email log:", err);
  }
}

// Fetch email logs for a specific request
export async function fetchEmailLogsByRequest(requestId: string): Promise<EmailLog[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("email_logs")
      .select("*")
      .eq("request_id", requestId)
      .order("sent_at", { ascending: false });
    if (error) {
      console.error("[email-logs] Failed to fetch email logs:", error.message);
      return [];
    }
    return (data ?? []).map(fromSupabaseEmailLog);
  } catch (err) {
    console.warn("[email-logs] fetchEmailLogsByRequest error:", err);
    return [];
  }
}

// Fetch all recent email logs (for audit/dashboard view)
export async function fetchRecentEmailLogs(limit = 50): Promise<EmailLog[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("email_logs")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("[email-logs] Failed to fetch recent email logs:", error.message);
      return [];
    }
    return (data ?? []).map(fromSupabaseEmailLog);
  } catch (err) {
    console.warn("[email-logs] fetchRecentEmailLogs error:", err);
    return [];
  }
}

function fromSupabaseEmailLog(row: Record<string, unknown>): EmailLog {
  return {
    id: row.id as string,
    recipientEmail: (row.recipient_email as string) || "",
    recipientRole: (row.recipient_role as string) || undefined,
    emailType: (row.email_type as EmailType) || "request_created",
    requestId: (row.request_id as string) || undefined,
    subject: (row.subject as string) || undefined,
    body: (row.body as string) || undefined,
    sentAt: (row.sent_at as string) || undefined,
    status: ((row.status as string) as "sent" | "failed") || "sent",
    createdAt: (row.created_at as string) || undefined,
  };
}
