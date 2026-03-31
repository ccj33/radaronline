import { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  MapPin,
  Megaphone,
  MoreVertical,
  Plus,
  RefreshCw,
  Shield,
  Target,
  Trophy,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import { NotificationBell } from '../../../components/common/NotificationBell';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { getMacrorregioes, getMicroregiaoById } from '../../../data/microregioes';
import { getUpcomingActions, isActionLate, summarizeActionPortfolio } from '../../../lib/actionPortfolio';
import { Action } from '../../../types';
import { User } from '../../../types/auth.types';
import {
  ActivityCenter,
  RankingPanel,
  RequestsManagement,
} from '../dashboard';
import { AnnouncementsManagement } from '../AnnouncementsManagement';
import { AdminPanelTab, PendingRegistration } from '../adminPanel.types';

const mobileAdminTabs = [
  { id: 'dashboard' as AdminPanelTab, icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'atividades' as AdminPanelTab, icon: Activity, label: 'Atividades' },
  { id: 'usuarios' as AdminPanelTab, icon: Users, label: 'Usuarios' },
  { id: 'ranking' as AdminPanelTab, icon: Trophy, label: 'Ranking' },
  { id: 'requests' as AdminPanelTab, icon: Bell, label: 'Pedidos' },
  { id: 'communication' as AdminPanelTab, icon: Megaphone, label: 'Mural' },
];

interface AdminMobileLayoutProps {
  activeTab: AdminPanelTab;
  isSuperAdmin: boolean;
  isLoading: boolean;
  searchTerm: string;
  userFilterMacro: string;
  users: User[];
  filteredUsers: User[];
  actions: Action[];
  pendingRegistrations: PendingRegistration[];
  expandedUserId: string | null;
  getRoleBadge: (role: User['role']) => ReactNode;
  onTabChange: (tab: AdminPanelTab) => void;
  onRefreshUsers: () => void | Promise<void>;
  onOpenMicroSelector: () => void;
  onViewMicrorregiao: (microId: string) => void;
  onSearchTermChange: (value: string) => void;
  onUserFilterMacroChange: (value: string) => void;
  onCreateUser: () => void;
  onOpenUserImport: () => void;
  onCreatePendingUser: (pending: PendingRegistration) => void;
  onToggleExpandedUser: (userId: string) => void;
  onEditUser: (user: User) => void;
  onRequestToggleUserStatus: (user: User) => void;
  onRequestDeleteUser: (user: User) => void;
}

export function AdminMobileLayout({
  activeTab,
  isSuperAdmin,
  isLoading,
  searchTerm,
  userFilterMacro,
  users,
  filteredUsers,
  actions,
  pendingRegistrations,
  expandedUserId,
  getRoleBadge,
  onTabChange,
  onRefreshUsers,
  onOpenMicroSelector,
  onViewMicrorregiao,
  onSearchTermChange,
  onUserFilterMacroChange,
  onCreateUser,
  onOpenUserImport,
  onCreatePendingUser,
  onToggleExpandedUser,
  onEditUser,
  onRequestToggleUserStatus,
  onRequestDeleteUser,
}: AdminMobileLayoutProps) {
  const today = new Date();
  const activeUsers = users.filter((user) => user.ativo !== false).length;
  const lgpdPendingCount = users.filter((user) => user.ativo && !user.lgpdConsentimento).length;
  const actionSummary = summarizeActionPortfolio(actions, today);
  const upcomingWeekActions = getUpcomingActions(actions, today, 7, 50);
  const overdueActions = actions
    .filter((action) => isActionLate(action, today))
    .sort((left, right) => {
      const leftDate = left.plannedEndDate ? new Date(`${left.plannedEndDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
      const rightDate = right.plannedEndDate ? new Date(`${right.plannedEndDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;

      return leftDate - rightDate;
    });

  const priorityActions = (overdueActions.length > 0 ? overdueActions : upcomingWeekActions).slice(0, 3);

  const formatDeadline = (dateValue?: string) => {
    if (!dateValue) {
      return 'Sem prazo';
    }

    const parsedDate = new Date(`${dateValue}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Sem prazo';
    }

    return parsedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const getDaysOverdue = (dateValue?: string) => {
    if (!dateValue) {
      return 0;
    }

    const plannedDate = new Date(`${dateValue}T00:00:00`);

    if (Number.isNaN(plannedDate.getTime())) {
      return 0;
    }

    return Math.max(0, Math.floor((today.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <header className="bg-white dark:bg-slate-900 sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Painel Admin</h1>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isSuperAdmin
                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onRefreshUsers}
              className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="px-3 py-4 space-y-4">
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              <button
                onClick={onOpenMicroSelector}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-2xl p-4 shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm text-white/80">Acessar microrregiao</p>
                    <p className="text-lg font-bold">Selecionar micro -&gt;</p>
                  </div>
                  <Target className="w-6 h-6 text-white/60" />
                </div>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>Usuarios ativos</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{activeUsers}</p>
                  <p className="text-xs text-slate-400 mt-1">{users.length} cadastrados</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Taxa conclusao</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{actionSummary.percentConcluido}%</p>
                  <p className="text-xs text-emerald-600 mt-1">{actionSummary.completed} concluidas</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Acoes atrasadas</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{actionSummary.late}</p>
                  <p className="text-xs text-slate-400 mt-1">{actionSummary.inProgress} em andamento</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Vencem em 7 dias</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{upcomingWeekActions.length}</p>
                  <p className="text-xs text-slate-400 mt-1">{actionSummary.notStarted} nao iniciadas</p>
                </div>
              </div>

              {pendingRegistrations.length > 0 && (
                <button
                  onClick={() => onTabChange('usuarios')}
                  className="w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800/50 rounded-lg flex items-center justify-center">
                      <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-amber-800 dark:text-amber-200">
                        {pendingRegistrations.length} cadastro{pendingRegistrations.length > 1 ? 's' : ''} pendente{pendingRegistrations.length > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Toque para revisar</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-amber-500" />
                  </div>
                </button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onTabChange('requests')}
                  className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-left active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                    <Bell className="w-3.5 h-3.5" />
                    <span>Triagem</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Pedidos e respostas</p>
                  <p className="text-xs text-slate-400 mt-1">Abrir central</p>
                </button>

                <button
                  onClick={() => onTabChange('atividades')}
                  className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-left active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Auditoria</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Ultimas atividades</p>
                  <p className="text-xs text-slate-400 mt-1">Ver historico</p>
                </button>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Clock3 className="w-4 h-4 text-rose-500" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Prioridades da semana</span>
                  </div>
                  <button
                    onClick={() => onTabChange('atividades')}
                    className="text-xs text-teal-600 dark:text-teal-400 font-medium"
                  >
                    Ver trilha
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  {priorityActions.length === 0 ? (
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                      Sem pendencias urgentes no momento. Operacao em ritmo estavel.
                    </div>
                  ) : (
                    priorityActions.map((action) => {
                      const micro = getMicroregiaoById(action.microregiaoId);
                      const isLate = isActionLate(action, today);
                      const dueDate = formatDeadline(action.plannedEndDate || action.endDate);
                      const daysOverdue = getDaysOverdue(action.plannedEndDate);

                      return (
                        <button
                          key={action.uid}
                          onClick={() => onViewMicrorregiao(action.microregiaoId)}
                          className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                            isLate
                              ? 'border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/20'
                              : 'border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">{action.title}</p>
                            <span className={`text-[10px] font-bold shrink-0 ${isLate ? 'text-red-600 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
                              {isLate ? `${daysOverdue}d atraso` : dueDate}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {micro?.nome || 'Microrregiao nao definida'}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Top Microrregioes</span>
                  </div>
                  <button
                    onClick={() => onTabChange('ranking')}
                    className="text-xs text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1"
                  >
                    Ver tudo
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <RankingPanel actions={actions} onViewMicrorregiao={onViewMicrorregiao} compact />
              </div>
            </div>
          )}

          {activeTab === 'usuarios' && (
            <div className="space-y-4">
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
                      <p className="text-xs text-amber-600 dark:text-amber-400">Aguardando criacao pelo admin</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {pendingRegistrations.slice(0, 3).map((pending) => {
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
                            <p className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{pending.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{micro?.nome || 'Sem micro'}</p>
                          </div>
                          <button
                            onClick={() => onCreatePendingUser(pending)}
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

              {lgpdPendingCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-purple-700 dark:text-purple-300">
                    <strong>{lgpdPendingCount}</strong> sem LGPD
                  </span>
                </div>
              )}

              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar usuario..."
                  value={searchTerm}
                  onChange={(event) => onSearchTermChange(event.target.value)}
                  className="w-full pl-4 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={userFilterMacro}
                  onChange={(event) => onUserFilterMacroChange(event.target.value)}
                  className="flex-1 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                >
                  <option value="all">Todas Macros</option>
                  {getMacrorregioes().map((macro) => (
                    <option key={macro} value={macro}>
                      {macro}
                    </option>
                  ))}
                </select>

                <button
                  onClick={onOpenUserImport}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 rounded-lg text-sm font-medium flex items-center gap-1.5 shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  Lote
                </button>

                {isSuperAdmin && (
                  <button
                    onClick={onCreateUser}
                    className="px-3 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Novo
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {filteredUsers.map((user) => {
                  const micro = getMicroregiaoById(user.microregiaoId);
                  const canManageUser =
                    isSuperAdmin || (user.role !== 'admin' && user.role !== 'superadmin');
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
                            <span className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{user.nome}</span>
                            {getRoleBadge(user.role)}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</p>
                          {micro && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{micro.nome}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {user.ativo && !user.lgpdConsentimento && (
                            <span title="LGPD pendente">
                              <Shield className="w-3.5 h-3.5 text-purple-400" />
                            </span>
                          )}
                          <span className={`w-2 h-2 rounded-full ${user.ativo !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                          <button
                            onClick={() => onToggleExpandedUser(user.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {expandedUserId === user.id && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                          {canManageUser ? (
                            <>
                              <button
                                onClick={() => onEditUser(user)}
                                className="flex-1 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => onRequestToggleUserStatus(user)}
                                className={`flex-1 py-2 text-xs font-medium rounded-lg ${
                                  user.ativo !== false
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                }`}
                              >
                                {user.ativo !== false ? 'Desativar' : 'Ativar'}
                              </button>
                            </>
                          ) : (
                            <div className="flex-1 py-2 text-center text-[11px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg">
                              Apenas Super Admin gerencia este perfil.
                            </div>
                          )}
                          {isSuperAdmin && user.role !== 'superadmin' && (
                            <button
                              onClick={() => onRequestDeleteUser(user)}
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
                    Nenhum usuario encontrado
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ranking' && <RankingPanel actions={actions} onViewMicrorregiao={onViewMicrorregiao} />}

          {activeTab === 'atividades' && <ActivityCenter />}

          {activeTab === 'requests' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[60vh]">
              <RequestsManagement />
            </div>
          )}

          {activeTab === 'communication' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[60vh]">
              <AnnouncementsManagement />
            </div>
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 safe-area-bottom">
        <div className="flex items-stretch justify-around max-w-lg mx-auto">
          {mobileAdminTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const hasBadge = tab.id === 'requests' && pendingRegistrations.length > 0;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-2 px-1 min-h-[56px] transition-all ${
                  isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'
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
