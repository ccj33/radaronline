import { useState, useCallback, useEffect, useRef } from 'react';
import {
    Action,
    TeamMember,
    Objective,
    Activity,
} from '../types';
import * as actionsService from '../services/actionsService';
import { loadObjectives, loadActivities } from '../services/objectivesActivitiesService';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/common/Toast';
import { logError } from '../lib/logger';
import { CACHE_KEYS, getCache, setCache } from '../lib/sessionCache';
import { isAdminLike } from '../lib/authHelpers';
import { filterOrphanedActions as filterValidActionsByActivity } from '../lib/actionValidation';
import {
    DEMO_ACTIONS,
    DEMO_TEAM,
    DEMO_OBJECTIVES,
    DEMO_ACTIVITIES
} from '../data/mockData';
import { loadTeams } from '../services/teamsService';

// Helper para filtrar aÃ§Ãµes Ã³rfÃ£s
const _filterOrphanedActions = (actions: Action[], activitiesByObj: Record<number, Activity[]>) => {
    const allActivityIds = new Set<string>();
    Object.values(activitiesByObj).forEach(activities => {
        activities.forEach(a => allActivityIds.add(String(a.id)));
    });
    return actions.filter(action => allActivityIds.has(String(action.activityId)));
};

function isAbortLikeError(error: unknown): boolean {
    if (error instanceof Error) {
        return error.name === 'AbortError' || error.message.toLowerCase().includes('signal is aborted');
    }

    if (typeof error === 'string') {
        return error.toLowerCase().includes('signal is aborted');
    }

    return false;
}

