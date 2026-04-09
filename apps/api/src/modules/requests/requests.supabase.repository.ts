import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminClient } from '../../shared/persistence/supabase-admin.js';
import type { CreateRequestInput, ManagedStatusFilter, RequestRecord, RequestUserSummary, UpdateRequestInput } from './requests.types.js';
import type { RequestsRepository } from './requests.repository.js';

type ProfileSummary = RequestUserSummary & { id: string };
const ADMIN_ACTIONABLE_REQUEST_TYPES = ['request', 'feedback', 'support'];
const ADMIN_PERSONAL_NOTIFICATION_TYPES = [
  'announcement',
  'mention',
  'request',
  'feedback',
  'support',
  'system',
];

function isPrivilegedRequester(role?: string): boolean {
  return role === 'admin' || role === 'superadmin';
}

function filterManagedModerationRequests(requests: RequestRecord[]): RequestRecord[] {
  return requests.filter((request) => {
    if (!isPrivilegedRequester(request.user?.role)) {
      return true;
    }
    return (
      request.status === 'pending' &&
      ADMIN_ACTIONABLE_REQUEST_TYPES.includes(request.request_type)
    );
  });
}

function filterAdminNotificationRequests(userId: string, requests: RequestRecord[]): RequestRecord[] {
  return requests.filter((request) => {
    const isPersonal =
      request.user_id === userId &&
      ADMIN_PERSONAL_NOTIFICATION_TYPES.includes(request.request_type);

    const isActionableQueueItem =
      request.status === 'pending' &&
      ADMIN_ACTIONABLE_REQUEST_TYPES.includes(request.request_type) &&
      !isPrivilegedRequester(request.user?.role);

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

  if (typeFilter && typeFilter !== 'all') nextQuery = nextQuery.eq('request_type', typeFilter) as typeof nextQuery;
  return nextQuery as unknown as T;
}

function getRequestProfileIds(requests: RequestRecord[]): string[] {
  const ids = new Set<string>();

  requests.forEach((request) => {
    if (request.user_id) {
      ids.add(request.user_id);
    }

    if (request.resolved_by) {
      ids.add(request.resolved_by);
    }
  });

  return [...ids];
}

async function fetchProfilesMap(client: SupabaseClient, profileIds: string[]): Promise<Map<string, ProfileSummary>> {
  if (profileIds.length === 0) return new Map();
  const { data, error } = await client
    .from('profiles')
    .select('id, nome, email, role, cargo, municipio, microregiao_id')
    .in('id', profileIds);
  if (error || !data) return new Map();
  const rows = data as ProfileSummary[];
  return new Map(rows.map((row) => [row.id, row]));
}

function mergeRequestsWithProfiles(requests: RequestRecord[], profiles: Map<string, ProfileSummary>): RequestRecord[] {
  return requests.map((request) => {
    const requesterProfile = profiles.get(request.user_id);
    const resolverProfile = request.resolved_by ? profiles.get(request.resolved_by) : undefined;

    if (!requesterProfile) {
      return {
        ...request,
        resolved_by_name: resolverProfile?.nome ?? null,
      };
    }

    return {
      ...request,
      resolved_by_name: resolverProfile?.nome ?? null,
      user: {
        nome: requesterProfile.nome,
        email: requesterProfile.email,
        role: requesterProfile.role,
        cargo: requesterProfile.cargo,
        municipio: requesterProfile.municipio,
        microregiao_id: requesterProfile.microregiao_id,
      },
    };
  });
}

export class SupabaseRequestsRepository implements RequestsRepository {
  constructor(private readonly client: SupabaseClient = getSupabaseAdminClient()) {}

  async listUserRequests(args: { userId: string; isAdmin: boolean; limit: number }): Promise<RequestRecord[]> {
    let query = this.client.from('user_requests').select('*').order('created_at', { ascending: false }).limit(args.limit);
    if (!args.isAdmin) query = query.eq('user_id', args.userId);
    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Failed to list user requests');
    const requests = ((data || []) as RequestRecord[]);
    const profiles = await fetchProfilesMap(this.client, getRequestProfileIds(requests));
    return mergeRequestsWithProfiles(requests, profiles);
  }

  async listNotificationRequests(args: { userId: string; isAdmin: boolean; limit: number }): Promise<RequestRecord[]> {
    const fetchLimit = args.isAdmin ? Math.max(args.limit * 4, args.limit) : args.limit;
    let query = this.client.from('user_requests').select('*').order('created_at', { ascending: false }).limit(fetchLimit);
    if (args.isAdmin) {
      const actionableTypes = ADMIN_ACTIONABLE_REQUEST_TYPES.join(',');
      const personalTypes = ADMIN_PERSONAL_NOTIFICATION_TYPES.join(',');
      query = query.or(
        `and(request_type.in.(${actionableTypes}),status.eq.pending),and(user_id.eq.${args.userId},request_type.in.(${personalTypes}))`
      );
    } else {
      query = query.eq('user_id', args.userId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Failed to list notification requests');
    const requests = ((data || []) as RequestRecord[]);
    const profiles = await fetchProfilesMap(this.client, getRequestProfileIds(requests));
    const merged = mergeRequestsWithProfiles(requests, profiles);

    if (!args.isAdmin) {
      return merged.slice(0, args.limit);
    }

    return filterAdminNotificationRequests(args.userId, merged).slice(0, args.limit);
  }

  async countManagedRequests(args: { statusFilter?: ManagedStatusFilter; typeFilter?: string | 'all' }): Promise<number> {
    let query = this.client.from('user_requests').select('*').order('created_at', { ascending: false });
    query = applyStatusAndTypeFilters(query, args.statusFilter, args.typeFilter);
    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Failed to count requests');

    const requests = ((data || []) as RequestRecord[]);
    const profiles = await fetchProfilesMap(this.client, getRequestProfileIds(requests));
    const scoped = filterManagedModerationRequests(mergeRequestsWithProfiles(requests, profiles));
    return scoped.length;
  }

  async listManagedRequests(args: { page: number; pageSize: number; statusFilter?: ManagedStatusFilter; typeFilter?: string | 'all' }): Promise<RequestRecord[]> {
    let query = this.client
      .from('user_requests')
      .select('*')
      .order('created_at', { ascending: false });
    query = applyStatusAndTypeFilters(query, args.statusFilter, args.typeFilter);
    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Failed to list managed requests');
    const requests = ((data || []) as RequestRecord[]);
    const profiles = await fetchProfilesMap(this.client, getRequestProfileIds(requests));
    const scoped = filterManagedModerationRequests(mergeRequestsWithProfiles(requests, profiles));
    const start = (args.page - 1) * args.pageSize;
    return scoped.slice(start, start + args.pageSize);
  }

  async countPendingRequests(args: { userId: string; isAdmin: boolean }): Promise<number> {
    if (!args.isAdmin) {
      let query = this.client.from('user_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      query = query.eq('user_id', args.userId);
      const { count, error } = await query;
      if (error) throw new Error(error.message || 'Failed to count pending requests');
      return count || 0;
    }

    const { data, error } = await this.client
      .from('user_requests')
      .select('*')
      .eq('status', 'pending')
      .in('request_type', ADMIN_ACTIONABLE_REQUEST_TYPES);
    if (error) throw new Error(error.message || 'Failed to count pending requests');

    const pendingRequests = ((data || []) as RequestRecord[]);
    const profiles = await fetchProfilesMap(this.client, getRequestProfileIds(pendingRequests));
    const merged = mergeRequestsWithProfiles(pendingRequests, profiles);

    return merged.filter((request) => {
      if (!isPrivilegedRequester(request.user?.role)) {
        return true;
      }
      return ADMIN_ACTIONABLE_REQUEST_TYPES.includes(request.request_type);
    }).length;
  }

  async createRequest(input: CreateRequestInput): Promise<RequestRecord> {
    const { data, error } = await this.client
      .from('user_requests')
      .insert({
        user_id: input.userId,
        request_type: input.requestType,
        content: input.content.trim(),
        status: input.status || 'pending',
        admin_notes: input.adminNotes ?? null,
        ...(input.createdAt ? { created_at: input.createdAt } : {}),
      })
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to create request');
    return data as RequestRecord;
  }

  async updateRequest(requestId: string, input: UpdateRequestInput): Promise<boolean> {
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      status: input.status,
      updated_at: now,
      resolved_by: input.status !== 'pending' ? input.resolvedById || null : null,
      resolved_at: input.status !== 'pending' ? now : null,
    };
    if (input.adminNotes !== undefined) payload.admin_notes = input.adminNotes;
    const { error } = await this.client.from('user_requests').update(payload).eq('id', requestId);
    if (error) throw new Error(error.message || 'Failed to update request');
    return true;
  }

  async deleteRequest(requestId: string): Promise<boolean> {
    const { error } = await this.client.from('user_requests').delete().eq('id', requestId);
    if (error) throw new Error(error.message || 'Failed to delete request');
    return true;
  }
}
