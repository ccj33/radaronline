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
  Download
} from 'lucide-react';
import { useAuth } from '../../auth';
import { User } from '../../types/auth.types';
import { Action, TeamMember } from '../../types';
import { MICROREGIOES, getMicroregiaoById, getMacrorregioes } from '../../data/microregioes';
import * as authService from '../../services/authService';
import { UserFormModal } from './UserFormModal';
import {
  AdminOverview,
  MacroRegionMap,
  AlertsPanel,
  RankingPanel,
  ActivityLog,
  ActivityCenter,
} from './dashboard';
import { ConfirmModal, StatsCard, useToast } from '../../components/common';
import { log, logError } from '../../lib/logger';

type TabType = 'dashboard' | 'usuarios' | 'microregioes' | 'alertas' | 'ranking' | 'atividades';

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
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{ open: boolean; user?: User | null; nextStatus?: boolean }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; user?: User | null }>({ open: false });

  // Carrega usuários
  useEffect(() => {
    loadUsers();
  }, []);

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
      return matchSearch && matchRole;
    });
  }, [users, searchTerm, filterRole]);

  // Filtrar microrregiões
  const filteredMicroregioes = MICROREGIOES.filter(m => {
    const matchSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMacro = filterMacro === 'all' || m.macrorregiao === filterMacro;
    return matchSearch && matchMacro;
  });

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

  const handleSaveUser = async (userData: Partial<User> & { senha?: string }) => {
    setActionLoadingId('save-user'); // ✅ FORA do try para garantir reset

    try {
      if (editingUser) {
        await authService.updateUser(editingUser.id, userData);
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
    { id: 'atividades' as TabType, label: 'Atividades', icon: Activity, count: null },
    { id: 'usuarios' as TabType, label: 'Usuários', icon: Users, count: users.length },
    { id: 'microregioes' as TabType, label: 'Microrregiões', icon: MapPin, count: MICROREGIOES.length },
    { id: 'alertas' as TabType, label: 'Alertas', icon: AlertTriangle, count: null },
    { id: 'ranking' as TabType, label: 'Ranking', icon: Trophy, count: null },
  ];

  const kpis = useMemo(() => {
    const total = users.length;
    const ativos = users.filter(u => u.ativo).length;
    const inativos = total - ativos;
    const admins = users.filter(u => u.role === 'admin').length;
    const gestores = users.filter(u => u.role === 'gestor').length;
    return { total, ativos, inativos, admins, gestores };
  }, [users]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-center max-w-sm">
          <Shield className="w-10 h-10 text-purple-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Acesso restrito</h2>
          <p className="text-sm text-slate-500 mt-1">Apenas administradores podem acessar este painel.</p>
          <button
            onClick={onBack}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Premium com Gradiente */}
      <header className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 sticky top-0 z-10 shadow-lg">
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
              {activeTab === 'usuarios' && (
                <button
                  onClick={handleCreateUser}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-teal-700 rounded-lg font-semibold transition-all hover:shadow-lg hover:scale-[1.02]"
                >
                  <Plus className="w-4 h-4" />
                  Novo Usuário
                </button>
              )}

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
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Modernizadas */}
      <div className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide py-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 rounded-lg ${activeTab === tab.id
                  ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== null && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full font-semibold ${activeTab === tab.id
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-200 text-slate-600'
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
        {/* KPI cards coloridos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Usuários - Indigo */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:shadow-indigo-500/10 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-2xl font-bold text-indigo-600">{kpis.total}</span>
            </div>
            <p className="text-sm font-semibold text-slate-700">Usuários</p>
            <p className="text-xs text-slate-400">Total cadastrado</p>
          </div>

          {/* Ativos - Emerald */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:shadow-emerald-500/10 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-2xl font-bold text-emerald-600">{kpis.ativos}</span>
            </div>
            <p className="text-sm font-semibold text-slate-700">Ativos</p>
            <p className="text-xs text-slate-400">{kpis.inativos} inativos</p>
          </div>

          {/* Admins - Purple */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:shadow-purple-500/10 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-purple-600">{kpis.admins}</span>
            </div>
            <p className="text-sm font-semibold text-slate-700">Admins</p>
            <p className="text-xs text-slate-400">{kpis.gestores} gestores</p>
          </div>

          {/* Microrregiões - Amber */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:shadow-amber-500/10 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MapPin className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-amber-600">{MICROREGIOES.length}</span>
            </div>
            <p className="text-sm font-semibold text-slate-700">Microrregiões</p>
            <p className="text-xs text-slate-400">Cobertura total</p>
          </div>
        </div>

        {/* Tab: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Overview com KPIs */}
            <AdminOverview
              actions={actions}
              users={users}
              teams={teams}
            />

            {/* Grid com Alertas e Activity Log */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AlertsPanel
                actions={actions}
                users={users}
                onViewMicrorregiao={handleViewMicrorregiao}
              />
              <ActivityLog maxItems={8} />
            </div>

            {/* Mapa de Microrregiões */}
            <MacroRegionMap
              actions={actions}
              onViewMicrorregiao={handleViewMicrorregiao}
            />
          </div>
        )}

        {/* Tab: Atividades */}
        {activeTab === 'atividades' && (
          <div className="space-y-6">
            <ActivityCenter />
          </div>
        )}

        {/* Tab: Usuários */}
        {activeTab === 'usuarios' && (
          <>
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                >
                  <option value="all">Todos os papéis</option>
                  <option value="admin">Administrador</option>
                  <option value="gestor">Gestor</option>
                  <option value="usuario">Usuário</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* User List */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
                <div className="divide-y divide-slate-100">
                  {filteredUsers.map(user => {
                    const microrregiao = getMicroregiaoById(user.microregiaoId);
                    const isExpanded = expandedUserId === user.id;

                    return (
                      <div key={user.id} className="hover:bg-slate-50 transition-colors">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.ativo ? 'bg-teal-100' : 'bg-slate-100'
                              }`}>
                              {user.ativo ? (
                                <UserCheck className="w-5 h-5 text-teal-600" />
                              ) : (
                                <UserX className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-800">{user.nome}</span>
                                {getRoleBadge(user.role)}
                                {!user.ativo && (
                                  <span className="text-xs text-red-500 font-medium bg-red-50 px-1.5 py-0.5 rounded">INATIVO</span>
                                )}
                                {!user.lgpdConsentimento && user.ativo && (
                                  <span className="text-xs text-purple-500 font-medium bg-purple-50 px-1.5 py-0.5 rounded">LGPD PENDENTE</span>
                                )}
                              </div>
                              <div className="text-sm text-slate-500">{user.email}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                              <div className="text-sm font-medium text-slate-700">
                                {user.microregiaoId === 'all' ? 'Todas' : microrregiao?.nome || '-'}
                              </div>
                              <div className="text-xs text-slate-400">
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
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <MoreVertical className="w-4 h-4 text-slate-400" />
                              </button>

                              {isExpanded && dropdownPosition && (
                                <div
                                  className="fixed w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
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
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                                  >
                                    Editar usuário
                                  </button>
                                  {user.microregiaoId !== 'all' && (
                                    <button
                                      onClick={() => {
                                        handleViewMicrorregiao(user.microregiaoId);
                                        setExpandedUserId(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 text-teal-600"
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
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${user.ativo ? 'text-red-600' : 'text-green-600'
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
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 border-t border-slate-100"
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
        )}

        {/* Tab: Microrregiões */}
        {activeTab === 'microregioes' && (
          <>
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar microrregião..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <select
                  value={filterMacro}
                  onChange={(e) => setFilterMacro(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                >
                  <option value="all">Todas macrorregiões</option>
                  {getMacrorregioes().map(macro => (
                    <option key={macro} value={macro}>{macro}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Microrregião Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMicroregioes.map(micro => {
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
                    className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all hover:scale-[1.02] group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-800 group-hover:text-teal-600 transition-colors">
                            {micro.nome}
                          </h3>
                          <p className="text-xs text-slate-500">{micro.macrorregiao}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-400">{micro.codigo}</span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                      <div className="bg-slate-50 rounded-lg py-1.5">
                        <p className="text-xs text-slate-500">Ações</p>
                        <p className="text-sm font-bold text-slate-700">{microActions.length}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg py-1.5">
                        <p className="text-xs text-slate-500">Progresso</p>
                        <p className="text-sm font-bold text-slate-700">
                          {microActions.length > 0 ? `${progressoMedio}%` : '-'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg py-1.5">
                        <p className="text-xs text-slate-500">Usuários</p>
                        <p className="text-sm font-bold text-slate-700">{usersCount}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {microActions.length > 0 && (
                      <div className="mb-3">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all bg-teal-500"
                            style={{ width: `${progressoMedio}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Alerts */}
                    {atrasadas > 0 && (
                      <div className="mb-3 flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        {atrasadas} ação(ões) atrasada(s)
                      </div>
                    )}

                    <button
                      onClick={() => handleViewMicrorregiao(micro.id)}
                      className="w-full text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50 font-medium py-2 rounded-lg transition-colors"
                    >
                      Visualizar painel →
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Tab: Alertas */}
        {activeTab === 'alertas' && (
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
        )}

        {/* Tab: Ranking */}
        {activeTab === 'ranking' && (
          <RankingPanel
            actions={actions}
            onViewMicrorregiao={handleViewMicrorregiao}
          />
        )}
      </main>

      {/* Modal de Usuário */}
      {showUserModal && (
        <UserFormModal
          user={editingUser}
          onClose={() => setShowUserModal(false)}
          onSave={handleSaveUser}
          isSaving={actionLoadingId === 'save-user'}
        />
      )}

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
      {expandedUserId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setExpandedUserId(null)}
        />
      )}
    </div>
  );
}



