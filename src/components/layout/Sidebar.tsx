import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, ChevronRight, Home, Target, Settings, LogOut, Shield } from 'lucide-react';
import { Objective, Activity } from '../../types';
import { UserRole } from '../../types/auth.types';
import { getAvatarUrl } from '../../features/settings/UserSettingsModal';
import { NotificationBell } from '../common/NotificationBell';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
  collapsed: boolean;
  badge?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, isActive, onClick, collapsed, badge }) => (
  <button
    onClick={onClick}
    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-all duration-200 mb-1 ${isActive ? 'bg-white/20 text-white font-bold shadow-lg ring-1 ring-white/20' : 'text-white/70 hover:bg-white/10 hover:text-white font-medium'} ${collapsed ? 'justify-center' : ''}`}
    title={collapsed ? label : ''}
  >
    <Icon size={20} />
    {!collapsed && (
      <span className="truncate text-sm flex-1 text-left">{label}</span>
    )}
    {!collapsed && badge && (
      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-500 text-white rounded">
        {badge}
      </span>
    )}
  </button>
);

const SidebarSectionTitle: React.FC<{ children: React.ReactNode; collapsed: boolean }> = ({ children, collapsed }) => {
  if (collapsed) return <div className="h-px w-full bg-white/10 my-4"></div>;
  return <div className="px-3 mt-6 mb-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">{children}</div>;
};

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentNav: 'strategy' | 'home' | 'settings';
  setCurrentNav: (nav: 'strategy' | 'home' | 'settings') => void;
  selectedObjective: number;
  setSelectedObjective: (id: number) => void;
  setSelectedActivity: (id: string) => void;
  setViewMode: (mode: 'table' | 'gantt' | 'team' | 'optimized') => void;
  objectives: Objective[];
  activities: Record<number, Activity[]>;
  onProfileClick: () => void;
  isMobile?: boolean;
  // Auth props
  userName?: string;
  userRole?: UserRole;
  userAvatarId?: string;
  onLogout?: () => void;
  isAdmin?: boolean;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  currentNav,
  setCurrentNav,
  selectedObjective,
  setSelectedObjective,
  setSelectedActivity,
  setViewMode,
  objectives,
  activities,
  onProfileClick,
  isMobile = false,
  userName,
  userRole,
  userAvatarId,
  onLogout,
  isAdmin = false,
  onOpenSettings,
}) => {
  // No mobile, sidebar começa fechada e é overlay
  const sidebarClasses = isMobile
    ? `fixed inset-y-0 left-0 z-50 ${isOpen ? 'w-[260px]' : 'w-0 overflow-hidden'}`
    : `${isOpen ? 'w-[260px]' : 'w-[70px]'} shrink-0`;

  const getRoleLabel = (role?: UserRole) => {
    if (!role) return 'Usuário';
    const labels: Record<UserRole, string> = {
      superadmin: 'Super Admin',
      admin: 'Administrador',
      gestor: 'Gestor Regional',
      usuario: 'Usuário',
    };
    return labels[role];
  };

  const getAvatarSeed = () => {
    return userName?.replace(/\s/g, '') || 'User';
  };

  return (
    <>
      {/* Overlay mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <aside className={`${sidebarClasses} flex flex-col z-50 transition-all duration-300 ease-out relative shadow-xl bg-gradient-to-b from-[#0891b2] to-[#059669] text-white`}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-50px] left-[-50px] w-[200px] h-[200px] bg-white rounded-full blur-3xl" />
        </div>

        {!isMobile && (
          <button
            onClick={onToggle}
            aria-label={isOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
            className="absolute -right-3 top-6 bg-white text-[#0891b2] rounded-full p-1 border border-slate-200 shadow-md hover:scale-110 transition-transform z-50"
          >
            {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        <div className="relative z-10 flex flex-col h-full">
          <div className={`p-5 flex items-center gap-3 ${!isOpen && 'justify-center'}`}>
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner border border-white/30">
              <Target size={18} />
            </div>
            {isOpen && (
              <div className="flex flex-col">
                <div className="font-bold text-lg tracking-tight leading-tight">RADAR <span className="font-light opacity-80">NSDIGI</span></div>
                <div className="text-[10px] font-medium text-white/70 tracking-wide uppercase">Transformação Digital</div>
              </div>
            )}
          </div>

          <nav className={`flex-1 px-3 py-2 space-y-1 ${isOpen ? 'overflow-y-auto' : 'overflow-visible'}`}>
            <SidebarItem icon={Home} label="Início" isActive={currentNav === 'home'} onClick={() => setCurrentNav('home')} collapsed={!isOpen} />
            <SidebarSectionTitle collapsed={!isOpen}>Planejamento</SidebarSectionTitle>

            <div className="relative group">
              <SidebarItem
                icon={Target}
                label="Plano de Ação"
                isActive={currentNav === 'strategy'}
                onClick={() => { setCurrentNav('strategy'); setViewMode('table'); }}
                collapsed={!isOpen}
              />

              {!isOpen && (
                <div className="absolute left-full top-0 ml-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-100 z-50 transform translate-x-[-5px] group-hover:translate-x-0 origin-left">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 bg-slate-50/50 rounded-t-lg">
                    <Target size={14} className="text-[#0891b2]" />
                    <span className="text-xs font-bold text-slate-500 uppercase">Objetivos Estratégicos</span>
                  </div>
                  <div className="space-y-0.5 p-1">
                    {objectives.map(obj => (
                      <button
                        key={obj.id}
                        onClick={() => {
                          setCurrentNav('strategy');
                          setSelectedObjective(obj.id);
                          setSelectedActivity(activities[obj.id][0].id);
                          setViewMode('table');
                        }}
                        className="w-full text-left px-3 py-2 text-xs rounded-md text-slate-600 hover:bg-blue-50 hover:text-blue-700 truncate transition-colors flex items-center gap-2"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedObjective === obj.id ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
                        {obj.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isOpen && currentNav === 'strategy' && (
              <div className="ml-3 pl-3 border-l border-white/20 space-y-1 mt-1 mb-3">
                {objectives.map(obj => (
                  <button
                    key={obj.id}
                    onClick={() => {
                      setSelectedObjective(obj.id);
                      setSelectedActivity(activities[obj.id][0].id);
                      setViewMode('table');
                    }}
                    className={`block w-full text-left py-1.5 px-2 text-[11px] rounded transition-colors truncate ${selectedObjective === obj.id ? "bg-white/20 font-bold text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                  >
                    {obj.title}
                  </button>
                ))}
              </div>
            )}

            {/* Admin Panel - só aparece para admin */}
            {isAdmin && (
              <>
                <SidebarSectionTitle collapsed={!isOpen}>Administração</SidebarSectionTitle>
                <SidebarItem
                  icon={Shield}
                  label="Painel Admin"
                  isActive={false}
                  onClick={onProfileClick}
                  collapsed={!isOpen}
                  badge="ADM"
                />
              </>
            )}

            <SidebarSectionTitle collapsed={!isOpen}>Sistema</SidebarSectionTitle>
            <SidebarItem icon={Settings} label="Configurações" isActive={currentNav === 'settings'} onClick={() => onOpenSettings?.()} collapsed={!isOpen} />
          </nav>

          {/* User profile section */}
          <div className="p-4 border-t border-white/10 bg-black/10">
            {/* Layout quando sidebar está ABERTA */}
            {isOpen && (
              <div className="flex items-center gap-2">
                {/* Sino de notificações */}
                <NotificationBell />
                <button
                  onClick={() => onOpenSettings?.()}
                  className="flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-white/10 cursor-pointer text-left flex-1"
                  title="Abrir configurações"
                >
                  <div className="relative shrink-0">
                    <img
                      src={getAvatarUrl(userAvatarId || 'zg10')}
                      alt="User"
                      className="w-9 h-9 rounded-full bg-white border-2 border-white/50 shadow-sm"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-[#059669] rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate text-white">{userName || 'Usuário'}</div>
                    <div className="text-[10px] opacity-80 truncate text-white/80">{getRoleLabel(userRole)}</div>
                  </div>
                </button>

                {/* Logout button */}
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                    title="Sair"
                  >
                    <LogOut size={18} />
                  </button>
                )}
              </div>
            )}

            {/* Layout quando sidebar está MINIMIZADA - sininho em cima, avatar embaixo */}
            {!isOpen && (
              <div className="flex flex-col items-center gap-2">
                {/* Sininho no topo */}
                <NotificationBell />

                {/* Avatar embaixo */}
                <button
                  onClick={() => onOpenSettings?.()}
                  className="rounded-full transition-colors hover:bg-white/10 cursor-pointer"
                  title="Abrir configurações"
                >
                  <div className="relative">
                    <img
                      src={getAvatarUrl(userAvatarId || 'zg10')}
                      alt="User"
                      className="w-9 h-9 rounded-full bg-white border-2 border-white/50 shadow-sm"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-[#059669] rounded-full"></div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
