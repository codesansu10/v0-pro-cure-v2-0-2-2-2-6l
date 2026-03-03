"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";

interface ChatPanelProps {
  rfqId: string;
}

export function ChatPanel({ rfqId }: ChatPanelProps) {
  const { state, addMessage, currentRole, getCurrentUser } = useStore();
  const [text, setText] = useState("");
  const user = getCurrentUser();

  const visibleMessages = state.messages.filter((m) => {
    if (m.rfqId !== rfqId) return false;
    if (currentRole === "hop") return true; // read-only view
    if (currentRole === "engineer") {
      return (
        m.senderRole === "engineer" || m.senderRole === "procurement"
      );
    }
    if (currentRole === "procurement") return true;
    if (currentRole === "supplier_a" || currentRole === "supplier_b") {
      return (
        m.senderRole === currentRole || m.senderRole === "procurement"
      );
    }
    return false;
  });

  const canSend =
    currentRole !== "hop" &&
    !(
      (currentRole === "supplier_a" || currentRole === "supplier_b") &&
      false
    );

  function handleSend() {
    if (!text.trim()) return;
    addMessage({
      rfqId,
      sender: user.name,
      senderRole: currentRole,
      message: text.trim(),
    });
    setText("");
  }

  return (
    <div className="flex h-72 flex-col rounded border border-border bg-card">
      <div className="border-b border-border px-3 py-2">
        <p className="text-xs font-semibold text-foreground">
          Chat — {rfqId}
        </p>
      </div>
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
                  {m.sender} ({m.senderRole})
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
      {canSend && currentRole !== "hop" && (
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
