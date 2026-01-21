import { supabase } from '../lib/supabase';
import type { Action, ActionComment, TeamMember, RaciMember, ActionTag } from '../types';
import { generateActionUid } from '../types';
import { loggingService } from './loggingService';
import { log, logWarn, logError } from '../lib/logger';
import type { Announcement } from '../types/announcement.types';

// =====================================
// TIPOS PARA O BANCO DE DADOS
// =====================================

interface ActionDTO {
    id: string;
    uid: string;
    action_id: string;
    activity_id: string;
    microregiao_id: string;
    title: string;
    status: string;
    start_date: string | null;
    planned_end_date: string | null;
    end_date: string | null;
    progress: number;
    notes: string;
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

interface ActionRaciDTO {
    id: string;
    action_id: string;
    member_name: string;
    role: string;
    created_at: string;
}

interface ActionCommentDTO {
    id: string;
    action_id: string;
    author_id: string;
    parent_id: string | null;
    content: string;
    created_at: string;
    // Joined from profiles
    author?: {
        nome: string;
        microregiao_id: string | null;
        avatar_id: string | null;
        role: string | null;
        municipio: string | null;
    };
}

interface TeamDTO {
    id: string;
    microregiao_id: string;
    name: string;
    cargo: string;  // Renomeado de 'role' para evitar conflito com profiles.role
    email: string | null;
    municipio: string | null;
    profile_id: string | null;  // Novo: vincula ao profile quando cadastrado
    created_at: string;
    updated_at: string;
}

interface ActionTagDTO {
    id: string;
    name: string;
    color: string;
    created_at: string;
    created_by: string | null;
}



// =====================================
// HELPERS DE CONVERSÃO
// =====================================

function mapActionDTOToAction(
    dto: ActionDTO,
    raci: ActionRaciDTO[],
    comments: ActionCommentDTO[],
    tags: ActionTagDTO[] = [],
    commentCount: number = 0
): Action {
    return {
        uid: dto.uid,
        id: dto.action_id,
        activityId: dto.activity_id,
        microregiaoId: dto.microregiao_id,
        title: dto.title,
        status: dto.status as Action['status'],
        startDate: dto.start_date || '',
        plannedEndDate: dto.planned_end_date || '',
        endDate: dto.end_date || '',
        progress: dto.progress,
        raci: raci.map(r => ({
            name: r.member_name,
            role: r.role as RaciMember['role'],
        })),
        tags: tags.map(t => ({
            id: t.id,
            name: t.name,
            color: t.color,
        })),
        notes: dto.notes || '',
        comments: comments.map(c => {
            const author = Array.isArray(c.author) ? c.author[0] : c.author;
            return {
                id: c.id,
                parentId: c.parent_id || null,
                authorId: c.author_id,
                authorName: author?.nome || 'Usuário',
                authorMunicipio: author?.municipio || author?.microregiao_id || '',
                authorAvatarId: author?.avatar_id || 'zg10',
                authorRole: author?.role || undefined,
                content: c.content,
                createdAt: c.created_at,
            };
        }),
        commentCount: commentCount || comments.length,
    };
}

function mapTeamDTOToTeamMember(dto: TeamDTO): TeamMember {
    return {
        id: dto.id, // Manter UUID original do banco
        name: dto.name,
        role: dto.cargo,  // Mapeia 'cargo' do DB para 'role' do frontend
        email: dto.email || '',
        municipio: dto.municipio || '',
        microregiaoId: dto.microregiao_id,
        isRegistered: !!dto.profile_id,  // Usa profile_id para determinar se está cadastrado
    };
}

// =====================================
// AÇÕES - CRUD
// =====================================

/**
 * Carrega ações do Supabase
 * @param microregiaoId - Se fornecido, filtra por microrregião. Se 'all' ou vazio, retorna todas.
 */
export async function loadActions(microregiaoId?: string): Promise<Action[]> {
    try {
        // Buscar ações com dados relacionados em UMA única query (JOINs)
        let query = supabase
            .from('actions')
            .select(`
                id, uid, action_id, activity_id, microregiao_id, title, status, start_date, planned_end_date, end_date, progress, notes,
                raci:action_raci(id, created_at, action_id, member_name, role),
                comments:action_comments(count),
                tags:action_tag_assignments(
                    action_uid,
                    tag:action_tags (id, name, color)
                )
            `)
            .order('action_id', { ascending: true });

        if (microregiaoId && microregiaoId !== 'all') {
            query = query.eq('microregiao_id', microregiaoId);
        }

        const { data, error } = await query;

        if (error) {
            logError('dataService', 'Erro ao carregar ações:', error);
            throw new Error(`Erro ao carregar ações: ${error.message}`);
        }

        if (!data || data.length === 0) {
            return [];
        }

        // Mapear para formato da aplicação
        return data.map((item: any) => {
            // Extrair tags do formato aninhado do join
            const tags = item.tags?.map((t: any) => t.tag).filter(Boolean) || [];

            // Extrair count de comentários (formato [{count: N}])
            const commentCount = (item.comments && item.comments[0] && item.comments[0].count) || 0;

            return mapActionDTOToAction(
                item as ActionDTO,
                (item.raci || []) as ActionRaciDTO[],
                [], // Não carregamos comentários na lista inicial
                tags as ActionTagDTO[],
                commentCount
            );
        });
    } catch (error) {
        logError('dataService', 'Erro inesperado ao carregar ações:', error);
        throw error;
    }
}

/**
 * Carrega APENAS os comentários de uma ação específica
 */
export async function loadActionComments(actionUid: string): Promise<ActionComment[]> {
    try {
        // Encontrar o action_id (UUID) a partir do UID
        const { data: actionData, error: actionError } = await supabase
            .from('actions')
            .select('id')
            .eq('uid', actionUid)
            .single();

        if (actionError || !actionData) {
            // Se falhar silenciosamente retorna vazio, ou loga erro
            logWarn('dataService', 'Ação não encontrada ao carregar comentários:', actionUid);
            return [];
        }

        const { data, error } = await supabase
            .from('action_comments')
            .select(`
                id, action_id, author_id, parent_id, content, created_at,
                author:profiles(nome, microregiao_id, avatar_id, role, municipio)
            `)
            .eq('action_id', actionData.id)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return (data || []).map((c: any) => {
            const author = Array.isArray(c.author) ? c.author[0] : c.author;
            return {
                id: c.id,
                parentId: c.parent_id || null,
                authorId: c.author_id,
                authorName: author?.nome || 'Usuário',
                authorMunicipio: author?.municipio || author?.microregiao_id || '',
                authorAvatarId: author?.avatar_id || 'zg10',
                authorRole: author?.role || undefined,
                content: c.content,
                createdAt: c.created_at,
                replies: []
            };
        });
    } catch (error) {
        logError('dataService', 'Erro ao carregar comentários:', error);
        return [];
    }
}

/**
 * Cria uma nova ação
 */
export async function createAction(input: {
    microregiaoId: string;
    activityId: string;
    actionNumber: number;
    title?: string;
}): Promise<Action> {
    try {
        const actionId = `${input.activityId}.${input.actionNumber}`;
        const uid = generateActionUid(input.microregiaoId, actionId);

        // Verificar usuário atual
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('actions')
            .insert({
                uid,
                action_id: actionId,
                activity_id: input.activityId,
                microregiao_id: input.microregiaoId,
                title: input.title || 'Nova Ação',
                status: 'Não Iniciado',
                progress: 0,
                notes: '',
                created_by: user?.id || null,
            })
            .select()
            .single();

        if (error) {
            logError('dataService', 'Erro ao criar ação:', error);
            throw new Error(`Erro ao criar ação: ${error.message}`);
        }

        const newAction = mapActionDTOToAction(data as ActionDTO, [], []);

        // ✅ LOG ACTIVITY
        loggingService.logActivity('action_created', 'action', newAction.id, {  // Using DB ID for entity_id to match FK, but UI uses UID. Let's use ID logic consistent with auth (user ID). Action ID is UUID? 'actions' table PK is UUID. 'uid' is string (A-001). 
            // DataService types say: 'id: string' (UUID) and 'uid: string' (Display ID).
            // ActivityLog entity_id is string.
            // Let's use the DB ID (UUID) for entity_id, and put UID in metadata.
            title: newAction.title,
            displayId: newAction.uid,
            microregiaoId: newAction.microregiaoId
        });

        return newAction;
    } catch (error) {
        logError('dataService', 'Erro inesperado ao criar ação:', error);
        throw error;
    }
}

/**
 * Atualiza uma ação existente
 */
export async function updateAction(
    uid: string,
    updates: Partial<Omit<Action, 'uid' | 'id' | 'activityId' | 'microregiaoId' | 'comments' | 'raci'>>
): Promise<Action> {
    try {
        // Converter camelCase para snake_case
        const updateData: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.startDate !== undefined) updateData.start_date = updates.startDate || null;
        if (updates.plannedEndDate !== undefined) updateData.planned_end_date = updates.plannedEndDate || null;
        if (updates.endDate !== undefined) updateData.end_date = updates.endDate || null;
        if (updates.progress !== undefined) updateData.progress = updates.progress;
        if (updates.notes !== undefined) updateData.notes = updates.notes;

        const { data, error } = await supabase
            .from('actions')
            .update(updateData)
            .eq('uid', uid)
            .select();

        // data é um array aqui
        const updatedRecord = data?.[0];

        if (error || !updatedRecord) {
            logError('dataService', 'Erro ao atualizar ação:', error);
            throw new Error(`Erro ao atualizar ação: ${error?.message || 'Ação não encontrada'}`);
        }

        // Usar updatedRecord para o resto
        const actionId = updatedRecord.id;


        // Buscar RACI e comentários atualizados
        const { data: raciData } = await supabase
            .from('action_raci')
            .select('*')
            .eq('action_id', actionId);

        const { data: commentsData } = await supabase
            .from('action_comments')
            .select(`
        *,
        author:profiles(nome, microregiao_id, avatar_id, role)
      `)
            .eq('action_id', actionId)
            .order('created_at', { ascending: true });

        const updatedAction = mapActionDTOToAction(
            updatedRecord as ActionDTO,
            (raciData || []) as ActionRaciDTO[],
            (commentsData || []) as ActionCommentDTO[]
        );

        // ✅ LOG ACTIVITY
        loggingService.logActivity('action_updated', 'action', actionId, {
            changes: Object.keys(updates),
            displayId: uid
        });

        // GENERA EVENTO AUTOMÁTICO SE AÇÃO FOI CONCLUÍDA
        if (updates.status === 'Concluído' || updates.progress === 100) {
            // Verifica se a ação JÁ não estava concluída antes (evitar duplicidade)
            // Como só temos o `updates` e o `updatedAction`, assumimos que foi uma mudança de estado agora.
            // Idealmente checaríamos o estado anterior, mas para MVP vamos assumir que se mandou update de status/progress é novo.



            // Buscar nome da micro
            const { data: micro } = await supabase.from('microregioes').select('nome').eq('id', updatedAction.microregiaoId).single();
            const microNome = micro?.nome || updatedAction.microregiaoId;

            await recordAutomatedEvent({
                type: 'plan_completed',
                municipality: microNome,
                title: `${microNome} concluiu a ação: ${updatedAction.title}`,
                details: `Ação estratégica finalizada com sucesso, contribuindo para o plano regional.`,
                imageGradient: 'from-blue-600 to-cyan-500',
                footerContext: 'Marco de Execução'
            });
        }

        return updatedAction;
    } catch (error) {
        logError('dataService', 'Erro inesperado ao atualizar ação:', error);
        throw error;
    }
}

