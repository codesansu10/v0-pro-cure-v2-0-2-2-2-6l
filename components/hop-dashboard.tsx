"use client";

import { useStore } from "@/lib/store";
import { triggerHoPDecision } from "@/lib/n8n-webhooks";
import { generateSupplierToken, storeSupplierToken, buildSupplierAccessUrl } from "@/lib/supplier-tokens";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { HopQCSDetailView } from "./hop-qcs-detail-view";
import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  BarChart3,
  FileText,
  TrendingUp,
  MessageSquare,
  Eye,
} from "lucide-react";
import { TkLogo } from "@/components/tk-logo";
import type { QCSStatus } from "@/lib/types";

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

export function HOPDashboard() {
  const { state, updateQCS, updateRFQ, addNotification } = useStore();
  const [chatRFQId, setChatRFQId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [selectedQcsId, setSelectedQcsId] = useState<string | null>(null);

  const totalRFQs = state.rfqs.length;
  const totalBudget = state.rfqs.reduce((s, r) => s + r.budget, 0);
  const qcsCount = state.qcs.length;
  const approvedCount = state.qcs.filter((q) => q.status === "approved").length;
  const closedRFQs = state.rfqs.filter((r) => r.status === "Closed").length;
  
  // QCS pending approval (for the main table)
  const pendingQCS = state.qcs.filter(
    (q) => q.status === "submitted_for_approval" || q.status === "needs_negotiation"
  );

  // If a QCS is selected, show the detail view
  if (selectedQcsId) {
    return (
      <HopQCSDetailView
        qcsId={selectedQcsId}
        onBack={() => setSelectedQcsId(null)}
      />
    );
  }

  function handleApprove(qcsId: string) {
    const qcs = state.qcs.find((q) => q.id === qcsId);
    if (!qcs) return;
    const rfq = state.rfqs.find((r) => r.id === qcs.rfqId);
    
    updateQCS(qcsId, {
      status: "approved",
      hopDecisionAt: new Date().toISOString(),
    });
    updateRFQ(qcs.rfqId, { status: "Closed" });

    // Notify procurement
    addNotification({
      role: "procurement",
      rfqId: qcs.rfqId,
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
    // Trigger n8n webhook
    const assignedSupplierIdsForHook = state.rfqSuppliers
      .filter((rs) => rs.rfqId === qcs.rfqId)
      .map((rs) => rs.supplierId);
    const supplierNotifications = assignedSupplierIdsForHook.map((sid) => {
      const s = state.suppliers.find((sup) => sup.id === sid);
      const tok = generateSupplierToken(sid, qcs.rfqId);
      const accessUrl = buildSupplierAccessUrl(tok);
      storeSupplierToken(tok, sid, qcs.rfqId).catch(() => {});
      return {
        supplierId: sid,
        supplierName: s?.name || sid,
        supplierEmail: s?.email || "",
        accessUrl,
        awarded: false,
      };
    });
    triggerHoPDecision({
      qcsId,
      rfqId: qcs.rfqId,
      decision: "approved",
      hopEmail: "k.weber@thyssenkrupp.com",
      procurementEmail: "a.schmidt@thyssenkrupp.com",
      engineerEmail: "m.mueller@thyssenkrupp.com",
      supplierNotifications,
    }).catch(() => {});
  }

  function handleReject(qcsId: string) {
    const qcs = state.qcs.find((q) => q.id === qcsId);
    if (!qcs) return;
    const rfq = state.rfqs.find((r) => r.id === qcs.rfqId);
    
    updateQCS(qcsId, {
      status: "rejected",
      hopDecisionAt: new Date().toISOString(),
      hopComment: rejectComment || undefined,
    });

    // Notify procurement
    addNotification({
      role: "procurement",
      rfqId: qcs.rfqId,
      title: "QCS Rejected",
      message: `QCS ${qcsId} for ${rfq?.project || "Unknown"} has been rejected by Head of Procurement.${rejectComment ? ` Comment: "${rejectComment}"` : ""}`,
      type: "decision",
    });
    // Trigger n8n webhook
    const assignedSupplierIdsForRejectHook = state.rfqSuppliers
      .filter((rs) => rs.rfqId === qcs.rfqId)
      .map((rs) => rs.supplierId);
    const rejectSupplierNotifications = assignedSupplierIdsForRejectHook.map((sid) => {
      const s = state.suppliers.find((sup) => sup.id === sid);
      const tok = generateSupplierToken(sid, qcs.rfqId);
      const accessUrl = buildSupplierAccessUrl(tok);
      storeSupplierToken(tok, sid, qcs.rfqId).catch(() => {});
      return {
        supplierId: sid,
        supplierName: s?.name || sid,
        supplierEmail: s?.email || "",
        accessUrl,
        awarded: false,
      };
    });
    triggerHoPDecision({
      qcsId,
      rfqId: qcs.rfqId,
      decision: "rejected",
      comment: rejectComment || undefined,
      hopEmail: "k.weber@thyssenkrupp.com",
      procurementEmail: "a.schmidt@thyssenkrupp.com",
      engineerEmail: "m.mueller@thyssenkrupp.com",
      supplierNotifications: rejectSupplierNotifications,
    }).catch(() => {});

    setRejectDialog(null);
    setRejectComment("");
  }

  function handleRequestNegotiation(qcsId: string) {
    const qcs = state.qcs.find((q) => q.id === qcsId);
    if (!qcs) return;
    const rfq = state.rfqs.find((r) => r.id === qcs.rfqId);
    
    updateQCS(qcsId, {
      status: "needs_negotiation",
      hopDecisionAt: new Date().toISOString(),
    });
    updateRFQ(qcs.rfqId, { status: "In Negotiation" });

    // Notify procurement
    addNotification({
      role: "procurement",
      rfqId: qcs.rfqId,
      title: "QCS Needs Negotiation",
      message: `QCS ${qcsId} for ${rfq?.project || "Unknown"} has been sent back by Head of Procurement for further negotiation.`,
      type: "decision",
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <TkLogo containerClassName="h-7 w-28" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Head of Procurement Dashboard
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Review QCS, approve awards, and monitor procurement pipeline
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total RFQs", value: totalRFQs, icon: FileText },
          {
            label: "Total Budget",
            value: `${totalBudget.toLocaleString("de-DE")} EUR`,
            icon: TrendingUp,
          },
          { label: "QCS Created", value: qcsCount, icon: BarChart3 },
          { label: "Approved", value: approvedCount, icon: CheckCircle },
          { label: "Closed", value: closedRFQs, icon: CheckCircle },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="border-border">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  {kpi.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* QCS Pending Approval */}
      <Card className="border-border">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold">
            <BarChart3 className="h-3.5 w-3.5" />
            QCS Pending Approval
            {pendingQCS.length > 0 && (
              <Badge className="bg-amber-600 text-white text-[10px] border-0 ml-2">
                {pendingQCS.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {pendingQCS.length === 0 ? (
            <div className="px-4 pb-6 text-center">
              <p className="text-xs text-muted-foreground">
                No QCS pending approval.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    QCS ID
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    RFQ ID
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Project
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Created By
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Submitted
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Recommended
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
                {pendingQCS.map((qcs) => {
                  const quotations = state.quotations.filter(
                    (q) => q.rfqId === qcs.rfqId
                  );
                  const supplierInfo = quotations.map((q) => {
                    const s = state.suppliers.find(
                      (sup) => sup.id === q.supplierId
                    );
                    const val =
                      q.finalAwardValue || q.totalPrice + q.bonusMalus;
                    return { name: s?.name || "Unknown", value: val };
                  });

                  const recommended = supplierInfo.sort(
                    (a, b) => a.value - b.value
                  )[0];
                  
                  const createdByUser = state.users.find(
                    (u) => u.id === qcs.createdByUserId
                  );

                  return (
                    <TableRow key={qcs.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-mono">
                        {qcs.id}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {qcs.rfqId}
                      </TableCell>
                      <TableCell className="text-xs">{qcs.project}</TableCell>
                      <TableCell className="text-xs">
                        {createdByUser?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {qcs.submittedToHopAt
                          ? new Date(qcs.submittedToHopAt).toLocaleDateString("de-DE")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {recommended ? (
                          <Badge className="bg-[#00A0E3] text-white text-[10px] border-0">
                            {recommended.name} —{" "}
                            {recommended.value.toLocaleString("de-DE")} EUR
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] border-0 text-white ${statusColors[qcs.status]}`}
                        >
                          {statusLabels[qcs.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-2 text-[10px]"
                            onClick={() => setSelectedQcsId(qcs.id)}
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 gap-1 px-2 text-[10px] bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={() => handleApprove(qcs.id)}
                          >
                            <CheckCircle className="h-3 w-3" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 gap-1 px-2 text-[10px] border-red-600 text-red-600 hover:bg-red-50"
                            onClick={() => setRejectDialog(qcs.id)}
                          >
                            <XCircle className="h-3 w-3" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 gap-1 px-2 text-[10px]"
                            onClick={() => handleRequestNegotiation(qcs.id)}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Negotiate
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              setChatRFQId(
                                chatRFQId === qcs.rfqId ? null : qcs.rfqId
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

      {/* All RFQs overview */}
      <Card className="border-border">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold">
            <FileText className="h-3.5 w-3.5" />
            RFQ Pipeline Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {state.rfqs.length === 0 ? (
            <div className="px-4 pb-6 text-center">
              <p className="text-xs text-muted-foreground">
                No RFQs in the pipeline.
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
                    Budget
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.rfqs.map((rfq) => (
                  <TableRow key={rfq.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-mono">
                      {rfq.id}
                    </TableCell>
                    <TableCell className="text-xs">{rfq.project}</TableCell>
                    <TableCell className="text-xs">
                      {rfq.budget.toLocaleString("de-DE")} EUR
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={rfq.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {chatRFQId && <ChatPanel rfqId={chatRFQId} />}

      {/* Reject Dialog */}
      <Dialog
        open={!!rejectDialog}
        onOpenChange={() => {
          setRejectDialog(null);
          setRejectComment("");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Reject QCS — {rejectDialog}
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
                setRejectDialog(null);
                setRejectComment("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-red-600 text-white text-xs hover:bg-red-700"
              onClick={() => rejectDialog && handleReject(rejectDialog)}
            >
              Reject QCS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
