"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare } from "lucide-react";

interface HopChatPanelProps {
  qcsId: string;
}

/**
 * HoP ↔ Procurement private chat thread
 * - Only visible to HoP and Procurement
 * - Thread is scoped by qcsId
 */
export function HopChatPanel({ qcsId }: HopChatPanelProps) {
  const { state, addMessage, currentRole, getCurrentUser, addNotification } = useStore();
  const [text, setText] = useState("");
  const user = getCurrentUser();

  const isProcurement = currentRole === "procurement";
  const isHoP = currentRole === "hop";
  const canView = isProcurement || isHoP;
  const canSend = canView;

  // Get QCS details for context
  const qcs = state.qcs.find((q) => q.id === qcsId);

  // Filter messages for this QCS hop_procurement thread
  const visibleMessages = useMemo(() => {
    return state.messages.filter(
      (m) => m.threadType === "hop_procurement" && m.qcsId === qcsId
    );
  }, [state.messages, qcsId]);

  function handleSend() {
    if (!text.trim() || !canSend) return;

    addMessage({
      qcsId,
      threadType: "hop_procurement",
      sender: user.name,
      senderId: user.id,
      senderRole: currentRole,
      message: text.trim(),
    });

    const msgPreview = text.trim().substring(0, 50) + (text.trim().length > 50 ? "..." : "");

    if (isProcurement) {
      // Procurement sends to HoP
      addNotification({
        role: "hop",
        qcsId,
        rfqId: qcs?.rfqId,
        title: "New Message from Procurement",
        message: `Procurement sent a message regarding QCS ${qcsId}: "${msgPreview}"`,
        type: "chat",
      });
    } else if (isHoP) {
      // HoP sends to Procurement
      addNotification({
        role: "procurement",
        qcsId,
        rfqId: qcs?.rfqId,
        title: "New Message from HoP",
        message: `Head of Procurement sent a message regarding QCS ${qcsId}: "${msgPreview}"`,
        type: "chat",
      });
    }

    setText("");
  }

  if (!canView) {
    return null;
  }

  return (
    <div className="flex h-80 flex-col rounded border border-border bg-card">
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            HoP Chat — {qcsId}
          </p>
          <span className="text-[10px] text-muted-foreground">
            Private: HoP & Procurement only
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        {visibleMessages.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-4 text-center">
            No messages yet. Start the conversation.
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
            placeholder="Type a message to HoP/Procurement..."
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
