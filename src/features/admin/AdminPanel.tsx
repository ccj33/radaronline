import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Shield,
  UserCheck,
  UserX,
  ChevronDown,
  ArrowLeft,
  Building2,
  LayoutDashboard,
  AlertTriangle,
  Trophy,
  Activity,
  RefreshCw,
  Download,
  Maximize,
  Minimize,
  ChevronRight,
  Bell,
  MapPin,
  Target,
  UserPlus,
} from 'lucide-react';
import { NotificationBell } from '../../components/common/NotificationBell';
import { ZoomControl } from '../../components/common/ZoomControl';
import { MicroregionSelector } from '../../components/common/MicroregionSelector';
import { useAuth } from '../../auth';
import { User } from '../../types/auth.types';
import { Action, TeamMember, Objective, Activity as ActivityType } from '../../types';
import { Sidebar } from '../../components/layout/Sidebar';
import { MICROREGIOES, getMicroregiaoById, getMacrorregioes } from '../../data/microregioes';
import * as authService from '../../services/authService';
import { saveUserMunicipality, loadPendingRegistrations, deletePendingRegistration, PendingRegistration } from '../../services/dataService';
import { UserFormModal } from './UserFormModal';
import {
  AdminOverview,
  MinasMicroMap,
  WorkforcePanel,
  RankingPanel,
  ActivityLog,
  ActivityCenter,
  DashboardFilters,
  ComparisonEngine,
  defaultFiltersState,
  DashboardFiltersState,
  PendingRegistrationsPanel,
  RequestsManagement,
} from './dashboard';
import MicroDetailModal from './dashboard/MicroDetailModal';
import { AnalyticsDashboard } from './dashboard/AnalyticsDashboard';
import { UserSettingsModal } from '../settings/UserSettingsModal';
import { ConfirmModal, useToast } from '../../components/common';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { log, logError } from '../../lib/logger';
import { useResponsive } from '../../hooks/useResponsive';

type TabType = 'dashboard' | 'usuarios' | 'microregioes' | 'ranking' | 'atividades' | 'requests';

interface AdminPanelProps {
  onBack?: () => void;
  actions?: Action[];
  teams?: Record<string, TeamMember[]>;
  objectives?: Objective[];
  activities?: Record<number, ActivityType[]>;
}

