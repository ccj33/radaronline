import type { RealtimeChannel } from '@supabase/supabase-js';

import { getPlatformClient } from '../platformClient';
import type {
  ProfileSummary,
  RequestsRealtimeChannel,
  RequestStatus,
  RequestSubscriptionConfig,
  UserRequest,
} from './requestsService.types';

const platformClient = getPlatformClient;
const PROFILE_FIELDS = 'id, nome, email, role, municipio, microregiao_id';

function applyStatusAndTypeFilters<T>(
  query: T,
  statusFilter?: RequestStatus | 'all',
  typeFilter?: string | 'all'
): T {
  let nextQuery = query as unknown as {
    eq: (column: string, value: string) => unknown;
  };

  if (statusFilter && statusFilter !== 'all') {
    nextQuery = nextQuery.eq('status', statusFilter) as typeof nextQuery;
  }

  if (typeFilter && typeFilter !== 'all') {
    nextQuery = nextQuery.eq('request_type', typeFilter) as typeof nextQuery;
  }

  return nextQuery as unknown as T;
}

export async function fetchProfilesMap(userIds: string[]): Promise<Map<string, ProfileSummary>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data, error } = await platformClient()
    .from('profiles')
    .select(PROFILE_FIELDS)
    .in('id', userIds);

  if (error || !data) {
    return new Map();
  }

  const profiles = data as ProfileSummary[];
  return new Map(profiles.map((profile) => [profile.id, profile]));
}

export async function listUserRequests(params: {
  userId: string;
  isAdmin: boolean;
  limit: number;
}): Promise<UserRequest[]> {
  let query = platformClient()
    .from('user_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit);

  if (!params.isAdmin) {
    query = query.eq('user_id', params.userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Falha ao carregar requests do usuario');
  }

  return (data as UserRequest[] | null) || [];
}

export async function listNotificationRequests(params: {
  userId: string;
  isAdmin: boolean;
  limit: number;
}): Promise<UserRequest[]> {
  let query = platformClient()
    .from('user_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit);

  if (params.isAdmin) {
    query = query.or(
      `request_type.in.(request,feedback,support,mention),and(request_type.eq.announcement,user_id.eq.${params.userId})`
    );
  } else {
    query = query.eq('user_id', params.userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Falha ao carregar requests de notificacao');
  }

  return (data as UserRequest[] | null) || [];
}

export async function countManagedRequests(params: {
  statusFilter?: RequestStatus | 'all';
  typeFilter?: string | 'all';
}): Promise<number> {
  let query = platformClient().from('user_requests').select('*', { count: 'exact', head: true });
  query = applyStatusAndTypeFilters(query, params.statusFilter, params.typeFilter);

  const { count, error } = await query;
  if (error) {
    throw new Error(error.message || 'Falha ao contar requests');
  }

  return count || 0;
}

export async function listManagedRequests(params: {
  page: number;
  pageSize: number;
  statusFilter?: RequestStatus | 'all';
  typeFilter?: string | 'all';
}): Promise<UserRequest[]> {
  let query = platformClient()
    .from('user_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .range((params.page - 1) * params.pageSize, params.page * params.pageSize - 1);

  query = applyStatusAndTypeFilters(query, params.statusFilter, params.typeFilter);

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Falha ao carregar requests gerenciados');
  }

  return (data as UserRequest[] | null) || [];
}

export async function countPendingRequestRecords(userId: string, isAdmin: boolean): Promise<number> {
  let query = platformClient()
    .from('user_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(error.message || 'Falha ao contar requests pendentes');
  }

  return count || 0;
}

export async function updateRequestRecord(
  requestId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await platformClient().from('user_requests').update(payload).eq('id', requestId);
  if (error) {
    throw new Error(error.message || 'Falha ao atualizar request');
  }
}

export async function deleteRequestRecord(requestId: string): Promise<void> {
  const { error } = await platformClient().from('user_requests').delete().eq('id', requestId);
  if (error) {
    throw new Error(error.message || 'Falha ao excluir request');
  }
}

export async function insertRequestRecord(payload: Record<string, unknown>): Promise<UserRequest> {
  const { data, error } = await platformClient()
    .from('user_requests')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Falha ao criar request');
  }

  return data as UserRequest;
}

export async function insertRequestBatchRecords(
  payload: Array<Record<string, unknown>>
): Promise<string[]> {
  const { data, error } = await platformClient()
    .from('user_requests')
    .insert(payload)
    .select('id');

  if (error) {
    throw new Error(error.message || 'Falha ao criar lote de requests');
  }

  return ((data || []) as Array<{ id: string }>).map((row) => row.id);
}

export function subscribeToRequestChanges(
  config: RequestSubscriptionConfig
): RealtimeChannel {
  const subscriptionConfig: {
    event: '*';
    schema: 'public';
    table: 'user_requests';
    filter?: string;
  } = {
    event: '*',
    schema: 'public',
    table: 'user_requests',
  };

  if (config.filter) {
    subscriptionConfig.filter = config.filter;
  }

  return platformClient()
    .channel(config.channelName)
    .on('postgres_changes', subscriptionConfig, config.onChange)
    .subscribe();
}

export function removeRequestSubscription(channel: RequestsRealtimeChannel): void {
  if ('kind' in channel && channel.kind === 'backend-polling') {
    return;
  }

  void platformClient().removeChannel(channel as RealtimeChannel);
}
