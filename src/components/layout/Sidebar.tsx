import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, ChevronRight, Home, Target, Settings, LogOut, Shield, Trash2, Plus, Edit2, LayoutDashboard, Activity as ActivityIcon, Users, Trophy, Triangle, Calendar, ClipboardList, MapPin, Newspaper, BarChart3 } from 'lucide-react';

import { slideInLeft, staggerContainer, staggerItem, buttonTap } from '../../lib/motion';
import { Objective, Activity as _ActivityType } from '../../types';
import { getActivityDisplayId, getObjectiveTitleWithoutNumber } from '../../lib/text';
import { UserRole } from '../../types/auth.types';
import { getAvatarUrl } from '../../features/settings/UserSettingsModal';
import { NotificationBell } from '../common/NotificationBell';
import { SecureDeleteModal } from '../common/SecureDeleteModal';
import { EditNameModal } from '../common/EditNameModal';
import { getMacrorregioes, getMicroregioesByMacro } from '../../data/microregioes';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
  collapsed: boolean;
  badge?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = React.memo(({ icon: Icon, label, isActive, onClick, collapsed, badge }) => (
  <motion.button
    variants={staggerItem}
    whileTap={buttonTap}
    onClick={onClick}
    className={`group flex items-center gap-3 px-3 py-3 rounded-xl w-full transition-all duration-200 mb-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-lg ring-1 ring-white/20' : 'text-white/70 hover:bg-white/10 hover:text-white font-medium'} ${collapsed ? 'justify-center' : ''}`}
    title={collapsed ? label : ''}
  >
    <Icon size={20} className="shrink-0" />
    {!collapsed && (
      <span className="truncate text-sm flex-1 text-left">{label}</span>
    )}
    {!collapsed && badge && (
      <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500 text-white rounded-full shadow-sm">
        {badge}
      </span>
    )}
  </motion.button>
));

const SidebarSectionTitle: React.FC<{ children: React.ReactNode; collapsed: boolean }> = ({ children, collapsed }) => {
  if (collapsed) return <div className="h-px w-full bg-white/10 my-4 mx-auto w-10"></div>;
  return <div className="px-3 mt-6 mb-3 text-[10px] font-bold text-white/50 uppercase tracking-widest">{children}</div>;
};

// --- NOVOS COMPONENTES MEMOIZADOS ---

