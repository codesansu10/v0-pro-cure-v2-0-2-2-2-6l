"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Bell, FileText, Send, MessageSquare, CheckCircle } from "lucide-react";
import type { NotificationType } from "@/lib/types";

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(isoString).toLocaleDateString("de-DE");
}

const typeIcons: Record<NotificationType, React.ReactNode> = {
  rfq: <FileText className="h-3 w-3" />,
  quote: <Send className="h-3 w-3" />,
  chat: <MessageSquare className="h-3 w-3" />,
  qcs: <Activity className="h-3 w-3" />,
  decision: <CheckCircle className="h-3 w-3" />,
  system: <Bell className="h-3 w-3" />,
};

const typeColors: Record<NotificationType, string> = {
  rfq: "bg-[#00A0E3]",
  quote: "bg-emerald-600",
  chat: "bg-amber-600",
  qcs: "bg-violet-600",
  decision: "bg-emerald-600",
  system: "bg-zinc-500",
};

export function ActivityFeed({ maxItems = 10 }: { maxItems?: number }) {
  const { state, currentRole, realtimeConnected } = useStore();

  // Show all notifications visible to the current role, sorted newest first
  const visibleNotifs = state.notifications
    .filter((n) => {
      if (currentRole === "procurement") return true;
      if (currentRole === "hop") return n.role === "hop" || n.role === "procurement";
      if (currentRole === "engineer") return n.role === "engineer" || n.role === "procurement";
      if (currentRole.startsWith("supplier_")) {
        const supplier = state.suppliers.find((s) => s.role === currentRole);
        return n.role === "supplier" && n.supplierId === supplier?.id;
      }
      return false;
    })
    .slice(0, maxItems);

  return (
    <Card className="border-border">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" />
            Live Activity Feed
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                realtimeConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
              }`}
            />
            <span className="text-[10px] font-normal text-muted-foreground">
              {realtimeConnected ? "Live" : "Offline"}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {visibleNotifs.length === 0 ? (
          <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
            <Bell className="h-3.5 w-3.5" />
            No activity yet. Actions will appear here in real-time.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {visibleNotifs.map((n) => (
              <li
                key={n.id}
                className="flex items-start gap-2.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${
                    typeColors[n.type] ?? "bg-zinc-500"
                  }`}
                >
                  {typeIcons[n.type] ?? <Bell className="h-3 w-3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-tight text-foreground">{n.title}</p>
                  <p className="mt-0.5 leading-snug text-muted-foreground">{n.message}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatRelativeTime(n.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
