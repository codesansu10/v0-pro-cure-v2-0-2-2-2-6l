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
import { ChatPanel } from "./chat-panel";
import { FileText, Send, MessageSquare, Eye, Plus, Trash2, Upload } from "lucide-react";
import type { QuotationLineItem, RFQSupplierStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

// Status colors for supplier-specific RFQ status
const supplierStatusColors: Record<RFQSupplierStatus, string> = {
  "RFQ Received": "bg-[#00A0E3]",
  "Quotation Submitted": "bg-emerald-600",
  "Under Evaluation": "bg-amber-600",
  "Awarded": "bg-emerald-600",
  "Not Awarded": "bg-zinc-500",
  "Withdrawn": "bg-red-600",
};

export function SupplierDashboard() {
  const { state, currentRole, addQuotation, updateRFQSupplier, addNotification } = useStore();
  const [quoteDialog, setQuoteDialog] = useState<string | null>(null);
  const [chatRFQId, setChatRFQId] = useState<string | null>(null);
  const [viewRFQ, setViewRFQ] = useState<string | null>(null);

  const emptyLineItem = (): QuotationLineItem => ({
    id: `LI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    itemName: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
  });

  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([emptyLineItem()]);
  const [quotationPdf, setQuotationPdf] = useState<File | null>(null);
  const [supportingDocs, setSupportingDocs] = useState<File | null>(null);

  const [quoteForm, setQuoteForm] = useState({
    bonusMalus: 0,
    deliveryTime: 4,
    paymentTerms: "Net 30",
    incoterms: "EXW",
    comments: "",
  });

  const calculatedTotalPrice = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

  function handleLineItemChange(index: number, field: keyof QuotationLineItem, value: string | number) {
    const updated = [...lineItems];
    if (field === "quantity" || field === "unitPrice") {
      const numVal = typeof value === "string" ? parseFloat(value) || 0 : value;
      updated[index] = { ...updated[index], [field]: numVal };
      updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice;
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setLineItems(updated);
  }

  function addLineItem() {
    setLineItems([...lineItems, emptyLineItem()]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  }

  const supplier = state.suppliers.find((s) => s.role === currentRole);
  if (!supplier) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Supplier Dashboard
          </h2>
          <p className="text-[11px] text-muted-foreground">
            View assigned RFQs and submit quotations
          </p>
        </div>
        <Card className="border-border">
          <CardContent className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Supplier profile not found. Please contact the procurement team.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assignedRFQIds = state.rfqSuppliers
    .filter((rs) => rs.supplierId === supplier.id)
    .map((rs) => rs.rfqId);

  const myRFQs = state.rfqs.filter((r) => assignedRFQIds.includes(r.id));
  const myQuotations = state.quotations.filter(
    (q) => q.supplierId === supplier.id
  );

  function handleSubmitQuotation(rfqId: string) {
    const rfq = state.rfqs.find((r) => r.id === rfqId);
    addQuotation({
      rfqId,
      supplierId: supplier!.id,
      totalPrice: calculatedTotalPrice,
      lineItems: lineItems.filter(li => li.itemName.trim() !== ""),
      quotationPdfUrl: quotationPdf ? URL.createObjectURL(quotationPdf) : undefined,
      supportingDocsUrl: supportingDocs ? URL.createObjectURL(supportingDocs) : undefined,
      ...quoteForm,
    });
    // Update only this supplier's status - not the global RFQ status
    updateRFQSupplier(rfqId, supplier!.id, { 
      status: "Quotation Submitted", 
      quoted: true 
    });
    // Notify procurement
    addNotification({
      role: "procurement",
      rfqId,
      title: `Quote Received from ${supplier!.name}`,
      message: `${supplier!.name} submitted a quotation of ${calculatedTotalPrice.toLocaleString("de-DE")} EUR for ${rfq?.project || "Unknown"} - ${rfq?.component || "Unknown"}.`,
      type: "quote",
    });
    setQuoteDialog(null);
    setLineItems([emptyLineItem()]);
    setQuotationPdf(null);
    setSupportingDocs(null);
    setQuoteForm({
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
                  // Get the supplier-specific assignment record for this RFQ
                  const supplierAssignment = state.rfqSuppliers.find(
                    (rs) => rs.rfqId === rfq.id && rs.supplierId === supplier.id
                  );
                  const supplierStatus = supplierAssignment?.status || "RFQ Received";
                  const hasQuoted = supplierAssignment?.quoted || false;
                  
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
                        <Badge className={`${supplierStatusColors[supplierStatus]} text-white text-[10px] border-0`}>
                          {supplierStatus}
                        </Badge>
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
        <DialogContent className="max-w-6xl flex flex-col max-h-[95vh] p-0 gap-0">
          <DialogHeader className="px-8 pt-6 pb-4 border-b border-border shrink-0">
            <DialogTitle className="text-2xl font-bold">
              Submit Quotation — {quoteDialog}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-8 py-6">
            {/* Line Items Section */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-lg font-bold">Price Positions</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-11 gap-2 px-4 text-base font-medium"
                  onClick={addLineItem}
                >
                  <Plus className="h-5 w-5" />
                  Add Position
                </Button>
              </div>
              <div className="border border-border rounded-lg overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-slate-100 border-b-2 border-slate-300">
                        <TableHead className="text-base font-bold uppercase h-14 w-1/5 px-6 py-4">Item Name</TableHead>
                        <TableHead className="text-base font-bold uppercase h-14 w-1/4 px-6 py-4">Description</TableHead>
                        <TableHead className="text-base font-bold uppercase h-14 w-20 px-4 py-4 text-center">Qty</TableHead>
                        <TableHead className="text-base font-bold uppercase h-14 w-40 px-6 py-4 text-right">Unit Price</TableHead>
                        <TableHead className="text-base font-bold uppercase h-14 w-40 px-6 py-4 text-right">Total</TableHead>
                        <TableHead className="text-base font-bold uppercase h-14 w-20 px-4 py-4 text-center"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-blue-50 border-b border-slate-200 transition-colors">
                          <TableCell className="p-4">
                            <Input
                              className="h-12 text-base font-medium border-slate-300 focus:border-blue-500"
                              placeholder="e.g., Steel Plate"
                              value={item.itemName}
                              onChange={(e) => handleLineItemChange(index, "itemName", e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="p-4">
                            <Input
                              className="h-12 text-base border-slate-300 focus:border-blue-500"
                              placeholder="e.g., Raw Material"
                              value={item.description}
                              onChange={(e) => handleLineItemChange(index, "description", e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="p-4">
                            <Input
                              className="h-12 text-base text-center font-bold border-slate-300 focus:border-blue-500"
                              type="number"
                              min="1"
                              placeholder="1"
                              value={item.quantity || ""}
                              onChange={(e) => handleLineItemChange(index, "quantity", e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="p-4">
                            <Input
                              className="h-12 text-base text-right font-bold border-slate-300 focus:border-blue-500"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={item.unitPrice || ""}
                              onChange={(e) => handleLineItemChange(index, "unitPrice", e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="p-4 text-right">
                            <div className="text-base font-bold text-slate-900">
                              {(item.totalPrice || 0).toLocaleString("de-DE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              EUR
                            </div>
                          </TableCell>
                          <TableCell className="p-4 text-center">
                            {lineItems.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 hover:bg-red-100 hover:text-red-700 rounded transition-colors"
                                onClick={() => removeLineItem(index)}
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 w-full max-w-md">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-lg font-bold text-slate-700">Total Price:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {calculatedTotalPrice.toLocaleString("de-DE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      EUR
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="flex flex-col gap-2">
                <Label className="text-base font-semibold">Bonus / Malus (EUR)</Label>
                <Input
                  className="h-11 text-base"
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
              <div className="flex flex-col gap-2">
                <Label className="text-base font-semibold">Delivery Time (weeks)</Label>
                <Input
                  className="h-11 text-base"
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
            </div>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="flex flex-col gap-2">
                <Label className="text-base font-semibold">Payment Terms</Label>
                <Select
                  value={quoteForm.paymentTerms}
                  onValueChange={(v) =>
                    setQuoteForm({ ...quoteForm, paymentTerms: v })
                  }
                >
                  <SelectTrigger className="h-11 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Net 30" className="text-base">
                      Net 30
                    </SelectItem>
                    <SelectItem value="Net 60" className="text-base">
                      Net 60
                    </SelectItem>
                    <SelectItem value="Net 90" className="text-base">
                      Net 90
                    </SelectItem>
                    <SelectItem value="Prepaid" className="text-base">
                      Prepaid
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-base font-semibold">Incoterms</Label>
                <Select
                  value={quoteForm.incoterms}
                  onValueChange={(v) =>
                    setQuoteForm({ ...quoteForm, incoterms: v })
                  }
                >
                  <SelectTrigger className="h-11 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FOB", "CIF"].map(
                      (term) => (
                        <SelectItem key={term} value={term} className="text-base">
                          {term}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="flex flex-col gap-2">
                <Label className="text-base font-semibold">Upload Quotation PDF</Label>
                <div className="relative">
                  <Input
                    type="file"
                    accept=".pdf"
                    className="h-11 text-base file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:bg-muted file:text-foreground"
                    onChange={(e) => setQuotationPdf(e.target.files?.[0] || null)}
                  />
                  {quotationPdf && (
                    <p className="text-sm text-emerald-600 mt-1">
                      {quotationPdf.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-base font-semibold">Supporting Documents</Label>
                <div className="relative">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="h-11 text-base file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:bg-muted file:text-foreground"
                    onChange={(e) => setSupportingDocs(e.target.files?.[0] || null)}
                  />
                  {supportingDocs && (
                    <p className="text-sm text-emerald-600 mt-1">
                      {supportingDocs.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-base font-semibold">Comments</Label>
              <Textarea
                className="text-base min-h-24"
                value={quoteForm.comments}
                onChange={(e) =>
                  setQuoteForm({ ...quoteForm, comments: e.target.value })
                }
                placeholder="Additional comments..."
              />
            </div>
          </div>
          <DialogFooter className="px-8 py-4 border-t border-border shrink-0 bg-slate-50">
            <Button
              variant="outline"
              className="text-base h-11 px-8"
              onClick={() => setQuoteDialog(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#00A0E3] text-white text-base h-11 px-8 hover:bg-[#0090cc]"
              onClick={() => quoteDialog && handleSubmitQuotation(quoteDialog)}
              disabled={calculatedTotalPrice <= 0}
            >
              Submit Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
