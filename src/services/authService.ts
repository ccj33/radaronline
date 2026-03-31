import { log, logError } from '../lib/logger';
import {
  canAssignAdminRole,
  canManageAdminTarget,
  getAdminRoleAssignmentError,
  getAdminTargetManagementError,
} from '../lib/adminRolePolicy';
import { isValidEmail } from '../lib/validation';
import { isAdminLike } from '../lib/authHelpers';
import { getCurrentAuthUser, getCurrentUserId } from './sessionService';
import type { User, UserRole } from '../types/auth.types';
import {
  getCurrentUserProfileViaBackendApi,
  acceptLgpdViaBackendApi,
  completeFirstAccessViaBackendApi,
} from './authProfileApi';
import {
  createUserViaBackendApi,
  deleteUserViaBackendApi,
  listUsersViaBackendApi,
  updateUserViaBackendApi,
} from './adminUsersApi';
import {
  isLegacySupabaseAdminFlowDisabled,
  shouldUseBackendAdminUsersApi,
  shouldUseBackendAuthProfileApi,
} from './apiClient';
import {
  createUserWithEdgeFunction,
  deleteUserWithEdgeFunction,
  updateUserPasswordWithEdgeFunction,
} from './auth/authService.edge';
import { mapProfileToUser, toProfileUpdatePayload } from './auth/authService.mappers';
import {
  fetchCreatedProfileWithRetry,
  fetchProfileRecordById,
  fetchProfileRole,
  listProfileRecords,
  updateProfileRecord,
  upsertFirstAccessTeamMembership,
} from './auth/authService.repositories';

export {
  getCurrentSession,
  getCurrentAuthUser,
  getCurrentUserId,
  requireCurrentAuthUser,
  requireCurrentUserId,
  signInWithPassword,
  signOutCurrentSession,
  subscribeToAuthStateChanges,
} from './sessionService';

function assertLegacySupabaseAdminFlowEnabled(operation: string) {
  if (isLegacySupabaseAdminFlowDisabled()) {
    throw new Error(
      `Fluxo legado Supabase desativado para ${operation}. Configure o backend administrativo e as feature flags de transicao.`
    );
  }
}

export async function getUserProfileById(
  userId: string
): Promise<{ profile: User | null; error?: string }> {
  try {
    if (shouldUseBackendAuthProfileApi()) {
      const currentUserId = await getCurrentUserId();

      if (currentUserId === userId) {
        const profile = await getCurrentUserProfileViaBackendApi();
        if (!profile.ativo) {
          return { profile: null, error: 'Usuario inativo' };
        }

        return { profile };
      }
    }

    const profile = await fetchProfileRecordById(userId, { allowMissing: true });

    if (!profile) {
      return { profile: null, error: 'Perfil nao encontrado' };
    }

    const mapped = mapProfileToUser(profile);
    if (!mapped.ativo) {
      return { profile: null, error: 'Usuario inativo' };
    }

    return { profile: mapped };
  } catch (error: any) {
    return { profile: null, error: error?.message || 'Erro critico ao carregar perfil' };
  }
}

export async function listUsers(): Promise<User[]> {
  try {
    if (shouldUseBackendAdminUsersApi()) {
      return await listUsersViaBackendApi();
    }

    const profiles = await listProfileRecords();
    return profiles.map(mapProfileToUser);
  } catch (error) {
    logError('authService', 'Erro inesperado ao listar usuarios', error);
    throw error;
  }
}

export async function createUser(userData: {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  microregiaoId?: string;
  createdBy?: string;
}): Promise<User> {
  try {
    if (shouldUseBackendAdminUsersApi()) {
      return await createUserViaBackendApi({
        nome: userData.nome,
        email: userData.email,
        senha: userData.senha,
        role: userData.role,
        microregiaoId: userData.microregiaoId,
      });
    }

    assertLegacySupabaseAdminFlowEnabled('criacao de usuario');

    if (!userData.nome || !userData.email || !userData.senha) {
      throw new Error('Nome, email e senha sao obrigatorios');
    }
    if (!isValidEmail(userData.email)) {
      throw new Error('Formato de email invalido');
    }
    if (userData.senha.length < 6) {
      throw new Error('Senha deve ter no minimo 6 caracteres');
    }

    const {
      data: { user: currentUser },
      error: authError,
    } = await getCurrentAuthUser();

    if (authError || !currentUser) {
      throw new Error('Nao autenticado. Faca login novamente.');
    }

    const currentUserRole = await fetchProfileRole(currentUser.id);
    if (!isAdminLike(currentUserRole ?? undefined)) {
      throw new Error('Apenas administradores podem criar usuarios');
    }

    if (!canAssignAdminRole(currentUserRole ?? undefined, userData.role)) {
      throw new Error(getAdminRoleAssignmentError(userData.role));
    }

    const microregiaoId =
      userData.microregiaoId === 'all' ||
      ((userData.role === 'admin' || userData.role === 'superadmin') && !userData.microregiaoId)
        ? null
        : userData.microregiaoId || null;

    const functionData = await createUserWithEdgeFunction({
      email: userData.email.trim().toLowerCase(),
      password: userData.senha,
      nome: userData.nome.trim(),
      role: userData.role,
      microregiaoId,
      createdBy: userData.createdBy || currentUser.id,
    });

    if (!functionData?.data?.user) {
      throw new Error('Erro ao criar usuario: dados nao retornados da edge function');
    }

    if (functionData.data.profile) {
      log('authService', 'Perfil retornado pela edge function');
      return mapProfileToUser(functionData.data.profile);
    }

    log('authService', 'Buscando perfil criado apos edge function');
    const createdProfile = await fetchCreatedProfileWithRetry(functionData.data.user.id);
    return mapProfileToUser(createdProfile);
  } catch (error: any) {
    logError('authService', 'Erro inesperado ao criar usuario', error);
    throw error;
  }
}

