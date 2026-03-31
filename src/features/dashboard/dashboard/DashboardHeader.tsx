import { Calendar, FileText, MapPinned } from "lucide-react";

interface DashboardHeaderProps {
    macroName?: string | null;
    microName?: string | null;
    onOpenReport: () => void;
    urs?: string | null;
    userName?: string | null;
}

export function DashboardHeader({ macroName, microName, onOpenReport, urs, userName }: DashboardHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 sm:text-[2rem]">
                    Indicadores
                </h2>
                <p className="mt-1 text-slate-500 dark:text-slate-400">
                    Ola, <strong>{userName || "Gestor"}</strong>. Aqui esta o que importa agora na sua microrregiao.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    {microName ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 dark:border-teal-900/40 dark:bg-teal-900/20 dark:text-teal-300">
                            <MapPinned size={14} />
                            {microName}
                        </span>
                    ) : null}
                    {macroName ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Macro {macroName}
                        </span>
                    ) : null}
                    {urs ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            URS {urs}
                        </span>
                    ) : null}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
                    onClick={onOpenReport}
                >
                    <FileText size={16} />
                    Exportar Relatorio
                </button>
                <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:flex">
                    <Calendar size={16} className="text-teal-600 dark:text-teal-400" />
                    {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", weekday: "long" })}
                </div>
            </div>
        </div>
    );
}
