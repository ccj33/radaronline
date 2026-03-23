import React from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Edit3,
  Layers,
  MessageCircle,
  Zap,
} from "lucide-react";

import type { Action, Status } from "../../../types";
import { getDerivedActionStatus } from "../../../lib/actionPortfolio";
import { formatDateBr } from "../../../lib/date";
import { getActionDisplayId, getActivityDisplayId } from "../../../lib/text";
import type { OptimizedObjectiveGroup } from "./optimizedView.types";

export const OBJECTIVE_COLORS: Record<number, { border: string; bg: string; accent: string; text: string }> = {
  1: { border: "border-cyan-200 dark:border-cyan-800", bg: "bg-cyan-50 dark:bg-cyan-900/30", accent: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400" },
  2: { border: "border-indigo-200 dark:border-indigo-800", bg: "bg-indigo-50 dark:bg-indigo-900/30", accent: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400" },
  3: { border: "border-amber-200 dark:border-amber-800", bg: "bg-amber-50 dark:bg-amber-900/30", accent: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
};

export const STATUS_CONFIG: Record<Status, { icon: React.ReactNode; color: string; bg: string; header: string }> = {
  "Concluído": { icon: <CheckCircle2 size={14} />, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800", header: "bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" },
  "Em Andamento": { icon: <Clock size={14} />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800", header: "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  "Não Iniciado": { icon: <Circle size={14} />, color: "text-slate-400", bg: "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600", header: "bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300" },
  Atrasado: { icon: <AlertTriangle size={14} />, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800", header: "bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300" },
};

export const KANBAN_COLUMNS: { key: Status; label: string }[] = [
  { key: "Não Iniciado", label: "Não iniciado" },
  { key: "Em Andamento", label: "Em andamento" },
  { key: "Atrasado", label: "Atrasado" },
  { key: "Concluído", label: "Concluído" },
];

export const MiniProgress: React.FC<{ value: number; size?: "sm" | "md" }> = ({ value, size = "sm" }) => {
  const height = size === "sm" ? "h-1.5" : "h-2.5";
  const getGradient = () => {
    if (value >= 100) return "bg-gradient-to-r from-emerald-400 to-emerald-500";
    if (value >= 75) return "bg-gradient-to-r from-teal-400 to-emerald-500";
    if (value >= 50) return "bg-gradient-to-r from-blue-400 to-teal-500";
    if (value > 0) return "bg-gradient-to-r from-amber-400 to-amber-500";
    return "bg-slate-200 dark:bg-slate-600";
  };

  return (
    <div className={`w-full ${height} bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner`}>
      <div className={`${height} ${getGradient()} rounded-full transition-all duration-500 ease-out`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
};

export const EmptyState: React.FC<{ description: string }> = ({ description }) => (
  <div className="text-center py-16 px-6">
    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
      <Zap size={36} className="text-slate-400 dark:text-slate-500" />
    </div>
    <p className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-1">Nenhuma ação encontrada</p>
    <p className="text-sm text-slate-400 dark:text-slate-500">{description}</p>
  </div>
);

export const ActionCard: React.FC<{
  action: Action;
  onClick?: () => void;
  isLate?: boolean;
}> = ({ action, onClick, isLate }) => {
  const derivedStatus = getDerivedActionStatus(action);
  const status = STATUS_CONFIG[derivedStatus] || STATUS_CONFIG["Não Iniciado"];
  const responsible = action.raci.find((raci) => raci.role === "R")?.name || action.raci[0]?.name || "-";
  const commentCount = action.comments?.length || 0;

  return (
    <div
      className={`group relative p-3 rounded-xl border cursor-pointer transition-all duration-200 ${isLate ? "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white dark:border-rose-700/60 dark:from-rose-900/40 dark:to-slate-800 shadow-rose-100/50 dark:shadow-rose-900/20" : "border-slate-200/60 dark:border-slate-600/60 bg-white dark:bg-slate-800 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-lg hover:shadow-teal-100/40 dark:hover:shadow-teal-900/20"} shadow-sm hover:-translate-y-0.5`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg}`}>
            {status.icon}
            <span className={`${status.color} hidden sm:inline`}>{derivedStatus === "Não Iniciado" ? "Pendente" : derivedStatus === "Em Andamento" ? "Andamento" : derivedStatus === "Concluído" ? "Concluído" : "Atrasado"}</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{getActionDisplayId(action.id)}</span>
        </div>
      </div>

      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 mb-2 leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
        {action.title}
      </h4>

      {action.tags && action.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1 mb-2">
          {action.tags.slice(0, 2).map((tag) => (
            <span key={tag.id} style={{ backgroundColor: tag.color }} className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white truncate max-w-[60px] shadow-sm" title={tag.name}>
              {tag.name}
            </span>
          ))}
          {action.tags.length > 2 ? <span className="text-[9px] text-slate-400 font-medium" title={action.tags.slice(2).map((tag) => tag.name).join(", ")}>+{action.tags.length - 2}</span> : null}
        </div>
      ) : null}

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Progresso</span>
          <span className={`text-sm font-bold tabular-nums ${action.progress >= 100 ? "text-emerald-600 dark:text-emerald-400" : action.progress >= 50 ? "text-teal-600 dark:text-teal-400" : "text-slate-600 dark:text-slate-300"}`}>{action.progress}%</span>
        </div>
        <MiniProgress value={action.progress} size="md" />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
        <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 truncate max-w-[45%]">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{responsible.charAt(0).toUpperCase()}</div>
          <span className="truncate">{responsible.split(" ")[0]}</span>
        </span>
        <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          {commentCount > 0 ? (
            <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-1.5 py-0.5 rounded-full">
              <MessageCircle size={11} />
              <span className="font-medium">{commentCount}</span>
            </span>
          ) : null}
          <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 px-2 py-0.5 rounded-full">
            <Calendar size={11} className="text-slate-400" />
            <span className="font-medium">{formatDateBr(action.plannedEndDate)}</span>
          </span>
        </div>
      </div>

      <div className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-gradient-to-r from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30 transition-all duration-200 scale-90 group-hover:scale-100">
        <Edit3 size={11} className="text-white" />
      </div>

      {isLate ? (
        <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center">
          <span className="absolute w-4 h-4 bg-rose-500 rounded-full animate-ping opacity-40" />
          <span className="relative w-3 h-3 bg-rose-500 rounded-full shadow-lg shadow-rose-500/50" />
        </div>
      ) : null}
    </div>
  );
};

export const ActionRow: React.FC<{
  action: Action;
  onClick?: () => void;
  isLate?: boolean;
}> = ({ action, onClick, isLate }) => {
  const derivedStatus = getDerivedActionStatus(action);
  const status = STATUS_CONFIG[derivedStatus] || STATUS_CONFIG["Não Iniciado"];
  const responsible = action.raci.find((raci) => raci.role === "R")?.name || "-";
  const commentCount = action.comments?.length || 0;

  return (
    <div className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent dark:hover:from-slate-700/50 dark:hover:to-transparent border-b border-slate-100 dark:border-slate-700/50 last:border-0 ${isLate ? "bg-rose-50/40 dark:bg-rose-900/20" : ""}`} onClick={onClick}>
      <div className={`w-1.5 h-8 rounded-full ${derivedStatus === "Concluído" ? "bg-emerald-500" : derivedStatus === "Em Andamento" ? "bg-blue-500" : derivedStatus === "Atrasado" || isLate ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-600"}`} />
      <span className={`shrink-0 p-1 rounded-lg ${status.bg}`}>{status.icon}</span>
      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded w-14 text-center shrink-0">{getActionDisplayId(action.id)}</span>
      <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 truncate font-medium group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">{action.title}</span>
      <div className="w-24 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex-1"><MiniProgress value={action.progress} /></div>
          <span className={`text-xs font-bold tabular-nums w-9 text-right ${action.progress >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}>{action.progress}%</span>
        </div>
      </div>
      <span className="w-24 shrink-0 flex flex-wrap gap-1">
        {action.tags?.slice(0, 2).map((tag) => (
          <span key={tag.id} style={{ backgroundColor: tag.color }} className="px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white truncate max-w-[50px]" title={tag.name}>{tag.name}</span>
        ))}
        {(action.tags?.length || 0) > 2 ? <span className="text-[8px] text-slate-400">+{action.tags!.length - 2}</span> : null}
      </span>
      <span className="w-10 shrink-0">
        {commentCount > 0 ? <span className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full"><MessageCircle size={11} />{commentCount}</span> : null}
      </span>
      <span className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 w-28 truncate shrink-0">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">{responsible.charAt(0).toUpperCase()}</div>
        <span className="truncate">{responsible.split(" ")[0]}</span>
      </span>
      <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 w-24 shrink-0 justify-end bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded-lg"><Calendar size={11} />{formatDateBr(action.plannedEndDate)}</span>
      {isLate ? <span className="shrink-0 p-1 rounded-full bg-rose-100 dark:bg-rose-900/50"><AlertTriangle size={12} className="text-rose-500" /></span> : null}
      <span className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-teal-500 transition-all shrink-0"><Edit3 size={11} className="text-white" /></span>
    </div>
  );
};

export function buildListRows({
  groupedData,
  selectedUid,
  isModalOpen,
  onSelectAction,
  isActionLate,
}: {
  groupedData: OptimizedObjectiveGroup[];
  selectedUid: string | null;
  isModalOpen: boolean;
  onSelectAction: (uid: string) => void;
  isActionLate: (action: Action) => boolean;
}) {
  return groupedData.flatMap((objective, objectiveIndex) => {
    const displayNumber = objectiveIndex + 1;
    const visibleActivities = objective.activities.filter((activity) => activity.actions.length > 0);

    if (visibleActivities.length === 0) return [];

    const rows: React.ReactNode[] = [
      <div key={`obj-${objective.id}`} className="bg-slate-50/80 dark:bg-slate-700/30 px-4 py-2 border-y border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex items-center justify-center w-6 h-6 rounded-md text-white text-xs font-bold shadow-sm ${OBJECTIVE_COLORS[displayNumber]?.accent || "bg-slate-500"}`}>{displayNumber}</span>
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm tracking-tight">{objective.title}</h3>
        </div>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{objective.actionCount} ações</div>
      </div>,
    ];

    visibleActivities.forEach((activity) => {
      rows.push(
        <div key={`act-${activity.id}`} className="bg-white dark:bg-slate-800 px-4 py-2 pl-12 border-b border-slate-100/50 dark:border-slate-700/50 flex items-center gap-2">
          <Layers size={12} className="text-slate-400" />
          <h4 className="font-semibold text-slate-600 dark:text-slate-300 text-xs">{getActivityDisplayId(activity.id)}. {activity.title}</h4>
        </div>,
      );

      activity.actions.forEach((action) => {
        const isSelected = selectedUid === action.uid && isModalOpen;
        rows.push(
          <div key={action.uid} className={`transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isSelected ? "bg-teal-50/50 dark:bg-teal-900/20" : ""}`}>
            <ActionRow action={action} onClick={() => onSelectAction(action.uid)} isLate={isActionLate(action)} />
          </div>,
        );
      });
    });

    return rows;
  });
}
