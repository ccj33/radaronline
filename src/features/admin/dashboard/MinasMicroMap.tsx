import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronRight, ArrowLeft, MapPin, Activity } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { macroregions } from '../../../data/mapamg/macroregions';
import { useThemeSafe } from '../../../contexts/ThemeContext';
import { Action } from '../../../types';
import { MICROREGIOES, MACRORREGIOES } from '../../../data/microregioes';
import { MapDataLoader } from '../../../lib/mapLoader';
import {
    normalize,
    createGeoLookupMaps,
    findMacroKeyInObject,
    resolveMicroId,
} from '../../../utils/geoUtils';
import { logError } from '../../../lib/logger';

// Helper para determinar cor baseada no status
const getStatusColor = (status: 'otimo' | 'bom' | 'atencao' | 'critico' | 'sem_dados', isDark: boolean) => {
    switch (status) {
        case 'otimo': return isDark ? '#059669' : '#10b981'; // Emerald 600/500
        case 'bom': return isDark ? '#2563eb' : '#3b82f6'; // Blue 600/500
        case 'atencao': return isDark ? '#d97706' : '#f59e0b'; // Amber 600/500
        case 'critico': return isDark ? '#dc2626' : '#ef4444'; // Red 600/500
        default: return isDark ? '#475569' : '#cbd5e1'; // Slate 600/300
    }
};

interface MinasMicroMapProps {
    onMacroSelect?: (macroName: string | null) => void;
    onMicroSelect?: (microName: string | null) => void;
    onNavigateToObjectives?: (microId: string) => void;
    selectedMacroId?: string | null;
    selectedMicroId?: string | null;
    actions?: Action[];
}

interface HoveredInfo {
    muni?: string | null;
    micro?: string | null;
    macro?: string | null;
}


