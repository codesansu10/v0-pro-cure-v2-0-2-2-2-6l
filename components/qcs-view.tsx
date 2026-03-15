"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Download, Send, MessageSquare } from "lucide-react";
import { TkLogo } from "@/components/tk-logo";
import { HopChatPanel } from "@/components/hop-chat-panel";
import type { QCSStatus } from "@/lib/types";
import { useState } from "react";

const statusLabels: Record<QCSStatus, string> = {
  draft: "Draft",
  submitted_for_approval: "Pending HoP Approval",
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

export function QCSView() {
  const { state, updateQCS, updateRFQ, currentRole, getCurrentUser, addNotification } = useStore();
  const [selectedQcsId, setSelectedQcsId] = useState<string | null>(null);
  const user = getCurrentUser();
  const isProcurement = currentRole === "procurement";

  function handleSubmitToHoP(qcsId: string) {
    const qcs = state.qcs.find((q) => q.id === qcsId);
    if (!qcs) return;
    const rfq = state.rfqs.find((r) => r.id === qcs.rfqId);
    
    updateQCS(qcsId, {
      status: "submitted_for_approval",
      submittedToHopAt: new Date().toISOString(),
    });

    // Notify HoP
    addNotification({
      role: "hop",
      rfqId: qcs.rfqId,
      title: "QCS Ready for Approval",
      message: `QCS ${qcsId} for ${rfq?.project || "Unknown"} - ${rfq?.component || "Unknown"} has been submitted for your approval.`,
      type: "qcs",
    });
  }

  function exportToCSV(qcsId: string) {
    const qcs = state.qcs.find((q) => q.id === qcsId);
    if (!qcs) return;
    const rfq = state.rfqs.find((r) => r.id === qcs.rfqId);
    const quotations = state.quotations.filter(
      (q) => q.rfqId === qcs.rfqId
    );
    const suppliers = quotations.map((q) =>
      state.suppliers.find((s) => s.id === q.supplierId)
    );

    let csv = "Quote Comparison Sheet\n";
    csv += `Buyer,${qcs.buyer}\n`;
    csv += `Project,${qcs.project}\n`;
    csv += `PSP Element,${qcs.pspElement}\n`;
    csv += `Budget,${qcs.budget}\n\n`;

    csv += "Criteria," + suppliers.map((s) => s?.name || "Unknown").join(",") + "\n";
    csv += "Rating," + suppliers.map((s) => s?.rating || "-").join(",") + "\n";
    csv += "Approved," + suppliers.map((s) => (s?.approved ? "Yes" : "No")).join(",") + "\n";
    csv += "Commercial Spec," + suppliers.map((s) => (s?.commercialSpecCompliant ? "Yes" : "No")).join(",") + "\n";
    csv += "Capacity," + suppliers.map((s) => (s?.capacityConfirmed ? "Yes" : "No")).join(",") + "\n";
    csv += "Tech Compliance," + suppliers.map((s) => (s?.technicalCompliance ? "Yes" : "No")).join(",") + "\n";
    csv += "Risk Score," + suppliers.map((s) => `${s?.riskScore || 0}%`).join(",") + "\n";
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

  if (state.qcs.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <TkLogo containerClassName="h-7 w-28" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Quote Comparison Sheets
            </h2>
            <p className="text-[11px] text-muted-foreground">
              QCS will appear here once created by Procurement
            </p>
          </div>
        </div>
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <BarChart3 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              No QCS created yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <TkLogo containerClassName="h-7 w-28" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Quote Comparison Sheets
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Compare supplier quotations and make award decisions
          </p>
        </div>
      </div>

      {state.qcs.map((qcs) => {
        const rfq = state.rfqs.find((r) => r.id === qcs.rfqId);
        const quotations = state.quotations.filter(
          (q) => q.rfqId === qcs.rfqId
        );
        const suppliers = quotations.map((q) => ({
          supplier: state.suppliers.find((s) => s.id === q.supplierId),
          quotation: q,
        }));

        const finalValues = suppliers.map(
          (s) =>
            s.quotation.finalAwardValue ||
            s.quotation.totalPrice + s.quotation.bonusMalus
        );
        const lowestFinal = Math.min(...finalValues);

        return (
          <Card key={qcs.id} className="border-border">
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
                  {/* Submit to HoP button - only for Procurement and only for draft QCS */}
                  {isProcurement && qcs.status === "draft" && (
                    <Button
                      size="sm"
                      className="h-6 gap-1 px-2 text-[10px] bg-[#00A0E3] text-white hover:bg-[#0090cc]"
                      onClick={() => handleSubmitToHoP(qcs.id)}
                    >
                      <Send className="h-3 w-3" />
                      Submit to HoP for Approval
                    </Button>
                  )}
                  {/* Re-submit button for needs_negotiation status */}
                  {isProcurement && qcs.status === "needs_negotiation" && (
                    <Button
                      size="sm"
                      className="h-6 gap-1 px-2 text-[10px] bg-[#00A0E3] text-white hover:bg-[#0090cc]"
                      onClick={() => handleSubmitToHoP(qcs.id)}
                    >
                      <Send className="h-3 w-3" />
                      Re-submit to HoP
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[10px]"
                    onClick={() => exportToCSV(qcs.id)}
                  >
                    <Download className="h-3 w-3" />
                    Export QCS to Excel
                  </Button>
                  {/* HoP Chat toggle button - only for Procurement */}
                  {isProcurement && (
                    <Button
                      variant={selectedQcsId === qcs.id ? "default" : "outline"}
                      size="sm"
                      className={`h-6 gap-1 px-2 text-[10px] ${
                        selectedQcsId === qcs.id
                          ? "bg-[#00A0E3] text-white hover:bg-[#0090cc]"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedQcsId(
                          selectedQcsId === qcs.id ? null : qcs.id
                        )
                      }
                    >
                      <MessageSquare className="h-3 w-3" />
                      HoP Chat
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {/* Header Info */}
              <div className="mb-4 grid grid-cols-5 gap-3 rounded border border-border bg-muted/30 p-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Buyer
                  </p>
                  <p className="text-xs font-medium">{qcs.buyer}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Project
                  </p>
                  <p className="text-xs font-medium">{qcs.project}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    PSP Element
                  </p>
                  <p className="text-xs font-medium">{qcs.pspElement}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Budget
                  </p>
                  <p className="text-xs font-medium">
                    {qcs.budget.toLocaleString("de-DE")} EUR
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Impact Savings
                  </p>
                  <p className="text-xs font-medium">
                    {qcs.impactSavings.toLocaleString("de-DE")} EUR
                  </p>
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
                      <TableCell className="text-xs">
                        Commercial Spec Compliant
                      </TableCell>
                      {suppliers.map((s) => (
                        <TableCell
                          key={s.supplier?.id}
                          className="text-xs text-center"
                        >
                          {s.supplier?.commercialSpecCompliant ? "Yes" : "No"}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">
                        Approved Supplier
                      </TableCell>
                      {suppliers.map((s) => (
                        <TableCell
                          key={s.supplier?.id}
                          className="text-xs text-center"
                        >
                          {s.supplier?.approved ? "Yes" : "No"}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">
                        Supplier Rating
                      </TableCell>
                      {suppliers.map((s) => (
                        <TableCell
                          key={s.supplier?.id}
                          className="text-xs text-center font-medium"
                        >
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
                      <TableCell className="text-xs">
                        Capacity Confirmed
                      </TableCell>
                      {suppliers.map((s) => (
                        <TableCell
                          key={s.supplier?.id}
                          className="text-xs text-center"
                        >
                          {s.supplier?.capacityConfirmed ? "Yes" : "No"}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">
                        Technical Compliance
                      </TableCell>
                      {suppliers.map((s) => (
                        <TableCell
                          key={s.supplier?.id}
                          className="text-xs text-center"
                        >
                          {s.supplier?.technicalCompliance ? "Yes" : "No"}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Risk Score</TableCell>
                      {suppliers.map((s) => (
                        <TableCell
                          key={s.supplier?.id}
                          className="text-xs text-center"
                        >
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
                        <TableCell
                          key={s.supplier?.id}
                          className="text-xs text-center"
                        >
                          {s.quotation.paymentTerms}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Incoterms</TableCell>
                      {suppliers.map((s) => (
                        <TableCell
                          key={s.supplier?.id}
                          className="text-xs text-center"
                        >
                          {s.quotation.incoterms}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">
                        Delivery Time (weeks)
                      </TableCell>
                      {suppliers.map((s) => (
                        <TableCell
                          key={s.supplier?.id}
                          className="text-xs text-center"
                        >
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
                      <TableCell className="text-xs">
                        Comparable Price
                      </TableCell>
                      {suppliers.map((s) => (
                        <TableCell
                          key={s.supplier?.id}
                          className="text-xs text-center"
                        >
                          {s.quotation.totalPrice.toLocaleString("de-DE")} EUR
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">Bonus / Malus</TableCell>
                      {suppliers.map((s) => (
                        <TableCell
                          key={s.supplier?.id}
                          className="text-xs text-center"
                        >
                          {s.quotation.bonusMalus.toLocaleString("de-DE")} EUR
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs font-medium">
                        Price incl Bonus/Malus
                      </TableCell>
                      {suppliers.map((s) => (
                        <TableCell
                          key={s.supplier?.id}
                          className="text-xs text-center font-medium"
                        >
                          {(
                            s.quotation.totalPrice + s.quotation.bonusMalus
                          ).toLocaleString("de-DE")}{" "}
                          EUR
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">
                        Negotiation Round 1
                      </TableCell>
                      {suppliers.map((s) => (
                        <TableCell
                          key={s.supplier?.id}
                          className="text-xs text-center"
                        >
                          {s.quotation.negotiationRound1
                            ? `${s.quotation.negotiationRound1.toLocaleString(
                                "de-DE"
                              )} EUR`
                            : "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="text-xs">
                        Negotiation Round 2
                      </TableCell>
                      {suppliers.map((s) => (
                        <TableCell
                          key={s.supplier?.id}
                          className="text-xs text-center"
                        >
                          {s.quotation.negotiationRound2
                            ? `${s.quotation.negotiationRound2.toLocaleString(
                                "de-DE"
                              )} EUR`
                            : "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell className="text-xs font-bold">
                        Final Award Value
                      </TableCell>
                      {suppliers.map((s) => {
                        const val =
                          s.quotation.finalAwardValue ||
                          s.quotation.totalPrice + s.quotation.bonusMalus;
                        const isLowest = val === lowestFinal;
                        return (
                          <TableCell
                            key={s.supplier?.id}
                            className={`text-xs text-center font-bold ${
                              isLowest
                                ? "text-[#00A0E3] bg-[#00A0E3]/10"
                                : ""
                            }`}
                          >
                            {val.toLocaleString("de-DE")} EUR
                            {isLowest && (
                              <span className="ml-1 text-[9px]">
                                (Recommended)
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              )}

              {/* HoP Chat Panel - shown when this QCS is selected for chat */}
              {isProcurement && selectedQcsId === qcs.id && (
                <div className="mt-4 pt-4 border-t border-border">
                  <HopChatPanel qcsId={qcs.id} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
