import { ClipboardList } from "lucide-react";

interface RequestsManagementHeaderProps {
  pendingCount: number;
  resolvedCount: number;
  totalCount: number;
}

export function RequestsManagementHeader({
  pendingCount,
  resolvedCount,
  totalCount,
}: RequestsManagementHeaderProps) {
  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4 sm:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl text-white shadow-lg">
            <ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-white">Central de Solicitações</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Gerencie todas as solicitações dos usuários</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-4 w-full lg:w-auto">
          <div className="text-center px-2.5 sm:px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</div>
            <div className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase">Pendentes</div>
          </div>
          <div className="text-center px-2.5 sm:px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{resolvedCount}</div>
            <div className="text-[10px] font-bold text-green-700 dark:text-green-500 uppercase">Resolvidos</div>
          </div>
          <div className="text-center px-2.5 sm:px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-xl sm:text-2xl font-bold text-slate-600 dark:text-slate-300">{totalCount}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
}