const MinasMicroMap: React.FC<MinasMicroMapProps> = ({
    onMacroSelect,
    onMicroSelect,
    onNavigateToObjectives,
    selectedMacroId,
    selectedMicroId,
    actions = []
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const geoJsonLayerRef = useRef<any>(null);
    const macroLayerRef = useRef<any>(null);
    const microBorderLayerRef = useRef<any>(null);

    // Estado de Navegação (apenas 2 níveis: MACRO e MICRO)
    const [viewLevel, setViewLevel] = useState<'MACRO' | 'MICRO'>('MACRO');
    const [selectedMacro, setSelectedMacro] = useState<string | null>(null);
    const [selectedMicro, setSelectedMicro] = useState<string | null>(null);
    const [hoveredInfo, setHoveredInfo] = useState<HoveredInfo | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Mapas de lookup centralizados (criados uma única vez)
    const geoMaps = useMemo(() => createGeoLookupMaps(), []);

    // Helper para encontrar a chave correta no objeto macroregions (case-insensitive)
    const findMacroKey = useCallback((name: string | null): string | null => {
        return findMacroKeyInObject(name, macroregions);
    }, []);

    // Helper para display amigável (Nome da Macro)
    const resolveMacroName = useCallback((term: string | null): string | null => {
        if (!term) return null;
        // Se parece um ID (MACxx), busca no mapa
        if (term.startsWith('MAC')) {
            return geoMaps.macroIdToName[term] || null;
        }
        // Tenta normalizar e buscar
        const normalized = normalize(term);
        return geoMaps.macroNormalizedToOriginal[normalized] || term;
    }, [geoMaps]);

    // Sincronizar Props com State Interno (Bidirecional)
    useEffect(() => {
        // O pai envia IDs (MAC05), mas o mapa usa Nomes (Oeste) internamente.
        // Converter ID -> Nome antes de setar o estado.
        const incomingMacroName = resolveMacroName(selectedMacroId ?? null);

        // Comparar normalizado para evitar loops desnecessários
        const currentNorm = selectedMacro ? normalize(selectedMacro) : null;
        const incomingNorm = incomingMacroName ? normalize(incomingMacroName) : null;

        if (incomingNorm !== currentNorm) {
            if (incomingMacroName && selectedMacroId !== 'all') {
                setSelectedMacro(incomingMacroName);
                setViewLevel('MICRO');
            } else if (!selectedMacroId || selectedMacroId === 'all') {
                setSelectedMacro(null);
                setSelectedMicro(null);
                setViewLevel('MACRO');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMacroId]); // Dependências internas (resolveMacroName, selectedMacro) intencionalmente omitidas para evitar loops

    useEffect(() => {
        // Idem para micro
        if (selectedMicroId !== selectedMicro) {
            if (selectedMicroId && selectedMicroId !== 'all') {
                // A micro ID aqui é o ID "MRxxx" ou o nome?
                // No AdminPanel: filters.selectedMicroId
                // O seletor de micro no DashboardFilters usa MICROREGIOES.id ("MRxxx").
                // O Mapa usa Nomes de Micro ("Alfenas/Machado").
                // PRECISAMOS CONVERTER!
                const microObj = MICROREGIOES.find(m => m.id === selectedMicroId);
                if (microObj) {
                    setSelectedMicro(microObj.nome);
                    // Se a macro não estiver setada, setar também
                    if (microObj.macrorregiao !== selectedMacro) {
                        setSelectedMacro(microObj.macrorregiao);
                        setViewLevel('MICRO'); // Permanece no nível MICRO (removido MUNI)
                        // Se selecionamos micro, o mapa deve focar nela.
                    }
                }
            } else if (!selectedMicroId || selectedMicroId === 'all') {
                setSelectedMicro(null);
                if (selectedMacro) setViewLevel('MICRO'); // Volta pra visão da macro
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMicroId]); // selectedMacro e selectedMicro intencionalmente omitidos para evitar loops

    // Efeito para ajustar zoom/visual quando o estado muda (seja por clique ou prop)
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        // Se temos uma macro selecionada e o mapa não está focado nela?
        // Implementar lógica de zoom aqui seria ideal, mas pode conflitar com o clique.
        // O clique já faz flyTo.
        // Se a mudança veio de fora (prop), precisamos fazer flyTo também.
        // Vamos extrair a lógica de zoom para uma função reutilizável se possível, ou confiar no re-render das layers e adicionar um efeito de zoom simples.

        if (selectedMacro && !selectedMicro) {
            // Zoom na macro
            // Precisamos dos bounds da macro.
            // Isso é complexo de pegar aqui sem iterar features.
            // O código de clique já faz isso.
        }

    }, [selectedMacro, selectedMicro]);


    const [loading, setLoading] = useState(true);
    const themeContext = useThemeSafe();
    const isDark = themeContext?.resolvedTheme === 'dark';

    // Paleta de cores baseada no tema
    const themeColors = useMemo(() => ({
        bg: isDark ? 'bg-slate-900' : 'bg-white',
        border: isDark ? 'border-slate-800' : 'border-slate-200',
        text: isDark ? 'text-white' : 'text-slate-900',
        textSecondary: isDark ? 'text-slate-400' : 'text-slate-500',
        headerBg: isDark ? 'bg-slate-900/95' : 'bg-white/95',
        headerBorder: isDark ? 'border-slate-700' : 'border-slate-200',
        mapBg: isDark ? '#0f172a' : '#ffffff', // Hex para Leaflet

        // Leaflet Styles
        macroFill: isDark ? '#f8fafc' : '#f1f5f9',
        macroColor: isDark ? '#94a3b8' : '#64748b',
        macroOpacity: isDark ? 0.3 : 0.5,

        macroBorder: isDark ? '#cbd5e1' : '#64748b', // Borda da Macro (Mais clara no escuro para contraste)
        microBorder: isDark ? '#475569' : '#94a3b8',

        unselectedFill: isDark ? '#e2e8f0' : '#e2e8f0',
        unselectedColor: isDark ? '#e2e8f0' : '#cbd5e1',

        muniUnselectedFill: isDark ? '#f1f5f9' : '#f8fafc',
    }), [isDark]);

    // REFS para acesso em callbacks
    const viewLevelRef = useRef<'MACRO' | 'MICRO'>('MACRO');
    const selectedMacroRef = useRef<string | null>(null);
    const selectedMicroRef = useRef<string | null>(null);
    const highlightMacroRef = useRef<any>(null);
    const clearMacroHighlightRef = useRef<any>(null);
    const applyStylesRef = useRef<any>(null);
    const handleClickRef = useRef<any>(null);
    const applyStyleToLayerRef = useRef<(layer: any) => void>(() => { });
    const onMacroSelectRef = useRef<any>(null);
    const onMicroSelectRef = useRef<any>(null);

    // Dados processados (para labels dinâmicos)
    const processedDataRef = useRef<{
        featuresByMacro: Record<string, any[]>;
        macroFeatures: any[];
    }>({
        featuresByMacro: {},
        macroFeatures: []
    });
    const labelsLayerRef = useRef<any>(null);
    const hoveredMacroRef = useRef<string | null>(null);
    const hoverLabelRef = useRef<any>(null);
    const _hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Cache de layers por macro para performance (evita iteração em 853 layers)
    const layersByMacroRef = useRef<Record<string, any[]>>({});
    // Cache de layers por micro para performance
    const layersByMicroRef = useRef<Record<string, any[]>>({});
    // Cache de centros das macros (pré-calculados)
    const macroCentersRef = useRef<Record<string, [number, number]>>({});
    // Cache de centros das micros (pré-calculados)
    const microCentersRef = useRef<Record<string, { lat: number; lng: number; area: number }>>({});






    // REMOVIDO: Os useEffects de notificação causavam loop infinito!
    // A sincronização agora é feita diretamente nos handlers (handleClick, handleBack).
    // Não precisamos notificar o pai quando o estado muda - o pai já sabe,
    // porque ou ele mandou a prop (e o estado veio de lá), ou o clique disparou o callback.

    // Atalho de teclado ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                // Um ESC volta para MACRO (reset completo)
                if (viewLevelRef.current === 'MICRO') {
                    setViewLevel('MACRO');
                    setSelectedMacro(null);
                    setSelectedMicro(null);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Rastreamento do mouse para tooltip magnético
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);


    // Pré-agrupar ações por microregiaoId para otimização O(N)
    const actionsByMicroId = useMemo(() => {
        const map: Record<string, Action[]> = {};
        actions.forEach(action => {
            if (!action.microregiaoId) return;
            const normId = normalize(action.microregiaoId);
            if (!map[normId]) map[normId] = [];
            map[normId].push(action);
        });
        return map;
    }, [actions]);

    // Processamento de Cores e Dados (Memoizado) - OTIMIZADO O(N+M)
    const { macroColorMap, microColorMap, microStats, macroStats } = useMemo(() => {
        // Estatísticas por microrregião
        const mStats: Record<string, { status: 'otimo' | 'bom' | 'atencao' | 'critico' | 'sem_dados', concluidas: number, atrasadas: number, total: number }> = {};
        const micColorMap: Record<string, string> = {};

        // Mapa auxiliar para agregar dados das macros (usando chaves normalizadas)
        const macroAggregation: Record<string, { total: number, concluidas: number, atrasadas: number, originalName: string }> = {};

        const now = new Date();

        // Iterar diretamente sobre MICROREGIOES (fonte de verdade única)
        MICROREGIOES.forEach((micro) => {
            // Acesso O(1) ao dicionário pré-computado (ID normalizado)
            const normMicroId = normalize(micro.id);
            const microActions = actionsByMicroId[normMicroId] || [];
            const total = microActions.length;
            const concluidas = microActions.filter(a => a.status === 'Concluído').length;
            const atrasadas = microActions.filter(a => {
                if (a.status === 'Concluído') return false;
                return a.plannedEndDate && new Date(a.plannedEndDate) < now;
            }).length;

            let status: 'otimo' | 'bom' | 'atencao' | 'critico' | 'sem_dados' = 'sem_dados';

            if (total > 0) {
                const taxa = (concluidas / total) * 100;
                if (atrasadas > 2) status = 'critico';
                else if (taxa >= 80) status = 'otimo';
                else if (taxa >= 50) status = 'bom';
                else status = 'atencao';
            }

            // Agregar para a Macro
            if (micro.macrorregiao) {
                const normMacroName = normalize(micro.macrorregiao);
                if (!macroAggregation[normMacroName]) {
                    macroAggregation[normMacroName] = { total: 0, concluidas: 0, atrasadas: 0, originalName: micro.macrorregiao };
                }
                const agg = macroAggregation[normMacroName];
                agg.total += total;
                agg.concluidas += concluidas;
                agg.atrasadas += atrasadas;
            }

            const statsObj = { status, concluidas, atrasadas, total };
            const color = getStatusColor(status, isDark);

            // Armazenar por ID e por Nome Normalizado para máxima robustez
            mStats[normMicroId] = statsObj;
            mStats[normalize(micro.nome)] = statsObj;

            micColorMap[normMicroId] = color;
            micColorMap[normalize(micro.nome)] = color;
        });

        // Cores e Stats para Macros (Baseado na agregação)
        const mColorMap: Record<string, string> = {};
        const macroStatsResult: Record<string, { total: number, concluidas: number, atrasadas: number }> = {};

        Object.keys(macroregions).forEach((macroName) => {
            const normKey = normalize(macroName);
            const data = macroAggregation[normKey] || { total: 0, concluidas: 0, atrasadas: 0 };

            macroStatsResult[normKey] = data;
            macroStatsResult[macroName] = data; // Manter original para compatibilidade

            let status: 'otimo' | 'bom' | 'atencao' | 'critico' | 'sem_dados' = 'sem_dados';

            if (data.total > 0) {
                const taxa = (data.concluidas / data.total) * 100;
                if (data.atrasadas > 5) status = 'critico';
                else if (taxa >= 80) status = 'otimo';
                else if (taxa >= 50) status = 'bom';
                else status = 'atencao';
            }

            const color = getStatusColor(status, isDark);
            mColorMap[normKey] = color;
            mColorMap[macroName] = color;
        });

        return { macroColorMap: mColorMap, microColorMap: micColorMap, microStats: mStats, macroStats: macroStatsResult };
    }, [isDark, actionsByMicroId]);

    // Atualizar Labels
    const updateLabels = useCallback(() => {
        if (!mapInstanceRef.current || !labelsLayerRef.current) return;

        labelsLayerRef.current.clearLayers();
        const currentLevel = viewLevel; // ESTADO DIRETAMENTE
        const currentMacro = selectedMacro; // ESTADO DIRETAMENTE

        const createLabel = (center: [number, number], name: string, fontSize = '11px') => {
            try {
                const [lat, lng] = center;

                const marker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: 'map-label',
                        html: `<div style="
              display: flex;
              justify-content: center;
              align-items: center;
              text-align: center;
              transform: translate(-50%, -50%);
              font-size: ${fontSize};
              font-weight: bold;
              color: ${isDark ? '#f8fafc' : '#1e3a8a'};
              text-shadow: 
                1px 1px 0 ${isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}, 
                -1px -1px 0 ${isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}, 
                1px -1px 0 ${isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}, 
                -1px 1px 0 ${isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'};
              pointer-events: none;
              width: 150px; 
              line-height: 1.1;
            ">${name}</div>`,
                        iconSize: [0, 0],
                        iconAnchor: [0, 0]
                    }),
                    interactive: false
                });
                return marker;
            } catch {
                return null;
            }
        };

        if (currentLevel === 'MACRO') {
            processedDataRef.current.macroFeatures.forEach(feature => {
                const name = feature.properties.macroName;
                const cachedCenter = macroCentersRef.current[name];
                if (cachedCenter) {
                    const label = createLabel(cachedCenter, name, '11px');
                    if (label) labelsLayerRef.current.addLayer(label);
                }
            });
        } else if (currentLevel === 'MICRO' && currentMacro) {
            // Resolver chave correta para o objeto macroregions
            const macroKey = findMacroKey(currentMacro) || '';
            const macroMicros = (macroregions as Record<string, string[]>)[macroKey] || [];
            const cachedCenters = microCentersRef.current;

            const relevantCenters = macroMicros
                .filter(microName => cachedCenters[microName])
                .map(microName => ({
                    microName,
                    ...cachedCenters[microName]
                }));

            const MIN_DISTANCE = 0.15;
            const adjustedCenters = relevantCenters.map((item, i) => {
                let adjLat = item.lat;
                let adjLng = item.lng;

                for (let j = 0; j < i; j++) {
                    const other = relevantCenters[j];
                    const dist = Math.sqrt(
                        Math.pow(item.lat - other.lat, 2) +
                        Math.pow(item.lng - other.lng, 2)
                    );

                    if (dist < MIN_DISTANCE) {
                        const angle = Math.atan2(item.lat - other.lat, item.lng - other.lng);
                        const offset = MIN_DISTANCE - dist + 0.05;
                        adjLat += Math.sin(angle) * offset;
                        adjLng += Math.cos(angle) * offset;
                    }
                }

                return { ...item, adjLat, adjLng };
            });

            const avgArea = relevantCenters.reduce((sum, m) => sum + m.area, 0) / (relevantCenters.length || 1);

            adjustedCenters.forEach(item => {
                if (item.area < avgArea * 0.08) return;

                const marker = L.marker([item.adjLat, item.adjLng], {
                    icon: L.divIcon({
                        className: 'map-label',
                        html: `<div style="
                            display: flex; justify-content: center; align-items: center;
                            text-align: center; transform: translate(-50%, -50%);
                            font-size: 9px; font-weight: bold; color: ${isDark ? '#f8fafc' : '#1e3a8a'};
                            text-shadow: 1px 1px 0 ${isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}, -1px -1px 0 ${isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}, 1px -1px 0 ${isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}, -1px 1px 0 ${isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'};
                            pointer-events: none; width: 100px; line-height: 1.1;
                        ">${item.microName}</div>`,
                        iconSize: [0, 0],
                        iconAnchor: [0, 0]
                    }),
                    interactive: false
                });
                labelsLayerRef.current.addLayer(marker);
            });
        }
    }, [viewLevel, selectedMacro, isDark, findMacroKey]);


    // Aplicar estilo correto a UMA layer (para mouseout performático)
    const applyStyleToLayer = useCallback((layer: any) => {
        const props = layer.feature.properties;
        const muniMacro = props.macroName;
        const muniMicro = props.microName;

        const currentLevel = viewLevel; // ESTADO DIRETAMENTE
        const currentMacro = selectedMacro; // ESTADO DIRETAMENTE
        const currentMicro = selectedMicro; // ESTADO DIRETAMENTE

        let fillColor = '#cbd5e1';
        let color = 'transparent'; // SEM bordas de município
        let weight = 0;
        let fillOpacity = 1;

        if (currentLevel === 'MACRO') {
            if (muniMacro && muniMacro !== "Desconhecida") {
                // Buscar cor no mapa (normalize importado)
                const macroKey = Object.keys(macroColorMap).find(k => normalize(k) === normalize(muniMacro));

                const dynamicColor = macroKey ? macroColorMap[macroKey] : themeColors.macroFill;

                fillColor = dynamicColor !== themeColors.macroFill ? dynamicColor : themeColors.macroFill;
                fillOpacity = dynamicColor !== themeColors.macroFill ? 0.6 : themeColors.macroOpacity;

                color = 'transparent'; // SEM bordas de município
                weight = 0;
            }
        } else if (currentLevel === 'MICRO') {
            // Normalização case-insensitive
            const muniMacroNorm = muniMacro ? normalize(muniMacro) : '';
            const currentMacroNorm = currentMacro ? normalize(currentMacro) : '';

            if (muniMacroNorm && muniMacroNorm === currentMacroNorm) {
                // Dentro da macro selecionada
                const microStatKey = normalize(muniMicro);
                const microStat = microStats[microStatKey];
                if (microStat) {
                    fillColor = getStatusColor(microStat.status, isDark);
                } else if (microColorMap[muniMicro]) {
                    fillColor = microColorMap[muniMicro];
                }
                // Destaque extra se for a micro selecionada
                if (currentMicro && muniMicro === currentMicro) {
                    fillOpacity = 1;
                } else if (currentMicro) {
                    // Outras micros ficam mais transparentes quando uma está selecionada
                    fillOpacity = 0.4;
                } else {
                    fillOpacity = 0.85;
                }
            } else {
                // Fora da macro selecionada
                fillColor = '#e2e8f0';
                fillOpacity = 0.2;
            }
        }

        layer.setStyle({ fillColor, color, weight, fillOpacity });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewLevel, selectedMacro, selectedMicro, microColorMap, macroColorMap, themeColors]); // isDark e microStats usados indiretamente



    // Função de estilo (aplica a TODAS as layers)
    const applyStyles = useCallback(() => {
        if (!geoJsonLayerRef.current) return;

        const currentLevel = viewLevel; // ESTADO DIRETAMENTE
        const currentMacro = selectedMacro; // ESTADO DIRETAMENTE
        const currentMicro = selectedMicro; // ESTADO DIRETAMENTE

        geoJsonLayerRef.current.eachLayer((layer: any) => {
            const props = layer.feature.properties;
            const muniMacro = props.macroName;
            const muniMicro = props.microName;

            let fillColor = '#cbd5e1';
            const color = 'transparent';
            const weight = 0;
            let fillOpacity = 1;

            if (currentLevel === 'MACRO') {
                if (muniMacro && muniMacro !== "Desconhecida") {
                    const macroKey = Object.keys(macroColorMap).find(k => normalize(k) === normalize(muniMacro));
                    const dynamicColor = macroKey ? macroColorMap[macroKey] : themeColors.macroFill;
                    fillColor = dynamicColor;
                    // Opacidade ligeiramente reduzida para o nível macro para não ser tão cansativo
                    fillOpacity = dynamicColor !== themeColors.macroFill ? 0.5 : themeColors.macroOpacity;
                }
            }

            const muniMacroNorm = muniMacro ? normalize(muniMacro) : '';
            const currentMacroNorm = currentMacro ? normalize(currentMacro) : '';
            const muniMicroNorm = muniMicro ? normalize(muniMicro) : '';
            const currentMicroNorm = currentMicro ? normalize(currentMicro) : '';

            if (currentLevel === 'MICRO') {
                if (muniMacroNorm && currentMacroNorm && muniMacroNorm === currentMacroNorm) {
                    const microStatKey = normalize(muniMicro);
                    const microStat = microStats[microStatKey];

                    if (microStat) {
                        fillColor = getStatusColor(microStat.status, isDark);
                    } else {
                        let microColor = microColorMap[muniMicro];
                        if (!microColor) {
                            const microKey = Object.keys(microColorMap).find(k => normalize(k) === normalize(muniMicro));
                            if (microKey) microColor = microColorMap[microKey];
                        }
                        if (microColor) fillColor = microColor;
                    }

                    if (currentMicroNorm && muniMicroNorm === currentMicroNorm) {
                        fillOpacity = 1;
                    } else if (currentMicro) {
                        fillOpacity = 0.4;
                    } else {
                        fillOpacity = 0.85;
                    }
                } else {
                    fillColor = themeColors.unselectedFill;
                    fillOpacity = 0.2;
                }
            }

            layer.setStyle({ fillColor, color, weight, fillOpacity });
        });

        if (macroLayerRef.current) {
            macroLayerRef.current.setStyle({
                opacity: currentLevel === 'MACRO' ? 1 : 0.8,
                weight: currentLevel === 'MACRO' ? 3 : 2.5,
                color: themeColors.macroBorder
            });
        }

        if (microBorderLayerRef.current) {
            microBorderLayerRef.current.setStyle({
                opacity: currentLevel === 'MACRO' ? 0.3 : 0.6,
                weight: currentLevel === 'MACRO' ? 0.5 : 1.2,
                color: themeColors.microBorder
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewLevel, selectedMacro, selectedMicro, microColorMap, macroColorMap, themeColors, isDark]); // microStats usado indiretamente

    // Aplicar estilos e labels quando estado muda
    useEffect(() => {
        applyStyles();
        updateLabels();
    }, [viewLevel, selectedMacro, selectedMicro, applyStyles, updateLabels]);

    // Efeito para Transições Suaves de Câmera - DESABILITADO por pedido do usuário
    // O mapa não dará mais zoom automaticamente quando clicar em regiões
    /*
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
 
        // Configuração de animação
        const flyOptions = {
            animate: true,
            duration: 1.2, // Duração em segundos (mais lento = mais "cinematográfico")
            easeLinearity: 0.25
        };
 
        if (viewLevel === 'MACRO' && !selectedMacro) {
            // Visão Geral de MG
            map.flyTo([-18.5, -44.5], 6, flyOptions);
        } else if (selectedMacro && !selectedMicro) {
            // Focar na Macrorregião
            // Resgatar layers da macro para calcular bounds
            if (layersByMacroRef.current && layersByMacroRef.current[selectedMacro]) {
                const group = L.featureGroup(layersByMacroRef.current[selectedMacro]);
                const bounds = group.getBounds();
                // Pequeno padding para não colar na borda
                map.fitBounds(bounds, { ...flyOptions, padding: [20, 20], maxZoom: 8.5 });
            }
        } else if (selectedMicro) {
            // Focar na Microrregião
            if (layersByMicroRef.current && layersByMicroRef.current[selectedMicro]) {
                const group = L.featureGroup(layersByMicroRef.current[selectedMicro]);
                const bounds = group.getBounds();
                map.fitBounds(bounds, { ...flyOptions, padding: [40, 40], maxZoom: 10 });
            }
        }
    }, [viewLevel, selectedMacro, selectedMicro]);
    */

    // Click handler
    const handleClick = useCallback((props: { macroName: string; microName: string }) => {
        const { macroName, microName } = props;
        const currentLevel = viewLevel; // ESTADO DIRETAMENTE
        const currentMacro = selectedMacro; // ESTADO DIRETAMENTE
        const currentMicro = selectedMicro; // ESTADO DIRETAMENTE

        if (!macroName || macroName === "Desconhecida") return;

        const getMacroId = (name: string) => {
            const normalized = normalize(name);
            const found = MACRORREGIOES.find(m => normalize(m.nome) === normalized);
            return found?.id || null;
        };

        const getMicroId = (name: string) => {
            const normalized = normalize(name);
            const found = MICROREGIOES.find(m => normalize(m.nome) === normalized);
            return found?.id || null;
        };

        if (currentLevel === 'MACRO') {
            setSelectedMacro(macroName);
            setSelectedMicro(null);
            setViewLevel('MICRO');
            if (onMacroSelect) onMacroSelect(getMacroId(macroName));
            if (onMicroSelect) onMicroSelect(null);
        } else if (currentLevel === 'MICRO') {
            if (normalize(macroName) !== normalize(currentMacro || '')) {
                setSelectedMacro(macroName);
                setSelectedMicro(null);
                if (onMacroSelect) onMacroSelect(getMacroId(macroName));
                if (onMicroSelect) onMicroSelect(null);
            } else if (microName && microName !== "Desconhecida") {
                if (currentMicro === microName) {
                    setSelectedMicro(null);
                    if (onMicroSelect) onMicroSelect(null);
                } else {
                    setSelectedMicro(microName);
                    if (onMicroSelect) {
                        const id = getMicroId(microName);
                        if (id) onMicroSelect(id);
                    }
                }
            }
        }
    }, [viewLevel, selectedMacro, selectedMicro, onMacroSelect, onMicroSelect]);

    // Highlight de macro inteira - OTIMIZADO com cache
    const highlightMacro = useCallback((macroName: string) => {
        if (!geoJsonLayerRef.current || !mapInstanceRef.current) return;
        if (hoveredMacroRef.current === macroName) return;

        // Limpar label anterior
        if (hoverLabelRef.current) {
            mapInstanceRef.current.removeLayer(hoverLabelRef.current);
            hoverLabelRef.current = null;
        }

        // Restaurar estilos anteriores usando resetMacro
        if (hoveredMacroRef.current && hoveredMacroRef.current !== macroName) {
            if (layersByMacroRef.current[hoveredMacroRef.current]) {
                layersByMacroRef.current[hoveredMacroRef.current].forEach((layer: any) => {
                    applyStyleToLayerRef.current(layer);
                });
            }
        }

        hoveredMacroRef.current = macroName;
        if (!macroName) return;

        // Aplicar highlight usando cache (MUITO mais rápido)
        const macroLayers = layersByMacroRef.current[macroName];
        if (macroLayers) {
            // Resolver cor da macro (usar normalize importado)
            const macroKey = Object.keys(macroColorMap).find(k => normalize(k) === normalize(macroName));
            const statusColor = macroKey ? macroColorMap[macroKey] : null;

            // Se tiver cor de status, usa ela com mais opacidade. Se não, usa azul.
            const highlightFill = statusColor || '#3b82f6';

            macroLayers.forEach((layer: any) => {
                layer.setStyle({
                    fillOpacity: statusColor ? 0.9 : 0.6, // Mais opaco se for status, médio se for destaque genérico
                    fillColor: highlightFill,
                    weight: 2
                });
                layer.bringToFront();
            });
        }

        if (macroLayerRef.current) {
            macroLayerRef.current.bringToFront();
        }

        // Usar centro pré-calculado (evita turf no hover)
        const cachedCenter = macroCentersRef.current[macroName];
        if (cachedCenter) {
            const [lat, lng] = cachedCenter;
            const label = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'hover-macro-label',
                    html: `<div style="
                        display: flex; justify-content: center; align-items: center;
                        text-align: center; transform: translate(-50%, -50%);
                        font-size: 18px; font-weight: bold; color: #ffffff;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.9);
                        white-space: nowrap;
                        pointer-events: none; letter-spacing: 1px;
                    ">${macroName}</div>`,
                    iconSize: [0, 0],
                    iconAnchor: [0, 0]
                }),
                interactive: false,
                zIndexOffset: 1000
            });
            label.addTo(mapInstanceRef.current);
            hoverLabelRef.current = label;
        }
    }, [macroColorMap]);


    const clearMacroHighlight = useCallback(() => {
        if (hoverLabelRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(hoverLabelRef.current);
            hoverLabelRef.current = null;
        }

        // Limpar estilo da macro anterior
        const prevMacro = hoveredMacroRef.current;
        if (prevMacro && layersByMacroRef.current[prevMacro]) {
            layersByMacroRef.current[prevMacro].forEach((layer: any) => {
                applyStyleToLayerRef.current(layer);
            });
        }

        hoveredMacroRef.current = null;
    }, []);

    const handleBack = () => {
        // Navegação simplificada: volta para MACRO (reset completo)
        if (viewLevel === 'MICRO') {
            setViewLevel('MACRO');
            setSelectedMacro(null);
            setSelectedMicro(null);
            if (onMacroSelect) onMacroSelect(null);
            if (onMicroSelect) onMicroSelect(null);
        }
    };

    // Handler seguro para o clique no fundo (Reset Total)
    const handleBackgroundClick = useCallback(() => {
        if (viewLevel !== 'MACRO') {
            setViewLevel('MACRO');
            setSelectedMacro(null);
            setSelectedMicro(null);
            if (onMacroSelect) onMacroSelect(null);
            if (onMicroSelect) onMicroSelect(null);
        }
    }, [viewLevel, onMacroSelect, onMicroSelect]);

    // Sincronizar refs com estado e funções (para evitar stale closures em eventos Leaflet)
    useEffect(() => {
        viewLevelRef.current = viewLevel;
        selectedMacroRef.current = selectedMacro;
        selectedMicroRef.current = selectedMicro;
        highlightMacroRef.current = highlightMacro;
        clearMacroHighlightRef.current = clearMacroHighlight;
        applyStylesRef.current = applyStyles;
        handleClickRef.current = handleClick;
        applyStyleToLayerRef.current = applyStyleToLayer;
        onMacroSelectRef.current = onMacroSelect;
        onMicroSelectRef.current = onMicroSelect;
    }, [viewLevel, selectedMacro, selectedMicro, highlightMacro, clearMacroHighlight, applyStyles, handleClick, applyStyleToLayer, onMacroSelect, onMicroSelect]);

    // Inicialização do mapa
    useEffect(() => {
        // Leaflet agora é importado via npm - não precisa mais carregar CDN
        const initMap = async () => {

            if (!mapContainerRef.current || mapInstanceRef.current) return;

            try {
                const map = L.map(mapContainerRef.current, {
                    center: [-18.5, -44.5], // Leve ajuste no centro
                    zoom: 6,
                    zoomControl: false,
                    attributionControl: false,
                    dragging: true,
                    scrollWheelZoom: false, // Desabilitado por padrão - só ativa quando mouse está sobre o mapa
                    doubleClickZoom: false,
                    boxZoom: false,
                    keyboard: false,
                    touchZoom: false,
                    zoomSnap: 0.1, // Zoom MUITO suave (profissional)
                    zoomDelta: 0.1,
                    wheelPxPerZoomLevel: 60, // Padrão mais controlado
                    minZoom: 5,
                    maxZoom: 12,
                    renderer: L.canvas() // OTIMIZAÇÃO: Usar Canvas para renderizar (muito mais rápido para muitas geometrias)
                });

                mapInstanceRef.current = map;

                // Carregar dados pré-processados otimizados
                // Carregar dados pré-processados otimizados via Loader com Cache
                const mapData = await MapDataLoader.load();
                const microsData = mapData.micros;
                const macrosData = mapData.macros;

                // Configurar caches de centros a partir dos features otimizados
                const macroLabelAdjustments: Record<string, [number, number]> = {
                    "SUL": [-0.35, 0.4], "SUDESTE": [-0.1, 0.2], "OESTE": [0, 0.35],
                    "TRIÂNGULO DO SUL": [-0.2, 0.2], "NOROESTE": [-0.1, 0], "JEQUITINHONHA": [0, -0.2]
                };

                // Extrair centros das macros a partir do GeoJSON otimizado
                const adjustedMacroCenters: Record<string, [number, number]> = {};
                macrosData.features.forEach((f: any) => {
                    const macroName = f.properties.macroName;
                    if (macroName && f.properties.center) {
                        let [lng, lat] = f.properties.center; // GeoJSON usa [lng, lat]
                        // Converter para [lat, lng] que é o que Leaflet espera
                        if (macroLabelAdjustments[macroName]) {
                            const [adjLat, adjLng] = macroLabelAdjustments[macroName];
                            lat += adjLat;
                            lng += adjLng;
                        }
                        adjustedMacroCenters[macroName] = [lat, lng];
                    }
                });
                macroCentersRef.current = adjustedMacroCenters;

                // Extrair centros das micros a partir do GeoJSON otimizado
                const microCenters: Record<string, { lat: number; lng: number; area: number }> = {};
                microsData.features.forEach((f: any) => {
                    const microName = f.properties.microName;
                    if (microName && f.properties.center) {
                        const [lng, lat] = f.properties.center; // GeoJSON usa [lng, lat]
                        microCenters[microName] = {
                            lat,
                            lng,
                            area: f.properties.area || 0
                        };
                    }
                });
                microCentersRef.current = microCenters;

                // Preparar cache de features por macro (para labels)
                const featuresByMacro: Record<string, any[]> = {};
                microsData.features.forEach((f: any) => {
                    const mName = f.properties.macroName;
                    if (mName && mName !== "Desconhecida") {
                        if (!featuresByMacro[mName]) featuresByMacro[mName] = [];
                        featuresByMacro[mName].push(f);
                    }
                });

                processedDataRef.current = {
                    featuresByMacro,
                    macroFeatures: macrosData.features
                };

                // 1. Layer de Microrregiões
                const layer = L.geoJSON(microsData, {
                    style: () => ({
                        fillColor: themeColors.macroFill,
                        color: 'transparent', // SEM bordas de município
                        weight: 0,
                        fillOpacity: themeColors.macroOpacity
                    }),
                    onEachFeature: (feature: any, lyr: any) => {
                        lyr.on({
                            mouseover: () => {
                                const props = feature.properties;
                                const currentLevel = viewLevelRef.current;
                                const currentMacro = selectedMacroRef.current;
                                const isCurrentMacro = props.macroName === currentMacro;

                                // Habilitar scroll zoom quando mouse está sobre uma região
                                mapInstanceRef.current?.scrollWheelZoom.enable();

                                if (currentLevel === 'MACRO') {
                                    // Nível MACRO: mostra apenas info da macro
                                    setHoveredInfo({ macro: props.macroName, micro: null, muni: null });
                                    highlightMacroRef.current?.(props.macroName);
                                } else {
                                    // Nível MICRO
                                    if (isCurrentMacro) {
                                        // Dentro da macro selecionada: mostra micro + macro
                                        setHoveredInfo({ micro: props.microName, macro: props.macroName, muni: null });
                                        lyr.setStyle({ fillOpacity: 0.9, weight: 2 });
                                    } else {
                                        // Macro vizinha: mostra apenas info da macro
                                        setHoveredInfo({ macro: props.macroName, micro: null, muni: null });
                                        highlightMacroRef.current?.(props.macroName);
                                    }
                                }
                            },
                            mouseout: () => {
                                setHoveredInfo(null);
                                clearMacroHighlightRef.current?.();
                                applyStylesRef.current?.();
                                // Desabilitar scroll zoom quando mouse sai da região
                                mapInstanceRef.current?.scrollWheelZoom.disable();
                            },
                            click: (e: any) => {
                                L.DomEvent.stopPropagation(e); // Importante: Parar propagação para não ativar o click do mapa
                                handleClickRef.current?.(feature.properties);
                            }
                        });
                    }
                });
                geoJsonLayerRef.current = layer;
                layer.addTo(map);

                // Popular caches de layers (O(n))
                const layersByMacro: Record<string, any[]> = {};
                const layersByMicro: Record<string, any[]> = {};

                layer.eachLayer((l: any) => {
                    const pf = l.feature?.properties;
                    if (pf) {
                        if (pf.macroName && pf.macroName !== "Desconhecida") {
                            if (!layersByMacro[pf.macroName]) layersByMacro[pf.macroName] = [];
                            layersByMacro[pf.macroName].push(l);
                        }
                        if (pf.microName && pf.microName !== "Desconhecida") {
                            if (!layersByMicro[pf.microName]) layersByMicro[pf.microName] = [];
                            layersByMicro[pf.microName].push(l);
                        }
                    }
                });
                layersByMacroRef.current = layersByMacro;
                layersByMicroRef.current = layersByMicro;

                // 2. Layer de Bordas das Microrregiões (Pontilhado Elegante)
                const microBorderLayer = L.geoJSON(microsData, {
                    style: {
                        color: themeColors.microBorder,
                        weight: 1.5, // Levemente mais espesso para o pontilhado aparecer bem
                        fillOpacity: 0,
                        interactive: false,
                        dashArray: '2, 6', // Pontilhado mais "espaçado" e elegante (pontos)
                        lineCap: 'round',  // Pontas arredondadas (faz ficar parecendo bolinhas)
                        lineJoin: 'round',
                        opacity: 0.8
                    }
                });
                microBorderLayerRef.current = microBorderLayer;
                microBorderLayer.addTo(map);

                // 3. Layer de Bordas das Macrorregiões
                const macroLayer = L.geoJSON(macrosData, {
                    style: { color: themeColors.macroBorder, weight: 2.5, fillOpacity: 0, interactive: false }
                });
                macroLayerRef.current = macroLayer;
                macroLayer.addTo(map);

                const labelsLayer = L.layerGroup().addTo(map);
                labelsLayerRef.current = labelsLayer;

                updateLabels();
                setLoading(false);

                // Handler para clique no fundo (resetar)
                map.on('click', () => {
                    if (viewLevelRef.current !== 'MACRO') {
                        setViewLevel('MACRO');
                        setSelectedMacro(null);
                        setSelectedMicro(null);
                        // Notificar pai para manter sincronização
                        onMacroSelectRef.current?.(null);
                        onMicroSelectRef.current?.(null);
                    }
                });


            } catch (err) {
                logError('MinasMicroMap', 'Erro ao carregar mapa', err);
                setLoading(false);
            }
        };

        // Iniciar
        initMap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [macroColorMap, applyStyles, applyStyleToLayer, handleClick, highlightMacro, clearMacroHighlight, updateLabels, handleBackgroundClick]); // themeColors usado internamente

    return (
        <div className={`relative w-full rounded-xl overflow-hidden isolate shadow-2xl border ${themeColors.bg} ${themeColors.border}`} style={{ minHeight: '650px' }}>
            {/* CSS para cursor pointer e transições profissionais */}
            <style>{`
                .leaflet-interactive {
                    cursor: pointer !important;
                    transition: fill 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                                fill-opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                                stroke-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .leaflet-container { background: ${themeColors.mapBg}; }
                .magnetic-tooltip {
                    position: fixed;
                    pointer-events: none;
                    z-index: 9999;
                    padding: 8px 14px;
                    background: ${isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
                    backdrop-filter: blur(8px);
                    color: ${isDark ? 'white' : '#1e293b'};
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.03em;
                    border-radius: 10px;
                    transform: translate(-50%, -150%);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                    border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'};
                }
            `}</style>

            {/* Tooltip Magnético - Segue o cursor no nível MICRO */}
            {hoveredInfo?.micro && viewLevel === 'MICRO' && (
                <div
                    className="magnetic-tooltip flex flex-col items-center gap-0.5"
                    style={{ left: mousePos.x, top: mousePos.y }}
                >
                    <span className={`text-[9px] opacity-50 font-semibold leading-none mb-0.5`}>{hoveredInfo.macro}</span>
                    <span className="whitespace-nowrap leading-none">{hoveredInfo.micro}</span>
                </div>
            )}


            {/* Legenda removida - já existe versão compacta no header */}

            {/* BARRA UNIFICADA SUPERIOR */}
            <div className={`absolute top-0 left-0 right-0 z-[1000] backdrop-blur-md border-b p-3 shadow-md transition-all ${themeColors.headerBg} ${themeColors.headerBorder}`}>
                <div className="flex flex-col gap-3">
                    {/* Linha 1: Título e Ações */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-teal-500/10 rounded-lg">
                                <MapPin className="w-5 h-5 text-teal-500" />
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg leading-tight ${themeColors.text}`}>Mapa Estratégico de MG</h3>
                                <div className={`flex items-center gap-2 mt-0.5 text-sm ${themeColors.textSecondary}`}>
                                    <span className={viewLevel === 'MACRO' ? "text-teal-500 font-medium" : "hover:text-teal-400 cursor-pointer transition"} onClick={() => { setViewLevel('MACRO'); setSelectedMacro(null); setSelectedMicro(null); onMacroSelect?.(null); onMicroSelect?.(null); }}>
                                        Minas Gerais
                                    </span>
                                    {selectedMacro && (
                                        <>
                                            <ChevronRight className="w-3 h-3 text-slate-400" />
                                            <span className={viewLevel === 'MICRO' ? "text-teal-500 font-medium" : "hover:text-teal-400 cursor-pointer transition"} onClick={() => { setViewLevel('MICRO'); setSelectedMicro(null); onMicroSelect?.(null); }}>
                                                {resolveMacroName(selectedMacro)}
                                            </span>
                                        </>
                                    )}
                                    {selectedMicro && (
                                        <>
                                            <ChevronRight className="w-3 h-3 text-slate-400" />
                                            <span className="text-teal-500 font-medium">
                                                {selectedMicro}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            {/* Legenda Compacta */}
                            <div className={`hidden md:flex items-center gap-3 text-xs p-2 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-100/80 border-slate-200'}`}>
                                <span className={`font-semibold px-1 ${themeColors.textSecondary}`}>Legenda:</span>
                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span><span className={themeColors.textSecondary}>Ótimo</span></div>
                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"></span><span className={themeColors.textSecondary}>Bom</span></div>
                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></span><span className={themeColors.textSecondary}>Atenção</span></div>
                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></span><span className={themeColors.textSecondary}>Crítico</span></div>
                            </div>

                            {/* Botão Voltar Integrado */}
                            {viewLevel !== 'MACRO' && (
                                <button
                                    onClick={handleBack}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border shadow-lg active:scale-95 text-sm font-medium ${isDark
                                        ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600 hover:border-slate-500'
                                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Voltar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Linha 2: Status / Hover Info Integrado (Substitui InfoBox) */}
                    <div className="h-6 flex items-center">
                        {hoveredInfo ? (
                            <div className="flex items-center gap-2 text-sm animate-in fade-in slide-in-from-left-2 duration-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                                <span className={`font-semibold ${themeColors.text}`}>
                                    {hoveredInfo.macro}
                                </span>
                                {hoveredInfo.micro && (
                                    <>
                                        <span className={themeColors.textSecondary}>›</span>
                                        <span className={themeColors.text}>
                                            {hoveredInfo.micro}
                                        </span>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className={`flex items-center gap-2 text-sm italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                <span>Passe o mouse sobre uma região para ver detalhes</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PAINEL LATERAL (Modal de Detalhes da Macro) */}
            {(selectedMacro && viewLevel === 'MICRO') && (
                <div className={`absolute top-24 right-6 w-80 max-h-[70vh] z-[1100] rounded-2xl flex flex-col animate-in slide-in-from-right-10 duration-500 shadow-2xl ring-1 ring-black/5 ${isDark ? 'bg-slate-900/95 ring-white/10' : 'bg-white/95'} backdrop-blur-xl`}>

                    {/* Header do Painel */}
                    <div className={`p-5 border-b flex items-center justify-between sticky top-0 bg-inherit z-10 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                        <div>
                            <span className={`text-[10px] uppercase tracking-widest font-bold ${themeColors.textSecondary} mb-1 block`}>Macrorregião</span>
                            <h3 className={`text-lg font-bold leading-none bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent`}>{resolveMacroName(selectedMacro)}</h3>
                        </div>
                        <button
                            onClick={() => {
                                setViewLevel('MACRO');
                                setSelectedMacro(null);
                                setSelectedMicro(null);
                                onMacroSelect?.(null);
                                onMicroSelect?.(null);
                            }}
                            className={`p-2 rounded-full transition-all active:scale-95 group ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
                        >
                            <span className="sr-only">Fechar</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>

                    {/* Lista de Microrregiões */}
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        <div className="space-y-1">
                            {((macroregions as Record<string, string[]>)[findMacroKey(resolveMacroName(selectedMacro)) || ''] || []).map((microName) => {
                                const isSelected = selectedMicro && normalize(selectedMicro) === normalize(microName);
                                const stat = microStats[normalize(microName)] || microStats[resolveMicroId(microName, geoMaps) || ''];
                                const statusColor = getStatusColor(stat?.status || 'sem_dados', isDark);

                                return (
                                    <button
                                        key={microName}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Evitar clique no mapa ao interagir com o modal

                                            // Helper local para converter Nome -> ID (usa normalize importado)
                                            const getMicroIdLocal = (name: string) => {
                                                const normalized = normalize(name);
                                                const found = MICROREGIOES.find(m => normalize(m.nome) === normalized);
                                                return found?.id || null;
                                            };

                                            const microId = getMicroIdLocal(microName);

                                            if (isSelected) {
                                                // SEGUNDO CLIQUE: Navega para os objetivos da micro selecionada
                                                if (microId) {
                                                    onNavigateToObjectives?.(microId);
                                                }
                                            } else {
                                                // PRIMEIRO CLIQUE: Apenas seleciona no mapa
                                                setSelectedMicro(microName);
                                                onMicroSelect?.(microId);
                                            }
                                        }}
                                        className={`w-full text-left p-2.5 rounded-lg text-sm transition-all flex items-center gap-3 group ${isSelected
                                            ? (isDark ? 'bg-blue-900/30 ring-1 ring-blue-500/50 shadow-[0_4px_15px_rgba(59,130,246,0.3)]' : 'bg-blue-50/80 ring-1 ring-blue-200 shadow-[0_4px_12px_rgba(59,130,246,0.15)]')
                                            : 'hover:bg-slate-800/10 dark:hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <div className="relative">
                                            <span
                                                className={`w-3 h-3 rounded-full flex-shrink-0 transition-transform block ${isSelected ? 'scale-110 shadow-lg' : 'scale-100 group-hover:scale-110'}`}
                                                style={{ backgroundColor: statusColor }}
                                            />
                                            {stat?.atrasadas > 0 && (
                                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-sm" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className={`font-medium truncate ${isSelected ? (isDark ? 'text-blue-300' : 'text-blue-700') : themeColors.textSecondary} ${!isSelected && `group-hover:${themeColors.text}`}`}>
                                                    {microName}
                                                </span>
                                            </div>

                                            {/* Mini Stats */}
                                            {stat && stat.total > 0 ? (
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                    <span>{stat.concluidas}/{stat.total}</span>
                                                    {stat.atrasadas > 0 && <span className="text-red-500 dark:text-red-400 font-bold ml-1">{stat.atrasadas} atrasos</span>}
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-slate-400">Sem dados</div>
                                            )}
                                        </div>

                                        {isSelected && (
                                            <ChevronRight className="w-4 h-4 text-teal-500 animate-in fade-in slide-in-from-left-1" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer Stats Detalhado (Micro ou Macro) */}
                    {(() => {
                        const mNorm = selectedMicro ? normalize(selectedMicro) : null;
                        const mId = selectedMicro ? resolveMicroId(selectedMicro, geoMaps) : null;
                        const mStat = mNorm ? (microStats[mNorm] || (mId ? microStats[mId] : null)) : null;

                        if (selectedMicro && mStat) {
                            return (
                                <div className={`p-4 border-t ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Activity className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                                        <span className={`text-xs font-bold uppercase tracking-wider ${themeColors.textSecondary}`}>
                                            Performance Microrregião
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className={`flex flex-col items-center p-2 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                            <span className="text-xl font-bold text-blue-500">{mStat.total}</span>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Total</span>
                                        </div>
                                        <div className={`flex flex-col items-center p-2 rounded-xl border ${isDark ? 'bg-emerald-900/10 border-emerald-900/20' : 'bg-emerald-50 border-emerald-100'}`}>
                                            <span className="text-xl font-bold text-emerald-500">{mStat.concluidas}</span>
                                            <span className="text-[10px] text-emerald-600/70 uppercase tracking-wide font-medium">Fim</span>
                                        </div>
                                        <div className={`flex flex-col items-center p-2 rounded-xl border ${isDark ? 'bg-red-900/10 border-red-900/20' : 'bg-red-50 border-red-100'}`}>
                                            <span className="text-xl font-bold text-red-500">{mStat.atrasadas}</span>
                                            <span className="text-[10px] text-red-600/70 uppercase tracking-wide font-medium">Atraso</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        const macroNorm = selectedMacro ? normalize(selectedMacro) : null;
                        const macroStat = macroNorm ? macroStats[macroNorm] : null;

                        if (selectedMacro && macroStat) {
                            return (
                                <div className={`p-4 border-t ${isDark ? 'bg-black/10 border-white/5' : 'bg-slate-50/50 border-slate-100'}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Activity className={`w-4 h-4 ${isDark ? 'text-teal-400' : 'text-teal-500'}`} />
                                        <span className={`text-xs font-bold uppercase tracking-wider ${themeColors.textSecondary}`}>
                                            Resumo Macrorregião
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="flex flex-col items-center">
                                            <span className={`text-lg font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{macroStat.total}</span>
                                            <span className="text-[9px] uppercase tracking-tighter opacity-70">Total</span>
                                        </div>
                                        <div className="flex flex-col items-center border-x border-slate-500/10">
                                            <span className="text-lg font-bold text-emerald-500">{macroStat.concluidas}</span>
                                            <span className="text-[9px] uppercase tracking-tighter text-emerald-500/70">Concluídas</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-lg font-bold text-red-500">{macroStat.atrasadas}</span>
                                            <span className="text-[9px] uppercase tracking-tighter text-red-500/70">Atrasos</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return null;
                    })()}
                </div>
            )}

            {/* Loading Overlay */}
            {loading && (
                <div className={`absolute inset-0 flex items-center justify-center z-[90] ${themeColors.bg}`}>
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-teal-500 font-medium animate-pulse">Carregando mapa...</p>
                    </div>
                </div>
            )}

            {/* Container do Mapa (com handler de click outside) */}
            <div
                className="absolute inset-0 z-0"
                ref={mapContainerRef}
                onClick={(e) => {
                    // Fallback para click nativo do React se propagar
                    if (e.target === mapContainerRef.current) handleBackgroundClick();
                }}
            />
        </div>
    );
};

export default MinasMicroMap;
