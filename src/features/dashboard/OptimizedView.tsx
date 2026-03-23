import React, { useCallback, useMemo, useState } from "react";

import type { Action, Activity, Objective, RaciRole, TeamMember } from "../../types";
import { getTodayStr, parseDateLocal } from "../../lib/date";
import {
  filterActionsByObjective,
  getDerivedActionStatus,
  summarizeActionPortfolio,
} from "../../lib/actionPortfolio";
import { activityIdsMatch } from "../../lib/text";
import { ActionDetailModal } from "../actions/ActionDetailModal";
import { OptimizedViewHeader } from "./optimizedView/OptimizedViewHeader";
import {
  OptimizedCardsView,
  OptimizedKanbanView,
  OptimizedListView,
  OptimizedTreeView,
} from "./optimizedView/OptimizedViewSections";
import { EmptyState } from "./optimizedView/optimizedView.shared";
import type {
  OptimizedObjectiveGroup,
  OptimizedStatusFilter,
  OptimizedViewMode,
} from "./optimizedView/optimizedView.types";

interface OptimizedViewProps {
  objectives: Objective[];
  activities: Record<number, Activity[]>;
  actions: Action[];
  team: TeamMember[];
  onUpdateAction?: (uid: string, updates: Partial<Action>) => void;
  onSaveAction?: (uid?: string) => void;
  onDeleteAction?: (uid: string) => void;
  onAddRaci?: (uid: string, memberId: string, role: RaciRole) => void;
  onRemoveRaci?: (uid: string, idx: number, memberName: string) => void;
  onAddComment?: (uid: string, content: string) => void;
  onEditComment?: (actionUid: string, commentId: string, content: string) => void;
  onDeleteComment?: (actionUid: string, commentId: string) => void;
  onViewDetails?: (uid: string) => void;
  readOnly?: boolean;
}

