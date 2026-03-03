export type Role = "engineer" | "procurement" | "supplier_a" | "supplier_b" | "hop";

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
  rating: "A" | "B" | "C";
  role: "supplier_a" | "supplier_b";
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

export interface QCS {
  id: string;
  rfqId: string;
  buyer: string;
  project: string;
  pspElement: string;
  budget: number;
  impactSavings: number;
  comment: string;
  createdAt: string;
  status: "Pending" | "Approved" | "Sent Back";
}

export interface Message {
  id: string;
  rfqId: string;
  sender: string;
  senderRole: Role;
  message: string;
  timestamp: string;
}

export interface AppState {
  users: User[];
  rfqs: RFQ[];
  suppliers: Supplier[];
  rfqSuppliers: RFQSupplier[];
  quotations: Quotation[];
  qcs: QCS[];
  messages: Message[];
}
