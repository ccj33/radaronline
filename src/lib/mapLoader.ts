import { logError } from './logger';

// Tipos simplificados para o GeoJSON (apenas o que usamos)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoJSON = any;

interface MapData {
    micros: GeoJSON;
    macros: GeoJSON;
    timestamp: number;
}

// Cache em memória (singleton)
let mapCache: MapData | null = null;
let loadPromise: Promise<MapData> | null = null;

const CACHE_KEY = 'radar_map_data_v1';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 horas (mapas mudam raramente)

export const MapDataLoader = {
    /**
     * Carrega os dados do mapa (Microrregiões e Macrorregiões)
     * Usa estratégia Cache-First (Memória -> Cache Storage -> Network)
     */
    load: async (): Promise<MapData> => {
        // 1. Retorna se já está em memória
        if (mapCache) {
            return mapCache;
        }

        // 2. Retorna promise em andamento (deduplication)
        if (loadPromise) {
            return loadPromise;
        }

        // 3. Inicia carregamento
        loadPromise = (async () => {
            try {
                // Tenta carregar do Cache API do navegador (persistente entre reloads)
                if ('caches' in window) {
                    try {
                        const cache = await caches.open('radar-static-assets');
                        const cachedResponse = await cache.match(CACHE_KEY);

                        if (cachedResponse) {
                            const data = await cachedResponse.json();
                            // Verificar TTL simples
                            if (Date.now() - data.timestamp < CACHE_TTL) {
                                mapCache = data;
                                // console.log('[MapLoader] Cache hit (Storage)');
                                return data;
                            }
                        }
                    } catch (e) {
                        // Ignora erro de cache e vai pra rede
                        console.warn('[MapLoader] Cache storage error', e);
                    }
                }

                // Carrega da rede
                const [microsRes, macrosRes] = await Promise.all([
                    fetch('/data/minas-microregions-optimized.json'),
                    fetch('/data/minas-macroregions-optimized.json')
                ]);

                // Paraleliza o parse do JSON
                const [micros, macros] = await Promise.all([
                    microsRes.json(),
                    macrosRes.json()
                ]);

                const data: MapData = {
                    micros,
                    macros,
                    timestamp: Date.now()
                };

                // Salva no Cache Storage para próximos reloads
                if ('caches' in window) {
                    try {
                        const cache = await caches.open('radar-static-assets');
                        const response = new Response(JSON.stringify(data), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                        await cache.put(CACHE_KEY, response);
                    } catch {
                        // Ignora
                    }
                }

                mapCache = data;
                return data;
            } catch (error) {
                logError('MapLoader', 'Erro ao carregar mapas', error);
                throw error;
            } finally {
                loadPromise = null;
            }
        })();

        return loadPromise;
    },

    /**
     * Limpa o cache (útil se atualizarmos os arquivos JSON)
     */
    clearCache: async () => {
        mapCache = null;
        if ('caches' in window) {
            await caches.delete('radar-static-assets');
        }
    }
};
