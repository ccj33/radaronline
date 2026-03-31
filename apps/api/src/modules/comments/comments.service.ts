import type { SessionUser } from '../../shared/auth/auth.types.js';
import { assertActionAccess } from '../../shared/auth/authorization.js';
import type { CommentsRepository } from './comments.repository.js';

export class CommentsService {
  constructor(private readonly repository: CommentsRepository) {}

  async listComments(actor: SessionUser, actionUid: string) {
    assertActionAccess(actor, actionUid);
    return this.repository.listByActionUid(actionUid);
  }

  async addComment(actor: SessionUser, actionUid: string, input: { content: string; parentId?: string | null }) {
    assertActionAccess(actor, actionUid);
    return this.repository.create({
      actionUid,
      authorId: actor.id,
      content: input.content,
      parentId: input.parentId,
    });
  }

  async updateComment(actor: SessionUser, commentId: string, content: string) {
    const current = await this.repository.getById(commentId);
    if (!current) throw new Error('NOT_FOUND');

    assertActionAccess(actor, current.actionUid);

    const isAdmin = actor.role === 'admin' || actor.role === 'superadmin';
    if (!isAdmin && current.authorId !== actor.id) {
      throw new Error('FORBIDDEN');
    }

    await this.repository.update(commentId, content.trim());
    const updated = await this.repository.getById(commentId);
    return updated || { ...current, content: content.trim() };
  }

  async deleteComment(actor: SessionUser, commentId: string) {
    const current = await this.repository.getById(commentId);
    if (!current) throw new Error('NOT_FOUND');

    assertActionAccess(actor, current.actionUid);

    const isAdmin = actor.role === 'admin' || actor.role === 'superadmin';
    if (!isAdmin && current.authorId !== actor.id) {
      throw new Error('FORBIDDEN');
    }

    await this.repository.deleteChildren(commentId);
    await this.repository.delete(commentId);
    return current;
  }
}
