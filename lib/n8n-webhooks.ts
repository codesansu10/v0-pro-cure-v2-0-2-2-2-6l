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

export async function triggerRFQSubmitted(data: {
  rfqId: string;
  project: string;
  component: string;
  budget: number;
  engineerName: string;
}): Promise<void> {
  await postWebhook("/webhook/rfq-submitted", data);
}

export async function triggerRFQSentToSuppliers(data: {
  rfqId: string;
  project: string;
  component: string;
  supplierIds: string[];
}): Promise<void> {
  await postWebhook("/webhook/rfq-sent-to-suppliers", data);
}

export async function triggerQuotationSubmitted(data: {
  rfqId: string;
  supplierId: string;
  supplierName: string;
  totalPrice: number;
}): Promise<void> {
  await postWebhook("/webhook/quotation-submitted", data);
}

export async function triggerQCSSubmitted(data: {
  qcsId: string;
  rfqId: string;
  project: string;
  budget: number;
  buyer: string;
}): Promise<void> {
  await postWebhook("/webhook/qcs-submitted", data);
}

export async function triggerHoPDecision(data: {
  qcsId: string;
  rfqId: string;
  decision: "approved" | "rejected";
  comment?: string;
}): Promise<void> {
  await postWebhook("/webhook/qcs-decision", data);
}
