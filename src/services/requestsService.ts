import { logError } from '../lib/logger';
import {
  countPendingRequestsViaBackendApi,
  createUserRequestViaBackendApi,
  deleteUserRequestViaBackendApi,
  listManagedRequestsViaBackendApi,
  listNotificationRequestsViaBackendApi,
  listUserRequestsViaBackendApi,
  subscribeToRequestsViaBackendPolling,
  unsubscribeFromBackendRequestsSubscription,
  updateUserRequestViaBackendApi,
} from './requestsApi';
import {
  buildCreateRequestBatchPayload,
  buildCreateRequestPayload,
  buildUpdateRequestPayload,
  getUniqueRequestProfileIds,
  mergeRequestsWithProfiles,
  shouldCreateOwnRequestViaBackend,
} from './requests/requestsService.helpers';
import {
  countManagedRequests,
  countPendingRequestRecords,
  deleteRequestRecord,
  fetchProfilesMap,
  insertRequestBatchRecords,
  insertRequestRecord,
  listManagedRequests,
  listNotificationRequests,
  listUserRequests,
  removeRequestSubscription,
  subscribeToRequestChanges,
  updateRequestRecord,
} from './requests/requestsService.repositories';
import type {
  CreateUserRequestInput,
  LoadManagedRequestsOptions,
  LoadManagedRequestsResult,
  LoadNotificationRequestsOptions,
  LoadRequestsOptions,
  RequestsRealtimeChannel,
  SubscribeToRequestsOptions,
  UpdateRequestOptions,
  UserRequest,
} from './requests/requestsService.types';
import { shouldUseBackendRequestsApi } from './apiClient';
import { getCurrentUserId } from './sessionService';

export type {
  CreateUserRequestInput,
  LoadManagedRequestsOptions,
  LoadManagedRequestsResult,
  ManagedStatusFilter,
  LoadNotificationRequestsOptions,
  LoadRequestsOptions,
  RequestStatus,
  SubscribeToRequestsOptions,
  UpdateRequestOptions,
  UserRequest,
} from './requests/requestsService.types';

async function enrichRequestsWithProfiles(
  requests: UserRequest[],
  includeProfileDetails: boolean
): Promise<UserRequest[]> {
  if (!includeProfileDetails || requests.length === 0) {
    return requests;
  }

  const profilesMap = await fetchProfilesMap(getUniqueRequestProfileIds(requests));
  return mergeRequestsWithProfiles(requests, profilesMap);
}

export async function loadUserRequests(options: LoadRequestsOptions): Promise<UserRequest[]> {
  const { userId, isAdmin, limit = 20, includeProfileDetails = true } = options;

  try {
    if (shouldUseBackendRequestsApi()) {
      return listUserRequestsViaBackendApi(limit);
    }
    const requests = await listUserRequests({ userId, isAdmin, limit });
    return enrichRequestsWithProfiles(requests, includeProfileDetails);
  } catch (error) {
    logError('requestsService', 'Unexpected error loading requests', error);
    return [];
  }
}

export async function loadNotificationRequests(
  options: LoadNotificationRequestsOptions
): Promise<UserRequest[]> {
  const { userId, isAdmin, limit = 20, includeProfileDetails = true } = options;

  try {
    if (shouldUseBackendRequestsApi()) {
      return listNotificationRequestsViaBackendApi(limit);
    }
    const requests = await listNotificationRequests({ userId, isAdmin, limit });
    return enrichRequestsWithProfiles(requests, includeProfileDetails);
  } catch (error) {
    logError('requestsService', 'Unexpected error loading notification requests', error);
    return [];
  }
}