export function useAppData() {
    const { user, isDemoMode: isDemo } = useAuth();
    const { showToast } = useToast();

    // State
    const [actions, setActions] = useState<Action[]>([]);
    const [objectives, setObjectives] = useState<Objective[]>([]);
    const [activities, setActivities] = useState<Record<number, Activity[]>>({});
    const [teamsByMicro, setTeamsByMicro] = useState<Record<string, TeamMember[]>>({});

    const [isDataLoading, setIsDataLoading] = useState(true);
    const [dataError, setDataError] = useState<string | null>(null);

    // Selection State
    const [selectedObjective, setSelectedObjective] = useState<number>(0);
    const [selectedActivity, setSelectedActivity] = useState<string>('');
    const selectedObjectiveRef = useRef(selectedObjective);
    const selectedActivityRef = useRef(selectedActivity);

    useEffect(() => {
        selectedObjectiveRef.current = selectedObjective;
    }, [selectedObjective]);

    useEffect(() => {
        selectedActivityRef.current = selectedActivity;
    }, [selectedActivity]);

    // Derived State (memoized logic should happen in components, but base getters here)
    const currentTeam = user?.microregiaoId ? (teamsByMicro[user.microregiaoId] || []) : [];

    // -- Actions --

    const loadData = useCallback(async (forceRefresh = false) => {
        // Se nÃ£o estiver autenticado, nÃ£o carrega (o AuthContext deve lidar com redirect)
        if (!user && !isDemo) return;

        setIsDataLoading(true);
        setDataError(null);
        let hydratedFromCache = false;

        try {
            const currentSelectedObjective = selectedObjectiveRef.current;
            const currentSelectedActivity = selectedActivityRef.current;

            // 1. DEMO MODE
            if (isDemo) {
                setActions(DEMO_ACTIONS);
                setTeamsByMicro(DEMO_TEAM);
                setObjectives(DEMO_OBJECTIVES);
                setActivities(DEMO_ACTIVITIES);

                // Setup initial selection
                if (DEMO_OBJECTIVES.length > 0) {
                    setSelectedObjective(DEMO_OBJECTIVES[0].id);
                    const firstObjActs = DEMO_ACTIVITIES[DEMO_OBJECTIVES[0].id] || [];
                    if (firstObjActs.length > 0) setSelectedActivity(firstObjActs[0].id);
                }

                setIsDataLoading(false);
                return;
            }

            // 2. REAL MODE
            const microId = isAdminLike(user?.role) ? undefined : user?.microregiaoId;
            const cacheMicroId = microId;

            // Cache Check
            if (!forceRefresh) {
                const [cachedActions, cachedTeams, cachedObjs, cachedActs] = [
                    getCache<Action[]>(CACHE_KEYS.ACTIONS, cacheMicroId),
                    getCache<Record<string, TeamMember[]>>(CACHE_KEYS.TEAMS, cacheMicroId),
                    getCache<Objective[]>(CACHE_KEYS.OBJECTIVES, cacheMicroId),
                    getCache<Record<number, Activity[]>>(CACHE_KEYS.ACTIVITIES, cacheMicroId)
                ];

                if (cachedActions && cachedTeams && cachedObjs && cachedActs) {
                    setActions(cachedActions);
                    setTeamsByMicro(cachedTeams);
                    setObjectives(cachedObjs);
                    setActivities(cachedActs);
                    setIsDataLoading(false);
                    hydratedFromCache = true;

                    // Keep selection consistent with cached dataset
                    if (cachedObjs.length > 0) {
                        const nextObjId = cachedObjs.some((o: Objective) => o.id === currentSelectedObjective)
                            ? currentSelectedObjective
                            : cachedObjs[0].id;

                        if (nextObjId !== currentSelectedObjective) setSelectedObjective(nextObjId);

                        const acts = cachedActs[nextObjId] || [];
                        if (acts.length > 0) {
                            const actExists = acts.some((a: Activity) => a.id === currentSelectedActivity);
                            if (!actExists) setSelectedActivity(acts[0].id);
                        } else {
                            setSelectedActivity('');
                        }
                    } else {
                        setSelectedObjective(0);
                        setSelectedActivity('');
                    }

                    // Background refresh implicitly handled by next steps if we wanted "stale-while-revalidate",
                    // but for now we follow the existing logic which seems to prioritize cache OR fetch.
                    // To be safer, we can return here or continue to fetch in background.
                    // For this refactor, let's respect the "load only if needed" pattern unless generic.
                    // IF we want background update:
                    // fetchAndSetData(microId, cacheKey); 
                    // return; 
                }
            }

            // Fetch
            const [actionsData, teamsData, objectivesData, activitiesData] = await Promise.all([
                actionsService.loadActions(microId),
                loadTeams(microId),
                loadObjectives(microId),
                loadActivities(microId),
            ]);

            const validActions = filterValidActionsByActivity(actionsData, activitiesData);

            // Save Cache
            setCache(CACHE_KEYS.ACTIONS, validActions, cacheMicroId);
            setCache(CACHE_KEYS.TEAMS, teamsData, cacheMicroId);
            setCache(CACHE_KEYS.OBJECTIVES, objectivesData, cacheMicroId);
            setCache(CACHE_KEYS.ACTIVITIES, activitiesData, cacheMicroId);

            // Update State
            setActions(validActions);
            setTeamsByMicro(teamsData);
            setObjectives(objectivesData);
            setActivities(activitiesData);

            // Fix Selection Logic
            if (objectivesData.length > 0) {
                // Keep current if valid, else first
                const nextObjId = objectivesData.some((o: Objective) => o.id === currentSelectedObjective)
                    ? currentSelectedObjective
                    : objectivesData[0].id;

                // We only change if it's different (react handles this check too but good for logic)
                if (nextObjId !== currentSelectedObjective) setSelectedObjective(nextObjId);

                const acts = activitiesData[nextObjId] || [];
                if (acts.length > 0) {
                    const actExists = acts.some((a: Activity) => a.id === currentSelectedActivity);
                    if (!actExists) setSelectedActivity(acts[0].id);
                } else {
                    setSelectedActivity('');
                }
            } else {
                setSelectedObjective(0);
                setSelectedActivity('');
            }

        } catch (error: any) {
            if (isAbortLikeError(error)) {
                return;
            }

            logError('useAppData', 'Error loading data', error);
            if (!hydratedFromCache) {
                setDataError(error.message || 'Erro ao carregar dados');
                showToast('Erro ao atualizar dados. Verifique a conexÃ£o.', 'error');
            }
        } finally {
            if (!hydratedFromCache) {
                setIsDataLoading(false);
            }
        }
    }, [user, isDemo, showToast]);

    // Initial Load
    useEffect(() => {
        loadData();
    }, [loadData]);


    // Actions CRUD Helpers (Wrappers needing access to state for optimistic updates)
    const refreshActions = async () => {
        // Simplistic refresh for now - ideally we specific optimized updates
        const microId = isAdminLike(user?.role) ? undefined : user?.microregiaoId;
        if (!microId && !user && !isDemo) return;

        const newActions = await actionsService.loadActions(microId);
        // We need activities to filter orphans, using current state
        const valid = filterValidActionsByActivity(newActions, activities);
        setActions(valid);
        setCache(CACHE_KEYS.ACTIONS, valid, microId);
    };

    return {
        // Data
        actions,
        setActions, // Expose setter for optimistic updates
        objectives,
        setObjectives,
        activities,
        setActivities,
        teamsByMicro,
        setTeamsByMicro,
        currentTeam,

        // Status
        isDataLoading,
        dataError,
        loadData,
        refreshActions,

        // Selection
        selectedObjective,
        setSelectedObjective,
        selectedActivity,
        setSelectedActivity,
    };
}
