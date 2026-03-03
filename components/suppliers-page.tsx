"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Truck, CheckCircle, XCircle } from "lucide-react";

export function SuppliersPage() {
  const { state } = useStore();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Supplier Directory
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Registered suppliers and their capabilities
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {state.suppliers.map((sup) => {
          const assignedCount = state.rfqSuppliers.filter(
            (rs) => rs.supplierId === sup.id
          ).length;
          const quoteCount = state.quotations.filter(
            (q) => q.supplierId === sup.id
          ).length;

          return (
            <Card key={sup.id} className="border-border">
              <CardHeader className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold">
                    <Truck className="h-3.5 w-3.5" />
                    {sup.name}
                  </CardTitle>
                  <Badge
                    className={`text-[10px] border-0 text-white ${
                      sup.rating === "A"
                        ? "bg-emerald-600"
                        : sup.rating === "B"
                        ? "bg-amber-600"
                        : "bg-red-600"
                    }`}
                  >
                    Rating: {sup.rating}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">ID:</span>{" "}
                    <span className="font-mono">{sup.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Assigned RFQs:</span>{" "}
                    <span className="font-medium">{assignedCount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quotes:</span>{" "}
                    <span className="font-medium">{quoteCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {sup.approved ? (
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span>Approved</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {sup.capacityConfirmed ? (
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span>Capacity</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {sup.technicalCompliance ? (
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span>Tech Compliance</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Risk:</span>{" "}
                    <span
                      className={`font-medium ${
                        sup.riskScore > 20 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {sup.riskScore}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Comm. Spec:</span>{" "}
                    {sup.commercialSpecCompliant ? "Compliant" : "Non-compliant"}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quotation history */}
      {state.quotations.length > 0 && (
        <Card className="border-border">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-xs font-semibold">
              Quotation History
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Quote ID
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Supplier
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    RFQ
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Price
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Delivery
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Payment
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Submitted
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.quotations.map((q) => {
                  const sup = state.suppliers.find(
                    (s) => s.id === q.supplierId
                  );
                  return (
                    <TableRow key={q.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-mono">
                        {q.id}
                      </TableCell>
                      <TableCell className="text-xs">
                        {sup?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {q.rfqId}
                      </TableCell>
                      <TableCell className="text-xs">
                        {q.totalPrice.toLocaleString("de-DE")} EUR
                      </TableCell>
                      <TableCell className="text-xs">
                        {q.deliveryTime} weeks
                      </TableCell>
                      <TableCell className="text-xs">
                        {q.paymentTerms}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(q.submittedAt).toLocaleDateString("de-DE")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
