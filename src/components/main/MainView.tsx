import React, { RefObject, Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useActionPatchHandler } from '../../hooks/useActionPatchHandler';
import { Action, ActionComment, Activity, GanttRange, Objective, RaciRole, Status, TeamMember } from '../../types';
import { ParsedAction } from '../../features/actions/SmartPasteModal';
import { MainViewContentSwitch } from './MainViewContentSwitch';
import { MainViewStrategySection } from './MainViewStrategySection';

const ActionDetailModal = lazy(() => import('../../features/actions/ActionDetailModal').then(m => ({ default: m.ActionDetailModal })));

interface MainViewProps {
  activityTabsRef: RefObject<HTMLDivElement>;
  chartContainerRef: RefObject<HTMLDivElement>;
  containerWidth: number;
  currentActivity?: Activity;
  currentMicroId: string;
  currentMicroLabel?: string;
  currentNav: 'strategy' | 'home' | 'settings' | 'dashboard' | 'news' | 'hub' | 'forums' | 'mentorship' | 'education' | 'repository';
  userId?: string;
  currentTeam: TeamMember[];
  expandedActionUid: string | null;
  filteredActivities: Record<number, Activity[]>;
  filteredObjectives: Objective[];
  ganttActions: Action[];
  ganttRange: GanttRange;
  ganttStatusFilter: Status | 'all';
  involvedAreaFilter: string;
  isEditMode: boolean;
  isMobile: boolean;
  isSaving: boolean;
  microActions: Action[];
  objectives: Objective[];
  activities: Record<number, Activity[]>;
  readOnly: boolean;
  responsibleFilter: string;
  searchTerm: string;
  selectedActivity: string;
  selectedObjective: number;
  statusFilter: Status | 'all';
  viewMode: 'table' | 'gantt' | 'team' | 'optimized' | 'calendar';
  canCreateObjective: boolean;
  onCommunityNavigate: (nav: 'hub' | 'forums' | 'mentorship' | 'education' | 'repository') => void;
  onAddComment: (uid: string, content: string, parentId?: string | null) => Promise<ActionComment | null>;
  onAddMember: (member: Omit<TeamMember, 'id'>) => Promise<TeamMember | null>;
  onAddObjective: () => void;
  onAddRaci: (uid: string, memberId: string, role: RaciRole) => void;
  onBulkImport: (actions: ParsedAction[]) => Promise<void>;
  onCloseActionModal: () => void;
  onCreateAction: () => void;
  onDeleteAction: (uid: string) => void;
  onDashboardNavigate: (view: 'list' | 'team', filters?: { status?: string; objectiveId?: number }) => void;
  onExpandAction: (uid: string | null) => void;
  onGanttActionClick: (action: Action) => void;
  onOpenRoadmapSettings: () => void;
  onRemoveMember: (memberId: string) => Promise<boolean>;
  onRemoveRaci: (uid: string, idx: number, memberName: string) => void;
  onSaveAction: (uid?: string) => Promise<void>;
  onSaveAndNewAction: (updatedAction: Action) => Promise<void>;
  onSaveFullAction: (updatedAction: Action) => Promise<void>;
  onSetGanttRange: (range: GanttRange) => void;
  onSetGanttStatusFilter: (status: Status | 'all') => void;
  onSetInvolvedAreaFilter: (area: string) => void;
  onSetResponsibleFilter: (responsible: string) => void;
  onSetSearchTerm: (term: string) => void;
  onSetSelectedActivity: (activityId: string) => void;
  onSetSelectedObjective: (objectiveId: number) => void;
  onSetStatusFilter: (status: Status | 'all') => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onUpdateAction: (uid: string, field: string, value: string | number) => void;
  onUpdateActivity: (id: string, field: 'title' | 'description', value: string) => void;
  onUpdateObjectiveField: (id: number, field: 'eixo' | 'description' | 'eixoLabel' | 'eixoColor', value: string | number) => void;
  onUpdateTeam: (microId: string, updatedTeam: TeamMember[]) => void;
  checkCanCreate: () => boolean;
  checkCanDelete: (action: Action) => boolean;
  checkCanEdit: (action: Action) => boolean;
}

