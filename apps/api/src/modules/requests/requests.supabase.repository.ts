import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminClient } from '../../shared/persistence/supabase-admin.js';
import type { CreateRequestInput, RequestRecord, RequestStatus, RequestUserSummary, UpdateRequestInput } from './requests.types.js';
import type { RequestsRepository } from './requests.repository.js';

type ProfileSummary = RequestUserSummary & { id: string };

function applyStatusAndTypeFilters<T>(
  query: T,
  statusFilter?: RequestStatus | 'all',
  typeFilter?: string | 'all'
): T {
  let nextQuery = query as unknown as { eq: (column: string, value: string) => unknown };
  if (statusFilter && statusFilter !== 'all') nextQuery = nextQuery.eq('status', statusFilter) as typeof nextQuery;
  if (typeFilter && typeFilter !== 'all') nextQuery = nextQuery.eq('request_type', typeFilter) as typeof nextQuery;
  return nextQuery as unknown as T;
}

async function fetchProfilesMap(client: SupabaseClient, userIds: string[]): Promise<Map<string, ProfileSummary>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await client
    .from('profiles')
    .select('id, nome, email, role, municipio, microregiao_id')
    .in('id', userIds);
  if (error || !data) return new Map();
  const rows = data as ProfileSummary[];
  return new Map(rows.map((row) => [row.id, row]));
}

function mergeRequestsWithProfiles(requests: RequestRecord[], profiles: Map<string, ProfileSummary>): RequestRecord[] {
  return requests.map((request) => {
    const profile = profiles.get(request.user_id);
    if (!profile) return request;
    return {
      ...request,
      user: {
        nome: profile.nome,
        email: profile.email,
        role: profile.role,
        cargo: profile.cargo,
        municipio: profile.municipio,
        microregiao_id: profile.microregiao_id,
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
    const profiles = await fetchProfilesMap(this.client, [...new Set(requests.map((item) => item.user_id))]);
    return mergeRequestsWithProfiles(requests, profiles);
  }

  async listNotificationRequests(args: { userId: string; isAdmin: boolean; limit: number }): Promise<RequestRecord[]> {
    let query = this.client.from('user_requests').select('*').order('created_at', { ascending: false }).limit(args.limit);
    if (args.isAdmin) {
      query = query.or(`request_type.in.(request,feedback,support,mention),and(request_type.eq.announcement,user_id.eq.${args.userId})`);
    } else {
      query = query.eq('user_id', args.userId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Failed to list notification requests');
    const requests = ((data || []) as RequestRecord[]);
    const profiles = await fetchProfilesMap(this.client, [...new Set(requests.map((item) => item.user_id))]);
    return mergeRequestsWithProfiles(requests, profiles);
  }

  async countManagedRequests(args: { statusFilter?: RequestStatus | 'all'; typeFilter?: string | 'all' }): Promise<number> {
    let query = this.client.from('user_requests').select('*', { count: 'exact', head: true });
    query = applyStatusAndTypeFilters(query, args.statusFilter, args.typeFilter);
    const { count, error } = await query;
    if (error) throw new Error(error.message || 'Failed to count requests');
    return count || 0;
  }

  async listManagedRequests(args: { page: number; pageSize: number; statusFilter?: RequestStatus | 'all'; typeFilter?: string | 'all' }): Promise<RequestRecord[]> {
    let query = this.client
      .from('user_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .range((args.page - 1) * args.pageSize, args.page * args.pageSize - 1);
    query = applyStatusAndTypeFilters(query, args.statusFilter, args.typeFilter);
    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Failed to list managed requests');
    const requests = ((data || []) as RequestRecord[]);
    const profiles = await fetchProfilesMap(this.client, [...new Set(requests.map((item) => item.user_id))]);
    return mergeRequestsWithProfiles(requests, profiles);
  }

  async countPendingRequests(args: { userId: string; isAdmin: boolean }): Promise<number> {
    let query = this.client.from('user_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    if (!args.isAdmin) query = query.eq('user_id', args.userId);
    const { count, error } = await query;
    if (error) throw new Error(error.message || 'Failed to count pending requests');
    return count || 0;
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
