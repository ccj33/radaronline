import { supabase } from '../lib/supabase';
import type { User, ProfileDTO, UserRole } from '../types/auth.types';
import { log, logError } from '../lib/logger';
import { loggingService } from './loggingService';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';

// =====================================
// CONFIGURAÇÃO: Timeout para Edge Functions
// =====================================
const getEnvTimeout = (): number => {
  try {
    const envValue = (import.meta as any).env?.VITE_API_TIMEOUT;
    return envValue ? Number(envValue) : 30000;
  } catch {
    return 30000;
  }
};
const EDGE_FUNCTION_TIMEOUT_MS = getEnvTimeout();

// =====================================
// HELPER: Mapeamento de mensagens de erro
// =====================================

// ✅ ADIÇÃO: Helper pra extrair e mapear mensagens de erro (remove duplicatas)
const getErrorMessage = (errorMsg: string | undefined): string => {
  if (!errorMsg) return 'Erro desconhecido ao criar usuário';
  if (errorMsg.includes('already registered') || errorMsg.includes('already exists') || errorMsg.includes('já está cadastrado')) {
    return 'Este email já está cadastrado';
  } else if (errorMsg.includes('password') || errorMsg.includes('senha')) {
    return 'Senha muito fraca. Use pelo menos 6 caracteres';
  } else if (errorMsg.includes('Formato de email')) {
    return 'Formato de email inválido';
  } else if (errorMsg.includes('Role inválido')) {
    return 'Nível de acesso inválido';
  } else if (errorMsg.includes('Microrregião')) {
    return 'Microrregião inválida ou obrigatória';
  } else if (errorMsg.includes('Não autenticado')) {
    return 'Sessão expirada. Faça login novamente.';
  } else if (errorMsg.includes('administradores')) {
    return 'Apenas administradores podem criar usuários';
  }
  return errorMsg;
};

// =====================================
// HELPER: Converte Banco -> App
// =====================================

function mapProfileToUser(profile: ProfileDTO): User {
  return {
    id: profile.id,
    nome: profile.nome,
    email: profile.email,
    role: profile.role,
    // Converte null/'all' para string sempre (compatibilidade com código existente)
    // App sempre vê como string, DB armazena null para 'all'
    microregiaoId: profile.microregiao_id || 'all',
    ativo: profile.ativo,
    avatarId: profile.avatar_id || 'zg10',
    lgpdConsentimento: profile.lgpd_consentimento,
    lgpdConsentimentoData: profile.lgpd_consentimento_data || undefined,
    createdBy: profile.created_by || undefined,
    municipio: profile.municipio || undefined,
    createdAt: profile.created_at,
  };
}

// =====================================
// ADMIN: Gerenciamento de Usuários
// =====================================

/**
 * Lista todos os usuários (apenas admin)
 */
