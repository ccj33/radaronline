import { ChevronLeft, ChevronRight } from "lucide-react";

interface RequestsManagementPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function RequestsManagementPagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPreviousPage,
  onNextPage,
}: RequestsManagementPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-3 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
      <span className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
        Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} de {totalCount}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onPreviousPage}
          disabled={page === 1}
          className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[72px] text-center">
          {page} / {totalPages}
        </span>
        <button
          onClick={onNextPage}
          disabled={page === totalPages}
          className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
