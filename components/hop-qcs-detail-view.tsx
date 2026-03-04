"use client";

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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Download, ArrowLeft, CheckCircle, XCircle, RotateCcw, MessageSquare } from "lucide-react";
import { TkLogo } from "@/components/tk-logo";
import { HopChatPanel } from "@/components/hop-chat-panel";
import type { QCSStatus } from "@/lib/types";
import { useState } from "react";

const statusLabels: Record<QCSStatus, string> = {
  draft: "Draft",
  submitted_for_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  needs_negotiation: "Needs Negotiation",
};

const statusColors: Record<QCSStatus, string> = {
  draft: "bg-zinc-500",
  submitted_for_approval: "bg-amber-600",
  approved: "bg-emerald-600",
  rejected: "bg-red-600",
  needs_negotiation: "bg-orange-600",
};

interface HopQCSDetailViewProps {
  qcsId: string;
  onBack: () => void;
}

export function HopQCSDetailView({ qcsId, onBack }: HopQCSDetailViewProps) {
  const { state, updateQCS, updateRFQ, addNotification } = useStore();
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  const qcs = state.qcs.find((q) => q.id === qcsId);
  
  if (!qcs) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="w-fit gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" />
          Back
        </Button>
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <p className="text-xs text-muted-foreground">QCS not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rfq = state.rfqs.find((r) => r.id === qcs.rfqId);
  const quotations = state.quotations.filter((q) => q.rfqId === qcs.rfqId);
  const suppliers = quotations.map((q) => ({
    supplier: state.suppliers.find((s) => s.id === q.supplierId),
    quotation: q,
  }));
  const finalValues = suppliers.map(
    (s) => s.quotation.finalAwardValue || s.quotation.totalPrice + s.quotation.bonusMalus
  );
  const lowestFinal = Math.min(...finalValues);

  function handleApprove() {
    updateQCS(qcsId, {
      status: "approved",
      hopDecisionAt: new Date().toISOString(),
    });
    updateRFQ(qcs.rfqId, { status: "Closed" });

    // Notify procurement
    addNotification({
      role: "procurement",
      rfqId: qcs.rfqId,
      qcsId,
      title: "QCS Approved",
      message: `QCS ${qcsId} for ${rfq?.project || "Unknown"} has been approved by Head of Procurement.`,
      type: "decision",
    });

    // Notify engineer
    if (rfq) {
      addNotification({
        role: "engineer",
        userId: rfq.createdBy,
        rfqId: qcs.rfqId,
        title: "RFQ Decision Update",
        message: `Your RFQ ${qcs.rfqId} for ${rfq.project} - ${rfq.component} has been approved and closed.`,
        type: "decision",
      });

      // Notify assigned suppliers
      const assignedSupplierIds = state.rfqSuppliers
        .filter((rs) => rs.rfqId === qcs.rfqId)
        .map((rs) => rs.supplierId);

      assignedSupplierIds.forEach((supplierId) => {
        addNotification({
          role: "supplier",
          supplierId,
          rfqId: qcs.rfqId,
          title: "Award Outcome",
          message: `A decision has been made for RFQ ${qcs.rfqId} - ${rfq.project}. Please check the results.`,
          type: "decision",
        });
      });
    }

    onBack();
  }

  function handleReject() {
    updateQCS(qcsId, {
      status: "rejected",
      hopDecisionAt: new Date().toISOString(),
      hopComment: rejectComment || undefined,
    });

    addNotification({
      role: "procurement",
      rfqId: qcs.rfqId,
      qcsId,
      title: "QCS Rejected",
      message: `QCS ${qcsId} for ${rfq?.project || "Unknown"} has been rejected by Head of Procurement.${rejectComment ? ` Comment: "${rejectComment}"` : ""}`,
      type: "decision",
    });

    setRejectDialog(false);
    setRejectComment("");
    onBack();
  }

  function handleRequestNegotiation() {
    updateQCS(qcsId, {
      status: "needs_negotiation",
      hopDecisionAt: new Date().toISOString(),
    });
    updateRFQ(qcs.rfqId, { status: "In Negotiation" });

    addNotification({
      role: "procurement",
      rfqId: qcs.rfqId,
      qcsId,
      title: "QCS Needs Negotiation",
      message: `QCS ${qcsId} for ${rfq?.project || "Unknown"} has been sent back by Head of Procurement for further negotiation.`,
      type: "decision",
    });

    onBack();
  }

  function exportToCSV() {
    let csv = "Quote Comparison Sheet\n";
    csv += `Buyer,${qcs.buyer}\n`;
    csv += `Project,${qcs.project}\n`;
    csv += `PSP Element,${qcs.pspElement}\n`;
    csv += `Budget,${qcs.budget}\n\n`;

    csv += "Criteria," + suppliers.map((s) => s.supplier?.name || "Unknown").join(",") + "\n";
    csv += "Rating," + suppliers.map((s) => s.supplier?.rating || "-").join(",") + "\n";
    csv += "Approved," + suppliers.map((s) => (s.supplier?.approved ? "Yes" : "No")).join(",") + "\n";
    csv += "Commercial Spec," + suppliers.map((s) => (s.supplier?.commercialSpecCompliant ? "Yes" : "No")).join(",") + "\n";
    csv += "Capacity," + suppliers.map((s) => (s.supplier?.capacityConfirmed ? "Yes" : "No")).join(",") + "\n";
    csv += "Tech Compliance," + suppliers.map((s) => (s.supplier?.technicalCompliance ? "Yes" : "No")).join(",") + "\n";
    csv += "Risk Score," + suppliers.map((s) => `${s.supplier?.riskScore || 0}%`).join(",") + "\n";
    csv += "Payment Terms," + quotations.map((q) => q.paymentTerms).join(",") + "\n";
    csv += "Incoterms," + quotations.map((q) => q.incoterms).join(",") + "\n";
    csv += "Delivery (wks)," + quotations.map((q) => q.deliveryTime).join(",") + "\n";
    csv += "Total Price," + quotations.map((q) => q.totalPrice).join(",") + "\n";
    csv += "Bonus/Malus," + quotations.map((q) => q.bonusMalus).join(",") + "\n";
    csv += "Comparable Price," + quotations.map((q) => q.totalPrice + q.bonusMalus).join(",") + "\n";
    csv += "Negotiation R1," + quotations.map((q) => q.negotiationRound1 || "-").join(",") + "\n";
    csv += "Negotiation R2," + quotations.map((q) => q.negotiationRound2 || "-").join(",") + "\n";
    csv += "Final Award," + quotations.map((q) => q.finalAwardValue || (q.totalPrice + q.bonusMalus)).join(",") + "\n";

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QCS-${qcsId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const canDecide = qcs.status === "submitted_for_approval" || qcs.status === "needs_negotiation";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" />
          Back to Dashboard
        </Button>
        <TkLogo containerClassName="h-7 w-28" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            QCS Review — {qcsId}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Review and approve supplier quotation comparison
          </p>
        </div>
      </div>

      <Tabs defaultValue="qcs" className="w-full">
        <TabsList className="h-8">
          <TabsTrigger value="qcs" className="text-xs h-7 gap-1">
            <BarChart3 className="h-3 w-3" />
            QCS Details
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-xs h-7 gap-1">
            <MessageSquare className="h-3 w-3" />
            HoP Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qcs" className="mt-4">
          <Card className="border-border">
            <CardHeader className="px-4 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {qcs.id} — {qcs.project}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    className={`text-[10px] border-0 text-white ${statusColors[qcs.status]}`}
                  >
                    {statusLabels[qcs.status]}
                  </Badge>
                  {canDecide && (
                    <>
                      <Button
                        size="sm"
                        className="h-6 gap-1 px-2 text-[10px] bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={handleApprove}
                      >
                        <CheckCircle className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 gap-1 px-2 text-[10px] border-red-600 text-red-600 hover:bg-red-50"
                        onClick={() => setRejectDialog(true)}
                      >
                        <XCircle className="h-3 w-3" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 gap-1 px-2 text-[10px]"
                        onClick={handleRequestNegotiation}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Request Negotiation
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[10px]"
                    onClick={exportToCSV}
                  >
                    <Download className="h-3 w-3" />
                    Export QCS
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {/* Header Info */}
              <div className="mb-4 grid grid-cols-5 gap-3 rounded border border-border bg-muted/30 p-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Buyer</p>
                  <p className="text-xs font-medium">{qcs.buyer}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Project</p>
                  <p className="text-xs font-medium">{qcs.project}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">PSP Element</p>
                  <p className="text-xs font-medium">{qcs.pspElement}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Budget</p>
                  <p className="text-xs font-medium">{qcs.budget.toLocaleString("de-DE")} EUR</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Impact Savings</p>
                  <p className="text-xs font-medium">{qcs.impactSavings.toLocaleString("de-DE")} EUR</p>
                </div>
              </div>

              {quotations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No quotations submitted for this RFQ yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] font-semibold uppercase h-8 w-48">
                        Evaluation Criteria
                      </TableHead>
                      {suppliers.map((s) => (
                        <TableHead
                          key={s.supplier?.id}
                          className="text-[10px] font-semibold uppercase h-8 text-center"
                        >
                          {s.supplier?.name || "Unknown"}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Supplier General */}
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell
                        colSpan={suppliers.length + 1}
                        className="text-[10px] font-bold uppercase text-[#00A0E3]"
                      >
                        Supplier General
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Commercial Spec Compliant</TableCell>
                      {suppliers.map((s) => (
                        <TableCell key={s.supplier?.id} className="text-xs text-center">
                          {s.supplier?.commercialSpecCompliant ? "Yes" : "No"}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Approved Supplier</TableCell>
                      {suppliers.map((s) => (
                        <TableCell key={s.supplier?.id} className="text-xs text-center">
                          {s.supplier?.approved ? "Yes" : "No"}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Supplier Rating</TableCell>
                      {suppliers.map((s) => (
                        <TableCell key={s.supplier?.id} className="text-xs text-center font-medium">
                          {s.supplier?.rating || "-"}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Technical */}
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell
                        colSpan={suppliers.length + 1}
                        className="text-[10px] font-bold uppercase text-[#00A0E3]"
                      >
                        Technical
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Capacity Confirmed</TableCell>
                      {suppliers.map((s) => (
                        <TableCell key={s.supplier?.id} className="text-xs text-center">
                          {s.supplier?.capacityConfirmed ? "Yes" : "No"}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Technical Compliance</TableCell>
                      {suppliers.map((s) => (
                        <TableCell key={s.supplier?.id} className="text-xs text-center">
                          {s.supplier?.technicalCompliance ? "Yes" : "No"}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Risk Score</TableCell>
                      {suppliers.map((s) => (
                        <TableCell key={s.supplier?.id} className="text-xs text-center">
                          {s.supplier?.riskScore || 0}%
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Commercial */}
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell
                        colSpan={suppliers.length + 1}
                        className="text-[10px] font-bold uppercase text-[#00A0E3]"
                      >
                        Commercial
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Payment Terms</TableCell>
                      {suppliers.map((s) => (
                        <TableCell key={s.supplier?.id} className="text-xs text-center">
                          {s.quotation.paymentTerms}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Incoterms</TableCell>
                      {suppliers.map((s) => (
                        <TableCell key={s.supplier?.id} className="text-xs text-center">
                          {s.quotation.incoterms}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Delivery Time (weeks)</TableCell>
                      {suppliers.map((s) => (
                        <TableCell key={s.supplier?.id} className="text-xs text-center">
                          {s.quotation.deliveryTime}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Price Section */}
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell
                        colSpan={suppliers.length + 1}
                        className="text-[10px] font-bold uppercase text-[#00A0E3]"
                      >
                        Price Section
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Comparable Price</TableCell>
                      {suppliers.map((s) => (
                        <TableCell key={s.supplier?.id} className="text-xs text-center">
                          {s.quotation.totalPrice.toLocaleString("de-DE")} EUR
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Bonus / Malus</TableCell>
                      {suppliers.map((s) => (
                        <TableCell key={s.supplier?.id} className="text-xs text-center">
                          {s.quotation.bonusMalus.toLocaleString("de-DE")} EUR
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs font-medium">Price incl Bonus/Malus</TableCell>
                      {suppliers.map((s) => (
                        <TableCell key={s.supplier?.id} className="text-xs text-center font-medium">
                          {(s.quotation.totalPrice + s.quotation.bonusMalus).toLocaleString("de-DE")} EUR
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Negotiation Round 1</TableCell>
                      {suppliers.map((s) => (
                        <TableCell key={s.supplier?.id} className="text-xs text-center">
                          {s.quotation.negotiationRound1
                            ? `${s.quotation.negotiationRound1.toLocaleString("de-DE")} EUR`
                            : "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Negotiation Round 2</TableCell>
                      {suppliers.map((s) => (
                        <TableCell key={s.supplier?.id} className="text-xs text-center">
                          {s.quotation.negotiationRound2
                            ? `${s.quotation.negotiationRound2.toLocaleString("de-DE")} EUR`
                            : "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell className="text-xs font-bold">Final Award Value</TableCell>
                      {suppliers.map((s) => {
                        const val =
                          s.quotation.finalAwardValue ||
                          s.quotation.totalPrice + s.quotation.bonusMalus;
                        const isLowest = val === lowestFinal;
                        return (
                          <TableCell
                            key={s.supplier?.id}
                            className={`text-xs text-center font-bold ${
                              isLowest ? "text-[#00A0E3] bg-[#00A0E3]/10" : ""
                            }`}
                          >
                            {val.toLocaleString("de-DE")} EUR
                            {isLowest && (
                              <span className="ml-1 text-[9px]">(Recommended)</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <HopChatPanel qcsId={qcsId} />
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog}
        onOpenChange={() => {
          setRejectDialog(false);
          setRejectComment("");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Reject QCS — {qcsId}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs">Comment (optional)</Label>
              <Input
                placeholder="Enter reason for rejection..."
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                className="text-xs mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setRejectDialog(false);
                setRejectComment("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-red-600 text-white text-xs hover:bg-red-700"
              onClick={handleReject}
            >
              Reject QCS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
