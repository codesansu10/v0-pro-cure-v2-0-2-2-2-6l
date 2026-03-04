"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import type { AppState, Role, RFQ, Quotation, QCS, Message, RFQSupplier, Supplier } from "./types";

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
  addQuotation: (quotation: Omit<Quotation, "id" | "submittedAt">) => void;
  updateQuotation: (id: string, updates: Partial<Quotation>) => void;
  addQCS: (qcs: Omit<QCS, "id" | "createdAt">) => void;
  updateQCS: (id: string, updates: Partial<QCS>) => void;
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  addSupplier: (supplier: Omit<Supplier, "id">) => void;
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
  const counterRef = useRef(1);

  const generateId = useCallback((prefix: string) => {
    const num = counterRef.current++;
    return `${prefix}-2026-${String(num).padStart(3, "0")}`;
  }, []);

  const getCurrentUser = useCallback(() => {
    return defaultUsers.find((u) => u.role === currentRole) || defaultUsers[0];
  }, [currentRole]);

  const addRFQ = useCallback(
    (rfq: Omit<RFQ, "id" | "createdAt" | "updatedAt">) => {
      const id = generateId("RFQ");
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        rfqs: [...prev.rfqs, { ...rfq, id, createdAt: now, updatedAt: now }],
      }));
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
    setState((prev) => {
      const exists = prev.rfqSuppliers.find(
        (rs) => rs.rfqId === rfqId && rs.supplierId === supplierId
      );
      if (exists) return prev;
      const assignment: RFQSupplier = {
        rfqId,
        supplierId,
        assignedAt: new Date().toISOString(),
      };
      return { ...prev, rfqSuppliers: [...prev.rfqSuppliers, assignment] };
    });
  }, []);

  const addQuotation = useCallback(
    (quotation: Omit<Quotation, "id" | "submittedAt">) => {
      const id = generateId("QOT");
      setState((prev) => ({
        ...prev,
        quotations: [
          ...prev.quotations,
          { ...quotation, id, submittedAt: new Date().toISOString() },
        ],
      }));
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
        addQuotation,
        updateQuotation,
        addQCS,
        updateQCS,
        addMessage,
        addSupplier,
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
