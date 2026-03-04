"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send } from "lucide-react";
import type { ThreadType } from "@/lib/types";

interface ChatPanelProps {
  rfqId: string;
}

/**
 * Chat privacy rules:
 * - Engineer only sees "engineer_procurement" thread for that RFQ
 * - Supplier only sees their own "supplier_procurement" thread (rfqId + supplierId)
 * - Procurement sees all threads: one "engineer_procurement" + one per assigned supplier
 * - HoP can read engineer_procurement thread only (read-only)
 */
export function ChatPanel({ rfqId }: ChatPanelProps) {
  const { state, addMessage, currentRole, getCurrentUser, addNotification } = useStore();
  const [text, setText] = useState("");
  const user = getCurrentUser();

  // Get assigned suppliers for this RFQ
  const assignedSupplierIds = state.rfqSuppliers
    .filter((rs) => rs.rfqId === rfqId)
    .map((rs) => rs.supplierId);
  const assignedSuppliers = state.suppliers.filter((s) =>
    assignedSupplierIds.includes(s.id)
  );

  // For supplier roles, find their supplier ID
  const currentSupplier = state.suppliers.find((s) => s.role === currentRole);
  const currentSupplierId = currentSupplier?.id;

  // Determine which thread tabs to show based on role
  const isSupplierRole = currentRole.startsWith("supplier_");
  const isProcurement = currentRole === "procurement";
  const isEngineer = currentRole === "engineer";
  const isHoP = currentRole === "hop";

  // Active thread state (for procurement who can switch between threads)
  const [activeThread, setActiveThread] = useState<{
    type: ThreadType;
    supplierId?: string;
  }>({ type: "engineer_procurement" });

  // Compute visible messages based on role and active thread
  const visibleMessages = useMemo(() => {
    return state.messages.filter((m) => {
      if (m.rfqId !== rfqId) return false;

      if (isEngineer || isHoP) {
        // Engineer/HoP only sees engineer_procurement thread
        return m.threadType === "engineer_procurement";
      }

      if (isSupplierRole && currentSupplierId) {
        // Supplier only sees their own supplier_procurement thread
        return (
          m.threadType === "supplier_procurement" &&
          m.supplierId === currentSupplierId
        );
      }

      if (isProcurement) {
        // Procurement sees the active thread
        if (activeThread.type === "engineer_procurement") {
          return m.threadType === "engineer_procurement";
        } else {
          return (
            m.threadType === "supplier_procurement" &&
            m.supplierId === activeThread.supplierId
          );
        }
      }

      return false;
    });
  }, [
    state.messages,
    rfqId,
    currentRole,
    isEngineer,
    isHoP,
    isSupplierRole,
    isProcurement,
    currentSupplierId,
    activeThread,
  ]);

  const canSend = !isHoP;

  function handleSend() {
    if (!text.trim()) return;

    let threadType: ThreadType;
    let supplierId: string | undefined;

    if (isEngineer) {
      threadType = "engineer_procurement";
    } else if (isSupplierRole && currentSupplierId) {
      threadType = "supplier_procurement";
      supplierId = currentSupplierId;
    } else if (isProcurement) {
      threadType = activeThread.type;
      supplierId = activeThread.supplierId;
    } else {
      return;
    }

    addMessage({
      rfqId,
      threadType,
      supplierId,
      sender: user.name,
      senderId: user.id,
      senderRole: currentRole,
      message: text.trim(),
    });

    // Send notification to the recipient
    const rfq = state.rfqs.find((r) => r.id === rfqId);
    const msgPreview = text.trim().substring(0, 50) + (text.trim().length > 50 ? "..." : "");

    if (isEngineer) {
      // Engineer sends to procurement
      addNotification({
        role: "procurement",
        rfqId,
        title: `New Message from Engineer`,
        message: `${user.name} sent a message in RFQ ${rfqId}: "${msgPreview}"`,
        type: "chat",
      });
    } else if (isSupplierRole && currentSupplierId) {
      // Supplier sends to procurement (private thread)
      addNotification({
        role: "procurement",
        rfqId,
        supplierId: currentSupplierId,
        title: `New Message from Supplier`,
        message: `${user.name} sent a message in RFQ ${rfqId}: "${msgPreview}"`,
        type: "chat",
      });
    } else if (isProcurement) {
      if (threadType === "engineer_procurement") {
        // Procurement sends to engineer
        addNotification({
          role: "engineer",
          userId: rfq?.createdBy,
          rfqId,
          title: `Message from Procurement`,
          message: `Procurement sent a message regarding RFQ ${rfqId}: "${msgPreview}"`,
          type: "chat",
        });
      } else if (threadType === "supplier_procurement" && supplierId) {
        // Procurement sends to supplier (private thread)
        addNotification({
          role: "supplier",
          supplierId,
          rfqId,
          title: `Message from Procurement`,
          message: `Procurement sent a message regarding RFQ ${rfqId}: "${msgPreview}"`,
          type: "chat",
        });
      }
    }

    setText("");
  }

  // Build thread tabs for procurement
  const threadTabs = useMemo(() => {
    if (!isProcurement) return [];
    const tabs: { id: string; label: string; type: ThreadType; supplierId?: string }[] = [
      { id: "engineer", label: "Engineer", type: "engineer_procurement" },
    ];
    assignedSuppliers.forEach((sup) => {
      tabs.push({
        id: sup.id,
        label: sup.name.split(" ")[0], // First word of supplier name
        type: "supplier_procurement",
        supplierId: sup.id,
      });
    });
    return tabs;
  }, [isProcurement, assignedSuppliers]);

  return (
    <div className="flex h-80 flex-col rounded border border-border bg-card">
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">Chat — {rfqId}</p>
          {isSupplierRole && (
            <span className="text-[10px] text-muted-foreground">
              Private thread with Procurement
            </span>
          )}
        </div>
      </div>

      {/* Thread tabs for Procurement */}
      {isProcurement && threadTabs.length > 1 && (
        <div className="border-b border-border px-2 py-1.5">
          <Tabs
            value={
              activeThread.type === "engineer_procurement"
                ? "engineer"
                : activeThread.supplierId || ""
            }
            onValueChange={(val) => {
              if (val === "engineer") {
                setActiveThread({ type: "engineer_procurement" });
              } else {
                setActiveThread({ type: "supplier_procurement", supplierId: val });
              }
            }}
          >
            <TabsList className="h-7 bg-muted/50">
              {threadTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="text-[10px] h-6 px-2"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      <ScrollArea className="flex-1 px-3 py-2">
        {visibleMessages.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-4 text-center">
            No messages yet
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleMessages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col gap-0.5 ${
                  m.senderRole === currentRole ? "items-end" : "items-start"
                }`}
              >
                <span className="text-[10px] text-muted-foreground">
                  {m.sender}
                </span>
                <div
                  className={`max-w-[80%] rounded px-2.5 py-1.5 text-xs ${
                    m.senderRole === currentRole
                      ? "bg-[#00A0E3] text-white"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.message}
                </div>
                <span className="text-[9px] text-muted-foreground">
                  {new Date(m.timestamp).toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {canSend && (
        <div className="flex gap-2 border-t border-border px-3 py-2">
          <Input
            className="h-7 flex-1 text-xs"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button
            size="sm"
            className="h-7 w-7 bg-[#00A0E3] p-0 text-white hover:bg-[#0090cc]"
            onClick={handleSend}
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
