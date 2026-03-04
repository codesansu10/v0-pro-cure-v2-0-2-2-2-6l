"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Truck, CheckCircle, XCircle, Plus } from "lucide-react";
import { TkLogo } from "@/components/tk-logo";
import type { Supplier } from "@/lib/types";

const emptySupplierForm = {
  name: "",
  contactPerson: "",
  email: "",
  commodityFocus: "",
  status: "Pending" as const,
  rating: "B" as const,
};

export function SuppliersPage() {
  const { state, addSupplier } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptySupplierForm);

  function handleAddSupplier() {
    if (!form.name.trim() || !form.email.trim()) return;
    
    // Find next available role
    const usedRoles = state.suppliers.map(s => s.role);
    const allRoles: Supplier["role"][] = ["supplier_a", "supplier_b", "supplier_c", "supplier_d", "supplier_e"];
    const availableRole = allRoles.find(r => !usedRoles.includes(r)) || "supplier_a";
    
    addSupplier({
      name: form.name,
      contactPerson: form.contactPerson,
      email: form.email,
      commodityFocus: form.commodityFocus,
      status: form.status,
      rating: form.rating,
      role: availableRole,
      approved: form.status === "Approved",
      capacityConfirmed: false,
      technicalCompliance: false,
      commercialSpecCompliant: false,
      riskScore: 50,
    });
    
    setForm(emptySupplierForm);
    setShowAddModal(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <TkLogo containerClassName="h-7 w-28" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Supplier Directory
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Registered suppliers and their capabilities
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-[#00A0E3] text-white text-xs hover:bg-[#0090cc]"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Supplier
        </Button>
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
                    <span className="text-muted-foreground">Contact:</span>{" "}
                    <span className="font-medium">{sup.contactPerson || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <span className="font-medium">{sup.email || "—"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Commodity:</span>{" "}
                    <span className="font-medium">{sup.commodityFocus || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <Badge
                      variant="outline"
                      className={`text-[9px] ml-1 ${
                        sup.status === "Approved"
                          ? "border-emerald-600 text-emerald-600"
                          : "border-amber-600 text-amber-600"
                      }`}
                    >
                      {sup.status || (sup.approved ? "Approved" : "Pending")}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Assigned RFQs:</span>{" "}
                    <span className="font-medium">{assignedCount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quotes:</span>{" "}
                    <span className="font-medium">{quoteCount}</span>
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
                  <div className="flex items-center gap-1">
                    {sup.commercialSpecCompliant ? (
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span>Comm. Spec</span>
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

      {/* Add Supplier Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Add New Supplier
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Company Name *</Label>
              <Input
                className="h-8 text-xs"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Acme Corp GmbH"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Contact Person</Label>
              <Input
                className="h-8 text-xs"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="e.g., John Smith"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Email *</Label>
              <Input
                className="h-8 text-xs"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="e.g., contact@supplier.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Commodity Focus</Label>
              <Input
                className="h-8 text-xs"
                value={form.commodityFocus}
                onChange={(e) => setForm({ ...form, commodityFocus: e.target.value })}
                placeholder="e.g., Steel Parts, Machined Components"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as "Approved" | "Pending" })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Rating</Label>
                <Select
                  value={form.rating}
                  onValueChange={(v) => setForm({ ...form, rating: v as "A" | "B" | "C" })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setForm(emptySupplierForm);
                setShowAddModal(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#00A0E3] text-white text-xs hover:bg-[#0090cc]"
              onClick={handleAddSupplier}
              disabled={!form.name.trim() || !form.email.trim()}
            >
              Add Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
