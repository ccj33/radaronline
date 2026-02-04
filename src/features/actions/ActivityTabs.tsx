import React, { useRef, useEffect, useState } from 'react';
import { Activity } from '../../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

  // Altura do header: mobile = ~90px (duas linhas), desktop = 64px
  const stickyTop = isMobile ? 'top-[90px]' : 'top-16';

  return (
    <div className={`sticky ${stickyTop} z-20 flex flex-col transition-all duration-300`}>
      {/* Barra de Abas - Glassmorphism */}
      <div className="relative flex items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm">
        {/* Left scroll indicator/button */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 z-10 h-full px-1 sm:px-2 bg-gradient-to-r from-white/90 via-white/80 dark:from-slate-900/90 dark:via-slate-900/80 to-transparent flex items-center"
            aria-label="Scroll left"
          >
            <ChevronLeft size={isMobile ? 16 : 20} className="text-slate-400 dark:text-slate-500" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex items-center gap-2 overflow-x-auto px-4 sm:px-8 py-2 scrollbar-hide scroll-smooth snap-x snap-mandatory"
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
                group flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-left transition-all duration-200 shrink-0 border snap-center touch-target
                ${isActive
                    ? "bg-teal-600 border-teal-600 text-white shadow-md"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }
              `}
              >
                <span className={`
                  text-[10px] uppercase font-bold tracking-wider
                  ${isActive ? 'text-teal-100' : 'text-slate-400 group-hover:text-slate-500'}
                `}>
                  {getActivityDisplayId(act.id)}
                </span>

                <span
                  className={`text-xs sm:text-sm font-semibold whitespace-nowrap max-w-[140px] sm:max-w-[240px] truncate ${isActive ? 'text-white' : 'text-slate-700 dark:text-slate-200'} ${isEditMode ? 'cursor-pointer hover:underline decoration-white/50' : ''}`}
                  onClick={(e) => {
                    if (isEditMode) {
                      e.stopPropagation();
                      onUpdateActivity?.(act.id, 'title', act.title);
                    }
                  }}
                  title={act.title}
                >
                  {act.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right scroll indicator/button */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 z-10 h-full px-1 sm:px-2 bg-gradient-to-l from-white/90 via-white/80 dark:from-slate-900/90 dark:via-slate-900/80 to-transparent flex items-center"
            aria-label="Scroll right"
          >
            <ChevronRight size={isMobile ? 16 : 20} className="text-slate-400 dark:text-slate-500" />
          </button>
        )}
      </div>
    </div>
  );
};
