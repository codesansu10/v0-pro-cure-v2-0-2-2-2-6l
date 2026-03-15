# n8n Automation Workflows

This directory contains importable n8n workflow JSON files for the **ThyssenKrupp Procurement System** email automation. Import each file into your n8n instance via **Import > From File**.

---

## Prerequisites

1. **n8n** running locally (`http://localhost:5678`) or hosted
2. **Supabase** project configured with the updated schema (`supabase/schema.sql`)
3. **SMTP** credentials configured in n8n (Settings → Credentials → SMTP)
4. Set the environment variable `APP_URL` in n8n to your app URL (e.g. `http://localhost:3000`)
5. Set `NEXT_PUBLIC_N8N_WEBHOOK_URL=http://localhost:5678` in your `.env.local`

---

## Workflows

### Workflow 1 — RFQ Submitted: Email Procurement
**File:** `workflow-1-rfq-submitted.json`

**Trigger:** `POST /webhook/rfq-submitted`
**Fired by:** Engineer submits a new RFQ (`lib/store.tsx → addRFQ`)

**Actions:**
1. Sends email to Procurement with RFQ details
2. Logs email in `email_logs` table
3. Inserts real-time notification for Procurement dashboard

---

### Workflow 2 — RFQ Sent: Token Email to Supplier
**File:** `workflow-2-rfq-sent-supplier-token.json`

**Trigger:** `POST /webhook/supplier-invitation`
**Fired by:** Procurement assigns suppliers to an RFQ (`components/procurement-dashboard.tsx`)

**Actions:**
1. Sends personalised email to each supplier with their unique 30-day portal token link
2. Logs email in `email_logs` table
3. Inserts real-time notification for Engineer dashboard

**Token Link Format:**
```
https://your-app.com/supplier?token=<base64-supplier-id:rfq-id>-<uuid>
```
Tokens expire after **30 days** and are stored in the `supplier_tokens` table.

---

### Workflow 3 — Quotation Received: Email Procurement & Engineer
**File:** `workflow-3-quotation-received.json`

**Trigger:** `POST /webhook/quotation-submitted`
**Fired by:** Supplier submits a quotation (`components/supplier-dashboard.tsx`)

**Actions:**
1. Emails Procurement with quotation summary
2. Emails Engineer with notification
3. Logs both emails in `email_logs` table
4. Inserts real-time notification for Procurement dashboard

---

### Workflow 4 — All Quotations Ready: QCS Summary Email to HoP
**File:** `workflow-4-qcs-ready-hop.json`

**Trigger:** `POST /webhook/qcs-submitted`
**Fired by:** Procurement submits QCS to Head of Procurement (`components/qcs-view.tsx`)

**Actions:**
1. Fetches all quotations for the RFQ from Supabase
2. Builds a price-comparison summary table (best price, fastest delivery, savings %)
3. Sends comprehensive HTML email to HoP
4. Logs email in `email_logs` table
5. Inserts real-time notification for HoP dashboard

---

## Email Templates

All emails use **HTML format** and are sent from `noreply@thyssenkrupp.com`.

| Workflow | Recipient | Subject |
|----------|-----------|---------|
| 1 | Procurement | `New RFQ Submitted: {project} – {component}` |
| 2 | Supplier | `RFQ Invitation: {project} – {component}` |
| 3 | Procurement & Engineer | `Quotation Received from {supplier}` |
| 4 | HoP | `Action Required: Quotations Ready for Approval – {project}` |

---

## Token-Based Supplier Access (No Login Required)

```
Supplier receives email
  → Clicks unique link: /supplier?token=<TOKEN>
  → App validates token in supplier_tokens table
  → Checks 30-day expiry
  → Loads read-only supplier dashboard
  → Only their RFQ + quotation form visible
  → used_count increments on each access
```

**Security:**
- Tokens are 32+ character cryptographically random strings
- Each token is unique per supplier per RFQ
- Tokens expire automatically after 30 days
- `used_count` is tracked for audit purposes
- No password or login required for suppliers

---

## Real-time Flow (5 Laptop Demo)

```
Laptop 1 (Engineer)
  → Creates RFQ
  → Laptop 2 (Procurement) gets email + real-time notification ✓

Laptop 2 (Procurement)  
  → Sends RFQ to Suppliers
  → Laptop 4 (Supplier) gets token email ✓
  → Laptop 1 (Engineer) sees real-time notification ✓

Laptop 4 (Supplier)
  → Clicks token link in email → Dashboard loads (no login) ✓
  → Submits quotation
  → Laptop 2 (Procurement) + Laptop 1 (Engineer) get emails + real-time ✓

Laptop 2 (Procurement)
  → Reviews quotations → Submits QCS to HoP
  → Laptop 5 (HoP) gets comprehensive email + real-time notification ✓

Laptop 5 (HoP)
  → Approves/Rejects
  → All stakeholders notified ✓
```

---

## Database Tables Used

| Table | Purpose |
|-------|---------|
| `email_logs` | Audit trail of all emails sent |
| `supplier_tokens` | 30-day access tokens for supplier portal |
| `notifications` | Real-time in-app notifications |
| `quotations` | Stores quotations with `email_sent_at` tracking |
