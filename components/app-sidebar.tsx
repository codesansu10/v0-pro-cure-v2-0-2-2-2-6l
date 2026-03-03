"use client";

import { useStore } from "@/lib/store";
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
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[#00A0E3]">
            <span className="text-[10px] font-bold text-white">tk</span>
          </div>
          <span className="text-xs font-semibold tracking-wide uppercase text-sidebar-foreground/80">
            Navigation
          </span>
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
                      ? "bg-sidebar-accent text-[#00A0E3]"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
      <div className="border-t border-sidebar-border px-4 py-3">
        <p className="text-[10px] text-sidebar-foreground/40">
          ProCure v2.0 — Internal Use Only
        </p>
      </div>
    </aside>
  );
}
