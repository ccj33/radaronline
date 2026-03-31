import type { SessionUser } from '../../shared/auth/auth.types.js';
import {
  canActorAssignUserRole,
  canActorManageTargetUser,
} from './users.policy.js';
import type { UsersRepository } from './users.repository.js';
import type { CreateUserInput, ResetPasswordInput, UpdateUserInput } from './users.types.js';

export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async listUsers() {
    return this.repository.list();
  }

  async getUserById(userId: string) {
    const current = await this.repository.getById(userId);
    if (!current) {
      throw new Error('NOT_FOUND');
    }

    return current;
  }

  async createUser(actor: SessionUser, input: CreateUserInput) {
    if (actor.role !== 'admin' && actor.role !== 'superadmin') {
      throw new Error('FORBIDDEN');
    }

    const existing = await this.repository.getByEmail(input.email);
    if (existing) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    if (!canActorAssignUserRole(actor.role, input.role)) {
      throw new Error('FORBIDDEN_ROLE_ASSIGNMENT');
    }

    if ((input.role === 'gestor' || input.role === 'usuario') && !input.microregionId) {
      throw new Error('MICROREGION_REQUIRED');
    }

    if ((input.role === 'admin' || input.role === 'superadmin') && input.microregionId) {
      throw new Error('MICROREGION_NOT_ALLOWED');
    }

    return this.repository.create({
      ...input,
      createdBy: actor.id,
    });
  }

  async updateUser(actor: SessionUser, userId: string, input: UpdateUserInput) {
    if (actor.role !== 'admin' && actor.role !== 'superadmin') {
      throw new Error('FORBIDDEN');
    }

    const current = await this.repository.getById(userId);
    if (!current) {
      throw new Error('NOT_FOUND');
    }

    if (!canActorManageTargetUser(actor.role, current.role)) {
      throw new Error('FORBIDDEN_PRIVILEGED_TARGET');
    }

    if (input.role && !canActorAssignUserRole(actor.role, input.role)) {
      throw new Error('FORBIDDEN_ROLE_ASSIGNMENT');
    }

    return this.repository.update(userId, input);
  }

  async deleteUser(actor: SessionUser, userId: string) {
    if (actor.role !== 'superadmin') {
      throw new Error('FORBIDDEN');
    }

    if (actor.id === userId) {
      throw new Error('SELF_DELETE_FORBIDDEN');
    }

    const current = await this.repository.getById(userId);
    if (!current) {
      throw new Error('NOT_FOUND');
    }

    if (current.role === 'superadmin') {
      throw new Error('FORBIDDEN_SUPERADMIN_TARGET');
    }

    const deleted = await this.repository.delete(userId);
    if (!deleted) {
      throw new Error('NOT_FOUND');
    }
  }

  async resetPassword(actor: SessionUser, userId: string, input: ResetPasswordInput) {
    if (actor.role !== 'admin' && actor.role !== 'superadmin') {
      throw new Error('FORBIDDEN');
    }

    if (input.password.length < 8) {
      throw new Error('PASSWORD_TOO_SHORT');
    }

    const current = await this.repository.getById(userId);
    if (!current) {
      throw new Error('NOT_FOUND');
    }

    if (current.role === 'superadmin' && actor.id !== userId) {
      throw new Error('FORBIDDEN_SUPERADMIN_TARGET');
    }

    if (!canActorManageTargetUser(actor.role, current.role)) {
      throw new Error('FORBIDDEN_PRIVILEGED_TARGET');
    }

    const changed = await this.repository.resetPassword(userId, input);
    if (!changed) {
      throw new Error('NOT_FOUND');
    }
  }
}
