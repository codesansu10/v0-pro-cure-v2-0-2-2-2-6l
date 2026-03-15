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
  fetchQuotationsWithItems,
  fetchQCS,
  insertQCS as insertQCSToSupabase,
  updateQCSInSupabase,
  fetchMessages,
  insertMessage as insertMessageToSupabase,
  fetchNotifications,
  insertNotification as insertNotificationToSupabase,
  updateNotificationRead,
  updateRFQFields,
  fromSupabaseRFQRow,
  fromSupabaseRFQSupplierRow,
  fromSupabaseQuotationRow,
  fromSupabaseQCSRow,
  fromSupabaseMessageRow,
  fromSupabaseNotificationRow,
} from "./supabase-data";
import { supabase } from "./supabaseClient";

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
  realtimeConnected: boolean;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [currentRole, setCurrentRole] = useState<Role>("engineer");
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedRFQId, setSelectedRFQId] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const counterRef = useRef(1);

  const generateId = useCallback((prefix: string) => {
    const num = counterRef.current++;
    return `${prefix}-2026-${String(num).padStart(3, "0")}`;
  }, []);

  // Load data from Supabase on mount
  useEffect(() => {
    async function loadFromSupabase() {
      try {
        const [rfqs, suppliers, rfqSuppliers, qcsData, messagesData, notificationsData] = await Promise.all([
          fetchRFQs(),
          fetchSuppliers(),
          fetchRFQSuppliers(),
          fetchQCS(),
          fetchMessages(),
          fetchNotifications(),
        ]);

        // Load quotations with line items for all RFQs
        const quotationPromises = rfqs.map((rfq) => fetchQuotationsWithItems(rfq.id));
        const quotationsArrays = await Promise.all(quotationPromises);
        const allQuotations = quotationsArrays.flat();

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
            quotations: allQuotations.length > 0 ? allQuotations : prev.quotations,
            qcs: qcsData.length > 0 ? qcsData : prev.qcs,
            messages: messagesData.length > 0 ? messagesData : prev.messages,
            notifications: notificationsData.length > 0 ? notificationsData : prev.notifications,
          };
        });
        setDataLoaded(true);
      } catch (err) {
        console.error("[Supabase] Error loading data:", err);
        setDataLoaded(true);
      }
    }
    loadFromSupabase();
  }, []);

  // Set up Supabase Realtime subscriptions for live updates
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("procure-realtime")
      // RFQs: new requests created by engineers become visible to all roles
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rfqs" },
        (payload) => {
          const newRFQ = fromSupabaseRFQRow(payload.new as Record<string, unknown>);
          setState((prev) => {
            if (prev.rfqs.some((r) => r.id === newRFQ.id)) return prev;
            return { ...prev, rfqs: [newRFQ, ...prev.rfqs] };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rfqs" },
        (payload) => {
          const updated = fromSupabaseRFQRow(payload.new as Record<string, unknown>);
          setState((prev) => ({
            ...prev,
            rfqs: prev.rfqs.map((r) => (r.id === updated.id ? updated : r)),
          }));
        }
      )
      // RFQ-Supplier assignments: procurement sends to supplier → supplier sees in real-time
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rfq_suppliers" },
        (payload) => {
          const assignment = fromSupabaseRFQSupplierRow(payload.new as Record<string, unknown>);
          setState((prev) => {
            if (prev.rfqSuppliers.some((rs) => rs.rfqId === assignment.rfqId && rs.supplierId === assignment.supplierId)) return prev;
            return { ...prev, rfqSuppliers: [...prev.rfqSuppliers, assignment] };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rfq_suppliers" },
        (payload) => {
          const updated = fromSupabaseRFQSupplierRow(payload.new as Record<string, unknown>);
          setState((prev) => ({
            ...prev,
            rfqSuppliers: prev.rfqSuppliers.map((rs) =>
              rs.rfqId === updated.rfqId && rs.supplierId === updated.supplierId ? updated : rs
            ),
          }));
        }
      )
      // Quotations: supplier submits quotation → procurement/engineer see it in real-time
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "quotations" },
        (payload) => {
          const newQuotation = fromSupabaseQuotationRow(payload.new as Record<string, unknown>);
          setState((prev) => {
            if (prev.quotations.some((q) => q.id === newQuotation.id)) return prev;
            return { ...prev, quotations: [...prev.quotations, newQuotation] };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quotations" },
        (payload) => {
          const updated = fromSupabaseQuotationRow(payload.new as Record<string, unknown>);
          setState((prev) => ({
            ...prev,
            quotations: prev.quotations.map((q) => (q.id === updated.id ? updated : q)),
          }));
        }
      )
      // QCS changes
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "qcs" },
        (payload) => {
          const newQCS = fromSupabaseQCSRow(payload.new as Record<string, unknown>);
          setState((prev) => {
            if (prev.qcs.some((q) => q.id === newQCS.id)) return prev;
            return { ...prev, qcs: [newQCS, ...prev.qcs] };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "qcs" },
        (payload) => {
          const updated = fromSupabaseQCSRow(payload.new as Record<string, unknown>);
          setState((prev) => ({
            ...prev,
            qcs: prev.qcs.map((q) => (q.id === updated.id ? updated : q)),
          }));
        }
      )
      // Messages: real-time chat updates
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = fromSupabaseMessageRow(payload.new as Record<string, unknown>);
          setState((prev) => {
            if (prev.messages.some((m) => m.id === newMsg.id)) return prev;
            return { ...prev, messages: [...prev.messages, newMsg] };
          });
        }
      )
      // Notifications: real-time alerts for all roles
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotif = fromSupabaseNotificationRow(payload.new as Record<string, unknown>);
          setState((prev) => {
            if (prev.notifications.some((n) => n.id === newNotif.id)) return prev;
            return { ...prev, notifications: [newNotif, ...prev.notifications] };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const updated = fromSupabaseNotificationRow(payload.new as Record<string, unknown>);
          setState((prev) => ({
            ...prev,
            notifications: prev.notifications.map((n) => (n.id === updated.id ? updated : n)),
          }));
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, []);

  const getCurrentUser = useCallback(() => {
    return defaultUsers.find((u) => u.role === currentRole) || defaultUsers[0];
  }, [currentRole]);

  const addRFQ = useCallback(
    (rfq: Omit<RFQ, "id" | "createdAt" | "updatedAt">) => {
      const id = generateId("RFQ");
      const now = new Date().toISOString();
      const newRFQ: RFQ = { ...rfq, id, createdAt: now, updatedAt: now };

      (async () => {
        // 1. Save to Supabase FIRST
        const success = await insertRFQ(newRFQ);
        if (!success) {
          console.error("[Supabase] Failed to persist RFQ:", id);
        }

        // 2. Update local state (realtime will also sync other clients)
        setState((prev) => ({
          ...prev,
          rfqs: prev.rfqs.some((r) => r.id === id) ? prev.rfqs : [...prev.rfqs, newRFQ],
        }));


      })();

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

      (async () => {
        // 1. Save quotation to Supabase FIRST
        const quotationId = await insertQuotation(newQuotation);
        if (!quotationId) {
          console.error("[Supabase] Failed to persist quotation:", id);
        }

        // 2. Save line items if any
        if (quotationId && newQuotation.lineItems && newQuotation.lineItems.length > 0) {
          const itemsSuccess = await insertQuotationItems(id, newQuotation.lineItems);
          if (!itemsSuccess) {
            console.error("[Supabase] Failed to persist quotation items");
          }
        }

        // 3. Update RFQ-Supplier status in Supabase
        if (quotationId) {
          await updateRFQSupplierStatus(newQuotation.rfqId, newQuotation.supplierId, {
            status: "Quotation Submitted",
            quoted: true,
          });
        }

        // 4. Update local state
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
        realtimeConnected,
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
