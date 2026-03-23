import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEMO_USER } from '../data/mockData';
import { isAdminLike } from '../lib/authHelpers';
import { withTimeout } from '../lib/asyncUtils';
import { invalidateAllCache } from '../lib/sessionCache';
import { recordLoginAuditEvent } from '../services/actionAuditService';
import * as authService from '../services/authService';
import type { AuthContextType, Microrregiao, User } from '../types/auth.types';
import {
  clearCachedProfile,
  clearProfileMemoryCache,
  clearSupabaseAuthStorage,
  deleteProfileFromMemoryCache,
  getCachedProfile,
  getProfileFromMemoryCache,
  setCachedProfile,
  setProfileInMemoryCache,
} from './authContext.cache';
import { extractProfileFromMetadata, getCurrentMicrorregiao } from './authContext.utils';

type ExtendedAuthContextState = AuthContextType & {
  refreshUser: () => Promise<void>;
  isDemoMode: boolean;
  loginAsDemo: () => void;
  hasSession: boolean;
  profileLoadError: string | null;
};

export function useAuthController(): ExtendedAuthContextState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingMicroregiaoId, setViewingMicroregiaoId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);

  const userIdRef = useRef<string | null>(null);
  const isDemoRef = useRef(false);
  const inFlightProfileRef = useRef<Map<string, Promise<User | null>>>(new Map());

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    isDemoRef.current = isDemoMode;
  }, [isDemoMode]);

  const loadUserProfile = useCallback(async (userId: string): Promise<User | null> => {
    const cached = getProfileFromMemoryCache(userId);
    if (cached) {
      return cached;
    }

    const existing = inFlightProfileRef.current.get(userId);
    if (existing) {
      return existing;
    }

    const promise = (async () => {
      try {
        const { profile, error } = await withTimeout(
          authService.getUserProfileById(userId),
          10000,
          'Timeout ao carregar perfil (10s). Verifique RLS policies ou conexao.'
        );

        if (error) {
          setProfileLoadError(error || 'Falha ao carregar perfil');
          return null;
        }

        if (!profile) {
          setProfileLoadError('Falha ao carregar perfil');
          return null;
        }

        setProfileLoadError(null);
        setProfileInMemoryCache(userId, profile);
        return profile;
      } catch (error: any) {
        setProfileLoadError(error?.message || 'Erro critico ao carregar perfil');
        return null;
      } finally {
        inFlightProfileRef.current.delete(userId);
      }
    })();

    inFlightProfileRef.current.set(userId, promise);
    return promise;
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      setProfileLoadError(null);

      const cachedProfile = getCachedProfile();
      if (cachedProfile) {
        setUser(cachedProfile);
        setSessionUserId(cachedProfile.id);
        setViewingMicroregiaoId(
          cachedProfile.microregiaoId === 'all' ? null : cachedProfile.microregiaoId
        );
        setProfileInMemoryCache(cachedProfile.id, cachedProfile);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      try {
        const {
          data: { session },
          error: sessionError,
        } = await authService.getCurrentSession();

        if (sessionError) {
          throw sessionError;
        }

        const sid = session?.user?.id ?? null;
        setSessionUserId(sid);

        if (sid) {
          if (cachedProfile && cachedProfile.id !== sid) {
            clearCachedProfile();
          }

          if (!cachedProfile && session?.user && mounted) {
            const metaProfile = extractProfileFromMetadata(session.user);
            if (metaProfile) {
              setUser(metaProfile);
              setViewingMicroregiaoId(
                metaProfile.microregiaoId === 'all' ? null : metaProfile.microregiaoId
              );
              setIsLoading(false);
            }
          }

          const profile = await loadUserProfile(sid);

          if (mounted && profile) {
            setUser(profile);
            setViewingMicroregiaoId(profile.microregiaoId === 'all' ? null : profile.microregiaoId);
            setCachedProfile(profile);
          }
        } else if (mounted) {
          setUser(null);
          setViewingMicroregiaoId(null);
          clearCachedProfile();
        }
      } catch (error: any) {
        const message = String(error?.message || error || '');
        if (message.toLowerCase().includes('invalid') && message.toLowerCase().includes('token')) {
          clearSupabaseAuthStorage();
          clearCachedProfile();
          await authService.signOutCurrentSession();
          setSessionUserId(null);
          setUser(null);
        } else {
          setProfileLoadError(message || 'Erro na inicializacao de autenticacao');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = authService.subscribeToAuthStateChanges(async (event, session) => {
      if (isDemoRef.current) {
        return;
      }

      const sid = session?.user?.id ?? null;
      setSessionUserId(sid);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setViewingMicroregiaoId(null);
        setIsDemoMode(false);
        setProfileLoadError(null);
        clearProfileMemoryCache();
        setIsLoading(false);
        return;
      }

      if (!sid) {
        setIsLoading(false);
        return;
      }

      if (userIdRef.current && userIdRef.current !== sid) {
        setUser(null);
        clearProfileMemoryCache();
      }

      if (userIdRef.current === sid && event !== 'TOKEN_REFRESHED') {
        return;
      }

      setIsLoading(true);

      if (event === 'TOKEN_REFRESHED' && session?.user) {
        deleteProfileFromMemoryCache(sid);
        const metaProfile = extractProfileFromMetadata(session.user);
        if (metaProfile) {
          setUser(metaProfile);
          setIsLoading(false);
        }
      }

      const profile = await loadUserProfile(sid);

      if (profile) {
        setUser(profile);
        setViewingMicroregiaoId(profile.microregiaoId === 'all' ? null : profile.microregiaoId);
      } else {
        setUser((previous) => previous ?? null);
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const login = useCallback(async (email: string, senha: string) => {
    setIsLoading(true);
    setProfileLoadError(null);
    clearProfileMemoryCache();

    const { data, error } = await authService.signInWithPassword(email, senha);

    if (error) {
      setIsLoading(false);
      return {
        success: false,
        error: error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message,
      };
    }

    const sid = data.user?.id ?? null;
    setSessionUserId(sid);

    if (sid) {
      const profile = await loadUserProfile(sid);
      if (profile) {
        void recordLoginAuditEvent({
          userId: profile.id,
          userName: profile.nome,
          microregiaoId: profile.microregiaoId,
        });
        setUser(profile);
        setViewingMicroregiaoId(profile.microregiaoId === 'all' ? null : profile.microregiaoId);
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return {
        success: false,
        error: 'Sessao criada, mas falha ao carregar perfil. Verifique RLS/conexao.',
      };
    }

    setIsLoading(false);
    return { success: false, error: 'Erro ao fazer login.' };
  }, [loadUserProfile]);

  const logout = useCallback(async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setUser(null);
      setViewingMicroregiaoId(null);
      setSessionUserId(null);
      setProfileLoadError(null);
      return;
    }

    try {
      await authService.signOutCurrentSession();
    } catch {
      // Ignore sign out network errors.
    } finally {
      clearSupabaseAuthStorage();
      clearCachedProfile();
      invalidateAllCache();
      setUser(null);
      setViewingMicroregiaoId(null);
      setSessionUserId(null);
      setProfileLoadError(null);
      clearProfileMemoryCache();
      setIsLoading(false);
    }
  }, [isDemoMode]);

  const loginAsDemo = useCallback(() => {
    clearProfileMemoryCache();
    setUser(DEMO_USER);
    setIsDemoMode(true);
    setSessionUserId('demo');
    setViewingMicroregiaoId(DEMO_USER.microregiaoId === 'all' ? null : DEMO_USER.microregiaoId);
    setProfileLoadError(null);
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    setProfileLoadError(null);

    try {
      const {
        data: { session },
        error,
      } = await authService.getCurrentSession();

      if (error) {
        throw error;
      }

      const sid = session?.user?.id ?? null;
      setSessionUserId(sid);

      if (!sid) {
        setUser(null);
        setViewingMicroregiaoId(null);
        clearProfileMemoryCache();
        return;
      }

      deleteProfileFromMemoryCache(sid);
      inFlightProfileRef.current.delete(sid);

      const profile = await loadUserProfile(sid);

      if (profile) {
        setUser(profile);
        setViewingMicroregiaoId(profile.microregiaoId === 'all' ? null : profile.microregiaoId);
      } else {
        setUser(null);
        setViewingMicroregiaoId(null);
      }
    } catch (error: any) {
      setProfileLoadError(error?.message || 'Falha ao atualizar perfil');
      setUser(null);
      setViewingMicroregiaoId(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadUserProfile]);

  const acceptLgpd = useCallback(async () => {
    if (!user) {
      return;
    }

    if (isDemoMode) {
      setUser((previous) =>
        previous
          ? {
              ...previous,
              lgpdConsentimento: true,
              lgpdConsentimentoData: new Date().toISOString(),
            }
          : null
      );
      return;
    }

    await authService.acceptLgpd(user.id);
    await refreshUser();
  }, [isDemoMode, refreshUser, user]);

  const setViewingMicrorregiao = useCallback((id: string) => {
    if (isAdminLike(user?.role)) {
      setViewingMicroregiaoId(id === 'all' ? null : id);
    }
  }, [user?.role]);

  const currentMicrorregiao: Microrregiao | null = useMemo(
    () => getCurrentMicrorregiao(viewingMicroregiaoId, user),
    [viewingMicroregiaoId, user]
  );

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: isAdminLike(user?.role),
    isSuperAdmin: user?.role === 'superadmin',
    currentMicrorregiao,
    login,
    logout,
    acceptLgpd,
    setViewingMicrorregiao,
    viewingMicroregiaoId,
    refreshUser,
    isDemoMode,
    loginAsDemo,
    hasSession: !!sessionUserId && sessionUserId !== 'demo',
    profileLoadError,
  };
}
