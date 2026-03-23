import { ComponentType } from 'react';
import { ExtendedAuthContextType } from '../../auth/AuthContext';
import { EditModalConfig } from '../../hooks/useObjectiveActivityEditModal';
import { User } from '../../types/auth.types';
import { ConfirmModal } from '../common/ConfirmModal';
import { EditNameModal } from '../common/EditNameModal';
import { MobileBottomNav } from '../mobile/MobileBottomNav';
import { MobileFab } from '../mobile/MobileActionCard';
import { OnboardingTour } from '../onboarding';
import { CreateActionMicroModal } from './CreateActionMicroModal';
import { FirstAccessModalFlow } from './FirstAccessModalFlow';

type AppNav = 'strategy' | 'home' | 'settings' | 'dashboard' | 'news' | 'hub' | 'forums' | 'mentorship' | 'education' | 'repository';
type AppViewMode = 'table' | 'gantt' | 'team' | 'optimized' | 'calendar';
type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'security' | 'roadmap';
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ConfirmModalState {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  title: string;
}

interface SettingsModalProps {
  initialTab?: SettingsTab;
  isOpen: boolean;
  mode?: 'settings' | 'avatar';
  onClose: () => void;
}

interface AppOverlaysProps {
  SettingsModalComponent: ComponentType<SettingsModalProps>;
  allowAvatarChange: boolean;
  authContext: Pick<ExtendedAuthContextType, 'login'> | null;
  checkCanCreate: () => boolean;
  confirmModal: ConfirmModalState;
  createActionMicroId: string;
  currentNav: AppNav;
  currentWorkspace: 'planning' | 'community';
  editModalConfig: EditModalConfig;
  isAdmin: boolean;
  isCreateActionModalOpen: boolean;
  isMobile: boolean;
  isSettingsModalOpen: boolean;
  settingsInitialTab?: SettingsTab;
  showMunicipalityModal: boolean;
  showOnboarding: boolean;
  user: User | null;
  viewMode: AppViewMode;
  onCloseConfirmModal: () => void;
  onCloseCreateActionModal: () => void;
  onCloseEditModal: () => void;
  onCloseFirstAccessModal: () => void;
  onCloseSettingsModal: () => void;
  onConfirmCreateAction: () => void;
  onCreateAction: () => void;
  onCreateActionMicroIdChange: (microId: string) => void;
  onCurrentNavChange: (nav: AppNav) => void;
  onEditModalSave: (newValue: string) => void;
  onFirstAccessCompleted: () => void;
  onOnboardingComplete: () => void;
  onOnboardingSkip: () => void;
  onOpenOnboarding: () => void;
  onShowToast: (message: string, type?: ToastType) => void;
  onViewModeChange: (viewMode: AppViewMode) => void;
}

export function AppOverlays({
  SettingsModalComponent,
  allowAvatarChange,
  authContext,
  checkCanCreate,
  confirmModal,
  createActionMicroId,
  currentNav,
  currentWorkspace,
  editModalConfig,
  isAdmin,
  isCreateActionModalOpen,
  isMobile,
  isSettingsModalOpen,
  settingsInitialTab,
  showMunicipalityModal,
  showOnboarding,
  user,
  viewMode,
  onCloseConfirmModal,
  onCloseCreateActionModal,
  onCloseEditModal,
  onCloseFirstAccessModal,
  onCloseSettingsModal,
  onConfirmCreateAction,
  onCreateAction,
  onCreateActionMicroIdChange,
  onCurrentNavChange,
  onEditModalSave,
  onFirstAccessCompleted,
  onOnboardingComplete,
  onOnboardingSkip,
  onOpenOnboarding,
  onShowToast,
  onViewModeChange,
}: AppOverlaysProps) {
  return (
    <>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onCancel={onCloseConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Excluir"
        confirmType="danger"
      />

      <CreateActionMicroModal
        isOpen={isAdmin && isCreateActionModalOpen}
        microId={createActionMicroId}
        onMicroIdChange={onCreateActionMicroIdChange}
        onClose={onCloseCreateActionModal}
        onConfirm={onConfirmCreateAction}
      />

      <SettingsModalComponent
        isOpen={isSettingsModalOpen}
        onClose={onCloseSettingsModal}
        mode={allowAvatarChange ? 'avatar' : 'settings'}
        initialTab={settingsInitialTab}
      />

      <EditNameModal
        isOpen={editModalConfig.isOpen}
        onClose={onCloseEditModal}
        onSave={onEditModalSave}
        title={editModalConfig.title}
        initialValue={editModalConfig.initialValue}
        inputType={editModalConfig.inputType}
        label={editModalConfig.label}
      />

      <FirstAccessModalFlow
        authContext={authContext}
        isOpen={showMunicipalityModal}
        onClose={onCloseFirstAccessModal}
        onComplete={onFirstAccessCompleted}
        onOpenOnboarding={onOpenOnboarding}
        onShowToast={onShowToast}
        user={user}
      />

      <OnboardingTour
        isOpen={showOnboarding}
        onComplete={onOnboardingComplete}
        onSkip={onOnboardingSkip}
      />

      {isMobile && (
        <MobileBottomNav
          currentNav={currentNav}
          currentWorkspace={currentWorkspace}
          viewMode={viewMode}
          onNavChange={onCurrentNavChange}
          onViewModeChange={onViewModeChange}
          showTeamOption={user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'gestor'}
        />
      )}

      {isMobile && currentNav === 'strategy' && viewMode === 'table' && checkCanCreate() && (
        <MobileFab
          onClick={onCreateAction}
          icon={<span className="text-2xl leading-none">+</span>}
          label="Nova Ação"
          color="teal"
        />
      )}
    </>
  );
}
