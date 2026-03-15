import { insertEmailLog } from "./email-logs";

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
  // Log the email sent to procurement
  insertEmailLog({
    recipientEmail: data.procurementEmail,
    recipientRole: "procurement",
    emailType: "request_created",
    requestId: data.rfqId,
    subject: `New RFQ Submitted: ${data.project} – ${data.component}`,
    body: `Engineer ${data.engineerName} submitted a new RFQ.\nProject: ${data.project}\nComponent: ${data.component}\nBudget: €${data.budget.toLocaleString()}`,
    status: "sent",
  }).catch(() => {});
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
  // Log one entry per supplier
  for (const s of data.suppliers) {
    insertEmailLog({
      recipientEmail: s.supplierEmail,
      recipientRole: "supplier",
      emailType: "rfq_sent",
      requestId: data.rfqId,
      subject: `RFQ Invitation: ${data.project} – ${data.component}`,
      body: `You have been invited to submit a quotation for RFQ ${data.rfqId}.\nProject: ${data.project}\nComponent: ${data.component}\nAccess your dashboard: ${s.accessUrl}`,
      status: "sent",
    }).catch(() => {});
  }
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
  insertEmailLog({
    recipientEmail: data.supplierEmail,
    recipientRole: "supplier",
    emailType: "rfq_sent",
    requestId: data.rfqId,
    subject: `RFQ Invitation: ${data.project} – ${data.component}`,
    body: `Dear ${data.supplierName},\n\nYou have been invited to submit a quotation.\nProject: ${data.project}\nComponent: ${data.component}\nRequired delivery: ${data.deliveryTime} weeks\nAccess your dashboard (valid 30 days): ${data.accessUrl}\n\nContact: ${data.procurementContact}`,
    status: "sent",
  }).catch(() => {});
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
  // Log email to procurement
  insertEmailLog({
    recipientEmail: data.procurementEmail,
    recipientRole: "procurement",
    emailType: "quotation_received",
    requestId: data.rfqId,
    subject: `Quotation Received from ${data.supplierName}`,
    body: `${data.supplierName} submitted a quotation for RFQ ${data.rfqId}.\nTotal Price: €${data.totalPrice.toLocaleString()}`,
    status: "sent",
  }).catch(() => {});
  // Log notification email to engineer
  insertEmailLog({
    recipientEmail: data.engineerEmail,
    recipientRole: "engineer",
    emailType: "quotation_received",
    requestId: data.rfqId,
    subject: `Quotation Received: ${data.supplierName}`,
    body: `A quotation has been submitted by ${data.supplierName} for RFQ ${data.rfqId}.\nTotal Price: €${data.totalPrice.toLocaleString()}`,
    status: "sent",
  }).catch(() => {});
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
  insertEmailLog({
    recipientEmail: data.hopEmail,
    recipientRole: "hop",
    emailType: "quotations_ready",
    requestId: data.rfqId,
    subject: `Quotations Ready for Review: ${data.project}`,
    body: `All quotations for RFQ ${data.rfqId} have been compiled by ${data.buyer}.\nProject: ${data.project}\nBudget: €${data.budget.toLocaleString()}\nQCS ID: ${data.qcsId}`,
    status: "sent",
  }).catch(() => {});
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
  const decisionLabel = data.decision === "approved" ? "Approved" : "Rejected";
  // Log to procurement
  insertEmailLog({
    recipientEmail: data.procurementEmail,
    recipientRole: "procurement",
    emailType: "hop_decision",
    requestId: data.rfqId,
    subject: `HoP Decision: QCS ${decisionLabel} – RFQ ${data.rfqId}`,
    body: `The Head of Procurement has ${decisionLabel.toLowerCase()} QCS ${data.qcsId}.${data.comment ? `\nComment: ${data.comment}` : ""}`,
    status: "sent",
  }).catch(() => {});
  // Log to engineer
  insertEmailLog({
    recipientEmail: data.engineerEmail,
    recipientRole: "engineer",
    emailType: "hop_decision",
    requestId: data.rfqId,
    subject: `HoP Decision: QCS ${decisionLabel} – RFQ ${data.rfqId}`,
    body: `The Head of Procurement has ${decisionLabel.toLowerCase()} QCS ${data.qcsId}.${data.comment ? `\nComment: ${data.comment}` : ""}`,
    status: "sent",
  }).catch(() => {});
  // Log award/rejection emails to each supplier
  for (const s of data.supplierNotifications) {
    insertEmailLog({
      recipientEmail: s.supplierEmail,
      recipientRole: "supplier",
      emailType: "hop_decision",
      requestId: data.rfqId,
      subject: s.awarded ? `Awarded: RFQ ${data.rfqId}` : `Not Awarded: RFQ ${data.rfqId}`,
      body: s.awarded
        ? `Congratulations! Your quotation for RFQ ${data.rfqId} has been awarded.`
        : `Thank you for your quotation for RFQ ${data.rfqId}. Unfortunately you were not selected this time.`,
      status: "sent",
    }).catch(() => {});
  }
}

