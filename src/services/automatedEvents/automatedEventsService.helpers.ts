import type {
  AutomatedEvent,
  AutomatedEventRow,
  RecordAutomatedEventInput,
} from './automatedEventsService.types';

export function timeSince(date: Date, now: Date = new Date()): string {
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const days = Math.floor(seconds / 86400);
  if (days >= 7) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 semana atras' : `${weeks} semanas atras`;
  }
  if (days >= 1) {
    return days === 1 ? '1 dia atras' : `${days} dias atras`;
  }

  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) {
    return `${hours}h atras`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes >= 1) {
    return `${minutes}min atras`;
  }

  return 'agora mesmo';
}

export function mapAutomatedEventRow(row: AutomatedEventRow, now: Date = new Date()): AutomatedEvent {
  return {
    id: row.id,
    type: row.type,
    municipality: row.municipality,
    title: row.title,
    details: row.details || undefined,
    imageGradient: row.image_gradient,
    likes: row.likes,
    footerContext: row.footer_context || undefined,
    timestamp: timeSince(new Date(row.created_at), now),
    created_at: row.created_at,
    isActive: row.is_active !== false, // null = column doesn't exist yet, treat as active
  };
}

export function buildAutomatedEventInsertPayload(
  event: RecordAutomatedEventInput
): Record<string, unknown> {
  return {
    type: event.type,
    municipality: event.municipality,
    title: event.title,
    details: event.details,
    image_gradient: event.imageGradient,
    footer_context: event.footerContext,
    is_active: true,
  };
}
