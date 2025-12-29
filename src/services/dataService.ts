import { supabase } from '../lib/supabase';
import type { Action, ActionComment, TeamMember, RaciMember, ProfileDTO } from '../types';
import { generateActionUid } from '../types';
import { loggingService } from './loggingService'; // Imported loggingService

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
            parentId: c.parent_id || null,
            authorId: c.author_id,
            authorName: c.author?.nome || 'Usuário',
            authorMunicipio: c.author?.microregiao_id || '',
            authorAvatarId: c.author?.avatar_id || 'zg10',
            authorRole: c.author?.role || undefined,
            content: c.content,
            createdAt: c.created_at,
        })),
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
        author:profiles(nome, microregiao_id, avatar_id, role)
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
            .select();

        // data é um array aqui
        const updatedRecord = data?.[0];

        if (error || !updatedRecord) {
            console.error('[dataService] Erro ao atualizar ação:', error);
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

        return updatedAction;
    } catch (error) {
        console.error('[dataService] Erro inesperado ao atualizar ação:', error);
        throw error;
    }
}

/**
 * Upsert: Cria a ação se não existir, atualiza se existir
 * Usado pelo handleSaveFullAction para garantir persistência
 */
export async function upsertAction(action: Action): Promise<Action> {
    try {
        // Primeiro, verificar se a ação existe
        const { data: existing } = await supabase
            .from('actions')
            .select('id')
            .eq('uid', action.uid)
            .maybeSingle();

        if (existing) {
            // Ação existe, fazer update
            return await updateAction(action.uid, {
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
            console.log('[dataService] Ação não existe no banco, criando:', action.uid);

            // Extrair dados do UID e action
            const { data: { user } } = await supabase.auth.getUser();

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
                    created_by: user?.id || null,
                })
                .select()
                .single();

            if (error) {
                console.error('[dataService] Erro ao criar ação via upsert:', error);
                throw new Error(`Erro ao criar ação: ${error.message}`);
            }

            const newAction = mapActionDTOToAction(data as ActionDTO, [], []);

            // LOG ACTIVITY
            loggingService.logActivity('action_created', 'action', data.id, {
                title: newAction.title,
                displayId: newAction.uid,
                microregiaoId: newAction.microregiaoId,
                source: 'upsert'
            });

            return newAction;
        }
    } catch (error) {
        console.error('[dataService] Erro inesperado ao upsert ação:', error);
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

        // ✅ LOG ACTIVITY
        loggingService.logActivity('action_deleted', 'action', uid, {});
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
            .select('nome, microregiao_id, avatar_id, role')
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
                parent_id: parentId || null,
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
            parentId: data.parent_id || null,
            authorId: user.id,
            authorName: profile?.nome || 'Usuário',
            authorMunicipio: profile?.microregiao_id || '',
            authorAvatarId: profile?.avatar_id || 'zg10',
            authorRole: profile?.role || undefined,
            content: data.content,
            createdAt: data.created_at,
        };
    } catch (error) {
        console.error('[dataService] Erro inesperado ao adicionar comentário:', error);
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
        console.error('[dataService] Erro ao atualizar comentário:', error);
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
        console.error('[dataService] Erro ao excluir respostas:', childError);
    }

    // Depois, excluir o comentário principal
    const { error } = await supabase
        .from('action_comments')
        .delete()
        .eq('id', commentId);

    if (error) {
        console.error('[dataService] Erro ao excluir comentário:', error);
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
            .select('*')
            .eq('ativo', true);

        if (microregiaoId && microregiaoId !== 'all') {
            profilesQuery = profilesQuery.eq('microregiao_id', microregiaoId);
        }

        const { data: profilesData, error: profilesError } = await profilesQuery;

        if (profilesError) {
            console.error('[dataService] Erro ao carregar perfis:', profilesError);
        }



        // 2. Buscar Times Manuais (adicionados pelo gestor)
        let teamQuery = supabase
            .from('teams')
            .select('*')
            .order('name', { ascending: true });

        if (microregiaoId && microregiaoId !== 'all') {
            teamQuery = teamQuery.eq('microregiao_id', microregiaoId);
        }

        const { data: teamsData, error: teamsError } = await teamQuery;

        if (teamsError) {
            console.error('[dataService] Erro ao carregar equipes:', teamsError);
            throw new Error(`Erro ao carregar equipes: ${teamsError.message}`);
        }

        // 3. Processar Perfis (Enriquecendo com dados de times se houver)
        (profilesData || []).forEach((p: ProfileDTO) => {
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
        console.error('[dataService] Erro inesperado ao carregar equipes:', error);
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
            console.error('[dataService] Erro ao atualizar município no profile:', profileError);
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
        console.error('[dataService] Erro ao salvar município do usuário:', error);
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
            console.error('[dataService] Erro ao adicionar membro:', error);
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

        return newMember;
    } catch (error) {
        console.error('[dataService] Erro inesperado ao adicionar membro:', error);
        throw error;
    }
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
            console.error('[dataService] Erro ao remover membro:', error);
            throw new Error(`Erro ao remover membro: ${error.message}`);
        }
    } catch (error) {
        console.error('[dataService] Erro inesperado ao remover membro:', error);
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
            console.log('[dataService] Usuário mencionado não encontrado:', mentionedUserName);
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
            console.error('[dataService] Erro ao criar notificação de menção:', error);
            // Não lança erro para não interromper o fluxo de adicionar comentário
        }
    } catch (error) {
        console.error('[dataService] Erro inesperado ao criar notificação:', error);
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
            console.error('[dataService] Erro ao buscar pendentes:', error);
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
        console.error('[dataService] Erro inesperado ao buscar pendentes:', error);
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
        console.error('[dataService] Erro ao excluir pendente:', error);
        throw new Error('Erro ao excluir membro pendente');
    }
}
