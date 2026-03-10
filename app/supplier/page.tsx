"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useStore } from "@/lib/store";
import { validateSupplierToken, parseSupplierToken } from "@/lib/supplier-tokens";
import { SupplierDashboard } from "@/components/supplier-dashboard";
import { TkLogo } from "@/components/tk-logo";

function SupplierAccessContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { state, setCurrentRole } = useStore();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    async function validate() {
      // Try local parse first for immediate feedback
      const parsed = parseSupplierToken(token!);
      if (!parsed) {
        setStatus("invalid");
        return;
      }

      // Find the supplier in state to get their role
      const supplier = state.suppliers.find((s) => s.id === parsed.supplierId);
      if (supplier) {
        setCurrentRole(supplier.role);
        setStatus("valid");
      } else {
        setStatus("invalid");
      }

      // Also validate against Supabase in background
      const validated = await validateSupplierToken(token!);
      if (!validated) {
        setStatus("invalid");
      }
    }

    validate();
  }, [token, state.suppliers, setCurrentRole]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <TkLogo containerClassName="h-10 w-40 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Verifying your access...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <TkLogo containerClassName="h-10 w-40 mx-auto mb-6" />
          <h1 className="text-lg font-semibold text-foreground mb-2">Access Link Invalid</h1>
          <p className="text-sm text-muted-foreground mb-4">
            This supplier access link is invalid or has expired. Please contact the procurement team for a new link.
          </p>
          <p className="text-xs text-muted-foreground">Contact: a.schmidt@thyssenkrupp.com</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <SupplierDashboard />
    </div>
  );
}

export default function SupplierAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <SupplierAccessContent />
    </Suspense>
  );
}