/**
 * Atualiza o activity_id de uma ação (para reordenação/migração)
 */
export async function updateActionActivityId(uid: string, newActivityId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('actions')
            .update({ activity_id: newActivityId })
            .eq('uid', uid);

        if (error) {
            logError('dataService', 'Erro ao atualizar activity_id da ação:', error);
            throw new Error(`Erro ao mover ação: ${error.message}`);
        }
    } catch (error) {
        logError('dataService', 'Erro inesperado ao mover ação:', error);
        throw error;
    }
}

/**
 * Upsert: Cria a ação se não existir, atualiza se existir
 * Usado pelo handleSaveFullAction para garantir persistência
 */
export async function upsertAction(action: Action): Promise<Action> {
    try {
        let actionDbId: string;

        // Primeiro, verificar se a ação existe
        const { data: existing } = await supabase
            .from('actions')
            .select('id')
            .eq('uid', action.uid)
            .maybeSingle();

        if (existing) {
            actionDbId = existing.id;
            // Ação existe, fazer update
            await updateAction(action.uid, {
                title: action.title,
                status: action.status,
                startDate: action.startDate,
                plannedEndDate: action.plannedEndDate,
                endDate: action.endDate,
                progress: action.progress,
                notes: action.notes,
            });
        } else {
            // Ação NÃO existe, criar nova
            log('dataService', 'Ação não existe no banco, criando:', action.uid);

            const { data, error } = await supabase
                .from('actions')
                .insert({
                    uid: action.uid,
                    action_id: action.id,
                    activity_id: action.activityId,
                    microregiao_id: action.microregiaoId,
                    title: action.title,
                    status: action.status,
                    start_date: action.startDate || null,
                    planned_end_date: action.plannedEndDate || null,
                    end_date: action.endDate || null,
                    progress: action.progress,
                    notes: action.notes || '',
                    created_by: (await supabase.auth.getUser()).data.user?.id || null,
                })
                .select()
                .single();

            if (error) {
                logError('dataService', 'Erro ao criar ação via upsert:', error);
                throw new Error(`Erro ao criar ação: ${error.message}`);
            }
            actionDbId = data.id;

            // LOG ACTIVITY
            loggingService.logActivity('action_created', 'action', data.id, {
                title: action.title,
                displayId: action.uid,
                microregiaoId: action.microregiaoId,
                source: 'upsert'
            });
        }

        // ============================================
        // Sincronizar RACI (Criar/Atualizar)
        // ============================================
        // ============================================
        // Sincronizar RACI (FULL SYNC: Add & Remove)
        // ============================================
        if (action.raci) {
            // 1. Buscar membros atuais no banco para essa ação
            const { data: currentRaci, error: fetchRaciError } = await supabase
                .from('action_raci')
                .select('id, member_name')
                .eq('action_id', actionDbId);

            if (fetchRaciError) {
                logError('dataService', 'Erro ao buscar RACI atual:', fetchRaciError);
            } else {
                const currentMembers = currentRaci || [];
                const currentNamesSet = new Set(currentMembers.map(r => r.member_name));
                const newNamesSet = new Set(action.raci.map(r => r.name));

                // A. Adicionar novos (que estão no action.raci mas não no banco)
                const toAdd = action.raci.filter(m => !currentNamesSet.has(m.name));
                if (toAdd.length > 0) {
                    const raciInserts = toAdd.map(m => ({
                        action_id: actionDbId,
                        member_name: m.name,
                        role: m.role
                    }));
                    const { error: insertError } = await supabase
                        .from('action_raci')
                        .insert(raciInserts);

                    if (insertError) logError('dataService', 'Erro ao inserir novos RACI:', insertError);
                }

                // B. Remover excluídos (que estão no banco mas não no action.raci)
                const toRemove = currentMembers.filter(m => !newNamesSet.has(m.member_name));
                if (toRemove.length > 0) {
                    const idsToRemove = toRemove.map(m => m.id);
                    const { error: deleteError } = await supabase
                        .from('action_raci')
                        .delete()
                        .in('id', idsToRemove);

                    if (deleteError) logError('dataService', 'Erro ao remover RACI antigo:', deleteError);
                }
            }
        }

        // ============================================
        // Sincronizar TAGS (FULL SYNC: Add & Remove)
        // ============================================
        if (action.tags) {
            // 1. Buscar assignments atuais
            // Usa action.uid E action_id para garantir compatibilidade
            const { data: currentAssignments, error: fetchTagsError } = await supabase
                .from('action_tag_assignments')
                .select('id, tag_id')
                .eq('action_uid', action.uid); // Pode manter o filtro por UID ou mudar para açãoDbId se preferir

            if (fetchTagsError) {
                logError('dataService', 'Erro ao buscar tags atuais:', fetchTagsError);
            } else {
                const currentTagIds = new Set((currentAssignments || []).map(a => a.tag_id));
                const newTagIds = new Set(action.tags.map(t => t.id));

                // A. Adicionar novas associações
                const toAdd = action.tags.filter(t => !currentTagIds.has(t.id));
                if (toAdd.length > 0) {
                    const tagInserts = toAdd.map(t => ({
                        action_uid: action.uid,
                        action_id: actionDbId, // Adicionando action_id (UUID)
                        tag_id: t.id
                    }));
                    const { error: insertError } = await supabase
                        .from('action_tag_assignments')
                        .insert(tagInserts);

                    if (insertError) logError('dataService', 'Erro ao associar novas tags:', insertError);
                }

                // B. Remover associações antigas
                const toRemove = (currentAssignments || []).filter(a => !newTagIds.has(a.tag_id));
                if (toRemove.length > 0) {
                    const idsToRemove = toRemove.map(a => a.id);
                    const { error: deleteError } = await supabase
                        .from('action_tag_assignments')
                        .delete()
                        .in('id', idsToRemove);

                    if (deleteError) logError('dataService', 'Erro ao remover tags antigas:', deleteError);
                }
            }
        }

        // Retorna a ação atualizada
        return action;

    } catch (error) {
        logError('dataService', 'Erro inesperado ao upsert ação:', error);
        throw error;
    }
}

