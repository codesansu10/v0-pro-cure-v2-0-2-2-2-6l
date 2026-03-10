"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import type { AppState, Role, RFQ, Quotation, QCS, Message, RFQSupplier, RFQSupplierStatus, Supplier, Notification } from "./types";
import {
  insertRFQ,
  insertRFQSupplier,
  insertQuotation,
  insertQuotationItems,
  updateRFQSupplierStatus,
  fetchRFQs,
  fetchSuppliers,
  fetchRFQSuppliers,
  fetchQuotationsWithItems,
} from "./supabase-data";

const defaultUsers = [
  { id: "USR-001", name: "Max Mueller", role: "engineer" as Role, email: "m.mueller@thyssenkrupp.com" },
  { id: "USR-002", name: "Anna Schmidt", role: "procurement" as Role, email: "a.schmidt@thyssenkrupp.com" },
  { id: "USR-003", name: "Steel Corp GmbH", role: "supplier_a" as Role, email: "contact@steelcorp.de" },
  { id: "USR-004", name: "MetalWorks AG", role: "supplier_b" as Role, email: "info@metalworks.de" },
  { id: "USR-005", name: "Dr. Klaus Weber", role: "hop" as Role, email: "k.weber@thyssenkrupp.com" },
  { id: "USR-006", name: "Precision Parts Ltd", role: "supplier_c" as Role, email: "sales@precisionparts.co.uk" },
  { id: "USR-007", name: "AlloyTech Industries", role: "supplier_d" as Role, email: "procurement@alloytech.com" },
  { id: "USR-008", name: "EuroForge SA", role: "supplier_e" as Role, email: "contact@euroforge.eu" },
];

const defaultSuppliers = [
  {
    id: "SUP-001",
    name: "Steel Corp GmbH",
    contactPerson: "Hans Becker",
    email: "contact@steelcorp.de",
    commodityFocus: "Steel Plates, Structural Steel",
    status: "Approved" as const,
    rating: "A" as const,
    role: "supplier_a" as const,
    approved: true,
    capacityConfirmed: true,
    technicalCompliance: true,
    commercialSpecCompliant: true,
    riskScore: 12,
  },
  {
    id: "SUP-002",
    name: "MetalWorks AG",
    contactPerson: "Sabine Richter",
    email: "info@metalworks.de",
    commodityFocus: "Machined Components, CNC Parts",
    status: "Approved" as const,
    rating: "B" as const,
    role: "supplier_b" as const,
    approved: true,
    capacityConfirmed: true,
    technicalCompliance: false,
    commercialSpecCompliant: true,
    riskScore: 28,
  },
  {
    id: "SUP-003",
    name: "Precision Parts Ltd",
    contactPerson: "James Wilson",
    email: "sales@precisionparts.co.uk",
    commodityFocus: "Precision Bearings, Fasteners",
    status: "Approved" as const,
    rating: "A" as const,
    role: "supplier_c" as const,
    approved: true,
    capacityConfirmed: true,
    technicalCompliance: true,
    commercialSpecCompliant: true,
    riskScore: 8,
  },
  {
    id: "SUP-004",
    name: "AlloyTech Industries",
    contactPerson: "Maria Garcia",
    email: "procurement@alloytech.com",
    commodityFocus: "Aluminum Alloys, Titanium Components",
    status: "Pending" as const,
    rating: "B" as const,
    role: "supplier_d" as const,
    approved: false,
    capacityConfirmed: true,
    technicalCompliance: true,
    commercialSpecCompliant: false,
    riskScore: 35,
  },
  {
    id: "SUP-005",
    name: "EuroForge SA",
    contactPerson: "Pierre Dubois",
    email: "contact@euroforge.eu",
    commodityFocus: "Forged Parts, Heavy Machinery Components",
    status: "Approved" as const,
    rating: "C" as const,
    role: "supplier_e" as const,
    approved: true,
    capacityConfirmed: false,
    technicalCompliance: true,
    commercialSpecCompliant: true,
    riskScore: 42,
  },
];

const initialState: AppState = {
  users: defaultUsers,
  rfqs: [],
  suppliers: defaultSuppliers,
  rfqSuppliers: [],
  quotations: [],
  qcs: [],
  messages: [],
  notifications: [],
};

