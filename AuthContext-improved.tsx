import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User, AuthContextType, Microrregiao } from '../types/auth.types';

// Tipo estendido para incluir refreshUser e Demo Mode
interface ExtendedAuthContextType extends AuthContextType {
  refreshUser: () => Promise<void>;
  // Demo Mode
  isDemoMode: boolean;
  loginAsDemo: () => void;
  // Melhorias: Status detalhado e controles adicionais
  authStatus: 'idle' | 'initializing' | 'authenticating' | 'authenticated' | 'error';
  retryLogin: () => Promise<boolean>;
  clearCache: () => void;
  forceLogout: () => Promise<void>;
}
import { getMicroregiaoById } from '../data/microregioes';
import { supabase } from '../lib/supabase';
import * as authService from '../services/authService';
import { loggingService } from '../services/loggingService';
import { DEMO_USER } from '../data/mockData';

const AuthContext = createContext<AuthContextType | null>(null);

// ✅ CACHE: Melhorado com LRU e limpeza automática
const profileCache = new Map<string, { profile: User; timestamp: number; accessCount: number }>();
const CACHE_TTL = 300000; // 5 minutos (reduzido)
const MAX_CACHE_SIZE = 10; // Limitar cache para evitar memory leaks

// ✅ MÉTRICAS: Tracking de performance
const metrics = {
  loginAttempts: 0,
  loginSuccesses: 0,
  loginFailures: 0,
  profileLoads: 0,
  cacheHits: 0,
  cacheMisses: 0,
  timeouts: 0,
  lastActivity: Date.now(),
};

// ✅ FUNÇÃO: Limpeza inteligente de cache (LRU)
const cleanupCache = () => {
  const now = Date.now();

  // Remover itens expirados
  for (const [key, value] of profileCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      profileCache.delete(key);
    }
  }

  // Se ainda estiver muito grande, remover menos acessados (LRU)
  if (profileCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(profileCache.entries());
    entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE + 1);
    toRemove.forEach(([key]) => profileCache.delete(key));
  }
};

// ✅ FUNÇÃO: Limpar sessão corrompida (melhorada)
const clearCorruptedSession = () => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('[AuthContext] 🧹 Sessão corrompida limpa do localStorage');
    return true;
  } catch (error) {
    console.error('[AuthContext] ❌ Erro ao limpar sessão:', error);
    return false;
  }
};

