import { supabase } from "./supabaseClient";
import type { RFQ, Supplier, RFQSupplier, Quotation, QuotationLineItem, RFQSupplierStatus } from "./types";

// ===== MAPPING FUNCTIONS =====

function fromSupabaseRFQ(row: Record<string, unknown>): RFQ {
  return {
    id: (row.rfq_number as string) || (row.id as string),
    project: (row.project as string) || "",
    component: (row.component as string) || "",
    quantity: (row.quantity as number) || 0,
    budget: (row.budget as number) || 0,
    status: (row.status as RFQ["status"]) || "Draft",
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || (row.created_at as string) || new Date().toISOString(),
  };
}

function toSupabaseRFQ(rfq: RFQ): Record<string, unknown> {
  return {
    rfq_number: rfq.id,
    project: rfq.project,
    component: rfq.component,
    quantity: rfq.quantity,
    budget: rfq.budget,
    status: rfq.status,
    created_at: rfq.createdAt,
  };
}

// Map a supplier ID like "SUP-001" to a role like "supplier_a"
const supplierIdToRoleMap: Record<string, Supplier["role"]> = {
  "SUP-001": "supplier_a",
  "SUP-002": "supplier_b",
  "SUP-003": "supplier_c",
  "SUP-004": "supplier_d",
  "SUP-005": "supplier_e",
};

function fromSupabaseSupplier(row: Record<string, unknown>): Supplier {
  const id = (row.id as string) || "";
  // Use the role from the DB row; if missing/null, derive it from the supplier's ID
  const role: Supplier["role"] =
    (row.role as Supplier["role"]) ||
    supplierIdToRoleMap[id] ||
    "supplier_a";
  return {
    id,
    name: (row.name as string) || "",
    contactPerson: (row.contact_name as string) || "",
    email: (row.email as string) || "",
    commodityFocus: (row.company as string) || "",
    status: "Approved" as const,
    rating: (row.rating as "A" | "B" | "C") || "B",
    role,
    approved: true,
    capacityConfirmed: true,
    technicalCompliance: true,
    commercialSpecCompliant: true,
    riskScore: 20,
  };
}

function fromSupabaseRFQSupplier(row: Record<string, unknown>): RFQSupplier {
  return {
    rfqId: row.rfq_id as string,
    supplierId: row.supplier_id as string,
    assignedAt: new Date().toISOString(),
    status: (row.status as RFQSupplierStatus) || "RFQ Received",
    quoted: (row.quoted as boolean) || false,
  };
}

function fromSupabaseQuotation(row: Record<string, unknown>): Quotation {
  return {
    id: row.id as string,
    rfqId: row.rfq_id as string,
    supplierId: row.supplier_id as string,
    totalPrice: 0,
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
    itemName: (row.item_name as string) || "",
    description: (row.description as string) || "",
    quantity: (row.quantity as number) || 0,
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

export async function fetchQuotations(rfqId?: string): Promise<Quotation[]> {
  const { data, error } = await supabase.from("quotations").select("*");
  if (error) {
    console.error("[Supabase] Error fetching quotations:", error.message);
    return [];
  }
  const quotations = (data || []).map(fromSupabaseQuotation);
  if (rfqId) {
    return quotations.filter((q) => q.rfqId === rfqId);
  }
  return quotations;
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

// ===== SEED FUNCTION =====

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
