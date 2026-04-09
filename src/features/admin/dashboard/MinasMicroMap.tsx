import React, { useMemo } from "react";
import "leaflet/dist/leaflet.css";

import { useThemeSafe } from "../../../contexts/ThemeContext";
import { buildThemeColors } from "./minasMicroMap/minasMicroMap.constants";
import { MinasMicroMapHeader } from "./minasMicroMap/MinasMicroMapHeader";
import { MinasMicroMapLoadingOverlay } from "./minasMicroMap/MinasMicroMapLoadingOverlay";
import { MinasMicroMapSidebar } from "./minasMicroMap/MinasMicroMapSidebar";
import { MinasMicroMapStyles } from "./minasMicroMap/MinasMicroMapStyles";
import { MinasMicroMapTooltip } from "./minasMicroMap/MinasMicroMapTooltip";
import type { MinasMicroMapProps } from "./minasMicroMap/minasMicroMap.types";
import { useMinasMicroMapLeaflet } from "./minasMicroMap/useMinasMicroMapLeaflet";
import { useMinasMicroMapMetrics } from "./minasMicroMap/useMinasMicroMapMetrics";
import { useMinasMicroMapNavigation } from "./minasMicroMap/useMinasMicroMapNavigation";

const MinasMicroMap: React.FC<MinasMicroMapProps> = ({
    actions = [],
    onMacroSelect,
    onMicroSelect,
    onNavigateToObjectives,
    selectedMacroId,
    selectedMicroId,
}) => {
    const themeContext = useThemeSafe();
    const isDark = themeContext?.resolvedTheme === "dark";
    const themeColors = useMemo(() => buildThemeColors(isDark), [isDark]);

    const {
        clearSelectedMicro,
        findMacroKey,
        geoMaps,
        handleBack,
        handleSidebarMicroSelect,
        resetToMacroView,
        resolveMacroName,
        selectedMacro,
        selectedMicro,
        setSelectedMacro,
        setSelectedMicro,
        setViewLevel,
        viewLevel,
    } = useMinasMicroMapNavigation({
        onMacroSelect,
        onMicroSelect,
        onNavigateToObjectives,
        selectedMacroId,
        selectedMicroId,
    });

    const {
        currentMacroMicroNames,
        macroColorMap,
        microColorMap,
        microStats,
        selectedMacroStats,
        selectedMicroStats,
    } = useMinasMicroMapMetrics({
        actions,
        findMacroKey,
        geoMaps,
        isDark,
        resolveMacroName,
        selectedMacro,
        selectedMicro,
    });

    const {
        handleBackgroundClick,
        hoveredInfo,
        loading,
        mapError,
        mapContainerRef,
        mousePos,
    } = useMinasMicroMapLeaflet({
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
    });

    return (
        <div
            className={`relative w-full rounded-xl overflow-hidden isolate shadow-2xl border ${themeColors.bg} ${themeColors.border}`}
            style={{ minHeight: "650px" }}
        >
            <MinasMicroMapStyles isDark={isDark} themeColors={themeColors} />

            <MinasMicroMapTooltip hoveredInfo={hoveredInfo} mousePos={mousePos} viewLevel={viewLevel} />

            <MinasMicroMapHeader
                hoveredInfo={hoveredInfo}
                isDark={isDark}
                onBack={handleBack}
                onClearSelectedMicro={clearSelectedMicro}
                onResetToMacro={resetToMacroView}
                resolveMacroName={resolveMacroName}
                selectedMacro={selectedMacro}
                selectedMicro={selectedMicro}
                themeColors={themeColors}
                viewLevel={viewLevel}
            />

            {selectedMacro && viewLevel === "MICRO" ? (
                <MinasMicroMapSidebar
                    isDark={isDark}
                    microNames={currentMacroMicroNames}
                    microStats={microStats}
                    onClose={resetToMacroView}
                    onMicroSelect={handleSidebarMicroSelect}
                    resolveMacroName={resolveMacroName}
                    selectedMacro={selectedMacro}
                    selectedMacroStats={selectedMacroStats}
                    selectedMicro={selectedMicro}
                    selectedMicroStats={selectedMicroStats}
                    themeColors={themeColors}
                />
            ) : null}

            <MinasMicroMapLoadingOverlay loading={loading} themeColors={themeColors} />

            {mapError ? (
                <div className="absolute inset-x-4 bottom-4 z-20 rounded-xl border border-amber-200 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-lg backdrop-blur dark:border-amber-900/40 dark:bg-slate-950/90 dark:text-slate-200">
                    <p className="font-semibold text-slate-900 dark:text-white">Mapa indisponivel</p>
                    <p className="mt-1 leading-6">
                        O painel continua funcionando sem o mapa. Forca de Trabalho e os demais indicadores devem permanecer acessiveis.
                    </p>
                </div>
            ) : null}

            <div
                className="absolute inset-0 z-0"
                ref={mapContainerRef}
                onClick={(event) => {
                    if (event.target === mapContainerRef.current) {
                        handleBackgroundClick();
                    }
                }}
            />
        </div>
    );
};

export default MinasMicroMap;
