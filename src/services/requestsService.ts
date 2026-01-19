/**
 * ==================================
 * REQUESTS SERVICE
 * ==================================
 * Centraliza operações de user_requests
 * Usado por NotificationBell e UserSettingsModal
 */

import { supabase } from '../lib/supabase';
import { logError } from '../lib/logger';

// =====================================
// TIPOS
// =====================================

export interface UserRequest {
    id: string;
    user_id: string;
    request_type: string;
    content: string;
    status: 'pending' | 'resolved' | 'rejected';
    admin_notes: string | null;
    created_at: string;
    resolved_by?: string | null;
    resolved_at?: string | null;
    user?: {
        nome: string;
        email: string;
        cargo?: string;
        municipio?: string;
        microregiao_id?: string;
        role?: string;
    };
}

export interface LoadRequestsOptions {
    userId: string;
    isAdmin: boolean;
    limit?: number;
    includeProfileDetails?: boolean;
}

export interface UpdateRequestOptions {
    requestId: string;
    status: 'pending' | 'resolved' | 'rejected';
    adminNotes?: string;
    resolvedById?: string;
}

// =====================================
// QUERIES
// =====================================

/**
 * Carrega solicitações de usuários
 */
export async function loadUserRequests(options: LoadRequestsOptions): Promise<UserRequest[]> {
    const { userId, isAdmin, limit = 20, includeProfileDetails = true } = options;

    try {
        let query = supabase
            .from('user_requests')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        // Admins veem todas, usuários veem só as suas
        if (!isAdmin) {
            query = query.eq('user_id', userId);
        }

        const { data: requestsData, error: requestsError } = await query;

        if (requestsError) {
            logError('requestsService', 'Error loading requests', requestsError);
            return [];
        }

        if (!requestsData || requestsData.length === 0) {
            return [];
        }

        if (!includeProfileDetails) {
            return requestsData;
        }

        // Fetch user profiles
        const userIds = [...new Set(
            requestsData
                .map((r: { user_id: string }) => r.user_id)
                .filter((id): id is string => Boolean(id))
        )];

        if (userIds.length === 0) {
            return requestsData as UserRequest[];
        }

        // Fetch profiles in parallel
        const profileFields = 'id, nome, email, role, municipio, microregiao_id';
        const profilePromises = userIds.map(async (uid) => {
            const { data, error } = await supabase
                .from('profiles')
                .select(profileFields)
                .eq('id', uid)
                .single();

            if (error) return null;
            return data;
        });

        const profilesResults = await Promise.all(profilePromises);
        const validProfiles = profilesResults.filter(
            (p): p is { id: string; nome: string; email: string; role: string; municipio: string; microregiao_id: string } => p !== null
        );
        const profilesMap = new Map(validProfiles.map(p => [p.id, p]));

        // Merge requests with profiles
        return requestsData.map(req => ({
            ...req,
            user: profilesMap.get(req.user_id) || undefined
        })) as UserRequest[];
    } catch (err) {
        logError('requestsService', 'Unexpected error loading requests', err);
        return [];
    }
}

/**
 * Conta solicitações pendentes
 */
export async function countPendingRequests(userId: string, isAdmin: boolean): Promise<number> {
    try {
        let query = supabase
            .from('user_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (!isAdmin) {
            query = query.eq('user_id', userId);
        }

        const { count, error } = await query;

        if (error) {
            logError('requestsService', 'Error counting pending requests', error);
            return 0;
        }

        return count || 0;
    } catch {
        return 0;
    }
}

/**
 * Atualiza status de uma solicitação
 */
export async function updateUserRequest(options: UpdateRequestOptions): Promise<{ success: boolean; error?: string }> {
    const { requestId, status, adminNotes, resolvedById } = options;

    try {
        const updateData: Record<string, unknown> = {
            status,
            updated_at: new Date().toISOString()
        };

        if (status !== 'pending') {
            updateData.resolved_by = resolvedById || null;
            updateData.resolved_at = new Date().toISOString();
        } else {
            updateData.resolved_by = null;
            updateData.resolved_at = null;
        }

        if (adminNotes !== undefined) {
            updateData.admin_notes = adminNotes;
        }

        const { error } = await supabase
            .from('user_requests')
            .update(updateData)
            .eq('id', requestId);

        if (error) {
            logError('requestsService', 'Error updating request', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        logError('requestsService', 'Unexpected error updating request', err);
        return { success: false, error: err?.message || 'Erro desconhecido' };
    }
}

/**
 * Cria uma nova solicitação
 */
export async function createUserRequest(
    userId: string,
    requestType: string,
    content: string
): Promise<{ data: UserRequest | null; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('user_requests')
            .insert({
                user_id: userId,
                request_type: requestType,
                content: content.trim(),
                status: 'pending'
            })
            .select()
            .single();

        if (error) {
            logError('requestsService', 'Error creating request', error);
            return { data: null, error: error.message };
        }

        return { data };
    } catch (err: any) {
        logError('requestsService', 'Unexpected error creating request', err);
        return { data: null, error: err?.message || 'Erro desconhecido' };
    }
}
