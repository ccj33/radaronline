import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  MapPin,
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
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../auth';
import { User } from '../../types/auth.types';
import { Action, TeamMember } from '../../types';
import { MICROREGIOES, MACRORREGIOES, getMicroregiaoById, getMacrorregioes, getMicroregioesByMacro } from '../../data/microregioes';
import * as authService from '../../services/authService';
import { saveUserMunicipality, loadPendingRegistrations, deletePendingRegistration, PendingRegistration } from '../../services/dataService';
import { UserFormModal } from './UserFormModal';
import {
  AdminOverview,
  MacroRegionMap,
  AlertsPanel,
  RankingPanel,
  ActivityLog,
  ActivityCenter,
  DashboardFilters,
  ComparisonEngine,
  defaultFiltersState,
  DashboardFiltersState,
  PendingRegistrationsPanel,
} from './dashboard';
import { AnalyticsDashboard } from './dashboard/AnalyticsDashboard';
import { ConfirmModal, StatsCard, useToast } from '../../components/common';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { log, logError } from '../../lib/logger';

type TabType = 'dashboard' | 'usuarios' | 'microregioes' | 'alertas' | 'ranking' | 'atividades' | 'analytics';

interface AdminPanelProps {
  onBack?: () => void;
  actions?: Action[];
  teams?: Record<string, TeamMember[]>;
}

export function AdminPanel(props: AdminPanelProps) {
  const { onBack, actions = [], teams = {} } = props;
  const { user: currentUser, setViewingMicrorregiao, isAdmin, isSuperAdmin } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
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

  // Carrega usuários
  useEffect(() => {
    loadUsers();
    loadPending();
  }, []);

  const loadPending = async () => {
    setPendingLoading(true);
    try {
      const pending = await loadPendingRegistrations();
      setPendingRegistrations(pending);
    } catch (error) {
      console.error('Erro ao carregar pendentes:', error);
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
      console.error(error);
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
        if (!user.microregiaoId || user.microregiaoId === 'all') return { macro: 'ZZZ', micro: 'ZZZ' }; // Put 'all' at the bottom
        const micro = getMicroregiaoById(user.microregiaoId);
        return micro ? { macro: micro.macrorregiao, micro: micro.nome } : { macro: 'ZZZ', micro: 'ZZZ' };
      };

      const infoA = getRegionInfo(a);
      const infoB = getRegionInfo(b);

      // 1. Sort by Macro
      if (infoA.macro !== infoB.macro) return infoA.macro.localeCompare(infoB.macro);

      // 2. Sort by Micro
      if (infoA.micro !== infoB.micro) return infoA.micro.localeCompare(infoB.micro);

      // 3. Sort by Name
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

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard, count: null },
    { id: 'microregioes' as TabType, label: 'Microrregiões', icon: MapPin, count: MICROREGIOES.length },
    { id: 'atividades' as TabType, label: 'Atividades', icon: Activity, count: null },
    { id: 'usuarios' as TabType, label: 'Usuários', icon: Users, count: users.length },
    { id: 'alertas' as TabType, label: 'Alertas', icon: AlertTriangle, count: null },
    { id: 'ranking' as TabType, label: 'Ranking', icon: Trophy, count: null },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3, count: null },
  ];

  const kpis = useMemo(() => {
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Header Premium com Gradiente */}
      <header className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 dark:from-teal-900 dark:via-teal-800 dark:to-emerald-900 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Voltar ao painel"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    Painel Administrativo
                  </h1>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isSuperAdmin
                    ? 'bg-purple-400/30 text-purple-100 border border-purple-300/40'
                    : 'bg-white/20 text-white/90 border border-white/30'
                    }`}>
                    {isSuperAdmin ? '👑 SUPER ADMIN' : '🛡️ ADMIN'}
                  </span>
                </div>
                <p className="text-sm text-white/80 mt-0.5">
                  Central de comando para {MICROREGIOES.length} microrregiões de Minas Gerais
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">


              <button
                onClick={loadUsers}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Atualizar dados"
              >
                <RefreshCw className={`w-5 h-5 text-white ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Exportar relatório"
              >
                <Download className="w-5 h-5 text-white" />
              </button>

              <div className="ml-2 pl-2 border-l border-white/20">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Modernizadas */}
      <div className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide py-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 rounded-lg ${activeTab === tab.id
                  ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== null && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full font-semibold ${activeTab === tab.id
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

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
                  <MacroRegionMap
                    actions={actions}
                    onViewMicrorregiao={handleViewMicrorregiao}
                    selectedMacroId={dashboardFilters.selectedMacroId}
                    onRegionChange={(macroId) => setDashboardFilters(prev => ({
                      ...prev,
                      selectedMacroId: macroId,
                      selectedMicroId: null,
                      selectedMunicipioCode: null
                    }))}
                  />
                </AdminOverview>

                {/* Grid com Alertas e Activity Log */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AlertsPanel
                    actions={actions}
                    users={users}
                    onViewMicrorregiao={handleViewMicrorregiao}
                  />
                  <ActivityLog maxItems={8} />
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
              {/* Microrregião Grid - Grouped by Macro */}
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

        {/* Tab: Alertas */}
        {
          activeTab === 'alertas' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AlertsPanel
                  actions={actions}
                  users={users}
                  onViewMicrorregiao={handleViewMicrorregiao}
                />
              </div>
              <div>
                <ActivityLog maxItems={10} />
              </div>
            </div>
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

        {/* Tab: Analytics */}
        {
          activeTab === 'analytics' && (
            <AnalyticsDashboard />
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
            initialData={pendingUserData || undefined}
          />
        )
      }

      {/* Confirmar ativação/desativação */}
      <ConfirmModal
        isOpen={confirmToggle.open}
        onClose={() => setConfirmToggle({ open: false })}
        onConfirm={async () => {
          if (!confirmToggle.user || confirmToggle.nextStatus === undefined) return;
          try {
            setActionLoadingId(confirmToggle.user.id);
            await authService.updateUser(confirmToggle.user.id, { ativo: confirmToggle.nextStatus });
            showToast(`Usuário ${confirmToggle.nextStatus ? 'ativado' : 'desativado'}`, 'success');
            await loadUsers();
          } catch (error) {
            console.error(error);
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
        type={confirmToggle.nextStatus ? 'info' : 'danger'}
      />

      {/* Confirmar exclusão permanente */}
      <ConfirmModal
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false })}
        onConfirm={async () => {
          if (!confirmDelete.user) return;
          try {
            setActionLoadingId(confirmDelete.user.id);
            await authService.deleteUser(confirmDelete.user.id);
            showToast('Usuário excluído permanentemente', 'success');
            await loadUsers();
            setConfirmDelete({ open: false });
          } catch (error: any) {
            console.error(error);
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
        type="danger"
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
    </div >
  );
}