interface SidebarActivityItemProps {
  id: string;
  title: string;
  isActive: boolean;
  isEditMode: boolean;
  onSelect: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

const SidebarActivityItem = React.memo<SidebarActivityItemProps>(({ id, title, isActive, isEditMode, onSelect, onEdit, onDelete }) => (
  <div className="flex items-center gap-1 group/act">
    <button
      onClick={onSelect}
      className={`flex-1 text-left py-1.5 px-2 text-[10px] rounded-md transition-colors truncate ${isActive
        ? (isEditMode ? "text-white font-bold bg-white/10" : "bg-emerald-500/10 text-white font-bold border border-emerald-500/20")
        : "text-white/50 hover:bg-white/5 hover:text-white"
        }`}
    >
      Atv {getActivityDisplayId(id)} - {title}
    </button>

    {isEditMode && (
      <div className="flex items-center opacity-0 group-hover/act:opacity-100 transition-opacity">
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-white/20 text-white/50 hover:text-white transition-colors"
            title="Renomear atividade"
          >
            <Edit2 size={10} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-500/20 text-red-300/50 hover:text-red-200 transition-colors"
            title="Excluir atividade"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
    )}
  </div>
));

interface SidebarObjectiveItemProps {
  obj: { id: number; title: string };
  objIndex: number;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  activities?: { id: string; title: string }[];
  selectedActivity: string | null;
  onSelectActivity: (actId: string) => void;
  onEditActivity?: (actId: string, initialTitle: string) => void;
  onDeleteActivity?: (actId: string, actTitle: string) => void;
  onAddActivity?: () => void;
  isEditMode: boolean;
}

const SidebarObjectiveItem = React.memo<SidebarObjectiveItemProps>(({
  obj,
  objIndex,
  isActive,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  activities,
  selectedActivity,
  onSelectActivity,
  onEditActivity,
  onDeleteActivity,
  onAddActivity,
  isEditMode
}) => (
  <div className="group/obj">
    <div className="flex items-center gap-1 group-hover/obj:bg-white/5 rounded-lg pr-1 transition-colors">
      <button
        onClick={onToggle}
        className={`flex-1 text-left py-2 px-2.5 text-[11px] rounded-lg transition-all truncate leading-snug ${isActive
          ? "bg-emerald-500/20 font-bold text-white shadow-sm ring-1 ring-emerald-500/30"
          : "text-white/70 hover:text-white"
          }`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${isActive ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] scale-110" : "bg-white/30"
            }`}></div>
          <span className="truncate">Obj {objIndex + 1}. {getObjectiveTitleWithoutNumber(obj.title)}</span>
        </div>
      </button>

      {/* Controls */}
      {isEditMode && (
        <div className="flex items-center opacity-0 group-hover/obj:opacity-100 transition-opacity px-1">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded hover:bg-white/20 text-white/50 hover:text-white transition-colors"
              title="Renomear objetivo"
            >
              <Edit2 size={12} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-red-500/20 text-red-300 hover:text-red-200 transition-colors"
              title="Excluir objetivo"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}
    </div>

    {/* Activities List */}
    {isExpanded && activities && (
      <div className="ml-3 pl-3 border-l border-white/10 space-y-1 mt-1 mb-2 animate-fade-in relative">
        {activities.map(act => (
          <SidebarActivityItem
            key={act.id}
            id={act.id}
            title={act.title}
            isActive={isActive && act.id === selectedActivity}
            isEditMode={isEditMode}
            onSelect={() => onSelectActivity(act.id)}
            onEdit={onEditActivity ? (e) => { e.stopPropagation(); onEditActivity(act.id, act.title); } : undefined}
            onDelete={onDeleteActivity ? (e) => { e.stopPropagation(); onDeleteActivity(act.id, act.title); } : undefined}
          />
        ))}

        {isEditMode && onAddActivity && (
          <button
            onClick={onAddActivity}
            className="flex items-center gap-1.5 py-1 px-2 text-[10px] text-emerald-300/70 hover:text-emerald-200 transition-colors hover:bg-emerald-500/10 rounded-md w-full"
          >
            <Plus size={10} />
            <span>Nova Atividade</span>
          </button>
        )}
      </div>
    )}
  </div>
));

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentNav: string;
  setCurrentNav: React.Dispatch<React.SetStateAction<string>> | ((nav: string) => void);
  selectedObjective: number | null;
  setSelectedObjective: React.Dispatch<React.SetStateAction<number>>;
  selectedActivity: string | null;
  setSelectedActivity: React.Dispatch<React.SetStateAction<string>>;
  viewMode?: 'table' | 'gantt' | 'team' | 'optimized' | 'calendar';
  setViewMode: React.Dispatch<React.SetStateAction<'table' | 'gantt' | 'team' | 'optimized' | 'calendar'>> | (() => void);
  objectives: Objective[];
  activities: Record<number, { id: string; title: string }[]>;
  onProfileClick?: () => void;
  onAdminClick?: () => void;
  isMobile?: boolean;
  userName?: string;
  userRole?: UserRole;
  userAvatarId?: string;
  onLogout?: () => void;
  isAdmin?: boolean;
  onOpenSettings?: (mode?: 'settings' | 'avatar') => void;
  onAddObjective?: () => void;
  onDeleteObjective?: (id: number) => void;
  onUpdateObjective?: (id: number, title: string) => void;
  onAddActivity?: (id: number) => void;
  onDeleteActivity?: (objId: number, actId: string) => void;
  onUpdateActivity?: (objId: number, actId: string, field: string, value: string | number | boolean) => void;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  onSelectMicroregiao?: (id: string) => void;
  onViewAllMicroregioes?: () => void;
  showPlanningNavigation?: boolean;
  // Admin Panel Tab navigation
  adminActiveTab?: string;
  onAdminTabChange?: (tab: string) => void;
  showNotifications?: boolean;
}

const SidebarContent: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  currentNav,
  setCurrentNav,
  selectedObjective,
  setSelectedObjective,
  selectedActivity,
  setSelectedActivity,
  viewMode,
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
  onAddObjective,
  onDeleteObjective,
  onUpdateObjective,
  onAddActivity,
  onDeleteActivity,
  onUpdateActivity,
  isEditMode = false,
  onToggleEditMode: _onToggleEditMode,
  onSelectMicroregiao,
  onViewAllMicroregioes: _onViewAllMicroregioes,
  showPlanningNavigation = true,
  adminActiveTab,
  onAdminTabChange,
  onAdminClick,
  showNotifications = true,
}) => {
  const [expandedObjectives, setExpandedObjectives] = useState<Set<number>>(new Set());

  const toggleObjective = (id: number) => {
    setExpandedObjectives(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    type: 'objective' | 'activity';
    id: number | string;
    parentId?: number; // Para atividades
    initialValue: string;
  }>({ isOpen: false, type: 'objective', id: 0, initialValue: '' });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'objective' | 'activity';
    id: number | string;
    parentId?: number;
    name: string;
  }>({ isOpen: false, type: 'objective', id: 0, name: '' });

  // Verifica se usuário pode editar (admin ou superadmin)
  const _canEdit = userRole === 'admin' || userRole === 'superadmin';

  // State to handle click-to-toggle for the flyout (UX improvement)
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  useEffect(() => {
    // Debug log to confirm Sidebar is mounting correctly and force HMR update
    // console.log('[Sidebar] mounted'); 
  }, []);

  // No mobile, sidebar começa fechada e é overlay
  const sidebarClasses = isMobile
    ? `fixed inset-y-0 left-0 z-50 ${isOpen ? 'w-[280px]' : 'w-0 overflow-hidden'}`
    : `${isOpen ? 'w-[280px]' : 'w-[80px]'} shrink-0`;

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

  const _getAvatarSeed = () => {
    return userName?.replace(/\s/g, '') || 'User';
  };

  return (
    <>
      {/* Overlay mobile - Com animação fade */}
      {isMobile && isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Modais de segurança */}
      <EditNameModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal(prev => ({ ...prev, isOpen: false }))}
        onSave={(newName) => {
          if (editModal.type === 'objective' && onUpdateObjective) {
            onUpdateObjective(editModal.id as number, newName);
          } else if (editModal.type === 'activity' && onUpdateActivity && editModal.parentId) {
            onUpdateActivity(editModal.parentId, editModal.id as string, 'title', newName);
          }
        }}
        title={`Editar ${editModal.type === 'objective' ? 'Objetivo' : 'Atividade'}`}
        initialValue={editModal.initialValue}
      />

      <SecureDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (deleteModal.type === 'objective' && onDeleteObjective) {
            onDeleteObjective(deleteModal.id as number);
          } else if (deleteModal.type === 'activity' && onDeleteActivity && deleteModal.parentId) {
            onDeleteActivity(deleteModal.parentId, deleteModal.id as string);
          }
          setDeleteModal(prev => ({ ...prev, isOpen: false }));
        }}
        title={`Excluir ${deleteModal.type === 'objective' ? 'Objetivo' : 'Atividade'}`}
        itemName={deleteModal.name}
      />

      <motion.aside
        data-tour="sidebar"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={slideInLeft}
        drag={isMobile ? "x" : false}
        dragConstraints={{ left: -280, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (isMobile && info.offset.x < -100) {
            onToggle();
          }
        }}
        className={`${sidebarClasses} flex flex-col z-50 transition-all duration-300 ease-out relative shadow-2xl bg-gradient-to-b from-[#0e7490] to-[#047857] dark:from-slate-900 dark:to-slate-950 dark:border-r dark:border-slate-800 text-white touch-pan-y`}
      >
        {/* Mobile drag handle */}
        {isMobile && isOpen && (
          <div className="absolute top-1/2 -translate-y-1/2 right-2 flex flex-col gap-1 opacity-40">
            <div className="w-1 h-8 bg-white/50 rounded-full" />
          </div>
        )}

        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-50px] left-[-50px] w-[200px] h-[200px] bg-white rounded-full blur-3xl opacity-30" />
          <div className="absolute bottom-[-50px] right-[-50px] w-[200px] h-[200px] bg-emerald-400 rounded-full blur-3xl opacity-20" />
        </div>

        {!isMobile && (
          <button
            onClick={onToggle}
            aria-label={isOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
            className="absolute -right-3 top-8 bg-white text-[#0e7490] rounded-full p-1.5 border border-slate-200 shadow-lg hover:scale-110 hover:bg-slate-50 transition-all z-50 group"
          >
            {isOpen ? <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> : <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />}
          </button>
        )}

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className={`p-6 flex items-center gap-4 ${!isOpen && 'justify-center'}`}>
            <div className={`rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner border border-white/30 transition-all duration-300 ${isOpen ? 'w-10 h-10' : 'w-10 h-10 p-2'}`}>
              <Triangle size={isOpen ? 22 : 24} fill="currentColor" className="text-white" />
            </div>
            {isOpen && (
              <div className="flex flex-col animate-fade-in">
                <div className="font-extrabold text-xl tracking-tight leading-none text-white drop-shadow-sm flex items-center gap-1">
                  RADAR <span className="font-light opacity-80">NSDIGI</span>
                </div>
                <div className="text-[9px] font-medium text-teal-100/70 tracking-[0.2em] uppercase mt-1">
                  Transformação Digital
                </div>
              </div>
            )}
          </div>

          {/* Unified Navigation - "Planejamento" Flow */}
          <div className={`flex-1 px-4 py-3 space-y-1 ${isOpen ? 'overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30' : 'overflow-visible'} relative z-20`}>

            {/* Admin Panel Navigation - Only visible when in Admin Panel view */}
            {!showPlanningNavigation && onAdminTabChange && (
              <>
                <SidebarSectionTitle collapsed={!isOpen}>Painel Admin</SidebarSectionTitle>

                {/* Dashboard with subsections */}
                <div className="relative">
                  <SidebarItem
                    icon={LayoutDashboard}
                    label="Dashboard"
                    isActive={adminActiveTab === 'dashboard' || adminActiveTab === 'ranking'}
                    onClick={() => onAdminTabChange('dashboard')}
                    collapsed={!isOpen}
                  />

                  {/* Dashboard Subsections - visible when Dashboard is active or expanded */}
                  {isOpen && (adminActiveTab === 'dashboard' || adminActiveTab === 'ranking') && (
                    <div className="ml-4 pl-3 border-l-2 border-indigo-500/30 space-y-1 mt-1 mb-2 animate-fade-in">
                      <button
                        onClick={() => {
                          onAdminTabChange('dashboard');
                          setTimeout(() => {
                            document.getElementById('analytics-section')?.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 text-xs rounded-lg transition-all ${adminActiveTab === 'dashboard'
                          ? 'bg-indigo-500/20 text-white font-bold ring-1 ring-indigo-500/30'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                      >
                        <ActivityIcon size={14} />
                        <span>Analytics</span>
                      </button>
                      <button
                        onClick={() => {
                          onAdminTabChange('ranking');
                          setTimeout(() => {
                            document.getElementById('ranking-section')?.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 text-xs rounded-lg transition-all ${adminActiveTab === 'ranking'
                          ? 'bg-amber-500/20 text-white font-bold ring-1 ring-amber-500/30'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                      >
                        <Trophy size={14} />
                        <span>Ranking</span>
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className="relative group isolate"
                  onMouseEnter={() => setIsFlyoutOpen(true)}
                  onMouseLeave={() => setIsFlyoutOpen(false)}
                >
                  <SidebarItem
                    icon={MapPin}
                    label="Microrregiões"
                    isActive={adminActiveTab === 'microregioes'}
                    onClick={() => onAdminTabChange('microregioes')}
                    collapsed={!isOpen}
                  />

                  {/* Flyout Menu Container - Fixed positioning centered vertically */}
                  <div className={`fixed ${isOpen ? 'left-[280px]' : 'left-[80px]'} top-1/2 -translate-y-1/2 w-72 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-0 ${!isFlyoutOpen ? 'invisible opacity-0 translate-x-[-10px]' : 'visible opacity-100 translate-x-0'} transition-all duration-200 z-[9999] origin-left`}>
                    <div className="sticky top-0 bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 rounded-t-xl z-10 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                          <MapPin size={18} className="text-teal-600 dark:text-teal-400" />
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Microrregiões</span>
                      </div>
                    </div>
                    <div className="p-2">
                      {getMacrorregioes().map(macro => (
                        <div key={macro} className="mb-2">
                          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{macro}</div>
                          <div className="space-y-0.5">
                            {getMicroregioesByMacro(macro).map(micro => (
                              <button
                                key={micro.id}
                                onClick={() => {
                                  if (onSelectMicroregiao) onSelectMicroregiao(micro.id);
                                  setIsFlyoutOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-xs rounded-lg text-slate-600 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors flex items-center gap-2"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                {micro.nome}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <SidebarItem
                  icon={Users}
                  label="Usuários"
                  isActive={adminActiveTab === 'usuarios'}
                  onClick={() => onAdminTabChange('usuarios')}
                  collapsed={!isOpen}
                />
                <SidebarItem
                  icon={ActivityIcon}
                  label="Atividades"
                  isActive={adminActiveTab === 'atividades'}
                  onClick={() => onAdminTabChange('atividades')}
                  collapsed={!isOpen}
                />
                <SidebarItem
                  icon={ClipboardList}
                  label="Solicitações"
                  isActive={adminActiveTab === 'requests'}
                  onClick={() => onAdminTabChange('requests')}
                  collapsed={!isOpen}
                />
              </>
            )}

            {/* Planning Navigation - Only visible when NOT in Admin Panel view */}
            {showPlanningNavigation && (
              <>
                {/* Admin Shortcut - For admins to go back to Admin Panel */}
                {(isAdmin || userRole === 'gestor' || userRole === 'superadmin') && (
                  <div className={`mb-4 ${!isOpen && 'flex justify-center'}`}>
                    <button
                      onClick={onAdminClick}
                      className={`group relative flex items-center ${!isOpen ? 'justify-center w-12 h-12 rounded-xl' : 'w-full p-3 rounded-xl'} bg-gradient-to-br from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 border border-indigo-500/30 shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 overflow-hidden`}
                      title="Acessar Painel Administrativo"
                    >
                      <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 pointer-events-none" />
                      <Shield size={20} className="text-indigo-200 group-hover:text-white transition-colors shrink-0" />
                      {isOpen && (
                        <span className="font-bold text-white text-sm ml-3">Adm</span>
                      )}
                    </button>
                  </div>
                )}

                {/* Section Header: Planejamento */}
                <div className="flex items-center justify-between pr-1 mb-2">
                  <SidebarSectionTitle collapsed={!isOpen}>Planejamento</SidebarSectionTitle>
                  {/* Add Objective Button - visible only when open and in edit mode */}
                  {isEditMode && isOpen && onAddObjective && (
                    <button
                      onClick={onAddObjective}
                      className="mt-6 mb-3 p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 transition-all hover:scale-110 shadow-sm border border-emerald-500/20"
                      title="Adicionar novo objetivo"
                    >
                      <Plus size={14} strokeWidth={3} />
                    </button>
                  )}
                </div>

                {/* 1. Mural da Rede (News - Novo Home) */}
                <SidebarItem icon={Newspaper} label="Mural da Rede" isActive={currentNav === 'news' || currentNav === 'home'} onClick={() => setCurrentNav('news')} collapsed={!isOpen} />

                {/* 1.5 Indicadores (Dashboard Antigo) */}
                <SidebarItem icon={BarChart3} label="Indicadores" isActive={currentNav === 'dashboard'} onClick={() => setCurrentNav('dashboard')} collapsed={!isOpen} />

                {/* 2. Objetivos (Objectives) */}
                <div className="relative group mt-1">
                  <div className={`relative ${isOpen ? 'bg-gradient-to-r from-emerald-500/10 to-transparent rounded-xl p-1 -mx-1 border border-emerald-500/10' : ''}`}>
                    <SidebarItem
                      icon={Target}
                      label="Objetivos"
                      isActive={currentNav === 'strategy' && viewMode !== 'calendar'}
                      onClick={() => { setCurrentNav('strategy'); setViewMode('table'); }}
                      collapsed={!isOpen}
                    />
                    {!isOpen && <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border border-white sm:hidden"></div>}
                  </div>

                  {/* Objective Flyout (collapsed only) */}
                  {!isOpen && (
                    <div className="fixed left-[80px] top-24 ml-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 z-50 origin-left translate-x-[-10px] group-hover:translate-x-0">
                      <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-t-lg mb-1">
                        <Target size={16} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Objetivos Estratégicos</span>
                      </div>
                      <div className="space-y-1 p-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {objectives.map((obj, objIndex) => (
                          <button
                            key={obj.id}
                            onClick={() => {
                              setCurrentNav('strategy');
                              setSelectedObjective(obj.id);
                              setSelectedActivity(activities[obj.id]?.[0]?.id || '');
                              setViewMode('table');
                            }}
                            className="w-full text-left px-3 py-2.5 text-xs rounded-lg text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 truncate transition-colors flex items-center gap-2.5"
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedObjective === obj.id ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                            <span className="truncate">Obj {objIndex + 1}. {getObjectiveTitleWithoutNumber(obj.title)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lista de objetivos (expandido) */}
                {isOpen && currentNav === 'strategy' && viewMode !== 'calendar' && viewMode !== 'team' && (
                  <div className="ml-1 pl-3 border-l-2 border-emerald-500/20 space-y-2 mt-2 mb-4 animate-slide-down">
                    {objectives.map((obj, objIndex) => (
                      <SidebarObjectiveItem
                        key={obj.id}
                        obj={obj}
                        objIndex={objIndex}
                        isActive={selectedObjective === obj.id}
                        isExpanded={isEditMode || (isOpen && expandedObjectives.has(obj.id))}
                        onToggle={() => {
                          setSelectedObjective(obj.id);
                          setSelectedActivity(activities[obj.id]?.[0]?.id || '');
                          setViewMode('table');
                          if (isOpen) toggleObjective(obj.id);
                        }}
                        onEdit={isEditMode && onUpdateObjective ? (e) => {
                          e.stopPropagation();
                          setEditModal({ isOpen: true, type: 'objective', id: obj.id, initialValue: obj.title });
                        } : undefined}
                        onDelete={isEditMode && onDeleteObjective ? (e) => {
                          e.stopPropagation();
                          setDeleteModal({ isOpen: true, type: 'objective', id: obj.id, name: obj.title });
                        } : undefined}
                        activities={activities[obj.id]}
                        selectedActivity={selectedActivity}
                        onSelectActivity={(actId) => {
                          setSelectedObjective(obj.id);
                          setSelectedActivity(actId);
                          setViewMode('table');
                        }}
                        onEditActivity={isEditMode && onUpdateActivity ? (actId, initialTitle) => {
                          setEditModal({ isOpen: true, type: 'activity', id: actId, parentId: obj.id, initialValue: initialTitle });
                        } : undefined}
                        onDeleteActivity={isEditMode && onDeleteActivity ? (actId, actTitle) => {
                          setDeleteModal({ isOpen: true, type: 'activity', id: actId, parentId: obj.id, name: actTitle });
                        } : undefined}
                        onAddActivity={isEditMode && onAddActivity ? () => onAddActivity(obj.id) : undefined}
                        isEditMode={isEditMode}
                      />
                    ))}

                    {/* Botão adicionar objetivo */}
                    {isEditMode && onAddObjective && (
                      <button
                        onClick={onAddObjective}
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-2 text-[11px] text-emerald-100 bg-emerald-600/30 hover:bg-emerald-600/50 rounded-lg transition-all border border-emerald-500/30 mt-3"
                      >
                        <Plus size={14} />
                        <span className="font-bold"> Novo Objetivo</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 3. Equipe (Team) - Only for admins and managers */}
                {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'gestor') && (
                  <SidebarItem
                    icon={Users}
                    label="Equipe"
                    isActive={currentNav === 'strategy' && viewMode === 'team'}
                    onClick={() => { setCurrentNav('strategy'); setViewMode('team'); }}
                    collapsed={!isOpen}
                  />
                )}

                {/* 3. Agenda (Calendar) */}
                <SidebarItem
                  icon={Calendar}
                  label="Agenda"
                  isActive={currentNav === 'strategy' && viewMode === 'calendar'}
                  onClick={() => { setCurrentNav('strategy'); setViewMode('calendar'); }}
                  collapsed={!isOpen}
                />

                {/* 4. Notificações (Notifications) - Moves below Objectives */}
                {showNotifications && onAdminTabChange && (
                  <div className="relative mt-2 border-t border-white/5 pt-2">
                    <NotificationBell
                      collapsed={!isOpen}
                      onViewAllRequests={() => onAdminTabChange('requests')}
                    />
                    {!isOpen && (
                      <span className="absolute top-4 right-2 w-2 h-2 bg-red-400 rounded-full animate-pulse border border-white shadow-sm"></span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* User profile section - Fixed at bottom */}
          <div className="p-4 bg-black/20 mt-auto relative z-30 space-y-3 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] backdrop-blur-sm border-t border-white/5">
            {/* System Links */}
            <div className="space-y-1">
              <SidebarItem
                icon={Settings}
                label="Configurações"
                isActive={currentNav === 'settings'}
                onClick={() => onOpenSettings?.('settings')}
                collapsed={!isOpen}
              />
            </div>

            <div className="h-px bg-white/10 w-full"></div>

            {/* Layout quando sidebar está ABERTA */}
            {isOpen ? (
              <div className="flex items-center justify-between gap-2 pt-1">
                {/* Avatar/Config */}
                <button
                  onClick={() => onOpenSettings?.('avatar')}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 cursor-pointer text-left flex-1 group contain-layout"
                  title="Meu Perfil"
                >
                  <div className="relative shrink-0">
                    <img
                      src={getAvatarUrl(userAvatarId || 'zg10')}
                      alt="User"
                      className="w-10 h-10 rounded-full bg-white border-2 border-white/30 group-hover:border-white shadow-md"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#047857] rounded-full shadow-sm"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate text-white leading-tight">{userName || 'Usuário'}</div>
                    <div className="text-[10px] font-medium opacity-70 truncate text-white/90 uppercase tracking-wider">{getRoleLabel(userRole)}</div>
                  </div>
                </button>

                {/* Logout button - Distinct */}
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/20 transition-all text-white/60 hover:text-white hover:scale-105 border border-transparent hover:border-white/20 shadow-sm"
                    title="Sair do Sistema"
                  >
                    <LogOut size={18} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            ) : (
              /* Layout quando sidebar está MINIMIZADA */
              <div className="flex flex-col items-center gap-4 py-2">
                <button
                  onClick={() => onOpenSettings?.('avatar')}
                  className="relative group outline-none"
                  title="Meu Perfil"
                >
                  <img
                    src={getAvatarUrl(userAvatarId || 'zg10')}
                    alt="User"
                    className="w-10 h-10 rounded-full bg-white border-2 border-white/30 group-hover:border-white shadow-md transition-all"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#047857] rounded-full"></div>
                </button>
              </div>
            )}

          </div>
        </div>
      </motion.aside>
    </>
  );
};

export const Sidebar = React.memo(SidebarContent);
