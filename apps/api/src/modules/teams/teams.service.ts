import type { SessionUser } from '../../shared/auth/auth.types.js';
import {
  assertMicroregionAccess,
  isPrivilegedActor,
  requireScopedMicroregion,
} from '../../shared/auth/authorization.js';
import type { TeamsRepository } from './teams.repository.js';
import type { CreateTeamMemberInput, SaveUserMunicipalityInput } from './teams.types.js';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class TeamsService {
  constructor(private readonly repository: TeamsRepository) {}

  async listTeams(actor: SessionUser, microregionId?: string) {
    return this.repository.listTeams(assertMicroregionAccess(actor, microregionId));
  }

  async getUserTeamStatus(actor: SessionUser, email: string) {
    const normalizedEmail = normalizeEmail(email);

    if (!isPrivilegedActor(actor) && normalizeEmail(actor.email) !== normalizedEmail) {
      throw new Error('FORBIDDEN_SCOPE');
    }

    const scopedMicroregionId = isPrivilegedActor(actor)
      ? undefined
      : requireScopedMicroregion(actor, actor.microregionId);

    return this.repository.getUserTeamStatus(normalizedEmail, scopedMicroregionId);
  }

  async saveUserMunicipality(actor: SessionUser, input: SaveUserMunicipalityInput) {
    if (!['superadmin', 'admin'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    await this.repository.saveUserMunicipality({
      ...input,
      microregionId: requireScopedMicroregion(actor, input.microregionId),
    });
  }

  async addTeamMember(actor: SessionUser, input: CreateTeamMemberInput) {
    if (!['superadmin', 'admin', 'gestor'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    return this.repository.addTeamMember({
      ...input,
      microregionId: requireScopedMicroregion(actor, input.microregionId),
    });
  }

  async removeTeamMember(actor: SessionUser, memberId: string) {
    if (!['superadmin', 'admin', 'gestor'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    const current = await this.repository.getTeamMemberById(memberId);
    if (!current) {
      throw new Error('NOT_FOUND');
    }

    assertMicroregionAccess(actor, current.microregionId);
    await this.repository.removeTeamMember(memberId);
  }

  async listPendingRegistrations(actor: SessionUser) {
    if (!['superadmin', 'admin'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    return this.repository.listPendingRegistrations();
  }

  async deletePendingRegistration(actor: SessionUser, id: string) {
    if (!['superadmin', 'admin'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    const current = await this.repository.getPendingRegistrationById(id);
    if (!current) {
      throw new Error('NOT_FOUND');
    }

    assertMicroregionAccess(actor, current.microregionId);
    await this.repository.deletePendingRegistration(id);
  }
}
