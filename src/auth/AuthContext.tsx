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

type AuthProviderProps = {
  children: ReactNode;
};

// ✅ CORREÇÃO: Cache de perfis movido para fora do componente (module-level)
// Isso garante que o cache persista entre renders
const profileCache = new Map<string, { profile: User; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minuto

// ✅ CORREÇÃO: Função para limpar sessão corrompida do localStorage
const clearCorruptedSession = () => {
  try {
    // Remove todos os itens do Supabase do localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    // Sessão corrompida limpa do localStorage
  } catch {
    // Erro ao limpar sessão - ignorado silenciosamente
  }
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingMicroregiaoId, setViewingMicroregiaoId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // ✅ CORREÇÃO: Ref para indicar que um login está em andamento
  // Isso evita race condition entre login() e onAuthStateChange
  const loginLockRef = useRef(false);

  /**
   * Carrega perfil do usuário do Supabase com cache
   * Retorna null se usuário não encontrado ou inativo
   * 
   * PADRÃO: Converte null do DB para 'all' no app (consistência)
   */
  const loadUserProfile = useCallback(async (userId: string, useCache = true): Promise<User | null> => {
    console.log('[AuthContext] 🔍 loadUserProfile chamado para userId:', userId);

    // ✅ FASE 1: Verificar cache primeiro
    if (useCache) {
      const cached = profileCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('[AuthContext] 📦 Cache HIT para userId:', userId);
        return cached.profile;
      }
    }

    try {
      console.log('[AuthContext] 📡 Buscando perfil no Supabase...');

      // ✅ CORREÇÃO: Adicionar timeout para evitar travamento indefinido
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao carregar perfil (10s)')), 10000);
      });

      const queryPromise = supabase
        .from('profiles')
        .select('id, nome, email, role, microregiao_id, ativo, lgpd_consentimento, lgpd_consentimento_data, avatar_id, created_by, created_at, first_access')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      console.log('[AuthContext] 📬 Resposta do profiles:', { data: data?.email, error: error?.message });

      if (error) {
        console.error('[AuthContext] ❌ Erro ao carregar perfil:', error);
        return null;
      }

      if (!data) {
        console.log('[AuthContext] ⚠️ Perfil não encontrado');
        return null;
      }

      if (!data.ativo) {
        console.log('[AuthContext] ⚠️ Usuário inativo');
        return null;
      }

      // Converter snake_case para camelCase
      // ✅ PADRÃO: null do DB vira 'all' no app
      const profile: User = {
        id: data.id,
        nome: data.nome,
        email: data.email,
        role: data.role,
        microregiaoId: data.microregiao_id || 'all', // null → 'all'
        ativo: data.ativo,
        lgpdConsentimento: data.lgpd_consentimento,
        lgpdConsentimentoData: data.lgpd_consentimento_data || undefined,
        avatarId: data.avatar_id || 'zg10', // Default avatar
        createdBy: data.created_by || undefined,
        firstAccess: data.first_access ?? true, // Se não existir, assume primeiro acesso
        createdAt: data.created_at,
      };

      console.log('[AuthContext] ✅ Perfil montado:', profile.nome);

      // ✅ FASE 1: Salvar no cache
      if (useCache) {
        profileCache.set(userId, { profile, timestamp: Date.now() });
      }

      return profile;
    } catch (err) {
      console.error('[AuthContext] 💥 Erro inesperado ao carregar perfil:', err);
      return null;
    }
  }, []);

  // ✅ FUNÇÃO: Refresh do usuário (atualiza perfil sem reload da página)
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!user) return;

    // Invalida o cache primeiro
    profileCache.delete(user.id);
    // Cache invalidado, recarregando perfil

    // Recarrega o perfil do banco
    const profile = await loadUserProfile(user.id, false);

    if (profile) {
      setUser(profile);
      // Perfil atualizado com sucesso
    }
  }, [user, loadUserProfile]);

  // ✅ CORREÇÃO: Flag para evitar processamento duplo
  const [isInitialized, setIsInitialized] = useState(false);

  // Inicializa sessão ao montar componente
  useEffect(() => {
    // ✅ CORREÇÃO: Evita re-execução se já inicializou
    if (isInitialized) return;

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let hasResolvedSession = false; // Flag para evitar processamento duplo

    // ✅ CORREÇÃO: Helper para resetar loading e limpar timeout (DRY)
    const resetLoading = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (mounted) setIsLoading(false);
    };

    // ✅ CORREÇÃO: Timeout de segurança INTELIGENTE - não limpa sessão válida
    timeoutId = setTimeout(() => {
      if (hasResolvedSession) return; // Já resolveu, não fazer nada

      // Timeout ao carregar sessão - verificando cache

      // ✅ CORREÇÃO: Tentar usar cache antigo antes de desistir
      const cachedProfiles = Array.from(profileCache.values());
      if (cachedProfiles.length > 0) {
        const mostRecent = cachedProfiles.sort((a, b) => b.timestamp - a.timestamp)[0];
        // Usando cache antigo como fallback
        if (mounted) {
          setUser(mostRecent.profile);
          const microId = mostRecent.profile.microregiaoId === 'all' ? null : mostRecent.profile.microregiaoId;
          setViewingMicroregiaoId(microId);
          setIsLoading(false);
        }
        return;
      }

      // ✅ CORREÇÃO: Só limpa sessão se realmente não tiver dados
      // Sem cache disponível - redirecionando para login
      if (mounted) {
        setUser(null);
        setIsLoading(false);
      }
    }, 8000); // Reduzido para 8s

    // Verifica sessão atual
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted || hasResolvedSession) return;
      hasResolvedSession = true; // ✅ CORREÇÃO: Marca como resolvido

      if (error) {
        // Erro ao obter sessão
        // ✅ CORREÇÃO: Só limpa se for erro de token inválido
        if (error.message?.includes('invalid') || error.message?.includes('expired')) {
          clearCorruptedSession();
        }
        resetLoading();
        return;
      }

      if (session?.user) {
        const profile = await loadUserProfile(session.user.id);

        if (!mounted) {
          resetLoading();
          return;
        }

        // ✅ CORREÇÃO: Se perfil não encontrado ou inativo, fazer logout automático
        if (!profile || !profile.ativo) {
          // Sessão encontrada mas perfil inválido/inativo - fazendo logout
          await supabase.auth.signOut();
          setUser(null);
          setViewingMicroregiaoId(null);
          resetLoading();
          return;
        }

        setUser(profile);
        const microId = profile.microregiaoId === 'all' ? null : profile.microregiaoId;
        setViewingMicroregiaoId(microId);
        resetLoading();
        setIsInitialized(true); // ✅ CORREÇÃO: Marca como inicializado
      } else {
        resetLoading();
        setIsInitialized(true); // ✅ CORREÇÃO: Marca como inicializado
      }
    }).catch((_error) => {
      if (!mounted) return;
      // Erro inesperado ao obter sessão
      resetLoading();
      setIsInitialized(true);
    });

    // Escuta mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // ✅ CORREÇÃO: Ignorar INITIAL_SESSION durante inicialização (tratado por getSession)
      if (!isInitialized && event === 'INITIAL_SESSION') {
        return;
      }

      // ✅ CORREÇÃO: Se um login() está em andamento, ignorar evento SIGNED_IN
      // O login() já faz todo o trabalho necessário - evita race condition
      if (loginLockRef.current && event === 'SIGNED_IN') {
        return;
      }

      // Evento de auth processado

      if (event === 'SIGNED_IN' && session?.user) {
        setIsLoading(true);
        const profile = await loadUserProfile(session.user.id);

        // Verifica se está ativo antes de permitir login
        if (!profile || !profile.ativo) {
          // Tentativa de login com usuário inativo ou não encontrado
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        setUser(profile);
        const microId = profile.microregiaoId === 'all' ? null : profile.microregiaoId;
        setViewingMicroregiaoId(microId);
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setViewingMicroregiaoId(null);
        setIsLoading(false);
        profileCache.clear(); // ✅ CORREÇÃO: Limpa cache no logout
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // ✅ CORREÇÃO: Refresh silencioso, sem loading visual
        const profile = await loadUserProfile(session.user.id, false);

        if (!profile || !profile.ativo) {
          // Perfil inválido após refresh - fazendo logout
          await supabase.auth.signOut();
          setUser(null);
          setViewingMicroregiaoId(null);
        } else {
          setUser(profile);
        }
        // ✅ CORREÇÃO: NÃO resetar loading em TOKEN_REFRESHED
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [loadUserProfile, isInitialized]);

  // Login
  const login = useCallback(async (email: string, senha: string) => {
    console.log('[AuthContext] 🔐 Login iniciado para:', email);

    // ✅ CORREÇÃO: Ativa lock para evitar que onAuthStateChange processe SIGNED_IN
    loginLockRef.current = true;
    setIsLoading(true);

    try {
      console.log('[AuthContext] 📡 Chamando supabase.auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      console.log('[AuthContext] 📬 Resposta do Supabase:', { data: data?.user?.email, error: error?.message });

      if (error) {
        // Erro no login tratado
        console.error('[AuthContext] ❌ Erro de login:', {
          message: error.message,
          status: error.status,
          code: error.code,
          email: email // para debug
        });
        return {
          success: false,
          error: error.message === 'Invalid login credentials'
            ? 'Email ou senha incorretos'
            : error.message
        };
      }

      if (data.user) {
        console.log('[AuthContext] ✅ Usuário autenticado:', data.user.email);
        console.log('[AuthContext] 📂 Carregando perfil do usuário...');

        const profile = await loadUserProfile(data.user.id);
        console.log('[AuthContext] 📋 Perfil carregado:', profile ? profile.nome : 'NULL');

        if (!profile) {
          console.log('[AuthContext] ❌ Perfil não encontrado ou inativo, fazendo logout...');
          await supabase.auth.signOut();
          return {
            success: false,
            error: 'Conta desativada. Entre em contato com o administrador.'
          };
        }

        console.log('[AuthContext] 🎉 Setando usuário no contexto...');
        setUser(profile);
        const microId = profile.microregiaoId === 'all' ? null : profile.microregiaoId;
        setViewingMicroregiaoId(microId);
        console.log('[AuthContext] ✅ Usuário setado! isAuthenticated deveria ser true agora.');

        // Registrar login no log de atividades
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
      console.log('[AuthContext] 🔓 Finalizando login, setIsLoading(false)');
      setIsLoading(false);
      // ✅ CORREÇÃO: Libera lock após conclusão do login (com delay para garantir)
      setTimeout(() => {
        loginLockRef.current = false;
        console.log('[AuthContext] 🔓 Lock liberado');
      }, 100);
    }
  }, [loadUserProfile]);


  // Logout
  const logout = useCallback(async () => {
    try {
      // Se estava em modo demo, apenas limpa o estado
      if (isDemoMode) {
        setUser(null);
        setViewingMicroregiaoId(null);
        setIsDemoMode(false);
        return;
      }
      await supabase.auth.signOut();
      setUser(null);
      setViewingMicroregiaoId(null);
    } catch {
      // Erro ao fazer logout - ignorado
    }
  }, [isDemoMode]);

  // Login como Visitante (Demo Mode)
  const loginAsDemo = useCallback(() => {
    setUser(DEMO_USER);
    setIsDemoMode(true);
    setViewingMicroregiaoId(DEMO_USER.microregiaoId);
    setIsLoading(false);
  }, []);

  // Aceitar LGPD
  const acceptLgpd = useCallback(async () => {
    if (!user) {
      // Tentativa de aceitar LGPD sem usuário logado
      return;
    }

    // ✅ DEMO MODE: Apenas atualiza estado local, não salva no banco
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
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      // Apenas admins podem trocar microrregião visualizada
      return;
    }
    setViewingMicroregiaoId(microregiaoId === 'all' ? null : microregiaoId);
  }, [user]);

  // Computed values
  const isAuthenticated = user !== null;
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  // Microrregião atual (a que está sendo visualizada)
  // Verifica se existe no array de microrregiões antes de retornar
  const currentMicrorregiao: Microrregiao | null = viewingMicroregiaoId
    ? getMicroregiaoById(viewingMicroregiaoId) || null
    : user?.microregiaoId && user.microregiaoId !== 'all'
      ? getMicroregiaoById(user.microregiaoId) || null
      : null;

  // ✅ CORREÇÃO: Sempre fornecer um contexto válido para evitar loops de renderização
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
    // Demo Mode
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

// ✅ CORREÇÃO: Hook de emergência para casos onde o contexto falha
export function useAuthSafe(): ExtendedAuthContextType | null {
  const context = useContext(AuthContext);
  return context as ExtendedAuthContextType | null;
}

export { AuthContext };
