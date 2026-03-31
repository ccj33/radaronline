import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import { assertAuthenticated } from '../../shared/auth/authorization.js';
import { problem } from '../../shared/http/problem.js';
import { createTeamsService } from './teams.factory.js';

const teamsService = createTeamsService();

const createTeamMemberSchema = z.object({
  microregionId: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  email: z.email().optional(),
  municipality: z.string().optional(),
});

const saveUserMunicipalitySchema = z.object({
  microregionId: z.string().min(1),
  email: z.email(),
  municipality: z.string().min(1),
  userName: z.string().min(1),
});

function mapTeamsError(reply: FastifyReply, error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN';
  switch (message) {
    case 'FORBIDDEN':
      return problem(reply, 403, 'Forbidden', 'User cannot manage team operations.');
    case 'FORBIDDEN_SCOPE':
      return problem(reply, 403, 'Forbidden', 'User cannot access team data outside the allowed scope.');
    case 'NOT_FOUND':
      return problem(reply, 404, 'Not found', 'Team member or pending registration was not found.');
    default:
      return problem(reply, 500, 'Internal Server Error', 'Unexpected teams module failure.');
  }
}

export function registerTeamsRoutes(app: FastifyInstance) {
  app.get('/v1/teams', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const query = request.query as { microregionId?: string };

    try {
      return { itemsByMicro: await teamsService.listTeams(actor, query.microregionId) };
    } catch (error) {
      return mapTeamsError(reply, error);
    }
  });

  app.get('/v1/teams/status', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const query = request.query as { email?: string };
    if (!query.email) {
      return problem(reply, 400, 'Validation error', 'email is required.');
    }

    try {
      return await teamsService.getUserTeamStatus(actor, query.email);
    } catch (error) {
      return mapTeamsError(reply, error);
    }
  });

  app.post('/v1/teams/user-municipality', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const parsed = saveUserMunicipalitySchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      await teamsService.saveUserMunicipality(actor, parsed.data);
      return reply.code(204).send();
    } catch (error) {
      return mapTeamsError(reply, error);
    }
  });

  app.post('/v1/teams', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    const parsed = createTeamMemberSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const item = await teamsService.addTeamMember(actor, parsed.data);
      return reply.code(201).send(item);
    } catch (error) {
      return mapTeamsError(reply, error);
    }
  });

  app.delete('/v1/teams/:memberId', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    try {
      await teamsService.removeTeamMember(actor, (request.params as { memberId: string }).memberId);
      return reply.code(204).send();
    } catch (error) {
      return mapTeamsError(reply, error);
    }
  });

  app.get('/v1/teams/pending-registrations', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    try {
      return { items: await teamsService.listPendingRegistrations(actor) };
    } catch (error) {
      return mapTeamsError(reply, error);
    }
  });

  app.delete('/v1/teams/pending-registrations/:id', async (request, reply) => {
    const actor = await assertAuthenticated(request, reply);
    if (!actor) return reply;

    try {
      await teamsService.deletePendingRegistration(actor, (request.params as { id: string }).id);
      return reply.code(204).send();
    } catch (error) {
      return mapTeamsError(reply, error);
    }
  });
}
