// =====================================
// AUTH MODULE EXPORTS
// =====================================

// Contexto e hooks
export { AuthProvider, useAuth, useAuthSafe, AuthContext } from './AuthContext';
export type { ExtendedAuthContextType } from './AuthContext';

// Rotas protegidas
export { ProtectedRoute, AdminRoute } from './ProtectedRoute';

// Permissões
export * from './permissions';

// Helpers de autorização centralizados
export { isAdminLike, isSuperAdmin, canMatchMicro } from '../lib/authHelpers';
