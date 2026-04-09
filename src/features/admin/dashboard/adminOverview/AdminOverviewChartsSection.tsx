import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Calendar, MapPin } from "lucide-react";

import { SafeResponsiveContainer } from "./SafeResponsiveContainer";
import { CleanTooltip } from "./CleanTooltip";
import type { AdminOverviewMetricItem, AdminOverviewMetrics } from "./adminOverview.types";

interface AdminOverviewChartsSectionProps {
  children?: ReactNode;
  metrics: AdminOverviewMetrics;
  statusData: AdminOverviewMetricItem[];
  onOpenModal: (key: "status" | "horizonte") => void;
}

export function AdminOverviewChartsSection({
  children,
  metrics,
  statusData,
  onOpenModal,
}: AdminOverviewChartsSectionProps) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md h-full min-h-[500px]">
        <div className="p-6 pb-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Mapa Tático</h2>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">Tempo real</span>
        </div>
        <div className="flex-1 min-h-0 relative">{children}</div>
      </div>

      <div className="lg:col-span-1 space-y-6">
        <div
          onClick={() => onOpenModal("status")}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm h-[240px] flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer"
        >
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              Status do Plano de Ação
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Distribuição percentual</p>
          </div>

          <div className="flex-1 min-h-0 relative">
            <SafeResponsiveContainer minHeight={120}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`status-${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CleanTooltip />} />
              </PieChart>
            </SafeResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.totalAcoes}</span>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ações</span>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            {statusData.slice(0, 3).map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          onClick={() => onOpenModal("horizonte")}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm h-[240px] flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Horizonte
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Próximos vencimentos</p>
            </div>
          </div>

          <div className="flex-1 mt-4">
            <SafeResponsiveContainer minHeight={120}>
              <BarChart data={metrics.deadlineHorizon} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip content={<CleanTooltip />} cursor={{ fill: "transparent" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {metrics.deadlineHorizon.map((entry, index) => (
                    <Cell key={`deadline-${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </SafeResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
