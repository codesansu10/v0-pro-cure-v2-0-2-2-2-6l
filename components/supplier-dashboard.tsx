"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "./status-badge";
import { ChatPanel } from "./chat-panel";
import { FileText, Send, MessageSquare, Eye } from "lucide-react";

export function SupplierDashboard() {
  const { state, currentRole, addQuotation, updateRFQ } = useStore();
  const [quoteDialog, setQuoteDialog] = useState<string | null>(null);
  const [chatRFQId, setChatRFQId] = useState<string | null>(null);
  const [viewRFQ, setViewRFQ] = useState<string | null>(null);

  const [quoteForm, setQuoteForm] = useState({
    totalPrice: 0,
    bonusMalus: 0,
    deliveryTime: 4,
    paymentTerms: "Net 30",
    incoterms: "EXW",
    comments: "",
  });

  const supplier = state.suppliers.find((s) => s.role === currentRole);
  if (!supplier) return null;

  const assignedRFQIds = state.rfqSuppliers
    .filter((rs) => rs.supplierId === supplier.id)
    .map((rs) => rs.rfqId);

  const myRFQs = state.rfqs.filter((r) => assignedRFQIds.includes(r.id));
  const myQuotations = state.quotations.filter(
    (q) => q.supplierId === supplier.id
  );

  function handleSubmitQuotation(rfqId: string) {
    addQuotation({
      rfqId,
      supplierId: supplier!.id,
      ...quoteForm,
    });
    updateRFQ(rfqId, { status: "Quote Received" });
    setQuoteDialog(null);
    setQuoteForm({
      totalPrice: 0,
      bonusMalus: 0,
      deliveryTime: 4,
      paymentTerms: "Net 30",
      incoterms: "EXW",
      comments: "",
    });
  }

  const rfqDetail = viewRFQ ? state.rfqs.find((r) => r.id === viewRFQ) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Supplier Dashboard — {supplier.name}
        </h2>
        <p className="text-[11px] text-muted-foreground">
          View assigned RFQs and submit quotations
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Assigned RFQs
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-foreground">{myRFQs.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Quotes Submitted
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-foreground">
              {myQuotations.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Rating
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-foreground">{supplier.rating}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold">
            <FileText className="h-3.5 w-3.5" />
            Assigned RFQs
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {myRFQs.length === 0 ? (
            <div className="px-4 pb-6 text-center">
              <p className="text-xs text-muted-foreground">
                No RFQs assigned to you yet.
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
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Quoted
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myRFQs.map((rfq) => {
                  const hasQuoted = myQuotations.some(
                    (q) => q.rfqId === rfq.id
                  );
                  return (
                    <TableRow key={rfq.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-mono">
                        {rfq.id}
                      </TableCell>
                      <TableCell className="text-xs">{rfq.project}</TableCell>
                      <TableCell className="text-xs">
                        {rfq.component}
                      </TableCell>
                      <TableCell className="text-xs">
                        {rfq.quantity.toLocaleString("de-DE")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {rfq.budget.toLocaleString("de-DE")} EUR
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={rfq.status} />
                      </TableCell>
                      <TableCell className="text-xs">
                        {hasQuoted ? (
                          <span className="text-emerald-600 font-medium">
                            Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
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
                          {!hasQuoted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 gap-1 px-2 text-[10px]"
                              onClick={() => setQuoteDialog(rfq.id)}
                            >
                              <Send className="h-3 w-3" />
                              Quote
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {chatRFQId && <ChatPanel rfqId={chatRFQId} />}

      {/* View RFQ Details */}
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quotation Form */}
      <Dialog
        open={!!quoteDialog}
        onOpenChange={() => setQuoteDialog(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Submit Quotation — {quoteDialog}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Total Price (EUR)</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                value={quoteForm.totalPrice || ""}
                onChange={(e) =>
                  setQuoteForm({
                    ...quoteForm,
                    totalPrice: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Bonus / Malus (EUR)</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                value={quoteForm.bonusMalus || ""}
                onChange={(e) =>
                  setQuoteForm({
                    ...quoteForm,
                    bonusMalus: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Delivery Time (weeks)</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                value={quoteForm.deliveryTime || ""}
                onChange={(e) =>
                  setQuoteForm({
                    ...quoteForm,
                    deliveryTime: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Payment Terms</Label>
              <Select
                value={quoteForm.paymentTerms}
                onValueChange={(v) =>
                  setQuoteForm({ ...quoteForm, paymentTerms: v })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 30" className="text-xs">
                    Net 30
                  </SelectItem>
                  <SelectItem value="Net 60" className="text-xs">
                    Net 60
                  </SelectItem>
                  <SelectItem value="Net 90" className="text-xs">
                    Net 90
                  </SelectItem>
                  <SelectItem value="Prepaid" className="text-xs">
                    Prepaid
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Incoterms</Label>
              <Select
                value={quoteForm.incoterms}
                onValueChange={(v) =>
                  setQuoteForm({ ...quoteForm, incoterms: v })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FOB", "CIF"].map(
                    (term) => (
                      <SelectItem key={term} value={term} className="text-xs">
                        {term}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Comments</Label>
              <Textarea
                className="text-xs min-h-16"
                value={quoteForm.comments}
                onChange={(e) =>
                  setQuoteForm({ ...quoteForm, comments: e.target.value })
                }
                placeholder="Additional comments..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setQuoteDialog(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#00A0E3] text-white text-xs hover:bg-[#0090cc]"
              onClick={() => quoteDialog && handleSubmitQuotation(quoteDialog)}
              disabled={quoteForm.totalPrice <= 0}
            >
              Submit Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
