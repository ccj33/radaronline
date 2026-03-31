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
 * Parseia microregiao_id (pode ser "MR001" ou "MR001,MR005,MR072") em array.
 * Retrocompatível: IDs únicos retornam array de 1 elemento.
 */
export const parseMicroregiaoIds = (rawId: string | null | undefined): string[] => {
    if (!rawId || rawId === 'all') return [];
    return rawId.split(',').map(s => s.trim()).filter(Boolean);
};

/**
 * Formata array de IDs de volta para string comma-separated (para salvar no DB).
 */
export const formatMicroregiaoIds = (ids: string[]): string => {
    return ids.join(',');
};

/**
 * Verifica se a microrregião do usuário corresponde à microrregião alvo.
 * Suporta gestores com múltiplas micros (microregiaoIds[]).
 */
export const canMatchMicro = (
    userMicroId: string | undefined,
    targetMicroId?: string,
    microregiaoIds?: string[]
): boolean => {
    if (!targetMicroId) return true;
    if (userMicroId === 'all') return true;
    if (microregiaoIds?.length && microregiaoIds.includes(targetMicroId)) return true;
    return targetMicroId === userMicroId;
};
