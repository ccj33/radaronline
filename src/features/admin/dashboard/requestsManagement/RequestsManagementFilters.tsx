import { RotateCcw, Search } from "lucide-react";

import { MICROREGIOES } from "../../../../data/microregioes";

import type { StatusFilter, TypeFilter } from "./requestsManagement.types";

interface RequestsManagementFiltersProps {
  statusFilter: StatusFilter;
  typeFilter: TypeFilter;
  microFilter: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onMicroFilterChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onTypeFilterChange: (value: TypeFilter) => void;
  onRefresh: () => void;
}

export function RequestsManagementFilters({
  statusFilter,
  typeFilter,
  microFilter,
  searchQuery,
  onSearchQueryChange,
  onMicroFilterChange,
  onStatusFilterChange,
  onTypeFilterChange,
  onRefresh,
}: RequestsManagementFiltersProps) {
  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 sm:px-6 py-3 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[220px] sm:max-w-[360px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou conteúdo..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <button
          onClick={onRefresh}
          className="h-11 sm:h-auto sm:p-2 px-3 sm:px-2 inline-flex items-center justify-center gap-2 text-sm sm:text-base text-slate-600 hover:text-teal-600 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
          title="Atualizar"
        >
          <RotateCcw size={18} />
          <span className="sm:hidden font-medium">Atualizar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={microFilter}
          onChange={(event) => onMicroFilterChange(event.target.value)}
          className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500/20"
        >
          <option value="all">Todas Microrregiões</option>
          {MICROREGIOES.map((micro) => (
            <option key={micro.id} value={micro.id}>
              {micro.nome}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(event) => onTypeFilterChange(event.target.value as TypeFilter)}
          className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500/20"
        >
          <option value="all">Todos os Tipos</option>
          <option value="request">Solicitação</option>
          <option value="feedback">Feedback</option>
          <option value="support">Suporte</option>
          <option value="mention">Menção</option>
          <option value="announcement">Comunicado</option>
          <option value="system">Sistema</option>
          <option value="profile_change">Alteração de Perfil (legado)</option>
        </select>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 min-w-max">
          {(["all", "pending", "answered", "resolved", "rejected"] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => onStatusFilterChange(status)}
              className={`px-3 py-2 text-xs font-bold rounded-md transition-all ${
                statusFilter === status
                  ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {status === "all" ? "Todos" : status === "pending" ? "Pendentes" : status === "answered" ? "Respondidas" : status === "resolved" ? "Resolvidos" : "Rejeitados"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
