import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Users } from "lucide-react";

import { DASHBOARD_COLORS } from "./dashboard.constants";
import { DashboardSafeResponsiveContainer } from "./DashboardSafeResponsiveContainer";
import type { DashboardMemberLoadDatum } from "./dashboard.types";

interface DashboardTeamCapacityProps {
    data: DashboardMemberLoadDatum[];
    isMobile: boolean;
}

export function DashboardTeamCapacity({ data, isMobile }: DashboardTeamCapacityProps) {
    if (data.length === 0) {
        return (
            <section className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <Users size={24} className="text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sem dados de equipe</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 text-center">Atribua acoes aos membros para visualizar a carga de trabalho.</p>
            </section>
        );
    }

    // Sort to show highest load at top, slice top 8 for UI cleanliness
    const chartData = [...data].sort((a, b) => b.count - a.count).slice(0, 8);

    return (
        <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                <Users size={16} className="text-indigo-500" />
                Carga da Equipe (Top 8)
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Acoes atribuidas por membro ativo.
            </p>

            <div className="mt-4 flex-1 min-h-[260px] w-full">
                <DashboardSafeResponsiveContainer>
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ bottom: 5, left: 10, right: 16, top: 8 }}
                    >
                        <CartesianGrid horizontal={false} stroke="rgba(148, 163, 184, 0.15)" strokeDasharray="4 4" />
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={isMobile ? 70 : 100} 
                            tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }} 
                            axisLine={false}
                            tickLine={false}
                        />
                        <RechartsTooltip 
                            cursor={{ fill: "rgba(148, 163, 184, 0.06)" }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: any) => [`${value} acoes`, 'Carga']}
                            labelStyle={{ color: '#0f172a', fontWeight: 'bold', marginBottom: '4px' }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? DASHBOARD_COLORS.violet : DASHBOARD_COLORS.emAndamento} opacity={0.85} />
                            ))}
                        </Bar>
                    </BarChart>
                </DashboardSafeResponsiveContainer>
            </div>
        </section>
    );
}