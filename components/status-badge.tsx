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

export function StatusBadge({ status }: { status: RFQStatus }) {
  return (
    <Badge className={`${statusColors[status]} text-white text-[10px] border-0`}>
      {status}
    </Badge>
  );
}
