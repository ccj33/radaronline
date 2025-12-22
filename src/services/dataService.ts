import { supabase } from '../lib/supabase';
import type { Action, ActionComment, TeamMember, RaciMember } from '../types';
import { generateActionUid } from '../types';

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
    content: string;
    created_at: string;
    // Joined from profiles
    author?: {
        nome: string;
        microregiao_id: string | null;
    };
}

interface TeamDTO {
    id: string;
    microregiao_id: string;
    name: string;
    role: string;
    email: string | null;
    municipio: string | null;
    created_at: string;
    updated_at: string;
}

// =====================================
// HELPERS DE CONVERSÃO
// =====================================

function mapActionDTOToAction(
    dto: ActionDTO,
    raci: ActionRaciDTO[],
    comments: ActionCommentDTO[]
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
        notes: dto.notes || '',
        comments: comments.map(c => ({
            id: c.id,
            authorId: c.author_id,
            authorName: c.author?.nome || 'Usuário',
            authorMunicipio: c.author?.microregiao_id || '',
            content: c.content,
            createdAt: c.created_at,
        })),
    };
}

function mapTeamDTOToTeamMember(dto: TeamDTO): TeamMember {
    return {
        id: parseInt(dto.id.substring(0, 8), 16) || Math.random() * 10000, // Convert UUID to number for compatibility
        name: dto.name,
        role: dto.role,
        email: dto.email || '',
        municipio: dto.municipio || '',
        microregiaoId: dto.microregiao_id,
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
        // Buscar ações
        let query = supabase
            .from('actions')
            .select('*')
            .order('action_id', { ascending: true });

        if (microregiaoId && microregiaoId !== 'all') {
            query = query.eq('microregiao_id', microregiaoId);
        }

        const { data: actionsData, error: actionsError } = await query;

        if (actionsError) {
            console.error('[dataService] Erro ao carregar ações:', actionsError);
            throw new Error(`Erro ao carregar ações: ${actionsError.message}`);
        }

        if (!actionsData || actionsData.length === 0) {
            return [];
        }

        // Buscar RACI para todas as ações
        const actionIds = actionsData.map(a => a.id);
        const { data: raciData, error: raciError } = await supabase
            .from('action_raci')
            .select('*')
            .in('action_id', actionIds);

        if (raciError) {
            console.error('[dataService] Erro ao carregar RACI:', raciError);
        }

        // Buscar comentários para todas as ações
        const { data: commentsData, error: commentsError } = await supabase
            .from('action_comments')
            .select(`
        *,
        author:profiles(nome, microregiao_id)
      `)
            .in('action_id', actionIds)
            .order('created_at', { ascending: true });

        if (commentsError) {
            console.error('[dataService] Erro ao carregar comentários:', commentsError);
        }

        // Mapear para formato da aplicação
        const raciByAction = new Map<string, ActionRaciDTO[]>();
        (raciData || []).forEach(r => {
            const existing = raciByAction.get(r.action_id) || [];
            existing.push(r);
            raciByAction.set(r.action_id, existing);
        });

        const commentsByAction = new Map<string, ActionCommentDTO[]>();
        (commentsData || []).forEach(c => {
            const existing = commentsByAction.get(c.action_id) || [];
            existing.push(c as ActionCommentDTO);
            commentsByAction.set(c.action_id, existing);
        });

        return actionsData.map(action =>
            mapActionDTOToAction(
                action as ActionDTO,
                raciByAction.get(action.id) || [],
                commentsByAction.get(action.id) || []
            )
        );
    } catch (error) {
        console.error('[dataService] Erro inesperado ao carregar ações:', error);
        throw error;
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
            console.error('[dataService] Erro ao criar ação:', error);
            throw new Error(`Erro ao criar ação: ${error.message}`);
        }

        return mapActionDTOToAction(data as ActionDTO, [], []);
    } catch (error) {
        console.error('[dataService] Erro inesperado ao criar ação:', error);
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
            .select()
            .single();

        if (error) {
            console.error('[dataService] Erro ao atualizar ação:', error);
            throw new Error(`Erro ao atualizar ação: ${error.message}`);
        }

        // Buscar RACI e comentários atualizados
        const { data: raciData } = await supabase
            .from('action_raci')
            .select('*')
            .eq('action_id', data.id);

        const { data: commentsData } = await supabase
            .from('action_comments')
            .select(`
        *,
        author:profiles(nome, microregiao_id)
      `)
            .eq('action_id', data.id)
            .order('created_at', { ascending: true });

        return mapActionDTOToAction(
            data as ActionDTO,
            (raciData || []) as ActionRaciDTO[],
            (commentsData || []) as ActionCommentDTO[]
        );
    } catch (error) {
        console.error('[dataService] Erro inesperado ao atualizar ação:', error);
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
            console.error('[dataService] Erro ao excluir ação:', error);
            throw new Error(`Erro ao excluir ação: ${error.message}`);
        }
    } catch (error) {
        console.error('[dataService] Erro inesperado ao excluir ação:', error);
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
            console.error('[dataService] Erro ao adicionar membro RACI:', error);
            throw new Error(`Erro ao adicionar membro: ${error.message}`);
        }

        return {
            name: data.member_name,
            role: data.role as RaciMember['role'],
        };
    } catch (error) {
        console.error('[dataService] Erro inesperado ao adicionar membro RACI:', error);
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
            console.error('[dataService] Erro ao remover membro RACI:', error);
            throw new Error(`Erro ao remover membro: ${error.message}`);
        }
    } catch (error) {
        console.error('[dataService] Erro inesperado ao remover membro RACI:', error);
        throw error;
    }
}

