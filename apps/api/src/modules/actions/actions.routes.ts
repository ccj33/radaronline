import type { FastifyReply, FastifyInstance } from 'fastify';
import { z } from 'zod';

import { assertAuthenticated, assertRole } from '../../shared/auth/authorization.js';
import { problem } from '../../shared/http/problem.js';
import { createActionsService } from './actions.factory.js';

const actionsService = createActionsService();

const createActionSchema = z.object({
  activityId: z.string().min(1),
  microregionId: z.string().min(1),
  actionNumber: z.number().int().positive(),
  title: z.string().min(1).default('Nova acao'),
});

const updateActionSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(['Concluido', 'Em Andamento', 'Nao Iniciado', 'Atrasado']).optional(),
  startDate: z.string().nullable().optional(),
  plannedEndDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  progress: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

function mapActionsError(reply: FastifyReply, error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN';

  switch (message) {
    case 'FORBIDDEN':
      return problem(reply, 403, 'Forbidden', 'User cannot manage actions.');
    case 'FORBIDDEN_SCOPE':
      return problem(reply, 403, 'Forbidden', 'User cannot access actions outside the allowed microregion.');
    case 'INVALID_ACTION_NUMBER':
      return problem(reply, 400, 'Validation error', 'actionNumber must be greater than zero.');
    case 'INVALID_PROGRESS':
      return problem(reply, 400, 'Validation error', 'progress must be between 0 and 100.');
    case 'MISSING_REQUIRED_FIELDS':
      return problem(reply, 400, 'Validation error', 'activityId and microregionId are required.');
    case 'NOT_FOUND':
      return problem(reply, 404, 'Not found', 'Action was not found.');
    default:
      return problem(reply, 500, 'Internal Server Error', 'Unexpected actions module failure.');
  }
}

export function registerActionRoutes(app: FastifyInstance) {
  app.get('/v1/actions', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) {
      return reply;
    }

    const microregionId = (request.query as { microregionId?: string }).microregionId;

    try {
      const items = await actionsService.listActions(actor, microregionId);
      return { items };
    } catch (error) {
      return mapActionsError(reply, error);
    }
  });

  app.get('/v1/actions/:actionUid', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) {
      return reply;
    }

    try {
      const item = await actionsService.getActionByUid(
        actor,
        (request.params as { actionUid: string }).actionUid
      );
      return item;
    } catch (error) {
      return mapActionsError(reply, error);
    }
  });

  app.post('/v1/actions', async (request, reply) => {
    const actor = await assertRole(request, reply, ['superadmin', 'admin', 'gestor']);
    if (!actor) {
      return reply;
    }

    const parsed = createActionSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const item = await actionsService.createAction(actor, parsed.data);
      return reply.code(201).send(item);
    } catch (error) {
      return mapActionsError(reply, error);
    }
  });

  app.patch('/v1/actions/:actionUid', async (request, reply) => {
    const actor = await assertRole(request, reply, ['superadmin', 'admin', 'gestor']);
    if (!actor) {
      return reply;
    }

    const parsed = updateActionSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const item = await actionsService.updateAction(
        actor,
        (request.params as { actionUid: string }).actionUid,
        parsed.data
      );
      return item;
    } catch (error) {
      return mapActionsError(reply, error);
    }
  });

  app.delete('/v1/actions/:actionUid', async (request, reply) => {
    const actor = await assertRole(request, reply, ['superadmin', 'admin', 'gestor']);
    if (!actor) {
      return reply;
    }

    try {
      await actionsService.deleteAction(
        actor,
        (request.params as { actionUid: string }).actionUid
      );
      return reply.code(204).send();
    } catch (error) {
      return mapActionsError(reply, error);
    }
  });
}
