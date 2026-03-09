"use client";

import { supabase } from "./supabaseClient";
import type { RFQ, RFQSupplier, Quotation, QuotationLineItem, Supplier, RFQSupplierStatus } from "./types";

// Map between local camelCase and Supabase snake_case
function toSupabaseRFQ(rfq: RFQ) {
  return {
    id: rfq.id,
    rfq_number: rfq.id,
    project: rfq.project,
    component: rfq.component,
    quantity: rfq.quantity,
    budget: rfq.budget,
    delivery_time: rfq.deliveryTime,
    plant: rfq.plant,
    psp_element: rfq.pspElement,
    technical_contact: rfq.technicalContact,
    on_site_visit_required: rfq.onSiteVisitRequired,
    request_type: rfq.requestType,
    status: rfq.status,
    created_by: rfq.createdBy,
    created_at: rfq.createdAt,
    updated_at: rfq.updatedAt,
  };
}

function fromSupabaseRFQ(row: Record<string, unknown>): RFQ {
  return {
    id: row.id as string,
    project: row.project as string,
    component: row.component as string,
    quantity: row.quantity as number,
    budget: row.budget as number,
    deliveryTime: (row.delivery_time as number) || 4,
    plant: (row.plant as string) || "",
    pspElement: (row.psp_element as string) || "",
    technicalContact: (row.technical_contact as string) || "",
    onSiteVisitRequired: (row.on_site_visit_required as boolean) || false,
    requestType: (row.request_type as RFQ["requestType"]) || "Manufacturing",
    status: (row.status as RFQ["status"]) || "Draft",
    createdBy: (row.created_by as string) || "",
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
  };
}

function fromSupabaseSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: row.id as string,
    name: row.name as string,
    contactPerson: (row.contact_person as string) || "",
    email: (row.email as string) || "",
    commodityFocus: (row.commodity_focus as string) || "",
    status: (row.status as "Approved" | "Pending") || "Pending",
    rating: (row.rating as "A" | "B" | "C") || "B",
    role: (row.role as Supplier["role"]) || "supplier_a",
    approved: (row.approved as boolean) || false,
    capacityConfirmed: (row.capacity_confirmed as boolean) || false,
    technicalCompliance: (row.technical_compliance as boolean) || false,
    commercialSpecCompliant: (row.commercial_spec_compliant as boolean) || false,
    riskScore: (row.risk_score as number) || 50,
  };
}

function fromSupabaseRFQSupplier(row: Record<string, unknown>): RFQSupplier {
  return {
    rfqId: row.rfq_id as string,
    supplierId: row.supplier_id as string,
    assignedAt: (row.assigned_at as string) || new Date().toISOString(),
    status: (row.status as RFQSupplierStatus) || "RFQ Received",
    quoted: (row.quoted as boolean) || false,
  };
}

function fromSupabaseQuotation(row: Record<string, unknown>): Quotation {
  return {
    id: row.id as string,
    rfqId: row.rfq_id as string,
    supplierId: row.supplier_id as string,
    totalPrice: (row.total_price as number) || 0,
    bonusMalus: (row.bonus_malus as number) || 0,
    deliveryTime: (row.delivery_time as number) || 4,
    paymentTerms: (row.payment_terms as string) || "Net 30",
    incoterms: (row.incoterms as string) || "EXW",
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
      return { ...q, lineItems };
    })
  );
  return result;
}

// ===== INSERT FUNCTIONS =====

export async function insertRFQ(rfq: RFQ): Promise<boolean> {
  const { error } = await supabase.from("rfqs").insert(toSupabaseRFQ(rfq));
  if (error) {
    console.error("[Supabase] Error inserting RFQ:", error.message);
    return false;
  }
  return true;
}

export async function insertRFQSupplier(assignment: RFQSupplier): Promise<boolean> {
  const { error } = await supabase.from("rfq_suppliers").insert({
    rfq_id: assignment.rfqId,
    supplier_id: assignment.supplierId,
    status: assignment.status,
    quoted: assignment.quoted,
    assigned_at: assignment.assignedAt,
  });
  if (error) {
    console.error("[Supabase] Error inserting RFQ supplier:", error.message);
    return false;
  }
  return true;
}

export async function insertQuotation(quotation: Omit<Quotation, "lineItems">): Promise<string | null> {
  const { data, error } = await supabase
    .from("quotations")
    .insert({
      id: quotation.id,
      rfq_id: quotation.rfqId,
      supplier_id: quotation.supplierId,
      total_price: quotation.totalPrice,
      bonus_malus: quotation.bonusMalus,
      delivery_time: quotation.deliveryTime,
      payment_terms: quotation.paymentTerms,
      incoterms: quotation.incoterms,
      notes: quotation.comments,
      created_at: quotation.submittedAt,
    })
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

  const { error } = await supabase.from("quotation_items").insert(rows);
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
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", rfqId);
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
    .eq("supplier_id", supplierId);
  if (error) {
    console.error("[Supabase] Error updating RFQ supplier status:", error.message);
    return false;
  }
  return true;
}

// ===== SEED FUNCTION (for initial data) =====

export async function seedSuppliers(): Promise<void> {
  const defaultSuppliers = [
    { id: "SUP-001", name: "Steel Corp GmbH", company: "Steel Corp", rating: "A", role: "supplier_a", status: "Approved" },
    { id: "SUP-002", name: "MetalWorks AG", company: "Industrial Metals", rating: "A", role: "supplier_b", status: "Approved" },
    { id: "SUP-003", name: "Precision Parts Ltd", company: "Precision Parts", rating: "A", role: "supplier_c", status: "Approved" },
    { id: "SUP-004", name: "AlloyTech Industries", company: "Global Steel", rating: "B", role: "supplier_d", status: "Pending" },
    { id: "SUP-005", name: "EuroForge SA", company: "Euro Components", rating: "A", role: "supplier_e", status: "Approved" },
  ];

  for (const sup of defaultSuppliers) {
    const { error } = await supabase.from("suppliers").upsert(sup, { onConflict: "id" });
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
