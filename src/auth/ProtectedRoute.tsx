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
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingGate message="Verificando autenticação..." />;
  }

  if (!isAuthenticated) {
    return null; // App.tsx vai mostrar LoginPage
  }

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
