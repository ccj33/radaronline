import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthContextType, Microrregiao } from '../types/auth.types';
import { getMicroregiaoById } from '../data/microregioes';
import { supabase } from '../lib/supabase';
import * as authService from '../services/authService';

const AuthContext = createContext<AuthContextType | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

// ✅ CORREÇÃO: Cache de perfis movido para fora do componente (module-level)
// Isso garante que o cache persista entre renders
const profileCache = new Map<string, { profile: User; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minuto
let queryCount = 0; // Contador de queries para monitoramento

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
    console.log('[AuthContext] Sessão corrompida limpa do localStorage');
  } catch (e) {
    console.error('[AuthContext] Erro ao limpar sessão:', e);
  }
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingMicroregiaoId, setViewingMicroregiaoId] = useState<string | null>(null);

  /**
   * Carrega perfil do usuário do Supabase com cache
   * Retorna null se usuário não encontrado ou inativo
   * 
   * PADRÃO: Converte null do DB para 'all' no app (consistência)
   */
  const loadUserProfile = useCallback(async (userId: string, useCache = true): Promise<User | null> => {
    // ✅ FASE 1: Verificar cache primeiro
    if (useCache) {
      const cached = profileCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[AuthContext] Cache HIT para userId: ${userId}`);
        return cached.profile;
      }
    }

    // ✅ FASE 1: Logging de queries
    queryCount++;
    console.log(`[AuthContext] Query #${queryCount} - loadUserProfile(${userId})${useCache ? ' [CACHE MISS]' : ' [FORCE REFRESH]'}`);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email, role, microregiao_id, ativo, lgpd_consentimento, lgpd_consentimento_data, created_by, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AuthContext] Erro ao carregar perfil:', error);
        return null;
      }

      if (!data) {
        console.warn('[AuthContext] Perfil não encontrado para usuário:', userId);
        return null;
      }

      if (!data.ativo) {
        console.warn('[AuthContext] Usuário inativo:', userId);
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
        createdBy: data.created_by || undefined,
        createdAt: data.created_at,
      };

      // ✅ FASE 1: Salvar no cache
      if (useCache) {
        profileCache.set(userId, { profile, timestamp: Date.now() });
      }

      return profile;
    } catch (error) {
      console.error('[AuthContext] Erro inesperado ao carregar perfil:', error);
      return null;
    }
  }, []);

  // ✅ FASE 1: Função para invalidar cache (útil quando perfil é atualizado)
  // Exportada para uso futuro quando perfil for atualizado externamente
  // const invalidateProfileCache = useCallback((userId: string) => {
  //   profileCache.delete(userId);
  //   console.log(`[AuthContext] Cache invalidado para userId: ${userId}`);
  // }, []);

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

      console.warn('[AuthContext] Timeout ao carregar sessão - verificando cache');

      // ✅ CORREÇÃO: Tentar usar cache antigo antes de desistir
      const cachedProfiles = Array.from(profileCache.values());
      if (cachedProfiles.length > 0) {
        const mostRecent = cachedProfiles.sort((a, b) => b.timestamp - a.timestamp)[0];
        console.log('[AuthContext] Usando cache antigo como fallback');
        if (mounted) {
          setUser(mostRecent.profile);
          const microId = mostRecent.profile.microregiaoId === 'all' ? null : mostRecent.profile.microregiaoId;
          setViewingMicroregiaoId(microId);
          setIsLoading(false);
        }
        return;
      }

      // ✅ CORREÇÃO: Só limpa sessão se realmente não tiver dados
      console.warn('[AuthContext] Sem cache disponível - redirecionando para login');
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
        console.error('[AuthContext] Erro ao obter sessão:', error);
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
          console.warn('[AuthContext] Sessão encontrada mas perfil inválido/inativo - fazendo logout');
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
    }).catch((error) => {
      if (!mounted) return;
      console.error('[AuthContext] Erro inesperado ao obter sessão:', error);
      resetLoading();
      setIsInitialized(true);
    });

    // Escuta mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // ✅ CORREÇÃO: Ignorar eventos durante inicialização inicial
      // O getSession já processa a sessão inicial
      if (!isInitialized && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        console.log(`[AuthContext] Ignorando evento ${event} durante inicialização`);
        return;
      }

      console.log(`[AuthContext] Evento de auth: ${event}`);

      if (event === 'SIGNED_IN' && session?.user) {
        setIsLoading(true);
        const profile = await loadUserProfile(session.user.id);

        // Verifica se está ativo antes de permitir login
        if (!profile || !profile.ativo) {
          console.warn('[AuthContext] Tentativa de login com usuário inativo ou não encontrado');
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
          console.warn('[AuthContext] Perfil inválido após refresh - fazendo logout');
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
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        console.error('[AuthContext] Erro no login:', error);
        return {
          success: false,
          error: error.message === 'Invalid login credentials'
            ? 'Email ou senha incorretos'
            : error.message
        };
      }

      if (data.user) {
        const profile = await loadUserProfile(data.user.id);

        if (!profile) {
          await supabase.auth.signOut();
          return {
            success: false,
            error: 'Conta desativada. Entre em contato com o administrador.'
          };
        }

        setUser(profile);
        const microId = profile.microregiaoId === 'all' ? null : profile.microregiaoId;
        setViewingMicroregiaoId(microId);

        return { success: true };
      }

      return { success: false, error: 'Erro ao fazer login' };
    } catch (error: any) {
      console.error('[AuthContext] Erro inesperado no login:', error);
      return { success: false, error: error.message || 'Erro ao fazer login' };
    } finally {
      setIsLoading(false);
    }
  }, [loadUserProfile]);

  // Logout
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setViewingMicroregiaoId(null);
    } catch (error) {
      console.error('[AuthContext] Erro ao fazer logout:', error);
    }
  }, []);

  // Aceitar LGPD
  const acceptLgpd = useCallback(async () => {
    if (!user) {
      console.warn('[AuthContext] Tentativa de aceitar LGPD sem usuário logado');
      return;
    }

    try {
      await authService.acceptLgpd(user.id);
      setUser(prev => prev ? {
        ...prev,
        lgpdConsentimento: true,
        lgpdConsentimentoData: new Date().toISOString(),
      } : null);
    } catch (error) {
      console.error('[AuthContext] Erro ao aceitar LGPD:', error);
      throw error; // Propaga erro para o componente tratar
    }
  }, [user]);

  // Trocar microrregião visualizada (apenas admin)
  const setViewingMicrorregiao = useCallback((microregiaoId: string) => {
    if (user?.role !== 'admin') {
      console.warn('[AuthContext] Apenas admins podem trocar microrregião visualizada');
      return;
    }
    setViewingMicroregiaoId(microregiaoId === 'all' ? null : microregiaoId);
  }, [user]);

  // Computed values
  const isAuthenticated = user !== null;
  const isAdmin = user?.role === 'admin';

  // Microrregião atual (a que está sendo visualizada)
  // Verifica se existe no array de microrregiões antes de retornar
  const currentMicrorregiao: Microrregiao | null = viewingMicroregiaoId
    ? getMicroregiaoById(viewingMicroregiaoId) || null
    : user?.microregiaoId && user.microregiaoId !== 'all'
      ? getMicroregiaoById(user.microregiaoId) || null
      : null;

  // ✅ CORREÇÃO: Sempre fornecer um contexto válido para evitar loops de renderização
  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    currentMicrorregiao,
    login,
    logout,
    acceptLgpd,
    setViewingMicrorregiao,
    viewingMicroregiaoId,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
}

// ✅ CORREÇÃO: Hook de emergência para casos onde o contexto falha
export function useAuthSafe(): AuthContextType | null {
  const context = useContext(AuthContext);
  return context;
}

export { AuthContext };
