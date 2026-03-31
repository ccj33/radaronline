import type { SessionUser } from '../../shared/auth/auth.types.js';
import {
  assertActionAccess,
  assertMicroregionAccess,
  requireScopedMicroregion,
} from '../../shared/auth/authorization.js';
import type { ObjectivesActivitiesRepository } from './objectivesActivities.repository.js';
import type {
  CreateActivityInput,
  CreateObjectiveInput,
  UpdateActivityInput,
  UpdateObjectiveInput,
} from './objectivesActivities.types.js';

export class ObjectivesActivitiesService {
  constructor(private readonly repository: ObjectivesActivitiesRepository) {}

  async listObjectives(actor: SessionUser, microregionId?: string) {
    return this.repository.listObjectives(assertMicroregionAccess(actor, microregionId));
  }

  async listActivities(actor: SessionUser, microregionId?: string) {
    return this.repository.listActivities(assertMicroregionAccess(actor, microregionId));
  }

  async createObjective(actor: SessionUser, input: CreateObjectiveInput) {
    if (!['superadmin', 'admin', 'gestor'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    return this.repository.createObjective({
      ...input,
      microregionId: requireScopedMicroregion(actor, input.microregionId),
    });
  }

  async updateObjective(actor: SessionUser, id: number, updates: UpdateObjectiveInput) {
    if (!['superadmin', 'admin', 'gestor'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    const current = await this.repository.getObjectiveById(id);
    if (!current) {
      throw new Error('NOT_FOUND');
    }

    assertMicroregionAccess(actor, current.microregionId);
    await this.repository.updateObjective(id, updates);
  }

  async deleteObjective(actor: SessionUser, id: number) {
    if (!['superadmin', 'admin', 'gestor'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    const current = await this.repository.getObjectiveById(id);
    if (!current) {
      throw new Error('NOT_FOUND');
    }

    assertMicroregionAccess(actor, current.microregionId);
    await this.repository.deleteObjective(id);
  }

  async createActivity(actor: SessionUser, input: CreateActivityInput) {
    if (!['superadmin', 'admin', 'gestor'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    const objective = await this.repository.getObjectiveById(input.objectiveId);
    if (!objective) {
      throw new Error('NOT_FOUND');
    }

    const scopedMicroregionId = requireScopedMicroregion(actor, objective.microregionId);
    if (input.microregionId !== objective.microregionId) {
      throw new Error('MISMATCHED_MICROREGION');
    }

    return this.repository.createActivity({
      ...input,
      microregionId: scopedMicroregionId,
    });
  }

  async updateActivity(actor: SessionUser, id: string, updates: UpdateActivityInput) {
    if (!['superadmin', 'admin', 'gestor'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    const current = await this.repository.getActivityById(id);
    if (!current) {
      throw new Error('NOT_FOUND');
    }

    assertMicroregionAccess(actor, current.microregionId);
    await this.repository.updateActivity(id, updates);
  }

  async deleteActivity(actor: SessionUser, id: string) {
    if (!['superadmin', 'admin', 'gestor'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    const current = await this.repository.getActivityById(id);
    if (!current) {
      throw new Error('NOT_FOUND');
    }

    assertMicroregionAccess(actor, current.microregionId);
    await this.repository.deleteActivity(id);
  }

  async updateActionActivityId(actor: SessionUser, uid: string, newActivityId: string) {
    if (!['superadmin', 'admin', 'gestor'].includes(actor.role)) {
      throw new Error('FORBIDDEN');
    }

    const actionMicroregionId = assertActionAccess(actor, uid);
    const activity = await this.repository.getActivityById(newActivityId);
    if (!activity) {
      throw new Error('NOT_FOUND');
    }

    assertMicroregionAccess(actor, activity.microregionId);
    if (actionMicroregionId && activity.microregionId !== actionMicroregionId) {
      throw new Error('MISMATCHED_MICROREGION');
    }

    await this.repository.updateActionActivityId(uid, newActivityId);
  }
}
