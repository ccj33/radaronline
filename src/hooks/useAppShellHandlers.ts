import { useCallback, type Dispatch, type SetStateAction } from 'react';

type CurrentPage = 'main' | 'admin' | 'lgpd';
type CurrentNav = 'strategy' | 'home' | 'settings' | 'dashboard' | 'news' | 'hub' | 'forums' | 'mentorship' | 'education' | 'repository';
type ViewMode = 'table' | 'gantt' | 'team' | 'optimized' | 'calendar';
type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'security' | 'roadmap';

interface UseAppShellHandlersProps {
  isMobile: boolean;
  viewingMicroregiaoId: string | null;
  setCurrentPage: Dispatch<SetStateAction<CurrentPage>>;
  setCurrentNav: Dispatch<SetStateAction<CurrentNav>>;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
  setIsMobileDrawerOpen: Dispatch<SetStateAction<boolean>>;
  setIsSettingsModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsEditMode: Dispatch<SetStateAction<boolean>>;
  handleOpenSettings: (mode?: 'settings' | 'avatar', initialTab?: SettingsTab) => void;
}

export function useAppShellHandlers({
  isMobile,
  viewingMicroregiaoId,
  setCurrentPage,
  setCurrentNav,
  setViewMode,
  setIsSidebarOpen,
  setIsMobileDrawerOpen,
  setIsSettingsModalOpen,
  setIsEditMode,
  handleOpenSettings,
}: UseAppShellHandlersProps) {
  const handleCurrentNavChange = useCallback((nav: string) => {
    setCurrentNav(nav as CurrentNav);
  }, [setCurrentNav]);

  const handleOpenAdminPage = useCallback(() => {
    setCurrentPage('admin');
  }, [setCurrentPage]);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, [setIsSidebarOpen]);

  const handleHeaderMenuClick = useCallback(() => {
    if (isMobile && viewingMicroregiaoId) {
      setIsMobileDrawerOpen(true);
      return;
    }

    setIsSidebarOpen(true);
  }, [isMobile, setIsMobileDrawerOpen, setIsSidebarOpen, viewingMicroregiaoId]);

  const handleCloseMobileDrawer = useCallback(() => {
    setIsMobileDrawerOpen(false);
  }, [setIsMobileDrawerOpen]);

  const handleGoToStrategyTable = useCallback(() => {
    setCurrentNav('strategy');
    setViewMode('table');
  }, [setCurrentNav, setViewMode]);

  const handleGoToStrategyCalendar = useCallback(() => {
    setCurrentNav('strategy');
    setViewMode('calendar');
  }, [setCurrentNav, setViewMode]);

  const handleCloseSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, [setIsSettingsModalOpen]);

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode(prev => !prev);
  }, [setIsEditMode]);

  const handleOpenSettingsPanel = useCallback(() => {
    handleOpenSettings('settings');
  }, [handleOpenSettings]);

  const handleOpenAvatarSettings = useCallback(() => {
    handleOpenSettings('avatar');
  }, [handleOpenSettings]);

  const handleOpenRoadmapSettings = useCallback(() => {
    handleOpenSettings('settings', 'roadmap');
  }, [handleOpenSettings]);

  return {
    handleCurrentNavChange,
    handleOpenAdminPage,
    handleToggleSidebar,
    handleHeaderMenuClick,
    handleCloseMobileDrawer,
    handleGoToStrategyTable,
    handleGoToStrategyCalendar,
    handleCloseSettingsModal,
    handleToggleEditMode,
    handleOpenSettingsPanel,
    handleOpenAvatarSettings,
    handleOpenRoadmapSettings,
  };
}