interface StoreContextType {
  state: AppState;
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  addRFQ: (rfq: Omit<RFQ, "id" | "createdAt" | "updatedAt">) => string;
  updateRFQ: (id: string, updates: Partial<RFQ>) => void;
  assignSupplier: (rfqId: string, supplierId: string) => void;
  updateRFQSupplier: (rfqId: string, supplierId: string, updates: Partial<RFQSupplier>) => void;
  addQuotation: (quotation: Omit<Quotation, "id" | "submittedAt">) => void;
  updateQuotation: (id: string, updates: Partial<Quotation>) => void;
  addQCS: (qcs: Omit<QCS, "id" | "createdAt">) => void;
  updateQCS: (id: string, updates: Partial<QCS>) => void;
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  addSupplier: (supplier: Omit<Supplier, "id">) => void;
  addNotification: (notification: Omit<Notification, "id" | "createdAt" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearReadNotifications: () => void;
  getUnreadCount: () => number;
  generateId: (prefix: string) => string;
  getCurrentUser: () => typeof defaultUsers[0];
  selectedRFQId: string | null;
  setSelectedRFQId: (id: string | null) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [currentRole, setCurrentRole] = useState<Role>("engineer");
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedRFQId, setSelectedRFQId] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const counterRef = useRef(1);

  const generateId = useCallback((prefix: string) => {
    const num = counterRef.current++;
    return `${prefix}-2026-${String(num).padStart(3, "0")}`;
  }, []);

  // Load data from Supabase on mount
  useEffect(() => {
    async function loadFromSupabase() {
      try {
        const [rfqs, suppliers, rfqSuppliers] = await Promise.all([
          fetchRFQs(),
          fetchSuppliers(),
          fetchRFQSuppliers(),
        ]);

        // Load quotations with line items for all RFQs
        const quotationPromises = rfqs.map((rfq) => fetchQuotationsWithItems(rfq.id));
        const quotationsArrays = await Promise.all(quotationPromises);
        const allQuotations = quotationsArrays.flat();

        // Merge Supabase suppliers on top of hardcoded defaults.
        // Starting from the hardcoded default ensures all required fields are present,
        // then we overlay the DB values (e.g. updated name/email). We always keep
        // the hardcoded `role` so switching between supplier views never breaks.
        const mergedSuppliers =
          suppliers.length > 0
            ? defaultSuppliers.map((def) => {
                const fromDb = suppliers.find((s) => s.id === def.id);
                // Spread order: default first, then DB values on top, then
                // explicitly restore `role` from the default to prevent overwrite.
                return fromDb ? { ...def, ...fromDb, role: def.role } : def;
              })
            : defaultSuppliers;

        setState((prev) => ({
          ...prev,
          rfqs: rfqs.length > 0 ? rfqs : prev.rfqs,
          suppliers: mergedSuppliers,
          rfqSuppliers: rfqSuppliers.length > 0 ? rfqSuppliers : prev.rfqSuppliers,
          quotations: allQuotations.length > 0 ? allQuotations : prev.quotations,
        }));
        setDataLoaded(true);
      } catch (err) {
        console.error("[Supabase] Error loading data:", err);
        setDataLoaded(true);
      }
    }
    loadFromSupabase();
  }, []);

  const getCurrentUser = useCallback(() => {
    return defaultUsers.find((u) => u.role === currentRole) || defaultUsers[0];
  }, [currentRole]);

  const addRFQ = useCallback(
    (rfq: Omit<RFQ, "id" | "createdAt" | "updatedAt">) => {
      const id = generateId("RFQ");
      const now = new Date().toISOString();
      const newRFQ: RFQ = { ...rfq, id, createdAt: now, updatedAt: now };
      
      // Update local state immediately
      setState((prev) => ({
        ...prev,
        rfqs: [...prev.rfqs, newRFQ],
      }));
      
      // Persist to Supabase
      insertRFQ(newRFQ).then((success) => {
        if (!success) {
          console.error("[Supabase] Failed to persist RFQ:", id);
        }
      });

      return id;
    },
    [generateId]
  );

