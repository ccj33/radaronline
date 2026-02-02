import { ErrorBoundary } from '../common/ErrorBoundary';
import { Dashboard } from '../../features/dashboard/Dashboard';
import { GanttChart } from '../../features/gantt/GanttChart';
import { TeamView } from '../../features/team/TeamView';
import { OptimizedView } from '../../features/dashboard/OptimizedView';
import { ActionTable } from '../../features/actions/ActionTable';
import { ActionDetailModal } from '../../features/actions/ActionDetailModal';
import { ActivityTabs } from '../../features/actions/ActivityTabs';
import { LinearCalendar } from '../../features/admin/dashboard/LinearCalendar';
// ExpandableDescription removido
import { Action, TeamMember, Objective, Activity, GanttRange } from '../../types';
import { ParsedAction } from '../../features/actions/SmartPasteModal';

interface MainViewProps {
  currentNav: 'strategy' | 'home' | 'settings';
  viewMode: 'table' | 'gantt' | 'team' | 'optimized' | 'calendar';
  selectedActivity: string;
  selectedObjective?: number;
  microActions: Action[];
  ganttActions: Action[];
  currentTeam: TeamMember[];
  objectives: Objective[];
  activities: Record<number, Activity[]>;
  currentActivity: Activity | undefined;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: 'Não Iniciado' | 'Em Andamento' | 'Concluído' | 'Atrasado' | 'all';
  setStatusFilter: (status: 'Não Iniciado' | 'Em Andamento' | 'Concluído' | 'Atrasado' | 'all') => void;
  responsibleFilter: string;
  setResponsibleFilter: (responsible: string) => void;
  expandedActionUid: string | null;
  setExpandedActionUid: (uid: string | null) => void;
  involvedAreaFilter: string;
  setInvolvedAreaFilter: (area: string) => void;
  ganttRange: GanttRange;
  setGanttRange: (range: GanttRange) => void;
  containerWidth: number;
  ganttStatusFilter: 'Não Iniciado' | 'Em Andamento' | 'Concluído' | 'Atrasado' | 'all';
  setGanttStatusFilter: (status: 'Não Iniciado' | 'Em Andamento' | 'Concluído' | 'Atrasado' | 'all') => void;
  onGanttActionClick: (action: Action) => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  isMobile: boolean;
  currentMicroId: string;
  isViewingAllMicros: boolean;
  isAdmin: boolean;
  onUpdateAction: (uid: string, field: string, value: string | number) => void;
  onSaveAction: () => void;
  onCreateAction: () => void;
  onDeleteAction: (uid: string) => void;
  onAddRaci: (uid: string, memberId: string, role: 'R' | 'A' | 'C' | 'I') => void;
  onRemoveRaci: (uid: string, idx: number, memberName: string) => void;
  onAddComment: (uid: string, content: string) => void;
  isSaving: boolean;
  checkCanCreate: () => boolean;
  checkCanEdit: (action: Action) => boolean;
  checkCanDelete: (action: Action) => boolean;
  onUpdateTeam?: (microId: string, updatedTeam: TeamMember[]) => void;
  setTeamsByMicro: React.Dispatch<React.SetStateAction<Record<string, TeamMember[]>>>;
  onNavigate: (view: 'list' | 'team', filters?: { status?: string; objectiveId?: number }) => void;
  onBulkImport?: (actions: ParsedAction[]) => void;
  isEditMode?: boolean;
}