/**
 * Exclui uma ação (cascade deleta RACI e comentários)
 */
export async function deleteAction(uid: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('actions')
            .delete()
            .eq('uid', uid);

        if (error) {
            logError('dataService', 'Erro ao excluir ação:', error);
            throw new Error(`Erro ao excluir ação: ${error.message}`);
        }

        // ✅ LOG ACTIVITY
        loggingService.logActivity('action_deleted', 'action', uid, {});
    } catch (error) {
        logError('dataService', 'Erro inesperado ao excluir ação:', error);
        throw error;
    }
}

// =====================================
// RACI - CRUD
// =====================================

/**
 * Adiciona membro RACI a uma ação
 */
export async function addRaciMember(
    actionUid: string,
    memberName: string,
    role: 'R' | 'A' | 'C' | 'I'
): Promise<RaciMember> {
    try {
        // Primeiro, buscar o ID da ação pelo UID
        const { data: actionData, error: actionError } = await supabase
            .from('actions')
            .select('id')
            .eq('uid', actionUid)
            .single();

        if (actionError || !actionData) {
            throw new Error('Ação não encontrada');
        }

        const { data, error } = await supabase
            .from('action_raci')
            .insert({
                action_id: actionData.id,
                member_name: memberName,
                role,
            })
            .select()
            .single();

        if (error) {
            logError('dataService', 'Erro ao adicionar membro RACI:', error);
            throw new Error(`Erro ao adicionar membro: ${error.message}`);
        }

        return {
            name: data.member_name,
            role: data.role as RaciMember['role'],
        };
    } catch (error) {
        logError('dataService', 'Erro inesperado ao adicionar membro RACI:', error);
        throw error;
    }
}