  const updateRFQ = useCallback((id: string, updates: Partial<RFQ>) => {
    setState((prev) => ({
      ...prev,
      rfqs: prev.rfqs.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      ),
    }));
  }, []);

  const assignSupplier = useCallback((rfqId: string, supplierId: string) => {
    const assignment: RFQSupplier = {
      rfqId,
      supplierId,
      assignedAt: new Date().toISOString(),
      status: "RFQ Received",
      quoted: false,
    };
    
    setState((prev) => {
      const exists = prev.rfqSuppliers.find(
        (rs) => rs.rfqId === rfqId && rs.supplierId === supplierId
      );
      if (exists) return prev;
      return { ...prev, rfqSuppliers: [...prev.rfqSuppliers, assignment] };
    });
    
    // Persist to Supabase
    insertRFQSupplier(assignment).then((success) => {
      if (!success) {
        console.error("[Supabase] Failed to persist RFQ supplier assignment");
      }
    });
  }, []);

  const updateRFQSupplier = useCallback((rfqId: string, supplierId: string, updates: Partial<RFQSupplier>) => {
    setState((prev) => ({
      ...prev,
      rfqSuppliers: prev.rfqSuppliers.map((rs) =>
        rs.rfqId === rfqId && rs.supplierId === supplierId
          ? { ...rs, ...updates }
          : rs
      ),
    }));
    
    // Sync to Supabase
    if (updates.status !== undefined || updates.quoted !== undefined) {
      updateRFQSupplierStatus(rfqId, supplierId, { status: updates.status, quoted: updates.quoted }).then((success) => {
        if (!success) {
          console.error("[Supabase] Failed to persist RFQ supplier status");
        }
      });
    }
  }, []);

  const addQuotation = useCallback(
    (quotation: Omit<Quotation, "id" | "submittedAt">) => {
      const id = generateId("QOT");
      const now = new Date().toISOString();
      const newQuotation: Quotation = { ...quotation, id, submittedAt: now };
      
      // Update local state
      setState((prev) => ({
        ...prev,
        quotations: [...prev.quotations, newQuotation],
      }));

      // Persist to Supabase
      insertQuotation(newQuotation).then((quotationId) => {
        if (quotationId) {
          if (newQuotation.lineItems && newQuotation.lineItems.length > 0) {
            insertQuotationItems(id, newQuotation.lineItems).then((success) => {
              if (!success) {
                console.error("[Supabase] Failed to persist quotation items");
              }
            });
          }
        } else {
          console.error("[Supabase] Failed to persist quotation:", id);
        }
      });
    },
    [generateId]
  );

  const updateQuotation = useCallback((id: string, updates: Partial<Quotation>) => {
    setState((prev) => ({
      ...prev,
      quotations: prev.quotations.map((q) =>
        q.id === id ? { ...q, ...updates } : q
      ),
    }));
  }, []);

  const addQCS = useCallback(
    (qcs: Omit<QCS, "id" | "createdAt">) => {
      const id = generateId("QCS");
      setState((prev) => ({
        ...prev,
        qcs: [...prev.qcs, { ...qcs, id, createdAt: new Date().toISOString() }],
      }));
    },
    [generateId]
  );

  const updateQCS = useCallback((id: string, updates: Partial<QCS>) => {
    setState((prev) => ({
      ...prev,
      qcs: prev.qcs.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    }));
  }, []);

  const addMessage = useCallback(
    (message: Omit<Message, "id" | "timestamp">) => {
      const id = generateId("MSG");
      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          { ...message, id, timestamp: new Date().toISOString() },
        ],
      }));
    },
    [generateId]
  );

  const addSupplier = useCallback(
    (supplier: Omit<Supplier, "id">) => {
      const id = generateId("SUP");
      setState((prev) => ({
        ...prev,
        suppliers: [...prev.suppliers, { ...supplier, id }],
      }));
    },
    [generateId]
  );

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "createdAt" | "read">) => {
      const id = generateId("NOT");
      setState((prev) => ({
        ...prev,
        notifications: [
          { ...notification, id, createdAt: new Date().toISOString(), read: false },
          ...prev.notifications,
        ],
      }));
    },
    [generateId]
  );

  const markNotificationRead = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const clearReadNotifications = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => !n.read),
    }));
  }, []);

  const getUnreadCount = useCallback(() => {
    // Filter by current role visibility
    const visibleNotifs = state.notifications.filter((n) => {
      if (currentRole === "procurement") return n.role === "procurement";
      if (currentRole === "engineer") return n.role === "engineer" && n.userId === getCurrentUser().id;
      if (currentRole === "hop") return n.role === "hop";
      if (currentRole.startsWith("supplier_")) {
        const supplier = state.suppliers.find((s) => s.role === currentRole);
        return n.role === "supplier" && n.supplierId === supplier?.id;
      }
      return false;
    });
    return visibleNotifs.filter((n) => !n.read).length;
  }, [state.notifications, state.suppliers, currentRole, getCurrentUser]);

  return (
    <StoreContext.Provider
      value={{
        state,
        currentRole,
        setCurrentRole,
        currentPage,
        setCurrentPage,
        addRFQ,
        updateRFQ,
        assignSupplier,
        updateRFQSupplier,
        addQuotation,
        updateQuotation,
        addQCS,
        updateQCS,
        addMessage,
        addSupplier,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        clearReadNotifications,
        getUnreadCount,
        generateId,
        getCurrentUser,
        selectedRFQId,
        setSelectedRFQId,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
