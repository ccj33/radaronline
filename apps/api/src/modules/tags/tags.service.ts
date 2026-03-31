import type { SessionUser } from '../../shared/auth/auth.types.js';
import {
  assertActionAccess,
  assertMicroregionAccess,
  requireScopedMicroregion,
} from '../../shared/auth/authorization.js';
import type { TagsRepository } from './tags.repository.js';
import type { ActionTagRecord } from './tags.types.js';

function mapTagWithFavorite(tag: { id: string; name: string; color: string; favoriteMicros: string[] }, microregionId?: string): ActionTagRecord {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    isFavorite: microregionId ? tag.favoriteMicros.includes(microregionId) : false,
  };
}

export class TagsService {
  constructor(private readonly repository: TagsRepository) {}

  async listTags(actor: SessionUser, microregionId?: string) {
    const scopedMicroregionId = assertMicroregionAccess(actor, microregionId);
    const tags = await this.repository.list();
    return tags.map((tag) => mapTagWithFavorite(tag, scopedMicroregionId));
  }

  async createTag(actor: SessionUser, name: string) {
    if (!['superadmin', 'admin'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    return mapTagWithFavorite(await this.repository.create({ name, createdBy: actor.id }));
  }

  async deleteTag(actor: SessionUser, tagId: string) {
    if (!['superadmin', 'admin'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    const current = await this.repository.getById(tagId);
    if (!current) throw new Error('NOT_FOUND');
    await this.repository.delete(tagId);
    return current;
  }

  async toggleFavorite(actor: SessionUser, tagId: string, microregionId: string) {
    const current = await this.repository.getById(tagId);
    if (!current) throw new Error('NOT_FOUND');

    const scopedMicroregionId = requireScopedMicroregion(actor, microregionId);
    const nextFavorites = current.favoriteMicros.includes(scopedMicroregionId)
      ? current.favoriteMicros.filter((id) => id !== scopedMicroregionId)
      : [...current.favoriteMicros, scopedMicroregionId];
    await this.repository.updateFavoriteMicros(tagId, nextFavorites);
    return { isFavorite: nextFavorites.includes(scopedMicroregionId) };
  }

  async listActionTags(actor: SessionUser, actionUid: string, microregionId?: string) {
    const actionMicroregionId = assertActionAccess(actor, actionUid);
    const effectiveMicroregionId = assertMicroregionAccess(
      actor,
      microregionId || actionMicroregionId
    );
    const tags = await this.repository.listActionTags(actionUid);
    return tags.map((tag) => mapTagWithFavorite(tag, effectiveMicroregionId));
  }

  async assignToAction(actor: SessionUser, actionUid: string, tagId: string) {
    if (!['superadmin', 'admin', 'gestor'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    assertActionAccess(actor, actionUid);
    const tag = await this.repository.getById(tagId);
    if (!tag) throw new Error('NOT_FOUND');
    await this.repository.assignToAction(actionUid, tagId);
    return tag;
  }

  async removeFromAction(actor: SessionUser, actionUid: string, tagId: string) {
    if (!['superadmin', 'admin', 'gestor'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    assertActionAccess(actor, actionUid);
    await this.repository.removeFromAction(actionUid, tagId);
  }
}
