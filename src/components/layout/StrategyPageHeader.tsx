import React from 'react';
import { MapPin, Pencil, Info } from 'lucide-react';
import { Objective } from '../../types';
import { getObjectiveTitleWithoutNumber } from '../../lib/text';

interface StrategyPageHeaderProps {
    macro: string;
    micro?: string;
    selectedObjective: number;
    objectives: Objective[];
    isEditMode?: boolean;
    onUpdateObjective?: (id: number, newTitle: string) => void;
    onUpdateObjectiveField?: (id: number, field: 'description', value: string) => void;
}

export const StrategyPageHeader: React.FC<StrategyPageHeaderProps> = ({
    macro,
    micro,
    selectedObjective,
    objectives,
    isEditMode = false,
    onUpdateObjective,
    onUpdateObjectiveField,
}) => {
    const objectiveIndex = objectives.findIndex(o => o.id === selectedObjective);
    const objective = objectives[objectiveIndex];
    const rawTitle = objective?.title || '';
    const objectiveTitle = objectiveIndex >= 0
        ? `Obj. ${objectiveIndex + 1}. ${getObjectiveTitleWithoutNumber(rawTitle)}`
        : rawTitle;

    const cleanTitleForEdit = getObjectiveTitleWithoutNumber(rawTitle);

    return (
        <div className="px-4 sm:px-8 pt-3 pb-2 shrink-0 animate-fade-in space-y-1 bg-white dark:bg-slate-800">
            <div className="flex flex-col gap-0.5 max-w-[90rem]">
                {/* Badge de Localização */}
                <div className="flex items-center">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        <div className="flex items-center justify-center w-4 h-4 rounded bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 ring-1 ring-teal-100 dark:ring-teal-800/50">
                            <MapPin size={10} />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">{macro}</span>
                            {micro && (
                                <>
                                    <span className="text-slate-300 dark:text-slate-600">/</span>
                                    <span className="text-slate-700 dark:text-slate-200 font-bold">{micro}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Título do Objetivo */}
                <div className="relative group -ml-1">
                    {isEditMode ? (
                        <div
                            className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 leading-tight tracking-tight cursor-pointer hover:text-teal-700 dark:hover:text-teal-400 transition-colors flex items-start gap-2 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            onClick={() => onUpdateObjective?.(objective?.id || 0, cleanTitleForEdit)}
                            title="Clique para editar título"
                        >
                            <span className="flex-1 truncate">{objectiveTitle}</span>
                            <span className="p-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:text-teal-500 transition-colors mt-0.5">
                                <Pencil size={12} />
                            </span>
                        </div>
                    ) : (
                        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 leading-tight tracking-tight px-1 truncate">
                            {objectiveTitle || 'Selecione um objetivo'}
                        </h1>
                    )}
                </div>

                {/* Descrição do Objetivo */}
                {(objective?.description || isEditMode) && (
                    <div className="flex items-start gap-1.5 max-w-5xl animate-fade-in pl-1 opacity-90">
                        <div className="mt-[3px] text-teal-500 shrink-0">
                            <Info size={12} />
                        </div>
                        <div className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                            <span className="font-bold text-slate-700 dark:text-slate-200 mr-1">Sobre:</span>
                            {isEditMode ? (
                                <span
                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 px-1 rounded transition-colors border border-dashed border-slate-300 dark:border-slate-600 hover:border-teal-400"
                                    onClick={() => onUpdateObjectiveField?.(objective.id, 'description', objective.description || '')}
                                    title="Clique para editar descrição"
                                >
                                    {objective.description || "Adicionar descrição..."}
                                </span>
                            ) : (
                                objective?.description || <span className="opacity-50 italic">Sem descrição.</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