export async function listUsers(): Promise<User[]> {
  try {
    // ✅ FASE 1: Select específico - apenas campos necessários
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email, role, microregiao_id, ativo, lgpd_consentimento, lgpd_consentimento_data, created_by, created_at, municipio')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[authService] Erro ao listar usuários:', error);
      throw new Error(`Erro ao listar usuários: ${error.message}`);
    }

    return (data || []).map((profile: any) => mapProfileToUser({
      ...profile,
      updated_at: profile.updated_at || profile.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[authService] Erro inesperado ao listar usuários:', error);
    throw error;
  }
}

/**
 * Cria novo usuário (apenas admin) via Edge Function
 *
 * IMPORTANTE: Usa Edge Function para criar usuários já confirmados,
 * evitando problemas de confirmação de email.
 *
 * PADRÃO: App sempre envia/recebe 'all' como string, mas DB armazena como NULL.
 */
export async function createUser(userData: {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  microregiaoId?: string;
  createdBy?: string;
}): Promise<User> {
  try {
    // ✅ Validar campos obrigatórios
    if (!userData.nome || !userData.email || !userData.senha) {
      throw new Error('Nome, email e senha são obrigatórios');
    }
    // ✅ Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Formato de email inválido');
    }
    // ✅ Validar senha
    if (userData.senha.length < 6) {
      throw new Error('Senha deve ter no mínimo 6 caracteres');
    }
    // ✅ Verificar se usuário atual é admin
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      throw new Error('Não autenticado. Faça login novamente.');
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();
    if (profileError) {
      console.error('[authService] Erro ao verificar permissões:', profileError);
      throw new Error(`Erro ao verificar permissões: ${profileError.message}`);
    }
    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
      throw new Error('Apenas administradores podem criar usuários');
    }
    // ✅ Converter 'all' para null antes de enviar
    const microregiao_id = userData.microregiaoId === 'all' ||
      (userData.role === 'admin' && !userData.microregiaoId)
      ? null
      : userData.microregiaoId || null;
    // ✅ Log para debug
    console.log('[authService] Criando usuário via Edge Function:', {
      email: userData.email,
      role: userData.role,
      microregiao_id,
    });

    // ✅ Chamar Edge Function com timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.warn('[authService] Timeout na Edge Function - verifique logs no Supabase Dashboard');
        reject(new Error('Timeout: A requisição demorou mais de 30 segundos'));
      }, EDGE_FUNCTION_TIMEOUT_MS);
    });

    const functionPromise = supabase.functions.invoke('create-user', {
      body: {
        email: userData.email.trim().toLowerCase(),
        password: userData.senha,
        nome: userData.nome.trim(),
        role: userData.role,
        microregiaoId: microregiao_id, // Já convertido para null se 'all'
        createdBy: userData.createdBy || currentUser.id,
      },
    });

    // ✅ Race entre a função e o timeout
    let functionData: any;
    let functionError: any;

    try {
      const result = await Promise.race([functionPromise, timeoutPromise]) as any;
      functionData = result.data;
      functionError = result.error;
    } catch (error: any) {
      // Se foi timeout
      if (error.message?.includes('Timeout')) {
        logError('[authService]', 'Timeout detectado - Edge Function pode estar lenta ou com problemas');
        throw new Error('A requisição demorou muito. Verifique sua conexão ou tente novamente.');
      }

      // ✅ CORREÇÃO: Tratar erros do Supabase SDK
      let errorMessage = 'Erro ao criar usuário';
      if (error instanceof FunctionsHttpError) {
        // Extrair body
        try {
          const body = error.context?.body ? (typeof error.context.body === 'string' ? JSON.parse(error.context.body) : error.context.body)
            : (error.context?.response ? await error.context.response.json().catch(() => null) : null);
          errorMessage = body?.error || errorMessage;
        } catch (e) {
          log('[authService] Não foi possível parsear body do erro:', String(e));
        }
        logError('[authService]', 'Edge Function retornou erro HTTP', { status: error.context?.status, message: errorMessage });
        throw new Error(getErrorMessage(typeof errorMessage === 'string' ? errorMessage : undefined));  // Usa helper
      } else if (error instanceof FunctionsRelayError) {
        logError('[authService]', 'Erro de rede com Supabase', { message: error.message });
        throw new Error('Erro de conexão com o servidor. Verifique sua internet.');
      } else if (error instanceof FunctionsFetchError) {
        logError('[authService]', 'Erro ao alcançar Edge Function', { message: error.message });
        throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
      } else {
        logError('[authService]', 'Erro desconhecido', error);
        throw error;
      }
    }

    // ✅ Fallback unificado (remove duplicatas)
    if (functionError) {
      logError('[authService]', 'Erro na Edge Function', functionError);
      throw new Error(getErrorMessage(functionError.message));  // Usa helper
    }
    if (!functionData?.data?.user) {
      throw new Error('Erro ao criar usuário: dados não retornados da Edge Function');
    }
    // ✅ Se a Edge Function já retornou o perfil, usar diretamente
    if (functionData.data.profile) {
      console.log('[authService] Perfil retornado pela Edge Function');
      return mapProfileToUser(functionData.data.profile as ProfileDTO);
    }
    // ✅ FASE 1: Retry otimizado (2 tentativas com delay fixo de 500ms)
    console.log('[authService] Buscando perfil criado...');
    let newProfile: ProfileDTO | null = null;
    let lastError: any = null;
    for (let i = 0; i < 2; i++) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email, role, microregiao_id, ativo, lgpd_consentimento, lgpd_consentimento_data, created_by, created_at')
        .eq('id', functionData.data.user.id)
        .single();
      if (data) {
        newProfile = data as ProfileDTO;
        break;
      }
      lastError = error;
      if (error && i < 1) {
        console.warn(`[authService] Retry ${i + 1}/2 ao buscar perfil:`, error.message);
        // ✅ FASE 1: Delay fixo de 500ms (mais rápido que progressivo)
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    if (!newProfile) {
      console.error('[authService] Perfil não encontrado. Último erro:', lastError);
      throw new Error(
        lastError?.message ||
        'Perfil não foi criado pelo trigger. Verifique se o trigger está ativo no Supabase.'
      );
    }
    const newUser = mapProfileToUser(newProfile);

    // ✅ LOG ACTIVITY
    loggingService.logActivity('user_created', 'user', newUser.id, {
      name: newUser.nome,
      email: newUser.email,
      role: newUser.role
    });

    return newUser;
  } catch (error: any) {
    console.error('[authService] Erro inesperado ao criar usuário:', error);
    throw error;
  }
}

