"use client";

import { useStore } from "@/lib/store";
import { Topbar } from "./topbar";
import { AppSidebar } from "./app-sidebar";
import { EngineerDashboard } from "./engineer-dashboard";
import { ProcurementDashboard } from "./procurement-dashboard";
import { SupplierDashboard } from "./supplier-dashboard";
import { HOPDashboard } from "./hop-dashboard";
import { QCSView } from "./qcs-view";
import { NegotiationPage } from "./negotiation-page";
import { SuppliersPage } from "./suppliers-page";
import { AdminPage } from "./admin-page";
import { RFQListPage } from "./rfq-list-page";
import { ScrollArea } from "@/components/ui/scroll-area";

function DashboardContent() {
  const { currentRole } = useStore();

  switch (currentRole) {
    case "engineer":
      return <EngineerDashboard />;
    case "procurement":
      return <ProcurementDashboard />;
    case "supplier_a":
    case "supplier_b":
      return <SupplierDashboard />;
    case "hop":
      return <HOPDashboard />;
    default:
      return <EngineerDashboard />;
  }
}

function PageContent() {
  const { currentPage } = useStore();

  switch (currentPage) {
    case "dashboard":
      return <DashboardContent />;
    case "rfqs":
      return <RFQListPage />;
    case "suppliers":
      return <SuppliersPage />;
    case "qcs":
      return <QCSView />;
    case "negotiation":
      return <NegotiationPage />;
    case "admin":
      return <AdminPage />;
    default:
      return <DashboardContent />;
  }
}

export function ProcureApp() {
  const { currentRole } = useStore();
  const isProcurement = currentRole === "procurement";

  return (
    <div className="flex h-screen flex-col bg-background">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        {isProcurement && <AppSidebar />}
        <main className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              {isProcurement ? <PageContent /> : <DashboardContent />}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
