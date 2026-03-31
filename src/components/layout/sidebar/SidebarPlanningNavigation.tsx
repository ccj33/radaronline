import React, { useCallback, useState } from 'react';
import { BarChart3, Calendar, Newspaper, Plus, Shield, Target, Users } from 'lucide-react';
import { Objective } from '../../../types';
import { UserRole } from '../../../types/auth.types';
import { getObjectiveTitleWithoutNumber } from '../../../lib/text';
import { canAccessTeamView } from '../../../lib/userRole';
import { NotificationBell } from '../../common/NotificationBell';
import { SidebarItem } from './SidebarItem';
import { SidebarObjectiveItem } from './SidebarObjectiveItem';
import { SidebarSectionTitle } from './SidebarSectionTitle';

interface SidebarPlanningNavigationProps {
  isOpen: boolean;
  isAdmin: boolean;
  userRole?: UserRole;
  isEditMode: boolean;
  currentNav: string;
  viewMode?: 'table' | 'gantt' | 'team' | 'optimized' | 'calendar';
  selectedObjective: number | null;
  selectedActivity: string | null;
  objectives: Objective[];
  activities: Record<number, { id: string; title: string }[]>;
  onAdminClick?: () => void;
  onAddObjective?: () => void;
  onDeleteObjective?: (id: number) => void;
  onUpdateObjective?: (id: number, title: string) => void;
  onAddActivity?: (id: number) => void;
  onDeleteActivity?: (objId: number, actId: string) => void;
  onUpdateActivity?: (objId: number, actId: string, field: string, value: string | number | boolean) => void;
  showNotifications: boolean;
  onAdminTabChange?: (tab: string) => void;
  openNewsFeed: () => void;
  openDashboard: () => void;
  openStrategyRoot: () => void;
  openStrategyObjective: (objectiveId: number, activityId?: string) => void;
  openStrategyTeam: () => void;
  openStrategyCalendar: () => void;
  openObjectiveEdit: (id: number, title: string) => void;
  openActivityEdit: (objId: number, actId: string, initialTitle: string) => void;
  openObjectiveDelete: (id: number, title: string) => void;
  openActivityDelete: (objId: number, actId: string, title: string) => void;
}

export const SidebarPlanningNavigation = React.memo<SidebarPlanningNavigationProps>(({
  isOpen,
  isAdmin,
  userRole,
  isEditMode,
  currentNav,
  viewMode,
  selectedObjective,
  selectedActivity,
  objectives,
  activities,
  onAdminClick,
  onAddObjective,
  onDeleteObjective,
  onUpdateObjective,
  onAddActivity,
  onDeleteActivity,
  onUpdateActivity,
  showNotifications,
  onAdminTabChange,
  openNewsFeed,
  openDashboard,
  openStrategyRoot,
  openStrategyObjective,
  openStrategyTeam,
  openStrategyCalendar,
  openObjectiveEdit,
  openActivityEdit,
  openObjectiveDelete,
  openActivityDelete,
}) => {
  const [expandedObjectives, setExpandedObjectives] = useState<Set<number>>(new Set());

  const toggleObjective = useCallback((id: number) => {
    setExpandedObjectives(prev => {
      if (prev.has(id)) {
        return new Set();
      }

      return new Set([id]);
    });
  }, []);

  const showExpandedObjectives =
    isOpen && currentNav === 'strategy' && viewMode !== 'calendar' && viewMode !== 'team';

  return (
    <>
      {(isAdmin || userRole === 'superadmin') && (
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

      <div className="flex items-center justify-between pr-1 mb-2">
        <SidebarSectionTitle collapsed={!isOpen}>Planejamento</SidebarSectionTitle>
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

      <SidebarItem
        icon={Newspaper}
        label="Mural da Rede"
        isActive={currentNav === 'news' || currentNav === 'home'}
        onClick={openNewsFeed}
        collapsed={!isOpen}
      />

      <SidebarItem
        icon={BarChart3}
        label="Indicadores"
        isActive={currentNav === 'dashboard'}
        onClick={openDashboard}
        collapsed={!isOpen}
      />

      <div className="relative group mt-1">
        <div className={`relative ${isOpen ? 'bg-gradient-to-r from-emerald-500/10 to-transparent rounded-xl p-1 -mx-1 border border-emerald-500/10' : ''}`}>
          <SidebarItem
            icon={Target}
            label="Objetivos"
            isActive={currentNav === 'strategy' && viewMode !== 'calendar'}
            onClick={openStrategyRoot}
            collapsed={!isOpen}
          />
          {!isOpen && <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border border-white sm:hidden" />}
        </div>

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
                  onClick={() => openStrategyObjective(obj.id)}
                  className="w-full text-left px-3 py-2.5 text-xs rounded-lg text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 truncate transition-colors flex items-center gap-2.5"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${selectedObjective === obj.id ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  <span className="truncate">Obj {objIndex + 1}. {getObjectiveTitleWithoutNumber(obj.title)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showExpandedObjectives && (
        <div className="ml-1 pl-3 border-l-2 border-emerald-500/20 space-y-2 mt-2 mb-4 animate-slide-down">
          {objectives.map((obj, objIndex) => (
            <SidebarObjectiveItem
              key={obj.id}
              obj={obj}
              objIndex={objIndex}
              isActive={selectedObjective === obj.id}
              isExpanded={isEditMode || (isOpen && expandedObjectives.has(obj.id))}
              onToggle={() => {
                openStrategyObjective(obj.id);
                if (isOpen) {
                  toggleObjective(obj.id);
                }
              }}
              onEdit={isEditMode && onUpdateObjective ? (e) => {
                e.stopPropagation();
                openObjectiveEdit(obj.id, obj.title);
              } : undefined}
              onDelete={isEditMode && onDeleteObjective ? (e) => {
                e.stopPropagation();
                openObjectiveDelete(obj.id, obj.title);
              } : undefined}
              activities={activities[obj.id]}
              selectedActivity={selectedActivity}
              onSelectActivity={(actId) => openStrategyObjective(obj.id, actId)}
              onEditActivity={isEditMode && onUpdateActivity ? (actId, initialTitle) => {
                openActivityEdit(obj.id, actId, initialTitle);
              } : undefined}
              onDeleteActivity={isEditMode && onDeleteActivity ? (actId, actTitle) => {
                openActivityDelete(obj.id, actId, actTitle);
              } : undefined}
              onAddActivity={isEditMode && onAddActivity ? () => onAddActivity(obj.id) : undefined}
              isEditMode={isEditMode}
            />
          ))}

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

      {canAccessTeamView(userRole) && (
        <SidebarItem
          icon={Users}
          label="Equipe"
          isActive={currentNav === 'strategy' && viewMode === 'team'}
          onClick={openStrategyTeam}
          collapsed={!isOpen}
        />
      )}

      <SidebarItem
        icon={Calendar}
        label="Agenda"
        isActive={currentNav === 'strategy' && viewMode === 'calendar'}
        onClick={openStrategyCalendar}
        collapsed={!isOpen}
      />

      {showNotifications && onAdminTabChange && (
        <div className="relative mt-2 border-t border-white/5 pt-2">
          <NotificationBell
            collapsed={!isOpen}
            onViewAllRequests={() => onAdminTabChange('requests')}
          />
          {!isOpen && (
            <span className="absolute top-4 right-2 w-2 h-2 bg-red-400 rounded-full animate-pulse border border-white shadow-sm" />
          )}
        </div>
      )}
    </>
  );
});
