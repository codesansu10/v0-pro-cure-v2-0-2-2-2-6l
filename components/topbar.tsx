"use client";

import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { Bell, User } from "lucide-react";
import { TkLogo } from "@/components/tk-logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const roleLabels: Record<Role, string> = {
  engineer: "Engineer",
  procurement: "Procurement",
  supplier_a: "Supplier A",
  supplier_b: "Supplier B",
  hop: "Head of Procurement",
};

const roleColors: Record<Role, string> = {
  engineer: "bg-emerald-600",
  procurement: "bg-[#00A0E3]",
  supplier_a: "bg-amber-600",
  supplier_b: "bg-amber-700",
  hop: "bg-red-700",
};

export function Topbar() {
  const { currentRole, setCurrentRole, getCurrentUser, state } = useStore();
  const user = getCurrentUser();
  const unreadCount = state.messages.length;

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#00A0E3]">
            <TkLogo className="h-5 w-5" color="white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight text-foreground">
              ProCure v2.0
            </h1>
            <p className="text-[10px] leading-tight text-muted-foreground">
              thyssenkrupp Sourcing
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Select
          value={currentRole}
          onValueChange={(v) => setCurrentRole(v as Role)}
        >
          <SelectTrigger className="h-8 w-48 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(roleLabels).map(([key, label]) => (
              <SelectItem key={key} value={key} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#00A0E3] text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge
            className={`${roleColors[currentRole]} text-white text-[10px] border-0`}
          >
            {roleLabels[currentRole]}
          </Badge>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground">{user.name}</span>
        </div>
      </div>
    </header>
  );
}