// =====================================
// COMENTÁRIOS - CRUD
// =====================================

/**
 * Adiciona comentário a uma ação
 */
export async function addComment(
    actionUid: string,
    content: string
): Promise<ActionComment> {
    try {
        // Buscar usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        // Buscar perfil do usuário para nome e município
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('nome, microregiao_id')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('[dataService] Erro ao buscar perfil:', profileError);
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
                content,
            })
            .select()
            .single();

        if (error) {
            console.error('[dataService] Erro ao adicionar comentário:', error);
            throw new Error(`Erro ao adicionar comentário: ${error.message}`);
        }

        return {
            id: data.id,
            authorId: user.id,
            authorName: profile?.nome || 'Usuário',
            authorMunicipio: profile?.microregiao_id || '',
            content: data.content,
            createdAt: data.created_at,
        };
    } catch (error) {
        console.error('[dataService] Erro inesperado ao adicionar comentário:', error);
        throw error;
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
        let query = supabase
            .from('teams')
            .select('*')
            .order('name', { ascending: true });

        if (microregiaoId && microregiaoId !== 'all') {
            query = query.eq('microregiao_id', microregiaoId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[dataService] Erro ao carregar equipes:', error);
            throw new Error(`Erro ao carregar equipes: ${error.message}`);
        }

        // Agrupar por microrregião
        const teamsByMicro: Record<string, TeamMember[]> = {};

        (data || []).forEach((dto: TeamDTO) => {
            const member = mapTeamDTOToTeamMember(dto);
            if (!teamsByMicro[dto.microregiao_id]) {
                teamsByMicro[dto.microregiao_id] = [];
            }
            teamsByMicro[dto.microregiao_id].push(member);
        });

        return teamsByMicro;
    } catch (error) {
        console.error('[dataService] Erro inesperado ao carregar equipes:', error);
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
        const { data, error } = await supabase
            .from('teams')
            .insert({
                microregiao_id: input.microregiaoId,
                name: input.name,
                role: input.role,
                email: input.email || null,
                municipio: input.municipio || null,
            })
            .select()
            .single();

        if (error) {
            console.error('[dataService] Erro ao adicionar membro:', error);
            throw new Error(`Erro ao adicionar membro: ${error.message}`);
        }

        return mapTeamDTOToTeamMember(data as TeamDTO);
    } catch (error) {
        console.error('[dataService] Erro inesperado ao adicionar membro:', error);
        throw error;
    }
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
            console.error('[dataService] Erro ao remover membro:', error);
            throw new Error(`Erro ao remover membro: ${error.message}`);
        }
    } catch (error) {
        console.error('[dataService] Erro inesperado ao remover membro:', error);
        throw error;
    }
}
