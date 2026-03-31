import type { Action, Activity, Objective, TeamMember } from "../../../types";

export interface DashboardNavigateFilters {
    objectiveId?: number;
    status?: string;
}

export interface DashboardProps {
    actions: Action[];
    activities: Record<number, Activity[]>;
    currentMicroId?: string;
    currentMicroLabel?: string;
    objectives: Objective[];
    onNavigate: (view: "list" | "team", filters?: DashboardNavigateFilters) => void;
    objectiveId?: number;
    status?: string;
    team: TeamMember[];
}

export interface DashboardStatusDatum {
    [key: string]: string | number;
    color: string;
    name: string;
    value: number;
}

export interface DashboardObjectiveProgressDatum {
    count: number;
    fullName: string;
    id: number;
    name: string;
    progress: number;
}

export interface DashboardMemberLoadDatum {
    count: number;
    fullName: string;
    name: string;
}

export interface DashboardMetrics {
    actionsByMember: DashboardMemberLoadDatum[];
    atrasados: number;
    concluidos: number;
    emAndamento: number;
    naoIniciados: number;
    percentConcluido: number;
    progressoPorObjetivo: DashboardObjectiveProgressDatum[];
    statusData: DashboardStatusDatum[];
    total: number;
    upcomingDeadlines: Action[];
}
