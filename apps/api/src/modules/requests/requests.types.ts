export type RequestStatus = 'pending' | 'resolved' | 'rejected';
export type ManagedStatusFilter = RequestStatus | 'all' | 'answered';

export interface RequestUserSummary {
  nome?: string;
  email?: string;
  role?: string;
  cargo?: string;
  municipio?: string;
  microregiao_id?: string;
}

export interface RequestRecord {
  id: string;
  user_id: string;
  request_type: string;
  content: string;
  status: RequestStatus;
  admin_notes: string | null;
  created_at: string;
  resolved_by?: string | null;
  resolved_at?: string | null;
  resolved_by_name?: string | null;
  user?: RequestUserSummary;
}

export interface CreateRequestInput {
  userId: string;
  requestType: string;
  content: string;
  status?: RequestStatus;
  adminNotes?: string;
  createdAt?: string;
}

export interface UpdateRequestInput {
  status: RequestStatus;
  adminNotes?: string;
  resolvedById?: string;
}
