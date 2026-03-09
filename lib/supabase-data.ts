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
    assignedAt: new Date().toISOString(), // Not stored in DB
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
  console.log("[v0] Supabase: Fetching RFQs from 'rfqs' table...");
  const { data, error } = await supabase.from("rfqs").select("*").order("created_at", { ascending: false });
  console.log("[v0] Supabase fetchRFQs - data:", data);
  console.log("[v0] Supabase fetchRFQs - error:", error);
  if (error) {
    console.error("[v0] Supabase ERROR fetching RFQs:", error.message, error.details, error.hint);
    return [];
  }
  console.log("[v0] Supabase: Fetched", data?.length || 0, "RFQs successfully");
  return (data || []).map(fromSupabaseRFQ);
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  console.log("[v0] Supabase: Fetching suppliers from 'suppliers' table...");
  const { data, error } = await supabase.from("suppliers").select("*");
  
  console.log("[v0] Supabase fetchSuppliers - raw data:", JSON.stringify(data, null, 2));
  console.log("[v0] Supabase fetchSuppliers - error:", error);
  
  if (error) {
    console.error("[v0] Supabase ERROR fetching suppliers:", error.message, error.details, error.hint);
    return [];
  }
  
  const suppliers = (data || []).map(fromSupabaseSupplier);
  console.log("[v0] Supabase: Fetched", suppliers.length, "suppliers:");
  suppliers.forEach((s, i) => {
    console.log(`[v0]   Supplier ${i + 1}: id=${s.id}, name=${s.name}, role=${s.role}, email=${s.email}`);
  });
  
  return suppliers;
}

export async function fetchRFQSuppliers(): Promise<RFQSupplier[]> {
  console.log("[v0] Supabase: Fetching rfq_suppliers...");
  const { data, error } = await supabase.from("rfq_suppliers").select("*");
  
  console.log("[v0] Supabase fetchRFQSuppliers - data:", data);
  console.log("[v0] Supabase fetchRFQSuppliers - error:", error);
  
  if (error) {
    console.error("[v0] Supabase ERROR fetching RFQ suppliers:", error.message, error.details, error.hint);
    return [];
  }
  console.log("[v0] Supabase: Fetched", data?.length || 0, "rfq_supplier records");
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
  console.log("[v0] Supabase: Inserting RFQ into 'rfqs' table...");
  console.log("[v0] Supabase insertRFQ - payload:", supabaseData);
  
  const { data, error } = await supabase.from("rfqs").insert(supabaseData).select();
  
  console.log("[v0] Supabase insertRFQ - response data:", data);
  console.log("[v0] Supabase insertRFQ - response error:", error);
  
  if (error) {
    console.error("[v0] Supabase ERROR inserting RFQ:", error.message, error.details, error.hint, error.code);
    return false;
  }
  console.log("[v0] Supabase: RFQ inserted successfully:", rfq.id);
  return true;
}

export async function insertRFQSupplier(assignment: RFQSupplier): Promise<boolean> {
  // Only include columns that exist in rfq_suppliers table: rfq_id, supplier_id, status, quoted
  const payload = {
    rfq_id: assignment.rfqId,
    supplier_id: assignment.supplierId,
    status: assignment.status,
    quoted: assignment.quoted,
  };
  
  console.log("[v0] Supabase: Inserting into 'rfq_suppliers' table...");
  console.log("[v0] Supabase insertRFQSupplier - payload:", payload);
  
  const { data, error } = await supabase.from("rfq_suppliers").insert(payload).select();
  
  console.log("[v0] Supabase insertRFQSupplier - response data:", data);
  console.log("[v0] Supabase insertRFQSupplier - response error:", error);
  
  if (error) {
    console.error("[v0] Supabase ERROR inserting RFQ supplier:", error.message, error.details, error.hint, error.code);
    return false;
  }
  console.log("[v0] Supabase: RFQ supplier assignment inserted successfully");
  return true;
}

export async function insertQuotation(quotation: Omit<Quotation, "lineItems">): Promise<string | null> {
  // Only insert columns that exist in the quotations table: id, rfq_id, supplier_id, notes, created_at
  const payload = {
    id: quotation.id,
    rfq_id: quotation.rfqId,
    supplier_id: quotation.supplierId,
    notes: quotation.comments || "",
    created_at: quotation.submittedAt,
  };
  
  console.log("[v0] Supabase: Inserting into 'quotations' table...");
  console.log("[v0] Supabase insertQuotation - payload:", payload);
  
  const { data, error } = await supabase
    .from("quotations")
    .insert(payload)
    .select("id")
    .single();
  
  console.log("[v0] Supabase insertQuotation - response data:", data);
  console.log("[v0] Supabase insertQuotation - response error:", error);
  
  if (error) {
    console.error("[v0] Supabase ERROR inserting quotation:", error.message, error.details, error.hint, error.code);
    return null;
  }
  console.log("[v0] Supabase: Quotation inserted successfully:", data?.id);
  return data?.id || quotation.id;
}

