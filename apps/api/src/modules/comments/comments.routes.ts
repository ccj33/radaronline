import type { FastifyReply, FastifyInstance } from 'fastify';
import { z } from 'zod';

import { assertAuthenticated } from '../../shared/auth/authorization.js';
import { problem } from '../../shared/http/problem.js';
import { createCommentsService } from './comments.factory.js';

const commentsService = createCommentsService();

const createCommentSchema = z.object({
  content: z.string().min(1),
  parentId: z.string().nullable().optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1),
});

function mapCommentsError(reply: FastifyReply, error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN';

  switch (message) {
    case 'FORBIDDEN':
      return problem(reply, 403, 'Forbidden', 'User cannot manage this comment.');
    case 'FORBIDDEN_SCOPE':
      return problem(reply, 403, 'Forbidden', 'User cannot access comments outside the allowed microregion.');
    case 'NOT_FOUND':
    case 'ACTION_NOT_FOUND':
      return problem(reply, 404, 'Not found', 'Comment or action was not found.');
    default:
      return problem(reply, 500, 'Internal Server Error', 'Unexpected comments module failure.');
  }
}

export function registerCommentsRoutes(app: FastifyInstance) {
  app.get('/v1/actions/:actionUid/comments', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    try {
      const actionUid = (request.params as { actionUid: string }).actionUid;
      return { items: await commentsService.listComments(actor, actionUid) };
    } catch (error) {
      return mapCommentsError(reply, error);
    }
  });

  app.post('/v1/actions/:actionUid/comments', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const parsed = createCommentSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const actionUid = (request.params as { actionUid: string }).actionUid;
      const item = await commentsService.addComment(actor, actionUid, parsed.data);
      return reply.code(201).send(item);
    } catch (error) {
      return mapCommentsError(reply, error);
    }
  });

  app.patch('/v1/comments/:commentId', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const parsed = updateCommentSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const commentId = (request.params as { commentId: string }).commentId;
      const item = await commentsService.updateComment(actor, commentId, parsed.data.content);
      return item;
    } catch (error) {
      return mapCommentsError(reply, error);
    }
  });

  app.delete('/v1/comments/:commentId', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    try {
      const commentId = (request.params as { commentId: string }).commentId;
      await commentsService.deleteComment(actor, commentId);
      return reply.code(204).send();
    } catch (error) {
      return mapCommentsError(reply, error);
    }
  });
}
