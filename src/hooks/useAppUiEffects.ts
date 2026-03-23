import { RefObject, useEffect } from 'react';
import { MICROREGIOES } from '../data/microregioes';
import { GanttRange } from '../types';

type AppNav = 'strategy' | 'home' | 'settings' | 'dashboard' | 'news' | 'hub' | 'forums' | 'mentorship' | 'education' | 'repository';
type AppViewMode = 'table' | 'gantt' | 'team' | 'optimized' | 'calendar';

interface UseAppUiEffectsProps {
  activityTabsRef: RefObject<HTMLDivElement | null>;
  chartContainerRef: RefObject<HTMLDivElement | null>;
  createActionMicroId: string;
  currentNav: AppNav;
  expandedActionUid: string | null;
  isCreateActionModalOpen: boolean;
  isMobile: boolean;
  isSidebarOpen: boolean;
  selectedActivity: string;
  viewingMicroregiaoId: string | null;
  viewMode: AppViewMode;
  setContainerWidth: (width: number) => void;
  setCreateActionMicroId: (microId: string) => void;
  setCurrentNav: (nav: AppNav) => void;
  setGanttRange: (range: GanttRange) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setShowStickyActivity: (show: boolean) => void;
}

export function useAppUiEffects({
  activityTabsRef,
  chartContainerRef,
  createActionMicroId,
  currentNav,
  expandedActionUid,
  isCreateActionModalOpen,
  isMobile,
  isSidebarOpen,
  selectedActivity,
  viewingMicroregiaoId,
  viewMode,
  setContainerWidth,
  setCreateActionMicroId,
  setCurrentNav,
  setGanttRange,
  setIsSidebarOpen,
  setShowStickyActivity,
}: UseAppUiEffectsProps) {
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile, setIsSidebarOpen]);

  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }

    if (viewMode === 'gantt') {
      setGanttRange('all');
    }
  }, [currentNav, isMobile, setGanttRange, setIsSidebarOpen, viewMode]);

  useEffect(() => {
    setShowStickyActivity(false);

    const tabsElement = activityTabsRef.current;
    if (!tabsElement || viewMode !== 'table' || currentNav !== 'strategy') {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyActivity(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-10px 0px 0px 0px' }
    );

    observer.observe(tabsElement);
    return () => observer.disconnect();
  }, [activityTabsRef, currentNav, selectedActivity, setShowStickyActivity, viewMode]);

  useEffect(() => {
    if (isCreateActionModalOpen && !createActionMicroId) {
      setCreateActionMicroId(MICROREGIOES[0]?.id || '');
    }
  }, [createActionMicroId, isCreateActionModalOpen, setCreateActionMicroId]);

  useEffect(() => {
    const chartElement = chartContainerRef.current;
    if (!chartElement) {
      return;
    }

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(chartElement);
    return () => resizeObserver.disconnect();
  }, [chartContainerRef, isSidebarOpen, setContainerWidth, viewMode]);

  useEffect(() => {
    if (viewMode !== 'table' || !expandedActionUid) {
      return;
    }

    const element = document.getElementById(`action-${expandedActionUid}`);
    if (!element) {
      return;
    }

    const timerId = window.setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    return () => window.clearTimeout(timerId);
  }, [expandedActionUid, viewMode]);

  useEffect(() => {
    if (viewingMicroregiaoId) {
      setCurrentNav('dashboard');
    }
  }, [setCurrentNav, viewingMicroregiaoId]);
}
