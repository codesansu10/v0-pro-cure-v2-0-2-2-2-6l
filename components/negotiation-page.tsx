"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "./status-badge";
import { ChatPanel } from "./chat-panel";
import { MessageSquare, Edit, Handshake } from "lucide-react";

export function NegotiationPage() {
  const { state, updateQuotation, currentRole } = useStore();
  const [editQuote, setEditQuote] = useState<string | null>(null);
  const [chatRFQId, setChatRFQId] = useState<string | null>(null);
  const [negValues, setNegValues] = useState({ round1: 0, round2: 0, final: 0 });

  const negotiationRFQs = state.rfqs.filter(
    (r) => r.status === "In Negotiation" || r.status === "Final Decision"
  );

  const canEdit = currentRole === "procurement";

  function handleSaveNeg(quotationId: string) {
    updateQuotation(quotationId, {
      negotiationRound1: negValues.round1 || undefined,
      negotiationRound2: negValues.round2 || undefined,
      finalAwardValue: negValues.final || undefined,
    });
    setEditQuote(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Negotiation Center
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Manage negotiation rounds and finalize award values
        </p>
      </div>

      {negotiationRFQs.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Handshake className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              No RFQs in negotiation phase yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        negotiationRFQs.map((rfq) => {
          const quotations = state.quotations.filter(
            (q) => q.rfqId === rfq.id
          );
          return (
            <Card key={rfq.id} className="border-border">
              <CardHeader className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold">
                    <Handshake className="h-3.5 w-3.5" />
                    {rfq.id} — {rfq.project}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={rfq.status} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        setChatRFQId(chatRFQId === rfq.id ? null : rfq.id)
                      }
                    >
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] font-semibold uppercase h-8">
                        Supplier
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase h-8">
                        Original Price
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase h-8">
                        Bonus/Malus
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase h-8">
                        Comparable
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase h-8">
                        Round 1
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase h-8">
                        Round 2
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase h-8">
                        Final Award
                      </TableHead>
                      {canEdit && (
                        <TableHead className="text-[10px] font-semibold uppercase h-8">
                          Actions
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotations.map((q) => {
                      const sup = state.suppliers.find(
                        (s) => s.id === q.supplierId
                      );
                      return (
                        <TableRow key={q.id} className="hover:bg-muted/50">
                          <TableCell className="text-xs font-medium">
                            {sup?.name || "Unknown"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {q.totalPrice.toLocaleString("de-DE")} EUR
                          </TableCell>
                          <TableCell className="text-xs">
                            {q.bonusMalus.toLocaleString("de-DE")} EUR
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {(q.totalPrice + q.bonusMalus).toLocaleString(
                              "de-DE"
                            )}{" "}
                            EUR
                          </TableCell>
                          <TableCell className="text-xs">
                            {q.negotiationRound1
                              ? `${q.negotiationRound1.toLocaleString("de-DE")} EUR`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {q.negotiationRound2
                              ? `${q.negotiationRound2.toLocaleString("de-DE")} EUR`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs font-bold">
                            {q.finalAwardValue
                              ? `${q.finalAwardValue.toLocaleString("de-DE")} EUR`
                              : "—"}
                          </TableCell>
                          {canEdit && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setEditQuote(q.id);
                                  setNegValues({
                                    round1: q.negotiationRound1 || 0,
                                    round2: q.negotiationRound2 || 0,
                                    final: q.finalAwardValue || 0,
                                  });
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}

      {chatRFQId && <ChatPanel rfqId={chatRFQId} />}

      <Dialog open={!!editQuote} onOpenChange={() => setEditQuote(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Update Negotiation Values
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Negotiation Round 1 (EUR)</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                value={negValues.round1 || ""}
                onChange={(e) =>
                  setNegValues({
                    ...negValues,
                    round1: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Negotiation Round 2 (EUR)</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                value={negValues.round2 || ""}
                onChange={(e) =>
                  setNegValues({
                    ...negValues,
                    round2: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Final Award Value (EUR)</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                value={negValues.final || ""}
                onChange={(e) =>
                  setNegValues({
                    ...negValues,
                    final: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setEditQuote(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#00A0E3] text-white text-xs hover:bg-[#0090cc]"
              onClick={() => editQuote && handleSaveNeg(editQuote)}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
