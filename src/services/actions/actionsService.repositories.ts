import { MICROREGIOES } from '../../data/microregioes';
import type { ActionTag, RaciMember } from '../../types';
import { getPlatformClient } from '../platformClient';
import type {
  ActionCommentDTO,
  ActionDTO,
  ActionRaciDTO,
  LoadedActionRow,
} from './actionsService.types';

const platformClient = getPlatformClient;

const ACTION_LIST_SELECT = `
  id, uid, action_id, activity_id, microregiao_id, title, status, start_date, planned_end_date, end_date, progress, notes,
  raci:action_raci(id, created_at, action_id, member_name, role),
  comments:action_comments(count),
  tags:action_tag_assignments(
    action_uid,
    tag:action_tags (id, name, color)
  )
`;

const ACTION_COMMENTS_SELECT = `
  *,
  author:profiles(nome, microregiao_id, avatar_id, role, municipio)
`;

const ACTION_BASE_SELECT =
  'id, uid, action_id, activity_id, microregiao_id, title, status, start_date, planned_end_date, end_date, progress, notes';

export async function listActionRows(microregiaoId?: string): Promise<LoadedActionRow[]> {
  let query = platformClient().from('actions').select(ACTION_LIST_SELECT).order('action_id', {
    ascending: true,
  });

  if (microregiaoId && microregiaoId !== 'all') {
    query = query.eq('microregiao_id', microregiaoId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Falha ao carregar acoes');
  }

  return (data as unknown as LoadedActionRow[] | null) || [];
}

export async function insertActionRecord(input: {
  uid: string;
  actionId: string;
  activityId: string;
  microregiaoId: string;
  title: string;
  status: string;
  progress: number;
  notes: string;
  createdBy: string;
  startDate?: string;
  plannedEndDate?: string;
  endDate?: string;
}): Promise<ActionDTO> {
  const { data, error } = await platformClient()
    .from('actions')
    .insert({
      uid: input.uid,
      action_id: input.actionId,
      activity_id: input.activityId,
      microregiao_id: input.microregiaoId,
      title: input.title,
      status: input.status,
      start_date: input.startDate || null,
      planned_end_date: input.plannedEndDate || null,
      end_date: input.endDate || null,
      progress: input.progress,
      notes: input.notes,
      created_by: input.createdBy,
    })
    .select(ACTION_BASE_SELECT)
    .single();

  if (error) {
    throw new Error(error.message || 'Falha ao criar acao');
  }

  return data as unknown as ActionDTO;
}

export async function updateActionRecord(
  uid: string,
  updates: Record<string, unknown>
): Promise<ActionDTO | null> {
  const { data, error } = await platformClient()
    .from('actions')
    .update(updates)
    .eq('uid', uid)
    .select(ACTION_BASE_SELECT);

  const updatedRecord = data?.[0];

  if (error) {
    throw new Error(error.message || 'Falha ao atualizar acao');
  }

  return (updatedRecord as unknown as ActionDTO | undefined) || null;
}

export async function findActionRecordIdByUid(uid: string): Promise<string | null> {
  const { data, error } = await platformClient().from('actions').select('id').eq('uid', uid).maybeSingle();

  if (error) {
    throw new Error(error.message || 'Falha ao localizar acao');
  }

  return data?.id || null;
}

export async function deleteActionRecord(uid: string): Promise<void> {
  const { error } = await platformClient().from('actions').delete().eq('uid', uid);

  if (error) {
    throw new Error(error.message || 'Falha ao excluir acao');
  }
}

export async function fetchActionRaci(actionDbId: string): Promise<ActionRaciDTO[]> {
  const { data, error } = await platformClient()
    .from('action_raci')
    .select('*')
    .eq('action_id', actionDbId);

  if (error) {
    throw new Error(error.message || 'Falha ao carregar RACI');
  }

  return (data as unknown as ActionRaciDTO[] | null) || [];
}

export async function fetchActionComments(actionDbId: string): Promise<ActionCommentDTO[]> {
  const { data, error } = await platformClient()
    .from('action_comments')
    .select(ACTION_COMMENTS_SELECT)
    .eq('action_id', actionDbId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Falha ao carregar comentarios');
  }

  return (data as unknown as ActionCommentDTO[] | null) || [];
}

export async function fetchMicroregiaoName(microregiaoId: string): Promise<string | null> {
  const { data, error } = await platformClient()
    .from('microregioes')
    .select('nome')
    .eq('id', microregiaoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Falha ao carregar microrregiao');
  }

  return data?.nome || MICROREGIOES.find((m) => m.id === microregiaoId)?.nome || null;
}

export async function syncActionRaci(actionDbId: string, raciMembers: RaciMember[]): Promise<void> {
  const { data: currentRaci, error: fetchError } = await platformClient()
    .from('action_raci')
    .select('id, member_name')
    .eq('action_id', actionDbId);

  if (fetchError) {
    throw new Error(fetchError.message || 'Falha ao carregar RACI atual');
  }

  const currentMembers = currentRaci || [];
  const currentNames = new Set(currentMembers.map((item) => item.member_name));
  const nextNames = new Set(raciMembers.map((item) => item.name));

  const toAdd = raciMembers.filter((item) => !currentNames.has(item.name));
  if (toAdd.length > 0) {
    const { error: insertError } = await platformClient().from('action_raci').insert(
      toAdd.map((item) => ({
        action_id: actionDbId,
        member_name: item.name,
        role: item.role,
      }))
    );

    if (insertError) {
      throw new Error(insertError.message || 'Falha ao inserir membros RACI');
    }
  }

  const toRemove = currentMembers.filter((item) => !nextNames.has(item.member_name));
  if (toRemove.length > 0) {
    const { error: deleteError } = await platformClient()
      .from('action_raci')
      .delete()
      .in('id', toRemove.map((item) => item.id));

    if (deleteError) {
      throw new Error(deleteError.message || 'Falha ao remover membros RACI');
    }
  }
}

export async function syncActionTags(
  actionDbId: string,
  actionUid: string,
  tags: ActionTag[]
): Promise<void> {
  const { data: currentAssignments, error: fetchError } = await platformClient()
    .from('action_tag_assignments')
    .select('id, tag_id')
    .eq('action_uid', actionUid);

  if (fetchError) {
    throw new Error(fetchError.message || 'Falha ao carregar tags atuais');
  }

  const currentTagIds = new Set((currentAssignments || []).map((item) => item.tag_id));
  const nextTagIds = new Set(tags.map((item) => item.id));

  const toAdd = tags.filter((item) => !currentTagIds.has(item.id));
  if (toAdd.length > 0) {
    const { error: insertError } = await platformClient()
      .from('action_tag_assignments')
      .insert(
        toAdd.map((item) => ({
          action_uid: actionUid,
          action_id: actionDbId,
          tag_id: item.id,
        }))
      );

    if (insertError && !insertError.message.includes('duplicate')) {
      throw new Error(insertError.message || 'Falha ao associar tags');
    }
  }

  const toRemove = (currentAssignments || []).filter((item) => !nextTagIds.has(item.tag_id));
  if (toRemove.length > 0) {
    const { error: deleteError } = await platformClient()
      .from('action_tag_assignments')
      .delete()
      .in('id', toRemove.map((item) => item.id));

    if (deleteError) {
      throw new Error(deleteError.message || 'Falha ao remover tags');
    }
  }
}

export async function insertActionRaciMember(input: {
  actionDbId: string;
  memberName: string;
  role: 'R' | 'A' | 'C' | 'I';
}): Promise<ActionRaciDTO> {
  const { data, error } = await platformClient()
    .from('action_raci')
    .insert({
      action_id: input.actionDbId,
      member_name: input.memberName,
      role: input.role,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Falha ao inserir membro RACI');
  }

  return data as unknown as ActionRaciDTO;
}

export async function removeActionRaciMember(actionDbId: string, memberName: string): Promise<void> {
  const { error } = await platformClient()
    .from('action_raci')
    .delete()
    .eq('action_id', actionDbId)
    .eq('member_name', memberName);

  if (error) {
    throw new Error(error.message || 'Falha ao remover membro RACI');
  }
}
