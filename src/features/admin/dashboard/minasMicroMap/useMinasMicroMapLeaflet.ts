import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";

import { macroregions } from "../../../../data/mapamg/macroregions";
import { MACRORREGIOES, MICROREGIOES } from "../../../../data/microregioes";
import { logError } from "../../../../lib/logger";
import { MapDataLoader } from "../../../../lib/mapLoader";
import { findMacroKeyInObject, normalize } from "../../../../utils/geoUtils";
import { getStatusColor } from "./minasMicroMap.constants";
import type {
    HoveredInfo,
    MapThemeColors,
    MapViewLevel,
    MicroPerformanceStats,
    MinasMicroMapProps,
} from "./minasMicroMap.types";

interface UseMinasMicroMapLeafletParams {
    isDark: boolean;
    macroColorMap: Record<string, string>;
    microColorMap: Record<string, string>;
    microStats: Record<string, MicroPerformanceStats>;
    onMacroSelect?: MinasMicroMapProps["onMacroSelect"];
    onMicroSelect?: MinasMicroMapProps["onMicroSelect"];
    resetToMacroView: () => void;
    selectedMacro: string | null;
    selectedMicro: string | null;
    setSelectedMacro: React.Dispatch<React.SetStateAction<string | null>>;
    setSelectedMicro: React.Dispatch<React.SetStateAction<string | null>>;
    setViewLevel: React.Dispatch<React.SetStateAction<MapViewLevel>>;
    themeColors: MapThemeColors;
    viewLevel: MapViewLevel;
}

interface LayerFeatureProperties {
    area?: number;
    center?: [number, number];
    macroName?: string;
    microName?: string;
}

type LayerStyle = Pick<L.PathOptions, "color" | "fillColor" | "fillOpacity" | "weight">;

type LeafletOwnedContainer = HTMLElement & { _leaflet_id?: number };

type LeafletMapWithPrivateContainer = L.Map & {
    _container?: LeafletOwnedContainer;
    _containerId?: number;
};

function getMacroIdByName(name: string) {
    const normalizedName = normalize(name);
    return MACRORREGIOES.find((macro) => normalize(macro.nome) === normalizedName)?.id || null;
}

function getMicroIdByName(name: string) {
    const normalizedName = normalize(name);
    return MICROREGIOES.find((micro) => normalize(micro.nome) === normalizedName)?.id || null;
}

