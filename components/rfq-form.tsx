"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { RequestType, RFQStatus } from "@/lib/types";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Zap, Package } from "lucide-react";

interface RFQFormProps {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
}

export function RFQForm({ open, onClose, editId }: RFQFormProps) {
  const { addRFQ, updateRFQ, state, getCurrentUser, addNotification } = useStore();
  const editRFQ = editId ? state.rfqs.find((r) => r.id === editId) : null;

  const [form, setForm] = useState({
    project: editRFQ?.project || "",
    component: editRFQ?.component || "",
    quantity: editRFQ?.quantity || 0,
    budget: editRFQ?.budget || 0,
    deliveryTime: editRFQ?.deliveryTime || 4,
    plant: editRFQ?.plant || "",
    pspElement: editRFQ?.pspElement || "",
    technicalContact: editRFQ?.technicalContact || "",
    onSiteVisitRequired: editRFQ?.onSiteVisitRequired || false,
    requestType: (editRFQ?.requestType || "Manufacturing") as RequestType,
  });

  const warnings = [];
  if (form.deliveryTime < 2)
    warnings.push({ icon: Zap, text: "Urgent Request", color: "bg-red-600" });
  if (form.quantity > 1000)
    warnings.push({
      icon: Package,
      text: "Bulk Supplier Suggested",
      color: "bg-amber-600",
    });
  if (form.budget > 0 && form.budget < 500)
    warnings.push({
      icon: AlertTriangle,
      text: "Low Budget Warning",
      color: "bg-orange-600",
    });

  function handleSave(status: RFQStatus) {
    const user = getCurrentUser();
    if (editId) {
      updateRFQ(editId, { ...form, status });
      // Notify procurement if RFQ was submitted
      if (status === "Submitted") {
        addNotification({
          role: "procurement",
          rfqId: editId,
          title: "RFQ Updated",
          message: `RFQ ${editId} for ${form.project} - ${form.component} has been updated and resubmitted.`,
          type: "rfq",
        });
      }
    } else {
      const rfqId = addRFQ({ ...form, status, createdBy: user.id });
      // Notify procurement when engineer submits RFQ
      if (status === "Submitted") {
        addNotification({
          role: "procurement",
          rfqId,
          title: "New RFQ Submitted",
          message: `${user.name} submitted a new RFQ for ${form.project} - ${form.component}. Budget: ${form.budget.toLocaleString("de-DE")} EUR`,
          type: "rfq",
        });
      }
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {editId ? `Edit RFQ — ${editId}` : "Create New RFQ"}
          </DialogTitle>
        </DialogHeader>

        {warnings.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {warnings.map((w, i) => (
              <Badge
                key={i}
                className={`${w.color} text-white text-xs border-0`}
              >
                <w.icon className="mr-1 h-3.5 w-3.5" />
                {w.text}
              </Badge>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <Label className="text-sm">Project</Label>
            <Input
              className="h-9 text-sm"
              value={form.project}
              onChange={(e) => setForm({ ...form, project: e.target.value })}
              placeholder="e.g. Steel Plant Modernization"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">Component</Label>
            <Input
              className="h-9 text-sm"
              value={form.component}
              onChange={(e) => setForm({ ...form, component: e.target.value })}
              placeholder="e.g. Roller Bearing Assembly"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">Quantity</Label>
            <Input
              className="h-9 text-sm"
              type="number"
              value={form.quantity || ""}
              onChange={(e) =>
                setForm({ ...form, quantity: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">Budget (EUR)</Label>
            <Input
              className="h-9 text-sm"
              type="number"
              value={form.budget || ""}
              onChange={(e) =>
                setForm({ ...form, budget: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">Delivery Time (weeks)</Label>
            <Input
              className="h-9 text-sm"
              type="number"
              value={form.deliveryTime || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  deliveryTime: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">Plant</Label>
            <Input
              className="h-9 text-sm"
              value={form.plant}
              onChange={(e) => setForm({ ...form, plant: e.target.value })}
              placeholder="e.g. Duisburg"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">PSP Element</Label>
            <Input
              className="h-9 text-sm"
              value={form.pspElement}
              onChange={(e) => setForm({ ...form, pspElement: e.target.value })}
              placeholder="e.g. PSP-2026-0042"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">Technical Contact</Label>
            <Input
              className="h-9 text-sm"
              value={form.technicalContact}
              onChange={(e) =>
                setForm({ ...form, technicalContact: e.target.value })
              }
              placeholder="e.g. Dr. Fischer"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">Type of Request</Label>
            <Select
              value={form.requestType}
              onValueChange={(v) =>
                setForm({ ...form, requestType: v as RequestType })
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Manufacturing" className="text-sm">
                  Manufacturing
                </SelectItem>
                <SelectItem value="Delivery" className="text-sm">
                  Delivery
                </SelectItem>
                <SelectItem value="Service" className="text-sm">
                  Service
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-3 pb-1">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.onSiteVisitRequired}
                onCheckedChange={(v) =>
                  setForm({ ...form, onSiteVisitRequired: v })
                }
              />
              <Label className="text-sm">On-site Visit Required</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="text-sm">
            Cancel
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-sm"
            onClick={() => handleSave("Draft")}
          >
            Save as Draft
          </Button>
          <Button
            size="sm"
            className="bg-[#00A0E3] text-white text-sm hover:bg-[#0090cc]"
            onClick={() => handleSave("Submitted")}
          >
            Submit RFQ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
