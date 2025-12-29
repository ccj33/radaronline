// =====================================
// TIPOS DE AUTENTICAÇÃO
// =====================================

export type UserRole = 'superadmin' | 'admin' | 'gestor' | 'usuario';

// Como os dados vêm do BANCO (Supabase - snake_case)
export interface ProfileDTO {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  microregiao_id: string | null;
  ativo: boolean;
  lgpd_consentimento: boolean;
  lgpd_consentimento_data: string | null;
  avatar_id: string | null;
  created_by: string | null;
  municipio: string | null;
  created_at: string;
  updated_at: string;
}

// Como os dados são usados no APP (React - camelCase)
export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  microregiaoId: string; // NUNCA null (converte null/'all' para string)
  ativo: boolean;
  lgpdConsentimento: boolean;
  lgpdConsentimentoData?: string;
  avatarId: string;
  createdBy?: string;
  municipio?: string;
  createdAt: string;
}

// =====================================
// MICRORREGIÃO
// =====================================

export type Microrregiao = {
  id: string;
  codigo: string;
  nome: string;
  macrorregiao: string;
};

// =====================================
// PERMISSÕES
// =====================================

export type RaciPermission = {
  visualizar: boolean;
  editar: boolean;
  criar: boolean;
  excluir: boolean;
};

// =====================================
// CONTEXTO DE AUTENTICAÇÃO
// =====================================

export type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  currentMicrorregiao: Microrregiao | null;

  // Ações
  login: (email: string, senha: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  acceptLgpd: () => Promise<void>;

  // Admin: trocar microrregião visualizada
  setViewingMicrorregiao: (microregiaoId: string) => void;
  viewingMicroregiaoId: string | null;
};

// =====================================
// LOGIN
// =====================================

export type LoginCredentials = {
  email: string;
  senha: string;
};

export type LoginResult = {
  success: boolean;
  user?: User;
  error?: string;
};