export function AdminPanel(props: AdminPanelProps) {
  const { onBack, actions = [], teams = {}, objectives = [], activities = {} } = props;
  const { user: currentUser, setViewingMicrorregiao, isAdmin, isSuperAdmin, logout } = useAuth();
  const { showToast } = useToast();
  const { isMobile, isTablet } = useResponsive();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const [showMicroSelector, setShowMicroSelector] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMacro, setFilterMacro] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  // User Tab Filters
  const [userFilterMacro, setUserFilterMacro] = useState<string>('all');
  const [userFilterMicro, setUserFilterMicro] = useState<string>('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{ open: boolean; user?: User | null; nextStatus?: boolean }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; user?: User | null }>({ open: false });

  // Dashboard filters state
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFiltersState>(defaultFiltersState);

  // Pending registrations state
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<{
    nome?: string;
    email?: string;
    microregiaoId?: string;
    municipio?: string;
  } | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMobileMicroId, setSelectedMobileMicroId] = useState<string | null>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [selectedObjective, setSelectedObjective] = useState<number>(objectives[0]?.id || 1);
  const [selectedActivity, setSelectedActivity] = useState<string>(activities[objectives[0]?.id]?.[0]?.id || '1.1');
  const [currentNav, setCurrentNav] = useState<'strategy' | 'home' | 'settings'>('strategy');

  // Settings modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'appearance'>('profile');
  const [settingsMode, setSettingsMode] = useState<'settings' | 'avatar'>('settings');

  // Carrega usuários
  useEffect(() => {
    loadUsers();
    loadPending();

    // Resetar filtro de microrregião ao entrar no admin (zerar seleção global)
    // Isso garante que o admin comece com "visão geral"
    if (setViewingMicrorregiao) {
      setViewingMicrorregiao('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas na montagem

  const loadPending = async () => {
    setPendingLoading(true);
    try {
      const pending = await loadPendingRegistrations();
      setPendingRegistrations(pending);
    } catch (error) {
      logError('AdminPanel', 'Erro ao carregar pendentes', error);
    } finally {
      setPendingLoading(false);
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const usersList = await authService.listUsers();
      setUsers(usersList);
    } catch (error) {
      logError('AdminPanel', 'Erro ao carregar usuários', error);
      showToast('Não foi possível carregar usuários', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FASE 1: Filtrar usuários com memoização
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = filterRole === 'all' || u.role === filterRole;

      // Region Filtering
      let matchRegion = true;
      if (userFilterMacro !== 'all') {
        const micro = u.microregiaoId && u.microregiaoId !== 'all' ? getMicroregiaoById(u.microregiaoId) : null;
        if (!micro || micro.macrorregiao !== userFilterMacro) matchRegion = false;
      }
      if (matchRegion && userFilterMicro !== 'all') {
        if (u.microregiaoId !== userFilterMicro) matchRegion = false;
      }

      return matchSearch && matchRole && matchRegion;
    }).sort((a, b) => {
      // Helper to get region info safely
      const getRegionInfo = (user: User) => {
        if (!user.microregiaoId || user.microregiaoId === 'all') return { macro: 'ZZZ', micro: ' Minas Gerais (Global)' }; // 'all' first or last? Using space to put first if desired, or ZZZ for last.
        // User requested alphabetical order of microregions.
        const micro = getMicroregiaoById(user.microregiaoId);
        return micro ? { macro: micro.macrorregiao, micro: micro.nome } : { macro: 'ZZZ', micro: 'ZZZ' };
      };

      const infoA = getRegionInfo(a);
      const infoB = getRegionInfo(b);

      // 1. Sort by Micro (A-Z)
      const microComparison = infoA.micro.localeCompare(infoB.micro);
      if (microComparison !== 0) return microComparison;

      // 2. Sort by Name (A-Z)
      return a.nome.localeCompare(b.nome);
    });
  }, [users, searchTerm, filterRole, userFilterMacro, userFilterMicro]);

  // Filtrar microrregiões
  const filteredMicroregioes = useMemo(() => {
    return MICROREGIOES.filter(m => {
      const matchSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMacro = filterMacro === 'all' || m.macrorregiao === filterMacro;
      return matchSearch && matchMacro;
    }).sort((a, b) => {
      if (a.macrorregiao !== b.macrorregiao) return a.macrorregiao.localeCompare(b.macrorregiao);
      return a.nome.localeCompare(b.nome);
    });
  }, [searchTerm, filterMacro]);

  // Handlers
  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleToggleUserStatus = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    setConfirmToggle({ open: true, user, nextStatus: !user.ativo });
  };

  const handleViewMicrorregiao = (microregiaoId: string) => {
    setViewingMicrorregiao(microregiaoId);
    onBack?.();
  };

  const handleSaveUser = async (userData: Partial<User> & { senha?: string, municipality?: string, municipio?: string }) => {
    setActionLoadingId('save-user'); // ✅ FORA do try para garantir reset

    try {
      if (editingUser) {
        await authService.updateUser(editingUser.id, userData);

        // Se houver município, salvar
        if (userData.municipio && userData.email) {
          await saveUserMunicipality(
            userData.microregiaoId || editingUser.microregiaoId,
            userData.email,
            userData.municipio,
            userData.nome || editingUser.nome
          );
        }

        showToast('Usuário atualizado', 'success');
      } else {
        // ✅ CORREÇÃO: Validar campos obrigatórios antes de criar
        if (!userData.nome || !userData.email || !userData.senha) {
          showToast('Preencha todos os campos obrigatórios', 'error');
          setActionLoadingId(null); // ✅ Resetar loading antes de return
          return;
        }

        // ✅ CORREÇÃO: Garantir que senha está presente
        log('[AdminPanel]', 'Iniciando criação de usuário...');
        await authService.createUser({
          nome: userData.nome!,
          email: userData.email!,
          senha: userData.senha!,
          role: userData.role || 'usuario',
          microregiaoId: userData.microregiaoId,
          createdBy: currentUser?.id,
        });

        // Se houver município, salvar agora que o usuário foi criado (ou ao mesmo tempo)
        if (userData.municipio) {
          // Nota: Para usuários novos, precisamos garantir que o email foi registrado, 
          // mas como saveUserMunicipality faz upsert na tabela teams baseado no email, deve funcionar.
          await saveUserMunicipality(
            userData.microregiaoId!,
            userData.email!,
            userData.municipio,
            userData.nome!
          );
        }

        log('[AdminPanel]', 'Usuário criado com sucesso');
        showToast('Usuário criado', 'success');
      }
      await loadUsers();
      setShowUserModal(false);
    } catch (error: any) {
      logError('[AdminPanel]', 'Erro ao salvar usuário:', error);
      // ✅ CORREÇÃO: Mostrar mensagem de erro mais específica com fallback genérico
      const errorMessage = error?.message || 'Erro desconhecido. Tente novamente ou contate o suporte.';
      showToast(errorMessage, 'error');
      // ✅ NÃO fechar o modal em caso de erro - deixa o usuário corrigir
    } finally {
      // ✅ Garantir que sempre reseta o loading
      setActionLoadingId(null);
      log('[AdminPanel]', 'Loading resetado');
    }
  };

  const getRoleBadge = (role: User['role']) => {
    const styles: Record<string, string> = {
      superadmin: 'bg-purple-100 text-purple-700 border-purple-200',
      admin: 'bg-slate-100 text-slate-700 border-slate-200',
      gestor: 'bg-slate-100 text-slate-700 border-slate-200',
      usuario: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    const labels: Record<string, string> = {
      superadmin: 'Super Admin',
      admin: 'Administrador',
      gestor: 'Gestor',
      usuario: 'Usuário',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[role] || styles.usuario}`}>
        {labels[role] || role}
      </span>
    );
  };

  const _tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard, count: null },
    { id: 'atividades' as TabType, label: 'Atividades', icon: Activity, count: null },
    { id: 'usuarios' as TabType, label: 'Usuários', icon: Users, count: users.length },
    { id: 'ranking' as TabType, label: 'Ranking', icon: Trophy, count: null },
  ];

  const _kpis = useMemo(() => {
    const total = users.length;
    const ativos = users.filter(u => u.ativo).length;
    const inativos = total - ativos;
    const admins = users.filter(u => u.role === 'admin').length;
    const gestores = users.filter(u => u.role === 'gestor').length;
    return { total, ativos, inativos, admins, gestores };
  }, [users]);

  if (!isAdmin && currentUser?.role !== 'gestor') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm text-center max-w-sm">
          <Shield className="w-10 h-10 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Acesso restrito</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Apenas administradores podem acessar este painel.</p>
          <button
            onClick={onBack}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-900 dark:hover:bg-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // ========== MOBILE ADMIN TABS CONFIG ==========
  const mobileAdminTabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'usuarios', icon: Users, label: 'Usuários' },
    { id: 'ranking', icon: Trophy, label: 'Ranking' },
    { id: 'atividades', icon: Activity, label: 'Atividades' },
    { id: 'requests', icon: Bell, label: 'Pedidos' },
  ] as const;

  // ========== MOBILE LAYOUT ==========
  if (isMobile || isTablet) {
    return (
      <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
        {/* Mobile Header - Limpo e compacto */}
        <header className="bg-white dark:bg-slate-900 sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 safe-area-top">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Logo + Título */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Painel Admin
                </h1>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isSuperAdmin
                  ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                  {isSuperAdmin ? 'Super Admin' : 'Admin'}
                </span>
              </div>
            </div>

            {/* Ações rápidas */}
            <div className="flex items-center gap-1">
              <button
                onClick={loadUsers}
                className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Mobile Content - Com padding para bottom nav */}
        <main className="flex-1 overflow-y-auto pb-20">
          <div className="px-3 py-4 space-y-4">

            {/* Tab: Dashboard Mobile - REDESIGNED */}
            {activeTab === 'dashboard' && (
              <div className="space-y-4">

                {/* Botão de Selecionar Microrregião - PRINCIPAL */}
                <button
                  onClick={() => setShowMicroSelector(true)}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-2xl p-4 shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm text-white/80">Acessar microrregião</p>
                      <p className="text-lg font-bold">Selecionar Micro →</p>
                    </div>
                    <Target className="w-6 h-6 text-white/60" />
                  </div>
                </button>

                {/* KPIs Resumidos */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>Usuários</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{users.length}</p>
                    <p className="text-xs text-slate-400 mt-1">{users.filter(u => u.ativo !== false).length} ativos</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                      <Activity className="w-3.5 h-3.5" />
                      <span>Ações</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{actions.length}</p>
                    <p className="text-xs text-emerald-500 mt-1">
                      {actions.filter(a => a.status === 'Concluído').length} concluídas
                    </p>
                  </div>
                </div>

                {/* Pendentes (se houver) */}
                {pendingRegistrations.length > 0 && (
                  <button
                    onClick={() => setActiveTab('usuarios')}
                    className="w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800/50 rounded-lg flex items-center justify-center">
                        <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-amber-800 dark:text-amber-200">
                          {pendingRegistrations.length} solicitação{pendingRegistrations.length > 1 ? 'ões' : ''} pendente{pendingRegistrations.length > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          Toque para revisar
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-amber-500" />
                    </div>
                  </button>
                )}
                {/* Mapa interativo (mobile) */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-3">
                    <MinasMicroMap
                      actions={actions}
                      onMacroSelect={(macroId) => setDashboardFilters(prev => ({
                        ...prev,
                        selectedMacroId: macroId,
                        selectedMicroId: null,
                        selectedMunicipioCode: null
                      }))}
                      onMicroSelect={(microId) => {
                        if (isMobile || isTablet) {
                          setSelectedMobileMicroId(microId as string);
                        } else {
                          handleViewMicrorregiao(microId as string);
                        }
                      }}
                      onNavigateToObjectives={handleViewMicrorregiao}
                      selectedMacroId={dashboardFilters.selectedMacroId}
                      selectedMicroId={dashboardFilters.selectedMicroId}
                    />
                  </div>
                </div>

                {/* Ranking resumido */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Top Microrregiões</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('ranking')}
                      className="text-xs text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1"
                    >
                      Ver tudo
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <RankingPanel actions={actions} onViewMicrorregiao={handleViewMicrorregiao} compact />
                </div>
              </div>
            )}

            {/* Tab: Usuários Mobile */}
            {activeTab === 'usuarios' && (
              <div className="space-y-4">
                {/* Cadastros Pendentes de Aprovação - Mobile */}
                {pendingRegistrations.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-700 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="font-bold text-amber-800 dark:text-amber-200 text-sm">
                          {pendingRegistrations.length} Cadastro{pendingRegistrations.length > 1 ? 's' : ''} Pendente{pendingRegistrations.length > 1 ? 's' : ''}
                        </span>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Aguardando criação pelo admin
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {pendingRegistrations.slice(0, 3).map(pending => {
                        const micro = getMicroregiaoById(pending.microregiaoId);
                        return (
                          <div
                            key={pending.id}
                            className="bg-white dark:bg-slate-800 rounded-lg p-3 flex items-center gap-3 shadow-sm"
                          >
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-sm">
                              {pending.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">
                                {pending.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {micro?.nome || 'Sem micro'}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setPendingUserData({
                                  nome: pending.name,
                                  email: pending.email || '',
                                  microregiaoId: pending.microregiaoId,
                                  municipio: pending.municipio || '',
                                });
                                setEditingUser(null);
                                setShowUserModal(true);
                              }}
                              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium"
                            >
                              Criar
                            </button>
                          </div>
                        );
                      })}
                      {pendingRegistrations.length > 3 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 text-center pt-1">
                          +{pendingRegistrations.length - 3} mais...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* LGPD Pendente - Minimalista */}
                {(() => {
                  const lgpdPendingCount = users.filter(u => u.ativo && !u.lgpdConsentimento).length;
                  return lgpdPendingCount > 0 ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <Shield className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-purple-700 dark:text-purple-300">
                        <strong>{lgpdPendingCount}</strong> sem LGPD
                      </span>
                    </div>
                  ) : null;
                })()}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                {/* Filtros */}
                <div className="flex gap-2">
                  <select
                    value={userFilterMacro}
                    onChange={(e) => {
                      setUserFilterMacro(e.target.value);
                      setUserFilterMicro('all');
                    }}
                    className="flex-1 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                  >
                    <option value="all">Todas Macros</option>
                    {getMacrorregioes().map(macro => (
                      <option key={macro} value={macro}>{macro}</option>
                    ))}
                  </select>

                  {isSuperAdmin && (
                    <button
                      onClick={() => { setEditingUser(null); setShowUserModal(true); }}
                      className="px-3 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Novo
                    </button>
                  )}
                </div>

                {/* Lista de usuários mobile */}
                <div className="space-y-2">
                  {filteredUsers.map(user => {
                    const micro = getMicroregiaoById(user.microregiaoId);
                    return (
                      <div
                        key={user.id}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {user.nome?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">
                                {user.nome}
                              </span>
                              {getRoleBadge(user.role)}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {user.email}
                            </p>
                            {micro && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                {micro.nome}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* LGPD pendente - ícone minimalista */}
                            {user.ativo && !user.lgpdConsentimento && (
                              <span title="LGPD pendente">
                                <Shield className="w-3.5 h-3.5 text-purple-400" />
                              </span>
                            )}
                            <span className={`w-2 h-2 rounded-full ${user.ativo !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                            <button
                              onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Menu expandido */}
                        {expandedUserId === user.id && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                            <button
                              onClick={() => { setEditingUser(user); setShowUserModal(true); setExpandedUserId(null); }}
                              className="flex-1 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => { setConfirmToggle({ open: true, user, nextStatus: user.ativo === false }); setExpandedUserId(null); }}
                              className={`flex-1 py-2 text-xs font-medium rounded-lg ${user.ativo !== false
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                }`}
                            >
                              {user.ativo !== false ? 'Desativar' : 'Ativar'}
                            </button>
                            {isSuperAdmin && (
                              <button
                                onClick={() => { setConfirmDelete({ open: true, user }); setExpandedUserId(null); }}
                                className="px-3 py-2 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                      Nenhum usuário encontrado
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Ranking Mobile */}
            {activeTab === 'ranking' && (
              <RankingPanel actions={actions} onViewMicrorregiao={handleViewMicrorregiao} />
            )}

            {/* Tab: Atividades Mobile */}
            {activeTab === 'atividades' && (
              <ActivityCenter />
            )}

            {/* Tab: Solicitações Mobile */}
            {activeTab === 'requests' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[60vh]">
                <RequestsManagement />
              </div>
            )}

          </div>
        </main>

        {/* Modals */}
        {showUserModal && (
          <UserFormModal
            user={editingUser}
            onClose={() => { setShowUserModal(false); setEditingUser(null); setPendingUserData(null); }}
            onSave={handleSaveUser}
            isSaving={isLoading}
            fullScreen={isMobile || isTablet}
            initialData={pendingUserData || undefined}
          />
        )}

        <ConfirmModal
          isOpen={confirmToggle.open}
          onClose={() => setConfirmToggle({ open: false })}
          onConfirm={async () => {
            if (!confirmToggle.user) return;
            setActionLoadingId(confirmToggle.user.id);
            setConfirmToggle({ open: false });
            try {
              await authService.updateUser(confirmToggle.user.id, { ativo: confirmToggle.nextStatus });
              showToast(`Usuário ${confirmToggle.nextStatus ? 'ativado' : 'desativado'}`, 'success');
              loadUsers();
            } catch {
              showToast('Erro ao alterar status', 'error');
            } finally {
              setActionLoadingId(null);
            }
          }}
          title={`${confirmToggle.nextStatus ? 'Ativar' : 'Desativar'} usuário`}
          message={confirmToggle.user ? `Deseja ${confirmToggle.nextStatus ? 'ativar' : 'desativar'} "${confirmToggle.user.nome}"?` : ''}
          confirmText={confirmToggle.nextStatus ? 'Ativar' : 'Desativar'}
          confirmType={confirmToggle.nextStatus ? 'info' : 'warning'}
        />

        <MicroDetailModal
          isOpen={!!selectedMobileMicroId}
          microId={selectedMobileMicroId}
          onClose={() => setSelectedMobileMicroId(null)}
          onOpenPanel={(microId) => {
            handleViewMicrorregiao(microId);
            setSelectedMobileMicroId(null);
          }}
          actions={actions}
          users={users}
        />

        <ConfirmModal
          isOpen={confirmDelete.open}
          onClose={() => setConfirmDelete({ open: false })}
          onConfirm={async () => {
            if (!confirmDelete.user) return;
            setActionLoadingId(confirmDelete.user.id);
            setConfirmDelete({ open: false });
            try {
              await authService.deleteUser(confirmDelete.user.id);
              showToast('Usuário excluído', 'success');
              loadUsers();
            } catch {
              showToast('Erro ao excluir usuário', 'error');
            } finally {
              setActionLoadingId(null);
            }
          }}
          title="Excluir usuário"
          message={confirmDelete.user ? `Excluir "${confirmDelete.user.nome}" permanentemente?` : ''}
          confirmText="Excluir"
          confirmType="danger"
        />

        <UserSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          initialTab={settingsInitialTab}
          mode={settingsMode}
        />

        {/* Seletor de Microrregião Mobile */}
        <MicroregionSelector
          selectedMicroId={dashboardFilters.selectedMicroId}
          onSelect={(microId) => {
            handleViewMicrorregiao(microId);
          }}
          actions={actions}
          isOpen={showMicroSelector}
          onClose={() => setShowMicroSelector(false)}
        />

        {/* Bottom Navigation - Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 safe-area-bottom">
          <div className="flex items-stretch justify-around max-w-lg mx-auto">
            {mobileAdminTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const hasBadge = tab.id === 'requests' && pendingRegistrations.length > 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex-1 flex flex-col items-center justify-center py-2 px-1 min-h-[56px] transition-all ${isActive
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-slate-400 dark:text-slate-500'
                    }`}
                >
                  <div className="relative">
                    {isActive && (
                      <div className="absolute -inset-2 bg-teal-100 dark:bg-teal-900/40 rounded-xl" />
                    )}
                    <Icon className={`relative w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                    {hasBadge && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {pendingRegistrations.length > 9 ? '9+' : pendingRegistrations.length}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-semibold' : ''}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  // ========== DESKTOP LAYOUT ==========
  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        currentNav={currentNav}
        setCurrentNav={(nav: string) => setCurrentNav(nav as 'strategy' | 'home' | 'settings')}
        selectedObjective={selectedObjective}
        setSelectedObjective={setSelectedObjective}
        selectedActivity={selectedActivity}
        setSelectedActivity={setSelectedActivity}
        setViewMode={() => { }} // No viewMode control in admin
        objectives={objectives}
        activities={activities}
        onProfileClick={() => {
          setSettingsInitialTab('profile');
          setSettingsMode('avatar'); // Avatar click opens 'avatar' mode (hub style)
          setIsSettingsModalOpen(true);
        }}
        userName={currentUser?.nome}
        userRole={currentUser?.role}
        userAvatarId={currentUser?.avatarId}
        onLogout={logout}
        isAdmin={isAdmin}
        isEditMode={false}
        onOpenSettings={(mode) => {
          if (mode === 'avatar') {
            setSettingsInitialTab('profile');
            setSettingsMode('avatar');
          } else {
            setSettingsInitialTab('appearance');
            setSettingsMode('settings');
          }
          setIsSettingsModalOpen(true);
        }}
        onSelectMicroregiao={(microId) => handleViewMicrorregiao(microId)}
        onViewAllMicroregioes={() => setActiveTab('microregioes')}
        showPlanningNavigation={false}
        adminActiveTab={activeTab}
        onAdminTabChange={(tab: string) => setActiveTab(tab as TabType)}
      />

      {/* Main Admin Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Header Premium Clean */}
        <header className="bg-white dark:bg-slate-900 sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      Painel Administrativo
                    </h1>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${isSuperAdmin
                      ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}>
                      {isSuperAdmin ? 'Super Admin' : 'Admin'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-1">
                    Gerenciando {MICROREGIOES.length} microrregiões
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Actions Group */}
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700">

                  <ZoomControl />

                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                  <button
                    onClick={loadUsers}
                    className="p-2 text-slate-500 hover:text-teal-600 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all"
                    title="Atualizar dados"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    className="p-2 text-slate-500 hover:text-teal-600 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all"
                    title="Exportar relatório"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                  <button
                    onClick={toggleFullscreen}
                    className="p-2 text-slate-500 hover:text-teal-600 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all"
                    title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>

                <div className="pl-3 border-l border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <NotificationBell />
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

          {/* Tab: Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Filters Bar */}
              <DashboardFilters
                filters={dashboardFilters}
                onChange={setDashboardFilters}
              />

              {/* Dynamic Filter Summary - Users & Micros count */}
              {/* Dynamic Filter Summary - removed for cleanup */}

              {/* Show Comparison Engine or Normal Overview */}
              {dashboardFilters.isCompareMode ? (
                <ComparisonEngine
                  compareLevel={dashboardFilters.compareLevel}
                  entityA={dashboardFilters.entityA}
                  entityB={dashboardFilters.entityB}
                  actions={actions}
                  users={users}
                />
              ) : (
                <>
                  {/* Overview com KPIs + Mapa + Gráficos */}
                  <AdminOverview
                    actions={actions}
                    users={users}
                    teams={teams}
                    filters={dashboardFilters}
                    onTabChange={setActiveTab}
                    pendingCount={pendingRegistrations.length}
                  >
                    {/* Mapa de Microrregiões (Inserido entre KPIs e Gráficos) */}
                    <MinasMicroMap
                      actions={actions}
                      onMacroSelect={(macroId) => setDashboardFilters(prev => ({
                        ...prev,
                        selectedMacroId: macroId,
                        selectedMicroId: null,
                        selectedMunicipioCode: null
                      }))}
                      onMicroSelect={(microId) => setDashboardFilters(prev => ({
                        ...prev,
                        selectedMicroId: microId
                      }))}
                      onNavigateToObjectives={handleViewMicrorregiao}
                      selectedMacroId={dashboardFilters.selectedMacroId}
                      selectedMicroId={dashboardFilters.selectedMicroId}
                    />
                  </AdminOverview>

                  {/* Analytics Section - Agora logo após o Mapa */}
                  <div id="analytics-section" className="pt-8 border-t border-slate-200 dark:border-slate-700 scroll-mt-24">
                    <AnalyticsDashboard />
                  </div>

                  {/* Grid com Workforce e Activity Log */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <WorkforcePanel
                      users={users}
                      selectedMacroId={dashboardFilters.selectedMacroId}
                      selectedMicroId={dashboardFilters.selectedMicroId}
                      onViewMicrorregiao={handleViewMicrorregiao}
                    />
                    <ActivityLog maxItems={8} />
                  </div>

                  {/* Ranking Section */}
                  <div id="ranking-section" className="pt-8 border-t border-slate-200 dark:border-slate-700 scroll-mt-24">
                    <RankingPanel actions={actions} onViewMicrorregiao={handleViewMicrorregiao} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab: Atividades */}
          {
            activeTab === 'atividades' && (
              <div className="space-y-6">
                <ActivityCenter />
              </div>
            )
          }

          {/* Tab: Requests (Solicitações) */}
          {activeTab === 'requests' && (
            <div className="h-[calc(100vh-140px)] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <RequestsManagement />
            </div>
          )}

          {/* Tab: Usuários */}
          {
            activeTab === 'usuarios' && (
              <>
                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  {/* User Filters: Macro */}
                  <div className="relative min-w-[180px]">
                    <select
                      value={userFilterMacro}
                      onChange={(e) => {
                        setUserFilterMacro(e.target.value);
                        setUserFilterMicro('all'); // Reset micro when macro changes
                      }}
                      className="w-full appearance-none pl-4 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    >
                      <option value="all">Todas Macros</option>
                      {getMacrorregioes().map(macro => (
                        <option key={macro} value={macro}>{macro}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>

                  {/* User Filters: Micro */}
                  <div className="relative min-w-[180px]">
                    <select
                      value={userFilterMicro}
                      onChange={(e) => {
                        const selectedMicroId = e.target.value;
                        setUserFilterMicro(selectedMicroId);
                        if (selectedMicroId !== 'all') {
                          const micro = MICROREGIOES.find(m => m.id === selectedMicroId);
                          if (micro) setUserFilterMacro(micro.macrorregiao);
                        } else {
                          setUserFilterMacro('all');
                        }
                      }}
                      className="w-full appearance-none pl-4 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    >
                      <option value="all">Todas Micros</option>
                      {MICROREGIOES
                        .filter(m => userFilterMacro === 'all' || m.macrorregiao === userFilterMacro)
                        .map(micro => (
                          <option key={micro.id} value={micro.id}>{micro.nome}</option>
                        ))
                      }
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>

                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                    />
                  </div>

                  <div className="relative">
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    >
                      <option value="all">Todos os papéis</option>
                      <option value="admin">Administrador</option>
                      <option value="gestor">Gestor</option>
                      <option value="usuario">Usuário</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>

                  <button
                    onClick={handleCreateUser}
                    className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-all hover:shadow-lg shadow-sm whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Usuário
                  </button>
                </div>

                {/* Cadastros Pendentes */}
                {pendingRegistrations.length > 0 && (
                  <PendingRegistrationsPanel
                    pendingRegistrations={pendingRegistrations}
                    isLoading={pendingLoading}
                    onCreateUser={(pending) => {
                      // Preenche dados iniciais e abre o modal
                      setPendingUserData({
                        nome: pending.name,
                        email: pending.email || '',
                        microregiaoId: pending.microregiaoId,
                        municipio: pending.municipio || '',
                      });
                      setEditingUser(null);
                      setShowUserModal(true);
                    }}
                    onDelete={async (pending) => {
                      try {
                        await deletePendingRegistration(pending.id);
                        showToast(`"${pending.name}" excluído com sucesso`, 'success');
                        await loadPending(); // Recarrega lista
                      } catch (error: any) {
                        showToast(error?.message || 'Erro ao excluir', 'error');
                      }
                    }}
                  />
                )}

                {/* User List */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {isLoading ? (
                    <div className="p-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                      Carregando usuários...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Nenhum usuário encontrado
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredUsers.map(user => {
                        const microrregiao = getMicroregiaoById(user.microregiaoId);
                        const isExpanded = expandedUserId === user.id;

                        return (
                          <div key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.ativo ? 'bg-teal-100 dark:bg-teal-900/30' : 'bg-slate-100 dark:bg-slate-700'
                                  }`}>
                                  {user.ativo ? (
                                    <UserCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                  ) : (
                                    <UserX className="w-5 h-5 text-slate-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-slate-800 dark:text-slate-100">{user.nome}</span>
                                    {getRoleBadge(user.role)}
                                    {!user.ativo && (
                                      <span className="text-xs text-red-500 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">INATIVO</span>
                                    )}
                                    {!user.lgpdConsentimento && user.ativo && (
                                      <span className="text-xs text-purple-500 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded">LGPD PENDENTE</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                  {user.municipio && (
                                    <div className="text-sm font-bold text-teal-600 dark:text-teal-400 mb-0.5">
                                      {user.municipio}
                                    </div>
                                  )}
                                  <div className={`text-xs ${user.municipio ? 'text-slate-500 font-medium' : 'text-sm font-medium text-slate-700 dark:text-slate-300'}`}>
                                    {user.microregiaoId === 'all' ? 'Todas' : microrregiao?.nome || '-'}
                                  </div>
                                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                                    {user.microregiaoId === 'all' ? 'Microrregiões' : microrregiao?.macrorregiao || '-'}
                                  </div>
                                </div>

                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      if (isExpanded) {
                                        setExpandedUserId(null);
                                        setDropdownPosition(null);
                                      } else {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const spaceBelow = window.innerHeight - rect.bottom;
                                        const openUp = spaceBelow < 200;  // Se tem menos de 200px abaixo, abre pra cima
                                        setDropdownPosition({
                                          top: openUp ? rect.top : rect.bottom,
                                          left: rect.right - 192,  // 192 = w-48 (12rem = 192px)
                                          openUp
                                        });
                                        setExpandedUserId(user.id);
                                      }
                                    }}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                  >
                                    <MoreVertical className="w-4 h-4 text-slate-400" />
                                  </button>

                                  {isExpanded && dropdownPosition && (
                                    <div
                                      className="fixed w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50"
                                      style={{
                                        top: dropdownPosition.openUp ? 'auto' : dropdownPosition.top,
                                        bottom: dropdownPosition.openUp ? (window.innerHeight - dropdownPosition.top) : 'auto',
                                        left: Math.max(8, dropdownPosition.left),  // Garante pelo menos 8px da borda
                                      }}
                                    >
                                      <button
                                        onClick={() => {
                                          handleEditUser(user);
                                          setExpandedUserId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                                      >
                                        Editar usuário
                                      </button>
                                      {user.microregiaoId !== 'all' && (
                                        <button
                                          onClick={() => {
                                            handleViewMicrorregiao(user.microregiaoId);
                                            setExpandedUserId(null);
                                          }}
                                          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-teal-600 dark:text-teal-400"
                                        >
                                          Ver microrregião
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          handleToggleUserStatus(user.id);
                                          setExpandedUserId(null);
                                        }}
                                        disabled={actionLoadingId === user.id}
                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${user.ativo ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                          }`}
                                      >
                                        {user.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                                      </button>
                                      {/* Botão Excluir - apenas para SuperAdmin e não pode excluir superadmin */}
                                      {isSuperAdmin && user.role !== 'superadmin' && (
                                        <button
                                          onClick={() => {
                                            setConfirmDelete({ open: true, user });
                                            setExpandedUserId(null);
                                          }}
                                          disabled={actionLoadingId === user.id}
                                          className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border-t border-slate-100 dark:border-slate-700"
                                        >
                                          Excluir permanentemente
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )
          }

          {/* Tab: Microrregiões */}
          {
            activeTab === 'microregioes' && (
              <>
                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  {/* 1. Macro Filter */}
                  <div className="relative min-w-[200px]">
                    <select
                      value={filterMacro}
                      onChange={(e) => setFilterMacro(e.target.value)}
                      className="w-full appearance-none pl-4 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    >
                      <option value="all">Todas Macrorregiões</option>
                      {getMacrorregioes().map(macro => (
                        <option key={macro} value={macro}>{macro}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>

                  {/* 2. Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar microrregião..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Microrregião Grid */}
                <div className="space-y-8">
                  {Array.from(new Set(filteredMicroregioes.map(m => m.macrorregiao))).map(macroName => {
                    const microsInMacro = filteredMicroregioes.filter(m => m.macrorregiao === macroName);
                    if (microsInMacro.length === 0) return null;

                    return (
                      <div key={macroName} className="animate-in fade-in duration-500">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 px-1 border-l-4 border-teal-500 pl-3 flex items-center gap-2">
                          {macroName}
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            {microsInMacro.length}
                          </span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {microsInMacro.map(micro => {
                            const usersCount = users.filter(u => u.microregiaoId === micro.id).length;
                            const microActions = actions.filter(a => a.microregiaoId === micro.id);
                            const progressoMedio = microActions.length > 0
                              ? Math.round(microActions.reduce((sum, a) => sum + a.progress, 0) / microActions.length)
                              : 0;
                            const atrasadas = microActions.filter(a => {
                              if (a.status === 'Concluído') return false;
                              return new Date(a.plannedEndDate) < new Date();
                            }).length;

                            return (
                              <div
                                key={micro.id}
                                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-all hover:scale-[1.02] group"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                      <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <h3 className="font-medium text-slate-800 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                        {micro.nome}
                                      </h3>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">{micro.macrorregiao}</p>
                                    </div>
                                  </div>
                                  <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{micro.codigo}</span>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg py-1.5">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Ações</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{microActions.length}</p>
                                  </div>
                                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg py-1.5">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Progresso</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                      {microActions.length > 0 ? `${progressoMedio}%` : '-'}
                                    </p>
                                  </div>
                                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg py-1.5">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Usuários</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{usersCount}</p>
                                  </div>
                                </div>

                                {/* Progress bar */}
                                {microActions.length > 0 && (
                                  <div className="mb-3">
                                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                      <div
                                        className="h-full transition-all bg-teal-500"
                                        style={{ width: `${progressoMedio}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Alerts */}
                                {atrasadas > 0 && (
                                  <div className="mb-3 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                                    <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-500" />
                                    {atrasadas} ação(ões) atrasada(s)
                                  </div>
                                )}

                                <button
                                  onClick={() => handleViewMicrorregiao(micro.id)}
                                  className="w-full text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 font-medium py-2 rounded-lg transition-colors"
                                >
                                  Visualizar painel →
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          }

          {/* Tab: Ranking */}
          {
            activeTab === 'ranking' && (
              <RankingPanel
                actions={actions}
                onViewMicrorregiao={handleViewMicrorregiao}
              />
            )
          }

        </main >

        {/* Modal de Usuário */}
        {
          showUserModal && (
            <UserFormModal
              user={editingUser}
              onClose={() => {
                setShowUserModal(false);
                setPendingUserData(null); // Limpa dados de pendente ao fechar
              }}
              onSave={async (userData) => {
                await handleSaveUser(userData);
                setPendingUserData(null); // Limpa após salvar
                await loadPending(); // Recarrega lista de pendentes
              }}
              isSaving={actionLoadingId === 'save-user'}
              fullScreen={isMobile || isTablet}
              initialData={pendingUserData || undefined}
            />
          )
        }

        {/* Confirmar ativação/desativação */}
        <ConfirmModal
          isOpen={confirmToggle.open}
          onCancel={() => setConfirmToggle({ open: false })}
          onConfirm={async () => {
            if (!confirmToggle.user || confirmToggle.nextStatus === undefined) return;
            try {
              setActionLoadingId(confirmToggle.user.id);
              await authService.updateUser(confirmToggle.user.id, { ativo: confirmToggle.nextStatus });
              showToast(`Usuário ${confirmToggle.nextStatus ? 'ativado' : 'desativado'}`, 'success');
              await loadUsers();
            } catch (error) {
              logError('AdminPanel', 'Erro ao atualizar status do usuário', error);
              showToast('Erro ao atualizar usuário', 'error');
            } finally {
              setActionLoadingId(null);
            }
          }}
          title={confirmToggle.nextStatus ? 'Ativar usuário' : 'Desativar usuário'}
          message={
            confirmToggle.user
              ? `Tem certeza que deseja ${confirmToggle.nextStatus ? 'ativar' : 'desativar'} ${confirmToggle.user.nome}?`
              : ''
          }
          confirmText={confirmToggle.nextStatus ? 'Ativar' : 'Desativar'}
          confirmType={confirmToggle.nextStatus ? 'info' : 'danger'}
        />

        {/* Confirmar exclusão permanente */}
        <ConfirmModal
          isOpen={confirmDelete.open}
          onCancel={() => setConfirmDelete({ open: false })}
          onConfirm={async () => {
            if (!confirmDelete.user) return;
            try {
              setActionLoadingId(confirmDelete.user.id);
              await authService.deleteUser(confirmDelete.user.id);
              showToast('Usuário excluído permanentemente', 'success');
              await loadUsers();
              setConfirmDelete({ open: false });
            } catch (error: any) {
              logError('AdminPanel', 'Erro ao excluir usuário', error);
              showToast(error?.message || 'Erro ao excluir usuário', 'error');
            } finally {
              setActionLoadingId(null);
            }
          }}
          title="Excluir usuário permanentemente"
          message={
            confirmDelete.user
              ? `ATENÇÃO: Esta ação é IRREVERSÍVEL! O usuário "${confirmDelete.user.nome}" será excluído permanentemente do sistema. Tem certeza?`
              : ''
          }
          confirmText="Sim, excluir permanentemente"
          confirmType="danger"
        />

        {/* Overlay para fechar menu expandido */}
        {
          expandedUserId && (
            <div
              className="fixed inset-0 z-0"
              onClick={() => setExpandedUserId(null)}
            />
          )
        }
      </div>


      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        initialTab={settingsInitialTab}
        mode={settingsMode}
      />

    </div>
  );
}

