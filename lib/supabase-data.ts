import { supabase } from "./supabaseClient";
import type {
  RFQ,
  Supplier,
  RFQSupplier,
  Quotation,
  QuotationLineItem,
  RFQSupplierStatus,
  QCS,
  QCSStatus,
  Message,
  ThreadType,
  Notification,
  NotificationRole,
  NotificationType,
  RequestType,
} from "./types";

// ===== MAPPING FUNCTIONS =====

export function fromSupabaseRFQRow(row: Record<string, unknown>): RFQ {
  return {
    id: (row.rfq_number as string) || (row.id as string),
    project: (row.project as string) || "",
    component: (row.component as string) || "",
    quantity: (row.quantity as number) || 0,
    budget: (row.budget as number) || 0,
    deliveryTime: (row.delivery_time as number) || 4,
    plant: (row.plant as string) || "",
    pspElement: (row.psp_element as string) || "",
    technicalContact: (row.technical_contact as string) || "",
    onSiteVisitRequired: (row.on_site_visit_required as boolean) || false,
    requestType: (row.request_type as RequestType) || "Manufacturing",
    status: (row.status as RFQ["status"]) || "Draft",
    createdBy: (row.created_by as string) || "",
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || (row.created_at as string) || new Date().toISOString(),
  };
}

// Keep internal alias for backwards compat within this file
function fromSupabaseRFQ(row: Record<string, unknown>): RFQ {
  return fromSupabaseRFQRow(row);
}

