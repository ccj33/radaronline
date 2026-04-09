import React, { RefObject, Suspense, lazy } from 'react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { Action, ActionComment, Activity, GanttRange, Objective, RaciRole, Status, TeamMember } from '../../types';
import { ParsedAction } from '../../features/actions/SmartPasteModal';

const Dashboard = lazy(() => import('../../features/dashboard').then(m => ({ default: m.Dashboard })));
const OptimizedView = lazy(() => import('../../features/dashboard').then(m => ({ default: m.OptimizedView })));
const GanttChart = lazy(() => import('../../features/gantt/GanttChart').then(m => ({ default: m.GanttChart })));
const LinearCalendar = lazy(() => import('../../features/admin/dashboard/LinearCalendar').then(m => ({ default: m.LinearCalendar })));
const TeamView = lazy(() => import('../../features/team/TeamView').then(m => ({ default: m.TeamView })));
const ActionTable = lazy(() => import('../../features/actions/ActionTable').then(m => ({ default: m.ActionTable })));
const NewsFeed = lazy(() => import('../../features/news/NewsFeed').then(m => ({ default: m.NewsFeed })));
const HubHomePage = lazy(() => import('../../features/hub/home/HubHomePage').then(m => ({ default: m.HubHomePage })));
const ForumsPage = lazy(() => import('../../features/hub/forums/ForumsPage').then(m => ({ default: m.ForumsPage })));
const MentorshipPage = lazy(() => import('../../features/hub/mentorship/MentorshipPage').then(m => ({ default: m.MentorshipPage })));
const EducationPage = lazy(() => import('../../features/hub/education/EducationPage').then(m => ({ default: m.EducationPage })));
const RepositoryPage = lazy(() => import('../../features/hub/repository/RepositoryPage').then(m => ({ default: m.RepositoryPage })));

const sectionFallback = (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
  </div>
);

interface MainViewContentSwitchProps {
  chartContainerRef: RefObject<HTMLDivElement>;
  containerWidth: number;
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
  handleUpdateActionPatch: (uid: string, patch: Partial<Action>) => void;
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
  requireMobileObjectiveSelection: boolean;
  checkCanCreate: () => boolean;
  checkCanDelete: (action: Action) => boolean;
  checkCanEdit: (action: Action) => boolean;
  onCommunityNavigate: (nav: 'hub' | 'forums' | 'mentorship' | 'education' | 'repository') => void;
  onAddComment: (uid: string, content: string, parentId?: string | null) => Promise<ActionComment | null>;
  onAddMember: (member: Omit<TeamMember, 'id'>) => Promise<TeamMember | null>;
  onBulkImport: (actions: ParsedAction[]) => Promise<void>;
  onCreateAction: () => void;
  onDashboardNavigate: (view: 'list' | 'team', filters?: { status?: string; objectiveId?: number }) => void;
  onDeleteAction: (uid: string) => void;
  onExpandAction: (uid: string | null) => void;
  onGanttActionClick: (action: Action) => void;
  onOpenRoadmapSettings: () => void;
  onRemoveMember: (memberId: string) => Promise<boolean>;
  onAddRaci: (uid: string, memberId: string, role: RaciRole) => void;
  onRemoveRaci: (uid: string, idx: number, memberName: string) => void;
  onSaveAction: (uid?: string) => Promise<void>;
  onSetGanttRange: (range: GanttRange) => void;
  onSetGanttStatusFilter: (status: Status | 'all') => void;
  onSetInvolvedAreaFilter: (area: string) => void;
  onSetResponsibleFilter: (responsible: string) => void;
  onSetSearchTerm: (term: string) => void;
  onSetStatusFilter: (status: Status | 'all') => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onUpdateAction: (uid: string, field: string, value: string | number) => void;
  onUpdateActivity: (id: string, field: 'title' | 'description', value: string) => void;
  onUpdateObjectiveField: (id: number, field: 'eixo' | 'description' | 'eixoLabel' | 'eixoColor', value: string | number) => void;
  onUpdateTeam: (microId: string, updatedTeam: TeamMember[]) => void;
}