/**
 * Remove membro RACI de uma ação
 */
export async function removeRaciMember(
    actionUid: string,
    memberName: string
): Promise<void> {
    try {
        // Primeiro, buscar o ID da ação pelo UID
        const { data: actionData, error: actionError } = await supabase
            .from('actions')
            .select('id')
            .eq('uid', actionUid)
            .single();

        if (actionError || !actionData) {
            throw new Error('Ação não encontrada');
        }

        const { error } = await supabase
            .from('action_raci')
            .delete()
            .eq('action_id', actionData.id)
            .eq('member_name', memberName);

        if (error) {
            logError('dataService', 'Erro ao remover membro RACI:', error);
            throw new Error(`Erro ao remover membro: ${error.message}`);
        }
    } catch (error) {
        logError('dataService', 'Erro inesperado ao remover membro RACI:', error);
        throw error;
    }
}

// =====================================
// COMENTÁRIOS - CRUD
// =====================================

/**
 * Adiciona comentário a uma ação
 * @param parentId - ID do comentário pai (para respostas em thread)
 */
export async function addComment(
    actionUid: string,
    content: string,
    parentId?: string | null
): Promise<ActionComment> {
    try {
        // Buscar usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        // Buscar perfil do usuário para nome, município, avatar e role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('nome, microregiao_id, avatar_id, role, municipio')
            .eq('id', user.id)
            .single();

        if (profileError) {
            logError('dataService', 'Erro ao buscar perfil:', profileError);
        }

        // Buscar ID da ação
        const { data: actionData, error: actionError } = await supabase
            .from('actions')
            .select('id')
            .eq('uid', actionUid)
            .single();

        if (actionError || !actionData) {
            throw new Error('Ação não encontrada');
        }

        const { data, error } = await supabase
            .from('action_comments')
            .insert({
                action_id: actionData.id,
                author_id: user.id,
                parent_id: parentId || null,
                content,
            })
            .select()
            .single();

        if (error) {
            logError('dataService', 'Erro ao adicionar comentário:', error);
            throw new Error(`Erro ao adicionar comentário: ${error.message}`);
        }

        return {
            id: data.id,
            parentId: data.parent_id || null,
            authorId: user.id,
            authorName: profile?.nome || 'Usuário',
            authorMunicipio: profile?.municipio || profile?.microregiao_id || '',
            authorAvatarId: profile?.avatar_id || 'zg10',
            authorRole: profile?.role || undefined,
            content: data.content,
            createdAt: data.created_at,
        };
    } catch (error) {
        logError('dataService', 'Erro inesperado ao adicionar comentário:', error);
        throw error;
    }
}

// Atualizar comentário
export async function updateComment(commentId: string, content: string): Promise<void> {
    const { error } = await supabase
        .from('action_comments')
        .update({ content })
        .eq('id', commentId);

    if (error) {
        logError('dataService', 'Erro ao atualizar comentário:', error);
        throw new Error(`Erro ao atualizar comentário: ${error.message}`);
    }
}

// Excluir comentário
export async function deleteComment(commentId: string): Promise<void> {
    // Primeiro, excluir respostas filhas (se houver)
    const { error: childError } = await supabase
        .from('action_comments')
        .delete()
        .eq('parent_id', commentId);

    if (childError) {
        logError('dataService', 'Erro ao excluir respostas:', childError);
    }

    // Depois, excluir o comentário principal
    const { error } = await supabase
        .from('action_comments')
        .delete()
        .eq('id', commentId);

    if (error) {
        logError('dataService', 'Erro ao excluir comentário:', error);
        throw new Error(`Erro ao excluir comentário: ${error.message}`);
    }
}

// =====================================
// EQUIPES - CRUD
// =====================================

/**
 * Carrega equipes do Supabase
 * @param microregiaoId - Se fornecido, filtra por microrregião
 */
export async function loadTeams(microregiaoId?: string): Promise<Record<string, TeamMember[]>> {
    try {
        const teamsByMicro: Record<string, TeamMember[]> = {};

        // 1. Buscar Perfis (usuários já cadastrados na plataforma)
        let profilesQuery = supabase
            .from('profiles')
            .select('id, nome, email, municipio, microregiao_id, role, avatar_id')
            .eq('ativo', true);

        if (microregiaoId && microregiaoId !== 'all') {
            profilesQuery = profilesQuery.eq('microregiao_id', microregiaoId);
        }

        const { data: profilesData, error: profilesError } = await profilesQuery;

        if (profilesError) {
            logError('dataService', 'Erro ao carregar perfis:', profilesError);
        }
        // 2. Buscar Times Manuais (adicionados pelo gestor)
        let teamQuery = supabase
            .from('teams')
            .select('id, microregiao_id, name, cargo, email, municipio, profile_id, created_at, updated_at')
            .order('name', { ascending: true });

        if (microregiaoId && microregiaoId !== 'all') {
            teamQuery = teamQuery.eq('microregiao_id', microregiaoId);
        }

        const { data: teamsData, error: teamsError } = await teamQuery;

        if (teamsError) {
            logError('dataService', 'Erro ao carregar equipes:', teamsError);
            throw new Error(`Erro ao carregar equipes: ${teamsError.message}`);
        }

        // 3. Processar Perfis (Enriquecendo com dados de times se houver)
        (profilesData || []).forEach((p) => {
            const microId = p.microregiao_id || 'unassigned';
            if (!teamsByMicro[microId]) teamsByMicro[microId] = [];

            // Procurar se existe registro deste email na tabela teams para pegar o município
            const teamRecord = (teamsData || []).find(t => t.email?.toLowerCase() === p.email.toLowerCase());

            teamsByMicro[microId].push({
                id: p.id,
                name: p.nome,
                role: p.role || 'Membro',
                email: p.email,
                municipio: teamRecord?.municipio || p.municipio || 'Sede/Remoto', // Usa do time, ou profile, ou default
                microregiaoId: microId,
                isRegistered: true
            });
        });

        // 4. Mesclar Times Manuais (ignorando os que já foram adicionados via profile)
        (teamsData || []).forEach((dto: TeamDTO) => {
            const existingInMicro = teamsByMicro[dto.microregiao_id] || [];

            // Verificar se já existe alguém com esse email que seja registrado (já processado acima)
            const alreadyExists = dto.email && existingInMicro.some(m =>
                m.isRegistered && m.email.toLowerCase() === dto.email?.toLowerCase()
            );

            if (!alreadyExists) {
                const member = mapTeamDTOToTeamMember(dto);

                // Verificar se o email corresponde a um profile (caso tenha sido adicionado manual mas a pessoa se cadastrou recentemente e loadTeams ainda não pegou ou algo assim)
                // Na lógica atual, o passo 3 já pegaria. Mas mantemos a segurança.
                const linkedProfile = (profilesData || []).find(p => p.email.toLowerCase() === dto.email?.toLowerCase());
                member.isRegistered = !!linkedProfile;

                if (!teamsByMicro[dto.microregiao_id]) {
                    teamsByMicro[dto.microregiao_id] = [];
                }
                teamsByMicro[dto.microregiao_id].push(member);
            }
        });

        return teamsByMicro;
    } catch (error) {
        logError('dataService', 'Erro inesperado ao carregar equipes:', error);
        throw error;
    }
}

