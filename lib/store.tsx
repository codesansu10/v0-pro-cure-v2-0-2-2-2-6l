"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

import type { AppState, Role, RFQ, Quotation, QCS, Message, RFQSupplier, RFQSupplierStatus, Supplier, Notification } from "./types";
import {
  insertRFQ,
  insertRFQSupplier,
  insertQuotation,
  insertQuotationItems,
  updateRFQSupplierStatus,
  updateQuotationInSupabase,
  insertSupplier,
  fetchRFQs,
  fetchSuppliers,
  fetchRFQSuppliers,
  fetchAllQuotationsWithItems,
  fetchQCS,
  insertQCS as insertQCSToSupabase,
  updateQCSInSupabase,
  fetchMessages,
  insertMessage as insertMessageToSupabase,
  fetchNotifications,
  insertNotification as insertNotificationToSupabase,
  updateNotificationRead,
  updateRFQFields,
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
    sccCodes: ["steel", "structural", "plates", "beams"],
    materialGroups: ["raw-materials", "metal"],
    country: "Germany",
    segment: "preferred" as const,
    riskAssessmentResult: "A" as const,
    creditCheckScore: 90,
    sgpTotalScore: 88,
    supplierEvaluationScore: 85,
    sustainabilityAuditScore: 80,
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
    sccCodes: ["machined", "cnc", "components", "parts"],
    materialGroups: ["machined-components", "precision"],
    country: "Germany",
    segment: "approved" as const,
    riskAssessmentResult: "B" as const,
    creditCheckScore: 75,
    sgpTotalScore: 74,
    supplierEvaluationScore: 72,
    sustainabilityAuditScore: 68,
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
    sccCodes: ["bearings", "fasteners", "precision", "assembly"],
    materialGroups: ["precision-parts", "fasteners"],
    country: "UK",
    segment: "preferred" as const,
    riskAssessmentResult: "A" as const,
    creditCheckScore: 92,
    sgpTotalScore: 90,
    supplierEvaluationScore: 88,
    sustainabilityAuditScore: 85,
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
    sccCodes: ["aluminum", "titanium", "alloy", "aerospace"],
    materialGroups: ["light-metals", "alloys"],
    country: "USA",
    segment: "conditional" as const,
    riskAssessmentResult: "B" as const,
    creditCheckScore: 65,
    sgpTotalScore: 65,
    supplierEvaluationScore: 60,
    sustainabilityAuditScore: 55,
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
    sccCodes: ["forging", "casting", "heavy", "industrial"],
    materialGroups: ["forged-parts", "castings"],
    country: "France",
    segment: "approved" as const,
    riskAssessmentResult: "C" as const,
    creditCheckScore: 55,
    sgpTotalScore: 58,
    supplierEvaluationScore: 55,
    sustainabilityAuditScore: 50,
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

  // Initialise role from localStorage token auth (set by /login/[slug] page)
  const getInitialRole = (): Role => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("procure-auth-role") as Role | null;
      if (storedRole) {
        const validRoles: Role[] = [
          "engineer",
          "procurement",
          "supplier_a",
          "supplier_b",
          "supplier_c",
          "supplier_d",
          "supplier_e",
          "hop",
        ];
        if (validRoles.includes(storedRole)) return storedRole;
      }
    }
    return "engineer";
  };

  const [currentRole, setCurrentRole] = useState<Role>(getInitialRole);
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
        const [rfqs, suppliers, rfqSuppliers, quotations, qcsData, messagesData, notificationsData] = await Promise.all([
          fetchRFQs(),
          fetchSuppliers(),
          fetchRFQSuppliers(),
          fetchAllQuotationsWithItems(),
          fetchQCS(),
          fetchMessages(),
          fetchNotifications(),
        ]);

        // Load quotations with line items for all RFQs
        const quotationPromises = rfqs.map((rfq) => fetchQuotationsWithItems(rfq.id));
        const quotationsArrays = await Promise.all(quotationPromises);
        const allQuotations = quotationsArrays.flat();

        // Update the ID counter to be past the maximum counter found in any loaded data,
        // preventing unique-constraint violations when new records are inserted into Supabase.
        const extractNum = (id: string): number => {
          const m = id.match(/-(\d+)$/);
          return m ? parseInt(m[1], 10) : 0;
        };
        const allLoadedIds = [
          ...rfqs.map((r) => r.id),
          ...allQuotations.map((q) => q.id),
          ...qcsData.map((q) => q.id),
          ...messagesData.map((m) => m.id),
          ...notificationsData.map((n) => n.id),
        ];
        const maxNum = allLoadedIds.reduce((m, id) => Math.max(m, extractNum(id)), 0);
        if (maxNum >= counterRef.current) {
          counterRef.current = maxNum + 1;
        }

        setState((prev) => {
          // Merge Supabase suppliers with defaults — preserve role and other detailed fields
          let mergedSuppliers = prev.suppliers;
          if (suppliers.length > 0) {
            mergedSuppliers = prev.suppliers.map((defaultSup) => {
              const supabaseSup = suppliers.find((s) => s.id === defaultSup.id);
              if (supabaseSup) {
                return {
                  ...defaultSup,
                  name: supabaseSup.name || defaultSup.name,
                  contactPerson: supabaseSup.contactPerson || defaultSup.contactPerson,
                  email: supabaseSup.email || defaultSup.email,
                  commodityFocus: supabaseSup.commodityFocus || defaultSup.commodityFocus,
                  rating: supabaseSup.rating || defaultSup.rating,
                  // CRITICAL: Always preserve the correct role from defaults.
                  // The Supabase role column may be null or incorrect during initial setup,
                  // which would cause supplier dashboards to show a white screen.
                  role: defaultSup.role,
                };
              }
              return defaultSup;
            });
            // Also add any Supabase suppliers not in defaults
            const defaultIds = prev.suppliers.map((s) => s.id);
            const newSuppliers = suppliers.filter((s) => !defaultIds.includes(s.id));
            mergedSuppliers = [...mergedSuppliers, ...newSuppliers];
          }

          return {
            ...prev,
            rfqs: rfqs.length > 0 ? rfqs : prev.rfqs,
            suppliers: mergedSuppliers,
            rfqSuppliers: rfqSuppliers.length > 0 ? rfqSuppliers : prev.rfqSuppliers,
            quotations: quotations.length > 0 ? quotations : prev.quotations,
            qcs: qcsData.length > 0 ? qcsData : prev.qcs,
            messages: messagesData.length > 0 ? messagesData : prev.messages,
            notifications: notificationsData.length > 0 ? notificationsData : prev.notifications,
          };
        });

        // Advance the ID counter past the highest existing numeric suffix so that
        // new records never collide with records already stored in Supabase.
        // Without this, the counter resets to 1 on every page load and the first
        // insert would attempt to reuse an ID like RFQ-2026-001, triggering a
        // unique-constraint violation that causes insertRFQ() to fail silently.
        const allLoadedIds = [
          ...(rfqs ?? []),
          ...(quotations ?? []),
          ...(qcsData ?? []),
          ...(messagesData ?? []),
          ...(notificationsData ?? []),
        ].map((r) => r.id);

        // Extract the trailing numeric part from IDs like "RFQ-2026-001" → 1.
        // IDs with no numeric suffix contribute 0 and are safely ignored.
        const maxNum = allLoadedIds.reduce((max, id) => {
          const match = id.match(/-(\d+)$/);
          return Math.max(max, match ? parseInt(match[1], 10) : 0);
        }, 0);

        if (maxNum >= counterRef.current) {
          counterRef.current = maxNum + 1;
        }

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

      // 1. Optimistic update — show immediately to the current user
      setState((prev) => ({
        ...prev,
        rfqs: prev.rfqs.some((r) => r.id === id) ? prev.rfqs : [newRFQ, ...prev.rfqs],
      }));

      // 2. Persist to Supabase (realtime will sync to all other clients)
      insertRFQ(newRFQ).then((success) => {
        if (!success) {
          console.error("[Supabase] Failed to persist RFQ:", id);
          // Roll back the optimistic update
          setState((prev) => ({
            ...prev,
            rfqs: prev.rfqs.filter((r) => r.id !== id),
          }));
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
    // Persist to Supabase
    updateRFQFields(id, { ...updates, updatedAt: new Date().toISOString() }).then((success) => {
      if (!success) console.error("[Supabase] Failed to persist RFQ update:", id);
    });
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

      // 1. Optimistic update — show immediately to the current user
      setState((prev) => ({
        ...prev,
        quotations: prev.quotations.some((q) => q.id === id)
          ? prev.quotations
          : [...prev.quotations, newQuotation],
        rfqSuppliers: prev.rfqSuppliers.map((rs) =>
          rs.rfqId === newQuotation.rfqId && rs.supplierId === newQuotation.supplierId
            ? { ...rs, status: "Quotation Submitted" as RFQSupplierStatus, quoted: true }
            : rs
        ),
      }));

      // 2. Persist to Supabase (realtime will sync to all other clients)
      (async () => {
        const quotationId = await insertQuotation(newQuotation);
        if (!quotationId) {
          console.error("[Supabase] Failed to persist quotation:", id);
          // Roll back the optimistic update
          setState((prev) => ({
            ...prev,
            quotations: prev.quotations.filter((q) => q.id !== id),
            rfqSuppliers: prev.rfqSuppliers.map((rs) =>
              rs.rfqId === newQuotation.rfqId && rs.supplierId === newQuotation.supplierId
                ? { ...rs, status: "RFQ Received" as RFQSupplierStatus, quoted: false }
                : rs
            ),
          }));
          return;
        }

        if (newQuotation.lineItems && newQuotation.lineItems.length > 0) {
          const itemsSuccess = await insertQuotationItems(id, newQuotation.lineItems);
          if (!itemsSuccess) {
            console.error("[Supabase] Failed to persist quotation items");
          }
        }

        await updateRFQSupplierStatus(newQuotation.rfqId, newQuotation.supplierId, {
          status: "Quotation Submitted",
          quoted: true,
        });
      })();
    },
    [generateId]
  );

  const updateQuotation = useCallback((id: string, updates: Partial<Quotation>) => {
    (async () => {
      // 1. Persist to Supabase first
      const success = await updateQuotationInSupabase(id, updates);
      if (!success) console.error("[Supabase] Failed to persist quotation update:", id);

      // 2. Update local state
      setState((prev) => ({
        ...prev,
        quotations: prev.quotations.map((q) =>
          q.id === id ? { ...q, ...updates } : q
        ),
      }));
    })();
  }, []);

  const addQCS = useCallback(
    (qcs: Omit<QCS, "id" | "createdAt">) => {
      const id = generateId("QCS");
      const newQCS: QCS = { ...qcs, id, createdAt: new Date().toISOString() };
      setState((prev) => ({
        ...prev,
        qcs: [...prev.qcs, newQCS],
      }));
      // Persist to Supabase
      insertQCSToSupabase(newQCS).then((success) => {
        if (!success) console.error("[Supabase] Failed to persist QCS:", id);
      });
    },
    [generateId]
  );

  const updateQCS = useCallback((id: string, updates: Partial<QCS>) => {
    setState((prev) => ({
      ...prev,
      qcs: prev.qcs.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    }));
    // Persist to Supabase
    updateQCSInSupabase(id, updates).then((success) => {
      if (!success) console.error("[Supabase] Failed to persist QCS update:", id);
    });
  }, []);

  const addMessage = useCallback(
    (message: Omit<Message, "id" | "timestamp">) => {
      const id = generateId("MSG");
      const newMsg: Message = { ...message, id, timestamp: new Date().toISOString() };
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, newMsg],
      }));
      // Persist to Supabase
      insertMessageToSupabase(newMsg).then((success) => {
        if (!success) console.error("[Supabase] Failed to persist message:", id);
      });
    },
    [generateId]
  );

  const addSupplier = useCallback(
    (supplier: Omit<Supplier, "id">) => {
      const id = generateId("SUP");
      const newSupplier: Supplier = { ...supplier, id };
      (async () => {
        // 1. Persist to Supabase first
        const success = await insertSupplier(newSupplier);
        if (!success) console.error("[Supabase] Failed to persist supplier:", id);

        // 2. Update local state
        setState((prev) => ({
          ...prev,
          suppliers: prev.suppliers.some((s) => s.id === id) ? prev.suppliers : [...prev.suppliers, newSupplier],
        }));
      })();
    },
    [generateId]
  );

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "createdAt" | "read">) => {
      const id = generateId("NOT");
      const newNotif: Notification = { ...notification, id, createdAt: new Date().toISOString(), read: false };
      setState((prev) => ({
        ...prev,
        notifications: [newNotif, ...prev.notifications],
      }));
      // Persist to Supabase
      insertNotificationToSupabase(newNotif).then((success) => {
        if (!success) console.error("[Supabase] Failed to persist notification:", id);
      });
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
    // Persist to Supabase
    updateNotificationRead(id, true).then((success) => {
      if (!success) console.error("[Supabase] Failed to persist notification read:", id);
    });
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
