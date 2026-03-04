"use client";

import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Check, Trash2, FileText, MessageSquare, BarChart3, CheckCircle, AlertCircle } from "lucide-react";
import type { NotificationType } from "@/lib/types";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

const typeIcons: Record<NotificationType, React.ReactNode> = {
  rfq: <FileText className="h-3.5 w-3.5" />,
  quote: <FileText className="h-3.5 w-3.5" />,
  chat: <MessageSquare className="h-3.5 w-3.5" />,
  qcs: <BarChart3 className="h-3.5 w-3.5" />,
  decision: <CheckCircle className="h-3.5 w-3.5" />,
  system: <AlertCircle className="h-3.5 w-3.5" />,
};

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const {
    state,
    currentRole,
    getCurrentUser,
    markNotificationRead,
    markAllNotificationsRead,
    clearReadNotifications,
    setCurrentPage,
    setSelectedRFQId,
  } = useStore();

  const user = getCurrentUser();
  const currentSupplier = state.suppliers.find((s) => s.role === currentRole);

  // Filter notifications based on role
  const visibleNotifications = state.notifications.filter((n) => {
    if (currentRole === "procurement") return n.role === "procurement";
    if (currentRole === "engineer") return n.role === "engineer" && n.userId === user.id;
    if (currentRole === "hop") return n.role === "hop";
    if (currentRole.startsWith("supplier_")) {
      return n.role === "supplier" && n.supplierId === currentSupplier?.id;
    }
    return false;
  });

  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  function handleViewNotification(notifId: string, rfqId?: string, qcsId?: string, type?: NotificationType) {
    markNotificationRead(notifId);
    if (qcsId || type === "qcs") {
      // QCS-related notification - go to QCS page
      setCurrentPage("qcs");
    } else if (rfqId) {
      setSelectedRFQId(rfqId);
      if (type === "chat") {
        setCurrentPage("rfqs");
      } else {
        setCurrentPage("rfqs");
      }
    }
    onClose();
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("de-DE");
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-96 p-0">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="text-sm font-semibold">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#00A0E3] text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Actions */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-[10px]"
            onClick={markAllNotificationsRead}
            disabled={unreadCount === 0}
          >
            <Check className="h-3 w-3" />
            Mark all as read
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-[10px]"
            onClick={clearReadNotifications}
            disabled={visibleNotifications.every((n) => !n.read)}
          >
            <Trash2 className="h-3 w-3" />
            Clear read
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-140px)]">
          {visibleNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                No notifications yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {visibleNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-muted/50 ${
                    !notif.read ? "bg-[#00A0E3]/5" : ""
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      !notif.read
                        ? "bg-[#00A0E3]/10 text-[#00A0E3]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {typeIcons[notif.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-xs leading-tight ${
                          !notif.read ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#00A0E3]" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(notif.createdAt)}
                      </span>
                      {(notif.rfqId || notif.qcsId) && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-[10px] text-[#00A0E3]"
                          onClick={() =>
                            handleViewNotification(notif.id, notif.rfqId, notif.qcsId, notif.type)
                          }
                        >
                          View
                        </Button>
                      )}
                      {!notif.read && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-[10px] text-muted-foreground"
                          onClick={() => markNotificationRead(notif.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
