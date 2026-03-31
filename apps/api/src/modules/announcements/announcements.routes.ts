import type { FastifyReply, FastifyInstance } from 'fastify';
import { z } from 'zod';

import { assertAuthenticated, assertRole } from '../../shared/auth/authorization.js';
import { problem } from '../../shared/http/problem.js';
import { createAnnouncementsService } from './announcements.factory.js';

const announcementsService = createAnnouncementsService();

const createAnnouncementSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(['news', 'alert', 'maintenance', 'tutorial']),
  priority: z.enum(['normal', 'high']),
  displayDate: z.string().min(1),
  targetMicros: z.array(z.string().min(1)).min(1),
  linkUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean(),
  expirationDate: z.string().nullable().optional(),
});

const updateAnnouncementSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  type: z.enum(['news', 'alert', 'maintenance', 'tutorial']).optional(),
  priority: z.enum(['normal', 'high']).optional(),
  displayDate: z.string().min(1).optional(),
  targetMicros: z.array(z.string().min(1)).min(1).optional(),
  linkUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  expirationDate: z.string().nullable().optional(),
});

const toggleAnnouncementSchema = z.object({
  currentState: z.boolean(),
});

function mapAnnouncementsError(reply: FastifyReply, error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN';

  switch (message) {
    case 'FORBIDDEN':
      return problem(reply, 403, 'Forbidden', 'Administrative privileges are required.');
    case 'FORBIDDEN_SCOPE':
      return problem(reply, 403, 'Forbidden', 'User cannot access announcements outside the allowed microregion.');
    case 'NOT_FOUND':
      return problem(reply, 404, 'Not found', 'Announcement was not found.');
    default:
      return problem(reply, 500, 'Internal Server Error', 'Unexpected announcements module failure.');
  }
}

export function registerAnnouncementsRoutes(app: FastifyInstance) {
  app.get('/v1/announcements', async (request, reply) => {
    const query = request.query as { scope?: 'active' | 'admin'; microregionId?: string };

    try {
      if (query.scope === 'admin') {
        const actor = await assertRole(request, reply, ['admin', 'superadmin']);
        if (!actor) return reply;
        return { items: await announcementsService.listAll(actor) };
      }

      const actor = await assertAuthenticated(request, reply);
      if (!actor) return reply;
      return { items: await announcementsService.listActive(actor, query.microregionId) };
    } catch (error) {
      return mapAnnouncementsError(reply, error);
    }
  });

  app.post('/v1/announcements', async (request, reply) => {
    const actor = await assertRole(request, reply, ['admin', 'superadmin']);
    if (!actor) return reply;

    const parsed = createAnnouncementSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const item = await announcementsService.create(actor, parsed.data);
      return reply.code(201).send(item);
    } catch (error) {
      return mapAnnouncementsError(reply, error);
    }
  });

  app.patch('/v1/announcements/:announcementId', async (request, reply) => {
    const actor = await assertRole(request, reply, ['admin', 'superadmin']);
    if (!actor) return reply;

    const parsed = updateAnnouncementSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const announcementId = (request.params as { announcementId: string }).announcementId;
      await announcementsService.update(actor, announcementId, parsed.data);
      return reply.code(204).send();
    } catch (error) {
      return mapAnnouncementsError(reply, error);
    }
  });

  app.delete('/v1/announcements/:announcementId', async (request, reply) => {
    const actor = await assertRole(request, reply, ['admin', 'superadmin']);
    if (!actor) return reply;

    try {
      const announcementId = (request.params as { announcementId: string }).announcementId;
      await announcementsService.delete(actor, announcementId);
      return reply.code(204).send();
    } catch (error) {
      return mapAnnouncementsError(reply, error);
    }
  });

  app.post('/v1/announcements/:announcementId/toggle-active', async (request, reply) => {
    const actor = await assertRole(request, reply, ['admin', 'superadmin']);
    if (!actor) return reply;

    const parsed = toggleAnnouncementSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const announcementId = (request.params as { announcementId: string }).announcementId;
      await announcementsService.toggleActive(actor, announcementId, parsed.data.currentState);
      return reply.code(204).send();
    } catch (error) {
      return mapAnnouncementsError(reply, error);
    }
  });
}
