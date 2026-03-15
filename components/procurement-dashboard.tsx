"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { triggerRFQSentToSuppliers, triggerSupplierInvitation } from "@/lib/n8n-webhooks";
import { generateSupplierToken, storeSupplierToken, buildSupplierAccessUrl } from "@/lib/supplier-tokens";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "./status-badge";
import { RFQForm } from "./rfq-form";
import { ChatPanel } from "./chat-panel";
import { SupplierRecommendations } from "./supplier-recommendations";
import {
  FileText,
  Send,
  MessageSquare,
  Edit,
  BarChart3,
  Plus,
  Truck,
  Download,
} from "lucide-react";
import type { RFQStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function ProcurementDashboard() {
  const {
    state,
    updateRFQ,
    assignSupplier,
    addQCS,
    getCurrentUser,
    setCurrentPage,
    addNotification,
  } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [chatRFQId, setChatRFQId] = useState<string | null>(null);
  const [assignDialog, setAssignDialog] = useState<string | null>(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);

  const user = getCurrentUser();

  const totalRFQs = state.rfqs.length;
  const underReview = state.rfqs.filter(
    (r) => r.status === "Under Review"
  ).length;
  const sentToSupplier = state.rfqs.filter(
    (r) => r.status === "Sent to Supplier"
  ).length;
  const quotesReceived = state.rfqs.filter(
    (r) => r.status === "Quote Received"
  ).length;
  const pendingDecision = state.rfqs.filter(
    (r) => r.status === "Final Decision"
  ).length;
  const totalBudget = state.rfqs.reduce((s, r) => s + r.budget, 0);

  function handleStatusChange(rfqId: string, newStatus: RFQStatus) {
    updateRFQ(rfqId, { status: newStatus });
  }

  async function handleAssignSuppliers(rfqId: string) {
    const rfq = state.rfqs.find((r) => r.id === rfqId);
    const supplierDetails: Array<{ supplierId: string; supplierName: string; supplierEmail: string; accessUrl: string }> = [];

    for (const sid of selectedSuppliers) {
      assignSupplier(rfqId, sid);

      // Generate token and access URL for this supplier
      const token = generateSupplierToken(sid, rfqId);
      const accessUrl = buildSupplierAccessUrl(token);

      // Store token in Supabase (fire-and-forget)
      storeSupplierToken(token, sid, rfqId).catch(() => {});

      const supplierData = state.suppliers.find((s) => s.id === sid);

      supplierDetails.push({
        supplierId: sid,
        supplierName: supplierData?.name || sid,
        supplierEmail: supplierData?.email || "",
        accessUrl,
      });

      // Notify each supplier in-app
      addNotification({
        role: "supplier",
        supplierId: sid,
        rfqId,
        title: "New RFQ Received",
        message: `You have received a new RFQ for ${rfq?.project || "Unknown"} - ${rfq?.component || "Unknown"}. Please review and submit your quotation.`,
        type: "rfq",
      });

      // Send individual supplier invitation email via n8n
      triggerSupplierInvitation({
        rfqId,
        project: rfq?.project || "",
        component: rfq?.component || "",
        budget: rfq?.budget || 0,
        deliveryTime: rfq?.deliveryTime || 4,
        supplierId: sid,
        supplierName: supplierData?.name || sid,
        supplierEmail: supplierData?.email || "",
        accessUrl,
        procurementContact: user.email,
      }).catch(() => {});
    }

    // Notify the engineer who created the RFQ
    if (rfq) {
      addNotification({
        role: "engineer",
        userId: rfq.createdBy,
        rfqId,
        title: "RFQ Sent to Suppliers",
        message: `Your RFQ ${rfqId} for ${rfq.project} - ${rfq.component} has been sent to ${selectedSuppliers.length} supplier(s).`,
        type: "rfq",
      });
    }

    handleStatusChange(rfqId, "Sent to Supplier");

    // Send combined webhook for n8n orchestration
    const engineer = (state.users as Array<{ id: string; email?: string }> | undefined)
      ?.find((u) => u.id === rfq?.createdBy) || { email: "m.mueller@thyssenkrupp.com" };
    triggerRFQSentToSuppliers({
      rfqId,
      project: rfq?.project ?? "",
      component: rfq?.component ?? "",
      suppliers: supplierDetails,
      procurementEmail: user.email,
      engineerEmail: engineer.email || "m.mueller@thyssenkrupp.com",
    }).catch(() => {});

    setAssignDialog(null);
    setSelectedSuppliers([]);
  }

  function handleCreateQCS(rfqId: string) {
    const rfq = state.rfqs.find((r) => r.id === rfqId);
    if (!rfq) return;
    const existingQCS = state.qcs.find((q) => q.rfqId === rfqId);
    if (existingQCS) {
      setCurrentPage("qcs");
      return;
    }
    // Create QCS in "draft" status - Procurement must explicitly submit to HoP
    addQCS({
      rfqId,
      createdByUserId: user.id,
      buyer: user.name,
      project: rfq.project,
      pspElement: rfq.pspElement,
      budget: rfq.budget,
      impactSavings: 0,
      comment: "",
      status: "draft",
    });
    setCurrentPage("qcs");
  }

  function handleExportRFQToPDF(rfqId: string) {
    const rfq = state.rfqs.find((r) => r.id === rfqId);
    if (!rfq) return;

    const assignedSuppliers = state.rfqSuppliers
      .filter((rs) => rs.rfqId === rfqId)
      .map((rs) => state.suppliers.find((s) => s.id === rs.supplierId))
      .filter(Boolean);

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>RFQ ${rfq.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #00A0E3; font-size: 24px; margin-bottom: 8px; }
          h2 { color: #333; font-size: 16px; margin-top: 24px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
          .header { margin-bottom: 24px; }
          .meta { color: #666; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { padding: 8px 12px; text-align: left; border: 1px solid #ddd; font-size: 13px; }
          th { background: #f5f5f5; font-weight: 600; }
          .label { color: #666; font-weight: 500; }
          .value { font-weight: 600; }
          .supplier-list { margin-top: 8px; }
          .supplier-item { background: #f9f9f9; padding: 8px 12px; margin-bottom: 4px; border-radius: 4px; }
          .footer { margin-top: 32px; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Request for Quotation</h1>
          <p class="meta">Generated on ${new Date().toLocaleDateString("de-DE")} | Internal Use Only</p>
        </div>
        
        <h2>RFQ Details</h2>
        <table>
          <tr><td class="label">RFQ ID</td><td class="value">${rfq.id}</td></tr>
          <tr><td class="label">Project</td><td class="value">${rfq.project}</td></tr>
          <tr><td class="label">Component</td><td class="value">${rfq.component}</td></tr>
          <tr><td class="label">Quantity</td><td class="value">${rfq.quantity.toLocaleString("de-DE")}</td></tr>
          <tr><td class="label">Budget</td><td class="value">${rfq.budget.toLocaleString("de-DE")} EUR</td></tr>
          <tr><td class="label">Delivery Time</td><td class="value">${rfq.deliveryTime} weeks</td></tr>
          <tr><td class="label">Plant</td><td class="value">${rfq.plant}</td></tr>
          <tr><td class="label">PSP Element</td><td class="value">${rfq.pspElement}</td></tr>
          <tr><td class="label">Request Type</td><td class="value">${rfq.requestType}</td></tr>
          <tr><td class="label">Technical Contact</td><td class="value">${rfq.technicalContact}</td></tr>
          <tr><td class="label">On-site Visit Required</td><td class="value">${rfq.onSiteVisitRequired ? "Yes" : "No"}</td></tr>
          <tr><td class="label">Status</td><td class="value">${rfq.status}</td></tr>
          <tr><td class="label">Created</td><td class="value">${new Date(rfq.createdAt).toLocaleDateString("de-DE")}</td></tr>
        </table>

        <h2>Selected Suppliers (${assignedSuppliers.length})</h2>
        <div class="supplier-list">
          ${assignedSuppliers.length > 0 
            ? assignedSuppliers.map(s => `
              <div class="supplier-item">
                <strong>${s!.name}</strong> (${s!.id})<br/>
                Contact: ${s!.contactPerson} | Email: ${s!.email}<br/>
                Rating: ${s!.rating} | Commodity: ${s!.commodityFocus}
              </div>
            `).join("")
            : "<p>No suppliers assigned yet.</p>"
          }
        </div>

        <div class="footer">
          <p>thyssenkrupp ProCure | Confidential Document</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  }

  function getAvailableActions(rfqId: string, status: RFQStatus) {
    const actions: { label: string; action: () => void; variant?: string; icon: React.ReactNode }[] = [];

    if (status === "Submitted") {
      actions.push({
        label: "Review",
        action: () => handleStatusChange(rfqId, "Under Review"),
        icon: <FileText className="h-3 w-3" />,
      });
    }

    if (status === "Under Review") {
      actions.push({
        label: "Assign Suppliers",
        action: () => setAssignDialog(rfqId),
        icon: <Truck className="h-3 w-3" />,
      });
    }

    if (status === "Quote Received") {
      actions.push({
        label: "Create QCS",
        action: () => handleCreateQCS(rfqId),
        icon: <BarChart3 className="h-3 w-3" />,
      });
      actions.push({
        label: "Negotiate",
        action: () => handleStatusChange(rfqId, "In Negotiation"),
        icon: <MessageSquare className="h-3 w-3" />,
      });
    }

    if (status === "In Negotiation") {
      actions.push({
        label: "Final Decision",
        action: () => handleStatusChange(rfqId, "Final Decision"),
        icon: <Send className="h-3 w-3" />,
      });
    }

    return actions;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Procurement Dashboard
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Manage RFQs, suppliers, and quotations
          </p>
        </div>
        <Button
          size="sm"
          className="bg-[#00A0E3] text-white text-xs hover:bg-[#0090cc]"
          onClick={() => {
            setEditId(null);
            setShowForm(true);
          }}
        >
          <Plus className="mr-1 h-3 w-3" />
          New RFQ
        </Button>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "Total RFQs", value: totalRFQs },
          { label: "Under Review", value: underReview },
          { label: "Sent to Supplier", value: sentToSupplier },
          { label: "Quotes Received", value: quotesReceived },
          { label: "Pending Decision", value: pendingDecision },
          {
            label: "Total Budget",
            value: `${totalBudget.toLocaleString("de-DE")} EUR`,
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-lg font-bold text-foreground">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold">
            <FileText className="h-3.5 w-3.5" />
            All RFQs
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {state.rfqs.length === 0 ? (
            <div className="px-4 pb-6 text-center">
              <p className="text-xs text-muted-foreground">
                No RFQs in the system yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    ID
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Project
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Component
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Qty
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Budget
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Suppliers
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Progress
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.rfqs.map((rfq) => {
                  const rfqSupplierAssignments = state.rfqSuppliers.filter((rs) => rs.rfqId === rfq.id);
                  const assignedSuppliers = rfqSupplierAssignments
                    .map((rs) => state.suppliers.find((s) => s.id === rs.supplierId))
                    .filter((s): s is NonNullable<typeof s> => s != null);
                  const supplierMap = new Map(assignedSuppliers.map((s) => [s.id, s]));
                  
                  // Calculate quotes status
                  const quotedCount = rfqSupplierAssignments.filter((rs) => rs.quoted).length;
                  const totalAssigned = rfqSupplierAssignments.length;
                  const allQuoted = totalAssigned > 0 && quotedCount === totalAssigned;
                  const someQuoted = quotedCount > 0;
                  
                  // Determine effective status based on supplier quotes
                  let effectiveStatus = rfq.status;
                  if (rfq.status === "Sent to Supplier" && someQuoted) {
                    effectiveStatus = "Quote Received";
                  }
                  
                  const actions = getAvailableActions(rfq.id, effectiveStatus);
                  return (
                    <TableRow key={rfq.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-mono">
                        {rfq.id}
                      </TableCell>
                      <TableCell className="text-xs">{rfq.project}</TableCell>
                      <TableCell className="text-xs">{rfq.component}</TableCell>
                      <TableCell className="text-xs">
                        {rfq.quantity.toLocaleString("de-DE")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {rfq.budget.toLocaleString("de-DE")} EUR
                      </TableCell>
                      <TableCell className="text-xs">
                        {assignedSuppliers.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {assignedSuppliers.map((sup) => (
                              <span key={sup.id} className="text-[10px]">{sup.name}</span>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {totalAssigned > 0 ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-col gap-0.5">
                              {rfqSupplierAssignments.map((rs) => {
                                const sup = supplierMap.get(rs.supplierId);
                                if (!sup) return null;
                                return (
                                  <div key={rs.supplierId} className="flex items-center gap-1">
                                    <Badge
                                      className={`text-white text-[9px] px-1.5 py-0 border-0 ${
                                        rs.quoted ? "bg-emerald-600" : "bg-zinc-400"
                                      }`}
                                    >
                                      {rs.quoted ? "Quoted" : "Pending"}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                            <Badge
                              className={`text-white text-[9px] px-1.5 py-0.5 border-0 w-fit ${
                                allQuoted
                                  ? "bg-emerald-600"
                                  : someQuoted
                                  ? "bg-amber-500"
                                  : "bg-zinc-400"
                              }`}
                            >
                              {quotedCount}/{totalAssigned} quoted
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={effectiveStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {actions.map((a) => (
                            <Button
                              key={a.label}
                              variant="ghost"
                              size="sm"
                              className="h-6 gap-1 px-2 text-[10px]"
                              onClick={a.action}
                            >
                              {a.icon}
                              {a.label}
                            </Button>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setEditId(rfq.id);
                              setShowForm(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-2 text-[10px]"
                            onClick={() => handleExportRFQToPDF(rfq.id)}
                            title="Download RFQ as PDF"
                          >
                            <Download className="h-3 w-3" />
                            PDF
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              setChatRFQId(
                                chatRFQId === rfq.id ? null : rfq.id
                              )
                            }
                          >
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {chatRFQId && <ChatPanel rfqId={chatRFQId} />}

      {showForm && (
        <RFQForm
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditId(null);
          }}
          editId={editId}
        />
      )}

      <Dialog
        open={!!assignDialog}
        onOpenChange={() => {
          setAssignDialog(null);
          setSelectedSuppliers([]);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Assign Suppliers — {assignDialog}
            </DialogTitle>
          </DialogHeader>
          {/* AI Recommendation trigger */}
          {assignDialog && (() => {
            const rfq = state.rfqs.find((r) => r.id === assignDialog);
            return rfq ? (
              <div className="flex justify-end">
                <SupplierRecommendations
                  rfq={rfq}
                  suppliers={state.suppliers}
                  onSelect={(ids) => setSelectedSuppliers(ids)}
                />
              </div>
            ) : null;
          })()}
          <div className="flex flex-col gap-3">
            {state.suppliers.map((sup) => (
              <label
                key={sup.id}
                className="flex items-center gap-3 rounded border border-border px-3 py-2 cursor-pointer hover:bg-muted/50"
              >
                <Checkbox
                  checked={selectedSuppliers.includes(sup.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedSuppliers([...selectedSuppliers, sup.id]);
                    } else {
                      setSelectedSuppliers(
                        selectedSuppliers.filter((s) => s !== sup.id)
                      );
                    }
                  }}
                />
                <div>
                  <p className="text-xs font-medium">{sup.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Rating: {sup.rating} | Risk: {sup.riskScore}%
                  </p>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setAssignDialog(null);
                setSelectedSuppliers([]);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#00A0E3] text-white text-xs hover:bg-[#0090cc]"
              onClick={() => assignDialog && handleAssignSuppliers(assignDialog)}
              disabled={selectedSuppliers.length === 0}
            >
              Assign & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
