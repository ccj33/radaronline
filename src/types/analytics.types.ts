// ============================================
// TIPOS: Sistema de Analytics - Radar
// ============================================

export type AnalyticsEventType =
    | 'page_view'
    | 'click'
    | 'scroll'
    | 'time_spent'
    | 'session_start'
    | 'session_end';

export interface AnalyticsEvent {
    sessionId: string;
    userId: string;
    eventType: AnalyticsEventType;
    page: string;
    element?: string;
    scrollDepth?: number;
    durationSeconds?: number;
    metadata?: Record<string, any>;
}

export interface UserSession {
    id: string;
    userId: string;
    startedAt: string;
    endedAt?: string;
    durationSeconds?: number;
    pageCount: number;
    deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
    isMobile: boolean;
}

// ============================================
// TIPOS PARA O DASHBOARD
// ============================================

export interface PageViewStats {
    page: string;
    viewCount: number;
    avgTimeSeconds: number;
    avgScrollDepth: number;
    uniqueUsers: number;
}

export interface TopPage {
    page: string;
    views: number;
    percentage: number;
}

export interface RegionEngagement {
    microregiaoId: string;
    municipio: string | null;
    activeUsers: number;
    totalViews: number;
    totalSessions: number;
    avgSessionDuration: number;
    lastActivity: string;
}

export interface InactiveMunicipality {
    microregiaoId: string;
    municipio: string;
    lastLogin: string;
    daysSinceLogin: number;
    userCount: number;
}

export interface HourlyUsage {
    hour: number;
    count: number;
}

export interface FlowStep {
    fromPage: string;
    toPage: string;
    count: number;
}

export interface ActionMetrics {
    totalCreated: number;
    totalUpdated: number;
    totalCompleted: number;
    avgCompletionDays: number;
}

export interface AnalyticsFilter {
    startDate?: Date;
    endDate?: Date;
    microregiaoId?: string;
    municipio?: string;
    eventType?: AnalyticsEventType;
}

export interface AnalyticsSummary {
    activeUsersToday: number;
    activeUsersTotal: number;
    sessionsToday: number;
    avgSessionDuration: number;
    engagementRate: number;
    topPages: TopPage[];
    hourlyUsage: HourlyUsage[];
    inactiveMunicipalities: InactiveMunicipality[];
    regionEngagement: RegionEngagement[];
}
