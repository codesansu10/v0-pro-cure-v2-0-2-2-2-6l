"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";
import { fetchSupplierRFQs } from "@/lib/supabase-data";
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
import { TkLogo } from "@/components/tk-logo";
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
  
  // Local state for realtime-updated data
  const [realtimeRFQSuppliers, setRealtimeRFQSuppliers] = useState(state.rfqSuppliers);
  
  // Get current supplier
  const supplier = state.suppliers.find((s) => s.role === currentRole);
  
  // Subscribe to realtime changes on rfq_suppliers for this supplier
  useEffect(() => {
    if (!supplier) return;
    
    // Sync local state with store state initially
    setRealtimeRFQSuppliers(state.rfqSuppliers);
    
    // Set up realtime subscription filtered by supplier_id
    const channel = supabase
      .channel(`rfq_suppliers_${supplier.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rfq_suppliers",
          filter: `supplier_id=eq.${supplier.id}`,
        },
        async (payload) => {
          // Refresh supplier's RFQ assignments from Supabase
          const updated = await fetchSupplierRFQs(supplier.id);
          const assignments = updated.map((u) => u.assignment);
          setRealtimeRFQSuppliers((prev) => {
            // Merge: keep assignments for other suppliers, update this supplier's
            const otherSuppliers = prev.filter((rs) => rs.supplierId !== supplier.id);
            return [...otherSuppliers, ...assignments];
          });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supplier?.id, state.rfqSuppliers]);

  // Early return if no supplier found
  if (!supplier) return null;

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

  // Use realtime-updated rfqSuppliers for live updates
  const assignedRFQIds = realtimeRFQSuppliers
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
      <div className="flex items-center gap-4">
        <TkLogo containerClassName="h-7 w-28" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Supplier Dashboard — {supplier.name}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            View assigned RFQs and submit quotations
          </p>
        </div>
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
                  // Get the supplier-specific assignment record from realtime data
                  const supplierAssignment = realtimeRFQSuppliers.find(
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Submit Quotation — {quoteDialog}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {/* Line Items Section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Price Positions</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[10px]"
                  onClick={addLineItem}
                >
                  <Plus className="h-3 w-3" />
                  Add Position
                </Button>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] font-semibold uppercase h-8 w-36">Item Name</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase h-8">Description</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase h-8 w-20">Qty</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase h-8 w-28">Unit Price</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase h-8 w-28">Total</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase h-8 w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, index) => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell className="p-1">
                          <Input
                            className="h-7 text-xs"
                            placeholder="Item name"
                            value={item.itemName}
                            onChange={(e) => handleLineItemChange(index, "itemName", e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            className="h-7 text-xs"
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => handleLineItemChange(index, "description", e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            className="h-7 text-xs"
                            type="number"
                            min="1"
                            value={item.quantity || ""}
                            onChange={(e) => handleLineItemChange(index, "quantity", e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            className="h-7 text-xs"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice || ""}
                            onChange={(e) => handleLineItemChange(index, "unitPrice", e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="p-1 text-xs font-medium">
                          {item.totalPrice.toLocaleString("de-DE")} EUR
                        </TableCell>
                        <TableCell className="p-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => removeLineItem(index)}
                            disabled={lineItems.length === 1}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <div className="bg-muted/50 px-3 py-2 rounded text-xs">
                  <span className="text-muted-foreground">Total Price: </span>
                  <span className="font-bold">{calculatedTotalPrice.toLocaleString("de-DE")} EUR</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            </div>

            {/* File Upload Section */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Upload Quotation PDF</Label>
                <div className="relative">
                  <Input
                    type="file"
                    accept=".pdf"
                    className="h-8 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-muted file:text-foreground"
                    onChange={(e) => setQuotationPdf(e.target.files?.[0] || null)}
                  />
                  {quotationPdf && (
                    <p className="text-[10px] text-emerald-600 mt-1">
                      {quotationPdf.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Supporting Documents</Label>
                <div className="relative">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="h-8 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-muted file:text-foreground"
                    onChange={(e) => setSupportingDocs(e.target.files?.[0] || null)}
                  />
                  {supportingDocs && (
                    <p className="text-[10px] text-emerald-600 mt-1">
                      {supportingDocs.name}
                    </p>
                  )}
                </div>
              </div>
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
