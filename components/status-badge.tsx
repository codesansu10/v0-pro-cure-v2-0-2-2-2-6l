"use client";

import type { RFQStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<RFQStatus, string> = {
  Draft: "bg-zinc-500",
  Submitted: "bg-blue-600",
  "Under Review": "bg-indigo-600",
  "Sent to Supplier": "bg-[#00A0E3]",
  "Quote Received": "bg-amber-600",
  "In Negotiation": "bg-orange-600",
  "Final Decision": "bg-emerald-600",
  Closed: "bg-zinc-700",
};

// Supplier-friendly status labels
const supplierStatusLabels: Record<RFQStatus, string> = {
  Draft: "RFQ Open",
  Submitted: "RFQ Open",
  "Under Review": "RFQ Open",
  "Sent to Supplier": "Quotation Pending",
  "Quote Received": "Quotation Submitted",
  "In Negotiation": "Quotation Received",
  "Final Decision": "Quotation Received",
  Closed: "RFQ Closed",
};

export function StatusBadge({ status, supplierView = false }: { status: RFQStatus; supplierView?: boolean }) {
  const displayStatus = supplierView ? supplierStatusLabels[status] : status;
  return (
    <Badge className={`${statusColors[status]} text-white text-[10px] border-0`}>
      {displayStatus}
    </Badge>
  );
}