/**
 * Atualiza usuário (apenas admin)
 * 
 * NOTA: Para atualizar senha, você precisará criar uma Edge Function no Supabase
 * que use o Admin API. Exemplo:
 * 
 * ```typescript
 * // Em uma Edge Function
 * const { data, error } = await supabase.auth.admin.updateUserById(userId, {
 *   password: novaSenha
 * });
 * ```
 * 
 * PADRÃO: App envia 'all' como string, mas converte para null no DB.
 * 
 * SUPERADMIN: Não pode ter senha alterada por outros usuários.
 */
export async function updateUser(
  userId: string,
  updates: Partial<User> & { senha?: string },
  currentUserId?: string
): Promise<User> {
  try {
    const { senha, ...userUpdates } = updates;

    // ✅ AUDITORIA: Buscar dados ANTES da atualização para comparar
    const { data: originalData } = await supabase
      .from('profiles')
      .select('nome, email, role, microregiao_id, ativo, lgpd_consentimento')
      .eq('id', userId)
      .single();

    // ✅ AUDITORIA: Buscar nome de quem está fazendo a alteração
    let authorName = 'Sistema';
    if (currentUserId) {
      const { data: authorProfile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', currentUserId)
        .single();
      authorName = authorProfile?.nome || 'Admin';
    }

    // ✅ PROTEÇÃO SUPERADMIN: Verificar se está tentando alterar senha de superadmin
    if (senha) {
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (targetProfile?.role === 'superadmin' && currentUserId !== userId) {
        throw new Error('Não é possível alterar a senha do Super Admin. Apenas ele mesmo pode alterá-la.');
      }
    }

    // ✅ FASE 2: Se senha foi fornecida, atualizar PRIMEIRO (mais crítico)
    // Se falhar, não atualiza o profile = evita inconsistência
    if (senha) {
      // Validar senha
      if (senha.length < 6) {
        throw new Error('Senha deve ter no mínimo 6 caracteres');
      }

      console.log('[authService] Atualizando senha para userId:', userId);
      log('[authService]', `Atualizando senha para usuário ${userId}`);

      // Chamar Edge Function com timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.warn('[authService] Timeout ao atualizar senha');
          reject(new Error('Timeout: A requisição demorou mais de 30 segundos'));
        }, EDGE_FUNCTION_TIMEOUT_MS);
      });

      const functionPromise = supabase.functions.invoke('update-user-password', {
        body: {
          userId: userId,
          password: senha,
        },
      });

      let passwordUpdateError: any;

      try {
        const result = await Promise.race([functionPromise, timeoutPromise]) as any;
        passwordUpdateError = result.error;
      } catch (error: any) {
        // Se foi timeout ou outro erro
        if (error.message?.includes('Timeout')) {
          logError('[authService]', 'Timeout ao atualizar senha');
          throw new Error('Atualização de senha demorou demais. Tente novamente ou verifique a função no Supabase.');
        }
        throw error;
      }

      if (passwordUpdateError) {
        logError('[authService]', 'Erro ao atualizar senha:', passwordUpdateError);
        throw new Error(`Erro ao atualizar senha: ${passwordUpdateError.message || 'Erro desconhecido'}`);
      }

      console.log('[authService] Senha atualizada com sucesso');
      log('[authService]', 'Senha atualizada com sucesso');

      // ✅ LOG ACTIVITY
      loggingService.logActivity('user_updated', 'user', userId, { changes: ['password'] });
    }

    // ✅ FASE 2: Buscar dados originais antes de atualizar (para rollback)
    // Nota: originalData removido pois não é usado para rollback (senha é atualizada primeiro)

    // Converter camelCase para snake_case
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (userUpdates.nome !== undefined) updateData.nome = userUpdates.nome;
    if (userUpdates.email !== undefined) updateData.email = userUpdates.email;
    if (userUpdates.role !== undefined) updateData.role = userUpdates.role;

    // ✅ JÁ ESTÁ OK: Converte 'all' para null (padrão consistente)
    if (userUpdates.microregiaoId !== undefined) {
      updateData.microregiao_id = userUpdates.microregiaoId === 'all' ? null : userUpdates.microregiaoId;
    }

    if (userUpdates.ativo !== undefined) updateData.ativo = userUpdates.ativo;
    if (userUpdates.lgpdConsentimento !== undefined) {
      updateData.lgpd_consentimento = userUpdates.lgpdConsentimento;
    }

    // ✅ FASE 2: Atualizar profile apenas se houver campos para atualizar
    if (Object.keys(updateData).length > 1) { // Mais que apenas updated_at
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select('id, nome, email, role, microregiao_id, ativo, lgpd_consentimento, lgpd_consentimento_data, created_by, created_at')
        .single();

      if (error) {
        console.error('[authService] Erro ao atualizar usuário:', error);
        // ✅ FASE 2: Se senha foi atualizada mas profile falhou, não fazer rollback da senha
        // (senha é mais crítico, profile pode ser corrigido depois)
        throw new Error(`Erro ao atualizar usuário: ${error.message}`);
      }

      if (!data) {
        throw new Error('Usuário não encontrado');
      }

      const updatedUser = mapProfileToUser(data as ProfileDTO);

      // ✅ AUDITORIA: Comparar valores e registrar apenas o que REALMENTE mudou
      const realChanges: { field: string; from: any; to: any }[] = [];

      if (originalData) {
        if (userUpdates.nome !== undefined && originalData.nome !== data.nome) {
          realChanges.push({ field: 'nome', from: originalData.nome, to: data.nome });
        }
        if (userUpdates.email !== undefined && originalData.email !== data.email) {
          realChanges.push({ field: 'email', from: originalData.email, to: data.email });
        }
        if (userUpdates.role !== undefined && originalData.role !== data.role) {
          realChanges.push({ field: 'role', from: originalData.role, to: data.role });
        }
        if (userUpdates.microregiaoId !== undefined && originalData.microregiao_id !== data.microregiao_id) {
          realChanges.push({ field: 'microregiao', from: originalData.microregiao_id, to: data.microregiao_id });
        }
        if (userUpdates.ativo !== undefined && originalData.ativo !== data.ativo) {
          realChanges.push({ field: 'ativo', from: originalData.ativo, to: data.ativo });
        }
        if (userUpdates.lgpdConsentimento !== undefined && originalData.lgpd_consentimento !== data.lgpd_consentimento) {
          realChanges.push({ field: 'lgpd', from: originalData.lgpd_consentimento, to: data.lgpd_consentimento });
        }
      }

      // Só registra log se houve mudanças reais
      if (realChanges.length > 0) {
        loggingService.logActivity('user_updated', 'user', userId, {
          author_id: currentUserId,
          author_name: authorName,
          target_user_name: data.nome,
          target_user_email: data.email,
          changes: realChanges.map(c => c.field),
          details: realChanges.map(c => `${c.field}: ${c.from} → ${c.to}`),
          timestamp: new Date().toISOString()
        });
      }

      return updatedUser;
    }

    // Se não há campos para atualizar além da senha, buscar perfil atual
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email, role, microregiao_id, ativo, lgpd_consentimento, lgpd_consentimento_data, created_by, created_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new Error('Erro ao buscar usuário atualizado');
    }

    return mapProfileToUser(data as ProfileDTO);
  } catch (error: any) {
    console.error('[authService] Erro inesperado ao atualizar usuário:', error);
    // ✅ FASE 2: Rollback não necessário - senha é atualizada primeiro, se falhar não atualiza profile
    // Se profile falhar mas senha foi atualizada, é aceitável (senha é mais crítico)
    throw error;
  }
}

