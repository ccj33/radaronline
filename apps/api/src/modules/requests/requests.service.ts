import type { SessionUser } from '../../shared/auth/auth.types.js';
import type { RequestsRepository } from './requests.repository.js';
import type { CreateRequestInput, ManagedStatusFilter, UpdateRequestInput } from './requests.types.js';

export class RequestsService {
  constructor(private readonly repository: RequestsRepository) {}

  async listUserRequests(actor: SessionUser, limit = 20) {
    return this.repository.listUserRequests({
      userId: actor.id,
      isAdmin: ['superadmin', 'admin'].includes(actor.role),
      limit,
    });
  }

  async listNotificationRequests(actor: SessionUser, limit = 20) {
    return this.repository.listNotificationRequests({
      userId: actor.id,
      isAdmin: ['superadmin', 'admin'].includes(actor.role),
      limit,
    });
  }

  async countPendingRequests(actor: SessionUser) {
    return this.repository.countPendingRequests({
      userId: actor.id,
      isAdmin: ['superadmin', 'admin'].includes(actor.role),
    });
  }

  async listManagedRequests(actor: SessionUser, args: { page: number; pageSize: number; statusFilter?: ManagedStatusFilter; typeFilter?: string | 'all' }) {
    if (!['superadmin', 'admin'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    const [items, totalCount] = await Promise.all([
      this.repository.listManagedRequests(args),
      this.repository.countManagedRequests(args),
    ]);

    return { items, totalCount };
  }

  async createRequest(actor: SessionUser, input: Omit<CreateRequestInput, 'userId'>) {
    return this.repository.createRequest({
      ...input,
      userId: actor.id,
    });
  }

  async updateRequest(actor: SessionUser, requestId: string, input: Omit<UpdateRequestInput, 'resolvedById'>) {
    if (!['superadmin', 'admin'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    const updated = await this.repository.updateRequest(requestId, {
      ...input,
      resolvedById: actor.id,
    });
    if (!updated) throw new Error('NOT_FOUND');
  }

  async deleteRequest(actor: SessionUser, requestId: string) {
    if (!['superadmin', 'admin'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }
    const deleted = await this.repository.deleteRequest(requestId);
    if (!deleted) throw new Error('NOT_FOUND');
  }
}
