
import { logError } from '../lib/logger';
import {
  buildAutomatedEventInsertPayload,
  mapAutomatedEventRow,
} from './automatedEvents/automatedEventsService.helpers';
import {
  deleteAutomatedEventRecord,
  insertAutomatedEventRecord,
  listAutomatedEventRows,
  toggleAutomatedEventActiveRecord,
} from './automatedEvents/automatedEventsService.repositories';
export type {
  AutomatedEventType,
  AutomatedEvent,
} from './automatedEvents/automatedEventsService.types';
import type { AutomatedEvent, RecordAutomatedEventInput } from './automatedEvents/automatedEventsService.types';
import type { MuralConfig } from './automatedEvents/muralConfig.types';

export async function loadAutomatedEvents(
  limit: number = 6,
  config?: MuralConfig,
  adminView: boolean = false
): Promise<AutomatedEvent[]> {
  try {
    const options: { types?: string[]; microNames?: string[] } = {};

    if (config?.enabledTypes && config.enabledTypes.length > 0) {
      options.types = config.enabledTypes;
    }

    if (config?.microScope === 'specific' && config.microNames.length > 0) {
      options.microNames = config.microNames;
    }

    const events = (await listAutomatedEventRows(limit, options)).map((row) => mapAutomatedEventRow(row));
    // For public view, only show events that are active (is_active column may not exist yet → treated as active)
    return adminView ? events : events.filter((e) => e.isActive);
  } catch (error) {
    logError('automatedEventsService', 'Erro ao carregar eventos automaticos', error);
    return [];
  }
}

export async function toggleAutomatedEventActive(id: string, isActive: boolean): Promise<void> {
  try {
    await toggleAutomatedEventActiveRecord(id, isActive);
  } catch (error) {
    logError('automatedEventsService', 'Falha ao alterar status do evento automatico', error);
    throw error;
  }
}

export async function deleteAutomatedEvent(id: string): Promise<void> {
  try {
    await deleteAutomatedEventRecord(id);
  } catch (error) {
    logError('automatedEventsService', 'Falha ao excluir evento automatico', error);
  }
}

export async function recordAutomatedEvent(
  event: RecordAutomatedEventInput
): Promise<void> {
  try {
    await insertAutomatedEventRecord(buildAutomatedEventInsertPayload(event));
  } catch (error) {
    logError('automatedEventsService', 'Falha ao registrar evento automatico', error);
  }
}





