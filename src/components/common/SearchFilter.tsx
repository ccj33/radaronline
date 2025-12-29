import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Status } from '../../types';

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: Status | 'all';
  onStatusFilterChange: (value: Status | 'all') => void;
  responsibleFilter: string;
  onResponsibleFilterChange: (value: string) => void;
  teamMembers: { id: string; name: string }[];
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  responsibleFilter,
  onResponsibleFilterChange,
  teamMembers,
}) => {
  const hasFilters = searchTerm || statusFilter !== 'all' || responsibleFilter;

  const clearFilters = () => {
    onSearchChange('');
    onStatusFilterChange('all');
    onResponsibleFilterChange('');
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 sm:p-4 mb-4 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar ação..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value as Status | 'all')}
            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
          >
            <option value="all">Todos os status</option>
            <option value="Não Iniciado">Não Iniciado</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluído">Concluído</option>
            <option value="Atrasado">Atrasado</option>
          </select>
        </div>

        {/* Responsible Filter */}
        <select
          value={responsibleFilter}
          onChange={e => onResponsibleFilterChange(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
        >
          <option value="">Todos os responsáveis</option>
          {teamMembers.map(m => (
            <option key={m.id} value={m.name}>{m.name}</option>
          ))}
        </select>

        {/* Clear Filters */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={14} />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        )}
      </div>

      {/* Active filters badge */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          {searchTerm && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs rounded-full">
              Busca: "{searchTerm}"
              <button onClick={() => onSearchChange('')} className="hover:text-teal-900 dark:hover:text-teal-100"><X size={12} /></button>
            </span>
          )}
          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
              Status: {statusFilter}
              <button onClick={() => onStatusFilterChange('all')} className="hover:text-blue-900 dark:hover:text-blue-100"><X size={12} /></button>
            </span>
          )}
          {responsibleFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
              Responsável: {responsibleFilter}
              <button onClick={() => onResponsibleFilterChange('')} className="hover:text-purple-900 dark:hover:text-purple-100"><X size={12} /></button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

