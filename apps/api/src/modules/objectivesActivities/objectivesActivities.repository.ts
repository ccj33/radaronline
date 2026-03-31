import type {
  ActivityRecord,
  CreateActivityInput,
  CreateObjectiveInput,
  ObjectiveRecord,
  UpdateActivityInput,
  UpdateObjectiveInput,
} from './objectivesActivities.types.js';

export interface ObjectivesActivitiesRepository {
  listObjectives(microregionId?: string): Promise<ObjectiveRecord[]>;
  listActivities(microregionId?: string): Promise<Record<number, ActivityRecord[]>>;
  getObjectiveById(id: number): Promise<ObjectiveRecord | null>;
  getActivityById(id: string): Promise<ActivityRecord | null>;
  createObjective(input: CreateObjectiveInput): Promise<ObjectiveRecord>;
  updateObjective(id: number, updates: UpdateObjectiveInput): Promise<void>;
  deleteObjective(id: number): Promise<void>;
  createActivity(input: CreateActivityInput): Promise<ActivityRecord>;
  updateActivity(id: string, updates: UpdateActivityInput): Promise<void>;
  deleteActivity(id: string): Promise<void>;
  updateActionActivityId(uid: string, newActivityId: string): Promise<void>;
}

const inMemoryObjectives = new Map<number, ObjectiveRecord>([
  [
    1,
    {
      id: 1,
      title: 'Objetivo Seed',
      status: 'on-track',
      microregionId: 'MR001',
    },
  ],
]);

const inMemoryActivities = new Map<string, ActivityRecord>([
  [
    '1.1',
    {
      id: '1.1',
      objectiveId: 1,
      title: 'Atividade Seed',
      description: '',
      microregionId: 'MR001',
    },
  ],
]);

function groupActivities(activities: ActivityRecord[]): Record<number, ActivityRecord[]> {
  const grouped: Record<number, ActivityRecord[]> = {};
  activities.forEach((activity) => {
    grouped[activity.objectiveId] ||= [];
    grouped[activity.objectiveId].push(activity);
  });
  return grouped;
}

export class InMemoryObjectivesActivitiesRepository implements ObjectivesActivitiesRepository {
  async listObjectives(microregionId?: string): Promise<ObjectiveRecord[]> {
    return [...inMemoryObjectives.values()].filter(
      (item) => !microregionId || microregionId === 'all' || item.microregionId === microregionId
    );
  }

  async listActivities(microregionId?: string): Promise<Record<number, ActivityRecord[]>> {
    return groupActivities(
      [...inMemoryActivities.values()].filter(
        (item) => !microregionId || microregionId === 'all' || item.microregionId === microregionId
      )
    );
  }

  async getObjectiveById(id: number): Promise<ObjectiveRecord | null> {
    return inMemoryObjectives.get(id) || null;
  }

  async getActivityById(id: string): Promise<ActivityRecord | null> {
    return inMemoryActivities.get(id) || null;
  }

  async createObjective(input: CreateObjectiveInput): Promise<ObjectiveRecord> {
    const nextId = Math.max(0, ...inMemoryObjectives.keys()) + 1;
    const item: ObjectiveRecord = {
      id: nextId,
      title: input.title,
      status: 'on-track',
      microregionId: input.microregionId,
    };
    inMemoryObjectives.set(nextId, item);
    return item;
  }

  async updateObjective(id: number, updates: UpdateObjectiveInput): Promise<void> {
    const current = inMemoryObjectives.get(id);
    if (!current) {
      throw new Error('NOT_FOUND');
    }
    inMemoryObjectives.set(id, { ...current, ...updates });
  }

  async deleteObjective(id: number): Promise<void> {
    inMemoryObjectives.delete(id);
    for (const [activityId, activity] of inMemoryActivities.entries()) {
      if (activity.objectiveId === id) {
        inMemoryActivities.delete(activityId);
      }
    }
  }

  async createActivity(input: CreateActivityInput): Promise<ActivityRecord> {
    const item: ActivityRecord = {
      id: input.id,
      objectiveId: input.objectiveId,
      title: input.title,
      description: input.description || '',
      microregionId: input.microregionId,
    };
    inMemoryActivities.set(item.id, item);
    return item;
  }

  async updateActivity(id: string, updates: UpdateActivityInput): Promise<void> {
    const current = inMemoryActivities.get(id);
    if (!current) {
      throw new Error('NOT_FOUND');
    }
    inMemoryActivities.set(id, {
      ...current,
      ...updates,
      description: updates.description ?? current.description,
    });
  }

  async deleteActivity(id: string): Promise<void> {
    inMemoryActivities.delete(id);
  }

  async updateActionActivityId(_uid: string, _newActivityId: string): Promise<void> {}
}
