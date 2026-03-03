"use client";

import { useState } from "react";
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
import { StatusBadge } from "./status-badge";
import { RFQForm } from "./rfq-form";
import { ChatPanel } from "./chat-panel";
import {
  FileText,
  Plus,
  MessageSquare,
  Edit,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TkLogo } from "@/components/tk-logo";

export function RFQListPage() {
  const { state, currentRole } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [chatRFQId, setChatRFQId] = useState<string | null>(null);
  const [viewRFQ, setViewRFQ] = useState<string | null>(null);

  const canCreate =
    currentRole === "engineer" || currentRole === "procurement";

  const rfqs =
    currentRole === "engineer"
      ? state.rfqs.filter(
          (r) =>
            r.createdBy ===
            state.users.find((u) => u.role === currentRole)?.id
        )
      : currentRole === "supplier_a" || currentRole === "supplier_b"
      ? state.rfqs.filter((r) => {
          const sup = state.suppliers.find((s) => s.role === currentRole);
          return (
            sup &&
            state.rfqSuppliers.some(
              (rs) => rs.rfqId === r.id && rs.supplierId === sup.id
            )
          );
        })
      : state.rfqs;

  const rfqDetail = viewRFQ ? state.rfqs.find((r) => r.id === viewRFQ) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <TkLogo containerClassName="h-7 w-28" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              RFQ Registry
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {rfqs.length} RFQ{rfqs.length !== 1 ? "s" : ""} visible for your
              role
            </p>
          </div>
        </div>
        {canCreate && (
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
        )}
      </div>

      <Card className="border-border">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold">
            <FileText className="h-3.5 w-3.5" />
            RFQs
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {rfqs.length === 0 ? (
            <div className="px-4 pb-6 text-center">
              <p className="text-xs text-muted-foreground">
                No RFQs to display.
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
                    Delivery
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Type
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Created
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfqs.map((rfq) => (
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
                      {rfq.deliveryTime} wks
                    </TableCell>
                    <TableCell className="text-xs">
                      {rfq.requestType}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={rfq.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(rfq.createdAt).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setViewRFQ(rfq.id)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {rfq.status === "Draft" &&
                          currentRole === "engineer" && (
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
                          )}
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
                ))}
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

      {/* View RFQ Detail */}
      <Dialog open={!!viewRFQ} onOpenChange={() => setViewRFQ(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              RFQ Details — {viewRFQ}
            </DialogTitle>
          </DialogHeader>
          {rfqDetail && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Project:</span>{" "}
                {rfqDetail.project}
              </div>
              <div>
                <span className="text-muted-foreground">Component:</span>{" "}
                {rfqDetail.component}
              </div>
              <div>
                <span className="text-muted-foreground">Quantity:</span>{" "}
                {rfqDetail.quantity.toLocaleString("de-DE")}
              </div>
              <div>
                <span className="text-muted-foreground">Budget:</span>{" "}
                {rfqDetail.budget.toLocaleString("de-DE")} EUR
              </div>
              <div>
                <span className="text-muted-foreground">Delivery:</span>{" "}
                {rfqDetail.deliveryTime} weeks
              </div>
              <div>
                <span className="text-muted-foreground">Plant:</span>{" "}
                {rfqDetail.plant}
              </div>
              <div>
                <span className="text-muted-foreground">PSP Element:</span>{" "}
                {rfqDetail.pspElement}
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>{" "}
                {rfqDetail.requestType}
              </div>
              <div>
                <span className="text-muted-foreground">Technical Contact:</span>{" "}
                {rfqDetail.technicalContact}
              </div>
              <div>
                <span className="text-muted-foreground">On-site Visit:</span>{" "}
                {rfqDetail.onSiteVisitRequired ? "Yes" : "No"}
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <StatusBadge status={rfqDetail.status} />
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>{" "}
                {new Date(rfqDetail.createdAt).toLocaleDateString("de-DE")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
