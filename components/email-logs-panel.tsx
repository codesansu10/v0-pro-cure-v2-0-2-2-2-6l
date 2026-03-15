"use client";

import { useEffect, useState } from "react";
import { fetchRecentEmailLogs, fetchEmailLogsByRequest, type EmailLog } from "@/lib/email-logs";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, XCircle, Clock } from "lucide-react";

const EMAIL_TYPE_LABELS: Record<string, string> = {
  request_created: "Request Created",
  rfq_sent: "RFQ Sent to Supplier",
  quotation_received: "Quotation Received",
  quotations_ready: "Quotations Ready (HoP)",
  hop_decision: "HoP Decision",
};

const EMAIL_TYPE_COLORS: Record<string, string> = {
  request_created: "bg-blue-100 text-blue-700",
  rfq_sent: "bg-purple-100 text-purple-700",
  quotation_received: "bg-yellow-100 text-yellow-800",
  quotations_ready: "bg-green-100 text-green-700",
  hop_decision: "bg-orange-100 text-orange-700",
};

interface EmailLogsPanelProps {
  /** If provided, only show logs for this RFQ/request ID */
  requestId?: string;
  /** Maximum number of log entries to show (default 20) */
  limit?: number;
  /** Show compact mode without full subject/body */
  compact?: boolean;
}

export function EmailLogsPanel({ requestId, limit = 20, compact = false }: EmailLogsPanelProps) {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    setLoading(true);
    const data = requestId
      ? await fetchEmailLogsByRequest(requestId)
      : await fetchRecentEmailLogs(limit);
    setLogs(data.slice(0, limit));
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();

    // Subscribe to real-time email_logs changes
    if (!supabase) return;
    const channel = supabase
      .channel("email-logs-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "email_logs" },
        () => {
          loadLogs();
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Loading email logs…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email Activity
          <Badge variant="secondary" className="ml-auto text-xs">
            {logs.length} sent
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {logs.length === 0 ? (
                <p className="text-xs text-muted-foreground px-4 py-3">
            No emails sent yet for this{requestId ? " request" : " workflow"}.
          </p>
        ) : (
          <ul className="divide-y divide-border max-h-80 overflow-y-auto">
            {logs.map((log) => (
              <li key={log.id} className="px-4 py-2 flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {log.status === "sent" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  )}
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      EMAIL_TYPE_COLORS[log.emailType] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {EMAIL_TYPE_LABELS[log.emailType] ?? log.emailType}
                  </span>
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    → {log.recipientEmail}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {log.sentAt ? new Date(log.sentAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : ""}
                  </span>
                </div>
                {!compact && log.subject && (
                  <p className="text-xs text-muted-foreground pl-5 truncate">{log.subject}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
