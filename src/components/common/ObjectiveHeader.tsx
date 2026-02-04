import React, { useState } from 'react';
import { Info, ChevronDown } from 'lucide-react';
import { Objective } from '../../types';

interface ObjectiveHeaderProps {
    objective: Objective | null;
    objectiveIndex: number;
    isEditMode?: boolean;
    onEdit?: (field: 'eixo' | 'description' | 'eixoLabel' | 'eixoColor', currentValue: string | number) => void;
    // Overrides for displaying Activity info instead of Axis info
    customBadgeText?: string;
    customTitle?: string;
    hideTitle?: boolean;
}

// ... imports remain ...

export const ObjectiveHeader: React.FC<ObjectiveHeaderProps> = ({
    objective,
    objectiveIndex,
    isEditMode = false,
    onEdit,
    customBadgeText,
    customTitle,
    hideTitle = false,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!objective) return null;

    const eixoNumber = objective.eixo ?? (objectiveIndex < 3 ? 1 : objectiveIndex < 5 ? 2 : 3);
    const eixoLabels: Record<number, string> = {
        1: 'Formação',
        2: 'Soluções',
        3: 'Dados',
    };
    // Prioritize customTitle, then objective.eixoLabel, then mapped label
    const combinedLabel = customTitle || objective.eixoLabel || eixoLabels[eixoNumber] || `Eixo ${eixoNumber}`;

    // Cor ativa: do banco ou default baseado no número
    const defaultColor = eixoNumber === 1 ? 'blue' : eixoNumber === 2 ? 'amber' : eixoNumber === 3 ? 'emerald' : 'slate';
    const activeColor = objective.eixoColor || defaultColor;

    const themeMap: Record<string, { border: string; badge: string; text: string }> = {
        blue: { border: 'border-l-blue-500', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300', text: 'text-blue-900 dark:text-blue-100' },
        amber: { border: 'border-l-amber-500', badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300', text: 'text-amber-900 dark:text-amber-100' },
        emerald: { border: 'border-l-emerald-500', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300', text: 'text-emerald-900 dark:text-emerald-100' },
        purple: { border: 'border-l-purple-500', badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300', text: 'text-purple-900 dark:text-purple-100' },
        rose: { border: 'border-l-rose-500', badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300', text: 'text-rose-900 dark:text-rose-100' },
        cyan: { border: 'border-l-cyan-500', badge: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300', text: 'text-cyan-900 dark:text-cyan-100' },
        slate: { border: 'border-l-slate-500', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300', text: 'text-slate-900 dark:text-slate-100' },
    };

    const colors = themeMap[activeColor] || themeMap.slate;

    const handleCycleColor = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isEditMode || !onEdit) return;
        const COLOR_OPTIONS = ['blue', 'amber', 'emerald', 'purple', 'rose', 'cyan', 'slate'];
        const currentIndex = COLOR_OPTIONS.indexOf(activeColor);
        const nextIndex = (currentIndex + 1) % COLOR_OPTIONS.length;
        onEdit('eixoColor', COLOR_OPTIONS[nextIndex]);
    };

    return (
        <div className={`relative bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 ${colors.border} border-l-4 py-3 px-4 mb-4 transition-all duration-300 group`}>

            <div className={`flex flex-col sm:flex-row gap-2 ${isExpanded ? 'sm:items-start' : 'sm:items-center'}`}>

                {/* Linha Superior/Esquerda: Badge e Título */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        {isEditMode && onEdit && (
                            <div
                                onClick={handleCycleColor}
                                className={`w-4 h-4 rounded-full cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-sm border border-slate-300 dark:border-slate-500 flex items-center justify-center`}
                                title={`Mudar Cor (Atual: ${activeColor}). Clique para alternar.`}
                            >
                                <div className={`w-3 h-3 rounded-full ${activeColor === 'blue' ? 'bg-blue-500' :
                                    activeColor === 'amber' ? 'bg-amber-500' :
                                        activeColor === 'emerald' ? 'bg-emerald-500' :
                                            activeColor === 'purple' ? 'bg-purple-500' :
                                                activeColor === 'rose' ? 'bg-rose-500' :
                                                    activeColor === 'cyan' ? 'bg-cyan-500' :
                                                        'bg-slate-500'
                                    }`}></div>
                            </div>
                        )}
                        <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colors.badge} ${isEditMode && onEdit && !customBadgeText ? 'cursor-pointer hover:brightness-95' : ''}`}
                            onClick={() => !customBadgeText && isEditMode && onEdit?.('eixo', eixoNumber)}
                            title={isEditMode && !customBadgeText ? "Clique para editar número" : ""}
                        >
                            {customBadgeText || `EIXO ${eixoNumber}`}
                        </span>
                    </div>

                    {!hideTitle && (
                        <h2
                            className={`text-base font-bold ${colors.text} tracking-tight ${isEditMode && onEdit && !customTitle ? 'cursor-pointer hover:underline decoration-dashed decoration-slate-300 underline-offset-4 transition-all' : ''}`}
                            onClick={() => !customTitle && isEditMode && onEdit?.('eixoLabel', combinedLabel)}
                            title={isEditMode && !customTitle ? "Clique para editar nome" : ""}
                        >
                            {combinedLabel}
                        </h2>
                    )}
                </div>

                {/* Separador (Desktop) */}
                <div className={`hidden sm:block w-px ${isExpanded ? 'h-auto min-h-[20px] self-stretch' : 'h-4'} bg-slate-200 dark:bg-slate-700 mx-2 transition-all`}></div>

                {/* Descrição Inline */}
                <div
                    className={`flex-1 min-w-0 flex ${isExpanded ? 'items-start' : 'items-center'} gap-2 text-sm text-slate-500 dark:text-slate-400 transition-all group/desc`}
                >
                    <Info size={14} className={`text-slate-300 shrink-0 ${isExpanded ? 'mt-1' : ''}`} />

                    {isEditMode && onEdit ? (
                        <div
                            className="flex-1 truncate cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            onClick={() => onEdit('description', objective.description || '')}
                            title="Clique para editar descrição"
                        >
                            <span className="font-bold text-slate-700 dark:text-slate-200 mr-1">Sobre esta atividade:</span>
                            {objective.description ? (
                                <span className="truncate">{objective.description}</span>
                            ) : (
                                <span className="text-slate-400 italic font-light hover:not-italic">Adicionar descrição...</span>
                            )}
                        </div>
                    ) : (
                        <div
                            className={`flex-1 cursor-pointer select-text ${isExpanded ? 'whitespace-normal break-words' : 'truncate'}`}
                            title={!isExpanded ? (objective.description || 'Sem descrição') : ''}
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <span className="font-bold text-slate-700 dark:text-slate-200 mr-1">Sobre esta atividade:</span>
                            {objective.description || <span className="opacity-30 italic font-light">Sem descrição</span>}
                        </div>
                    )}

                    {/* V Chevron Icon (Only shows if text exists and not in edit mode) */}
                    {!isEditMode && objective.description && (
                        <ChevronDown
                            size={14}
                            className={`text-slate-300 shrink-0 transition-opacity duration-300 cursor-pointer ${isExpanded ? 'rotate-180 opacity-100' : 'opacity-0 group-hover/desc:opacity-100'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