export async function loadManagedRequests(
  options: LoadManagedRequestsOptions
): Promise<LoadManagedRequestsResult> {
  const {
    page,
    pageSize,
    statusFilter = 'all',
    typeFilter = 'all',
    includeProfileDetails = true,
  } = options;

  try {
    if (shouldUseBackendRequestsApi()) {
      return listManagedRequestsViaBackendApi({ page, pageSize, statusFilter, typeFilter });
    }
    const [totalCount, requests] = await Promise.all([
      countManagedRequests({ statusFilter, typeFilter }),
      listManagedRequests({ page, pageSize, statusFilter, typeFilter }),
    ]);

    return {
      data: await enrichRequestsWithProfiles(requests, includeProfileDetails),
      totalCount,
    };
  } catch (error: any) {
    logError('requestsService', 'Unexpected error loading managed requests', error);
    return { data: [], totalCount: 0, error: error?.message || 'Erro inesperado' };
  }
}

export async function countPendingRequests(userId: string, isAdmin: boolean): Promise<number> {
  try {
    if (shouldUseBackendRequestsApi()) {
      return countPendingRequestsViaBackendApi();
    }
    return await countPendingRequestRecords(userId, isAdmin);
  } catch (error) {
    logError('requestsService', 'Error counting pending requests', error);
    return 0;
  }
}

export async function updateUserRequest(
  options: UpdateRequestOptions
): Promise<{ success: boolean; error?: string }> {
  const { requestId, status, adminNotes, resolvedById } = options;

  try {
    if (shouldUseBackendRequestsApi()) {
      await updateUserRequestViaBackendApi({ requestId, status, adminNotes });
      return { success: true };
    }
    await updateRequestRecord(
      requestId,
      buildUpdateRequestPayload(status, adminNotes, resolvedById)
    );

    return { success: true };
  } catch (error: any) {
    logError('requestsService', 'Unexpected error updating request', error);
    return { success: false, error: error?.message || 'Erro inesperado' };
  }
}

export async function deleteUserRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (shouldUseBackendRequestsApi()) {
      await deleteUserRequestViaBackendApi(requestId);
      return { success: true };
    }
    await deleteRequestRecord(requestId);
    return { success: true };
  } catch (error: any) {
    logError('requestsService', 'Unexpected error deleting request', error);
    return { success: false, error: error?.message || 'Erro inesperado' };
  }
}

export async function createUserRequest(
  userId: string,
  requestType: string,
  content: string
): Promise<{ data: UserRequest | null; error?: string }> {
  try {
    const backendRequestsEnabled = shouldUseBackendRequestsApi();
    const currentUserId = backendRequestsEnabled ? await getCurrentUserId() : null;

    if (
      shouldCreateOwnRequestViaBackend({
        backendRequestsEnabled,
        currentUserId,
        targetUserId: userId,
      })
    ) {
      const data = await createUserRequestViaBackendApi({ requestType, content });
      return { data };
    }
    const data = await insertRequestRecord(buildCreateRequestPayload(userId, requestType, content));
    return { data };
  } catch (error: any) {
    logError('requestsService', 'Unexpected error creating request', error);
    return { data: null, error: error?.message || 'Erro inesperado' };
  }
}

export async function createUserRequestsBatch(
  requests: CreateUserRequestInput[]
): Promise<{ success: boolean; error?: string; insertedIds?: string[] }> {
  if (requests.length === 0) {
    return { success: true, insertedIds: [] };
  }

  try {
    const insertedIds = await insertRequestBatchRecords(buildCreateRequestBatchPayload(requests));
    return { success: true, insertedIds };
  } catch (error: any) {
    logError('requestsService', 'Unexpected error creating request batch', error);
    return { success: false, error: error?.message || 'Erro inesperado' };
  }
}

export function subscribeToUserRequests(
  options: SubscribeToRequestsOptions
): RequestsRealtimeChannel {
  const { channelName, userId, isAdmin, onChange } = options;

  if (shouldUseBackendRequestsApi()) {
    return subscribeToRequestsViaBackendPolling(onChange);
  }

  return subscribeToRequestChanges({
    channelName,
    filter: isAdmin ? undefined : `user_id=eq.${userId}`,
    onChange,
  });
}

export function unsubscribeFromUserRequests(channel: RequestsRealtimeChannel): void {
  if (shouldUseBackendRequestsApi()) {
    unsubscribeFromBackendRequestsSubscription(channel);
    return;
  }
  removeRequestSubscription(channel);
}
