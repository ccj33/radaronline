import React from 'react';
import { List, BarChart2, Users, Menu, Shield, MapPin, Zap, ChevronRight, Pencil, Calendar } from 'lucide-react';
import { Objective } from '../../types';
import { UserRole } from '../../types/auth.types';
import { ThemeToggle } from '../common/ThemeToggle';
import { ZoomControl } from '../common/ZoomControl';
import { NotificationBell } from '../common/NotificationBell';
import { getObjectiveTitleWithoutNumber } from '../../lib/text';

interface HeaderProps {
  macro: string;
  micro?: string;
  currentNav: 'strategy' | 'home' | 'settings';
  selectedObjective: number;
  objectives: Objective[];
  viewMode: 'table' | 'gantt' | 'team' | 'optimized' | 'calendar';
  setViewMode: (mode: 'table' | 'gantt' | 'team' | 'optimized' | 'calendar') => void;
  onMenuClick?: () => void;
  isMobile?: boolean;
  isAdmin?: boolean;
  userRole?: UserRole;
  onAdminClick?: () => void;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  onUpdateObjective?: (id: number, newTitle: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  macro,
  micro,
  currentNav,
  selectedObjective,
  objectives,
  viewMode,
  setViewMode,
  onMenuClick,
  isMobile = false,
  isAdmin = false,
  userRole,
  onAdminClick,
  isEditMode = false,
  onToggleEditMode,
  onUpdateObjective,
}) => {
  const objectiveIndex = objectives.findIndex(o => o.id === selectedObjective);
  const objective = objectives[objectiveIndex];
  const rawTitle = objective?.title || '';
  // Usa a posição sequencial (índice + 1) e remove o número do título se existir
  const objectiveTitle = objectiveIndex >= 0 
    ? `Obj. ${objectiveIndex + 1}. ${getObjectiveTitleWithoutNumber(rawTitle)}`
    : rawTitle;
  
  // Título limpo (sem prefixo) para passar ao modal de edição
  const cleanTitleForEdit = getObjectiveTitleWithoutNumber(rawTitle);

  // State de edição inline removido em favor do modal centralizado


  return (
    <header data-tour="header" className="bg-white/95 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 h-16 flex justify-between items-center shrink-0 z-30 sticky top-0 transition-all duration-200 shadow-sm">
      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
        {/* Menu hamburger mobile */}
        {isMobile && onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg shrink-0 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu size={18} />
          </button>
        )}

        <div className="flex-1 min-w-0">
          {/* Breadcrumb de Localização */}
          {/* Badge de Localização Moderno */}
          <div className="flex items-center gap-2 mb-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm transition-all group cursor-default">
              <div className="p-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                <MapPin size={10} />
              </div>
              <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wide text-[10px]">{macro}</span>
              {micro && (
                <>
                  <ChevronRight size={10} className="text-slate-300 dark:text-slate-500" />
                  <span className="text-slate-800 dark:text-slate-100 font-bold">{micro}</span>
                </>
              )}
            </div>
          </div>

          {currentNav === 'strategy' ? (
            isEditMode && currentNav === 'strategy' ? (
              <h1
                className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight truncate cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded -ml-2 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all flex items-center gap-2"
                title="Clique para editar"
                onClick={() => onUpdateObjective?.(objective?.id || 0, cleanTitleForEdit)}
              >
                {objectiveTitle}
                <Pencil size={12} className="text-slate-400" />
              </h1>
            ) : (
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight truncate" title={objectiveTitle}>
                {objectiveTitle}
              </h1>
            )
          ) : (
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {currentNav === 'home' ? 'Visão Geral' : 'Configurações'}
            </h1>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        {/* Navigation Tabs - Desktop Style */}
        {currentNav === 'strategy' && !isMobile && (
          <div data-tour="view-mode" className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <TabButton
              active={viewMode === 'table'}
              onClick={() => setViewMode('table')}
              icon={<List size={14} />}
              label="Tabela"
            />
            <TabButton
              active={viewMode === 'gantt'}
              onClick={() => setViewMode('gantt')}
              icon={<BarChart2 size={14} />}
              label="Cronograma"
            />
            {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'gestor') && (
              <TabButton
                active={viewMode === 'team'}
                onClick={() => setViewMode('team')}
                icon={<Users size={14} />}
                label="Equipe"
              />
            )}
            <TabButton
              active={viewMode === 'optimized'}
              onClick={() => setViewMode('optimized')}
              icon={<Zap size={14} />}
              label="Visão Rápida"
            />
            <TabButton
              active={viewMode === 'calendar'}
              onClick={() => setViewMode('calendar')}
              icon={<Calendar size={14} />}
              label="Agenda"
            />
          </div>
        )}

        {/* View mode dropdown mobile - Simplificado */}
        {isMobile && currentNav === 'strategy' && (
          <div className="flex items-center gap-2">
            {/* Selector de modo compacto */}
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'table' | 'gantt' | 'team' | 'optimized' | 'calendar')}
              className="appearance-none bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-2 rounded-lg border-0 focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="table">📋 Ações</option>
              <option value="gantt">📅 Cronograma</option>
              {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'gestor') && (
                <option value="team">👥 Equipe</option>
              )}
              <option value="optimized">⚡ Rápida</option>
              <option value="calendar">📆 Agenda</option>
              <option value="optimized">⚡ Rápida</option>
            </select>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Notification Bell - Moves here when Microregion is selected */}
          {micro && <NotificationBell />}

          {/* Edit Mode Toggle - Only shown in Table View */}
          {(isAdmin || userRole === 'superadmin') && onToggleEditMode && viewMode === 'table' && (
            <button
              onClick={onToggleEditMode}
              className={`
                flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-tight transition-all
                ${isEditMode
                  ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-500/30'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'}
              `}
              title={isEditMode ? "Modo de edição ativo" : "Ativar modo de edição"}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isEditMode ? 'bg-amber-500' : 'bg-slate-400'}`} />
              <span>{isEditMode ? 'EDITANDO' : 'EDITAR'}</span>
            </button>
          )}

          {/* Botão Admin */}
          {isAdmin && !isMobile && onAdminClick && (
            <button
              onClick={onAdminClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 dark:bg-purple-900/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-lg text-[10px] font-bold transition-colors border border-purple-100/50 dark:border-purple-800/50"
            >
              <Shield size={12} />
              <span>ADMIN</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Utility Group */}
          <div className="flex items-center gap-1">
            <ZoomControl />
            <ThemeToggle size="sm" />
          </div>
        </div>
      </div>
    </header>
  );
};

// Componente auxiliar para abas limpas
const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-2 px-3 py-1.5 transition-all rounded-lg font-bold text-[11px] tracking-tight
      ${active
        ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600/50'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/40'
      }
    `}
  >
    <span className={active ? 'text-teal-500' : 'text-slate-400 dark:text-slate-500'}>{icon}</span>
    <span>{label}</span>
  </button>
);