function toSupabaseRFQ(rfq: RFQ): Record<string, unknown> {
  return {
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

const supplierIdToRole: Record<string, Supplier["role"]> = {
  "SUP-001": "supplier_a",
  "SUP-002": "supplier_b",
  "SUP-003": "supplier_c",
  "SUP-004": "supplier_d",
  "SUP-005": "supplier_e",
};

const validSupplierRoles: Supplier["role"][] = ["supplier_a", "supplier_b", "supplier_c", "supplier_d", "supplier_e"];

function fromSupabaseSupplier(row: Record<string, unknown>): Supplier {
  const id = (row.id as string) || "";
  const rawRole = row.role as string;
  const role = validSupplierRoles.includes(rawRole as Supplier["role"])
    ? (rawRole as Supplier["role"])
    : supplierIdToRole[id] || "supplier_a";

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

export function fromSupabaseRFQSupplierRow(row: Record<string, unknown>): RFQSupplier {
  return {
    rfqId: row.rfq_id as string,
    supplierId: row.supplier_id as string,
    assignedAt: new Date().toISOString(),
    status: (row.status as RFQSupplierStatus) || "RFQ Received",
    quoted: (row.quoted as boolean) || false,
  };
}

function fromSupabaseRFQSupplier(row: Record<string, unknown>): RFQSupplier {
  return fromSupabaseRFQSupplierRow(row);
}

export function fromSupabaseQuotationRow(row: Record<string, unknown>): Quotation {
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
    quotationPdfUrl: (row.quotation_pdf_url as string) || undefined,
    supportingDocsUrl: (row.supporting_docs_url as string) || undefined,
  };
}

function fromSupabaseQuotation(row: Record<string, unknown>): Quotation {
  return fromSupabaseQuotationRow(row);
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
  if (!supabase) return [];
  const { data, error } = await supabase.from("rfqs").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("[Supabase] Error fetching RFQs:", error.message);
    return [];
  }
  return (data || []).map(fromSupabaseRFQ);
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("suppliers").select("*");
  if (error) {
    console.error("[Supabase] Error fetching suppliers:", error.message);
    return [];
  }
  return (data || []).map(fromSupabaseSupplier);
}

export async function fetchRFQSuppliers(): Promise<RFQSupplier[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("rfq_suppliers").select("*");
  if (error) {
    console.error("[Supabase] Error fetching RFQ suppliers:", error.message);
    return [];
  }
  return (data || []).map(fromSupabaseRFQSupplier);
}

export async function fetchQuotations(rfqId?: string): Promise<Quotation[]> {
  if (!supabase) return [];
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
  if (!supabase) return [];
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
  if (!supabase) return false;
  const supabaseData = toSupabaseRFQ(rfq);
  const { error } = await supabase.from("rfqs").insert(supabaseData).select();
  if (error) {
    console.error("[Supabase] Error inserting RFQ:", error.message);
    return false;
  }
  return true;
}

export async function insertRFQSupplier(assignment: RFQSupplier): Promise<boolean> {
  if (!supabase) return false;
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
  if (!supabase) return null;
  const payload = {
    id: quotation.id,
    rfq_id: quotation.rfqId,
    supplier_id: quotation.supplierId,
    total_price: quotation.totalPrice,
    bonus_malus: quotation.bonusMalus,
    delivery_time: quotation.deliveryTime,
    payment_terms: quotation.paymentTerms,
    incoterms: quotation.incoterms,
    notes: quotation.comments || "",
    quotation_pdf_url: quotation.quotationPdfUrl || null,
    supporting_docs_url: quotation.supportingDocsUrl || null,
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
  if (!supabase) return false;
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

export async function insertQuotationWithItems(
  quotation: Omit<Quotation, "lineItems">,
  lineItems: QuotationLineItem[]
): Promise<boolean> {
  const quotationId = await insertQuotation(quotation);
  if (!quotationId) return false;

  if (lineItems && lineItems.length > 0) {
    const itemsSuccess = await insertQuotationItems(quotationId, lineItems);
    if (!itemsSuccess) return false;
  }

  return true;
}

// ===== UPDATE FUNCTIONS =====

export async function updateRFQStatus(rfqId: string, status: string): Promise<boolean> {
  if (!supabase) return false;
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
  if (!supabase) return false;
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
  if (!supabase) return;
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

// ===== QCS FUNCTIONS =====

export function fromSupabaseQCSRow(row: Record<string, unknown>): QCS {
  return {
    id: row.id as string,
    rfqId: row.rfq_id as string,
    createdByUserId: (row.created_by_user_id as string) || "",
    buyer: (row.buyer as string) || "",
    project: (row.project as string) || "",
    pspElement: (row.psp_element as string) || "",
    budget: (row.budget as number) || 0,
    impactSavings: (row.impact_savings as number) || 0,
    comment: (row.comment as string) || "",
    status: (row.status as QCSStatus) || "draft",
    submittedToHopAt: (row.submitted_to_hop_at as string) || undefined,
    hopDecisionAt: (row.hop_decision_at as string) || undefined,
    hopComment: (row.hop_comment as string) || undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

function fromSupabaseQCS(row: Record<string, unknown>): QCS {
  return fromSupabaseQCSRow(row);
}

export async function fetchQCS(): Promise<QCS[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("qcs").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("[Supabase] Error fetching QCS:", error.message);
    return [];
  }
  return (data || []).map(fromSupabaseQCS);
}

export async function insertQCS(qcs: QCS): Promise<boolean> {
  if (!supabase) return false;
  const payload = {
    id: qcs.id,
    rfq_id: qcs.rfqId,
    created_by_user_id: qcs.createdByUserId,
    buyer: qcs.buyer,
    project: qcs.project,
    psp_element: qcs.pspElement,
    budget: qcs.budget,
    impact_savings: qcs.impactSavings,
    comment: qcs.comment,
    status: qcs.status,
    submitted_to_hop_at: qcs.submittedToHopAt || null,
    hop_decision_at: qcs.hopDecisionAt || null,
    hop_comment: qcs.hopComment || null,
    created_at: qcs.createdAt,
  };
  const { error } = await supabase.from("qcs").insert(payload).select();
  if (error) {
    console.error("[Supabase] Error inserting QCS:", error.message);
    return false;
  }
  return true;
}

export async function updateQCSInSupabase(id: string, updates: Partial<QCS>): Promise<boolean> {
  if (!supabase) return false;
  const payload: Record<string, unknown> = {};
  if (updates.rfqId !== undefined) payload.rfq_id = updates.rfqId;
  if (updates.createdByUserId !== undefined) payload.created_by_user_id = updates.createdByUserId;
  if (updates.buyer !== undefined) payload.buyer = updates.buyer;
  if (updates.project !== undefined) payload.project = updates.project;
  if (updates.pspElement !== undefined) payload.psp_element = updates.pspElement;
  if (updates.budget !== undefined) payload.budget = updates.budget;
  if (updates.impactSavings !== undefined) payload.impact_savings = updates.impactSavings;
  if (updates.comment !== undefined) payload.comment = updates.comment;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.submittedToHopAt !== undefined) payload.submitted_to_hop_at = updates.submittedToHopAt;
  if (updates.hopDecisionAt !== undefined) payload.hop_decision_at = updates.hopDecisionAt;
  if (updates.hopComment !== undefined) payload.hop_comment = updates.hopComment;

  const { error } = await supabase.from("qcs").update(payload).eq("id", id).select();
  if (error) {
    console.error("[Supabase] Error updating QCS:", error.message);
    return false;
  }
  return true;
}

// ===== MESSAGE FUNCTIONS =====

export function fromSupabaseMessageRow(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    rfqId: (row.rfq_id as string) || undefined,
    qcsId: (row.qcs_id as string) || undefined,
    threadType: (row.thread_type as ThreadType),
    supplierId: (row.supplier_id as string) || undefined,
    sender: row.sender as string,
    senderId: row.sender_id as string,
    senderRole: row.sender_role as Message["senderRole"],
    message: row.message as string,
    timestamp: (row.created_at as string) || new Date().toISOString(),
  };
}

function fromSupabaseMessage(row: Record<string, unknown>): Message {
  return fromSupabaseMessageRow(row);
}

export async function fetchMessages(): Promise<Message[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: true });
  if (error) {
    console.error("[Supabase] Error fetching messages:", error.message);
    return [];
  }
  return (data || []).map(fromSupabaseMessage);
}

export async function insertMessage(msg: Message): Promise<boolean> {
  if (!supabase) return false;
  const payload = {
    id: msg.id,
    rfq_id: msg.rfqId || null,
    qcs_id: msg.qcsId || null,
    thread_type: msg.threadType,
    supplier_id: msg.supplierId || null,
    sender: msg.sender,
    sender_id: msg.senderId,
    sender_role: msg.senderRole,
    message: msg.message,
    created_at: msg.timestamp,
  };
  const { error } = await supabase.from("messages").insert(payload).select();
  if (error) {
    console.error("[Supabase] Error inserting message:", error.message);
    return false;
  }
  return true;
}

// ===== NOTIFICATION FUNCTIONS =====

export function fromSupabaseNotificationRow(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    role: (row.role as NotificationRole),
    userId: (row.user_id as string) || undefined,
    rfqId: (row.rfq_id as string) || undefined,
    qcsId: (row.qcs_id as string) || undefined,
    supplierId: (row.supplier_id as string) || undefined,
    title: row.title as string,
    message: row.message as string,
    type: (row.type as NotificationType),
    createdAt: (row.created_at as string) || new Date().toISOString(),
    read: (row.read as boolean) || false,
  };
}

