export type Role = "engineer" | "procurement" | "supplier_a" | "supplier_b" | "supplier_c" | "supplier_d" | "supplier_e" | "hop";

export type RFQStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Sent to Supplier"
  | "Quote Received"
  | "In Negotiation"
  | "Final Decision"
  | "Closed";

export type RequestType = "Manufacturing" | "Delivery" | "Service";

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
}

export interface RFQAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  storagePath: string;
  mimeType: string;
  uploadedAt: string;
}

export interface RFQ {
  id: string;
  project: string;
  component: string;
  quantity: number;
  budget: number;
  deliveryTime: number;
  plant: string;
  pspElement: string;
  technicalContact: string;
  onSiteVisitRequired: boolean;
  requestType: RequestType;
  status: RFQStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  attachments?: RFQAttachment[];
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  commodityFocus: string;
  status: "Approved" | "Pending";
  rating: "A" | "B" | "C";
  role: "supplier_a" | "supplier_b" | "supplier_c" | "supplier_d" | "supplier_e";
  approved: boolean;
  capacityConfirmed: boolean;
  technicalCompliance: boolean;
  commercialSpecCompliant: boolean;
  riskScore: number;
  // NLP Recommendation Engine attributes
  sccCodes?: string[];          // Standard Commodity Codes
  materialGroups?: string[];    // Material group tags
  country?: string;             // Supplier country
  segment?: "preferred" | "approved" | "conditional" | "new"; // Supplier segment
  purchasingBlock?: boolean;    // Hard eligibility filter
  // Certifications (expiry dates)
  qmCertExpiry?: string;        // QM certificate expiry (ISO date)
  iso14001Expiry?: string;      // ISO 14001 expiry (ISO date)
  iso45001Expiry?: string;      // ISO 45001 expiry (ISO date)
  // Risk/compliance scoring inputs
  riskAssessmentResult?: "A" | "B" | "C"; // Risk assessment rating
  creditCheckScore?: number;    // 0–100
  // Performance scoring inputs
  sgpTotalScore?: number;       // 0–100 SGP score
  supplierEvaluationScore?: number; // 0–100
  sustainabilityAuditScore?: number; // 0–100
}

// ─── NLP Recommendation Engine types ──────────────────────────────────────────

export interface SupplierRecommendation {
  rank: number;
  supplierId: string;
  supplierName: string;
  finalScore: number;
  enhancedRelevanceScore: number;
  riskComplianceScore: number;
  performanceScore: number;
  nlpSimilarityScore: number;
  eligibilityReason: "Eligible" | "Blocked";
  softWarnings: string[];
  reasons: string[];
}

export interface RFQRecommendationResult {
  rfqId: string;
  rfqComponent: string;
  totalEligibleSuppliers: number;
  recommendations: SupplierRecommendation[];
  generatedAt: string;
}

export type RFQSupplierStatus = 
  | "RFQ Received"
  | "Quotation Submitted"
  | "Under Evaluation"
  | "Awarded"
  | "Not Awarded"
  | "Withdrawn";

export interface RFQSupplier {
  rfqId: string;
  supplierId: string;
  assignedAt: string;
  status: RFQSupplierStatus;
  quoted: boolean;
}

export interface QuotationLineItem {
  id: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Quotation {
  id: string;
  rfqId: string;
  supplierId: string;
  totalPrice: number;
  bonusMalus: number;
  deliveryTime: number;
  paymentTerms: string;
  incoterms: string;
  comments: string;
  submittedAt: string;
  lineItems?: QuotationLineItem[];
  quotationPdfUrl?: string;
  supportingDocsUrl?: string;
  negotiationRound1?: number;
  negotiationRound2?: number;
  finalAwardValue?: number;
}

export type QCSStatus = 
  | "draft"
  | "submitted_for_approval"
  | "approved"
  | "rejected"
  | "needs_negotiation";

export interface QCS {
  id: string;
  rfqId: string;
  createdByUserId: string;
  buyer: string;
  project: string;
  pspElement: string;
  budget: number;
  impactSavings: number;
  comment: string;
  createdAt: string;
  status: QCSStatus;
  submittedToHopAt?: string;
  hopDecisionAt?: string;
  hopComment?: string;
}

export type ThreadType = "engineer_procurement" | "supplier_procurement" | "hop_procurement";

export interface Message {
  id: string;
  rfqId?: string;
  qcsId?: string; // for hop_procurement threads
  threadType: ThreadType;
  supplierId?: string; // only for supplier_procurement threads
  sender: string;
  senderId: string;
  senderRole: Role;
  message: string;
  timestamp: string;
}

export type NotificationRole = "engineer" | "procurement" | "supplier" | "hop";
export type NotificationType = "rfq" | "quote" | "chat" | "qcs" | "decision" | "system";

export interface Notification {
  id: string;
  role: NotificationRole;
  userId?: string;
  rfqId?: string;
  qcsId?: string;
  supplierId?: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
}

export interface AppState {
  users: User[];
  rfqs: RFQ[];
  suppliers: Supplier[];
  rfqSuppliers: RFQSupplier[];
  quotations: Quotation[];
  qcs: QCS[];
  messages: Message[];
  notifications: Notification[];
}
