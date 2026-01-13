import React, { useRef, useEffect, useState } from 'react';
import { Activity } from '../../types';
import { Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive';
import { getActivityDisplayId } from '../../lib/text';

interface ActivityTabsProps {
  activities: Activity[];
  selectedActivity: string;
  setSelectedActivity: (id: string) => void;
  isEditMode?: boolean;
  onUpdateActivity?: (id: string, field: 'title' | 'description', value: string) => void;
}

export const ActivityTabs: React.FC<ActivityTabsProps> = ({
  activities,
  selectedActivity,
  setSelectedActivity,
  isEditMode = false,
  onUpdateActivity,
}) => {
  const currentActivity = activities?.find(a => a.id === selectedActivity);
  const { isMobile } = useResponsive();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Check scroll position to show/hide arrows
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [activities]);

  // Scroll selected tab into view
  useEffect(() => {
    if (scrollRef.current && selectedActivity) {
      const activeTab = scrollRef.current.querySelector(`[data-activity-id="${selectedActivity}"]`);
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedActivity]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };


  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-[72px] z-20 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.1)] flex flex-col">
      {/* Barra de Abas */}
      <div className="relative flex items-center">
        {/* Left scroll indicator/button */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 z-10 h-full px-1 sm:px-2 bg-gradient-to-r from-white via-white dark:from-slate-800 dark:via-slate-800 to-transparent flex items-center"
            aria-label="Scroll left"
          >
            <ChevronLeft size={isMobile ? 16 : 20} className="text-slate-400 dark:text-slate-500" />
          </button>
        )}
        
        <div 
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto px-4 sm:px-6 py-2 scrollbar-hide scroll-smooth snap-x snap-mandatory"
          style={{ scrollPaddingInline: '1rem' }}
        >
        {activities?.map(act => {
          const isActive = selectedActivity === act.id;
          return (
            <button
              key={act.id}
              data-activity-id={act.id}
              onClick={() => setSelectedActivity(act.id)}
              className={`
                group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-lg text-left transition-all duration-200 shrink-0 border snap-center touch-target
                ${isActive
                  ? "bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700 text-teal-800 dark:text-teal-200 shadow-sm"
                  : "bg-white dark:bg-slate-700 border-transparent hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }
              `}
            >
              <div className={`
                flex items-center justify-center h-5 sm:h-6 px-1 sm:px-1.5 rounded-md text-[9px] sm:text-[10px] font-bold shrink-0 transition-colors
                ${isActive ? 'bg-teal-200 dark:bg-teal-800 text-teal-800 dark:text-teal-200' : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-500'}
              `}>
                {isMobile ? getActivityDisplayId(act.id) : `Atv ${getActivityDisplayId(act.id)}`}
              </div>

              <div className="flex flex-col flex-1 pl-0.5 sm:pl-1">
                <span
                  className={`text-[11px] sm:text-xs font-semibold whitespace-nowrap max-w-[100px] sm:max-w-none truncate ${isActive ? 'text-teal-900 dark:text-teal-100' : 'text-slate-700 dark:text-slate-200'} ${isEditMode ? 'cursor-pointer hover:underline decoration-dashed' : ''}`}
                  onClick={(e) => {
                    if (isEditMode) {
                      e.stopPropagation();
                      onUpdateActivity?.(act.id, 'title', act.title);
                    }
                  }}
                  title={isEditMode ? "Clique para editar título" : act.title}
                >
                  {act.title}
                </span>
              </div>

              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 ml-0.5 sm:ml-1 animate-pulse shrink-0" />
              )}
            </button>
          );
        })}
        </div>
        
        {/* Right scroll indicator/button */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 z-10 h-full px-1 sm:px-2 bg-gradient-to-l from-white via-white dark:from-slate-800 dark:via-slate-800 to-transparent flex items-center"
            aria-label="Scroll right"
          >
            <ChevronRight size={isMobile ? 16 : 20} className="text-slate-400 dark:text-slate-500" />
          </button>
        )}
      </div>

      {/* Descrição da Atividade Integrada */}
      {(currentActivity?.description || isEditMode) && (
        <div className="px-4 sm:px-6 py-2 bg-slate-50/50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-600 flex items-start gap-2 animate-fade-in">
          <Info size={14} className="text-teal-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl">
            <span className="font-semibold text-slate-700 dark:text-slate-200 mr-1">Sobre esta atividade:</span>
            {isEditMode && currentActivity ? (
              <span
                className={`cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 px-1 rounded transition-colors border border-dashed border-slate-300 dark:border-slate-500`}
                onClick={() => onUpdateActivity?.(currentActivity.id, 'description', currentActivity.description || '')}
                title="Clique para editar descrição"
              >
                {currentActivity.description || "Clique para adicionar descrição..."}
              </span>
            ) : (
              currentActivity?.description
            )}
          </p>
        </div>
      )}
    </div>
  );
};
