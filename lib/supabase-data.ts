"use client";

import { supabase } from "./supabaseClient";
import type { RFQ, RFQSupplier, Quotation, QuotationLineItem, Supplier, RFQSupplierStatus } from "./types";

// Map between local camelCase and Supabase snake_case
// Only include columns that exist in the Supabase "rfqs" table:
// rfq_number, project, component, quantity, budget, status
function toSupabaseRFQ(rfq: RFQ) {
  return {
    rfq_number: rfq.id,
    project: rfq.project,
    component: rfq.component,
    quantity: rfq.quantity,
    budget: rfq.budget,
    status: rfq.status,
  };
}

function fromSupabaseRFQ(row: Record<string, unknown>): RFQ {
  // Map from Supabase columns: rfq_number, project, component, quantity, budget, status
  return {
    id: (row.rfq_number as string) || (row.id as string) || "",
    project: (row.project as string) || "",
    component: (row.component as string) || "",
    quantity: (row.quantity as number) || 0,
    budget: (row.budget as number) || 0,
    deliveryTime: 4, // default since not stored in DB
    plant: "",
    pspElement: "",
    technicalContact: "",
    onSiteVisitRequired: false,
    requestType: "Manufacturing" as RFQ["requestType"],
    status: (row.status as RFQ["status"]) || "Draft",
    createdBy: "",
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
  };
}

function fromSupabaseSupplier(row: Record<string, unknown>): Supplier {
  // Map from Supabase columns: id, name, company, email, contact_name, rating, role, created_at
  const supplier: Supplier = {
    id: (row.id as string) || "",
    name: (row.name as string) || "",
    contactPerson: (row.contact_name as string) || (row.contact_person as string) || "",
    email: (row.email as string) || "",
    commodityFocus: (row.company as string) || (row.commodity_focus as string) || "",
    status: "Approved" as const,
    rating: (row.rating as "A" | "B" | "C") || "B",
    role: (row.role as Supplier["role"]) || "supplier_a",
    approved: true,
    capacityConfirmed: true,
    technicalCompliance: true,
    commercialSpecCompliant: true,
    riskScore: 20,
  };
  return supplier;
}

function fromSupabaseRFQSupplier(row: Record<string, unknown>): RFQSupplier {
  return {
    rfqId: row.rfq_id as string,
    supplierId: row.supplier_id as string,
    assignedAt: (row.created_at as string) || new Date().toISOString(),
    status: (row.status as RFQSupplierStatus) || "RFQ Received",
    quoted: (row.quoted as boolean) || false,
  };
}

function fromSupabaseQuotation(row: Record<string, unknown>): Quotation {
  // Map from Supabase columns: id, rfq_id, supplier_id, notes, created_at
  // Other fields use defaults since they're not stored in DB
  return {
    id: row.id as string,
    rfqId: row.rfq_id as string,
    supplierId: row.supplier_id as string,
    totalPrice: 0, // Calculated from line items
    bonusMalus: 0,
    deliveryTime: 4,
    paymentTerms: "Net 30",
    incoterms: "EXW",
    comments: (row.notes as string) || "",
    submittedAt: (row.created_at as string) || new Date().toISOString(),
  };
}

function fromSupabaseQuotationItem(row: Record<string, unknown>): QuotationLineItem {
  return {
    id: row.id as string,
    itemName: row.item_name as string,
    description: (row.description as string) || "",
    quantity: (row.quantity as number) || 1,
    unitPrice: (row.unit_price as number) || 0,
    totalPrice: (row.total_price as number) || 0,
  };
}

// ===== FETCH FUNCTIONS =====

export async function fetchRFQs(): Promise<RFQ[]> {
  const { data, error } = await supabase.from("rfqs").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("[Supabase] Error fetching RFQs:", error.message);
    return [];
  }
  return (data || []).map(fromSupabaseRFQ);
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from("suppliers").select("*");
  if (error) {
    console.error("[Supabase] Error fetching suppliers:", error.message);
    return [];
  }
  return (data || []).map(fromSupabaseSupplier);
}

export async function fetchRFQSuppliers(): Promise<RFQSupplier[]> {
  const { data, error } = await supabase.from("rfq_suppliers").select("*");
  if (error) {
    console.error("[Supabase] Error fetching RFQ suppliers:", error.message);
    return [];
  }
  return (data || []).map(fromSupabaseRFQSupplier);
}

export async function fetchSupplierRFQs(supplierId: string): Promise<{ rfq: RFQ; assignment: RFQSupplier }[]> {
  const { data, error } = await supabase
    .from("rfq_suppliers")
    .select("*, rfqs(*)")
    .eq("supplier_id", supplierId);
  
  if (error) {
    console.error("[Supabase] Error fetching supplier RFQs:", error.message);
    return [];
  }
  
  return (data || []).map((row) => ({
    rfq: fromSupabaseRFQ(row.rfqs as Record<string, unknown>),
    assignment: fromSupabaseRFQSupplier(row),
  }));
}

export async function fetchQuotations(rfqId?: string): Promise<Quotation[]> {
  let query = supabase.from("quotations").select("*");
  if (rfqId) {
    query = query.eq("rfq_id", rfqId);
  }
  const { data, error } = await query;
  if (error) {
    console.error("[Supabase] Error fetching quotations:", error.message);
    return [];
  }
  return (data || []).map(fromSupabaseQuotation);
}

