"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import { Archive, Search, Filter, Eye, FileText, Download } from "lucide-react";
import { TkLogo } from "@/components/tk-logo";

export function QuotationArchive() {
  const { state } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");
  const [filterRFQ, setFilterRFQ] = useState<string>("all");
  const [viewQuotation, setViewQuotation] = useState<string | null>(null);

  // Get unique supplier IDs that have quotations
  const supplierIdsWithQuotes = [...new Set(state.quotations.map((q) => q.supplierId))];
  const suppliersWithQuotes = state.suppliers.filter((s) =>
    supplierIdsWithQuotes.includes(s.id)
  );

  // Get unique RFQ IDs that have quotations
  const rfqIdsWithQuotes = [...new Set(state.quotations.map((q) => q.rfqId))];
  const rfqsWithQuotes = state.rfqs.filter((r) =>
    rfqIdsWithQuotes.includes(r.id)
  );

  // Filter quotations
  const filteredQuotations = state.quotations.filter((q) => {
    const supplier = state.suppliers.find((s) => s.id === q.supplierId);
    const rfq = state.rfqs.find((r) => r.id === q.rfqId);

    const matchesSearch =
      searchTerm === "" ||
      q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.rfqId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfq?.project.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSupplier =
      filterSupplier === "all" || q.supplierId === filterSupplier;
    const matchesRFQ = filterRFQ === "all" || q.rfqId === filterRFQ;

    return matchesSearch && matchesSupplier && matchesRFQ;
  });

  // Sort by date (newest first)
  const sortedQuotations = [...filteredQuotations].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  const selectedQuotation = viewQuotation
    ? state.quotations.find((q) => q.id === viewQuotation)
    : null;
  const selectedSupplier = selectedQuotation
    ? state.suppliers.find((s) => s.id === selectedQuotation.supplierId)
    : null;
  const selectedRFQ = selectedQuotation
    ? state.rfqs.find((r) => r.id === selectedQuotation.rfqId)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <TkLogo containerClassName="h-7 w-28" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Quotation Archive
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {sortedQuotations.length} quotation{sortedQuotations.length !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-border">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 pl-8 text-xs"
                placeholder="Search by Quote ID, RFQ ID, supplier, or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select
                value={filterSupplier}
                onValueChange={(v) => setFilterSupplier(v)}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Suppliers
                  </SelectItem>
                  {suppliersWithQuotes.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterRFQ}
                onValueChange={(v) => setFilterRFQ(v)}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="RFQ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All RFQs
                  </SelectItem>
                  {rfqsWithQuotes.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.id} - {r.project}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotations Table */}
      <Card className="border-border">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold">
            <Archive className="h-3.5 w-3.5" />
            Historical Quotations
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {sortedQuotations.length === 0 ? (
            <div className="px-4 pb-6 text-center">
              <p className="text-xs text-muted-foreground">
                No quotations found matching your criteria.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Quote ID
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    RFQ ID
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Supplier
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Project
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Total Price
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Positions
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Delivery
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Submitted
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedQuotations.map((q) => {
                  const supplier = state.suppliers.find(
                    (s) => s.id === q.supplierId
                  );
                  const rfq = state.rfqs.find((r) => r.id === q.rfqId);

                  return (
                    <TableRow key={q.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-mono">
                        {q.id}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {q.rfqId}
                      </TableCell>
                      <TableCell className="text-xs">
                        {supplier?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {rfq?.project || "Unknown"}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {q.totalPrice.toLocaleString("de-DE")} EUR
                      </TableCell>
                      <TableCell className="text-xs">
                        {q.lineItems?.length || 0} items
                      </TableCell>
                      <TableCell className="text-xs">
                        {q.deliveryTime} wks
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(q.submittedAt).toLocaleDateString("de-DE")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-2 text-[10px]"
                            onClick={() => setViewQuotation(q.id)}
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                          {q.quotationPdfUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              asChild
                            >
                              <a href={q.quotationPdfUrl} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
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

      {/* View Quotation Detail Dialog */}
      <Dialog open={!!viewQuotation} onOpenChange={() => setViewQuotation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Quotation Details — {viewQuotation}
            </DialogTitle>
          </DialogHeader>
          {selectedQuotation && (
            <div className="flex flex-col gap-4">
              {/* Header Info */}
              <div className="grid grid-cols-3 gap-3 rounded border border-border bg-muted/30 p-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Supplier
                  </p>
                  <p className="text-xs font-medium">
                    {selectedSupplier?.name || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    RFQ
                  </p>
                  <p className="text-xs font-medium">
                    {selectedQuotation.rfqId}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Project
                  </p>
                  <p className="text-xs font-medium">
                    {selectedRFQ?.project || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Total Price
                  </p>
                  <p className="text-xs font-medium">
                    {selectedQuotation.totalPrice.toLocaleString("de-DE")} EUR
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Delivery
                  </p>
                  <p className="text-xs font-medium">
                    {selectedQuotation.deliveryTime} weeks
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Submitted
                  </p>
                  <p className="text-xs font-medium">
                    {new Date(selectedQuotation.submittedAt).toLocaleDateString("de-DE")}
                  </p>
                </div>
              </div>

              {/* Line Items */}
              {selectedQuotation.lineItems && selectedQuotation.lineItems.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-2">Price Positions</h3>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[10px] font-semibold uppercase h-8">
                          Item
                        </TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase h-8">
                          Description
                        </TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase h-8">
                          Qty
                        </TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase h-8">
                          Unit Price
                        </TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase h-8">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedQuotation.lineItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/50">
                          <TableCell className="text-xs font-medium">
                            {item.itemName}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.description || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.unitPrice.toLocaleString("de-DE")} EUR
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {item.totalPrice.toLocaleString("de-DE")} EUR
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Commercial Terms */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Payment Terms:</span>{" "}
                  {selectedQuotation.paymentTerms}
                </div>
                <div>
                  <span className="text-muted-foreground">Incoterms:</span>{" "}
                  {selectedQuotation.incoterms}
                </div>
                <div>
                  <span className="text-muted-foreground">Bonus/Malus:</span>{" "}
                  {selectedQuotation.bonusMalus.toLocaleString("de-DE")} EUR
                </div>
                {selectedQuotation.finalAwardValue && (
                  <div>
                    <span className="text-muted-foreground">Final Award:</span>{" "}
                    <span className="font-medium text-emerald-600">
                      {selectedQuotation.finalAwardValue.toLocaleString("de-DE")} EUR
                    </span>
                  </div>
                )}
              </div>

              {/* Attachments */}
              {(selectedQuotation.quotationPdfUrl || selectedQuotation.supportingDocsUrl) && (
                <div>
                  <h3 className="text-xs font-semibold mb-2">Attachments</h3>
                  <div className="flex gap-2">
                    {selectedQuotation.quotationPdfUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        asChild
                      >
                        <a href={selectedQuotation.quotationPdfUrl} target="_blank" rel="noopener noreferrer">
                          <FileText className="mr-1 h-3 w-3" />
                          Quotation PDF
                        </a>
                      </Button>
                    )}
                    {selectedQuotation.supportingDocsUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        asChild
                      >
                        <a href={selectedQuotation.supportingDocsUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-1 h-3 w-3" />
                          Supporting Docs
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Comments */}
              {selectedQuotation.comments && (
                <div>
                  <h3 className="text-xs font-semibold mb-1">Comments</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedQuotation.comments}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
