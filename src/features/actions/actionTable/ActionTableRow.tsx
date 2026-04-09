import { Calendar, CheckCircle2, Lock } from "lucide-react";

import { StatusBadge } from "../../../components/common/StatusBadge";
import { RaciCompactPill } from "../../../components/common/RaciPill";
import { Tooltip } from "../../../components/common/Tooltip";
import { formatDateBr } from "../../../lib/date";
import type { Action, RaciRole, TeamMember } from "../../../types";
import { ActionTableExpandedPanel } from "./ActionTableExpandedPanel";
import { formatDateShortYear, rolePriority } from "./actionTable.utils";
import { getDerivedActionStatus } from "../../../lib/actionPortfolio";

interface ActionTableRowProps {
  action: Action;
  index: number;
  isExpanded: boolean;
  readOnly: boolean;
  useModal: boolean;
  userCanEdit: boolean;
  userCanDelete: boolean;
  currentUserInitials: string;
  hasUser: boolean;
  selectedRaciMemberId: string;
  newRaciRole: RaciRole;
  commentDraft: string;
  team: TeamMember[];
  isSaving: boolean;
  getCorrectId: (action: Action) => string;
  onToggle: (uid: string) => void;
  onSelectedRaciMemberIdChange: (value: string) => void;
  onNewRaciRoleChange: (value: RaciRole) => void;
  onCommentDraftChange: (value: string) => void;
  onUpdateAction: (uid: string, field: string, value: string | number) => void;
  onSaveAction: (uid?: string) => void;
  onDeleteAction: (uid: string) => void;
  onAddRaci: (uid: string) => void;
  onRemoveRaci: (uid: string, index: number, memberName: string) => void;
  onAddComment: (action: Action) => void;
}

