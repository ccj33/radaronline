import type {
  CreateUserRequestInput,
  ProfileSummary,
  RequestStatus,
  UserRequest,
} from './requestsService.types';

export function getUniqueRequestProfileIds(requests: UserRequest[]): string[] {
  const profileIds = new Set<string>();

  requests.forEach((request) => {
    if (request.user_id) {
      profileIds.add(request.user_id);
    }

    if (request.resolved_by) {
      profileIds.add(request.resolved_by);
    }
  });

  return [...profileIds];
}

export function mergeRequestsWithProfiles(
  requests: UserRequest[],
  profilesMap: Map<string, ProfileSummary>
): UserRequest[] {
  return requests.map((request) => {
    const requesterProfile = profilesMap.get(request.user_id);
    const resolverProfile = request.resolved_by
      ? profilesMap.get(request.resolved_by)
      : undefined;

    const resolvedByName = resolverProfile?.nome ?? request.resolved_by_name ?? null;

    if (!requesterProfile) {
      return {
        ...request,
        resolved_by_name: resolvedByName,
      };
    }

    return {
      ...request,
      resolved_by_name: resolvedByName,
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

export function buildUpdateRequestPayload(
  status: RequestStatus,
  adminNotes?: string,
  resolvedById?: string,
  nowIso: string = new Date().toISOString()
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    status,
    updated_at: nowIso,
  };

  if (status !== 'pending') {
    updateData.resolved_by = resolvedById || null;
    updateData.resolved_at = nowIso;
  } else {
    updateData.resolved_by = null;
    updateData.resolved_at = null;
  }

  if (adminNotes !== undefined) {
    updateData.admin_notes = adminNotes;
  }

  return updateData;
}

export function buildCreateRequestPayload(
  userId: string,
  requestType: string,
  content: string
): Record<string, unknown> {
  return {
    user_id: userId,
    request_type: requestType,
    content: content.trim(),
    status: 'pending',
  };
}

export function buildCreateRequestBatchPayload(
  requests: CreateUserRequestInput[]
): Array<Record<string, unknown>> {
  return requests.map((request) => ({
    user_id: request.userId,
    request_type: request.requestType,
    content: request.content.trim(),
    status: request.status || 'pending',
    admin_notes: request.adminNotes ?? null,
    ...(request.createdAt ? { created_at: request.createdAt } : {}),
  }));
}

export function shouldCreateOwnRequestViaBackend(args: {
  backendRequestsEnabled: boolean;
  currentUserId: string | null;
  targetUserId: string;
}): boolean {
  return (
    args.backendRequestsEnabled &&
    Boolean(args.currentUserId) &&
    args.currentUserId === args.targetUserId
  );
}
