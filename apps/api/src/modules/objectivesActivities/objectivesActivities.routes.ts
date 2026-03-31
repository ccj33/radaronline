import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import { assertAuthenticated } from '../../shared/auth/authorization.js';
import { problem } from '../../shared/http/problem.js';
import { createObjectivesActivitiesService } from './objectivesActivities.factory.js';

const service = createObjectivesActivitiesService();

const createObjectiveSchema = z.object({
  title: z.string().min(1),
  microregionId: z.string().min(1),
});

const updateObjectiveSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(['on-track', 'delayed']).optional(),
  eixo: z.number().int().optional(),
  description: z.string().optional(),
  eixoLabel: z.string().optional(),
  eixoColor: z.string().optional(),
});

const createActivitySchema = z.object({
  objectiveId: z.number().int(),
  id: z.string().min(1),
  title: z.string().min(1),
  microregionId: z.string().min(1),
  description: z.string().optional(),
});

const updateActivitySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
});

const updateActionActivitySchema = z.object({
  uid: z.string().min(1),
  newActivityId: z.string().min(1),
});

function mapObjectivesActivitiesError(reply: FastifyReply, error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN';
  switch (message) {
    case 'FORBIDDEN':
      return problem(reply, 403, 'Forbidden', 'User cannot manage planning operations.');
    case 'FORBIDDEN_SCOPE':
      return problem(reply, 403, 'Forbidden', 'User cannot access planning data outside the allowed microregion.');
    case 'MISMATCHED_MICROREGION':
      return problem(reply, 400, 'Validation error', 'Objective, activity and action must belong to the same microregion.');
    case 'NOT_FOUND':
      return problem(reply, 404, 'Not found', 'Planning record was not found.');
    default:
      return problem(reply, 500, 'Internal Server Error', 'Unexpected objectives/activities module failure.');
  }
}

export function registerObjectivesActivitiesRoutes(app: FastifyInstance) {
  app.get('/v1/objectives', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const query = request.query as { microregionId?: string };

    try {
      return { items: await service.listObjectives(actor, query.microregionId) };
    } catch (error) {
      return mapObjectivesActivitiesError(reply, error);
    }
  });

  app.get('/v1/activities', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const query = request.query as { microregionId?: string };

    try {
      return { itemsByObjective: await service.listActivities(actor, query.microregionId) };
    } catch (error) {
      return mapObjectivesActivitiesError(reply, error);
    }
  });

  app.post('/v1/objectives', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const parsed = createObjectiveSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const item = await service.createObjective(actor, parsed.data);
      return reply.code(201).send(item);
    } catch (error) {
      return mapObjectivesActivitiesError(reply, error);
    }
  });

  app.patch('/v1/objectives/:id', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const parsed = updateObjectiveSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      await service.updateObjective(actor, Number((request.params as { id: string }).id), parsed.data);
      return reply.code(204).send();
    } catch (error) {
      return mapObjectivesActivitiesError(reply, error);
    }
  });

  app.delete('/v1/objectives/:id', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    try {
      await service.deleteObjective(actor, Number((request.params as { id: string }).id));
      return reply.code(204).send();
    } catch (error) {
      return mapObjectivesActivitiesError(reply, error);
    }
  });

  app.post('/v1/activities', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const parsed = createActivitySchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const item = await service.createActivity(actor, parsed.data);
      return reply.code(201).send(item);
    } catch (error) {
      return mapObjectivesActivitiesError(reply, error);
    }
  });

  app.patch('/v1/activities/:id', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const parsed = updateActivitySchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      await service.updateActivity(actor, (request.params as { id: string }).id, parsed.data);
      return reply.code(204).send();
    } catch (error) {
      return mapObjectivesActivitiesError(reply, error);
    }
  });

  app.delete('/v1/activities/:id', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    try {
      await service.deleteActivity(actor, (request.params as { id: string }).id);
      return reply.code(204).send();
    } catch (error) {
      return mapObjectivesActivitiesError(reply, error);
    }
  });

  app.post('/v1/actions/move-activity', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const parsed = updateActionActivitySchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      await service.updateActionActivityId(actor, parsed.data.uid, parsed.data.newActivityId);
      return reply.code(204).send();
    } catch (error) {
      return mapObjectivesActivitiesError(reply, error);
    }
  });
}
