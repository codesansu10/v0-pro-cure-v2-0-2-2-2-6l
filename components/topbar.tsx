"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { Bell, User, Wifi, WifiOff } from "lucide-react";
import { TkLogo } from "@/components/tk-logo";
import { NotificationsPanel } from "@/components/notifications-panel";
import { Button } from "@/components/ui/button";
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
  supplier_a: "Supplier A (Steel Corp)",
  supplier_b: "Supplier B (MetalWorks)",
  supplier_c: "Supplier C (Precision)",
  supplier_d: "Supplier D (AlloyTech)",
  supplier_e: "Supplier E (EuroForge)",
  hop: "Head of Procurement",
};

const roleColors: Record<Role, string> = {
  engineer: "bg-emerald-600",
  procurement: "bg-[#00A0E3]",
  supplier_a: "bg-amber-600",
  supplier_b: "bg-amber-700",
  supplier_c: "bg-orange-600",
  supplier_d: "bg-orange-700",
  supplier_e: "bg-orange-800",
  hop: "bg-red-700",
};

export function Topbar() {
  const { currentRole, setCurrentRole, getCurrentUser, getUnreadCount, realtimeConnected } = useStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const user = getCurrentUser();
  const unreadCount = getUnreadCount();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      {/* Logo — single branding element shown across all dashboards */}
      <div className="flex items-center gap-3">
        <TkLogo containerClassName="h-8 w-40" />
        <div>
          <h1 className="text-sm font-semibold leading-tight text-foreground">
            ProCure v2.0
          </h1>
          <p className="text-[10px] leading-tight text-muted-foreground">
            Sourcing Platform
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Real-time connection indicator */}
        <div
          className="flex items-center gap-1.5"
          title={realtimeConnected ? "Real-time updates active" : "Real-time offline"}
        >
          {realtimeConnected ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-zinc-400" />
          )}
          <span
            className={`text-[10px] font-medium ${
              realtimeConnected ? "text-emerald-500" : "text-zinc-400"
            }`}
          >
            {realtimeConnected ? "Live" : "Offline"}
          </span>
        </div>

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

        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 p-0"
          onClick={() => setNotificationsOpen(true)}
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00A0E3] text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        <NotificationsPanel
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        />

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

