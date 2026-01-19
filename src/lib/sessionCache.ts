/**
 * Session Cache - Cache de dados para reload instantâneo
 * 
 * Estratégia: Stale-While-Revalidate
 * - Retorna dados do cache imediatamente para render instantâneo
 * - Background refresh mantém dados sincronizados
 * 
 * @version 2.0 - Inclui microId na chave para evitar colisões
 */

const CACHE_PREFIX = 'radar_cache_v2_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

/**
 * Gera chave de cache com namespace e microId
 */
function makeCacheKey(key: string, microId?: string): string {
    return microId ? `${key}:${microId}` : `${key}:all`;
}

/**
 * Salva dados no cache com TTL implícito
 */
export function setCache<T>(key: string, data: T, microId?: string): void {
    try {
        const finalKey = CACHE_PREFIX + makeCacheKey(key, microId);
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
        };
        sessionStorage.setItem(finalKey, JSON.stringify(entry));
    } catch (e) {
        // sessionStorage cheio - tentar limpar caches antigos
        try {
            invalidateExpiredCaches();
            const finalKey = CACHE_PREFIX + makeCacheKey(key, microId);
            const entry: CacheEntry<T> = { data, timestamp: Date.now() };
            sessionStorage.setItem(finalKey, JSON.stringify(entry));
        } catch {
            console.warn('[Cache] Falha ao salvar após cleanup:', key);
        }
    }
}

/**
 * Recupera dados do cache se ainda válidos
 */
export function getCache<T>(key: string, microId?: string): T | null {
    try {
        const finalKey = CACHE_PREFIX + makeCacheKey(key, microId);
        const raw = sessionStorage.getItem(finalKey);
        if (!raw) return null;

        const entry: CacheEntry<T> = JSON.parse(raw);

        // Verificar TTL
        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
            sessionStorage.removeItem(finalKey);
            return null;
        }

        return entry.data;
    } catch {
        return null;
    }
}

/**
 * Invalida cache específico
 */
export function invalidateCache(key: string, microId?: string): void {
    const finalKey = CACHE_PREFIX + makeCacheKey(key, microId);
    sessionStorage.removeItem(finalKey);
}

/**
 * Invalida todo o cache do app (usar no logout)
 */
export function invalidateAllCache(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
}

/**
 * Remove caches expirados (usado quando storage está cheio)
 */
function invalidateExpiredCaches(): void {
    const keysToRemove: string[] = [];
    const now = Date.now();

    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (!key?.startsWith(CACHE_PREFIX)) continue;

        try {
            const raw = sessionStorage.getItem(key);
            if (raw) {
                const entry: CacheEntry<unknown> = JSON.parse(raw);
                if (now - entry.timestamp > CACHE_TTL_MS) {
                    keysToRemove.push(key);
                }
            }
        } catch {
            keysToRemove.push(key); // Remove entradas corrompidas
        }
    }

    keysToRemove.forEach(k => sessionStorage.removeItem(k));
}

// Chaves de cache padronizadas
export const CACHE_KEYS = {
    ACTIONS: 'actions',
    TEAMS: 'teams',
    OBJECTIVES: 'objectives',
    ACTIVITIES: 'activities',
    USER_PROFILE: 'user_profile',
} as const;