/**
 * Verifica se o usuário já tem registro na tabela de times
 */
export async function getUserTeamStatus(email: string): Promise<{ exists: boolean; municipio: string | null }> {
    const { data } = await supabase
        .from('teams')
        .select('municipio')
        .eq('email', email)
        .limit(1);

    const record = data?.[0];

    return {
        exists: !!record,
        municipio: record?.municipio || null
    };
}

/**
 * Salva o município do usuário na tabela de teams E profiles
 * Isso garante que o município seja propagado para todos os lugares
 */
export async function saveUserMunicipality(
    microregiaoId: string,
    email: string,
    municipio: string,
    userName: string
): Promise<void> {
    try {
        // Obter usuário atual para vincular profile_id
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Atualizar tabela profiles (baseado no email)
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ municipio })
            .eq('email', email);

        if (profileError) {
            logError('dataService', 'Erro ao atualizar município no profile:', profileError);
            // Não lança erro para continuar com teams
        }

        // 2. Verificar se já existe registro na tabela teams para este email
        // Busca TODOS registros com este email para tratar duplicatas
        const { data: existingTeams } = await supabase
            .from('teams')
            .select('id')
            .eq('email', email);

        if (existingTeams && existingTeams.length > 0) {
            // Atualizar TODAS as ocorrências para este email
            // Agora também vinculamos o profile_id para garantir acesso via RLS seguro
            const ids = existingTeams.map(t => t.id);
            const updatePayload: any = {
                municipio,
                name: userName
            };

            if (user?.id) {
                updatePayload.profile_id = user.id;
            }

            await supabase
                .from('teams')
                .update(updatePayload)
                .in('id', ids);
        } else {
            // Inserir novo
            await supabase
                .from('teams')
                .insert({
                    microregiao_id: microregiaoId,
                    name: userName,
                    email: email,
                    municipio: municipio,
                    cargo: 'Membro', // Cargo default
                    profile_id: user?.id || null // Vincula ao usuário atual
                });
        }
    } catch (error) {
        logError('dataService', 'Erro ao salvar município do usuário:', error);
        throw error;
    }
}

/**
 * Adiciona membro à equipe
 */
export async function addTeamMember(input: {
    microregiaoId: string;
    name: string;
    role: string;
    email?: string;
    municipio?: string;
}): Promise<TeamMember> {
    try {
        // 1. Inserir na tabela de times
        const { data, error } = await supabase
            .from('teams')
            .insert({
                microregiao_id: input.microregiaoId,
                name: input.name,
                cargo: input.role,  // input.role → cargo no banco
                email: input.email || null,
                municipio: input.municipio || null,
            })
            .select()
            .single();

        if (error) {
            logError('dataService', 'Erro ao adicionar membro:', error);
            throw new Error(`Erro ao adicionar membro: ${error.message}`);
        }

        const newMember = mapTeamDTOToTeamMember(data as TeamDTO);

        // 2. Verificar se o usuário já existe na base de perfis
        if (input.email) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', input.email)
                .single();

            newMember.isRegistered = !!profile;

            // 3. Se NÃO for registrado, notificar administradores
            if (!newMember.isRegistered) {
                await notifyAdminsOfPendingUser(input.name, input.email, input.microregiaoId);
            }
        } else {
            newMember.isRegistered = false;
        }

        // TRIGGER AUTOMATED EVENT: New Team Member
        const microName = await getMicroName(input.microregiaoId);
        await recordAutomatedEvent({
            type: 'new_user',
            municipality: microName,
            title: `${input.name} entrou para a equipe`,
            details: `Novo reforço para a gestão da saúde em ${microName}.`,
            imageGradient: 'from-emerald-600 to-teal-500',
            footerContext: 'Expansão da Rede de Colaboradores'
        });

        return newMember;
    } catch (error) {
        logError('dataService', 'Erro inesperado ao adicionar membro:', error);
        throw error;
    }
}

// Helper para buscar nome da microrregião
async function getMicroName(id: string): Promise<string> {
    const { data } = await supabase.from('microregioes').select('nome').eq('id', id).single();
    return data?.nome || id;
}

/**
 * Helper: Notifica todos os admins sobre usuário pendente
 */
async function notifyAdminsOfPendingUser(name: string, email: string, microId: string) {
    // Buscar IDs de admins
    const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'superadmin']);

    if (!admins || admins.length === 0) return;

    // Criar notificações
    const notifications = admins.map(admin => ({
        user_id: admin.id,
        request_type: 'system',
        content: `Membro pendente de cadastro: ${name} (${email}) na Micro ${microId}. Necessário criar conta.`,
        status: 'pending'
    }));

    await supabase.from('user_requests').insert(notifications);
}



/**
 * Remove membro da equipe
 */
export async function removeTeamMember(memberId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('teams')
            .delete()
            .eq('id', memberId);

        if (error) {
            logError('dataService', 'Erro ao remover membro:', error);
            throw new Error(`Erro ao remover membro: ${error.message}`);
        }
    } catch (error) {
        logError('dataService', 'Erro inesperado ao remover membro:', error);
        throw error;
    }
}

// =====================================
// NOTIFICAÇÕES DE MENÇÃO
// =====================================

/**
 * Cria notificação de menção para um usuário
 * @param mentionedUserName - Nome do usuário mencionado (para buscar o ID)
 * @param actionTitle - Título da ação onde foi mencionado
 * @param authorName - Nome de quem mencionou
 */
