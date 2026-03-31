import React, { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, FileSpreadsheet, Plus, Target } from "lucide-react";

import { useAuth } from "../../auth/AuthContext";
import { ObjectiveHeader } from "../../components/common/ObjectiveHeader";
import { SearchFilter } from "../../components/common/SearchFilter";
import { formatDateBr, getTodayStr } from "../../lib/date";
import { staggerContainerFast, staggerItem } from "../../lib/motion";
import {
  activityIdsMatch,
  findObjectiveIdByActivityId,
  getActionDisplayId,
  getActivityDisplayId,
  getActivityPrefixFromActionId,
  getCorrectActionDisplayId,
  getCorrectActivityPrefix,
  naturalSortComparator,
} from "../../lib/text";
import type { Action, Activity, Objective, RaciRole, Status, TeamMember } from "../../types";
import { SmartPasteModal } from "./SmartPasteModal";
import type { ParsedAction } from "./SmartPasteModal";
import { ActionTableRow } from "./actionTable/ActionTableRow";

export { formatRelativeTime } from "./actionTable/actionTable.utils";

interface ActionTableProps {
  actions: Action[];
  isMobile?: boolean;
  requireObjectiveSelection?: boolean;
  selectedActivity: string;
  selectedObjective?: number;
  team: TeamMember[];
  objectives?: Objective[];
  activities?: Record<number, Activity[]>;
  isEditMode?: boolean;
  onUpdateObjective?: (id: number, field: "eixo" | "description" | "eixoLabel" | "eixoColor", value: string | number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: Status | "all";
  setStatusFilter: (status: Status | "all") => void;
  responsibleFilter: string;
  setResponsibleFilter: (responsible: string) => void;
  expandedActionId: string | null;
  setExpandedActionId: (uid: string | null) => void;
  involvedAreaFilter?: string;
  setInvolvedAreaFilter?: (area: string) => void;
  onUpdateAction: (uid: string, field: string, value: string | number) => void;
  onSaveAction: (uid?: string) => void;
  onCreateAction: () => void;
  onDeleteAction: (uid: string) => void;
  onAddRaci: (uid: string, memberId: string, role: RaciRole) => void;
  onRemoveRaci: (uid: string, idx: number, memberName: string) => void;
  onAddComment: (uid: string, content: string) => void;
  isSaving?: boolean;
  canCreate?: boolean;
  canEdit?: (action: Action) => boolean;
  canDelete?: (action: Action) => boolean;
  readOnly?: boolean;
  useModal?: boolean;
  onBulkImport?: (actions: ParsedAction[]) => void;
  onUpdateActivity?: (id: string, field: "title" | "description", value: string) => void;
}

const ActionTableImpl: React.FC<ActionTableProps> = ({
  actions,
  isMobile = false,
  requireObjectiveSelection = false,
  selectedActivity,
  selectedObjective,
  team,
  objectives = [],
  activities = {},
  isEditMode = false,
  onUpdateObjective,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  responsibleFilter,
  setResponsibleFilter,
  expandedActionId,
  setExpandedActionId,
  involvedAreaFilter,
  setInvolvedAreaFilter,
  onUpdateAction,
  onSaveAction,
  onCreateAction,
  onDeleteAction,
  onAddRaci,
  onRemoveRaci,
  onAddComment,
  isSaving = false,
  canCreate = true,
  canEdit = () => true,
  canDelete = () => true,
  readOnly = false,
  useModal = true,
  onBulkImport,
  onUpdateActivity,
}) => {
  const { user } = useAuth();
  const [selectedRaciMemberId, setSelectedRaciMemberId] = useState<string>("");
  const [newRaciRole, setNewRaciRole] = useState<RaciRole>("R");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);

  const todayLabel = useMemo(() => formatDateBr(getTodayStr()), []);
  const currentUserInitials = useMemo(() => {
    return (user?.nome || "?")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  }, [user?.nome]);

  const getCorrectId = useCallback(
    (action: Action): string => {
      if (objectives.length === 0 || Object.keys(activities).length === 0) {
        return getActionDisplayId(action.id);
      }

      const objectiveId = findObjectiveIdByActivityId(action.activityId, activities);
      if (objectiveId === null) {
        return getActionDisplayId(action.id);
      }

      return getCorrectActionDisplayId(action.id, action.activityId, objectiveId, objectives, activities, actions);
    },
    [actions, activities, objectives],
  );

