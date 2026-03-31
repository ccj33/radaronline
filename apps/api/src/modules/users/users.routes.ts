import type { FastifyReply, FastifyInstance } from 'fastify';
import { z } from 'zod';

import { assertRole } from '../../shared/auth/authorization.js';
import { problem } from '../../shared/http/problem.js';
import { createUsersImportService, createUsersService } from './users.factory.js';

const usersService = createUsersService();
const usersImportService = createUsersImportService();

const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['superadmin', 'admin', 'gestor', 'usuario']),
  microregionId: z.string().min(1).nullable(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['superadmin', 'admin', 'gestor', 'usuario']).optional(),
  microregionId: z.string().min(1).nullable().optional(),
  active: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8),
});

const importRowSchema = z.object({
  rowNumber: z.number().int().positive().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  role: z.string().optional(),
  microregions: z.string().optional(),
  municipality: z.string().optional(),
});

const importPreviewSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(500),
});

const importCommitSchema = importPreviewSchema.extend({
  loginUrl: z.string().trim().optional(),
});

function mapUsersError(reply: FastifyReply, error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN';

  switch (message) {
    case 'FORBIDDEN':
      return problem(reply, 403, 'Forbidden', 'Administrative privileges are required.');
    case 'FORBIDDEN_PRIVILEGED_TARGET':
      return problem(
        reply,
        403,
        'Forbidden',
        'Only superadmin can manage admin or superadmin accounts.'
      );
    case 'FORBIDDEN_ROLE_ASSIGNMENT':
      return problem(
        reply,
        403,
        'Forbidden',
        'Only superadmin can assign admin or superadmin roles.'
      );
    case 'FORBIDDEN_SUPERADMIN_TARGET':
      return problem(reply, 403, 'Forbidden', 'The target superadmin operation is not allowed.');
    case 'SELF_DELETE_FORBIDDEN':
      return problem(reply, 400, 'Invalid operation', 'You cannot delete your own user.');
    case 'EMAIL_ALREADY_EXISTS':
      return problem(reply, 409, 'Conflict', 'There is already a user with this email.');
    case 'MICROREGION_REQUIRED':
      return problem(reply, 400, 'Validation error', 'microregionId is required for gestor and usuario.');
    case 'MICROREGION_NOT_ALLOWED':
      return problem(reply, 400, 'Validation error', 'microregionId is not allowed for admin or superadmin.');
    case 'PASSWORD_TOO_SHORT':
      return problem(reply, 400, 'Validation error', 'Password must contain at least 8 characters.');
    case 'EMPTY_IMPORT':
      return problem(reply, 400, 'Validation error', 'At least one row is required for import.');
    case 'IMPORT_LIMIT_EXCEEDED':
      return problem(reply, 400, 'Validation error', 'The import limit is 500 rows per request.');
    case 'NOT_FOUND':
      return problem(reply, 404, 'Not found', 'User was not found.');
    default:
      return problem(reply, 500, 'Internal Server Error', 'Unexpected users module failure.');
  }
}

export function registerUsersRoutes(app: FastifyInstance) {
  app.post('/v1/users/import/preview', async (request, reply) => {
    const actor = await assertRole(request, reply, ['admin', 'superadmin']);
    if (!actor) {
      return reply;
    }

    const parsed = importPreviewSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const preview = await usersImportService.preview(actor, parsed.data.rows);
      return preview;
    } catch (error) {
      return mapUsersError(reply, error);
    }
  });

  app.post('/v1/users/import/commit', async (request, reply) => {
    const actor = await assertRole(request, reply, ['admin', 'superadmin']);
    if (!actor) {
      return reply;
    }

    const parsed = importCommitSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const result = await usersImportService.commit(actor, parsed.data.rows, parsed.data.loginUrl || null);
      return result;
    } catch (error) {
      return mapUsersError(reply, error);
    }
  });

  app.get('/v1/users', async (request, reply) => {
    const actor = await assertRole(request, reply, ['admin', 'superadmin']);
    if (!actor) {
      return reply;
    }

    const items = await usersService.listUsers();
    return { items };
  });

  app.get('/v1/users/:userId', async (request, reply) => {
    const actor = await assertRole(request, reply, ['admin', 'superadmin']);
    if (!actor) {
      return reply;
    }

    try {
      const item = await usersService.getUserById((request.params as { userId: string }).userId);
      return item;
    } catch (error) {
      return mapUsersError(reply, error);
    }
  });

  app.post('/v1/users', async (request, reply) => {
    const actor = await assertRole(request, reply, ['admin', 'superadmin']);
    if (!actor) {
      return reply;
    }

    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const item = await usersService.createUser(actor, parsed.data);
      return reply.code(201).send(item);
    } catch (error) {
      return mapUsersError(reply, error);
    }
  });

  app.patch('/v1/users/:userId', async (request, reply) => {
    const actor = await assertRole(request, reply, ['admin', 'superadmin']);
    if (!actor) {
      return reply;
    }

    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const item = await usersService.updateUser(
        actor,
        (request.params as { userId: string }).userId,
        parsed.data
      );
      return item;
    } catch (error) {
      return mapUsersError(reply, error);
    }
  });

  app.delete('/v1/users/:userId', async (request, reply) => {
    const actor = await assertRole(request, reply, ['superadmin']);
    if (!actor) {
      return reply;
    }

    try {
      const userId = (request.params as { userId: string }).userId;
      await usersService.deleteUser(actor, userId);
      return reply.code(204).send();
    } catch (error) {
      return mapUsersError(reply, error);
    }
  });

  app.post('/v1/users/:userId/reset-password', async (request, reply) => {
    const actor = await assertRole(request, reply, ['admin', 'superadmin']);
    if (!actor) {
      return reply;
    }

    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 400, 'Validation error', parsed.error.issues[0]?.message);
    }

    try {
      const userId = (request.params as { userId: string }).userId;
      await usersService.resetPassword(
        actor,
        userId,
        parsed.data
      );
      return reply.code(204).send();
    } catch (error) {
      return mapUsersError(reply, error);
    }
  });
}
