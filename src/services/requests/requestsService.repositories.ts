import type { RealtimeChannel } from '@supabase/supabase-js';

import { getPlatformClient } from '../platformClient';
import type {
  ManagedStatusFilter,
  ProfileSummary,
  RequestsRealtimeChannel,
  RequestSubscriptionConfig,
  UserRequest,
} from './requestsService.types';

const platformClient = getPlatformClient;
const PROFILE_FIELDS = 'id, nome, email, role, cargo, municipio, microregiao_id';
const REQUEST_FIELDS = `
  *,
  user:profiles!user_requests_user_id_fkey(nome, email, role, cargo, municipio, microregiao_id),
  resolver:profiles!user_requests_resolved_by_fkey(nome)
`;
const ADMIN_ACTIONABLE_REQUEST_TYPES = ['request', 'feedback', 'support', 'system'];
const ADMIN_PERSONAL_NOTIFICATION_TYPES = ['announcement', 'mention', 'request', 'feedback', 'support', 'system'];

type JoinedRequestRow = UserRequest & {
  resolver?: { nome?: string | null } | null;
  user?: Omit<ProfileSummary, 'id'> | null;
};

function mapJoinedRequestRow(row: JoinedRequestRow): UserRequest {
  const { resolver, user, ...request } = row;

  return {
    ...request,
    resolved_by_name: row.resolved_by_name ?? resolver?.nome ?? null,
    user: user ?? request.user,
  };
}

function isPrivilegedRequester(role?: string): boolean {
  return role === 'admin' || role === 'superadmin';
}

function filterManagedModerationRequests(
  requests: UserRequest[],
  profilesMap: Map<string, ProfileSummary>
): UserRequest[] {
  return requests.filter((request) => {
    const role = request.user?.role || profilesMap.get(request.user_id)?.role;
    return !isPrivilegedRequester(role);
  });
}

function filterAdminNotificationRequests(
  userId: string,
  requests: UserRequest[],
  profilesMap: Map<string, ProfileSummary>
): UserRequest[] {
  return requests.filter((request) => {
    const role = request.user?.role || profilesMap.get(request.user_id)?.role;

    const isPersonal =
      request.user_id === userId &&
      ADMIN_PERSONAL_NOTIFICATION_TYPES.includes(request.request_type);

    const isActionableQueueItem =
      request.status === 'pending' &&
      ADMIN_ACTIONABLE_REQUEST_TYPES.includes(request.request_type) &&
      !isPrivilegedRequester(role);

    return isPersonal || isActionableQueueItem;
  });
}

function applyStatusAndTypeFilters<T>(
  query: T,
  statusFilter?: ManagedStatusFilter,
  typeFilter?: string | 'all'
): T {
  let nextQuery = query as unknown as {
    eq: (column: string, value: string) => unknown;
    in: (column: string, values: string[]) => unknown;
    not: (column: string, operator: string, value: string) => unknown;
  };

  if (statusFilter === 'answered') {
    nextQuery = nextQuery.in('status', ['resolved', 'rejected']) as typeof nextQuery;
    nextQuery = nextQuery.not('resolved_by', 'is', 'null') as typeof nextQuery;
  } else if (statusFilter && statusFilter !== 'all') {
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
    .select(REQUEST_FIELDS)
    .order('created_at', { ascending: false })
    .limit(params.limit);

  if (!params.isAdmin) {
    query = query.eq('user_id', params.userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Falha ao carregar requests do usuario');
  }

  return ((data as JoinedRequestRow[] | null) || []).map(mapJoinedRequestRow);
}

export async function listNotificationRequests(params: {
  userId: string;
  isAdmin: boolean;
  limit: number;
}): Promise<UserRequest[]> {
  const fetchLimit = params.isAdmin ? Math.max(params.limit * 4, params.limit) : params.limit;
  let query = platformClient()
    .from('user_requests')
    .select(REQUEST_FIELDS)
    .order('created_at', { ascending: false })
    .limit(fetchLimit);

  if (params.isAdmin) {
    const actionableTypes = ADMIN_ACTIONABLE_REQUEST_TYPES.join(',');
    const personalTypes = ADMIN_PERSONAL_NOTIFICATION_TYPES.join(',');
    query = query.or(
      `and(request_type.in.(${actionableTypes}),status.eq.pending),and(user_id.eq.${params.userId},request_type.in.(${personalTypes}))`
    );
  } else {
    query = query.eq('user_id', params.userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Falha ao carregar requests de notificacao');
  }

  const requests = ((data as JoinedRequestRow[] | null) || []).map(mapJoinedRequestRow);
  if (!params.isAdmin || requests.length === 0) {
    return requests.slice(0, params.limit);
  }

  const profilesMap = await fetchProfilesMap([...new Set(requests.map((request) => request.user_id))]);
  return filterAdminNotificationRequests(params.userId, requests, profilesMap).slice(0, params.limit);
}

export async function countManagedRequests(params: {
  statusFilter?: ManagedStatusFilter;
  typeFilter?: string | 'all';
}): Promise<number> {
  let query = platformClient().from('user_requests').select('*').order('created_at', { ascending: false });
  query = applyStatusAndTypeFilters(query, params.statusFilter, params.typeFilter);

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Falha ao contar requests');
  }

  const requests = (data as UserRequest[] | null) || [];
  if (requests.length === 0) {
    return 0;
  }

  const profilesMap = await fetchProfilesMap([...new Set(requests.map((request) => request.user_id))]);
  const scoped = filterManagedModerationRequests(requests, profilesMap);

  return scoped.length;
}

export async function listManagedRequests(params: {
  page: number;
  pageSize: number;
  statusFilter?: ManagedStatusFilter;
  typeFilter?: string | 'all';
}): Promise<UserRequest[]> {
  let query = platformClient()
    .from('user_requests')
    .select(REQUEST_FIELDS)
    .order('created_at', { ascending: false });

  query = applyStatusAndTypeFilters(query, params.statusFilter, params.typeFilter);

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Falha ao carregar requests gerenciados');
  }

  const requests = ((data as JoinedRequestRow[] | null) || []).map(mapJoinedRequestRow);
  if (requests.length === 0) {
    return [];
  }

  const profilesMap = await fetchProfilesMap([...new Set(requests.map((request) => request.user_id))]);
  const scoped = filterManagedModerationRequests(requests, profilesMap);
  const start = (params.page - 1) * params.pageSize;
  return scoped.slice(start, start + params.pageSize);
}

export async function countPendingRequestRecords(userId: string, isAdmin: boolean): Promise<number> {
  if (!isAdmin) {
    const { count, error } = await platformClient()
      .from('user_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message || 'Falha ao contar requests pendentes');
    }

    return count || 0;
  }

  const { data, error } = await platformClient()
    .from('user_requests')
    .select('*')
    .eq('status', 'pending')
    .in('request_type', ADMIN_ACTIONABLE_REQUEST_TYPES);

  if (error) {
    throw new Error(error.message || 'Falha ao contar requests pendentes');
  }

  const pendingRequests = (data as UserRequest[] | null) || [];
  if (pendingRequests.length === 0) {
    return 0;
  }

  const profilesMap = await fetchProfilesMap([
    ...new Set(pendingRequests.map((request) => request.user_id)),
  ]);

  return pendingRequests.filter((request) => {
    const role = profilesMap.get(request.user_id)?.role;
    return !isPrivilegedRequester(role);
  }).length;
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