export async function createMentionNotification(
    mentionedUserName: string,
    actionTitle: string,
    authorName: string
): Promise<void> {
    try {
        // Buscar o ID do usuário mencionado pelo nome
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .ilike('nome', mentionedUserName);

        if (profileError || !profiles || profiles.length === 0) {
            logWarn('dataService', 'Usuário mencionado não encontrado:', mentionedUserName);
            return; // Não é um erro, apenas não encontrou o usuário
        }

        const mentionedUserId = profiles[0].id;

        // Criar notificação na tabela user_requests
        const { error } = await supabase
            .from('user_requests')
            .insert({
                user_id: mentionedUserId,
                request_type: 'mention',
                content: `${authorName} mencionou você em um comentário na ação "${actionTitle}"`,
                status: 'pending',
            });

        if (error) {
            logError('dataService', 'Erro ao criar notificação de menção:', error);
            // Não lança erro para não interromper o fluxo de adicionar comentário
        }
    } catch (error) {
        logError('dataService', 'Erro inesperado ao criar notificação:', error);
        // Não lança erro para não interromper o fluxo
    }
}

/**
 * Processa menções em um comentário e cria notificações
 * @param commentContent - Conteúdo do comentário
 * @param actionTitle - Título da ação
 * @param authorName - Nome do autor do comentário  
 */
export async function processMentions(
    commentContent: string,
    actionTitle: string,
    authorName: string
): Promise<void> {
    // Extrair menções do texto (@Nome)
    const mentionRegex = /@([^\s@]+(?:\s[^\s@]+)?)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(commentContent)) !== null) {
        mentions.push(match[1]);
    }

    // Criar notificação para cada menção única
    const uniqueMentions = [...new Set(mentions)];
    for (const mentionedName of uniqueMentions) {
        // Não notificar se mencionou a si mesmo
        if (mentionedName.toLowerCase() !== authorName.toLowerCase()) {
            await createMentionNotification(mentionedName, actionTitle, authorName);
        }
    }
}

// =====================================
// CADASTROS PENDENTES
// =====================================

export interface PendingRegistration {
    id: string;
    name: string;
    email: string | null;
    municipio: string | null;
    microregiaoId: string;
    cargo: string;
    createdAt: string;
}

/**
 * Carrega membros de equipe que ainda não têm conta na plataforma
 * (profile_id IS NULL na tabela teams)
 */
export async function loadPendingRegistrations(): Promise<PendingRegistration[]> {
    try {
        const { data, error } = await supabase
            .from('teams')
            .select('id, name, email, municipio, microregiao_id, cargo, created_at')
            .is('profile_id', null)
            .order('created_at', { ascending: false });

        if (error) {
            logError('dataService', 'Erro ao buscar pendentes:', error);
            return [];
        }

        return (data || []).map(d => ({
            id: d.id,
            name: d.name,
            email: d.email,
            municipio: d.municipio,
            microregiaoId: d.microregiao_id,
            cargo: d.cargo || 'Membro',
            createdAt: d.created_at,
        }));
    } catch (error) {
        logError('dataService', 'Erro inesperado ao buscar pendentes:', error);
        return [];
    }
}

/**
 * Exclui um membro pendente da tabela teams
 */
export async function deletePendingRegistration(id: string): Promise<void> {
    const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id);

    if (error) {
        logError('dataService', 'Erro ao excluir pendente:', error);
        throw new Error('Erro ao excluir membro pendente');
    }
}

// =====================================
// OBJECTIVES & ACTIVITIES - CRUD DO BANCO
// =====================================

interface ObjectiveDTO {
    id: number;
    title: string;
    status: string;
    microregiao_id: string;
    created_at: string;
}

interface ActivityDTO {
    id: string;
    objective_id: number;
    title: string;
    description: string | null;
    microregiao_id: string;
    created_at: string;
}

/**
 * Carrega objetivos do banco filtrados por microrregião
 * @param microregiaoId - ID da microrregião para filtrar
 */
export async function loadObjectives(microregiaoId?: string): Promise<{ id: number; title: string; status: 'on-track' | 'delayed' }[]> {
    try {
        let query = supabase
            .from('objectives')
            .select('id, title, status, microregiao_id, created_at')
            .order('id', { ascending: true });

        // Filtrar por microrregião se fornecido
        if (microregiaoId && microregiaoId !== 'all') {
            query = query.eq('microregiao_id', microregiaoId);
        }

        const { data, error } = await query;

        if (error) {
            logError('dataService', 'Erro ao carregar objectives:', error);
            throw new Error(`Erro ao carregar objetivos: ${error.message}`);
        }

        return (data || []).map((obj: ObjectiveDTO) => ({
            id: obj.id,
            title: obj.title,
            status: (obj.status === 'delayed' ? 'delayed' : 'on-track') as 'on-track' | 'delayed',
        }));
    } catch (error) {
        logError('dataService', 'Erro inesperado ao carregar objectives:', error);
        throw error;
    }
}

/**
 * Carrega atividades do banco, agrupadas por objective_id
 * @param microregiaoId - ID da microrregião para filtrar
 */
export async function loadActivities(microregiaoId?: string): Promise<Record<number, { id: string; title: string; description: string }[]>> {
    try {
        let query = supabase
            .from('activities')
            .select('id, objective_id, title, description, microregiao_id, created_at')
            .order('id', { ascending: true });

        // Filtrar por microrregião se fornecido
        if (microregiaoId && microregiaoId !== 'all') {
            query = query.eq('microregiao_id', microregiaoId);
        }

        const { data, error } = await query;

        if (error) {
            logError('dataService', 'Erro ao carregar activities:', error);
            throw new Error(`Erro ao carregar atividades: ${error.message}`);
        }

        // Agrupar por objective_id
        const grouped: Record<number, { id: string; title: string; description: string }[]> = {};

        (data || []).forEach((act: ActivityDTO) => {
            if (!grouped[act.objective_id]) {
                grouped[act.objective_id] = [];
            }
            grouped[act.objective_id].push({
                id: act.id,
                title: act.title,
                description: act.description || '',
            });
        });

        return grouped;
    } catch (error) {
        logError('dataService', 'Erro inesperado ao carregar activities:', error);
        throw error;
    }
}

/**
 * Cria um novo objetivo
 * @param title - Título do objetivo
 * @param microregiaoId - ID da microrregião
 */
export async function createObjective(title: string, microregiaoId: string): Promise<{ id: number; title: string; status: 'on-track' | 'delayed' }> {
    const { data, error } = await supabase
        .from('objectives')
        .insert({ title, status: 'on-track', microregiao_id: microregiaoId })
        .select()
        .single();

    if (error) {
        logError('dataService', 'Erro ao criar objective:', error);
        throw new Error(`Erro ao criar objetivo: ${error.message}`);
    }

    return {
        id: data.id,
        title: data.title,
        status: 'on-track',
    };
}

