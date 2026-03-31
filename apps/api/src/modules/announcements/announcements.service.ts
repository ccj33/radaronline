import type { SessionUser } from '../../shared/auth/auth.types.js';
import { assertMicroregionAccess } from '../../shared/auth/authorization.js';
import type { AnnouncementsRepository } from './announcements.repository.js';
import type { CreateAnnouncementInput, UpdateAnnouncementInput } from './announcements.types.js';

function normalizeTargetMicros(targetMicros: string[] | undefined): string[] {
  if (!targetMicros || targetMicros.length === 0) {
    return ['all'];
  }

  const cleaned = targetMicros.map((item) => item.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : ['all'];
}

export class AnnouncementsService {
  constructor(private readonly repository: AnnouncementsRepository) {}

  async listActive(actor: SessionUser, microregionId?: string) {
    return this.repository.listActive(assertMicroregionAccess(actor, microregionId));
  }

  async listAll(_actor: SessionUser) {
    return this.repository.listAll();
  }

  async create(actor: SessionUser, input: CreateAnnouncementInput) {
    return this.repository.create({
      ...input,
      targetMicros: normalizeTargetMicros(input.targetMicros),
      createdBy: actor.id,
    });
  }

  async update(_actor: SessionUser, id: string, input: UpdateAnnouncementInput) {
    const updated = await this.repository.update(id, {
      ...input,
      ...(input.targetMicros ? { targetMicros: normalizeTargetMicros(input.targetMicros) } : {}),
    });
    if (!updated) throw new Error('NOT_FOUND');
  }

  async delete(_actor: SessionUser, id: string) {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new Error('NOT_FOUND');
  }

  async toggleActive(_actor: SessionUser, id: string, currentState: boolean) {
    const updated = await this.repository.toggleActive(id, currentState);
    if (!updated) throw new Error('NOT_FOUND');
  }
}
