import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User, AuthContextType, Microrregiao } from '../types/auth.types';

// Tipo estendido para incluir refreshUser e Demo Mode
interface ExtendedAuthContextType extends AuthContextType {
  refreshUser: () => Promise<void>;
  // Demo Mode
  isDemoMode: boolean;
  loginAsDemo: () => void;
}
import { getMicroregiaoById } from '../data/microregioes';
import { supabase } from '../lib/supabase';
import * as authService from '../services/authService';
import { loggingService } from '../services/loggingService';
import { DEMO_USER } from '../data/mockData';

const AuthContext = createContext<AuthContextType | null>(null);

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

export function AuthProvider({ children }: { children: ReactNode }) {
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
   * Carrega perfil do usuário do Supabase SEM cache para evitar conflitos
   */
  const loadUserProfile = useCallback(async (userId: string, useCache = false): Promise<User | null> => {
    console.log('[AuthContext] 🔍 loadUserProfile:', userId, 'UseCache:', useCache);

    // ✅ REMOVIDO: Verificação de cache para evitar conflitos
    // Cache será usado apenas em casos muito específicos

    try {
      // ✅ Timeout de segurança para evitar travamento infinito (único timeout)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao carregar perfil (10s)')), 10000);
      });

      const queryPromise = supabase
        .from('profiles')
        .select('id, nome, email, role, microregiao_id, ativo, lgpd_consentimento, lgpd_consentimento_data, avatar_id, created_by, created_at, first_access')
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
        firstAccess: data.first_access ?? true,
        createdAt: data.created_at,
      };

      // ✅ REMOVIDO: Salvamento no cache para evitar conflitos

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
  // EFFECT 1: Inicialização Única via getSession (SIMPLIFICADO)
  // =====================================
  useEffect(() => {
    // ✅ Reset refs para HMR/dev
    hasResolvedSessionRef.current = false;
    initializedRef.current = false;

    let mounted = true;

    // ✅ REMOVIDO: Timeout conflitante de 8s que causava o problema
    // Agora só existe o timeout de 10s na função loadUserProfile

    // Verifica sessão atual
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
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
        if (mounted) setIsLoading(false);
        initializedRef.current = true;
        return;
      }

      if (session?.user) {
        console.log('[AuthContext] 🔓 Sessão encontrada para:', session.user.email);
        // ✅ REMOVIDO: Chamada loadUserProfile aqui para evitar duplicação
        // O listener SIGNED_IN vai cuidar disso
        if (mounted) setIsLoading(false);
      } else {
        console.log('[AuthContext] 🚪 Nenhuma sessão ativa');
        if (mounted) setIsLoading(false);
      }
      initializedRef.current = true;
    }).catch((_error) => {
      if (!mounted) {
        initializedRef.current = true;
        return;
      }
      console.error('[AuthContext] 💥 Erro inesperado ao obter sessão');
      if (mounted) setIsLoading(false);
      initializedRef.current = true;
    });

    return () => {
      mounted = false;
    };
  }, []); // Dependências mínimas

  // =====================================
  // EFFECT 2: Listener de Auth Sempre Ativo (UNIFICADO)
  // =====================================
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] 📡 Auth event:', event);

      // ✅ Demo mode check
      if (isDemoModeRef.current) {
        console.log('[AuthContext] 🎭 Demo mode ativo - ignorando evento');
        return;
      }

      // ✅ Ignora INITIAL_SESSION (tratado pelo effect 1)
      if (!initializedRef.current && event === 'INITIAL_SESSION') {
        console.log('[AuthContext] ⏳ Ignorando INITIAL_SESSION (init em progresso)');
        return;
      }

      // ✅ Lock para evitar conflito com login manual
      if (loginLockRef.current && event === 'SIGNED_IN') {
        console.log('[AuthContext] 🔒 Login lock ativo - ignorando SIGNED_IN');
        return;
      }

      // ✅ Evita SIGNED_IN duplicados
      if (event === 'SIGNED_IN' && user && session?.user.id === user.id) {
        console.log('[AuthContext] 👤 Usuário já logado - ignorando SIGNED_IN duplicado');
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[AuthContext] 🔐 Evento SIGNED_IN recebido');
        setIsLoading(true);
        try {
          // ✅ ÚNICA chamada loadUserProfile (sem cache)
          const profile = await loadUserProfile(session.user.id, false);

          if (!profile || !profile.ativo) {
            console.log('[AuthContext] ⛔ Perfil inválido - fazendo logout');
            await supabase.auth.signOut();
            clearCorruptedSession();
            setUser(null);
            setViewingMicroregiaoId(null);
            return;
          }

          console.log('[AuthContext] ✅ Usuário autenticado:', profile.nome);
          setUser(profile);
          const microId = profile.microregiaoId === 'all' ? null : profile.microregiaoId;
          setViewingMicroregiaoId(microId);

        } finally {
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] 🚪 Evento SIGNED_OUT recebido');
        setUser(null);
        setViewingMicroregiaoId(null);
        setIsLoading(false);
        profileCache.clear();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile, user]);

  // Login (simplificado)
  const login = useCallback(async (email: string, senha: string) => {
    console.log('[AuthContext] 🔐 Login iniciado para:', email);

    // ✅ Limpar cache
    profileCache.clear();

    // ✅ Ativar lock
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
        console.log('[AuthContext] ✅ Usuário autenticado, aguardando evento SIGNED_IN...');
        // ✅ REMOVIDO: Chamada manual loadUserProfile
        // O listener SIGNED_IN vai cuidar disso automaticamente

        loggingService.logActivity('login', 'auth', data.user.id, { name: email });

        return { success: true };
      }

      return { success: false, error: 'Erro ao fazer login' };
    } catch (error: unknown) {
      console.error('[AuthContext] 💥 Erro inesperado:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login';
      return { success: false, error: errorMessage };
    } finally {
      // ✅ Liberar lock imediatamente
      loginLockRef.current = false;
      setIsLoading(false);
    }
  }, []);

  // Logout (simplificado)
  const logout = useCallback(async () => {
    console.log('[AuthContext] 🚪 Logout iniciado');
    try {
      if (isDemoMode) {
        console.log('[AuthContext] 🎭 Saindo do modo demo');
        profileCache.clear();
        setUser(null);
        setViewingMicroregiaoId(null);
        setIsDemoMode(false);
        return;
      }

      profileCache.clear();
      await supabase.auth.signOut();
      setUser(null);
      setViewingMicroregiaoId(null);
      console.log('[AuthContext] ✅ Logout completo');
    } catch (err) {
      console.error('[AuthContext] ❌ Erro no logout:', err);
      clearCorruptedSession();
      setUser(null);
      setViewingMicroregiaoId(null);
    }
  }, [isDemoMode]);

  // Login como Demo
  const loginAsDemo = useCallback(() => {
    console.log('[AuthContext] 🎭 Entrando em modo demo');
    profileCache.clear();
    setUser(DEMO_USER);
    setIsDemoMode(true);
    setViewingMicroregiaoId(DEMO_USER.microregiaoId === 'all' ? null : DEMO_USER.microregiaoId);
    setIsLoading(false);
  }, []);

  // Aceitar LGPD
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

  // Trocar microrregião
  const setViewingMicrorregiao = useCallback((microregiaoId: string) => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') return;
    setViewingMicroregiaoId(microregiaoId === 'all' ? null : microregiaoId);
  }, [user]);

  // Computed values
  const isAuthenticated = user !== null;
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

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