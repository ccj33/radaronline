import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User, AuthContextType, Microrregiao } from '../types/auth.types';
import { getMicroregiaoById } from '../data/microregioes';
import { supabase } from '../lib/supabase';
import { isAdminLike } from '../lib/authHelpers';
import * as authService from '../services/authService';
import { loggingService } from '../services/loggingService';
import { DEMO_USER } from '../data/mockData';

// =====================================
// TYPES
// =====================================

export interface ExtendedAuthContextType extends AuthContextType {
  refreshUser: () => Promise<void>;
  isDemoMode: boolean;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// =====================================
// CACHE SIMPLIFICADO
// =====================================
// Armazena perfil em memória para evitar requests repetidos na mesma sessão de navegação
const profileCache = new Map<string, User>();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingMicroregiaoId, setViewingMicroregiaoId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Lock para evitar conflitos de multiplas chamadas
  const isFetchingRef = useRef(false);

  /**
   * Carrega perfil do Supabase
   * MELHORIA: Não desloga o usuário se der erro de rede, apenas se o perfil não existir.
   */
  const loadUserProfile = useCallback(async (userId: string): Promise<User | null> => {
    // 1. Verifica cache de memória
    if (profileCache.has(userId)) {
      return profileCache.get(userId)!;
    }

    try {
      console.log('[AuthContext] 🚀 Buscando perfil no DB:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('*') // Seleciona tudo para garantir mapeamento
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AuthContext] ❌ Erro ao buscar perfil (RLS ou Rede):', error.message);
        // NÃO faz logout aqui. Pode ser apenas falha de conexão.
        return null;
      }

      if (!data) {
        console.warn('[AuthContext] ⚠️ Perfil não encontrado. Usuário deletado?');
        return null;
      }

      if (!data.ativo) {
        console.warn('[AuthContext] ⛔ Usuário inativo.');
        return null;
      }

      // Mapeamento seguro
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

      // Salva no cache
      profileCache.set(userId, profile);
      return profile;

    } catch (err) {
      console.error('[AuthContext] 💥 Erro crítico:', err);
      return null;
    }
  }, []);

  /**
   * Inicialização e Monitoramento de Sessão
   * Este é o coração da correção.
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // 1. Pega sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          console.log('[AuthContext] 🔓 Sessão recuperada. Carregando perfil...');
          const profile = await loadUserProfile(session.user.id);

          if (mounted) {
            if (profile) {
              setUser(profile);
              setViewingMicroregiaoId(profile.microregiaoId === 'all' ? null : profile.microregiaoId);
            } else {
              // SÓ loga warning, não desloga automaticamente
              // Pode ser erro de rede, RLS ainda carregando, etc.
              console.log('[AuthContext] ⚠️ Sessão válida mas perfil inacessível. Verifique RLS ou conexão.');
              // NÃO chama signOut() aqui - essa é a correção chave!
            }
          }
        } else {
          console.log('[AuthContext] 🚪 Nenhuma sessão ativa');
        }
      } catch (error) {
        console.error('[AuthContext] Erro na inicialização:', error);
        // Limpar storage apenas se erro for de token inválido
        if (JSON.stringify(error).includes('invalid_token')) {
          localStorage.clear();
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // 2. Listener de mudanças (Login/Logout em outras abas ou expiração)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] 📡 Evento: ${event}`);

      // Ignora eventos em demo mode
      if (isDemoMode) {
        console.log('[AuthContext] 🎭 Demo mode ativo - ignorando evento');
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // Evita recarregar se o usuário já estiver no estado (evita flicker)
        if (user?.id === session.user.id) return;

        setIsLoading(true);
        const profile = await loadUserProfile(session.user.id);
        if (profile) {
          setUser(profile);
          setViewingMicroregiaoId(profile.microregiaoId === 'all' ? null : profile.microregiaoId);
        }
        setIsLoading(false);
      }
      else if (event === 'SIGNED_OUT') {
        setUser(null);
        setViewingMicroregiaoId(null);
        profileCache.clear();
        setIsDemoMode(false);
        setIsLoading(false);
      }
      else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('[AuthContext] 🔄 Token refreshed');
        // Refresh silencioso do perfil
        profileCache.delete(session.user.id);
        const profile = await loadUserProfile(session.user.id);
        if (profile) {
          setUser(profile);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile, user?.id, isDemoMode]);

  // =====================================
  // AÇÕES
  // =====================================

  const login = async (email: string, senha: string) => {
    setIsLoading(true);
    profileCache.clear(); // Limpa cache antigo

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setIsLoading(false);
      return {
        success: false,
        error: error.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos'
          : error.message
      };
    }

    if (data.user) {
      const profile = await loadUserProfile(data.user.id);
      if (profile) {
        setUser(profile);
        const microId = profile.microregiaoId === 'all' ? null : profile.microregiaoId;
        setViewingMicroregiaoId(microId);
        loggingService.logActivity('login', 'auth', profile.id, { name: profile.nome });
        setIsLoading(false);
        return { success: true };
      } else {
        // Perfil não encontrado após login bem-sucedido
        setIsLoading(false);
        return { success: false, error: 'Erro ao carregar perfil do usuário. Verifique se a conta está ativa.' };
      }
    }

    setIsLoading(false);
    return { success: false, error: 'Erro ao fazer login.' };
  };

  const logout = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setUser(null);
      setViewingMicroregiaoId(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setViewingMicroregiaoId(null);
    profileCache.clear();
  };

  const loginAsDemo = () => {
    profileCache.clear();
    setUser(DEMO_USER);
    setIsDemoMode(true);
    setViewingMicroregiaoId(DEMO_USER.microregiaoId === 'all' ? null : DEMO_USER.microregiaoId);
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
    if (isAdminLike(user?.role)) {
      setViewingMicroregiaoId(id === 'all' ? null : id);
    }
  };

  // =====================================
  // VALORES EXPOSTOS
  // =====================================

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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context as ExtendedAuthContextType;
}

export function useAuthSafe() {
  return useContext(AuthContext) as ExtendedAuthContextType | null;
}

export { AuthContext };