// ✅ FUNÇÃO: Validação de saúde do sistema
const validateSystemHealth = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('[AuthContext] ❌ Sistema de BD indisponível:', error.message);
      return false;
    }

    console.log('[AuthContext] ✅ Sistema operacional - BD acessível');
    return true;
  } catch (error) {
    console.error('[AuthContext] ❌ Erro crítico de saúde:', error);
    return false;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingMicroregiaoId, setViewingMicroregiaoId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'initializing' | 'authenticating' | 'authenticated' | 'error'>('idle');

  // ✅ REFs: Melhorados com mais controles
  const loginLockRef = useRef(false);
  const initializedRef = useRef(false);
  const hasResolvedSessionRef = useRef(false);
  const isDemoModeRef = useRef(false);
  const lastLoginAttemptRef = useRef<number>(0);
  const consecutiveFailuresRef = useRef<number>(0);

  // ✅ REF: Controle de concorrência para loadUserProfile
  const activeProfileLoadsRef = useRef<Set<string>>(new Set());

  // ✅ REF: Estado de saúde
  const systemHealthRef = useRef<boolean>(true);

  useEffect(() => {
    isDemoModeRef.current = isDemoMode;
  }, [isDemoMode]);

  /**
   * MELHORADO: Carrega perfil com controles avançados
   */
  const loadUserProfile = useCallback(async (
    userId: string,
    useCache = false,
    options: { skipHealthCheck?: boolean } = {}
  ): Promise<User | null> => {
    console.log('[AuthContext] 🔍 loadUserProfile:', userId, 'UseCache:', useCache);
    metrics.profileLoads++;

    // ✅ CONTROLE DE CONCORRÊNCIA: Evitar múltiplas chamadas simultâneas
    if (activeProfileLoadsRef.current.has(userId)) {
      console.log('[AuthContext] ⏳ Já carregando perfil para:', userId, '- aguardando...');
      return null; // Ou poderia retornar uma Promise pendente
    }

    activeProfileLoadsRef.current.add(userId);

    try {
      // ✅ VALIDAÇÃO DE SAÚDE: Verificar se sistema está operacional
      if (!options.skipHealthCheck && !systemHealthRef.current) {
        console.warn('[AuthContext] ⚠️ Sistema indisponível - pulando loadUserProfile');
        return null;
      }

      // ✅ CACHE INTELIGENTE: Com LRU e validação
      if (useCache) {
        const cached = profileCache.get(userId);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          cached.accessCount++;
          metrics.cacheHits++;
          console.log('[AuthContext] 📦 Cache HIT - Usuário:', cached.profile.nome);
          return cached.profile;
        }
        metrics.cacheMisses++;
      }

      // ✅ TIMEOUT ÚNICO: Apenas aqui, sem conflitos
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          metrics.timeouts++;
          reject(new Error(`Timeout ao carregar perfil (10s) - Usuário: ${userId}`));
        }, 10000);

        // Cleanup do timeout se a promise resolver primeiro
        return () => clearTimeout(timeoutId);
      });

      const queryPromise = supabase
        .from('profiles')
        .select('id, nome, email, role, microregiao_id, ativo, lgpd_consentimento, lgpd_consentimento_data, avatar_id, created_by, created_at, first_access')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error('[AuthContext] ❌ Erro ao carregar perfil:', error.message);

        // ✅ DIAGNÓSTICO: Identificar tipo de erro
        if (error.message?.includes('JWT')) {
          console.error('[AuthContext] 🔐 Erro de autenticação JWT');
          systemHealthRef.current = false;
        } else if (error.message?.includes('RLS')) {
          console.error('[AuthContext] 🛡️ Erro de política RLS');
        } else if (error.message?.includes('timeout')) {
          console.error('[AuthContext] ⏰ Timeout de consulta');
        }

        return null;
      }

      if (!data) {
        console.warn('[AuthContext] ⚠️ Perfil não encontrado no banco:', userId);
        return null;
      }

      if (!data.ativo) {
        console.warn('[AuthContext] ⛔ Usuário inativo:', data.nome);
        return null;
      }

      // ✅ VALIDAÇÃO: Dados obrigatórios
      if (!data.id || !data.email || !data.role) {
        console.error('[AuthContext] ❌ Dados do perfil incompletos:', data);
        return null;
      }

      // ✅ Mapeamento melhorado com validações
      const profile: User = {
        id: data.id,
        nome: data.nome || 'Usuário',
        email: data.email,
        role: data.role,
        microregiaoId: data.microregiao_id || 'all',
        ativo: data.ativo,
        lgpdConsentimento: data.lgpd_consentimento ?? false,
        lgpdConsentimentoData: data.lgpd_consentimento_data || undefined,
        avatarId: data.avatar_id || 'zg10',
        createdBy: data.created_by || undefined,
        firstAccess: data.first_access ?? true,
        createdAt: data.created_at,
      };

      // ✅ CACHE: Salvar apenas se solicitado e válido
      if (useCache && profile.ativo) {
        cleanupCache(); // Manter cache limpo
        profileCache.set(userId, {
          profile,
          timestamp: Date.now(),
          accessCount: 1
        });
      }

      console.log('[AuthContext] ✅ Perfil carregado:', profile.nome, `(${profile.role})`);
      metrics.lastActivity = Date.now();
      return profile;

    } catch (err) {
      const error = err as Error;
      console.error('[AuthContext] 💥 Erro crítico ao carregar perfil:', error.message);

      // ✅ RECUPERAÇÃO: Tentar revalidar saúde do sistema
      if (error.message?.includes('JWT') || error.message?.includes('auth')) {
        systemHealthRef.current = false;
        // Tentar limpar sessão corrompida
        clearCorruptedSession();
      }

      return null;
    } finally {
      // ✅ CLEANUP: Sempre remover da lista de ativos
      activeProfileLoadsRef.current.delete(userId);
    }
  }, []);

  // ✅ MELHORADO: Refresh do usuário com validação
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!user) {
      console.warn('[AuthContext] ⚠️ refreshUser: Nenhum usuário logado');
      return;
    }

    if (!systemHealthRef.current) {
      console.warn('[AuthContext] ⚠️ refreshUser: Sistema indisponível');
      return;
    }

    console.log('[AuthContext] 🔄 Refreshing user:', user.email);
    profileCache.delete(user.id);
    const profile = await loadUserProfile(user.id, false);

    if (profile) {
      setUser(profile);
      const microId = profile.microregiaoId === 'all' ? null : profile.microregiaoId;
      setViewingMicroregiaoId(microId);
      console.log('[AuthContext] ✅ User refreshed:', profile.nome);
    } else {
      console.warn('[AuthContext] ⚠️ Failed to refresh user - perfil não encontrado');
    }
  }, [user, loadUserProfile]);

  // =====================================
  // EFFECT 1: Inicialização Inteligente
  // =====================================
  useEffect(() => {
    const initializeAuth = async () => {
      setAuthStatus('initializing');
      console.log('[AuthContext] 🚀 Inicializando autenticação...');

      // ✅ Reset completo
      hasResolvedSessionRef.current = false;
      initializedRef.current = false;
      consecutiveFailuresRef.current = 0;

      let mounted = true;

      try {
        // ✅ VERIFICAÇÃO DE SAÚDE: Antes de qualquer operação
        const isHealthy = await validateSystemHealth();
        systemHealthRef.current = isHealthy;

        if (!isHealthy) {
          console.error('[AuthContext] ❌ Sistema indisponível na inicialização');
          if (mounted) {
            setAuthStatus('error');
            setIsLoading(false);
          }
          initializedRef.current = true;
          return;
        }

        // ✅ LIMPEZA: Cache antigo
        cleanupCache();

        // Verifica sessão atual com timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout na inicialização (5s)')), 5000);
        });

        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);

        if (!mounted || hasResolvedSessionRef.current) {
          initializedRef.current = true;
          return;
        }

        hasResolvedSessionRef.current = true;

        if (error) {
          console.error('[AuthContext] ❌ Erro na inicialização:', error.message);

          if (error.message?.includes('invalid') || error.message?.includes('expired')) {
            clearCorruptedSession();
          }

          if (mounted) {
            setAuthStatus('error');
            setIsLoading(false);
          }
          initializedRef.current = true;
          return;
        }

        if (session?.user) {
          console.log('[AuthContext] 🔓 Sessão válida encontrada:', session.user.email);
          // ✅ NÃO carrega perfil aqui - deixa para o listener
          if (mounted) {
            setAuthStatus('authenticating');
            setIsLoading(false);
          }
        } else {
          console.log('[AuthContext] 🚪 Nenhuma sessão ativa');
          if (mounted) {
            setAuthStatus('idle');
            setIsLoading(false);
          }
        }

        initializedRef.current = true;
        console.log('[AuthContext] ✅ Inicialização completa');

      } catch (error) {
        console.error('[AuthContext] 💥 Erro crítico na inicialização:', error);
        if (mounted) {
          setAuthStatus('error');
          setIsLoading(false);
        }
        initializedRef.current = true;
      }
    };

    initializeAuth();

    // ✅ CLEANUP: Intervalo para limpeza periódica de cache
    const cleanupInterval = setInterval(() => {
      cleanupCache();
      // Verificar saúde do sistema periodicamente
      validateSystemHealth().then(healthy => {
        systemHealthRef.current = healthy;
      });
    }, 60000); // A cada minuto

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  // =====================================
  // EFFECT 2: Listener de Auth Ultra-Robusto
  // =====================================
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] 📡 Auth event:', event, session?.user?.email || 'N/A');

      // ✅ BLOQUEIOS INTELIGENTES
      if (isDemoModeRef.current) {
        console.log('[AuthContext] 🎭 Demo mode ativo - ignorando evento');
        return;
      }

      if (!initializedRef.current && event === 'INITIAL_SESSION') {
        console.log('[AuthContext] ⏳ Ignorando INITIAL_SESSION (ainda inicializando)');
        return;
      }

      if (loginLockRef.current && event === 'SIGNED_IN') {
        console.log('[AuthContext] 🔒 Login em andamento - ignorando SIGNED_IN');
        return;
      }

      if (event === 'SIGNED_IN' && user && session?.user.id === user.id) {
        console.log('[AuthContext] 👤 Já autenticado - ignorando SIGNED_IN duplicado');
        return;
      }

      // ✅ PROCESSAMENTO POR EVENTO
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[AuthContext] 🔐 Processando SIGNED_IN');
        setAuthStatus('authenticating');
        setIsLoading(true);

        try {
          // ✅ Única chamada loadUserProfile com validação de saúde
          const profile = await loadUserProfile(session.user.id, false, {
            skipHealthCheck: false
          });

          if (!profile || !profile.ativo) {
            console.log('[AuthContext] ⛔ Perfil inválido - logout forçado');
            await supabase.auth.signOut();
            clearCorruptedSession();
            setUser(null);
            setViewingMicroregiaoId(null);
            setAuthStatus('idle');
            return;
          }

          console.log('[AuthContext] ✅ Autenticação completa:', profile.nome);
          setUser(profile);
          const microId = profile.microregiaoId === 'all' ? null : profile.microregiaoId;
          setViewingMicroregiaoId(microId);
          setAuthStatus('authenticated');

          // ✅ RESET: Contador de falhas
          consecutiveFailuresRef.current = 0;

          // ✅ LOG: Atividade de login
          loggingService.logActivity('login', 'auth', profile.id, {
            name: profile.nome,
            method: 'supabase_auth'
          });

        } catch (error) {
          console.error('[AuthContext] ❌ Erro no processamento SIGNED_IN:', error);
          setAuthStatus('error');
        } finally {
          setIsLoading(false);
        }

      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] 🚪 Processando SIGNED_OUT');
        setUser(null);
        setViewingMicroregiaoId(null);
        setAuthStatus('idle');
        setIsLoading(false);
        profileCache.clear();
        activeProfileLoadsRef.current.clear();
      }
    });

    return () => {
      console.log('[AuthContext] 🧹 Cleanup: Unsubscribing auth listener');
      subscription.unsubscribe();
    };
  }, [loadUserProfile, user]);

  // =====================================
  // LOGIN AVANÇADO
  // =====================================
  const login = useCallback(async (email: string, senha: string) => {
    console.log('[AuthContext] 🔐 Tentativa de login:', email);
    metrics.loginAttempts++;

    // ✅ VALIDAÇÕES
    if (!email || !senha) {
      return { success: false, error: 'Email e senha são obrigatórios' };
    }

    // ✅ RATE LIMITING: Evitar spam de tentativas
    const now = Date.now();
    const timeSinceLastAttempt = now - lastLoginAttemptRef.current;
    if (timeSinceLastAttempt < 1000) { // 1 segundo mínimo
      return { success: false, error: 'Aguarde um momento antes de tentar novamente' };
    }
    lastLoginAttemptRef.current = now;

    // ✅ BLOQUEIO DE CIRCUIT: Muitas falhas consecutivas
    if (consecutiveFailuresRef.current >= 5) {
      return { success: false, error: 'Muitas tentativas falharam. Tente novamente em alguns minutos.' };
    }

    // ✅ VERIFICAÇÃO DE SAÚDE
    if (!systemHealthRef.current) {
      return { success: false, error: 'Sistema temporariamente indisponível. Tente novamente.' };
    }

    // ✅ CONTROLE DE CONCORRÊNCIA
    if (loginLockRef.current) {
      return { success: false, error: 'Login já em andamento' };
    }

    loginLockRef.current = true;
    setAuthStatus('authenticating');
    setIsLoading(true);

    try {
      console.log('[AuthContext] 📡 Enviando credenciais para Supabase...');

      // ✅ TIMEOUT PARA LOGIN
      const loginPromise = supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout no login (15s)')), 15000);
      });

      const { data, error } = await Promise.race([loginPromise, timeoutPromise]);

      console.log('[AuthContext] 📬 Resposta do login:', {
        success: !error,
        user: data?.user?.email || 'N/A',
        error: error?.message || 'N/A'
      });

      if (error) {
        metrics.loginFailures++;
        consecutiveFailuresRef.current++;

        console.error('[AuthContext] ❌ Falha no login:', error.message);

        // ✅ MAPEAMENTO DE ERROS MELHORADO
        let errorMessage = 'Erro ao fazer login';
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos';
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.';
        } else if (error.message?.includes('Too many requests')) {
          errorMessage = 'Muitas tentativas. Aguarde alguns minutos.';
        } else if (error.message?.includes('Network')) {
          errorMessage = 'Erro de conexão. Verifique sua internet.';
        }

        return { success: false, error: errorMessage };
      }

      if (!data.user) {
        metrics.loginFailures++;
        consecutiveFailuresRef.current++;
        return { success: false, error: 'Erro inesperado: usuário não retornado' };
      }

      // ✅ SUCESSO
      metrics.loginSuccesses++;
      console.log('[AuthContext] ✅ Login aceito, aguardando confirmação do listener...');

      // ✅ NÃO carrega perfil aqui - o listener fará isso
      return { success: true };

    } catch (error: any) {
      metrics.loginFailures++;
      consecutiveFailuresRef.current++;

      console.error('[AuthContext] 💥 Erro crítico no login:', error);

      const errorMessage = error.message?.includes('Timeout')
        ? 'Login demorou demais. Verifique sua conexão.'
        : 'Erro inesperado. Tente novamente.';

      return { success: false, error: errorMessage };

    } finally {
      loginLockRef.current = false;
      setIsLoading(false);
    }
  }, []);

  // ✅ MELHORADO: Logout com cleanup completo
  const logout = useCallback(async () => {
    console.log('[AuthContext] 🚪 Iniciando logout...');

    try {
      if (isDemoMode) {
        console.log('[AuthContext] 🎭 Saindo do modo demo');
        profileCache.clear();
        activeProfileLoadsRef.current.clear();
        setUser(null);
        setViewingMicroregiaoId(null);
        setIsDemoMode(false);
        setAuthStatus('idle');
        return;
      }

      // ✅ CLEANUP COMPLETO
      profileCache.clear();
      activeProfileLoadsRef.current.clear();
      consecutiveFailuresRef.current = 0;

      await supabase.auth.signOut();
      clearCorruptedSession();

      setUser(null);
      setViewingMicroregiaoId(null);
      setAuthStatus('idle');

      console.log('[AuthContext] ✅ Logout completo e limpo');
    } catch (err) {
      console.error('[AuthContext] ❌ Erro no logout:', err);
      // Mesmo com erro, forçar limpeza local
      clearCorruptedSession();
      setUser(null);
      setViewingMicroregiaoId(null);
      setAuthStatus('idle');
    }
  }, [isDemoMode]);

  // ✅ NOVO: Retry de login automático
  const retryLogin = useCallback(async (): Promise<boolean> => {
    if (!user?.email) return false;

    console.log('[AuthContext] 🔄 Tentando reconectar...');

    try {
      // Tentar obter sessão atual
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[AuthContext] ❌ Erro ao obter sessão:', error);
        return false;
      }

      if (session?.user) {
        // Sessão válida - recarregar perfil
        const profile = await loadUserProfile(session.user.id, false);
        if (profile) {
          setUser(profile);
          setAuthStatus('authenticated');
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('[AuthContext] ❌ Erro no retry:', error);
      return false;
    }
  }, [user, loadUserProfile]);

  // ✅ NOVO: Limpeza manual de cache
  const clearCache = useCallback(() => {
    console.log('[AuthContext] 🧹 Limpando cache manualmente...');
    profileCache.clear();
    activeProfileLoadsRef.current.clear();
    cleanupCache();
  }, []);

  // ✅ NOVO: Logout forçado (emergência)
  const forceLogout = useCallback(async () => {
    console.log('[AuthContext] 🚨 Logout forçado (emergência)...');

    try {
      // Limpeza máxima
      profileCache.clear();
      activeProfileLoadsRef.current.clear();
      clearCorruptedSession();
      consecutiveFailuresRef.current = 0;

      // Reset de estado
      setUser(null);
      setViewingMicroregiaoId(null);
      setIsDemoMode(false);
      setAuthStatus('idle');
      setIsLoading(false);

      // Logout do Supabase
      await supabase.auth.signOut();

      console.log('[AuthContext] ✅ Logout forçado concluído');
    } catch (error) {
      console.error('[AuthContext] ❌ Erro no logout forçado:', error);
    }
  }, []);

  // Login como Demo (mantido)
  const loginAsDemo = useCallback(() => {
    console.log('[AuthContext] 🎭 Entrando em modo demo');
    profileCache.clear();
    setUser(DEMO_USER);
    setIsDemoMode(true);
    setViewingMicroregiaoId(DEMO_USER.microregiaoId === 'all' ? null : DEMO_USER.microregiaoId);
    setAuthStatus('authenticated');
    setIsLoading(false);
  }, []);

  // Aceitar LGPD (mantido)
  const acceptLgpd = useCallback(async () => {
    if (!user) return;

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

  // Trocar microrregião (mantido)
  const setViewingMicrorregiao = useCallback((microregiaoId: string) => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') return;
    setViewingMicroregiaoId(microregiaoId === 'all' ? null : microregiaoId);
  }, [user]);

  // Computed values (melhoradas)
  const isAuthenticated = user !== null && authStatus === 'authenticated';
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  const currentMicrorregiao: Microrregiao | null = viewingMicroregiaoId
    ? getMicroregiaoById(viewingMicroregiaoId) || null
    : user?.microregiaoId && user.microregiaoId !== 'all'
      ? getMicroregiaoById(user.microregiaoId) || null
      : null;

  // ✅ NOVO: Métricas expostas (para debug)
  const debugMetrics = {
    cacheSize: profileCache.size,
    activeLoads: activeProfileLoadsRef.current.size,
    consecutiveFailures: consecutiveFailuresRef.current,
    systemHealth: systemHealthRef.current,
    authStatus,
    metrics: { ...metrics }
  };

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
    authStatus,
    retryLogin,
    clearCache,
    forceLogout,
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

// ✅ NOVO: Hook para métricas de debug
export function useAuthDebug() {
  const context = useContext(AuthContext);
  if (!context) return null;

  return {
    cacheSize: profileCache.size,
    activeLoads: activeProfileLoadsRef.current.size,
    consecutiveFailures: consecutiveFailuresRef.current,
    systemHealth: systemHealthRef.current,
    authStatus: (context as ExtendedAuthContextType).authStatus,
    metrics: { ...metrics }
  };
}

export { AuthContext };