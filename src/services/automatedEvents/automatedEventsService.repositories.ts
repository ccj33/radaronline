import { getPlatformClient } from '../platformClient';
import type {
  AutomatedEventRow,
} from './automatedEventsService.types';

const platformClient = getPlatformClient;

export async function listAutomatedEventRows(
  limit: number,
  options?: { types?: string[]; microNames?: string[] }
): Promise<AutomatedEventRow[]> {
  let query = platformClient()
    .from('automated_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options?.types && options.types.length > 0) {
    query = query.in('type', options.types);
  }

  if (options?.microNames && options.microNames.length > 0) {
    query = query.in('municipality', options.microNames);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data as AutomatedEventRow[] | null) || [];
}

export async function toggleAutomatedEventActiveRecord(id: string, isActive: boolean): Promise<void> {
  const { error } = await platformClient()
    .from('automated_events')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function insertAutomatedEventRecord(
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await platformClient()
    .from('automated_events')
    .insert(payload);

  if (error) {
    throw error;
  }
}

export async function deleteAutomatedEventRecord(id: string): Promise<void> {
  const { error } = await platformClient()
    .from('automated_events')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}