export function ActionTableRow({
  action,
  index,
  isExpanded,
  readOnly,
  useModal,
  userCanEdit,
  userCanDelete,
  currentUserInitials,
  hasUser,
  selectedRaciMemberId,
  newRaciRole,
  commentDraft,
  team,
  isSaving,
  getCorrectId,
  onToggle,
  onSelectedRaciMemberIdChange,
  onNewRaciRoleChange,
  onCommentDraftChange,
  onUpdateAction,
  onSaveAction,
  onDeleteAction,
  onAddRaci,
  onRemoveRaci,
  onAddComment,
}: ActionTableRowProps) {
  const zebra = index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20";
  const rowId = getCorrectId(action);

  return (
    <div className={`transition-colors ${isExpanded ? "bg-blue-50/30 dark:bg-blue-900/20" : `${zebra} hover:bg-slate-100/60 dark:hover:bg-slate-700/50`}`} role="row">
      <div
        onClick={() => onToggle(action.uid)}
        className="hidden sm:grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onToggle(action.uid);
          }
        }}
      >
        <div className="col-span-1">
          <Tooltip content={`ID: ${rowId}`}>
            <span className="inline-block font-mono text-[10px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600 cursor-help min-w-[24px] text-center">
              {rowId.split(".").pop()}
            </span>
          </Tooltip>
        </div>

        <div className="col-span-3 font-medium text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2 truncate">
          <span className="truncate" title={action.title}>
            {action.title}
          </span>
          {!userCanEdit ? (
            <Tooltip content={readOnly ? "Modo somente leitura" : "Você não tem permissão para editar"}>
              <Lock size={12} className="text-slate-400 shrink-0" />
            </Tooltip>
          ) : null}
        </div>

        <div className="col-span-2 flex flex-col justify-center text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
            <Calendar size={12} className="shrink-0" />
            <span>
              {formatDateShortYear(action.startDate)}
              <span className="mx-1 text-slate-300">→</span>
              {formatDateShortYear(action.plannedEndDate)}
            </span>
          </div>
          {action.endDate ? (
            <div
              className={`flex items-center gap-1.5 font-medium w-fit px-1.5 py-0.5 rounded-[4px] ${
                action.plannedEndDate && action.endDate > action.plannedEndDate ? "text-rose-600 bg-rose-50" : "text-emerald-600 bg-emerald-50"
              }`}
            >
              <CheckCircle2 size={10} className="shrink-0" />
              <span>Real: {formatDateShortYear(action.endDate)}</span>
            </div>
          ) : null}
        </div>

        <div className="col-span-2 flex items-center -space-x-2 overflow-hidden hover:space-x-1 hover:overflow-visible transition-all duration-300 px-1">
          {[...action.raci].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]).map((person, personIndex) => (
            <div key={`${person.name}-${person.role}-${personIndex}`} className="transition-transform hover:scale-110 hover:z-10 relative">
              <RaciCompactPill person={person} />
            </div>
          ))}
          {action.raci.length === 0 ? <span className="text-[10px] text-slate-300 italic pl-2">Sem equipe</span> : null}
        </div>

        <div className="col-span-2 md:pl-2 flex flex-col gap-1.5 min-w-0 justify-center">
          <StatusBadge status={getDerivedActionStatus(action)} />
          <Tooltip content={`Progresso: ${action.progress}%`}>
            <div
              className="w-full max-w-[150px] rounded-full bg-slate-100 dark:bg-slate-700/80 h-1.5 overflow-hidden"
              role="progressbar"
              aria-valuenow={action.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progresso ${action.progress}%`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-300"
                style={{ width: `${Math.min(100, Math.max(0, action.progress))}%` }}
              />
            </div>
          </Tooltip>
        </div>

        <div className="col-span-2 flex flex-wrap justify-end gap-1.5 items-center content-center">
          {action.tags?.slice(0, 2).map((tag) => (
            <Tooltip key={tag.id} content={tag.name}>
              <span
                style={{ backgroundColor: tag.color }}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white truncate max-w-[110px] hover:max-w-none transition-all duration-300 shadow-sm cursor-help ring-1 ring-white/20"
              >
                {tag.name}
              </span>
            </Tooltip>
          ))}
          {(action.tags?.length || 0) > 2 ? (
            <Tooltip content={action.tags!.slice(2).map((tag) => tag.name).join(", ")}>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold hover:bg-slate-200 cursor-pointer transition-colors">
                +{action.tags!.length - 2}
              </span>
            </Tooltip>
          ) : null}
          {!action.tags || action.tags.length === 0 ? <span className="text-[10px] text-slate-300 italic px-2">—</span> : null}
        </div>
      </div>

      <div onClick={() => onToggle(action.uid)} className="sm:hidden p-4 cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Tooltip content={`ID: ${rowId}`}>
                <span className="inline-block font-mono text-[10px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600 cursor-help min-w-[24px] text-center">
                  {rowId.split(".").pop()}
                </span>
              </Tooltip>
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <StatusBadge status={getDerivedActionStatus(action)} />
                  {!userCanEdit ? <Lock size={12} className="text-slate-400" /> : null}
                </div>
                <Tooltip content={`Progresso: ${action.progress}%`}>
                  <div
                    className="w-full max-w-[180px] rounded-full bg-slate-100 dark:bg-slate-700/80 h-1.5 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={action.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progresso ${action.progress}%`}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                      style={{ width: `${Math.min(100, Math.max(0, action.progress))}%` }}
                    />
                  </div>
                </Tooltip>
              </div>
            </div>
            <div className="font-medium text-sm text-slate-700 dark:text-slate-200 line-clamp-2">{action.title}</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar size={12} /> {formatDateBr(action.endDate)}
          </span>
          <div className="flex gap-1">
            {[...action.raci].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]).slice(0, 2).map((person, personIndex) => (
              <RaciCompactPill key={`${person.name}-${person.role}-${personIndex}`} person={person} />
            ))}
          </div>
        </div>
      </div>

      {isExpanded && !useModal ? (
        <ActionTableExpandedPanel
          action={action}
          team={team}
          readOnly={readOnly}
          userCanEdit={userCanEdit}
          userCanDelete={userCanDelete}
          currentUserInitials={currentUserInitials}
          hasUser={hasUser}
          commentDraft={commentDraft}
          selectedRaciMemberId={selectedRaciMemberId}
          newRaciRole={newRaciRole}
          isSaving={isSaving}
          onCommentDraftChange={onCommentDraftChange}
          onSelectedRaciMemberIdChange={onSelectedRaciMemberIdChange}
          onNewRaciRoleChange={onNewRaciRoleChange}
          onUpdateAction={onUpdateAction}
          onSaveAction={onSaveAction}
          onDeleteAction={onDeleteAction}
          onAddRaci={onAddRaci}
          onRemoveRaci={onRemoveRaci}
          onAddComment={onAddComment}
          onClose={() => onToggle(action.uid)}
        />
      ) : null}
    </div>
  );
}
