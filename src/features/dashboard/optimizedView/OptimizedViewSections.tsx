import { ChevronDown, Layers, Zap } from "lucide-react";

import type { Action } from "../../../types";
import { useResponsive } from "../../../hooks/useMediaQuery";
import { getActivityDisplayId } from "../../../lib/text";
import {
  ActionCard,
  buildListRows,
  KANBAN_COLUMNS,
  MiniProgress,
  OBJECTIVE_COLORS,
  STATUS_CONFIG,
} from "./optimizedView.shared";
import type { OptimizedObjectiveGroup } from "./optimizedView.types";

export function OptimizedTreeView({
  groupedData,
  expandedObjectives,
  expandedActivities,
  selectedUid,
  isModalOpen,
  onToggleObjective,
  onToggleActivity,
  onSelectAction,
  isActionLate,
}: {
  groupedData: OptimizedObjectiveGroup[];
  expandedObjectives: number[];
  expandedActivities: string[];
  selectedUid: string | null;
  isModalOpen: boolean;
  onToggleObjective: (objectiveId: number) => void;
  onToggleActivity: (activityId: string) => void;
  onSelectAction: (uid: string) => void;
  isActionLate: (action: Action) => boolean;
}) {
  const { isMobile } = useResponsive();

  return (
    <div className="space-y-4">
      {groupedData.map((objective, objectiveIndex) => {
        const displayNumber = objectiveIndex + 1;

        return (
          <div key={objective.id} className={`bg-white dark:bg-slate-800 rounded-2xl border-2 overflow-hidden shadow-lg hover:shadow-xl transition-shadow ${OBJECTIVE_COLORS[displayNumber]?.border || "border-slate-200 dark:border-slate-700"}`}>
            <button onClick={() => onToggleObjective(objective.id)} className="w-full px-3 sm:px-5 py-3 sm:py-4 flex flex-wrap items-center gap-2 sm:gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-all">
              <span className={`text-slate-400 transition-transform duration-200 ${expandedObjectives.includes(objective.id) ? "rotate-0" : "-rotate-90"}`}>
                <ChevronDown size={20} />
              </span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg ${OBJECTIVE_COLORS[displayNumber]?.accent || "bg-teal-500"}`}>
                {displayNumber}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base leading-snug">{objective.title}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{objective.actionCount} ações</span>
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{objective.activities.length} atividades</span>
                  {objective.lateCount > 0 ? <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600 animate-pulse dark:bg-orange-900/30 dark:text-orange-400">{objective.lateCount} atrasadas</span> : null}
                </div>
              </div>
              <div className={`flex items-center gap-3 ${isMobile ? "w-full pl-8" : ""}`}>
                <div className={`${isMobile ? "flex-1" : "w-32"}`}><MiniProgress value={objective.progress} size="md" /></div>
                <span className={`text-base sm:text-lg font-bold w-12 sm:w-14 text-right ${objective.progress >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300"}`}>{objective.progress}%</span>
              </div>
            </button>

            {expandedObjectives.includes(objective.id) ? (
              <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30">
                {objective.activities.map((activity) => (
                  <div key={activity.id} className="border-b border-slate-100/80 dark:border-slate-700/30 last:border-0">
                    <button onClick={() => onToggleActivity(activity.id)} className="w-full px-3 sm:px-5 py-3 pl-4 sm:pl-14 flex flex-wrap items-center gap-2 sm:gap-3 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all">
                      <span className={`text-slate-400 transition-transform duration-200 ${expandedActivities.includes(activity.id) ? "rotate-0" : "-rotate-90"}`}>
                        <ChevronDown size={16} />
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center relative shadow-sm">
                        <Layers size={13} className="text-slate-500 dark:text-slate-400" />
                        <span className={`absolute -left-2.5 w-2.5 h-2.5 rounded-full shadow-sm ${OBJECTIVE_COLORS[displayNumber]?.accent || "bg-slate-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-snug">{getActivityDisplayId(activity.id)}. {activity.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-slate-500 dark:text-slate-400">{activity.actions.length} ações</span>
                          {activity.lateCount > 0 ? <span className="text-xs font-medium text-orange-500">• {activity.lateCount} atrasadas</span> : null}
                        </div>
                      </div>
                      <div className={`flex items-center gap-3 ${isMobile ? "w-full pl-9" : ""}`}>
                        <div className={`${isMobile ? "flex-1" : "w-20"}`}><MiniProgress value={activity.progress} /></div>
                        <span className={`text-sm font-bold w-10 text-right ${activity.progress >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>{activity.progress}%</span>
                      </div>
                    </button>

                    {expandedActivities.includes(activity.id) && activity.actions.length > 0 ? (
                      <div className="px-3 sm:px-5 pb-4 pl-4 sm:pl-20 bg-white/40 dark:bg-slate-800/40">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {activity.actions.map((action) => {
                            const isSelected = selectedUid === action.uid && isModalOpen;
                            return <div key={action.uid} className={`transition-all duration-200 ${isSelected ? "ring-2 ring-teal-400 ring-offset-2 rounded-xl" : ""}`}><ActionCard action={action} onClick={() => onSelectAction(action.uid)} isLate={isActionLate(action)} /></div>;
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function OptimizedCardsView({
  filteredActions,
  selectedUid,
  isModalOpen,
  onSelectAction,
  isActionLate,
}: {
  filteredActions: Action[];
  selectedUid: string | null;
  isModalOpen: boolean;
  onSelectAction: (uid: string) => void;
  isActionLate: (action: Action) => boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {filteredActions.map((action) => {
        const isSelected = selectedUid === action.uid && isModalOpen;
        return <div key={action.uid} className={`transition-all duration-200 ${isSelected ? "ring-2 ring-teal-400 ring-offset-2 rounded-xl scale-[1.02]" : ""}`}><ActionCard action={action} onClick={() => onSelectAction(action.uid)} isLate={isActionLate(action)} /></div>;
      })}
    </div>
  );
}

export function OptimizedListView({
  groupedData,
  selectedUid,
  isModalOpen,
  onSelectAction,
  isActionLate,
}: {
  groupedData: OptimizedObjectiveGroup[];
  selectedUid: string | null;
  isModalOpen: boolean;
  onSelectAction: (uid: string) => void;
  isActionLate: (action: Action) => boolean;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-700 dark:to-slate-700/50 border-b border-slate-200 dark:border-slate-600 flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm bg-opacity-90">
        <span className="w-3"></span>
        <span className="w-8"></span>
        <span className="w-16">ID</span>
        <span className="flex-1">Ação</span>
        <span className="w-28 pl-6">Progresso</span>
        <span className="w-10 text-center">Comentários</span>
        <span className="w-28">Responsável</span>
        <span className="w-24 text-right">Prazo</span>
        <span className="w-8"></span>
        <span className="w-8"></span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {buildListRows({ groupedData, selectedUid, isModalOpen, onSelectAction, isActionLate })}
      </div>
    </div>
  );
}

export function OptimizedKanbanView({
  filteredActions,
  selectedUid,
  isModalOpen,
  onSelectAction,
  isActionLate,
}: {
  filteredActions: Action[];
  selectedUid: string | null;
  isModalOpen: boolean;
  onSelectAction: (uid: string) => void;
  isActionLate: (action: Action) => boolean;
}) {
  const { isMobile } = useResponsive();

  return (
    <div className="pb-2">
      {isMobile ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1 pb-2">
          Deslize para os lados para navegar entre as colunas.
        </p>
      ) : null}

      <div className={isMobile ? "flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1" : "grid grid-cols-4 gap-4"}>
        {KANBAN_COLUMNS.map((column) => {
          const columnActions = filteredActions.filter((action) => action.status === column.key);
          return (
            <div key={column.key} className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-2xl overflow-hidden flex flex-col shadow-lg hover:shadow-xl transition-shadow ${isMobile ? "min-w-[82vw] max-w-[82vw] snap-start" : ""}`}>
              <div className={`px-4 py-3 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 ${STATUS_CONFIG[column.key].header}`}>
                <span className="text-sm font-bold flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-white/50 dark:bg-slate-800/50">{STATUS_CONFIG[column.key].icon}</span>
                  {column.label}
                </span>
                <span className="text-xs font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-full shadow-sm">{columnActions.length}</span>
              </div>
              <div className={`p-3 space-y-3 flex-1 bg-slate-50/50 dark:bg-slate-900/30 ${isMobile ? "max-h-[60vh] overflow-y-auto" : ""}`}>
                {columnActions.length === 0 ? <div className="text-sm text-slate-400 italic px-3 py-8 text-center bg-white/50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700"><Zap size={24} className="mx-auto mb-2 opacity-30" />Nenhuma ação</div> : null}
                {columnActions.map((action) => {
                  const isSelected = selectedUid === action.uid && isModalOpen;
                  return <div key={action.uid} className={`transition-all duration-200 ${isSelected ? "ring-2 ring-teal-400 ring-offset-1 rounded-xl scale-[1.02]" : ""}`}><ActionCard action={action} onClick={() => onSelectAction(action.uid)} isLate={isActionLate(action)} /></div>;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
