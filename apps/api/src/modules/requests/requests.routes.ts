import type { FastifyReply, FastifyInstance } from 'fastify';
import { z } from 'zod';

import { assertAuthenticated } from '../../shared/auth/authorization.js';
import { problem } from '../../shared/http/problem.js';
import { createRequestsService } from './requests.factory.js';

const requestsService = createRequestsService();

const createRequestSchema = z.object({
  userId: z.string().optional(),
  requestType: z.string().min(1),
  content: z.string().min(1),
  status: z.enum(['pending', 'resolved', 'rejected']).optional(),
  adminNotes: z.string().optional(),
});

const updateRequestSchema = z.object({
  status: z.enum(['pending', 'resolved', 'rejected']),
  adminNotes: z.string().optional(),
});

function mapRequestsError(reply: FastifyReply, error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN';
  switch (message) {
    case 'FORBIDDEN':
      return problem(reply, 403, 'Forbidden', 'User cannot manage requests.');
    case 'NOT_FOUND':
      return problem(reply, 404, 'Not found', 'Request was not found.');
    default:
      return problem(reply, 500, 'Internal Server Error', 'Unexpected requests module failure.');
  }
}

export function registerRequestsRoutes(app: FastifyInstance) {
  app.get('/v1/requests', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const query = request.query as {
      scope?: 'user' | 'managed' | 'notifications';
      limit?: string;
      page?: string;
      pageSize?: string;
      statusFilter?: 'pending' | 'resolved' | 'rejected' | 'all';
      typeFilter?: string;
    };

    try {
      if (query.scope === 'managed') {
        return requestsService.listManagedRequests(actor, {
          page: Number(query.page || 1),
          pageSize: Number(query.pageSize || 20),
          statusFilter: query.statusFilter || 'all',
          typeFilter: query.typeFilter || 'all',
        });
      }

      if (query.scope === 'notifications') {
        return { items: await requestsService.listNotificationRequests(actor, Number(query.limit || 20)) };
      }

      return { items: await requestsService.listUserRequests(actor, Number(query.limit || 20)) };
    } catch (error) {
      return mapRequestsError(reply, error);
    }
  });

  app.get('/v1/requests/pending-count', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    try {
      return { count: await requestsService.countPendingRequests(actor) };
    } catch (error) {
      return mapRequestsError(reply, error);
    }
  });

  app.post('/v1/requests', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const parsed = createRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const item = await requestsService.createRequest(actor, parsed.data);
      return reply.code(201).send(item);
    } catch (error) {
      return mapRequestsError(reply, error);
    }
  });

  app.patch('/v1/requests/:requestId', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const parsed = updateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const requestId = (request.params as { requestId: string }).requestId;
      await requestsService.updateRequest(actor, requestId, parsed.data);
      return reply.code(204).send();
    } catch (error) {
      return mapRequestsError(reply, error);
    }
  });

  app.delete('/v1/requests/:requestId', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    try {
      const requestId = (request.params as { requestId: string }).requestId;
      await requestsService.deleteRequest(actor, requestId);
      return reply.code(204).send();
    } catch (error) {
      return mapRequestsError(reply, error);
    }
  });
}
