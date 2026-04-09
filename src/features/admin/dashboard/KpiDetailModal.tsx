import { useMemo, useState } from "react";
import { Printer, X } from "lucide-react";

import { printReport } from "../../../lib/reportUtils";

import { KPI_MODAL_CONFIGS } from "./kpiDetailModal/kpiDetailModal.constants";
import { KpiDetailContent } from "./kpiDetailModal/KpiDetailContent";
import { generateKpiReportHTML } from "./kpiDetailModal/kpiDetailModal.report";
import type { KpiDetailModalProps } from "./kpiDetailModal/kpiDetailModal.types";

export function KpiDetailModal({
  type,
  isOpen,
  onClose,
  objectiveProgress = [],
  overdueActions = [],
  microCoverage = [],
  deadlineHorizon = [],
  statusData = [],
  totalActions = 0,
  completedActions = 0,
  completionRate = 0,
  coverageRate = 0,
  onViewMicro,
}: KpiDetailModalProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const config = KPI_MODAL_CONFIGS[type];
  const Icon = config.icon;
  const deadlineTotal = useMemo(() => deadlineHorizon.reduce((sum, item) => sum + item.value, 0), [deadlineHorizon]);
  const statusTotal = useMemo(() => statusData.reduce((sum, item) => sum + item.value, 0), [statusData]);

  const headerMetric = useMemo(() => {
    if (type === "conclusao") {
      return {
        value: `${completionRate}%`,
        description: `de conclusão (${completedActions}/${totalActions} ações)`,
      };
    }

    if (type === "risco") {
      return {
        value: `${overdueActions.length}`,
        description: "ações atrasadas",
      };
    }

    if (type === "cobertura") {
      return {
        value: `${coverageRate}%`,
        description: "das microrregiões com ações",
      };
    }

    if (type === "horizonte") {
      return {
        value: `${deadlineTotal}`,
        description: "ações no horizonte de entregas",
      };
    }

    return {
      value: `${statusTotal}`,
      description: "ações no planejamento",
    };
  }, [completionRate, completedActions, coverageRate, deadlineTotal, overdueActions.length, statusTotal, totalActions, type]);

  const handlePrint = () => {
    const reportHTML = generateKpiReportHTML({
      type,
      objectiveProgress,
      overdueActions,
      microCoverage,
      deadlineHorizon,
      statusData,
      totalActions,
      completedActions,
      completionRate,
      coverageRate,
    });

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = reportHTML;
    printReport(tempDiv, `Relatório - ${config.title}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className={`p-6 bg-gradient-to-r ${config.bgGradient} text-white relative overflow-hidden`}>
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-xl" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{config.title}</h2>
                <p className="text-white/80 text-sm mt-1">{config.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} title="Imprimir relatório" className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <Printer className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-end gap-2">
            <span className="text-5xl font-bold">{headerMetric.value}</span>
            <span className="text-white/70 mb-2">{headerMetric.description}</span>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <KpiDetailContent
            type={type}
            objectiveProgress={objectiveProgress}
            overdueActions={overdueActions}
            microCoverage={microCoverage}
            deadlineHorizon={deadlineHorizon}
            statusData={statusData}
            onViewMicro={onViewMicro}
            expandedCategory={expandedCategory}
            onToggleCategory={(name) => setExpandedCategory((current) => (current === name ? null : name))}
          />
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