export function MainView({
  currentNav,
  viewMode,
  selectedActivity,
  selectedObjective,
  microActions,
  ganttActions,
  currentTeam,
  objectives,
  activities,
  currentActivity,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  responsibleFilter,
  setResponsibleFilter,
  expandedActionUid,
  setExpandedActionUid,
  involvedAreaFilter = '',
  setInvolvedAreaFilter = () => { },
  ganttRange,
  setGanttRange,
  containerWidth,
  ganttStatusFilter,
  setGanttStatusFilter,
  onGanttActionClick,
  showToast,
  isMobile,
  currentMicroId,
  isViewingAllMicros,
  isAdmin,
  onUpdateAction,
  onSaveAction,
  onCreateAction,
  onDeleteAction,
  onAddRaci,
  onRemoveRaci,
  onAddComment,
  isSaving,
  checkCanCreate,
  checkCanEdit,
  checkCanDelete,
  onUpdateTeam,
  setTeamsByMicro,
  onNavigate,
  onBulkImport,
  isEditMode = false,
}: MainViewProps) {
  // Encontrar a ação selecionada para o modal
  const selectedAction = expandedActionUid
    ? microActions.find(a => a.uid === expandedActionUid)
    : null;

  return (
    <>
      {/* ACTIVITY TABS */}
      {currentNav === 'strategy' && viewMode === 'table' && (
        <div>
          <ActivityTabs
            activities={activities[1] || []}
            selectedActivity={selectedActivity}
            setSelectedActivity={() => { }}
          />
        </div>
      )}

      <div className="p-4 sm:p-6">
        {/* DASHBOARD VIEW */}
        {currentNav === 'home' ? (
          <ErrorBoundary>
            <Dashboard
              actions={microActions}
              team={currentTeam}
              objectives={objectives}
              activities={activities}
              onNavigate={onNavigate}
            />
          </ErrorBoundary>

          /* GANTT VIEW */
        ) : viewMode === 'gantt' && currentNav === 'strategy' ? (
          <ErrorBoundary>
            <GanttChart
              actions={ganttActions}
              ganttRange={ganttRange}
              setGanttRange={setGanttRange}
              containerWidth={containerWidth}
              statusFilter={ganttStatusFilter}
              setStatusFilter={setGanttStatusFilter}
              onActionClick={onGanttActionClick}
              showToast={showToast}
              isMobile={isMobile}
            />
          </ErrorBoundary>

        ) : viewMode === 'team' ? (
          <ErrorBoundary>
            <TeamView
              team={currentTeam}
              microId={currentMicroId}
              onUpdateTeam={onUpdateTeam || ((microId, updatedTeam) => {
                if (!microId) return;
                setTeamsByMicro(prev => ({ ...prev, [microId]: updatedTeam }));
              })}
              readOnly={isViewingAllMicros && !isAdmin}
            />
          </ErrorBoundary>

        ) : viewMode === 'optimized' ? (
          /* OPTIMIZED VIEW */
          <ErrorBoundary>
            <OptimizedView
              objectives={objectives}
              activities={activities}
              actions={microActions}
              team={currentTeam}
              onUpdateAction={(uid, updates) => {
                Object.entries(updates).forEach(([field, value]) => {
                  if (value !== undefined) {
                    onUpdateAction(uid, field, value as string | number);
                  }
                });
              }}
              onSaveAction={onSaveAction}
              onDeleteAction={onDeleteAction}
              onAddRaci={onAddRaci}
              onRemoveRaci={onRemoveRaci}
              onAddComment={onAddComment}
              readOnly={isViewingAllMicros && !isAdmin}
            />
          </ErrorBoundary>

        ) : viewMode === 'calendar' ? (
          /* CALENDAR VIEW - Agenda de Ações da Microrregião */
          <ErrorBoundary>
            <div className="h-[calc(100vh-200px)] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <LinearCalendar
                actions={microActions}
                activities={activities}
                objectives={objectives}
                microId={currentMicroId}
              />
            </div>
          </ErrorBoundary>

        ) : (
          /* TABLE VIEW */
          <ErrorBoundary>
            <div className="max-w-5xl mx-auto">
              {/* Descrição movida para ActivityTabs */}

              <ActionTable
                actions={microActions}
                selectedActivity={selectedActivity}
                selectedObjective={selectedObjective}
                team={currentTeam}
                objectives={objectives}
                activities={activities}
                isEditMode={isEditMode}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                responsibleFilter={responsibleFilter}
                setResponsibleFilter={setResponsibleFilter}
                expandedActionId={expandedActionUid}
                setExpandedActionId={setExpandedActionUid}
                involvedAreaFilter={involvedAreaFilter}
                setInvolvedAreaFilter={setInvolvedAreaFilter}
                onUpdateAction={onUpdateAction}
                onSaveAction={onSaveAction}
                onCreateAction={onCreateAction}
                onDeleteAction={onDeleteAction}
                onAddRaci={onAddRaci}
                onRemoveRaci={onRemoveRaci}
                onAddComment={onAddComment}
                isSaving={isSaving}
                canCreate={checkCanCreate()}
                canEdit={checkCanEdit}
                canDelete={checkCanDelete}
                readOnly={isViewingAllMicros && !isAdmin}
                onBulkImport={onBulkImport}
              />
            </div>
          </ErrorBoundary>
        )}
      </div>

      {/* ACTION DETAIL MODAL (Drawer) */}
      <ActionDetailModal
        isOpen={!!selectedAction}
        action={selectedAction || null}
        team={currentTeam}
        activityName={currentActivity?.title || 'Atividade'}
        onClose={() => setExpandedActionUid(null)}
        onUpdateAction={onUpdateAction}
        onSaveAction={onSaveAction}
        onDeleteAction={onDeleteAction}
        onAddRaci={onAddRaci}
        onRemoveRaci={onRemoveRaci}
        onAddComment={onAddComment}
        isSaving={isSaving}
        canEdit={selectedAction ? checkCanEdit(selectedAction) : false}
        canDelete={selectedAction ? checkCanDelete(selectedAction) : false}
        readOnly={isViewingAllMicros && !isAdmin}
      />
    </>
  );
}
