import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User, AuthContextType, Microrregiao } from '../types/auth.types';
import { getMicroregiaoById } from '../data/microregioes';
import { supabase } from '../lib/supabase';
import { isAdminLike } from '../lib/authHelpers';
import * as authService from '../services/authService';
import { loggingService } from '../services/loggingService';
import { DEMO_USER } from '../data/mockData';

// =====================================
// TIPOS DO CONTEXTO
// =====================================

/**
 * Contexto estendido com refreshUser e Demo Mode
 */
export interface ExtendedAuthContextType extends AuthContextType {
  refreshUser: () => Promise<void>;
  isDemoMode: boolean;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

// ✅ CACHE: Mantido fora para persistência, mas agora gerenciado com mais rigor
const profileCache = new Map<string, { profile: User; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minuto

// ✅ FUNÇÃO: Limpar sessão corrompida
const clearCorruptedSession = () => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('[AuthContext] 🧹 Sessão corrompida limpa do localStorage');
  } catch {
    // Ignora erro silenciosamente
  }
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingMicroregiaoId, setViewingMicroregiaoId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // ✅ REF: Lock para evitar conflito entre login() manual e onAuthStateChange
  const loginLockRef = useRef(false);

  // ✅ REFs: Para controle de inicialização (substitui state para evitar rerenders e cleanups errados)
  const initializedRef = useRef(false);
  const hasResolvedSessionRef = useRef(false);

  // ✅ REF: Para isDemoMode no listener (evita deps extras no effect)
  const isDemoModeRef = useRef(false);
  useEffect(() => {
    isDemoModeRef.current = isDemoMode;
  }, [isDemoMode]);

  /**
   * Carrega perfil do usuário do Supabase com cache
   */
  const loadUserProfile = useCallback(async (userId: string, useCache = true): Promise<User | null> => {
    console.log('[AuthContext] 🔍 loadUserProfile:', userId, 'UseCache:', useCache);

    // ✅ FASE 1: Verificar cache
    if (useCache) {
      const cached = profileCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('[AuthContext] 📦 Cache HIT');
        return cached.profile;
      }
    }

    try {
      // ✅ Timeout de segurança para evitar travamento infinito
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao carregar perfil (10s)')), 10000);
      });

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/8afd84e8-d153-49a1-9c91-ad59684a8341', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext.tsx:84', message: 'QUERY SUPABASE INICIADA', data: { userId, timestamp: Date.now() }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H2' }) }).catch(() => { });
      // #endregion