export const OptimizedView: React.FC<OptimizedViewProps> = ({
  objectives,
  activities,
  actions,
  team,
  onUpdateAction,
  onSaveAction,
  onDeleteAction,
  onAddRaci,
  onRemoveRaci,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onViewDetails,
  readOnly = false,
}) => {
  const [expandedObjectives, setExpandedObjectives] = useState<number[]>(objectives.map((objective) => objective.id));
  const [expandedActivities, setExpandedActivities] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<OptimizedViewMode>("tree");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OptimizedStatusFilter>("all");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const today = useMemo(() => parseDateLocal(getTodayStr()) || new Date(), []);

  const isActionLate = useCallback((action: Action): boolean => {
    return getDerivedActionStatus(action, today) === "Atrasado";
  }, [today]);

  const isActionAlert = useCallback((action: Action): boolean => {
    if (getDerivedActionStatus(action, today) === "Concluído") return false;
    const endDate = parseDateLocal(action.plannedEndDate);
    if (!endDate) return false;
    const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }, [today]);

  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      const derivedStatus = getDerivedActionStatus(action, today);

      if (searchTerm && !action.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (statusFilter === "late") return isActionLate(action);
      if (statusFilter === "alert") return isActionAlert(action) && !isActionLate(action);
      if (statusFilter !== "all" && derivedStatus !== statusFilter) return false;
      return true;
    });
  }, [actions, isActionAlert, isActionLate, searchTerm, statusFilter, today]);

  const selectedAction = useMemo(() => {
    if (!selectedUid) return null;
    return actions.find((action) => action.uid === selectedUid) || null;
  }, [actions, selectedUid]);

  const selectedActivityName = useMemo(() => {
    if (!selectedAction) return "";
    for (const [, activityList] of Object.entries(activities)) {
      const activity = activityList.find((item) => activityIdsMatch(item.id, selectedAction.activityId));
      if (activity) return activity.title;
    }
    return "";
  }, [activities, selectedAction]);

  const metrics = useMemo(() => {
    const summary = summarizeActionPortfolio(actions, today);
    const alert = actions.filter((action) => isActionAlert(action) && !isActionLate(action)).length;
    const avgProgress = summary.total > 0 ? Math.round(actions.reduce((sum, action) => sum + action.progress, 0) / summary.total) : 0;
    return {
      total: summary.total,
      completed: summary.completed,
      inProgress: summary.inProgress,
      notStarted: summary.notStarted,
      late: summary.late,
      alert,
      avgProgress,
    };
  }, [actions, isActionAlert, isActionLate, today]);

  const groupedData = useMemo<OptimizedObjectiveGroup[]>(() => {
    return objectives.map((objective) => {
      const objectiveActivities = activities[objective.id] || [];
      const objectiveActions = filterActionsByObjective(filteredActions, activities, objective.id);
      const objectiveProgress = objectiveActions.length > 0 ? Math.round(objectiveActions.reduce((sum, action) => sum + action.progress, 0) / objectiveActions.length) : 0;
      const objectiveLate = objectiveActions.filter(isActionLate).length;

      return {
        ...objective,
        activities: objectiveActivities.map((activity) => {
          const activityActions = filteredActions.filter((action) => activityIdsMatch(action.activityId, activity.id));
          const activityProgress = activityActions.length > 0 ? Math.round(activityActions.reduce((sum, action) => sum + action.progress, 0) / activityActions.length) : 0;
          const activityLate = activityActions.filter(isActionLate).length;
          return { ...activity, actions: activityActions, progress: activityProgress, lateCount: activityLate };
        }),
        actionCount: objectiveActions.length,
        progress: objectiveProgress,
        lateCount: objectiveLate,
      };
    });
  }, [activities, filteredActions, isActionLate, objectives]);

  const hasNoResults = filteredActions.length === 0;

  const handleSelectAction = (uid: string) => {
    setSelectedUid(uid);
    setIsModalOpen(true);
    onViewDetails?.(uid);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUid(null);
  };

  const handleUpdateActionField = (uid: string, field: string, value: string | number) => {
    onUpdateAction?.(uid, { [field]: value });
  };

  const handleDeleteAction = (uid: string) => {
    onDeleteAction?.(uid);
    handleCloseModal();
  };

  const toggleObjective = (objectiveId: number) => {
    setExpandedObjectives((previous) => previous.includes(objectiveId) ? previous.filter((id) => id !== objectiveId) : [...previous, objectiveId]);
  };

  const toggleActivity = (activityId: string) => {
    setExpandedActivities((previous) => previous.includes(activityId) ? previous.filter((id) => id !== activityId) : [...previous, activityId]);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-slate-50 to-teal-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <ActionDetailModal
        isOpen={isModalOpen}
        action={selectedAction}
        team={team}
        activityName={selectedActivityName}
        onClose={handleCloseModal}
        onUpdateAction={handleUpdateActionField}
        onSaveAction={onSaveAction}
        onDeleteAction={handleDeleteAction}
        onAddRaci={onAddRaci}
        onRemoveRaci={onRemoveRaci}
        onAddComment={onAddComment}
        onEditComment={onEditComment}
        onDeleteComment={onDeleteComment}
        canEdit={!readOnly}
        canDelete={!readOnly}
        readOnly={readOnly}
      />

      <OptimizedViewHeader
        metrics={metrics}
        viewMode={viewMode}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        onSearchTermChange={setSearchTerm}
        onViewModeChange={setViewMode}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="flex-1 w-full overflow-hidden">
        <div className="mx-auto w-full max-w-7xl h-full p-5">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-700/60 h-full overflow-auto shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
            <div className="p-4 space-y-4">
              {hasNoResults ? (
                <EmptyState description="Tente ajustar os filtros ou criar novas ações" />
              ) : viewMode === "tree" ? (
                <OptimizedTreeView
                  groupedData={groupedData}
                  expandedObjectives={expandedObjectives}
                  expandedActivities={expandedActivities}
                  selectedUid={selectedUid}
                  isModalOpen={isModalOpen}
                  onToggleObjective={toggleObjective}
                  onToggleActivity={toggleActivity}
                  onSelectAction={handleSelectAction}
                  isActionLate={isActionLate}
                />
              ) : viewMode === "cards" ? (
                <OptimizedCardsView
                  filteredActions={filteredActions}
                  selectedUid={selectedUid}
                  isModalOpen={isModalOpen}
                  onSelectAction={handleSelectAction}
                  isActionLate={isActionLate}
                />
              ) : viewMode === "list" ? (
                <OptimizedListView
                  groupedData={groupedData}
                  selectedUid={selectedUid}
                  isModalOpen={isModalOpen}
                  onSelectAction={handleSelectAction}
                  isActionLate={isActionLate}
                />
              ) : (
                <OptimizedKanbanView
                  filteredActions={filteredActions}
                  selectedUid={selectedUid}
                  isModalOpen={isModalOpen}
                  onSelectAction={handleSelectAction}
                  isActionLate={isActionLate}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizedView;