export function useMinasMicroMapLeaflet({
    isDark,
    macroColorMap,
    microColorMap,
    microStats,
    onMacroSelect,
    onMicroSelect,
    resetToMacroView,
    selectedMacro,
    selectedMicro,
    setSelectedMacro,
    setSelectedMicro,
    setViewLevel,
    themeColors,
    viewLevel,
}: UseMinasMicroMapLeafletParams) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
    const macroLayerRef = useRef<L.GeoJSON | null>(null);
    const microBorderLayerRef = useRef<L.GeoJSON | null>(null);
    const labelsLayerRef = useRef<L.LayerGroup | null>(null);
    const hoverLabelRef = useRef<L.Marker | null>(null);
    const hoveredMacroRef = useRef<string | null>(null);
    const layersByMacroRef = useRef<Record<string, L.Layer[]>>({});
    const macroCentersRef = useRef<Record<string, [number, number]>>({});
    const microCentersRef = useRef<Record<string, { area: number; lat: number; lng: number }>>({});
    const viewLevelRef = useRef<MapViewLevel>("MACRO");
    const selectedMacroRef = useRef<string | null>(null);
    const resetToMacroViewRef = useRef(resetToMacroView);
    const initRequestIdRef = useRef(0);
    const processedDataRef = useRef<{ macroFeatures: Array<{ properties: LayerFeatureProperties }> }>({
        macroFeatures: [],
    });

    const [hoveredInfo, setHoveredInfo] = useState<HoveredInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [mapError, setMapError] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const resolveMacroMapColor = useCallback((macroName?: string) => {
        if (!macroName || macroName === "Desconhecida") {
            return themeColors.macroFill;
        }

        const macroKey = Object.keys(macroColorMap).find((key) => normalize(key) === normalize(macroName));
        return macroKey ? macroColorMap[macroKey] : themeColors.macroFill;
    }, [macroColorMap, themeColors.macroFill]);

    const resolveMicroMapColor = useCallback((microName?: string) => {
        if (!microName || microName === "Desconhecida") {
            return themeColors.unselectedFill;
        }

        const microStat = microStats[normalize(microName)];
        if (microStat) {
            return getStatusColor(microStat.status, isDark);
        }

        let microColor = microColorMap[microName];
        if (!microColor) {
            const microKey = Object.keys(microColorMap).find((key) => normalize(key) === normalize(microName));
            if (microKey) {
                microColor = microColorMap[microKey];
            }
        }

        return microColor || themeColors.unselectedFill;
    }, [isDark, microColorMap, microStats, themeColors.unselectedFill]);

    const getLayerStyle = useCallback((props: LayerFeatureProperties = {}): LayerStyle => {
        const muniMacro = props.macroName;
        const muniMicro = props.microName;
        const currentMacroNorm = selectedMacro ? normalize(selectedMacro) : "";
        const currentMicroNorm = selectedMicro ? normalize(selectedMicro) : "";
        const muniMacroNorm = muniMacro ? normalize(muniMacro) : "";
        const muniMicroNorm = muniMicro ? normalize(muniMicro) : "";

        if (viewLevel === "MACRO") {
            const fillColor = resolveMacroMapColor(muniMacro);
            return {
                color: "transparent",
                fillColor,
                fillOpacity: fillColor !== themeColors.macroFill ? 0.5 : themeColors.macroOpacity,
                weight: 0,
            };
        }

        if (muniMacroNorm && currentMacroNorm && muniMacroNorm === currentMacroNorm) {
            const fillOpacity = currentMicroNorm && muniMicroNorm === currentMicroNorm
                ? 1
                : selectedMicro
                    ? 0.4
                    : 0.85;

            return {
                color: "transparent",
                fillColor: resolveMicroMapColor(muniMicro),
                fillOpacity,
                weight: 0,
            };
        }

        return {
            color: "transparent",
            fillColor: themeColors.unselectedFill,
            fillOpacity: 0.2,
            weight: 0,
        };
    }, [
        resolveMacroMapColor,
        resolveMicroMapColor,
        selectedMacro,
        selectedMicro,
        themeColors.macroFill,
        themeColors.macroOpacity,
        themeColors.unselectedFill,
        viewLevel,
    ]);

    const applyStyleToLayer = useCallback((layer: any) => {
        layer.setStyle(getLayerStyle(layer.feature?.properties));
    }, [getLayerStyle]);

    const createLabelMarker = useCallback((center: [number, number], name: string, fontSize: string, width: number) => {
        const [lat, lng] = center;

        return L.marker([lat, lng], {
            icon: L.divIcon({
                className: "map-label",
                html: `<div style="
                    display:flex;
                    justify-content:center;
                    align-items:center;
                    text-align:center;
                    transform:translate(-50%, -50%);
                    font-size:${fontSize};
                    font-weight:bold;
                    color:${isDark ? "#f8fafc" : "#1e3a8a"};
                    text-shadow:
                        1px 1px 0 ${isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.8)"},
                        -1px -1px 0 ${isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.8)"},
                        1px -1px 0 ${isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.8)"},
                        -1px 1px 0 ${isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.8)"};
                    pointer-events:none;
                    width:${width}px;
                    line-height:1.1;
                ">${name}</div>`,
                iconAnchor: [0, 0],
                iconSize: [0, 0],
            }),
            interactive: false,
        });
    }, [isDark]);

    const isMapDomReady = useCallback((map?: L.Map | null) => {
        const container = map?.getContainer?.();
        return Boolean(
            map &&
            container &&
            container.isConnected &&
            container.parentElement,
        );
    }, []);

    const safelyMutateLeaflet = useCallback((callback: () => void) => {
        if (!isMapDomReady(mapInstanceRef.current)) {
            return false;
        }

        callback();
        return true;
    }, [isMapDomReady]);

    const resetLeafletContainerIfStale = useCallback((container?: HTMLElement | null) => {
        if (!container) {
            return;
        }

        const leafletContainer = container as LeafletOwnedContainer;
        if (leafletContainer._leaflet_id !== undefined) {
            delete leafletContainer._leaflet_id;
        }
    }, []);

    const safelyRemoveMap = useCallback((map: L.Map | null) => {
        if (!map) {
            return;
        }

        const privateMap = map as LeafletMapWithPrivateContainer;
        const container = privateMap._container;
        const expectedContainerId = privateMap._containerId;
        const containerWasOwnedByMap = Boolean(
            container &&
            expectedContainerId !== undefined &&
            container._leaflet_id === expectedContainerId,
        );

        try {
            map.remove();
        } catch (error) {
            if (
                !(error instanceof Error) ||
                !error.message.includes("Map container is being reused by another instance")
            ) {
                logError("MinasMicroMap", "Erro ao remover instancia do mapa", error);
            }
        } finally {
            if (
                containerWasOwnedByMap &&
                container &&
                expectedContainerId !== undefined &&
                container._leaflet_id === expectedContainerId
            ) {
                resetLeafletContainerIfStale(container);
            }

            if (mapInstanceRef.current === map) {
                mapInstanceRef.current = null;
            }
        }
    }, [resetLeafletContainerIfStale]);

    const teardownMap = useCallback(() => {
        hoverLabelRef.current = null;
        hoveredMacroRef.current = null;
        layersByMacroRef.current = {};
        macroCentersRef.current = {};
        microCentersRef.current = {};
        processedDataRef.current = { macroFeatures: [] };
        geoJsonLayerRef.current = null;
        macroLayerRef.current = null;
        microBorderLayerRef.current = null;
        labelsLayerRef.current = null;

        safelyRemoveMap(mapInstanceRef.current);
    }, [safelyRemoveMap]);

    const updateLabels = useCallback(() => {
        if (!labelsLayerRef.current) {
            return;
        }

        labelsLayerRef.current.clearLayers();

        if (viewLevel === "MACRO") {
            processedDataRef.current.macroFeatures.forEach((feature) => {
                const macroName = feature.properties.macroName;
                if (!macroName) {
                    return;
                }

                const center = macroCentersRef.current[macroName];
                if (!center) {
                    return;
                }

                labelsLayerRef.current?.addLayer(createLabelMarker(center, macroName, "11px", 150));
            });

            return;
        }

        if (viewLevel !== "MICRO" || !selectedMacro) {
            return;
        }

        const macroKey = findMacroKeyInObject(selectedMacro, macroregions) || "";
        const macroMicros = (macroregions as Record<string, string[]>)[macroKey] || [];
        const relevantCenters = macroMicros
            .filter((microName) => microCentersRef.current[microName])
            .map((microName) => ({
                microName,
                ...microCentersRef.current[microName],
            }));

        const adjustedCenters = relevantCenters.map((item, index) => {
            let adjLat = item.lat;
            let adjLng = item.lng;

            for (let compareIndex = 0; compareIndex < index; compareIndex += 1) {
                const other = relevantCenters[compareIndex];
                const distance = Math.sqrt(
                    Math.pow(item.lat - other.lat, 2) +
                    Math.pow(item.lng - other.lng, 2),
                );

                if (distance >= 0.15) {
                    continue;
                }

                const angle = Math.atan2(item.lat - other.lat, item.lng - other.lng);
                const offset = 0.15 - distance + 0.05;
                adjLat += Math.sin(angle) * offset;
                adjLng += Math.cos(angle) * offset;
            }

            return { ...item, adjLat, adjLng };
        });

        const avgArea = relevantCenters.reduce((sum, micro) => sum + micro.area, 0) / (relevantCenters.length || 1);

        adjustedCenters.forEach((item) => {
            if (item.area < avgArea * 0.08) {
                return;
            }

            labelsLayerRef.current?.addLayer(
                createLabelMarker([item.adjLat, item.adjLng], item.microName, "9px", 100),
            );
        });
    }, [createLabelMarker, selectedMacro, viewLevel]);

    const applyStyles = useCallback(() => {
        if (!isMapDomReady(mapInstanceRef.current)) {
            return;
        }

        geoJsonLayerRef.current?.eachLayer((layer: any) => {
            layer.setStyle(getLayerStyle(layer.feature?.properties));
        });

        macroLayerRef.current?.setStyle({
            color: themeColors.macroBorder,
            opacity: viewLevel === "MACRO" ? 1 : 0.8,
            weight: viewLevel === "MACRO" ? 3 : 2.5,
        });

        microBorderLayerRef.current?.setStyle({
            color: themeColors.microBorder,
            opacity: viewLevel === "MACRO" ? 0.3 : 0.6,
            weight: viewLevel === "MACRO" ? 0.5 : 1.2,
        });
    }, [getLayerStyle, isMapDomReady, themeColors.macroBorder, themeColors.microBorder, viewLevel]);

    const handleClick = useCallback((props: LayerFeatureProperties) => {
        const macroName = props.macroName;
        const microName = props.microName;

        if (!macroName || macroName === "Desconhecida") {
            return;
        }

        if (viewLevel === "MACRO") {
            setSelectedMacro(macroName);
            setSelectedMicro(null);
            setViewLevel("MICRO");
            onMacroSelect?.(getMacroIdByName(macroName));
            onMicroSelect?.(null);
            return;
        }

        if (normalize(macroName) !== normalize(selectedMacro || "")) {
            setSelectedMacro(macroName);
            setSelectedMicro(null);
            onMacroSelect?.(getMacroIdByName(macroName));
            onMicroSelect?.(null);
            return;
        }

        if (!microName || microName === "Desconhecida") {
            return;
        }

        if (selectedMicro === microName) {
            setSelectedMicro(null);
            onMicroSelect?.(null);
            return;
        }

        setSelectedMicro(microName);
        onMicroSelect?.(getMicroIdByName(microName));
    }, [
        onMacroSelect,
        onMicroSelect,
        selectedMacro,
        selectedMicro,
        setSelectedMacro,
        setSelectedMicro,
        setViewLevel,
        viewLevel,
    ]);

    const highlightMacro = useCallback((macroName: string) => {
        if (!mapInstanceRef.current || hoveredMacroRef.current === macroName) {
            return;
        }

        if (hoverLabelRef.current) {
            mapInstanceRef.current.removeLayer(hoverLabelRef.current);
            hoverLabelRef.current = null;
        }

        if (hoveredMacroRef.current && hoveredMacroRef.current !== macroName) {
            layersByMacroRef.current[hoveredMacroRef.current]?.forEach((layer) => {
                applyStyleToLayer(layer);
            });
        }

        hoveredMacroRef.current = macroName;
        const macroLayers = layersByMacroRef.current[macroName];

        if (macroLayers) {
            const statusColor = resolveMacroMapColor(macroName);
            macroLayers.forEach((layer: any) => {
                layer.setStyle({
                    fillColor: statusColor || "#3b82f6",
                    fillOpacity: statusColor ? 0.9 : 0.6,
                    weight: 2,
                });
                layer.bringToFront();
            });
        }

        macroLayerRef.current?.bringToFront();

        const center = macroCentersRef.current[macroName];
        if (!center) {
            return;
        }

        hoverLabelRef.current = L.marker(center, {
            icon: L.divIcon({
                className: "hover-macro-label",
                html: `<div style="
                    display:flex;
                    justify-content:center;
                    align-items:center;
                    text-align:center;
                    transform:translate(-50%, -50%);
                    font-size:18px;
                    font-weight:bold;
                    color:#ffffff;
                    text-shadow:2px 2px 4px rgba(0,0,0,0.9);
                    white-space:nowrap;
                    pointer-events:none;
                    letter-spacing:1px;
                ">${macroName}</div>`,
                iconAnchor: [0, 0],
                iconSize: [0, 0],
            }),
            interactive: false,
            zIndexOffset: 1000,
        }).addTo(mapInstanceRef.current);
    }, [applyStyleToLayer, resolveMacroMapColor]);

    const clearMacroHighlight = useCallback(() => {
        if (hoverLabelRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(hoverLabelRef.current);
            hoverLabelRef.current = null;
        }

        const previousMacro = hoveredMacroRef.current;
        if (previousMacro) {
            layersByMacroRef.current[previousMacro]?.forEach((layer) => {
                applyStyleToLayer(layer);
            });
        }

        hoveredMacroRef.current = null;
    }, [applyStyleToLayer]);

    const handleBackgroundClick = useCallback(() => {
        if (viewLevel !== "MACRO") {
            resetToMacroView();
        }
    }, [resetToMacroView, viewLevel]);

    useEffect(() => {
        viewLevelRef.current = viewLevel;
        selectedMacroRef.current = selectedMacro;
        resetToMacroViewRef.current = resetToMacroView;
    }, [resetToMacroView, selectedMacro, viewLevel]);

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            setMousePos({ x: event.clientX, y: event.clientY });
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    useEffect(() => {
        applyStyles();
        updateLabels();
    }, [applyStyles, updateLabels, viewLevel, selectedMacro, selectedMicro]);

    useEffect(() => {
        const initMap = async () => {
            const container = mapContainerRef.current;
            if (!container || !container.isConnected || mapInstanceRef.current) {
                return;
            }

            resetLeafletContainerIfStale(container);

            const requestId = ++initRequestIdRef.current;
            let localMap: L.Map | null = null;

            const isStaleInit = () => requestId !== initRequestIdRef.current;
            const canUseMap = (map: L.Map | null) => Boolean(map && !isStaleInit() && isMapDomReady(map));
            const disposeLocalMap = () => {
                if (localMap) {
                    safelyRemoveMap(localMap);
                    localMap = null;
                }
            };

            try {
                setMapError(null);

                const map = L.map(container, {
                    attributionControl: false,
                    boxZoom: false,
                    center: [-18.5, -44.5],
                    doubleClickZoom: false,
                    dragging: true,
                    keyboard: false,
                    maxZoom: 12,
                    minZoom: 5,
                    renderer: L.canvas(),
                    scrollWheelZoom: false,
                    touchZoom: false,
                    wheelPxPerZoomLevel: 60,
                    zoom: 6,
                    zoomControl: false,
                    zoomDelta: 0.1,
                    zoomSnap: 0.1,
                });

                localMap = map;
                mapInstanceRef.current = map;

                const mapData = await MapDataLoader.load();
                if (!canUseMap(map)) {
                    disposeLocalMap();
                    return;
                }

                const microsData = mapData.micros;
                const macrosData = mapData.macros;
                const macroLabelAdjustments: Record<string, [number, number]> = {
                    JEQUITINHONHA: [0, -0.2],
                    NOROESTE: [-0.1, 0],
                    OESTE: [0, 0.35],
                    SUDESTE: [-0.1, 0.2],
                    SUL: [-0.35, 0.4],
                    "TRIÂNGULO DO SUL": [-0.2, 0.2],
                };

                const adjustedMacroCenters: Record<string, [number, number]> = {};
                macrosData.features.forEach((feature: any) => {
                    const macroName = feature.properties.macroName;
                    if (!macroName || !feature.properties.center) {
                        return;
                    }

                    let [lng, lat] = feature.properties.center;
                    if (macroLabelAdjustments[macroName]) {
                        const [latOffset, lngOffset] = macroLabelAdjustments[macroName];
                        lat += latOffset;
                        lng += lngOffset;
                    }

                    adjustedMacroCenters[macroName] = [lat, lng];
                });
                macroCentersRef.current = adjustedMacroCenters;

                const microCenters: Record<string, { area: number; lat: number; lng: number }> = {};
                microsData.features.forEach((feature: any) => {
                    const microName = feature.properties.microName;
                    if (!microName || !feature.properties.center) {
                        return;
                    }

                    const [lng, lat] = feature.properties.center;
                    microCenters[microName] = {
                        area: feature.properties.area || 0,
                        lat,
                        lng,
                    };
                });
                microCentersRef.current = microCenters;

                processedDataRef.current = {
                    macroFeatures: macrosData.features,
                };

                const geoJsonLayer = L.geoJSON(microsData, {
                    onEachFeature: (feature: any, layer: any) => {
                        layer.on({
                            click: (event: any) => {
                                L.DomEvent.stopPropagation(event);
                                handleClick(feature.properties);
                            },
                            mouseout: () => {
                                setHoveredInfo(null);
                                clearMacroHighlight();
                                applyStyles();
                                mapInstanceRef.current?.scrollWheelZoom.disable();
                            },
                            mouseover: () => {
                                const props = feature.properties;
                                const currentLevel = viewLevelRef.current;
                                const isCurrentMacro = props.macroName === selectedMacroRef.current;

                                mapInstanceRef.current?.scrollWheelZoom.enable();

                                if (currentLevel === "MACRO") {
                                    setHoveredInfo({ macro: props.macroName, micro: null, muni: null });
                                    highlightMacro(props.macroName);
                                    return;
                                }

                                if (isCurrentMacro) {
                                    setHoveredInfo({ macro: props.macroName, micro: props.microName, muni: null });
                                    layer.setStyle({ fillOpacity: 0.9, weight: 2 });
                                    return;
                                }

                                setHoveredInfo({ macro: props.macroName, micro: null, muni: null });
                                highlightMacro(props.macroName);
                            },
                        });
                    },
                    style: () => ({
                        color: "transparent",
                        fillColor: themeColors.macroFill,
                        fillOpacity: themeColors.macroOpacity,
                        weight: 0,
                    }),
                });

                geoJsonLayerRef.current = geoJsonLayer;
                if (!safelyMutateLeaflet(() => geoJsonLayer.addTo(map))) {
                    disposeLocalMap();
                    return;
                }

                const nextLayersByMacro: Record<string, L.Layer[]> = {};
                geoJsonLayer.eachLayer((layer: any) => {
                    const props = layer.feature?.properties;
                    if (!props?.macroName || props.macroName === "Desconhecida") {
                        return;
                    }

                    if (!nextLayersByMacro[props.macroName]) {
                        nextLayersByMacro[props.macroName] = [];
                    }

                    nextLayersByMacro[props.macroName].push(layer);
                });
                layersByMacroRef.current = nextLayersByMacro;

                microBorderLayerRef.current = L.geoJSON(microsData, {
                    style: {
                        color: themeColors.microBorder,
                        dashArray: "2, 6",
                        fillOpacity: 0,
                        interactive: false,
                        lineCap: "round",
                        lineJoin: "round",
                        opacity: 0.8,
                        weight: 1.5,
                    },
                });
                if (!safelyMutateLeaflet(() => microBorderLayerRef.current?.addTo(map))) {
                    disposeLocalMap();
                    return;
                }

                macroLayerRef.current = L.geoJSON(macrosData, {
                    style: {
                        color: themeColors.macroBorder,
                        fillOpacity: 0,
                        interactive: false,
                        weight: 2.5,
                    },
                });
                if (!safelyMutateLeaflet(() => macroLayerRef.current?.addTo(map))) {
                    disposeLocalMap();
                    return;
                }

                labelsLayerRef.current = L.layerGroup();
                if (!safelyMutateLeaflet(() => labelsLayerRef.current?.addTo(map))) {
                    disposeLocalMap();
                    return;
                }
                updateLabels();
                setLoading(false);
                localMap = null;

                map.on("click", () => {
                    if (viewLevelRef.current !== "MACRO") {
                        resetToMacroViewRef.current();
                    }
                });
            } catch (error) {
                logError("MinasMicroMap", "Erro ao carregar mapa", error);
                setMapError("Nao foi possivel carregar o mapa de microrregioes.");
                teardownMap();
                disposeLocalMap();
                setLoading(false);
            }
        };

        void initMap();
    }, [
        applyStyles,
        clearMacroHighlight,
        handleClick,
        highlightMacro,
        isMapDomReady,
        safelyMutateLeaflet,
        teardownMap,
        themeColors.macroBorder,
        themeColors.macroFill,
        themeColors.macroOpacity,
        themeColors.microBorder,
        updateLabels,
    ]);

    useEffect(() => {
        return () => {
            initRequestIdRef.current += 1;
            teardownMap();
        };
    }, [teardownMap]);

    return {
        handleBackgroundClick,
        hoveredInfo,
        loading,
        mapError,
        mapContainerRef,
        mousePos,
    };
}