      const queryPromise = supabase
        .from('profiles')
        .select('id, nome, email, role, microregiao_id, ativo, lgpd_consentimento, lgpd_consentimento_data, avatar_id, created_by, created_at, first_access, municipio')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error('[AuthContext] ❌ Erro ao carregar perfil:', error.message);
        return null;
      }

      if (!data) {
        console.warn('[AuthContext] ⚠️ Perfil não encontrado no banco.');
        return null;
      }

      if (!data.ativo) {
        console.warn('[AuthContext] ⛔ Usuário inativo.');
        return null;
      }

      // ✅ Mapeamento: null do DB vira 'all' no app
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

      // ✅ Salvar no cache
      if (useCache) {
        profileCache.set(userId, { profile, timestamp: Date.now() });
      }

      console.log('[AuthContext] ✅ Perfil carregado:', profile.nome);
      return profile;
    } catch (err) {
      console.error('[AuthContext] 💥 Erro crítico ao carregar perfil:', err);
      return null;
    }
  }, []);

  // ✅ Refresh do usuário (atualiza sem reload)
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!user) return;
    profileCache.delete(user.id); // Invalida cache específico
    const profile = await loadUserProfile(user.id, false);
    if (profile) {
      setUser(profile);
    }
  }, [user, loadUserProfile]);

  // =====================================
  // EFFECT 1: Inicialização Única via getSession (roda uma vez só)
  // =====================================
  useEffect(() => {
    // ✅ FIX: Limpar cache no início para evitar dados stale
    profileCache.clear();

    // ✅ BUG FIX 3: Reset refs para HMR/dev (evita estado residual)
    hasResolvedSessionRef.current = false;
    initializedRef.current = false;

    let mounted = true;

    const bootstrap = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted || hasResolvedSessionRef.current) {
          initializedRef.current = true;
          return;
        }
        hasResolvedSessionRef.current = true;

        if (error) {
          console.error('[AuthContext] ❌ Erro ao obter sessão:', error.message);
          if (error.message?.includes('invalid') || error.message?.includes('expired')) {
            clearCorruptedSession();
          }
          setIsLoading(false);
          initializedRef.current = true;
          return;
        }

        if (session?.user) {
          console.log('[AuthContext] 🔓 Sessão encontrada para:', session.user.email);

          // ✅ FIX: Carregar perfil no bootstrap (não depender do listener)
          const profile = await loadUserProfile(session.user.id, false);

          if (!mounted) {
            initializedRef.current = true;
            return;
          }

          if (!profile || !profile.ativo) {
            console.log('[AuthContext] ⛔ Perfil inválido no bootstrap - limpando sessão');
            await supabase.auth.signOut();
            clearCorruptedSession();
            setUser(null);
            setViewingMicroregiaoId(null);
          } else {
            setUser(profile);
            setViewingMicroregiaoId(profile.microregiaoId === 'all' ? null : profile.microregiaoId);
          }
        } else {
          console.log('[AuthContext] 🚪 Nenhuma sessão ativa');
        }

        if (mounted) setIsLoading(false);
        initializedRef.current = true;
      } catch (err) {
        console.error('[AuthContext] 💥 Erro inesperado no bootstrap:', err);
        if (mounted) setIsLoading(false);
        initializedRef.current = true;
      }
    };

    bootstrap();

    return () => {
      mounted = false;
      initializedRef.current = true;
    };
  }, [loadUserProfile]);

  // =====================================
  // EFFECT 2: Listener de Auth Sempre Ativo
  // =====================================
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] 📡 Auth event:', event);

      // ✅ BUG FIX 4: Bloquear eventos em demo mode (evita overwrite do estado demo)
      if (isDemoModeRef.current) {
        console.log('[AuthContext] 🎭 Demo mode ativo - ignorando evento');
        return;
      }

      // ✅ Ignora INITIAL_SESSION se ainda não inicializado (tratado pelo effect 1)
      if (!initializedRef.current && event === 'INITIAL_SESSION') {
        console.log('[AuthContext] ⏳ Ignorando INITIAL_SESSION (init em progresso)');
        return;
      }

      // ✅ CORREÇÃO: Se um login() está em andamento, ignorar evento SIGNED_IN
      if (loginLockRef.current && event === 'SIGNED_IN') {
        console.log('[AuthContext] 🔒 Login lock ativo - ignorando SIGNED_IN');
        return;
      }

      // ✅ CORREÇÃO CRÍTICA: Se já temos usuário logado, ignorar SIGNED_IN duplicados
      // Isso evita que eventos atrasados do Supabase destruam a sessão válida
      if (event === 'SIGNED_IN' && user) {
        console.log('[AuthContext] 👤 Usuário já logado - ignorando SIGNED_IN duplicado');
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[AuthContext] 🔐 Evento SIGNED_IN recebido');
        setIsLoading(true);
        try {
          // ✅ MELHORIA 4: Forçar sem cache no listener SIGNED_IN
          const profile = await loadUserProfile(session.user.id, false);

          if (!profile || !profile.ativo) {
            console.log('[AuthContext] ⛔ Perfil inválido no SIGNED_IN - fazendo logout');
            await supabase.auth.signOut();
            clearCorruptedSession();
            return;
          }

          setUser(profile);
          const microId = profile.microregiaoId === 'all' ? null : profile.microregiaoId;
          setViewingMicroregiaoId(microId);
        } finally {
          // ✅ BUG FIX 5: Finally para garantir loading reset
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] 🚪 Evento SIGNED_OUT recebido');
        setUser(null);
        setViewingMicroregiaoId(null);
        setIsLoading(false);
        profileCache.clear();
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('[AuthContext] 🔄 Token refreshed');
        // Refresh silencioso, sem loading visual
        const profile = await loadUserProfile(session.user.id, false);

        if (!profile || !profile.ativo) {
          console.log('[AuthContext] ⛔ Perfil inválido após refresh - fazendo logout');
          await supabase.auth.signOut();
          clearCorruptedSession();
          setUser(null);
          setViewingMicroregiaoId(null);
        } else {
          setUser(profile);
        }
        // NÃO resetar loading em TOKEN_REFRESHED (pode estar no meio de outra operação)
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile]); // Dependências mínimas: sempre ativo

  // Login
  const login = useCallback(async (email: string, senha: string) => {
    console.log('[AuthContext] 🔐 Login iniciado para:', email);

    // ✅ CORREÇÃO: Limpar cache de perfis no início do login para evitar dados stale
    profileCache.clear();
    console.log('[AuthContext] 📤 Cache de perfis limpo antes do login');

    // ✅ CORREÇÃO: Ativa lock para evitar que onAuthStateChange processe SIGNED_IN
    loginLockRef.current = true;
    setIsLoading(true);

    try {
      console.log('[AuthContext] 📡 Chamando supabase.auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      console.log('[AuthContext] 📬 Resposta do Supabase:', { user: data?.user?.email, error: error?.message });

      if (error) {
        console.error('[AuthContext] ❌ Erro de login:', error.message);
        return {
          success: false,
          error: error.message === 'Invalid login credentials'
            ? 'Email ou senha incorretos'
            : error.message
        };
      }

      if (data.user) {
        console.log('[AuthContext] ✅ Usuário autenticado, carregando perfil...');

        // ✅ Forçar sem cache no login
        const profile = await loadUserProfile(data.user.id, false);

        if (!profile) {
          console.log('[AuthContext] ❌ Perfil não encontrado ou inativo, fazendo logout...');
          await supabase.auth.signOut();
          clearCorruptedSession();
          return {
            success: false,
            error: 'Não foi possível carregar seu perfil. Verifique se a conta está ativa.'
          };
        }

        console.log('[AuthContext] 🎉 Login bem-sucedido:', profile.nome);
        setUser(profile);
        const microId = profile.microregiaoId === 'all' ? null : profile.microregiaoId;
        setViewingMicroregiaoId(microId);

        loggingService.logActivity('login', 'auth', profile.id, { name: profile.nome });

        return { success: true };
      }

      console.log('[AuthContext] ⚠️ data.user é null/undefined');
      return { success: false, error: 'Erro ao fazer login' };
    } catch (error: unknown) {
      console.error('[AuthContext] 💥 Erro inesperado:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login';
      return { success: false, error: errorMessage };
    } finally {
      console.log('[AuthContext] 🔓 Finalizando login');
      setIsLoading(false);
      // ✅ CORREÇÃO: Libera lock após conclusão (delay aumentado para 1000ms)
      setTimeout(() => {
        loginLockRef.current = false;
        console.log('[AuthContext] 🔓 Login lock liberado');
      }, 1000);
    }
  }, [loadUserProfile]);

  // Logout
  const logout = useCallback(async () => {
    console.log('[AuthContext] 🚪 Logout iniciado');
    try {
      // Se estava em modo demo, apenas limpa o estado
      if (isDemoMode) {
        console.log('[AuthContext] 🎭 Saindo do modo demo');
        profileCache.clear(); // ✅ MELHORIA 3: Limpar cache no demo também
        setUser(null);
        setViewingMicroregiaoId(null);
        setIsDemoMode(false);
        return;
      }

      // ✅ MELHORIA 6: Limpar cache e sessão no logout
      profileCache.clear();
      await supabase.auth.signOut();
      // Limpar sessão apenas se signOut funcionou (evita limpar em casos válidos)
      setUser(null);
      setViewingMicroregiaoId(null);
      console.log('[AuthContext] ✅ Logout completo');
    } catch (err) {
      console.error('[AuthContext] ❌ Erro no logout:', err);
      // Em caso de erro, forçar limpeza total
      clearCorruptedSession();
      setUser(null);
      setViewingMicroregiaoId(null);
    }
  }, [isDemoMode]);

  // Login como Visitante (Demo Mode)
  const loginAsDemo = useCallback(() => {
    console.log('[AuthContext] 🎭 Entrando em modo demo');
    // ✅ MELHORIA 3: Limpar cache ao entrar no demo
    profileCache.clear();
    setUser(DEMO_USER);
    setIsDemoMode(true);
    // ✅ MELHORIA 3: Tratar microregiaoId corretamente
    setViewingMicroregiaoId(DEMO_USER.microregiaoId === 'all' ? null : DEMO_USER.microregiaoId);
    setIsLoading(false);
  }, []);

  // Aceitar LGPD
  const acceptLgpd = useCallback(async () => {
    if (!user) return;

    // DEMO MODE: Apenas atualiza estado local
    if (isDemoMode) {
      setUser(prev => prev ? {
        ...prev,
        lgpdConsentimento: true,
        lgpdConsentimentoData: new Date().toISOString(),
      } : null);
      return;
    }

    await authService.acceptLgpd(user.id);
    setUser(prev => prev ? {
      ...prev,
      lgpdConsentimento: true,
      lgpdConsentimentoData: new Date().toISOString(),
    } : null);
  }, [user, isDemoMode]);

  // Trocar microrregião visualizada (admin ou superadmin)
  const setViewingMicrorregiao = useCallback((microregiaoId: string) => {
    if (!isAdminLike(user?.role)) return;
    setViewingMicroregiaoId(microregiaoId === 'all' ? null : microregiaoId);
  }, [user]);

  // Computed values
  const isAuthenticated = user !== null;
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = isAdminLike(user?.role);

  // Microrregião atual
  const currentMicrorregiao: Microrregiao | null = viewingMicroregiaoId
    ? getMicroregiaoById(viewingMicroregiaoId) || null
    : user?.microregiaoId && user.microregiaoId !== 'all'
      ? getMicroregiaoById(user.microregiaoId) || null
      : null;

  const value: ExtendedAuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    currentMicrorregiao,
    login,
    logout,
    acceptLgpd,
    setViewingMicrorregiao,
    viewingMicroregiaoId,
    refreshUser,
    isDemoMode,
    loginAsDemo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): ExtendedAuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context as ExtendedAuthContextType;
}

export function useAuthSafe(): ExtendedAuthContextType | null {
  const context = useContext(AuthContext);
  return context as ExtendedAuthContextType | null;
}

export { AuthContext };
