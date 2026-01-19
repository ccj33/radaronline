import { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// =====================================
// ROTAS PROTEGIDAS
// =====================================

/**
 * Componente de loading centralizado para gates de autenticação
 */
function LoadingGate({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-slate-600">{message}</p>
      </div>
    </div>
  );
}

type ProtectedRouteProps = {
  children: ReactNode;
};

/**
 * Rota protegida que requer autenticação e consentimento LGPD.
 * 
 * @behavior
 * - Mostra loading enquanto verifica autenticação
 * - Retorna `null` se não autenticado (App.tsx mostra LoginPage)
 * - Retorna `null` se LGPD pendente (App.tsx mostra LgpdConsent)
 * - Renderiza children se autenticado com LGPD aceito
 * 
 * @note Como o app não usa react-router, a navegação é controlada
 * pelo estado em App.tsx. Este componente apenas guarda o conteúdo.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasSession, profileLoadError, refreshUser, logout } = useAuth();

  // 1. Carregando inicial ou transição de fetch
  if (isLoading) {
    return <LoadingGate message="Verificando autenticação..." />;
  }

  // 2. Sem sessão confirmada -> Login
  // IMPORTANTE: Só redireciona se realmente não tiver sessão detectada pelo Supabase
  if (!isAuthenticated && !hasSession) {
    return null; // App.tsx vai mostrar LoginPage
  }

  // 3. Tem sessão, mas user está null (Perfil falhou ou ainda carregando pós-sessão)
  if (hasSession && !user) {
    if (profileLoadError) {
      // Extrai funções de recuperação do contexto (force refresh ou logout total)


      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center border border-red-100">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Erro ao carregar perfil</h2>
            <p className="text-slate-600 mb-6 text-sm whitespace-pre-wrap">{profileLoadError}</p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => refreshUser()}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium w-full"
              >
                Tentar Novamente
              </button>

              <button
                onClick={() => logout()}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium w-full"
              >
                Sair e entrar de novo
              </button>
            </div>
          </div>
        </div>
      );
    }
    // Se não tem erro explícito mas user é null com sessão, ainda está processando
    return <LoadingGate message="Carregando dados do usuário..." />;
  }

  // 4. Autenticado mas pendente LGPD
  if (user && !user.lgpdConsentimento) {
    return null; // App.tsx vai mostrar LgpdConsent
  }

  return <>{children}</>;
}

type AdminRouteProps = {
  children: ReactNode;
};

/**
 * Rota protegida que requer autenticação + permissão de admin.
 * 
 * @behavior
 * - Mostra loading enquanto verifica permissões
 * - Retorna `null` se não admin (App.tsx controla navegação)
 * - Renderiza children se admin autenticado
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <LoadingGate message="Verificando permissões..." />;
  }

  if (!isAuthenticated || !isAdmin) {
    return null; // App.tsx controla a navegação
  }

  return <>{children}</>;
}
