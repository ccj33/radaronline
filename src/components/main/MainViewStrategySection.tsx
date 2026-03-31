import React, { RefObject, Suspense, lazy, useMemo, useState } from 'react';
import { Check, ChevronDown, Plus, Target } from 'lucide-react';
import { Activity, Objective } from '../../types';
import { getObjectiveTitleWithoutNumber } from '../../lib/text';

const ActivityTabs = lazy(() => import('../../features/actions/ActivityTabs').then(m => ({ default: m.ActivityTabs })));

const sectionFallback = (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
  </div>
);

interface MainViewStrategySectionProps {
  activityTabsRef: RefObject<HTMLDivElement>;
  canCreateObjective: boolean;
  filteredActivities: Record<number, Activity[]>;
  filteredObjectives: Objective[];
  isMobile: boolean;
  isEditMode: boolean;
  selectedActivity: string;
  selectedObjective: number;
  onAddObjective: () => void;
  onMobileObjectiveSelected?: () => void;
  onSetSelectedActivity: (activityId: string) => void;
  onSetSelectedObjective: (objectiveId: number) => void;
  onUpdateActivity: (id: string, field: 'title' | 'description', value: string) => void;
}

export function MainViewStrategySection({
  activityTabsRef,
  canCreateObjective,
  filteredActivities,
  filteredObjectives,
  isMobile,
  isEditMode,
  selectedActivity,
  selectedObjective,
  onAddObjective,
  onMobileObjectiveSelected,
  onSetSelectedActivity,
  onSetSelectedObjective,
  onUpdateActivity,
}: MainViewStrategySectionProps) {
  const [isObjectivePickerOpen, setIsObjectivePickerOpen] = useState(false);

  const selectedObjectiveIndex = filteredObjectives.findIndex((objective) => objective.id === selectedObjective);
  const selectedObjectiveData = selectedObjectiveIndex >= 0 ? filteredObjectives[selectedObjectiveIndex] : null;

  const objectiveLabel = useMemo(() => {
    if (!selectedObjectiveData) {
      return 'Selecione um objetivo';
    }

    const index = selectedObjectiveIndex >= 0 ? selectedObjectiveIndex + 1 : 1;
    return `Obj ${index}. ${getObjectiveTitleWithoutNumber(selectedObjectiveData.title)}`;
  }, [selectedObjectiveData, selectedObjectiveIndex]);

  const handleSelectObjective = (objectiveId: number) => {
    const nextActivities = filteredActivities[objectiveId] || [];
    const selectedActivityExists = nextActivities.some((activity) => activity.id === selectedActivity);

    onSetSelectedObjective(objectiveId);
    if (!selectedActivityExists) {
      onSetSelectedActivity(nextActivities[0]?.id ?? '');
    }

    onMobileObjectiveSelected?.();

    setIsObjectivePickerOpen(false);
  };

  return (
    <div ref={activityTabsRef}>
      {filteredObjectives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-full mb-4">
            <Target size={32} className="text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
            Nenhum objetivo definido
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
            É necessário criar um objetivo estratégico e atividades relacionadas antes de adicionar ações.
          </p>
          {canCreateObjective && (
            <button
              onClick={onAddObjective}
              className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-teal-700 transition-colors shadow-sm"
            >
              <Plus size={18} /> Criar Primeiro Objetivo
            </button>
          )}
        </div>
      ) : (
        <>
          {isMobile && (
            <div className="px-3 pt-2 pb-1 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setIsObjectivePickerOpen(true)}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-left"
              >
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide font-bold text-slate-500 dark:text-slate-400">Objetivo em foco</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{objectiveLabel}</p>
                </div>
                <ChevronDown size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
              </button>
            </div>
          )}

          <Suspense fallback={sectionFallback}>
            <ActivityTabs
              activities={filteredActivities[selectedObjective] || []}
              selectedActivity={selectedActivity}
              setSelectedActivity={onSetSelectedActivity}
              isEditMode={isEditMode}
              onUpdateActivity={onUpdateActivity}
            />
          </Suspense>

          {isMobile && isObjectivePickerOpen && (
            <>
              <button
                onClick={() => setIsObjectivePickerOpen(false)}
                className="fixed inset-0 z-40 bg-slate-900/50"
                aria-label="Fechar seletor de objetivo"
              />
              <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-slate-800 rounded-t-2xl border-t border-slate-200 dark:border-slate-700 shadow-2xl max-h-[70vh] flex flex-col">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Escolha o objetivo</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Troque de contexto sem sair da tela de acoes.</p>
                </div>

                <div className="overflow-y-auto p-3 space-y-2">
                  {filteredObjectives.map((objective, index) => {
                    const isSelected = objective.id === selectedObjective;
                    const activitiesCount = (filteredActivities[objective.id] || []).length;

                    return (
                      <button
                        key={objective.id}
                        onClick={() => handleSelectObjective(objective.id)}
                        className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-teal-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {index + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {getObjectiveTitleWithoutNumber(objective.title)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{activitiesCount} atividade{activitiesCount === 1 ? '' : 's'}</p>
                        </div>

                        {isSelected && <Check size={16} className="text-teal-600 dark:text-teal-300 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