function fromSupabaseNotification(row: Record<string, unknown>): Notification {
  return fromSupabaseNotificationRow(row);
}

export async function fetchNotifications(): Promise<Notification[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("[Supabase] Error fetching notifications:", error.message);
    return [];
  }
  return (data || []).map(fromSupabaseNotification);
}

export async function insertNotification(notif: Notification): Promise<boolean> {
  if (!supabase) return false;
  const payload = {
    id: notif.id,
    role: notif.role,
    user_id: notif.userId || null,
    rfq_id: notif.rfqId || null,
    qcs_id: notif.qcsId || null,
    supplier_id: notif.supplierId || null,
    title: notif.title,
    message: notif.message,
    type: notif.type,
    created_at: notif.createdAt,
    read: notif.read,
  };
  const { error } = await supabase.from("notifications").insert(payload).select();
  if (error) {
    console.error("[Supabase] Error inserting notification:", error.message);
    return false;
  }
  return true;
}

export async function updateNotificationRead(id: string, read: boolean): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("notifications").update({ read }).eq("id", id).select();
  if (error) {
    console.error("[Supabase] Error updating notification read status:", error.message);
    return false;
  }
  return true;
}

// ===== QUOTATION UPDATE =====

export async function updateQuotationInSupabase(id: string, updates: Partial<Quotation>): Promise<boolean> {
  if (!supabase) return false;
  const payload: Record<string, unknown> = {};
  if (updates.totalPrice !== undefined) payload.total_price = updates.totalPrice;
  if (updates.bonusMalus !== undefined) payload.bonus_malus = updates.bonusMalus;
  if (updates.deliveryTime !== undefined) payload.delivery_time = updates.deliveryTime;
  if (updates.paymentTerms !== undefined) payload.payment_terms = updates.paymentTerms;
  if (updates.incoterms !== undefined) payload.incoterms = updates.incoterms;
  if (updates.comments !== undefined) payload.notes = updates.comments;
  if (updates.quotationPdfUrl !== undefined) payload.quotation_pdf_url = updates.quotationPdfUrl;
  if (updates.supportingDocsUrl !== undefined) payload.supporting_docs_url = updates.supportingDocsUrl;

  const { error } = await supabase.from("quotations").update(payload).eq("id", id).select();
  if (error) {
    console.error("[Supabase] Error updating quotation:", error.message);
    return false;
  }
  return true;
}

