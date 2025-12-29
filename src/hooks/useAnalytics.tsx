// ============================================
// HOOK: useAnalytics - Radar
// Tracking automático de page views, cliques, scroll e tempo
// ============================================

import { useEffect, useRef, useCallback, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../auth';
import { analyticsService } from '../services/analyticsService';
import type { DeviceInfo } from '../types/analytics.types';

// Gerar ID de sessão único por aba
const generateSessionId = (): string => {
    const existing = sessionStorage.getItem('analytics_session_id');
    if (existing) return existing;

    const newId = crypto.randomUUID();
    sessionStorage.setItem('analytics_session_id', newId);
    return newId;
};

// Detectar informações do dispositivo
const getDeviceInfo = (): DeviceInfo => ({
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
});

// Estado global da sessão
let sessionId: string | null = null;
let sessionStarted = false;
let timeSpentInterval: ReturnType<typeof setInterval> | null = null;
let currentPageStartTime: number = Date.now();
let currentPage: string = '';

export const useAnalytics = () => {
    const { user } = useAuth();
    const userId = user?.id;
    const scrollMarkersReached = useRef<Set<number>>(new Set());

    // Inicializar sessão
    const initSession = useCallback(async () => {
        if (!userId || sessionStarted) return;

        const deviceInfo = getDeviceInfo();
        const newSessionId = await analyticsService.startSession(userId, deviceInfo);

        if (newSessionId) {
            sessionId = newSessionId;
            sessionStorage.setItem('analytics_session_id', newSessionId);
            sessionStarted = true;

            // Registrar início da sessão
            await analyticsService.trackEvent({
                sessionId: newSessionId,
                userId,
                eventType: 'session_start',
                page: window.location.pathname,
                metadata: { deviceInfo }
            });
        }
    }, [userId]);

    // Finalizar sessão
    const endSession = useCallback(async () => {
        if (!sessionId || !userId) return;

        // Salvar tempo da última página
        const timeSpent = Math.floor((Date.now() - currentPageStartTime) / 1000);
        if (timeSpent > 0 && currentPage) {
            await analyticsService.trackEvent({
                sessionId,
                userId,
                eventType: 'time_spent',
                page: currentPage,
                durationSeconds: timeSpent
            });
        }

        // Registrar fim da sessão
        await analyticsService.trackEvent({
            sessionId,
            userId,
            eventType: 'session_end',
            page: window.location.pathname
        });

        await analyticsService.endSession(sessionId);
        sessionStarted = false;
    }, [userId]);

    // Tracking de page view
    const trackPageView = useCallback((page?: string) => {
        if (!sessionId || !userId) return;

        const targetPage = page || window.location.pathname;

        // Salvar tempo da página anterior
        if (currentPage && currentPage !== targetPage) {
            const timeSpent = Math.floor((Date.now() - currentPageStartTime) / 1000);
            if (timeSpent > 0) {
                analyticsService.trackEvent({
                    sessionId,
                    userId,
                    eventType: 'time_spent',
                    page: currentPage,
                    durationSeconds: timeSpent
                });
            }
        }

        // Resetar para nova página
        currentPage = targetPage;
        currentPageStartTime = Date.now();
        scrollMarkersReached.current.clear();

        analyticsService.trackEvent({
            sessionId,
            userId,
            eventType: 'page_view',
            page: targetPage
        });
    }, [userId]);

    // Tracking de clique
    const trackClick = useCallback((element: string, metadata?: Record<string, any>) => {
        if (!sessionId || !userId) return;

        analyticsService.trackEvent({
            sessionId,
            userId,
            eventType: 'click',
            page: window.location.pathname,
            element,
            metadata
        });
    }, [userId]);

    // Tracking de evento customizado
    const trackCustomEvent = useCallback((eventName: string, metadata: Record<string, any>) => {
        if (!sessionId || !userId) return;

        analyticsService.trackEvent({
            sessionId,
            userId,
            eventType: 'click', // Usar click como fallback
            page: window.location.pathname,
            element: eventName,
            metadata
        });
    }, [userId]);

    // Tracking de scroll (retorna cleanup function)
    const trackScroll = useCallback(() => {
        if (!sessionId || !userId) return () => { };

        const markers = [25, 50, 75, 100];

        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

            markers.forEach(marker => {
                if (scrollPercent >= marker && !scrollMarkersReached.current.has(marker)) {
                    scrollMarkersReached.current.add(marker);

                    analyticsService.trackEvent({
                        sessionId: sessionId!,
                        userId: userId!,
                        eventType: 'scroll',
                        page: window.location.pathname,
                        scrollDepth: marker
                    });
                }
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [userId]);

    // Tracking de tempo na página (retorna cleanup function)
    const trackTimeSpent = useCallback(() => {
        if (!sessionId || !userId) return () => { };

        currentPageStartTime = Date.now();

        // Salvar a cada 30 segundos
        timeSpentInterval = setInterval(() => {
            const timeSpent = Math.floor((Date.now() - currentPageStartTime) / 1000);
            if (timeSpent > 0) {
                analyticsService.trackEvent({
                    sessionId: sessionId!,
                    userId: userId!,
                    eventType: 'time_spent',
                    page: window.location.pathname,
                    durationSeconds: timeSpent
                });
                currentPageStartTime = Date.now(); // Reset para próximo intervalo
            }
        }, 30000);

        return () => {
            if (timeSpentInterval) {
                clearInterval(timeSpentInterval);
                timeSpentInterval = null;
            }

            // Salvar tempo final
            const timeSpent = Math.floor((Date.now() - currentPageStartTime) / 1000);
            if (timeSpent > 0 && sessionId && userId) {
                analyticsService.trackEvent({
                    sessionId,
                    userId,
                    eventType: 'time_spent',
                    page: window.location.pathname,
                    durationSeconds: timeSpent
                });
            }
        };
    }, [userId]);

    // Inicializar sessão quando usuário logar
    useEffect(() => {
        if (userId && !sessionStarted) {
            initSession();
        }
    }, [userId, initSession]);

    // Finalizar sessão quando a aba fechar
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (sessionId && userId) {
                // Usar sendBeacon para garantir que a requisição seja enviada
                const data = {
                    session_id: sessionId,
                    event_type: 'session_end',
                    page: window.location.pathname,
                    user_id: userId
                };

                navigator.sendBeacon('/api/analytics-end', JSON.stringify(data));
                endSession();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [userId, endSession]);

    return {
        // Estado
        sessionId,
        isTracking: sessionStarted && !!userId,

        // Funções de tracking manual
        trackClick,
        trackCustomEvent,
        trackPageView,

        // Funções que retornam cleanup (usar em useEffect)
        trackScroll,
        trackTimeSpent,

        // Controle de sessão
        initSession,
        endSession
    };
};

// ============================================
// COMPONENTE WRAPPER: AnalyticsProvider
// Para usar no root do app
// ============================================

interface AnalyticsContextValue {
    trackClick: (element: string, metadata?: Record<string, any>) => void;
    trackCustomEvent: (eventName: string, metadata: Record<string, any>) => void;
    trackPageView: (page?: string) => void;
    isTracking: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export const useAnalyticsContext = () => {
    const context = useContext(AnalyticsContext);
    if (!context) {
        // Retornar funções vazias se não tiver provider
        return {
            trackClick: () => { },
            trackCustomEvent: () => { },
            trackPageView: () => { },
            isTracking: false
        };
    }
    return context;
};

interface AnalyticsProviderProps {
    children: ReactNode;
}

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
    const analytics = useAnalytics();

    // Auto-tracking de scroll e tempo
    useEffect(() => {
        if (!analytics.isTracking) return;

        const cleanupScroll = analytics.trackScroll();
        const cleanupTime = analytics.trackTimeSpent();

        return () => {
            cleanupScroll();
            cleanupTime();
        };
    }, [analytics.isTracking]);

    // Track page view on route change
    useEffect(() => {
        if (analytics.isTracking) {
            analytics.trackPageView();
        }
    }, [analytics.isTracking]);

    return (
        <AnalyticsContext.Provider value={{
            trackClick: analytics.trackClick,
            trackCustomEvent: analytics.trackCustomEvent,
            trackPageView: analytics.trackPageView,
            isTracking: analytics.isTracking
        }}>
            {children}
        </AnalyticsContext.Provider>
    );
};

