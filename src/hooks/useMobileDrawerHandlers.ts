import { useCallback } from 'react';

interface UseMobileDrawerHandlersProps {
  onClose: () => void;
  onSelectObjective: (id: number) => void;
  onSelectActivity: (id: string) => void;
  onGoToStrategy: () => void;
  onAvatarClick?: () => void;
  onAdminClick?: () => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
}

export function useMobileDrawerHandlers({
  onClose,
  onSelectObjective,
  onSelectActivity,
  onGoToStrategy,
  onAvatarClick,
  onAdminClick,
  onSettingsClick,
  onLogout,
}: UseMobileDrawerHandlersProps) {
  const closeAfter = useCallback((action?: () => void) => {
    return () => {
      action?.();
      onClose();
    };
  }, [onClose]);

  const handleSelectActivity = useCallback((objectiveId: number, activityId: string) => {
    onSelectObjective(objectiveId);
    onSelectActivity(activityId);
    onGoToStrategy();
    onClose();
  }, [onClose, onGoToStrategy, onSelectActivity, onSelectObjective]);

  return {
    handleSelectActivity,
    handleAvatarClick: closeAfter(onAvatarClick),
    handleAdminClick: closeAfter(onAdminClick),
    handleSettingsClick: closeAfter(onSettingsClick),
    handleLogout: closeAfter(onLogout),
  };
}