  const getCorrectPrefix = useCallback(
    (action: Action): string => {
      if (objectives.length === 0 || Object.keys(activities).length === 0) {
        return getActivityPrefixFromActionId(action.id);
      }

      const objectiveId = findObjectiveIdByActivityId(action.activityId, activities);
      if (objectiveId === null) {
        return getActivityPrefixFromActionId(action.id);
      }

      return getCorrectActivityPrefix(action.activityId, objectiveId, objectives, activities);
    },
    [activities, objectives],
  );

  const selectedActivityContext = useMemo(() => {
    if (!selectedObjective || objectives.length === 0) return null;

    const objective = objectives.find((item) => item.id === selectedObjective);
    if (!objective) return null;

    const activity = activities[selectedObjective]?.find((item) => activityIdsMatch(item.id, selectedActivity));

    return {
      objective: { ...objective, description: activity?.description },
      objectiveIndex: objectives.findIndex((item) => item.id === selectedObjective),
      activity,
    };
  }, [activities, objectives, selectedActivity, selectedObjective]);

  const availableAreas = useMemo(() => {
    const areas = new Set<string>();
    actions.forEach((action) => {
      action.tags?.forEach((tag) => areas.add(tag.name));
    });
    return Array.from(areas).sort();
  }, [actions]);

  const filteredActions = useMemo(() => {
    return actions
      .filter((action) => activityIdsMatch(action.activityId, selectedActivity))
      .filter((action) => {
        if (searchTerm) {
          const lowerSearch = searchTerm.toLowerCase();
          const matchesTitle = action.title.toLowerCase().includes(lowerSearch);
          const matchesTags = action.tags?.some((tag) => tag.name.toLowerCase().includes(lowerSearch));
          const matchesRaci = action.raci.some((person) => person.name.toLowerCase().includes(lowerSearch));

          if (!matchesTitle && !matchesTags && !matchesRaci) {
            return false;
          }
        }

        if (statusFilter !== "all" && action.status !== statusFilter) return false;
        if (responsibleFilter && !action.raci.some((person) => person.name === responsibleFilter && person.role === "R")) {
          return false;
        }
        if (involvedAreaFilter && !action.tags?.some((tag) => tag.name === involvedAreaFilter)) return false;
        return true;
      })
      .sort((actionA, actionB) => naturalSortComparator(getCorrectId(actionA), getCorrectId(actionB)));
  }, [actions, getCorrectId, involvedAreaFilter, responsibleFilter, searchTerm, selectedActivity, statusFilter]);

  const toggleRow = useCallback(
    (uid: string) => {
      if (expandedActionId === uid) {
        setExpandedActionId(null);
        return;
      }

      setExpandedActionId(uid);
      setSelectedRaciMemberId("");
      setNewRaciRole("R");
      setCommentDrafts((previous) => ({ ...previous, [uid]: previous[uid] || "" }));
    },
    [expandedActionId, setExpandedActionId],
  );

  const handleAddRaci = useCallback(
    (uid: string) => {
      if (!selectedRaciMemberId) return;
      onAddRaci(uid, selectedRaciMemberId, newRaciRole);
      setSelectedRaciMemberId("");
      setNewRaciRole("R");
    },
    [newRaciRole, onAddRaci, selectedRaciMemberId],
  );