/**
 * Atualiza um objetivo
 */
export async function updateObjective(id: number, updates: { title?: string; status?: 'on-track' | 'delayed' }): Promise<void> {
    const { error } = await supabase
        .from('objectives')
        .update(updates)
        .eq('id', id);

    if (error) {
        logError('dataService', 'Erro ao atualizar objective:', error);
        throw new Error(`Erro ao atualizar objetivo: ${error.message}`);
    }
}

/**
 * Exclui um objetivo (cascade deleta atividades relacionadas)
 */
export async function deleteObjective(id: number): Promise<void> {
    const { error } = await supabase
        .from('objectives')
        .delete()
        .eq('id', id);

    if (error) {
        logError('dataService', 'Erro ao excluir objective:', error);
        throw new Error(`Erro ao excluir objetivo: ${error.message}`);
    }
}

/**
 * Cria uma nova atividade
 * @param objectiveId - ID do objetivo pai
 * @param id - ID da atividade (ex: "1.1")
 * @param title - Título da atividade
 * @param microregiaoId - ID da microrregião
 * @param description - Descrição opcional
 */
export async function createActivity(objectiveId: number, id: string, title: string, microregiaoId: string, description: string = ''): Promise<{ id: string; title: string; description: string }> {
    const { data, error } = await supabase
        .from('activities')
        .insert({
            id,
            objective_id: objectiveId,
            title,
            description,
            microregiao_id: microregiaoId
        })
        .select()
        .single();

    if (error) {
        logError('dataService', 'Erro ao criar activity:', error);
        throw new Error(`Erro ao criar atividade: ${error.message}`);
    }

    return {
        id: data.id,
        title: data.title,
        description: data.description || '',
    };
}

/**
 * Atualiza uma atividade
 */
export async function updateActivity(id: string, updates: { title?: string; description?: string }): Promise<void> {
    const { error } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', id);

    if (error) {
        logError('dataService', 'Erro ao atualizar activity:', error);
        throw new Error(`Erro ao atualizar atividade: ${error.message}`);
    }
}

/**
 * Exclui uma atividade
 */
export async function deleteActivity(id: string): Promise<void> {
    const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);

    if (error) {
        logError('dataService', 'Erro ao excluir activity:', error);
        throw new Error(`Erro ao excluir atividade: ${error.message}`);
    }
}

// =====================================
// TAGS - CRUD
// =====================================

/**
 * Gera uma cor automática baseada no nome da tag (hash → HSL)
 */
function generateTagColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 45%)`;
}

/**
 * Carrega todas as tags disponíveis
 */
export async function loadTags(): Promise<ActionTag[]> {
    try {
        const { data, error } = await supabase
            .from('action_tags')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            logError('dataService', 'Erro ao carregar tags:', error);
            throw new Error(`Erro ao carregar tags: ${error.message}`);
        }

        return (data || []).map((t: ActionTagDTO) => ({
            id: t.id,
            name: t.name,
            color: t.color,
        }));
    } catch (error) {
        logError('dataService', 'Erro inesperado ao carregar tags:', error);
        throw error;
    }
}

/**
 * Cria uma nova tag
 */
export async function createTag(name: string): Promise<ActionTag> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('action_tags')
            .insert({
                name: name.toUpperCase(),
                color: generateTagColor(name),
                created_by: user?.id || null,
            })
            .select()
            .single();

        if (error) {
            logError('dataService', 'Erro ao criar tag:', error);
            throw new Error(`Erro ao criar tag: ${error.message}`);
        }

        return {
            id: data.id,
            name: data.name,
            color: data.color,
        };
    } catch (error) {
        logError('dataService', 'Erro inesperado ao criar tag:', error);
        throw error;
    }
}

/**
 * Adiciona uma tag a uma ação
 */
export async function addTagToAction(actionUid: string, tagId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('action_tag_assignments')
            .insert({
                action_uid: actionUid,
                tag_id: tagId,
            });

        if (error) {
            // Ignora erro de duplicidade
            if (!error.message.includes('duplicate')) {
                logError('dataService', 'Erro ao adicionar tag à ação:', error);
                throw new Error(`Erro ao adicionar tag: ${error.message}`);
            }
        }
    } catch (error) {
        logError('dataService', 'Erro inesperado ao adicionar tag:', error);
        throw error;
    }
}

/**
 * Remove uma tag de uma ação
 */
export async function removeTagFromAction(actionUid: string, tagId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('action_tag_assignments')
            .delete()
            .eq('action_uid', actionUid)
            .eq('tag_id', tagId);

        if (error) {
            logError('dataService', 'Erro ao remover tag da ação:', error);
            throw new Error(`Erro ao remover tag: ${error.message}`);
        }
    } catch (error) {
        logError('dataService', 'Erro inesperado ao remover tag:', error);
        throw error;
    }
}

/**
 * Carrega tags de uma ação específica (helper interno)
 */
export async function loadTagsForAction(actionUid: string): Promise<ActionTag[]> {
    try {
        const { data, error } = await supabase
            .from('action_tag_assignments')
            .select(`
                tag_id,
                tag:action_tags(id, name, color)
            `)
            .eq('action_uid', actionUid);

        if (error) {
            logError('dataService', 'Erro ao carregar tags da ação:', error);
            return [];
        }

        return (data || [])
            .filter(d => d.tag)
            .map(d => ({
                id: (d.tag as any).id,
                name: (d.tag as any).name,
                color: (d.tag as any).color,
            }));
    } catch (error) {
        logError('dataService', 'Erro inesperado ao carregar tags da ação:', error);
        return [];
    }
}

/**
 * Exclui uma tag do sistema (remove de todas as ações também via CASCADE)
 */
export async function deleteTag(tagId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('action_tags')
            .delete()
            .eq('id', tagId);

        if (error) {
            logError('dataService', 'Erro ao excluir tag:', error);
            throw new Error(`Erro ao excluir tag: ${error.message}`);
        }
    } catch (error) {
        logError('dataService', 'Erro inesperado ao excluir tag:', error);
        throw error;
    }
}

// =====================================
// ANNOUNCEMENTS (MURAL) - CRUD
// =====================================

/**
 * Carrega anúncios ativos
 * @param microregiaoId - Opcional: Se fornecido, filtra anúncios direcionados a esta micro (ou 'all')
 */
export async function loadAnnouncements(microregiaoId?: string): Promise<Announcement[]> {
    try {
        const today = new Date().toISOString().split('T')[0];

        const query = supabase
            .from('announcements')
            .select('*')
            .eq('is_active', true)
            .or(`expiration_date.is.null,expiration_date.gte.${today}`)
            .order('display_date', { ascending: false })
            .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            logError('dataService', 'Erro ao carregar anúncios:', error);
            return [];
        }

        let announcements = (data || []).map((row: any) => ({
            id: row.id,
            title: row.title,
            content: row.content,
            type: row.type,
            priority: row.priority,
            displayDate: row.display_date,
            targetMicros: row.target_micros || [],
            linkUrl: row.link_url,
            imageUrl: row.image_url,
            isActive: row.is_active,
            createdBy: row.created_by,
            createdAt: row.created_at
        }));

        // Filtrar no client-side se necessário (já que target_micros é array)
        if (microregiaoId) {
            announcements = announcements.filter(a =>
                a.targetMicros.length === 0 ||
                a.targetMicros.includes('all') ||
                a.targetMicros.includes(microregiaoId)
            );
        }

        return announcements;
    } catch (error) {
        logError('dataService', 'Erro inesperado ao carregar anúncios:', error);
        return [];
    }
}

/**
 * Carrega TODOS anúncios (para admin)
 */
export async function loadAllAnnouncementsForAdmin(): Promise<Announcement[]> {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.id,
            title: row.title,
            content: row.content,
            type: row.type,
            priority: row.priority,
            displayDate: row.display_date,
            targetMicros: row.target_micros || [],
            linkUrl: row.link_url,
            imageUrl: row.image_url,
            isActive: row.is_active,
            expirationDate: row.expiration_date,
            createdBy: row.created_by,
            createdAt: row.created_at
        }));
    } catch (error) {
        logError('dataService', 'Erro admin load announcements:', error);
        return [];
    }
}

export async function createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt' | 'createdBy'>): Promise<Announcement | null> {
    try {
        const { data: user } = await supabase.auth.getUser();

        const dbPayload = {
            title: data.title,
            content: data.content,
            type: data.type,
            priority: data.priority,
            display_date: data.displayDate,
            expiration_date: data.expirationDate || null,
            target_micros: data.targetMicros,
            link_url: data.linkUrl,
            image_url: data.imageUrl,
            is_active: data.isActive,
            created_by: user.user?.id
        };

        const { data: result, error } = await supabase
            .from('announcements')
            .insert(dbPayload)
            .select()
            .single();

        if (error) throw error;

        return {
            id: result.id,
            title: result.title,
            content: result.content,
            type: result.type,
            priority: result.priority,
            displayDate: result.display_date,
            targetMicros: result.target_micros,
            linkUrl: result.link_url,
            imageUrl: result.image_url,
            isActive: result.is_active,
            createdBy: result.created_by,
            createdAt: result.created_at
        };
    } catch (error) {
        logError('dataService', 'Erro ao criar anúncio:', error);
        throw error;
    }
}

export async function updateAnnouncement(id: string, data: Partial<Omit<Announcement, 'id' | 'createdAt' | 'createdBy'>>): Promise<void> {
    try {
        const dbPayload: any = {};
        if (data.title !== undefined) dbPayload.title = data.title;
        if (data.content !== undefined) dbPayload.content = data.content;
        if (data.type !== undefined) dbPayload.type = data.type;
        if (data.priority !== undefined) dbPayload.priority = data.priority;
        if (data.displayDate !== undefined) dbPayload.display_date = data.displayDate;
        if (data.expirationDate !== undefined) dbPayload.expiration_date = data.expirationDate || null;
        if (data.targetMicros !== undefined) dbPayload.target_micros = data.targetMicros;
        if (data.linkUrl !== undefined) dbPayload.link_url = data.linkUrl;
        if (data.imageUrl !== undefined) dbPayload.image_url = data.imageUrl;
        if (data.isActive !== undefined) dbPayload.is_active = data.isActive;

        const { error } = await supabase
            .from('announcements')
            .update(dbPayload)
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        logError('dataService', 'Erro ao atualizar anúncio:', error);
        throw error;
    }
}

export async function deleteAnnouncement(id: string): Promise<void> {
    const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

    if (error) {
        logError('dataService', 'Erro ao deletar anúncio:', error);
        throw error;
    }
}

export async function toggleAnnouncementActive(id: string, currentState: boolean): Promise<void> {
    const { error } = await supabase
        .from('announcements')
        .update({ is_active: !currentState })
        .eq('id', id);

    if (error) throw error;
}

// =====================================
// AUTOMATED EVENTS (ACONTECENDO AGORA)
// =====================================

export type AutomatedEventType = 'plan_completed' | 'goal_reached' | 'new_user' | 'system_milestone';

export interface AutomatedEvent {
    id: string;
    type: AutomatedEventType;
    municipality: string;
    title: string;
    details?: string;
    imageGradient: string;
    likes: number;
    footerContext?: string;
    timestamp: string; // For display (calculated from created_at)
    created_at: string;
}

/**
 * Carrega os últimos eventos automáticos
 */
export async function loadAutomatedEvents(limit: number = 6): Promise<AutomatedEvent[]> {
    try {
        const { data, error } = await supabase
            .from('automated_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.id,
            type: row.type,
            municipality: row.municipality,
            title: row.title,
            details: row.details,
            imageGradient: row.image_gradient,
            likes: row.likes,
            footerContext: row.footer_context,
            timestamp: timeSince(new Date(row.created_at)),
            created_at: row.created_at
        }));
    } catch (error) {
        logError('dataService', 'Erro ao carregar eventos automáticos:', error);
        return [];
    }
}

/**
 * Registra um novo evento automático
 */
export async function recordAutomatedEvent(event: Omit<AutomatedEvent, 'id' | 'timestamp' | 'created_at' | 'likes'>): Promise<void> {
    try {
        await supabase
            .from('automated_events')
            .insert({
                type: event.type,
                municipality: event.municipality,
                title: event.title,
                details: event.details,
                image_gradient: event.imageGradient,
                footer_context: event.footerContext
            });
    } catch (error) {
        // Silent fail to not disrupt main flow
        console.error('Falha ao registrar evento automático:', error);
    }
}

/**
 * Helper para formatar tempo relativo (ex: "2h atrás")
 */
function timeSince(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h atrás";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "min atrás";
    return "agora mesmo";
}