export async function fetchQuotationItems(quotationId: string): Promise<QuotationLineItem[]> {
  const { data, error } = await supabase
    .from("quotation_items")
    .select("*")
    .eq("quotation_id", quotationId);
  if (error) {
    console.error("[Supabase] Error fetching quotation items:", error.message);
    return [];
  }
  return (data || []).map(fromSupabaseQuotationItem);
}

export async function fetchQuotationsWithItems(rfqId: string): Promise<(Quotation & { lineItems: QuotationLineItem[] })[]> {
  const quotations = await fetchQuotations(rfqId);
  const result = await Promise.all(
    quotations.map(async (q) => {
      const lineItems = await fetchQuotationItems(q.id);
      // Calculate totalPrice from line items since it's not stored in quotations table
      const totalPrice = lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      return { ...q, totalPrice, lineItems };
    })
  );
  return result;
}

// ===== INSERT FUNCTIONS =====

export async function insertRFQ(rfq: RFQ): Promise<boolean> {
  const supabaseData = toSupabaseRFQ(rfq);
  const { error } = await supabase.from("rfqs").insert(supabaseData).select();
  if (error) {
    console.error("[Supabase] Error inserting RFQ:", error.message);
    return false;
  }
  return true;
}

export async function insertRFQSupplier(assignment: RFQSupplier): Promise<boolean> {
  const payload = {
    rfq_id: assignment.rfqId,
    supplier_id: assignment.supplierId,
    status: assignment.status,
    quoted: assignment.quoted,
    created_at: assignment.assignedAt,
  };
  const { error } = await supabase.from("rfq_suppliers").insert(payload).select();
  if (error) {
    console.error("[Supabase] Error inserting RFQ supplier:", error.message);
    return false;
  }
  return true;
}

export async function insertQuotation(quotation: Omit<Quotation, "lineItems">): Promise<string | null> {
  const payload = {
    id: quotation.id,
    rfq_id: quotation.rfqId,
    supplier_id: quotation.supplierId,
    notes: quotation.comments || "",
    created_at: quotation.submittedAt,
  };
  const { data, error } = await supabase
    .from("quotations")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    console.error("[Supabase] Error inserting quotation:", error.message);
    return null;
  }
  return data?.id || quotation.id;
}

export async function insertQuotationItems(quotationId: string, items: QuotationLineItem[]): Promise<boolean> {
  if (items.length === 0) return true;
  
  const rows = items.map((item) => ({
    id: item.id,
    quotation_id: quotationId,
    item_name: item.itemName,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
  }));
  const { error } = await supabase.from("quotation_items").insert(rows).select();
  if (error) {
    console.error("[Supabase] Error inserting quotation items:", error.message);
    return false;
  }
  return true;
}

// ===== UPDATE FUNCTIONS =====

export async function updateRFQStatus(rfqId: string, status: string): Promise<boolean> {
  const { error } = await supabase
    .from("rfqs")
    .update({ status })
    .eq("rfq_number", rfqId)
    .select();
  if (error) {
    console.error("[Supabase] Error updating RFQ status:", error.message);
    return false;
  }
  return true;
}

export async function updateRFQSupplierStatus(
  rfqId: string,
  supplierId: string,
  updates: { status?: RFQSupplierStatus; quoted?: boolean }
): Promise<boolean> {
  const { error } = await supabase
    .from("rfq_suppliers")
    .update(updates)
    .eq("rfq_id", rfqId)
    .eq("supplier_id", supplierId)
    .select();
  if (error) {
    console.error("[Supabase] Error updating RFQ supplier status:", error.message);
    return false;
  }
  return true;
}

// ===== SEED FUNCTION (for initial data) =====

export async function seedSuppliers(): Promise<void> {
  const defaultSuppliers = [
    { id: "SUP-001", name: "Supplier A", company: "Steel Corp", email: "suppliera@steelcorp.com", contact_name: "Anna Keller", rating: "A", role: "supplier_a" },
    { id: "SUP-002", name: "Supplier B", company: "Industrial Metals", email: "supplierb@industrialmetals.com", contact_name: "Markus Weber", rating: "A", role: "supplier_b" },
    { id: "SUP-003", name: "Supplier C", company: "Precision Parts", email: "supplierc@precisionparts.com", contact_name: "Sophie Lang", rating: "A", role: "supplier_c" },
    { id: "SUP-004", name: "Supplier D", company: "Global Steel", email: "supplierd@globalsteel.com", contact_name: "Daniel Braun", rating: "B", role: "supplier_d" },
    { id: "SUP-005", name: "Supplier E", company: "Euro Components", email: "suppliere@eurocomponents.com", contact_name: "Laura Fischer", rating: "A", role: "supplier_e" },
  ];

  for (const sup of defaultSuppliers) {
    const { error } = await supabase.from("suppliers").upsert(sup, { onConflict: "id" }).select();
    if (error) {
      console.error("[Supabase] Error seeding supplier:", sup.name, error.message);
    }
  }
}

// ===== SUPPLIER RESOLUTION =====

export function resolveSupplierIdByRole(role: string, suppliers: Supplier[]): string | null {
  const supplier = suppliers.find((s) => s.role === role);
  return supplier?.id || null;
}
