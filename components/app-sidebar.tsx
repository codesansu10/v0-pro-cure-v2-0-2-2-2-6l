"use client";

import { useStore } from "@/lib/store";
import { TkLogo } from "@/components/tk-logo";
import {
  LayoutDashboard,
  FileText,
  Truck,
  BarChart3,
  MessageSquare,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "rfqs", label: "RFQs", icon: FileText },
  { id: "suppliers", label: "Suppliers", icon: Truck },
  { id: "qcs", label: "QCS", icon: BarChart3 },
  { id: "negotiation", label: "Negotiation", icon: MessageSquare },
  { id: "admin", label: "Admin", icon: Settings },
];

export function AppSidebar() {
  const { currentPage, setCurrentPage } = useStore();

  return (
    <aside className="flex h-full w-56 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-white/20 px-4">
        <div className="flex items-center gap-3">
          <TkLogo className="h-10 w-auto shrink-0 object-contain" invert />
          <div className="flex flex-col">
            <span className="text-[11px] font-bold leading-tight tracking-wide text-white">
              ProCure
            </span>
            <span className="text-[9px] leading-tight text-white/60">
              Sourcing v2.0
            </span>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentPage(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded px-3 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-white/20 px-4 py-3">
        <p className="text-[10px] text-white/40">
          Internal Use Only
        </p>
      </div>
    </aside>
  );
}
