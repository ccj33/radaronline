import { type Dispatch, type MouseEvent, type ReactNode, type SetStateAction } from 'react';
import { Action, TeamMember } from '../../../types';
import { User } from '../../../types/auth.types';
import { ActivityCenter, RankingPanel, RequestsManagement } from '../dashboard';
import { AnnouncementsManagement } from '../AnnouncementsManagement';
import { AdminPanelTab, AdminDropdownPosition, PendingRegistration } from '../adminPanel.types';
import { DashboardFiltersState } from '../dashboard';
import { AdminDashboardTab } from './AdminDashboardTab';
import { AdminMicroregionsTab } from './AdminMicroregionsTab';
import { AdminUsersTab } from './AdminUsersTab';

interface AdminDesktopContentProps {
  activeTab: AdminPanelTab;
  actions: Action[];
  teams: Record<string, TeamMember[]>;
  users: User[];
  filteredUsers: User[];
  pendingRegistrations: PendingRegistration[];
  dashboardFilters: DashboardFiltersState;
  setDashboardFilters: Dispatch<SetStateAction<DashboardFiltersState>>;
  userFilterMacro: string;
  userFilterMicro: string;
  microregionsFilterMacro: string;
  searchTerm: string;
  filterRole: string;
  isLoading: boolean;
  isSuperAdmin: boolean;
  pendingLoading: boolean;
  expandedUserId: string | null;
  dropdownPosition: AdminDropdownPosition | null;
  actionLoadingId: string | null;
  filteredMicroregioes: import('../../../data/microregioes').Microrregiao[];
  getRoleBadge: (role: User['role']) => ReactNode;
  onTabChange: (tab: AdminPanelTab) => void;
  onViewMicrorregiao: (microId: string) => void;
  onUserFilterMacroChange: (value: string) => void;
  onUserFilterMicroChange: (value: string) => void;
  onSearchTermChange: (value: string) => void;
  onFilterRoleChange: (value: string) => void;
  onCreateUser: () => void;
  onCreatePendingUser: (pending: PendingRegistration) => void;
  onDeletePendingRegistration: (pending: PendingRegistration) => Promise<void>;
  onToggleExpandedUserMenu: (event: MouseEvent<HTMLButtonElement>, userId: string) => void;
  onEditUser: (user: User) => void;
  onViewUserMicrorregiao: (microId: string) => void;
  onToggleUserStatus: (userId: string) => void;
  onRequestDeleteUser: (user: User) => void;
  onMicroregionsFilterMacroChange: (value: string) => void;
  onMicroregionsSearchTermChange: (value: string) => void;
}

export function AdminDesktopContent({
  activeTab,
  actions,
  teams,
  users,
  filteredUsers,
  pendingRegistrations,
  dashboardFilters,
  setDashboardFilters,
  userFilterMacro,
  userFilterMicro,
  microregionsFilterMacro,
  searchTerm,
  filterRole,
  isLoading,
  isSuperAdmin,
  pendingLoading,
  expandedUserId,
  dropdownPosition,
  actionLoadingId,
  filteredMicroregioes,
  getRoleBadge,
  onTabChange,
  onViewMicrorregiao,
  onUserFilterMacroChange,
  onUserFilterMicroChange,
  onSearchTermChange,
  onFilterRoleChange,
  onCreateUser,
  onCreatePendingUser,
  onDeletePendingRegistration,
  onToggleExpandedUserMenu,
  onEditUser,
  onViewUserMicrorregiao,
  onToggleUserStatus,
  onRequestDeleteUser,
  onMicroregionsFilterMacroChange,
  onMicroregionsSearchTermChange,
}: AdminDesktopContentProps) {
  return (
    <main className={`mx-auto px-4 sm:px-6 py-6 ${activeTab === 'communication' ? 'max-w-[1600px] w-full' : 'max-w-7xl'}`}>
      {activeTab === 'dashboard' && (
        <AdminDashboardTab
          actions={actions}
          users={users}
          teams={teams}
          dashboardFilters={dashboardFilters}
          pendingRegistrationsCount={pendingRegistrations.length}
          setDashboardFilters={setDashboardFilters}
          onTabChange={onTabChange}
          onViewMicrorregiao={onViewMicrorregiao}
        />
      )}

      {activeTab === 'requests' && (
        <div className="h-[calc(100vh-140px)] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <RequestsManagement />
        </div>
      )}

      {activeTab === 'atividades' && <ActivityCenter />}

      {activeTab === 'communication' && (
        <div className="h-[calc(100vh-140px)] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <AnnouncementsManagement />
        </div>
      )}

      {activeTab === 'usuarios' && (
        <AdminUsersTab
          userFilterMacro={userFilterMacro}
          userFilterMicro={userFilterMicro}
          searchTerm={searchTerm}
          filterRole={filterRole}
          isLoading={isLoading}
          isSuperAdmin={isSuperAdmin}
          pendingLoading={pendingLoading}
          filteredUsers={filteredUsers}
          pendingRegistrations={pendingRegistrations}
          expandedUserId={expandedUserId}
          dropdownPosition={dropdownPosition}
          actionLoadingId={actionLoadingId}
          getRoleBadge={getRoleBadge}
          onUserFilterMacroChange={onUserFilterMacroChange}
          onUserFilterMicroChange={onUserFilterMicroChange}
          onSearchTermChange={onSearchTermChange}
          onFilterRoleChange={onFilterRoleChange}
          onCreateUser={onCreateUser}
          onCreatePendingUser={onCreatePendingUser}
          onDeletePendingRegistration={onDeletePendingRegistration}
          onToggleExpandedUserMenu={onToggleExpandedUserMenu}
          onEditUser={onEditUser}
          onViewMicrorregiao={onViewUserMicrorregiao}
          onToggleUserStatus={onToggleUserStatus}
          onRequestDeleteUser={onRequestDeleteUser}
        />
      )}

      {activeTab === 'microregioes' && (
        <AdminMicroregionsTab
          filteredMicroregioes={filteredMicroregioes}
          filterMacro={microregionsFilterMacro}
          searchTerm={searchTerm}
          users={users}
          actions={actions}
          onFilterMacroChange={onMicroregionsFilterMacroChange}
          onSearchTermChange={onMicroregionsSearchTermChange}
          onViewMicrorregiao={onViewMicrorregiao}
        />
      )}

      {activeTab === 'ranking' && (
        <RankingPanel actions={actions} onViewMicrorregiao={onViewMicrorregiao} />
      )}
    </main>
  );
}

