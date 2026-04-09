import { useEffect, useMemo, useState, type MouseEvent } from 'react';

import { useAuth } from '../../auth';
import { useToast } from '../../components/common/Toast';
import { MICROREGIOES, getMicroregiaoById } from '../../data/microregioes';
import { useResponsive } from '../../hooks/useResponsive';
import {
  canAssignAdminRole,
  canManageAdminTarget,
  getAdminRoleAssignmentError,
  getAdminTargetManagementError,
} from '../../lib/adminRolePolicy';
import { log, logError } from '../../lib/logger';
import { canUseAdminUserImport } from '../../services/adminUserImportService';
import * as authService from '../../services/authService';
import type { UserImportCommitResponse } from '../../services/adminUsersApi';
import {
  deletePendingRegistration,
  linkProfileToTeamRecords,
  loadPendingRegistrations,
  saveUserMunicipality,
  type PendingRegistration,
} from '../../services/teamsService';
import type { Activity as ActivityType, Objective } from '../../types';
import type { User } from '../../types/auth.types';
import {
  type AdminDeleteState,
  type AdminDropdownPosition,
  type AdminPanelTab as TabType,
  type AdminToggleState,
  type AdminUserPayload,
  type PendingUserData,
} from './adminPanel.types';
import { defaultFiltersState, type DashboardFiltersState } from './dashboard';

interface UseAdminPanelControllerParams {
  activities: Record<number, ActivityType[]>;
  objectives: Objective[];
  onBack?: () => void;
}

