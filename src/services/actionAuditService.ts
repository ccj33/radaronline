import type { Action } from '../types';
import { logError } from '../lib/logger';
import { getPlatformClient } from './platformClient';
import { getCurrentUserId } from './sessionService';

type ActionAuditType = 'action_viewed' | 'action_created' | 'action_updated' | 'action_deleted';
export type AdminActivityType = 'login' | ActionAuditType;

type ActionAuditPayload = Pick<Action, 'uid' | 'id' | 'activityId' | 'microregiaoId' | 'title'>;

const platformClient = getPlatformClient;
const ACTION_AUDIT_WITH_USER_SELECT = `
  id,
  user_id,
  action_type,
  entity_type,
  entity_id,
  metadata,
  created_at,
  user:profiles (
    nome,
    role,
    avatar_id,
    microregiao_id
  )
`;

export interface ActionAuditLog {
  id: string;
  user_id: string;
  action_type: AdminActivityType;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user?: ActionAuditUser;
}

interface ActionAuditUser {
  nome: string;
  role: string;
  avatar_id?: string | null;
  microregiao_id?: string | null;
}

interface RawActionAuditLog extends Omit<ActionAuditLog, 'action_type' | 'user'> {
  action_type: string;
  user?: ActionAuditUser | ActionAuditUser[];
}

const ACTION_AUDIT_TYPES: AdminActivityType[] = [
  'login',
  'action_viewed',
  'action_created',
  'action_updated',
  'action_deleted',
];

function isActionAuditType(value: string): value is AdminActivityType {
  return ACTION_AUDIT_TYPES.includes(value as AdminActivityType);
}

function isActionAuditRow(
  row: RawActionAuditLog
): row is RawActionAuditLog & { action_type: AdminActivityType } {
  return isActionAuditType(row.action_type);
}

async function listRawActionLogsWithUser(limit: number): Promise<RawActionAuditLog[]> {
  const { data, error } = await platformClient()
    .from('activity_logs')
    .select(ACTION_AUDIT_WITH_USER_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data as unknown as RawActionAuditLog[] | null) || [];
}

async function listRawActionLogsWithoutUser(limit: number): Promise<RawActionAuditLog[]> {
  const { data, error } = await platformClient()
    .from('activity_logs')
    .select('id, user_id, action_type, entity_type, entity_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data as unknown as RawActionAuditLog[] | null) || [];
}

function normalizeActionAuditRows(rows: RawActionAuditLog[]): ActionAuditLog[] {
  return rows
    .filter(isActionAuditRow)
    .map((row) => ({
      ...row,
      action_type: row.action_type,
      user: Array.isArray(row.user) ? row.user[0] : row.user,
    }));
}

export async function recordActionAuditEvent(args: {
  type: ActionAuditType;
  action: ActionAuditPayload;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return;
    }

    const { error } = await platformClient().from('activity_logs').insert({
      user_id: userId,
      action_type: args.type,
      entity_type: 'action',
      entity_id: args.action.uid,
      metadata: {
        action_uid: args.action.uid,
        action_id: args.action.id,
        activity_id: args.action.activityId,
        microregiao_id: args.action.microregiaoId,
        title: args.action.title,
        ...args.metadata,
        timestamp: new Date().toISOString(),
      },
    });

    if (error) {
      throw new Error(error.message || 'Falha ao registrar auditoria de acao');
    }
  } catch (error) {
    logError('actionAuditService', 'Erro ao registrar auditoria de acao', error);
  }
}

export async function recordLoginAuditEvent(args: {
  userId: string;
  userName?: string | null;
  microregiaoId?: string | null;
}): Promise<void> {
  try {
    if (!args.userId) {
      return;
    }

    const { error } = await platformClient().from('activity_logs').insert({
      user_id: args.userId,
      action_type: 'login',
      entity_type: 'auth',
      entity_id: args.userId,
      metadata: {
        created_by_name: args.userName || undefined,
        microregiao_id: args.microregiaoId || undefined,
        timestamp: new Date().toISOString(),
      },
    });

    if (error) {
      throw new Error(error.message || 'Falha ao registrar login');
    }
  } catch (error) {
    logError('actionAuditService', 'Erro ao registrar login', error);
  }
}

export async function fetchActionAuditEvents(limit = 100): Promise<ActionAuditLog[]> {
  try {
    try {
      return normalizeActionAuditRows(await listRawActionLogsWithUser(limit));
    } catch (error) {
      logError('actionAuditService', 'Erro ao carregar auditoria de acoes com join', error);
      return normalizeActionAuditRows(await listRawActionLogsWithoutUser(limit));
    }
  } catch (error) {
    logError('actionAuditService', 'Erro ao carregar auditoria de acoes', error);
    return [];
  }
}