  const handleAddComment = useCallback(
    (action: Action) => {
      const draft = commentDrafts[action.uid]?.trim();
      if (!draft || !user) return;

      onAddComment(action.uid, draft);
      setCommentDrafts((previous) => ({ ...previous, [action.uid]: "" }));
    },
    [commentDrafts, onAddComment, user],
  );

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("all");
    setResponsibleFilter("");
    setInvolvedAreaFilter?.("");
  }, [setInvolvedAreaFilter, setResponsibleFilter, setSearchTerm, setStatusFilter]);

  if (isMobile && requireObjectiveSelection) {
    return (
      <div data-tour="actions-table" className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Target size={24} className="text-slate-400 dark:text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100 mb-1">
            Selecione um objetivo acima
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Para ver as ações no mobile, escolha primeiro o objetivo em foco no seletor superior.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-tour="actions-table" className="max-w-5xl mx-auto px-4 py-8">
      {readOnly ? (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
          <Eye size={16} />
          <span>Modo visualização. Selecione uma microrregião específica para editar.</span>
        </div>
      ) : null}

      {selectedActivityContext ? (
        <ObjectiveHeader
          objective={selectedActivityContext.objective}
          objectiveIndex={selectedActivityContext.objectiveIndex}
          isEditMode={isEditMode}
          customBadgeText={selectedActivityContext.activity ? `At. ${getActivityDisplayId(selectedActivityContext.activity.id)}` : undefined}
          customTitle={selectedActivityContext.activity?.title}
          hideTitle={Boolean(selectedActivityContext.activity)}
          onEdit={(field, value) => {
            if (field === "description") {
              const activity = selectedActivityContext.activity;
              if (activity && onUpdateActivity) {
                onUpdateActivity(activity.id, "description", String(value));
              }
              return;
            }

            if (onUpdateObjective && selectedObjective) {
              onUpdateObjective(selectedObjective, field, value);
            }
          }}
        />
      ) : null}

      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        responsibleFilter={responsibleFilter}
        onResponsibleFilterChange={setResponsibleFilter}
        involvedAreaFilter={involvedAreaFilter}
        onInvolvedAreaFilterChange={setInvolvedAreaFilter}
        availableAreas={availableAreas}
        teamMembers={team}
      />

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-200/50 dark:border-slate-700 overflow-hidden transition-all duration-300">
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-teal-300 dark:via-teal-600 to-transparent" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse-soft" aria-hidden="true" />
            <span>Hoje - {todayLabel}</span>
          </div>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-teal-300 dark:via-teal-600 to-transparent" aria-hidden="true" />
        </div>

        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider" role="row">
          <div className="col-span-1" role="columnheader">
            ID
            {filteredActions.length > 0 ? <span className="ml-1 text-[10px] normal-case opacity-70">{getCorrectPrefix(filteredActions[0])}.x</span> : null}
          </div>
          <div className="col-span-3" role="columnheader">Ação</div>
          <div className="col-span-2" role="columnheader">Cronograma</div>
          <div className="col-span-2" role="columnheader">Equipe</div>
          <div className="col-span-2" role="columnheader">Status</div>
          <div className="col-span-2 text-right" role="columnheader">Áreas</div>
        </div>

        <motion.div variants={staggerContainerFast} initial="initial" animate="animate" className="divide-y divide-slate-100 dark:divide-slate-700" role="rowgroup">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p className="text-sm">Nenhuma ação encontrada</p>
              {searchTerm || statusFilter !== "all" || responsibleFilter || involvedAreaFilter ? (
                <button onClick={clearFilters} className="mt-2 text-teal-600 hover:underline text-sm">
                  Limpar filtros
                </button>
              ) : null}
            </div>
          ) : (
            filteredActions.map((action, index) => {
              const isExpanded = expandedActionId === action.uid;
              const userCanEdit = !readOnly && canEdit(action);
              const userCanDelete = !readOnly && canDelete(action);

              return (
                <motion.div variants={staggerItem} key={action.uid} id={`action-${action.uid}`}>
                  <ActionTableRow
                    action={action}
                    index={index}
                    isExpanded={isExpanded}
                    readOnly={readOnly}
                    useModal={useModal}
                    userCanEdit={userCanEdit}
                    userCanDelete={userCanDelete}
                    currentUserInitials={currentUserInitials}
                    hasUser={Boolean(user)}
                    selectedRaciMemberId={selectedRaciMemberId}
                    newRaciRole={newRaciRole}
                    commentDraft={commentDrafts[action.uid] ?? ""}
                    team={team}
                    isSaving={isSaving}
                    getCorrectId={getCorrectId}
                    onToggle={toggleRow}
                    onSelectedRaciMemberIdChange={setSelectedRaciMemberId}
                    onNewRaciRoleChange={setNewRaciRole}
                    onCommentDraftChange={(value) => setCommentDrafts((previous) => ({ ...previous, [action.uid]: value }))}
                    onUpdateAction={onUpdateAction}
                    onSaveAction={onSaveAction}
                    onDeleteAction={onDeleteAction}
                    onAddRaci={handleAddRaci}
                    onRemoveRaci={onRemoveRaci}
                    onAddComment={handleAddComment}
                  />
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>

      {canCreate && !readOnly ? (
        <div className="mt-4 flex justify-end gap-3">
          {onBulkImport ? (
            <button
              onClick={() => setIsSmartPasteOpen(true)}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600"
            >
              <FileSpreadsheet size={18} /> Importar
            </button>
          ) : null}
          <button
            onClick={onCreateAction}
            className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-teal-700 transition-colors shadow-sm"
          >
            <Plus size={18} /> Nova Ação
          </button>
        </div>
      ) : null}

      {onBulkImport ? (
        <SmartPasteModal isOpen={isSmartPasteOpen} onClose={() => setIsSmartPasteOpen(false)} onImport={onBulkImport} />
      ) : null}
    </div>
  );
};

export const ActionTable = React.memo(ActionTableImpl);