export async function insertQuotationItems(quotationId: string, items: QuotationLineItem[]): Promise<boolean> {
  if (items.length === 0) {
    console.log("[v0] Supabase: No quotation items to insert, skipping");
    return true;
  }
  
  const rows = items.map((item) => ({
    id: item.id,
    quotation_id: quotationId,
    item_name: item.itemName,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
  }));

  console.log("[v0] Supabase: Inserting", rows.length, "items into 'quotation_items' table...");
  console.log("[v0] Supabase insertQuotationItems - payload:", rows);

  const { data, error } = await supabase.from("quotation_items").insert(rows).select();
  
  console.log("[v0] Supabase insertQuotationItems - response data:", data);
  console.log("[v0] Supabase insertQuotationItems - response error:", error);
  
  if (error) {
    console.error("[v0] Supabase ERROR inserting quotation items:", error.message, error.details, error.hint, error.code);
    return false;
  }
  console.log("[v0] Supabase: Quotation items inserted successfully");
  return true;
}

// ===== UPDATE FUNCTIONS =====

export async function updateRFQStatus(rfqId: string, status: string): Promise<boolean> {
  console.log("[v0] Supabase: Updating RFQ status in 'rfqs' table...", rfqId, status);
  
  // Use rfq_number column (not id) since that's how we store the RFQ ID
  const { data, error } = await supabase
    .from("rfqs")
    .update({ status })
    .eq("rfq_number", rfqId)
    .select();
    
  console.log("[v0] Supabase updateRFQStatus - response data:", data);
  console.log("[v0] Supabase updateRFQStatus - response error:", error);
  
  if (error) {
    console.error("[v0] Supabase ERROR updating RFQ status:", error.message, error.details, error.hint, error.code);
    return false;
  }
  console.log("[v0] Supabase: RFQ status updated successfully");
  return true;
}

export async function updateRFQSupplierStatus(
  rfqId: string,
  supplierId: string,
  updates: { status?: RFQSupplierStatus; quoted?: boolean }
): Promise<boolean> {
  console.log("[v0] Supabase: Updating RFQ supplier status in 'rfq_suppliers' table...");
  console.log("[v0] Supabase updateRFQSupplierStatus - rfqId:", rfqId, "supplierId:", supplierId, "updates:", updates);
  
  const { data, error } = await supabase
    .from("rfq_suppliers")
    .update(updates)
    .eq("rfq_id", rfqId)
    .eq("supplier_id", supplierId)
    .select();
    
  console.log("[v0] Supabase updateRFQSupplierStatus - response data:", data);
  console.log("[v0] Supabase updateRFQSupplierStatus - response error:", error);
  
  if (error) {
    console.error("[v0] Supabase ERROR updating RFQ supplier status:", error.message, error.details, error.hint, error.code);
    return false;
  }
  console.log("[v0] Supabase: RFQ supplier status updated successfully");
  return true;
}

// ===== SEED FUNCTION (for initial data) =====

export async function seedSuppliers(): Promise<void> {
  console.log("[v0] Supabase: Seeding suppliers table with all 5 suppliers...");
  
  const defaultSuppliers = [
    { id: "SUP-001", name: "Supplier A", company: "Steel Corp", email: "suppliera@steelcorp.com", contact_name: "Anna Keller", rating: "A", role: "supplier_a" },
    { id: "SUP-002", name: "Supplier B", company: "Industrial Metals", email: "supplierb@industrialmetals.com", contact_name: "Markus Weber", rating: "A", role: "supplier_b" },
    { id: "SUP-003", name: "Supplier C", company: "Precision Parts", email: "supplierc@precisionparts.com", contact_name: "Sophie Lang", rating: "A", role: "supplier_c" },
    { id: "SUP-004", name: "Supplier D", company: "Global Steel", email: "supplierd@globalsteel.com", contact_name: "Daniel Braun", rating: "B", role: "supplier_d" },
    { id: "SUP-005", name: "Supplier E", company: "Euro Components", email: "suppliere@eurocomponents.com", contact_name: "Laura Fischer", rating: "A", role: "supplier_e" },
  ];

  for (const sup of defaultSuppliers) {
    console.log("[v0] Supabase: Upserting supplier:", sup.name, sup.id);
    const { data, error } = await supabase.from("suppliers").upsert(sup, { onConflict: "id" }).select();
    if (error) {
      console.error("[v0] Supabase ERROR seeding supplier:", sup.name, error.message, error.details, error.hint);
    } else {
      console.log("[v0] Supabase: Supplier seeded successfully:", sup.name, data);
    }
  }
  
  console.log("[v0] Supabase: Finished seeding suppliers");
}

// ===== SUPPLIER RESOLUTION =====

export function resolveSupplierIdByRole(role: string, suppliers: Supplier[]): string | null {
  const supplier = suppliers.find((s) => s.role === role);
  return supplier?.id || null;
}
