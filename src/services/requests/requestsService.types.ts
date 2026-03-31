import type { RealtimeChannel } from '@supabase/supabase-js';

export type RequestStatus = 'pending' | 'resolved' | 'rejected';
export type ManagedStatusFilter = RequestStatus | 'all' | 'answered';

export interface ProfileSummary {
  id: string;
  nome: string;
  email: string;
  role?: string;
  cargo?: string;
  municipio?: string;
  microregiao_id?: string;
}

export interface UserRequest {
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
  user?: Omit<ProfileSummary, 'id'>;
}

export interface LoadRequestsOptions {
  userId: string;
  isAdmin: boolean;
  limit?: number;
  includeProfileDetails?: boolean;
}

export interface LoadNotificationRequestsOptions {
  userId: string;
  isAdmin: boolean;
  limit?: number;
  includeProfileDetails?: boolean;
}

export interface LoadManagedRequestsOptions {
  page: number;
  pageSize: number;
  statusFilter?: ManagedStatusFilter;
  typeFilter?: string | 'all';
  includeProfileDetails?: boolean;
}

export interface UpdateRequestOptions {
  requestId: string;
  status: RequestStatus;
  adminNotes?: string;
  resolvedById?: string;
}

export interface CreateUserRequestInput {
  userId: string;
  requestType: string;
  content: string;
  status?: RequestStatus;
  adminNotes?: string;
  createdAt?: string;
}

export interface SubscribeToRequestsOptions {
  channelName: string;
  userId: string;
  isAdmin: boolean;
  onChange: () => void;
}

export interface LoadManagedRequestsResult {
  data: UserRequest[];
  totalCount: number;
  error?: string;
}

export interface RequestSubscriptionConfig {
  channelName: string;
  filter?: string;
  onChange: () => void;
}

export interface BackendPollingSubscription {
  kind: 'backend-polling';
  intervalId: number;
}

export type RequestsRealtimeChannel = RealtimeChannel | BackendPollingSubscription;
