"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StoreProvider, useStore } from "@/lib/store";
import { SupplierDashboard } from "@/components/supplier-dashboard";
import { TkLogo } from "@/components/tk-logo";
import type { Role } from "@/lib/types";

// Map slug prefix to supplier role
const slugToRole: Record<string, Role> = {
  "supplier-a": "supplier_a",
  "supplier-b": "supplier_b",
  "supplier-c": "supplier_c",
  "supplier-d": "supplier_d",
  "supplier-e": "supplier_e",
};

function resolveRoleFromSlug(slug: string): Role | null {
  for (const [prefix, role] of Object.entries(slugToRole)) {
    if (slug.startsWith(prefix)) {
      return role;
    }
  }
  return null;
}

function SupplierLoginContent() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { setCurrentRole, state } = useStore();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");

  useEffect(() => {
    if (!slug) {
      setStatus("invalid");
      return;
    }

    const role = resolveRoleFromSlug(slug);
    if (!role) {
      setStatus("invalid");
      return;
    }

    // Confirm the supplier exists in state
    const supplier = state.suppliers.find((s) => s.role === role);
    if (supplier) {
      setCurrentRole(role);
      setStatus("valid");
    } else {
      setStatus("invalid");
    }
  }, [slug, state.suppliers, setCurrentRole]);

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

export default function SupplierLoginPage() {
  return (
    <StoreProvider>
      <SupplierLoginContent />
    </StoreProvider>
  );
}