/**
 * Desativa usuário (apenas admin)
 * SUPERADMIN: Não pode ser desativado.
 */
export async function deactivateUser(userId: string): Promise<boolean> {
  try {
    // ✅ PROTEÇÃO SUPERADMIN: Verificar se é superadmin
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (targetProfile?.role === 'superadmin') {
      throw new Error('Não é possível desativar o Super Admin.');
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[authService] Erro ao desativar usuário:', error);
      throw new Error(`Erro ao desativar usuário: ${error.message}`);
    }

    // ✅ LOG ACTIVITY
    loggingService.logActivity('user_deactivated', 'user', userId, {});

    return true;
  } catch (error: any) {
    console.error('[authService] Erro inesperado ao desativar usuário:', error);
    throw error;
  }
}

/**
 * Exclui usuário permanentemente (apenas SUPERADMIN)
 * SUPERADMIN: Não pode ser excluído.
 */
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    // ✅ Verificar se usuário atual é superadmin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      throw new Error('Não autenticado.');
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (currentProfile?.role !== 'superadmin') {
      throw new Error('Apenas o Super Admin pode excluir usuários.');
    }

    // ✅ PROTEÇÃO: Não permitir excluir superadmin
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (targetProfile?.role === 'superadmin') {
      throw new Error('Não é possível excluir o Super Admin.');
    }

    console.log('[authService] Excluindo usuário:', userId);

    // ✅ Chamar Edge Function para deletar usuário (precisa de Admin API)
    const { error: functionError } = await supabase.functions.invoke('delete-user', {
      body: { userId },
    });

    if (functionError) {
      console.error('[authService] Erro ao excluir usuário:', functionError);
      throw new Error(`Erro ao excluir usuário: ${functionError.message}`);
    }

    console.log('[authService] Usuário excluído com sucesso');

    // ✅ LOG ACTIVITY
    loggingService.logActivity('user_deleted', 'user', userId, {});

    return true;
  } catch (error: any) {
    console.error('[authService] Erro inesperado ao excluir usuário:', error);
    throw error;
  }
}

/**
 * Atualiza consentimento LGPD
 */
export async function acceptLgpd(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        lgpd_consentimento: true,
        lgpd_consentimento_data: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[authService] Erro ao aceitar LGPD:', error);
      throw new Error(`Erro ao aceitar LGPD: ${error.message}`);
    }

    // ✅ LOG ACTIVITY
    loggingService.logActivity('lgpd_accepted', 'user', userId, {});
  } catch (error: any) {
    console.error('[authService] Erro inesperado ao aceitar LGPD:', error);
    throw error;
  }
}
