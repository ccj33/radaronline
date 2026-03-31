import { Search } from "lucide-react";

import type { Status } from "../../../types";
import type { OptimizedStatusFilter, OptimizedViewMode } from "./optimizedView.types";

interface OptimizedViewHeaderProps {
  metrics: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    late: number;
    alert: number;
    avgProgress: number;
  };
  viewMode: OptimizedViewMode;
  searchTerm: string;
  statusFilter: OptimizedStatusFilter;
  onSearchTermChange: (value: string) => void;
  onViewModeChange: (viewMode: OptimizedViewMode) => void;
  onStatusFilterChange: (filter: OptimizedStatusFilter) => void;
}

const VIEW_MODE_OPTIONS: Array<{ value: OptimizedViewMode; label: string; hint: string }> = [
  {
    value: "tree",
    label: "Árvore",
    hint: "Objetivos e atividades em hierarquia",
  },
  {
    value: "cards",
    label: "Cards",
    hint: "Cartões compactos para varredura rápida",
  },
  {
    value: "list",
    label: "Lista",
    hint: "Visão detalhada para conferência fina",
  },
  {
    value: "kanban",
    label: "Kanban",
    hint: "Fluxo por status em colunas",
  },
];

function MetricButton({
  active,
  count,
  label,
  onClick,
  activeClassName,
  inactiveClassName,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
  activeClassName: string;
  inactiveClassName: string;
}) {
  return (
    <button onClick={onClick} className={`group shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${active ? activeClassName : inactiveClassName}`}>
      <span className="text-base sm:text-lg font-bold">{count}</span>
      <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{label}</span>
    </button>
  );
}

export function OptimizedViewHeader({
  metrics,
  viewMode,
  searchTerm,
  statusFilter,
  onSearchTermChange,
  onViewModeChange,
  onStatusFilterChange,
}: OptimizedViewHeaderProps) {
  const activeMode = VIEW_MODE_OPTIONS.find((mode) => mode.value === viewMode);

  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-1 px-2 sm:px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/50 overflow-x-auto">
        <MetricButton active={statusFilter === "all"} count={metrics.total} label="Total" onClick={() => onStatusFilterChange("all")} activeClassName="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white" inactiveClassName="hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300" />
        <span className="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
        <MetricButton active={statusFilter === "Conclu\u00EDdo"} count={metrics.completed} label="Concluídas" onClick={() => onStatusFilterChange("Conclu\u00EDdo" as Status)} activeClassName="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" inactiveClassName="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 text-emerald-500/70 dark:text-emerald-500/50" />
        <MetricButton active={statusFilter === "Em Andamento"} count={metrics.inProgress} label="Andamento" onClick={() => onStatusFilterChange("Em Andamento" as Status)} activeClassName="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" inactiveClassName="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-blue-500/70 dark:text-blue-500/50" />
        <MetricButton active={statusFilter === "N\u00E3o Iniciado"} count={metrics.notStarted} label="Pendentes" onClick={() => onStatusFilterChange("N\u00E3o Iniciado" as Status)} activeClassName="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300" inactiveClassName="hover:bg-slate-100/50 dark:hover:bg-slate-700/30 text-slate-400 dark:text-slate-500" />
        {metrics.alert > 0 ? <MetricButton active={statusFilter === "alert"} count={metrics.alert} label="Alerta" onClick={() => onStatusFilterChange("alert")} activeClassName="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" inactiveClassName="hover:bg-amber-50/50 dark:hover:bg-amber-900/20 text-amber-500/70 dark:text-amber-500/50" /> : null}
        {metrics.late > 0 ? <MetricButton active={statusFilter === "late"} count={metrics.late} label="Atrasadas" onClick={() => onStatusFilterChange("late")} activeClassName="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" inactiveClassName="hover:bg-orange-50/50 dark:hover:bg-orange-900/20 text-orange-500/70 dark:text-orange-500/50" /> : null}
        <span className="hidden sm:inline text-slate-300 dark:text-slate-600 ml-1">|</span>
        <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 shrink-0">
          <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all" style={{ width: `${metrics.avgProgress}%` }} />
          </div>
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{metrics.avgProgress}%</span>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-2 space-y-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {VIEW_MODE_OPTIONS.map((mode) => (
            <button
              key={mode.value}
              onClick={() => onViewModeChange(mode.value)}
              className={`shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${viewMode === mode.value ? "text-teal-600 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 ring-1 ring-teal-200/70 dark:ring-teal-800/80" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"}`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 min-w-0 truncate">
            {activeMode?.hint}
          </p>

          <div className="relative flex-1 sm:flex-none sm:w-44">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar ação..." value={searchTerm} onChange={(event) => onSearchTermChange(event.target.value)} className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
