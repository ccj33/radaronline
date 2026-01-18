// =====================================
// HELPERS DE AUTORIZAÇÃO CENTRALIZADOS
// =====================================

/**
 * Verifica se o role é admin ou superadmin
 */
export const isAdminLike = (role?: string): boolean => {
    return role === 'admin' || role === 'superadmin';
};

/**
 * Verifica se o role é superadmin
 */
export const isSuperAdmin = (role?: string): boolean => {
    return role === 'superadmin';
};

/**
 * Verifica se a microrregião do usuário corresponde à microrregião alvo.
 * Retorna true se:
 * - Não há microrregião alvo (targetMicroId undefined/null)
 * - Usuário tem acesso a todas as microrregiões ('all')
 * - Microrregiões coincidem
 */
export const canMatchMicro = (
    userMicroId: string | undefined,
    targetMicroId?: string
): boolean => {
    if (!targetMicroId) return true;
    if (userMicroId === 'all') return true;
    return targetMicroId === userMicroId;
};
