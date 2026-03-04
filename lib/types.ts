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
}

export interface RFQSupplier {
  rfqId: string;
  supplierId: string;
  assignedAt: string;
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