// ===== SUPPLIER INSERT =====

export async function insertSupplier(supplier: Supplier): Promise<boolean> {
  if (!supabase) return false;
  const payload = {
    id: supplier.id,
    name: supplier.name,
    contact_name: supplier.contactPerson,
    email: supplier.email,
    company: supplier.commodityFocus,
    rating: supplier.rating,
    role: supplier.role,
  };
  const { error } = await supabase.from("suppliers").upsert(payload, { onConflict: "id" }).select();
  if (error) {
    console.error("[Supabase] Error inserting supplier:", error.message);
    return false;
  }
  return true;
}

// ===== GENERIC RFQ UPDATE =====

export async function updateRFQFields(rfqId: string, updates: Record<string, unknown>): Promise<boolean> {
  if (!supabase) return false;
  // Map camelCase fields to snake_case for Supabase
  const payload: Record<string, unknown> = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.project !== undefined) payload.project = updates.project;
  if (updates.component !== undefined) payload.component = updates.component;
  if (updates.quantity !== undefined) payload.quantity = updates.quantity;
  if (updates.budget !== undefined) payload.budget = updates.budget;
  if (updates.deliveryTime !== undefined) payload.delivery_time = updates.deliveryTime;
  if (updates.plant !== undefined) payload.plant = updates.plant;
  if (updates.pspElement !== undefined) payload.psp_element = updates.pspElement;
  if (updates.technicalContact !== undefined) payload.technical_contact = updates.technicalContact;
  if (updates.onSiteVisitRequired !== undefined) payload.on_site_visit_required = updates.onSiteVisitRequired;
  if (updates.requestType !== undefined) payload.request_type = updates.requestType;
  if (updates.createdBy !== undefined) payload.created_by = updates.createdBy;
  if (updates.updatedAt !== undefined) payload.updated_at = updates.updatedAt;
  else payload.updated_at = new Date().toISOString();

  const { error } = await supabase.from("rfqs").update(payload).eq("rfq_number", rfqId).select();
  if (error) {
    console.error("[Supabase] Error updating RFQ fields:", error.message);
    return false;
  }
  return true;
}