export async function updateUser(
  userId: string,
  updates: Partial<User> & { senha?: string }
): Promise<User> {
  try {
    if (shouldUseBackendAdminUsersApi()) {
      return await updateUserViaBackendApi(userId, updates);
    }

    assertLegacySupabaseAdminFlowEnabled('atualizacao administrativa de usuario');

    const { senha, ...userUpdates } = updates;
    const {
      data: { user: currentUser },
      error: authError,
    } = await getCurrentAuthUser();

    if (authError || !currentUser) {
      throw new Error('Nao autenticado. Faca login novamente.');
    }

    const currentUserRole = await fetchProfileRole(currentUser.id);
    if (!isAdminLike(currentUserRole ?? undefined)) {
      throw new Error('Apenas administradores podem atualizar usuarios');
    }

    const targetRole = await fetchProfileRole(userId);
    if (targetRole && !canManageAdminTarget(currentUserRole ?? undefined, targetRole)) {
      throw new Error(getAdminTargetManagementError(targetRole));
    }

    if (userUpdates.role && !canAssignAdminRole(currentUserRole ?? undefined, userUpdates.role)) {
      throw new Error(getAdminRoleAssignmentError(userUpdates.role));
    }

    if (senha) {
      if (senha.length < 6) {
        throw new Error('Senha deve ter no minimo 6 caracteres');
      }

      if (targetRole === 'superadmin' && currentUser.id !== userId) {
        throw new Error(
          'Nao e possivel alterar a senha do Super Admin. Apenas ele mesmo pode altera-la.'
        );
      }

      await updateUserPasswordWithEdgeFunction(
        userId,
        senha,
        'Atualizacao de senha demorou demais. Tente novamente ou verifique a funcao.'
      );
    }

    const updateData = toProfileUpdatePayload(userUpdates);
    if (Object.keys(updateData).length > 1) {
      const updatedProfile = await updateProfileRecord(userId, updateData, { selectUpdated: true });

      if (!updatedProfile) {
        throw new Error('Usuario nao encontrado');
      }

      return mapProfileToUser(updatedProfile);
    }

    const currentProfile = await fetchProfileRecordById(userId);
    if (!currentProfile) {
      throw new Error('Erro ao buscar usuario atualizado');
    }

    return mapProfileToUser(currentProfile);
  } catch (error: any) {
    logError('authService', 'Erro inesperado ao atualizar usuario', error);
    throw error;
  }
}

export async function deactivateUser(userId: string): Promise<boolean> {
  try {
    const targetRole = await fetchProfileRole(userId);
    if (targetRole === 'superadmin') {
      throw new Error('Nao e possivel desativar o Super Admin.');
    }

    await updateProfileRecord(userId, {
      ativo: false,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch (error: any) {
    logError('authService', 'Erro inesperado ao desativar usuario', error);
    throw error;
  }
}

export async function deleteUser(userId: string): Promise<boolean> {
  try {
    if (shouldUseBackendAdminUsersApi()) {
      await deleteUserViaBackendApi(userId);
      return true;
    }

    assertLegacySupabaseAdminFlowEnabled('exclusao de usuario');

    const {
      data: { user: currentUser },
    } = await getCurrentAuthUser();

    if (!currentUser) {
      throw new Error('Nao autenticado.');
    }

    const currentRole = await fetchProfileRole(currentUser.id);
    if (currentRole !== 'superadmin') {
      throw new Error('Apenas o Super Admin pode excluir usuarios.');
    }

    const targetRole = await fetchProfileRole(userId);
    if (targetRole === 'superadmin') {
      throw new Error('Nao e possivel excluir o Super Admin.');
    }

    log('authService', 'Excluindo usuario', { userId });
    await deleteUserWithEdgeFunction(userId);
    return true;
  } catch (error: any) {
    logError('authService', 'Erro inesperado ao excluir usuario', error);
    throw error;
  }
}

export async function acceptLgpd(userId: string): Promise<void> {
  try {
    if (shouldUseBackendAuthProfileApi()) {
      await acceptLgpdViaBackendApi();
      return;
    }

    await updateProfileRecord(userId, {
      lgpd_consentimento: true,
      lgpd_consentimento_data: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    logError('authService', 'Erro inesperado ao aceitar LGPD', error);
    throw error;
  }
}

export async function completeFirstAccess(
  userId: string,
  userEmail: string,
  municipio: string,
  novaSenha: string,
  microregiaoId: string
): Promise<void> {
  try {
    log('authService', 'Iniciando processo de primeiro acesso', { userId, municipio });

    if (shouldUseBackendAuthProfileApi()) {
      await completeFirstAccessViaBackendApi({
        userId,
        userEmail,
        municipio,
        newPassword: novaSenha,
        microregionId: microregiaoId,
      });
      return;
    }

    assertLegacySupabaseAdminFlowEnabled('primeiro acesso');

    if (!novaSenha || novaSenha.length < 6) {
      throw new Error('Senha deve ter no minimo 6 caracteres');
    }
    if (!municipio) {
      throw new Error('Municipio e obrigatorio');
    }

    await updateUserPasswordWithEdgeFunction(
      userId,
      novaSenha,
      'Atualizacao de senha demorou demais. Tente novamente.'
    );

    await upsertFirstAccessTeamMembership({
      userId,
      userEmail,
      municipio,
      microregiaoId,
    });

    await updateProfileRecord(userId, {
      first_access: false,
      municipio,
      updated_at: new Date().toISOString(),
    });

    log('authService', 'Primeiro acesso concluido com sucesso');
  } catch (error: any) {
    logError('authService', 'Erro no processo de primeiro acesso', error);
    throw error;
  }
}