export function useAdminPanelController({ activities, objectives, onBack }: UseAdminPanelControllerParams) {
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
  const [userFilterMacro, setUserFilterMacro] = useState<string>('all');
  const [userFilterMicro, setUserFilterMicro] = useState<string>('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUserImportModal, setShowUserImportModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<AdminDropdownPosition | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<AdminToggleState>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<AdminDeleteState>({ open: false });
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFiltersState>(defaultFiltersState);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<PendingUserData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMobileMicroId, setSelectedMobileMicroId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [selectedObjective, setSelectedObjective] = useState<number>(objectives[0]?.id || 1);
  const [selectedActivity, setSelectedActivity] = useState<string>(activities[objectives[0]?.id]?.[0]?.id || '1.1');
  const [currentNav, setCurrentNav] = useState<'strategy' | 'home' | 'settings'>('strategy');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'appearance'>('profile');
  const [settingsMode, setSettingsMode] = useState<'settings' | 'avatar'>('settings');
  const canImportUsers = canUseAdminUserImport();

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

  useEffect(() => {
    void loadUsers();
    void loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        const matchSearch = user.nome.toLowerCase().includes(searchTerm.toLowerCase())
          || user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchRole = filterRole === 'all' || user.role === filterRole;

        let matchRegion = true;
        if (userFilterMacro !== 'all') {
          const micro = user.microregiaoId && user.microregiaoId !== 'all' ? getMicroregiaoById(user.microregiaoId) : null;
          if (!micro || micro.macrorregiao !== userFilterMacro) {
            matchRegion = false;
          }
        }
        if (matchRegion && userFilterMicro !== 'all' && user.microregiaoId !== userFilterMicro) {
          matchRegion = false;
        }

        return matchSearch && matchRole && matchRegion;
      })
      .sort((userA, userB) => {
        const getRegionInfo = (user: User) => {
          if (!user.microregiaoId || user.microregiaoId === 'all') {
            return { macro: 'ZZZ', micro: ' Minas Gerais (Global)' };
          }

          const micro = getMicroregiaoById(user.microregiaoId);
          return micro ? { macro: micro.macrorregiao, micro: micro.nome } : { macro: 'ZZZ', micro: 'ZZZ' };
        };

        const infoA = getRegionInfo(userA);
        const infoB = getRegionInfo(userB);
        const microComparison = infoA.micro.localeCompare(infoB.micro);
        if (microComparison !== 0) {
          return microComparison;
        }

        return userA.nome.localeCompare(userB.nome);
      });
  }, [filterRole, searchTerm, userFilterMacro, userFilterMicro, users]);

  const filteredMicroregioes = useMemo(() => {
    return MICROREGIOES.filter((micro) => {
      const matchSearch = micro.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMacro = filterMacro === 'all' || micro.macrorregiao === filterMacro;
      return matchSearch && matchMacro;
    }).sort((microA, microB) => {
      if (microA.macrorregiao !== microB.macrorregiao) {
        return microA.macrorregiao.localeCompare(microB.macrorregiao);
      }
      return microA.nome.localeCompare(microB.nome);
    });
  }, [filterMacro, searchTerm]);

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  const handleOpenUserImport = () => {
    if (!canImportUsers) {
      showToast(
        'A importacao em lote esta indisponivel porque o backend novo nao esta ativo e o fluxo legado foi desativado.',
        'error'
      );
      return;
    }

    setShowUserImportModal(true);
  };

  const handleEditUser = (user: User) => {
    if (!canManageAdminTarget(currentUser?.role, user.role)) {
      showToast(getAdminTargetManagementError(user.role), 'error');
      return;
    }

    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleToggleUserStatus = async (userId: string) => {
    const user = users.find((item) => item.id === userId);
    if (!user) {
      return;
    }

    if (!canManageAdminTarget(currentUser?.role, user.role)) {
      showToast(getAdminTargetManagementError(user.role), 'error');
      return;
    }

    setConfirmToggle({ open: true, user, nextStatus: !user.ativo });
  };

  const handleViewMicrorregiao = (microregiaoId: string) => {
    setViewingMicrorregiao(microregiaoId);
    onBack?.();
  };

  const handleSaveUser = async (userData: AdminUserPayload) => {
    setActionLoadingId('save-user');

    try {
      const targetRole = editingUser?.role;
      if (targetRole && !canManageAdminTarget(currentUser?.role, targetRole)) {
        showToast(getAdminTargetManagementError(targetRole), 'error');
        setActionLoadingId(null);
        return;
      }

      const requestedRole = (userData.role || editingUser?.role) as User['role'] | undefined;
      if (requestedRole && !canAssignAdminRole(currentUser?.role, requestedRole)) {
        showToast(getAdminRoleAssignmentError(requestedRole), 'error');
        setActionLoadingId(null);
        return;
      }

      if (editingUser) {
        await authService.updateUser(editingUser.id, userData);

        if (userData.municipio && userData.email) {
          await saveUserMunicipality(
            userData.microregiaoId || editingUser.microregiaoId,
            userData.email,
            userData.municipio,
            userData.nome || editingUser.nome,
          );
        }

        showToast('Usuário atualizado', 'success');
      } else {
        if (!userData.nome || !userData.email || !userData.senha) {
          showToast('Preencha todos os campos obrigatórios', 'error');
          setActionLoadingId(null);
          return;
        }

        log('[AdminPanel]', 'Iniciando criação de usuário...');
        await authService.createUser({
          createdBy: currentUser?.id,
          email: userData.email,
          microregiaoId: userData.microregiaoId,
          nome: userData.nome,
          role: userData.role || 'usuario',
          senha: userData.senha,
        });

        await linkProfileToTeamRecords(userData.email);

        if (userData.municipio) {
          await saveUserMunicipality(
            userData.microregiaoId!,
            userData.email!,
            userData.municipio,
            userData.nome!,
          );
        }

        log('[AdminPanel]', 'Usuário criado com sucesso');
        showToast('Usuário criado', 'success');
      }

      await loadUsers();
      setShowUserModal(false);
    } catch (error: any) {
      logError('[AdminPanel]', 'Erro ao salvar usuário:', error);
      const errorMessage = error?.message || 'Erro desconhecido. Tente novamente ou contate o suporte.';
      showToast(errorMessage, 'error');
    } finally {
      setActionLoadingId(null);
      log('[AdminPanel]', 'Loading resetado');
    }
  };

  const handleCloseUserModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    setPendingUserData(null);
  };

  const handleCloseUserImportModal = () => {
    setShowUserImportModal(false);
  };

  const handleSaveUserFromModal = async (userData: AdminUserPayload) => {
    await handleSaveUser(userData);
    setPendingUserData(null);
    await loadPending();
  };

  const handleConfirmToggleStatus = async () => {
    if (!confirmToggle.user || confirmToggle.nextStatus === undefined) {
      return;
    }

    try {
      setActionLoadingId(confirmToggle.user.id);
      setConfirmToggle({ open: false });
      await authService.updateUser(confirmToggle.user.id, { ativo: confirmToggle.nextStatus });
      showToast(`Usuário ${confirmToggle.nextStatus ? 'ativado' : 'desativado'}`, 'success');
      await loadUsers();
    } catch (error) {
      logError('AdminPanel', 'Erro ao atualizar status do usuário', error);
      showToast('Erro ao atualizar usuário', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!confirmDelete.user) {
      return;
    }

    if (currentUser?.role !== 'superadmin') {
      setConfirmDelete({ open: false });
      showToast('Apenas Super Admin pode excluir usuarios.', 'error');
      return;
    }

    if (confirmDelete.user.role === 'superadmin') {
      setConfirmDelete({ open: false });
      showToast('Super Admin nao pode excluir outro Super Admin.', 'error');
      return;
    }

    try {
      setActionLoadingId(confirmDelete.user.id);
      setConfirmDelete({ open: false });
      await authService.deleteUser(confirmDelete.user.id);
      showToast(isMobile || isTablet ? 'Usuário excluído' : 'Usuário excluído permanentemente', 'success');
      await loadUsers();
    } catch (error: any) {
      logError('AdminPanel', 'Erro ao excluir usuário', error);
      showToast(error?.message || 'Erro ao excluir usuário', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDesktopUserFilterMacroChange = (value: string) => {
    setUserFilterMacro(value);
    setUserFilterMicro('all');
  };

  const handleDesktopUserFilterMicroChange = (selectedMicroId: string) => {
    setUserFilterMicro(selectedMicroId);

    if (selectedMicroId !== 'all') {
      const micro = MICROREGIOES.find((item) => item.id === selectedMicroId);
      if (micro) {
        setUserFilterMacro(micro.macrorregiao);
      }
      return;
    }

    setUserFilterMacro('all');
  };

  const handleOpenPendingUserCreation = (pending: PendingRegistration) => {
    setPendingUserData({
      email: pending.email || '',
      microregiaoId: pending.microregiaoId,
      municipio: pending.municipio || '',
      nome: pending.name,
    });
    setEditingUser(null);
    setShowUserModal(true);
  };

  const handleDeletePendingRegistrationRequest = async (pending: PendingRegistration) => {
    try {
      await deletePendingRegistration(pending.id);
      showToast(`"${pending.name}" excluído com sucesso`, 'success');
      await loadPending();
    } catch (error: any) {
      showToast(error?.message || 'Erro ao excluir', 'error');
    }
  };

  const handleUsersImported = async (result: UserImportCommitResponse) => {
    await loadUsers();
    setShowUserImportModal(false);

    if (result.summary.created === 0) {
      showToast('Nenhuma linha pronta foi importada. Revise a previa e tente novamente.', 'warning');
      return;
    }

    const summaryMessage = `${result.summary.created} usuario(s) criado(s), ${result.summary.skipped} pulado(s) e ${result.summary.failed} falha(s).`;
    showToast(summaryMessage, result.summary.failed > 0 ? 'warning' : 'success');
  };

  const handleToggleDesktopUserMenu = (event: MouseEvent<HTMLButtonElement>, userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setDropdownPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 200;

    setDropdownPosition({
      left: rect.right - 192,
      openUp,
      top: openUp ? rect.top : rect.bottom,
    });
    setExpandedUserId(userId);
  };

  const handleEditDesktopUser = (user: User) => {
    handleEditUser(user);
    setExpandedUserId(null);
  };

  const handleViewDesktopUserMicroregion = (microregiaoId: string) => {
    handleViewMicrorregiao(microregiaoId);
    setExpandedUserId(null);
  };

  const handleToggleDesktopUserStatus = (userId: string) => {
    void handleToggleUserStatus(userId);
    setExpandedUserId(null);
  };

  const handleRequestDesktopUserDelete = (user: User) => {
    if (currentUser?.role !== 'superadmin') {
      showToast('Apenas Super Admin pode excluir usuarios.', 'error');
      return;
    }

    if (user.role === 'superadmin') {
      showToast('Super Admin nao pode excluir outro Super Admin.', 'error');
      return;
    }

    setConfirmDelete({ open: true, user });
    setExpandedUserId(null);
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      return;
    }

    if (document.exitFullscreen) {
      void document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return {
    actionLoadingId,
    activeTab,
    canImportUsers,
    confirmDelete,
    confirmToggle,
    currentNav,
    currentUser,
    dashboardFilters,
    dropdownPosition,
    editingUser,
    expandedUserId,
    filterMacro,
    filterRole,
    filteredMicroregioes,
    filteredUsers,
    getRoleBadge,
    handleCloseUserModal,
    handleConfirmDeleteUser,
    handleConfirmToggleStatus,
    handleCreateUser,
    handleDeletePendingRegistrationRequest,
    handleDesktopUserFilterMacroChange,
    handleDesktopUserFilterMicroChange,
    handleEditUser,
    handleEditDesktopUser,
    handleCloseUserImportModal,
    handleOpenPendingUserCreation,
    handleOpenUserImport,
    handleRequestDesktopUserDelete,
    handleSaveUserFromModal,
    handleToggleUserStatus,
    handleToggleDesktopUserMenu,
    handleToggleDesktopUserStatus,
    handleUsersImported,
    handleViewDesktopUserMicroregion,
    handleViewMicrorregiao,
    isAdmin,
    isCompactLayout: isMobile || isTablet,
    isFullscreen,
    isLoading,
    isMobile,
    isSettingsModalOpen,
    isSidebarOpen,
    isSuperAdmin,
    isTablet,
    loadUsers,
    logout,
    pendingLoading,
    pendingRegistrations,
    pendingUserData,
    searchTerm,
    selectedActivity,
    selectedMobileMicroId,
    selectedObjective,
    setActiveTab,
    setConfirmDelete,
    setConfirmToggle,
    setCurrentNav,
    setDashboardFilters,
    setEditingUser,
    setExpandedUserId,
    setFilterMacro,
    setFilterRole,
    setIsSettingsModalOpen,
    setIsSidebarOpen,
    setSearchTerm,
    setSelectedActivity,
    setSelectedMobileMicroId,
    setSelectedObjective,
    setSettingsInitialTab,
    setSettingsMode,
    setShowMicroSelector,
    setShowUserImportModal,
    settingsInitialTab,
    settingsMode,
    setShowUserModal,
    showMicroSelector,
    showUserImportModal,
    showUserModal,
    toggleFullscreen,
    userFilterMacro,
    userFilterMicro,
    users,
  };
}
