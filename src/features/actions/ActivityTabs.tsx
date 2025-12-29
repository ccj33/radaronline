import React from 'react';
import { Activity } from '../../types';
import { Info } from 'lucide-react';

interface ActivityTabsProps {
  activities: Activity[];
  selectedActivity: string;
  setSelectedActivity: (id: string) => void;
}

export const ActivityTabs: React.FC<ActivityTabsProps> = ({
  activities,
  selectedActivity,
  setSelectedActivity,
}) => {
  const currentActivity = activities?.find(a => a.id === selectedActivity);

  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-[72px] z-20 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.1)] flex flex-col">
      {/* Barra de Abas */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 sm:px-6 py-2 scrollbar-hide">
        {activities?.map(act => {
          const isActive = selectedActivity === act.id;
          return (
            <button
              key={act.id}
              onClick={() => setSelectedActivity(act.id)}
              className={`
                group flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-200 shrink-0 border
                ${isActive
                  ? "bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700 text-teal-800 dark:text-teal-200 shadow-sm"
                  : "bg-white dark:bg-slate-700 border-transparent hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }
              `}
            >
              <div className={`
                flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold shrink-0 transition-colors
                ${isActive ? 'bg-teal-200 dark:bg-teal-800 text-teal-800 dark:text-teal-200' : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-500'}
              `}>
                {act.id}
              </div>

              <div className="flex flex-col">
                <span className={`text-xs font-semibold whitespace-nowrap ${isActive ? 'text-teal-900 dark:text-teal-100' : 'text-slate-700 dark:text-slate-200'}`}>
                  {act.title}
                </span>
                {/* Descrição resumida na própria tab removida para limpar visual, já que teremos descrição detalhada abaixo */}
              </div>

              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 ml-1 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Descrição da Atividade Integrada */}
      {currentActivity?.description && (
        <div className="px-4 sm:px-6 py-2 bg-slate-50/50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-600 flex items-start gap-2 animate-fade-in">
          <Info size={14} className="text-teal-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl">
            <span className="font-semibold text-slate-700 dark:text-slate-200 mr-1">Sobre esta atividade:</span>
            {currentActivity.description}
          </p>
        </div>
      )}
    </div>
  );
};
