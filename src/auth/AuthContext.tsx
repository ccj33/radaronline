import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User, AuthContextType, Microrregiao } from '../types/auth.types';
import { getMicroregiaoById } from '../data/microregioes';
import { supabase } from '../lib/supabase';
import { isAdminLike } from '../lib/authHelpers';
import * as authService from '../services/authService';
import { loggingService } from '../services/loggingService';
import { DEMO_USER } from '../data/mockData';

export interface ExtendedAuthContextType extends AuthContextType {
  refreshUser: () => Promise<void>;
  isDemoMode: boolean;
  loginAsDemo: () => void;

  // NOVO: sinaliza que existe sessão, mesmo se perfil ainda não carregou
  hasSession: boolean;
  profileLoadError: string | null;
}

const AuthContext = createContext<ExtendedAuthContextType | null>(null);

// Cache em memória
const profileCache = new Map<string, User>();

function clearSupabaseAuthStorage() {
  try {
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      // Padrão comum do Supabase v2: sb-<project>-auth-token
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) localStorage.removeItem(k);
      // Compat adicional
      if (k.includes('supabase') && k.includes('auth')) localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [viewingMicroregiaoId, setViewingMicroregiaoId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // NOVO
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);

  // Refs para evitar re-subscrição e closures velhas
  const userIdRef = useRef<string | null>(null);
  const isDemoRef = useRef(false);
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user?.id]);
  useEffect(() => { isDemoRef.current = isDemoMode; }, [isDemoMode]);

  // Lock real: dedupe por userId
  const inFlightProfileRef = useRef<Map<string, Promise<User | null>>>(new Map());

  const loadUserProfile = useCallback(async (userId: string): Promise<User | null> => {
    if (profileCache.has(userId)) return profileCache.get(userId)!;

    const existing = inFlightProfileRef.current.get(userId);
    if (existing) return existing;

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          // Importante: guardar erro para UI/Router não entrar em loop
          console.error('[AuthContext] ❌ Erro ao buscar perfil:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          setProfileLoadError(error.message || 'Falha ao carregar perfil');
          return null;
        }

        if (!data) {
          setProfileLoadError('Perfil não encontrado');
          return null;
        }

        if (!data.ativo) {
          setProfileLoadError('Usuário inativo');
          return null;
        }

        const profile: User = {
          id: data.id,
          nome: data.nome,
          email: data.email,
          role: data.role,
          microregiaoId: data.microregiao_id || 'all',
          ativo: data.ativo,
          lgpdConsentimento: data.lgpd_consentimento,
          lgpdConsentimentoData: data.lgpd_consentimento_data || undefined,
          avatarId: data.avatar_id || 'zg10',
          createdBy: data.created_by || undefined,
          municipio: data.municipio || undefined,
          firstAccess: data.first_access ?? true,
          createdAt: data.created_at,
        };

        setProfileLoadError(null);
        profileCache.set(userId, profile);
        return profile;
      } catch (err: any) {
        const errorMsg = err?.message || 'Erro crítico ao carregar perfil';
        console.error('[AuthContext] 💥 Exception in loadUserProfile:', err);
        setProfileLoadError(errorMsg);
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
      setIsLoading(true);
      setProfileLoadError(null);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const sid = session?.user?.id ?? null;
        setSessionUserId(sid);

        if (sid) {
          console.log('[AuthContext] Init: Session found for user:', sid);
          const profile = await loadUserProfile(sid);

          if (mounted && profile) {
            setUser(profile);
            setViewingMicroregiaoId(profile.microregiaoId === 'all' ? null : profile.microregiaoId);
          }
        } else {
          if (mounted) {
            setUser(null);
            setViewingMicroregiaoId(null);
            profileCache.clear();
          }
        }
      } catch (error: any) {
        const msg = String(error?.message || error || '');
        // Se token está inválido, aí sim "zera" somente auth do Supabase
        if (msg.toLowerCase().includes('invalid') && msg.toLowerCase().includes('token')) {
          clearSupabaseAuthStorage();
          await supabase.auth.signOut();
          setSessionUserId(null);
          setUser(null);
          setViewingMicroregiaoId(null);
          profileCache.clear();
        } else {
          setProfileLoadError(msg || 'Erro na inicialização de autenticação');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isDemoRef.current) return;

      const sid = session?.user?.id ?? null;
      setSessionUserId(sid);

      // Logout explícito
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setViewingMicroregiaoId(null);
        setIsDemoMode(false);
        setProfileLoadError(null);
        profileCache.clear();
        setIsLoading(false);
        return;
      }

      if (!sid) {
        // Garante que loading nao fique preso caso algum evento venha sem sessão
        setIsLoading(false);
        return;
      }

      // Se mudou de usuário, limpa estado anterior antes de carregar o novo para evitar inconsistência
      if (userIdRef.current && userIdRef.current !== sid) {
        console.log('[AuthContext] 🔄 Troca de usuário detectada. Limpando estado anterior...');
        setUser(null);
        setViewingMicroregiaoId(null);
        profileCache.clear();
      }

      // Evita recarga redundante se for o mesmo usuário e não for refresh de token
      if (userIdRef.current === sid && event !== 'TOKEN_REFRESHED') return;

      setIsLoading(true);

      if (event === 'TOKEN_REFRESHED') {
        profileCache.delete(sid);
      }

      const profile = await loadUserProfile(sid);

      if (profile) {
        setUser(profile);
        setViewingMicroregiaoId(profile.microregiaoId === 'all' ? null : profile.microregiaoId);
      } else {
        // Garante consistência: se não carregou perfil (erro RLS/Rede), não mantém usuário anterior
        // Isso evita que o app fique m estado misto (sessão nova + perfil velho ou null)
        setUser(null);
        setViewingMicroregiaoId(null);
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const login = async (email: string, senha: string) => {
    setIsLoading(true);
    setProfileLoadError(null);
    profileCache.clear();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      setIsLoading(false);
      return {
        success: false,
        error: error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message
      };
    }

    const sid = data.user?.id ?? null;
    setSessionUserId(sid);

    if (sid) {
      const profile = await loadUserProfile(sid);
      if (profile) {
        setUser(profile);
        setViewingMicroregiaoId(profile.microregiaoId === 'all' ? null : profile.microregiaoId);
        loggingService.logActivity('login', 'auth', profile.id, { name: profile.nome });
        setIsLoading(false);
        return { success: true };
      }
      setIsLoading(false);
      return { success: false, error: 'Sessão criada, mas falha ao carregar perfil. Verifique RLS/conexão.' };
    }

    setIsLoading(false);
    return { success: false, error: 'Erro ao fazer login.' };
  };

  const logout = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setUser(null);
      setViewingMicroregiaoId(null);
      setSessionUserId(null);
      setProfileLoadError(null);
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[AuthContext] Erro no signOut (ignorando):', error);
    } finally {
      // ✅ FIX P0: Garantir limpeza local mesmo se signOut falhar (rede/token inválido)
      clearSupabaseAuthStorage();
      setUser(null);
      setViewingMicroregiaoId(null);
      setSessionUserId(null);
      setProfileLoadError(null);
      profileCache.clear();
      setIsLoading(false);
    }
  };

  const loginAsDemo = () => {
    profileCache.clear();
    setUser(DEMO_USER);
    setIsDemoMode(true);
    setSessionUserId('demo');
    setViewingMicroregiaoId(DEMO_USER.microregiaoId === 'all' ? null : DEMO_USER.microregiaoId);
    setProfileLoadError(null);
    setIsLoading(false);
  };

  const refreshUser = async () => {
    if (!user) return;
    profileCache.delete(user.id);
    const profile = await loadUserProfile(user.id);
    if (profile) setUser(profile);
  };

  const acceptLgpd = async () => {
    if (!user) return;
    if (isDemoMode) {
      setUser(prev => prev ? { ...prev, lgpdConsentimento: true, lgpdConsentimentoData: new Date().toISOString() } : null);
      return;
    }
    await authService.acceptLgpd(user.id);
    await refreshUser();
  };

  const setViewingMicrorregiao = (id: string) => {
    if (isAdminLike(user?.role)) setViewingMicroregiaoId(id === 'all' ? null : id);
  };

  const currentMicrorregiao: Microrregiao | null = viewingMicroregiaoId
    ? getMicroregiaoById(viewingMicroregiaoId) || null
    : (user?.microregiaoId && user.microregiaoId !== 'all'
      ? getMicroregiaoById(user.microregiaoId) || null
      : null);

  const value: ExtendedAuthContextType = {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return ctx;
}

export function useAuthSafe() {
  return useContext(AuthContext);
}

export { AuthContext };
