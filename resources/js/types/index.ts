export type UserRole = 'EMPLOYEE' | 'MANAGER';

export type RequestStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type HistoryAction = 'CREATED' | 'EDITED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
}

export interface RequestItem {
  id?: number;
  request_id?: number;
  name: string;
  uom?: string;
  qty: number;
  unit_price: number;
  subtotal: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApprovalHistory {
  id: number;
  request_id: number;
  action: HistoryAction;
  from_status?: RequestStatus | null;
  to_status: RequestStatus;
  actor_id: number;
  actor?: User;
  comment?: string | null;
  created_at: string;
}

export interface PurchaseRequest {
  id: number;
  number: string;
  requester_id: number;
  requester?: User;
  status: RequestStatus;
  priority: RequestPriority;
  total_amount: number;
  version: number;
  notes?: string | null;
  submitted_at?: string | null;
  decided_at?: string | null;
  created_at: string;
  updated_at?: string;
  items?: RequestItem[];
  history?: ApprovalHistory[];
  approver?: User | null;
  manager?: User | null;
}

export interface CreateRequestPayload {
  priority?: RequestPriority;
  notes?: string | null;
  items: {
    name: string;
    uom?: string;
    qty: number;
    unit_price: number;
  }[];
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
