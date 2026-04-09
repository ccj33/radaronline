import type { Action, Activity, Objective, TeamMember } from "../../../types";

export interface StrategicReportGeneratorProps {
    actions: Action[];
    activities: Record<number, Activity[]>;
    isOpen: boolean;
    microName?: string;
    objectives: Objective[];
    onClose: () => void;
    team: TeamMember[];
    userName?: string;
}

export type ReportType = "consolidated" | "executive" | "byObjective";

export interface StrategicReportStatusDatum {
    color: string;
    name: string;
    value: number;
}

export interface StrategicReportObjectiveProgressDatum {
    completed: number;
    count: number;
    /** Ordem de exibição (1, 2, 3…), igual ao painel — não é o id do banco */
    displayOrder: number;
    fullName: string;
    id: number;
    name: string;
    progress: number;
}

export interface StrategicReportMemberLoadDatum {
    count: number;
    fullName: string;
    name: string;
}

export interface StrategicReportMetrics {
    actionsByMember: StrategicReportMemberLoadDatum[];
    atrasados: number;
    concluidos: number;
    emAndamento: number;
    naoIniciados: number;
    percentConcluido: number;
    progressoPorObjetivo: StrategicReportObjectiveProgressDatum[];
    statusData: StrategicReportStatusDatum[];
    total: number;
    upcomingDeadlines: Action[];
}

export interface GenerateStrategicReportHtmlParams {
    actions: Action[];
    activities: Record<number, Activity[]>;
    metrics: StrategicReportMetrics;
    microName: string;
    objectives: Objective[];
    team: TeamMember[];
    type: ReportType;
    userName: string;
}
