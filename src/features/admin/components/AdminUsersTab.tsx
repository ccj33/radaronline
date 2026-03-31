import { MouseEvent, ReactNode } from 'react';
import { ChevronDown, MoreVertical, Plus, RefreshCw, Search, Upload, UserCheck, UserX, Users } from 'lucide-react';
import { MICROREGIOES, getMacrorregioes, getMicroregiaoById } from '../../../data/microregioes';
import { User } from '../../../types/auth.types';
import { PendingRegistrationsPanel } from '../dashboard';
import { AdminDropdownPosition, PendingRegistration } from '../adminPanel.types';

interface AdminUsersTabProps {
  userFilterMacro: string;
  userFilterMicro: string;
  searchTerm: string;
  filterRole: string;
  isLoading: boolean;
  isSuperAdmin: boolean;
  pendingLoading: boolean;
  filteredUsers: User[];
  pendingRegistrations: PendingRegistration[];
  expandedUserId: string | null;
  dropdownPosition: AdminDropdownPosition | null;
  actionLoadingId: string | null;
  getRoleBadge: (role: User['role']) => ReactNode;
  onUserFilterMacroChange: (value: string) => void;
  onUserFilterMicroChange: (value: string) => void;
  onSearchTermChange: (value: string) => void;
  onFilterRoleChange: (value: string) => void;
  onCreateUser: () => void;
  onOpenUserImport: () => void;
  onCreatePendingUser: (pending: PendingRegistration) => void;
  onDeletePendingRegistration: (pending: PendingRegistration) => Promise<void>;
  onToggleExpandedUserMenu: (event: MouseEvent<HTMLButtonElement>, userId: string) => void;
  onEditUser: (user: User) => void;
  onViewMicrorregiao: (microId: string) => void;
  onToggleUserStatus: (userId: string) => void;
  onRequestDeleteUser: (user: User) => void;
}

export function AdminUsersTab({
  userFilterMacro,
  userFilterMicro,
  searchTerm,
  filterRole,
  isLoading,
  isSuperAdmin,
  pendingLoading,
  filteredUsers,
  pendingRegistrations,
  expandedUserId,
  dropdownPosition,
  actionLoadingId,
  getRoleBadge,
  onUserFilterMacroChange,
  onUserFilterMicroChange,
  onSearchTermChange,
  onFilterRoleChange,
  onCreateUser,
  onOpenUserImport,
  onCreatePendingUser,
  onDeletePendingRegistration,
  onToggleExpandedUserMenu,
  onEditUser,
  onViewMicrorregiao,
  onToggleUserStatus,
  onRequestDeleteUser,
}: AdminUsersTabProps) {
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative min-w-[180px]">
          <select
            value={userFilterMacro}
            onChange={(event) => onUserFilterMacroChange(event.target.value)}
            className="w-full appearance-none pl-4 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          >
            <option value="all">Todas Macros</option>
            {getMacrorregioes().map((macro) => (
              <option key={macro} value={macro}>
                {macro}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative min-w-[180px]">
          <select
            value={userFilterMicro}
            onChange={(event) => onUserFilterMicroChange(event.target.value)}
            className="w-full appearance-none pl-4 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          >
            <option value="all">Todas Micros</option>
            {MICROREGIOES.filter((micro) => userFilterMacro === 'all' || micro.macrorregiao === userFilterMacro).map((micro) => (
              <option key={micro.id} value={micro.id}>
                {micro.nome}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        <div className="relative">
          <select
            value={filterRole}
            onChange={(event) => onFilterRoleChange(event.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          >
            <option value="all">Todos os papeis</option>
            <option value="admin">Administrador</option>
            <option value="gestor">Gestor</option>
            <option value="usuario">Usuario</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onOpenUserImport}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 rounded-lg font-medium transition-all hover:shadow-sm whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            Importar lote
          </button>
          <button
            onClick={onCreateUser}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-all hover:shadow-lg shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Novo Usuario
          </button>
        </div>
      </div>

      {pendingRegistrations.length > 0 && (
        <PendingRegistrationsPanel
          pendingRegistrations={pendingRegistrations}
          isLoading={pendingLoading}
          onCreateUser={onCreatePendingUser}
          onDelete={onDeletePendingRegistration}
        />
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
            Carregando usuarios...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Nenhum usuario encontrado
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredUsers.map((user) => {
              const microrregiao = getMicroregiaoById(user.microregiaoId);
              const isExpanded = expandedUserId === user.id;
              const canManageUser = isSuperAdmin || (user.role !== 'admin' && user.role !== 'superadmin');

              return (
                <div key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.ativo ? 'bg-teal-100 dark:bg-teal-900/30' : 'bg-slate-100 dark:bg-slate-700'
                        }`}
                      >
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
                            <span className="text-xs text-red-500 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                              INATIVO
                            </span>
                          )}
                          {!user.lgpdConsentimento && user.ativo && (
                            <span className="text-xs text-purple-500 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded">
                              LGPD PENDENTE
                            </span>
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
                        <div
                          className={`text-xs ${
                            user.municipio
                              ? 'text-slate-500 font-medium'
                              : 'text-sm font-medium text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {user.microregiaoId === 'all' ? 'Todas' : microrregiao?.nome || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                          {user.microregiaoId === 'all' ? 'Microrregioes' : microrregiao?.macrorregiao || '-'}
                        </div>
                      </div>

                      <div className="relative">
                        <button
                          onClick={(event) => onToggleExpandedUserMenu(event, user.id)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>

                        {isExpanded && dropdownPosition && (
                          <div
                            className="fixed w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50"
                            style={{
                              top: dropdownPosition.openUp ? 'auto' : dropdownPosition.top,
                              bottom: dropdownPosition.openUp ? window.innerHeight - dropdownPosition.top : 'auto',
                              left: Math.max(8, dropdownPosition.left),
                            }}
                          >
                            {canManageUser ? (
                              <button
                                onClick={() => onEditUser(user)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                              >
                                Editar usuario
                              </button>
                            ) : (
                              <div className="px-4 py-2 text-xs text-amber-600 dark:text-amber-300">
                                Apenas Super Admin gerencia este perfil.
                              </div>
                            )}
                            {user.microregiaoId !== 'all' && (
                              <button
                                onClick={() => onViewMicrorregiao(user.microregiaoId)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-teal-600 dark:text-teal-400"
                              >
                                Ver microrregiao
                              </button>
                            )}
                            {canManageUser && (
                              <button
                                onClick={() => onToggleUserStatus(user.id)}
                                disabled={actionLoadingId === user.id}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                                  user.ativo ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                }`}
                              >
                                {user.ativo ? 'Desativar usuario' : 'Ativar usuario'}
                              </button>
                            )}
                            {isSuperAdmin && user.role !== 'superadmin' && (
                              <button
                                onClick={() => onRequestDeleteUser(user)}
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
  );
}
