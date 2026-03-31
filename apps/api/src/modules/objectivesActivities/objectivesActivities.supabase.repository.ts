import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminClient } from '../../shared/persistence/supabase-admin.js';
import type { ObjectivesActivitiesRepository } from './objectivesActivities.repository.js';
import type {
  ActivityRecord,
  CreateActivityInput,
  CreateObjectiveInput,
  ObjectiveRecord,
  UpdateActivityInput,
  UpdateObjectiveInput,
} from './objectivesActivities.types.js';

type ObjectiveRow = {
  id: number;
  title: string;
  status: string;
  microregiao_id: string;
  eixo?: number;
  description?: string | null;
  eixo_label?: string | null;
  eixo_color?: string | null;
};

type ActivityRow = {
  id: string;
  objective_id: number;
  title: string;
  description: string | null;
  microregiao_id: string;
};

function mapObjective(row: ObjectiveRow): ObjectiveRecord {
  return {
    id: row.id,
    title: row.title,
    status: row.status === 'delayed' ? 'delayed' : 'on-track',
    microregionId: row.microregiao_id,
    eixo: row.eixo,
    description: row.description || undefined,
    eixoLabel: row.eixo_label || undefined,
    eixoColor: row.eixo_color || undefined,
  };
}

function mapActivity(row: ActivityRow): ActivityRecord {
  return {
    id: row.id,
    objectiveId: row.objective_id,
    title: row.title,
    description: row.description || '',
    microregionId: row.microregiao_id,
  };
}

function groupActivities(rows: ActivityRecord[]): Record<number, ActivityRecord[]> {
  const grouped: Record<number, ActivityRecord[]> = {};
  rows.forEach((row) => {
    grouped[row.objectiveId] ||= [];
    grouped[row.objectiveId].push(row);
  });
  return grouped;
}

function buildObjectiveUpdatePayload(updates: UpdateObjectiveInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.eixo !== undefined) payload.eixo = updates.eixo;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.eixoLabel !== undefined) payload.eixo_label = updates.eixoLabel;
  if (updates.eixoColor !== undefined) payload.eixo_color = updates.eixoColor;
  return payload;
}

export class SupabaseObjectivesActivitiesRepository implements ObjectivesActivitiesRepository {
  constructor(private readonly client: SupabaseClient = getSupabaseAdminClient()) {}

  async listObjectives(microregionId?: string): Promise<ObjectiveRecord[]> {
    let query = this.client
      .from('objectives')
      .select('id, title, status, microregiao_id, eixo, description, eixo_label, eixo_color')
      .order('id', { ascending: true });

    if (microregionId && microregionId !== 'all') {
      query = query.eq('microregiao_id', microregionId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message || 'Failed to load objectives');
    }

    return ((data as ObjectiveRow[] | null) || []).map(mapObjective);
  }

  async listActivities(microregionId?: string): Promise<Record<number, ActivityRecord[]>> {
    let query = this.client
      .from('activities')
      .select('id, objective_id, title, description, microregiao_id')
      .order('id', { ascending: true });

    if (microregionId && microregionId !== 'all') {
      query = query.eq('microregiao_id', microregionId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message || 'Failed to load activities');
    }

    return groupActivities(((data as ActivityRow[] | null) || []).map(mapActivity));
  }

  async getObjectiveById(id: number): Promise<ObjectiveRecord | null> {
    const { data, error } = await this.client
      .from('objectives')
      .select('id, title, status, microregiao_id, eixo, description, eixo_label, eixo_color')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Failed to load objective');
    }

    return data ? mapObjective(data as ObjectiveRow) : null;
  }

  async getActivityById(id: string): Promise<ActivityRecord | null> {
    const { data, error } = await this.client
      .from('activities')
      .select('id, objective_id, title, description, microregiao_id')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Failed to load activity');
    }

    return data ? mapActivity(data as ActivityRow) : null;
  }

  async createObjective(input: CreateObjectiveInput): Promise<ObjectiveRecord> {
    const { data, error } = await this.client
      .from('objectives')
      .insert({
        title: input.title,
        status: 'on-track',
        microregiao_id: input.microregionId,
      })
      .select('id, title, status, microregiao_id, eixo, description, eixo_label, eixo_color')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create objective');
    }

    return mapObjective(data as ObjectiveRow);
  }

  async updateObjective(id: number, updates: UpdateObjectiveInput): Promise<void> {
    const { error } = await this.client
      .from('objectives')
      .update(buildObjectiveUpdatePayload(updates))
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Failed to update objective');
    }
  }

  async deleteObjective(id: number): Promise<void> {
    const { error } = await this.client.from('objectives').delete().eq('id', id);
    if (error) {
      throw new Error(error.message || 'Failed to delete objective');
    }
  }

  async createActivity(input: CreateActivityInput): Promise<ActivityRecord> {
    const { data, error } = await this.client
      .from('activities')
      .insert({
        id: input.id,
        objective_id: input.objectiveId,
        title: input.title,
        description: input.description || '',
        microregiao_id: input.microregionId,
      })
      .select('id, objective_id, title, description, microregiao_id')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create activity');
    }

    return mapActivity(data as ActivityRow);
  }

  async updateActivity(id: string, updates: UpdateActivityInput): Promise<void> {
    const { error } = await this.client.from('activities').update(updates).eq('id', id);
    if (error) {
      throw new Error(error.message || 'Failed to update activity');
    }
  }

  async deleteActivity(id: string): Promise<void> {
    const { error } = await this.client.from('activities').delete().eq('id', id);
    if (error) {
      throw new Error(error.message || 'Failed to delete activity');
    }
  }

  async updateActionActivityId(uid: string, newActivityId: string): Promise<void> {
    const { error } = await this.client
      .from('actions')
      .update({ activity_id: newActivityId })
      .eq('uid', uid);

    if (error) {
      throw new Error(error.message || 'Failed to update action activity');
    }
  }
}