function readMobileObjectiveSelectionGate(storageKey: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.sessionStorage.getItem(storageKey) === '1';
  } catch {
    return false;
  }
}

function writeMobileObjectiveSelectionGate(storageKey: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(storageKey, '1');
  } catch {
    // no-op when browser storage is blocked
  }
}

export function MainView({
  activityTabsRef,
  chartContainerRef,
  containerWidth,
  currentActivity,
  currentMicroId,
  currentMicroLabel,
  currentNav,
  userId,
  currentTeam,
  expandedActionUid,
  filteredActivities,
  filteredObjectives,
  ganttActions,
  ganttRange,
  ganttStatusFilter,
  involvedAreaFilter,
  isEditMode,
  isMobile,
  isSaving,
  microActions,
  objectives,
  activities,
  readOnly,
  responsibleFilter,
  searchTerm,
  selectedActivity,
  selectedObjective,
  statusFilter,
  viewMode,
  canCreateObjective,
  onCommunityNavigate,
  onAddComment,
  onAddMember,
  onAddObjective,
  onAddRaci,
  onBulkImport,
  onCloseActionModal,
  onCreateAction,
  onDashboardNavigate,
  onDeleteAction,
  onExpandAction,
  onGanttActionClick,
  onOpenRoadmapSettings,
  onRemoveMember,
  onRemoveRaci,
  onSaveAction,
  onSaveAndNewAction,
  onSaveFullAction,
  onSetGanttRange,
  onSetGanttStatusFilter,
  onSetInvolvedAreaFilter,
  onSetResponsibleFilter,
  onSetSearchTerm,
  onSetSelectedActivity,
  onSetSelectedObjective,
  onSetStatusFilter,
  onShowToast,
  onUpdateAction,
  onUpdateActivity,
  onUpdateObjectiveField,
  onUpdateTeam,
  checkCanCreate,
  checkCanDelete,
  checkCanEdit,
}: MainViewProps) {
  const handleUpdateActionPatch = useActionPatchHandler(onUpdateAction);
  const mobileObjectiveSelectionStorageKey = useMemo(
    () => `radar.mobile-actions-objective-selection.${currentMicroId || 'all'}`,
    [currentMicroId],
  );
  const [hasMobileObjectiveSelection, setHasMobileObjectiveSelection] = useState(() =>
    readMobileObjectiveSelectionGate(mobileObjectiveSelectionStorageKey),
  );

  const selectedAction = useMemo(() => {
    if (!expandedActionUid) {
      return null;
    }

    return microActions.find(action => action.uid === expandedActionUid) || null;
  }, [expandedActionUid, microActions]);

  const isMobileActionsScreen = isMobile && currentNav === 'strategy' && viewMode === 'table';
  const hasValidSelectedObjective = useMemo(
    () => filteredObjectives.some((objective) => objective.id === selectedObjective),
    [filteredObjectives, selectedObjective],
  );

  const markMobileObjectiveSelection = useCallback(() => {
    setHasMobileObjectiveSelection(true);
    writeMobileObjectiveSelectionGate(mobileObjectiveSelectionStorageKey);
  }, [mobileObjectiveSelectionStorageKey]);

  useEffect(() => {
    setHasMobileObjectiveSelection(
      readMobileObjectiveSelectionGate(mobileObjectiveSelectionStorageKey),
    );
  }, [mobileObjectiveSelectionStorageKey]);

  return (
    <>
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden relative ${isMobile
          ? currentNav === 'strategy' && viewMode === 'table' && checkCanCreate()
            ? 'pb-mobile-nav-with-fab'
            : 'pb-mobile-nav'
          : ''}`}
      >
        {currentNav === 'strategy' && viewMode === 'table' && (
          <MainViewStrategySection
            activityTabsRef={activityTabsRef}
            canCreateObjective={canCreateObjective}
            filteredActivities={filteredActivities}
            filteredObjectives={filteredObjectives}
            isMobile={isMobile}
            isEditMode={isEditMode}
            selectedActivity={selectedActivity}
            selectedObjective={selectedObjective}
            onAddObjective={onAddObjective}
            onMobileObjectiveSelected={markMobileObjectiveSelection}
            onSetSelectedActivity={onSetSelectedActivity}
            onSetSelectedObjective={onSetSelectedObjective}
            onUpdateActivity={onUpdateActivity}
          />
        )}

        <MainViewContentSwitch
          chartContainerRef={chartContainerRef}
          containerWidth={containerWidth}
          currentMicroId={currentMicroId}
          currentMicroLabel={currentMicroLabel}
          currentNav={currentNav}
          userId={userId}
          currentTeam={currentTeam}
          expandedActionUid={expandedActionUid}
          filteredActivities={filteredActivities}
          filteredObjectives={filteredObjectives}
          ganttActions={ganttActions}
          ganttRange={ganttRange}
          ganttStatusFilter={ganttStatusFilter}
          handleUpdateActionPatch={handleUpdateActionPatch}
          involvedAreaFilter={involvedAreaFilter}
          isEditMode={isEditMode}
          isMobile={isMobile}
          isSaving={isSaving}
          microActions={microActions}
          objectives={objectives}
          activities={activities}
          readOnly={readOnly}
          responsibleFilter={responsibleFilter}
          searchTerm={searchTerm}
          selectedActivity={selectedActivity}
          selectedObjective={selectedObjective}
          statusFilter={statusFilter}
          viewMode={viewMode}
          requireMobileObjectiveSelection={
            isMobileActionsScreen &&
            filteredObjectives.length > 0 &&
            (!hasValidSelectedObjective || !hasMobileObjectiveSelection)
          }
          checkCanCreate={checkCanCreate}
          checkCanDelete={checkCanDelete}
          checkCanEdit={checkCanEdit}
          onCommunityNavigate={onCommunityNavigate}
          onAddComment={onAddComment}
          onAddMember={onAddMember}
          onBulkImport={onBulkImport}
          onCreateAction={onCreateAction}
          onDashboardNavigate={onDashboardNavigate}
          onDeleteAction={onDeleteAction}
          onExpandAction={onExpandAction}
          onGanttActionClick={onGanttActionClick}
          onOpenRoadmapSettings={onOpenRoadmapSettings}
          onRemoveMember={onRemoveMember}
          onAddRaci={onAddRaci}
          onRemoveRaci={onRemoveRaci}
          onSaveAction={onSaveAction}
          onSetGanttRange={onSetGanttRange}
          onSetGanttStatusFilter={onSetGanttStatusFilter}
          onSetInvolvedAreaFilter={onSetInvolvedAreaFilter}
          onSetResponsibleFilter={onSetResponsibleFilter}
          onSetSearchTerm={onSetSearchTerm}
          onSetStatusFilter={onSetStatusFilter}
          onShowToast={onShowToast}
          onUpdateAction={onUpdateAction}
          onUpdateActivity={onUpdateActivity}
          onUpdateObjectiveField={onUpdateObjectiveField}
          onUpdateTeam={onUpdateTeam}
        />
      </div>

      <Suspense fallback={null}>
        <ActionDetailModal
          isOpen={!!selectedAction}
          action={selectedAction}
          team={currentTeam}
          activityName={currentActivity?.title || 'Atividade'}
          onClose={onCloseActionModal}
          onSaveFullAction={onSaveFullAction}
          onSaveAndNew={onSaveAndNewAction}
          onDeleteAction={onDeleteAction}
          isSaving={isSaving}
          canEdit={selectedAction ? checkCanEdit(selectedAction) : false}
          canDelete={selectedAction ? checkCanDelete(selectedAction) : false}
          readOnly={readOnly}
        />
      </Suspense>
    </>
  );
}