export function MainViewContentSwitch({
  chartContainerRef,
  containerWidth,
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
  handleUpdateActionPatch,
  involvedAreaFilter,
  isEditMode,
  isMobile,
  isSaving,
  microActions,
  objectives: _objectives,
  activities: _activities,
  readOnly,
  responsibleFilter,
  searchTerm,
  selectedActivity,
  selectedObjective,
  statusFilter,
  viewMode,
  requireMobileObjectiveSelection,
  checkCanCreate,
  checkCanDelete,
  checkCanEdit,
  onCommunityNavigate,
  onAddComment,
  onAddMember,
  onBulkImport,
  onCreateAction,
  onDashboardNavigate,
  onDeleteAction,
  onExpandAction,
  onGanttActionClick,
  onOpenRoadmapSettings,
  onRemoveMember,
  onAddRaci,
  onRemoveRaci,
  onSaveAction,
  onSetGanttRange,
  onSetGanttStatusFilter,
  onSetInvolvedAreaFilter,
  onSetResponsibleFilter,
  onSetSearchTerm,
  onSetStatusFilter,
  onShowToast,
  onUpdateAction,
  onUpdateActivity,
  onUpdateObjectiveField,
  onUpdateTeam,
}: MainViewContentSwitchProps) {
  return (
    <div className="p-4 sm:p-6" ref={chartContainerRef}>
      {/* Hub Community Pages */}
      {currentNav === 'hub' ? (
        <ErrorBoundary>
          <Suspense fallback={sectionFallback}>
            <HubHomePage
              userId={userId}
              currentMicroLabel={currentMicroLabel}
              onNavigate={onCommunityNavigate}
            />
          </Suspense>
        </ErrorBoundary>
      ) : currentNav === 'forums' ? (
        <ErrorBoundary>
          <Suspense fallback={sectionFallback}>
            <ForumsPage userId={userId} />
          </Suspense>
        </ErrorBoundary>
      ) : currentNav === 'mentorship' ? (
        <ErrorBoundary>
          <Suspense fallback={sectionFallback}>
            <MentorshipPage />
          </Suspense>
        </ErrorBoundary>
      ) : currentNav === 'education' ? (
        <ErrorBoundary>
          <Suspense fallback={sectionFallback}>
            <EducationPage />
          </Suspense>
        </ErrorBoundary>
      ) : currentNav === 'repository' ? (
        <ErrorBoundary>
          <Suspense fallback={sectionFallback}>
            <RepositoryPage />
          </Suspense>
        </ErrorBoundary>
      ) : currentNav === 'dashboard' ? (
        <ErrorBoundary>
          <Suspense fallback={sectionFallback}>
            <Dashboard
              actions={microActions}
              team={currentTeam}
              objectives={filteredObjectives}
              activities={filteredActivities}
              currentMicroId={currentMicroId}
              currentMicroLabel={currentMicroLabel}
              onNavigate={onDashboardNavigate}
            />
          </Suspense>
        </ErrorBoundary>
      ) : currentNav === 'news' || currentNav === 'home' ? (
        <ErrorBoundary>
          <Suspense fallback={sectionFallback}>
            <NewsFeed onOpenRoadmap={onOpenRoadmapSettings} />
          </Suspense>
        </ErrorBoundary>
      ) : viewMode === 'gantt' && currentNav === 'strategy' ? (
        <ErrorBoundary>
          <Suspense fallback={sectionFallback}>
            <GanttChart
              actions={ganttActions}
              ganttRange={ganttRange}
              setGanttRange={onSetGanttRange}
              containerWidth={containerWidth}
              statusFilter={ganttStatusFilter}
              setStatusFilter={onSetGanttStatusFilter}
              onActionClick={onGanttActionClick}
              showToast={onShowToast}
              isMobile={isMobile}
            />
          </Suspense>
        </ErrorBoundary>
      ) : viewMode === 'team' ? (
        <ErrorBoundary>
          <Suspense fallback={sectionFallback}>
            <TeamView
              team={currentTeam}
              microId={currentMicroId}
              onUpdateTeam={onUpdateTeam}
              onAddMember={onAddMember}
              onRemoveMember={onRemoveMember}
              readOnly={readOnly}
            />
          </Suspense>
        </ErrorBoundary>
      ) : viewMode === 'optimized' ? (
        <ErrorBoundary>
          <Suspense fallback={sectionFallback}>
            <OptimizedView
              objectives={filteredObjectives}
              activities={filteredActivities}
              actions={microActions}
              team={currentTeam}
              onUpdateAction={handleUpdateActionPatch}
              onSaveAction={onSaveAction}
              onDeleteAction={onDeleteAction}
              onAddRaci={onAddRaci}
              onRemoveRaci={onRemoveRaci}
              onAddComment={onAddComment}
              onViewDetails={(uid: string) => onExpandAction(uid)}
              readOnly={readOnly}
            />
          </Suspense>
        </ErrorBoundary>
      ) : viewMode === 'calendar' ? (
        <ErrorBoundary>
          <Suspense fallback={sectionFallback}>
            <div className="w-full max-w-[1500px] mx-auto">
              <div className="h-[calc(100vh-200px)] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <LinearCalendar
                  actions={microActions}
                  activities={filteredActivities}
                  objectives={filteredObjectives}
                  microId={currentMicroId}
                />
              </div>
            </div>
          </Suspense>
        </ErrorBoundary>
      ) : (
        <ErrorBoundary>
          <Suspense fallback={sectionFallback}>
            <div className="max-w-5xl mx-auto">
              <ActionTable
                actions={microActions}
                isMobile={isMobile}
                requireObjectiveSelection={requireMobileObjectiveSelection}
                selectedActivity={selectedActivity}
                selectedObjective={selectedObjective}
                team={currentTeam}
                objectives={filteredObjectives}
                activities={filteredActivities}
                isEditMode={isEditMode}
                onUpdateObjective={onUpdateObjectiveField}
                onUpdateActivity={onUpdateActivity}
                searchTerm={searchTerm}
                setSearchTerm={onSetSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={onSetStatusFilter}
                responsibleFilter={responsibleFilter}
                setResponsibleFilter={onSetResponsibleFilter}
                involvedAreaFilter={involvedAreaFilter}
                setInvolvedAreaFilter={onSetInvolvedAreaFilter}
                expandedActionId={expandedActionUid}
                setExpandedActionId={onExpandAction}
                onUpdateAction={onUpdateAction}
                onSaveAction={onSaveAction}
                onCreateAction={onCreateAction}
                onDeleteAction={onDeleteAction}
                onAddRaci={onAddRaci}
                onRemoveRaci={onRemoveRaci}
                onAddComment={(uid: string, content: string) => {
                  void onAddComment(uid, content);
                }}
                isSaving={isSaving}
                canCreate={checkCanCreate()}
                canEdit={checkCanEdit}
                canDelete={checkCanDelete}
                readOnly={readOnly}
                onBulkImport={onBulkImport}
              />
            </div>
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}
