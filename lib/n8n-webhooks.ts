const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ?? "";

async function postWebhook(path: string, payload: unknown): Promise<void> {
  if (!N8N_BASE_URL) return;
  try {
    const response = await fetch(`${N8N_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.warn(`[n8n] Webhook ${path} returned ${response.status}`);
    }
  } catch (err) {
    console.warn("[n8n] Webhook error:", err);
  }
}

// Triggered when an engineer submits an RFQ
export async function triggerRFQSubmitted(data: {
  rfqId: string;
  project: string;
  component: string;
  budget: number;
  engineerName: string;
  engineerEmail: string;
  procurementEmail: string;
}): Promise<void> {
  await postWebhook("/webhook/rfq-submitted", data);
}

// Triggered when procurement sends RFQ to suppliers — includes per-supplier token URLs
export async function triggerRFQSentToSuppliers(data: {
  rfqId: string;
  project: string;
  component: string;
  suppliers: Array<{
    supplierId: string;
    supplierName: string;
    supplierEmail: string;
    accessUrl: string;
  }>;
  procurementEmail: string;
  engineerEmail: string;
}): Promise<void> {
  await postWebhook("/webhook/rfq-sent-to-suppliers", data);
}

// Individual supplier invitation email webhook
export async function triggerSupplierInvitation(data: {
  rfqId: string;
  project: string;
  component: string;
  budget: number;
  deliveryTime: number;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  accessUrl: string;
  procurementContact: string;
}): Promise<void> {
  await postWebhook("/webhook/supplier-invitation", data);
}

// Triggered when a supplier submits a quotation
export async function triggerQuotationSubmitted(data: {
  rfqId: string;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  totalPrice: number;
  procurementEmail: string;
  engineerEmail: string;
}): Promise<void> {
  await postWebhook("/webhook/quotation-submitted", data);
}

// Triggered when procurement submits QCS to Head of Procurement
export async function triggerQCSSubmitted(data: {
  qcsId: string;
  rfqId: string;
  project: string;
  budget: number;
  buyer: string;
  procurementEmail: string;
  hopEmail: string;
}): Promise<void> {
  await postWebhook("/webhook/qcs-submitted", data);
}

// Triggered when HoP approves or rejects a QCS
export async function triggerHoPDecision(data: {
  qcsId: string;
  rfqId: string;
  decision: "approved" | "rejected";
  comment?: string;
  hopEmail: string;
  procurementEmail: string;
  engineerEmail: string;
  supplierNotifications: Array<{
    supplierId: string;
    supplierName: string;
    supplierEmail: string;
    accessUrl: string;
    awarded: boolean;
  }>;
}): Promise<void> {
  await postWebhook("/webhook/qcs-decision", data);
}
