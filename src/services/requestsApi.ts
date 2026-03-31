import type {
  CreateUserRequestInput,
  LoadManagedRequestsResult,
  ManagedStatusFilter,
  RequestStatus,
  RequestsRealtimeChannel,
  UserRequest,
} from './requests/requestsService.types';

import { apiRequest } from './apiClient';

type BackendPollingSubscription = Extract<RequestsRealtimeChannel, { kind: 'backend-polling' }>;

function buildQuery(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function listUserRequestsViaBackendApi(limit = 20): Promise<UserRequest[]> {
  const response = await apiRequest<{ items: UserRequest[] }>(`/v1/requests${buildQuery({ scope: 'user', limit })}`);
  return response.items;
}

export async function listNotificationRequestsViaBackendApi(limit = 20): Promise<UserRequest[]> {
  const response = await apiRequest<{ items: UserRequest[] }>(`/v1/requests${buildQuery({ scope: 'notifications', limit })}`);
  return response.items;
}

export async function listManagedRequestsViaBackendApi(args: {
  page: number;
  pageSize: number;
  statusFilter?: ManagedStatusFilter;
  typeFilter?: string | 'all';
}): Promise<LoadManagedRequestsResult> {
  const response = await apiRequest<{ items: UserRequest[]; totalCount: number }>(
    `/v1/requests${buildQuery({
      scope: 'managed',
      page: args.page,
      pageSize: args.pageSize,
      statusFilter: args.statusFilter,
      typeFilter: args.typeFilter,
    })}`
  );

  return {
    data: response.items,
    totalCount: response.totalCount,
  };
}

export async function countPendingRequestsViaBackendApi(): Promise<number> {
  const response = await apiRequest<{ count: number }>('/v1/requests/pending-count');
  return response.count;
}

export async function updateUserRequestViaBackendApi(args: {
  requestId: string;
  status: RequestStatus;
  adminNotes?: string;
}): Promise<void> {
  await apiRequest<void>(`/v1/requests/${encodeURIComponent(args.requestId)}`, {
    method: 'PATCH',
    body: {
      status: args.status,
      adminNotes: args.adminNotes,
    },
  });
}

export async function deleteUserRequestViaBackendApi(requestId: string): Promise<void> {
  await apiRequest<void>(`/v1/requests/${encodeURIComponent(requestId)}`, {
    method: 'DELETE',
  });
}

export async function createUserRequestViaBackendApi(input: {
  requestType: string;
  content: string;
}): Promise<UserRequest> {
  return apiRequest<UserRequest>('/v1/requests', {
    method: 'POST',
    body: {
      requestType: input.requestType,
      content: input.content,
    },
  });
}

export function subscribeToRequestsViaBackendPolling(onChange: () => void): BackendPollingSubscription {
  return {
    kind: 'backend-polling',
    intervalId: window.setInterval(onChange, 30000),
  };
}

export function unsubscribeFromBackendRequestsSubscription(channel: RequestsRealtimeChannel): void {
  if ('kind' in channel && channel.kind === 'backend-polling') {
    window.clearInterval(channel.intervalId);
  }
}

export function mapRequestBatchToBackendInputs(requests: CreateUserRequestInput[]) {
  return requests.map((request) => ({
    requestType: request.requestType,
    content: request.content,
    status: request.status,
    adminNotes: request.adminNotes,
  }));
}
