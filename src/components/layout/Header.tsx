import React from 'react';
import { List, BarChart2, Users, Menu, Shield, MapPin, Zap, ChevronRight } from 'lucide-react';
import { Objective } from '../../types';
import { UserRole } from '../../types/auth.types';
import { ThemeToggle } from '../common/ThemeToggle';

interface HeaderProps {
  macro: string;
  micro?: string;
  currentNav: 'strategy' | 'home' | 'settings';
  selectedObjective: number;
  objectives: Objective[];
  viewMode: 'table' | 'gantt' | 'team' | 'optimized';
  setViewMode: (mode: 'table' | 'gantt' | 'team' | 'optimized') => void;
  onMenuClick?: () => void;
  isMobile?: boolean;
  isAdmin?: boolean;
  userRole?: UserRole;
  onAdminClick?: () => void;
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
}) => {
  const objectiveTitle = objectives.find(o => o.id === selectedObjective)?.title;

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 h-[72px] flex justify-between items-center shrink-0 z-30 sticky top-0 transition-colors duration-200">
      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
        {/* Menu hamburger mobile */}
        {isMobile && onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg shrink-0"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
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
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight truncate" title={objectiveTitle}>
              {objectiveTitle}
            </h1>
          ) : (
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {currentNav === 'home' ? 'Visão Geral' : 'Configurações'}
            </h1>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        {/* Navigation Tabs - Desktop Style */}
        {currentNav === 'strategy' && !isMobile && (
          <div className="flex h-[72px] items-stretch gap-1">
            <TabButton
              active={viewMode === 'table'}
              onClick={() => setViewMode('table')}
              icon={<List size={16} />}
              label="Tabela"
            />
            <TabButton
              active={viewMode === 'gantt'}
              onClick={() => setViewMode('gantt')}
              icon={<BarChart2 size={16} />}
              label="Cronograma"
            />
            {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'gestor') && (
              <TabButton
                active={viewMode === 'team'}
                onClick={() => setViewMode('team')}
                icon={<Users size={16} />}
                label="Equipe"
              />
            )}
            <TabButton
              active={viewMode === 'optimized'}
              onClick={() => setViewMode('optimized')}
              icon={<Zap size={16} />}
              label="Visão Rápida"
            />
          </div>
        )}

        {/* View mode dropdown mobile - Simplificado */}
        {isMobile && currentNav === 'strategy' && (
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode(viewMode === 'table' ? 'gantt' : 'table')}
              className="p-2 text-slate-700 dark:text-slate-200"
            >
              {viewMode === 'table' ? <BarChart2 size={20} /> : <List size={20} />}
            </button>
          </div>
        )}

        {/* Botão Admin */}
        {isAdmin && !isMobile && onAdminClick && (
          <button
            onClick={onAdminClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold transition-colors border border-purple-100 dark:border-purple-800"
          >
            <Shield size={14} />
            <span>ADMIN</span>
          </button>
        )}

        {/* Theme Toggle */}
        <ThemeToggle size="sm" />
      </div>
    </header>
  );
};

// Componente auxiliar para abas limpas
const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-2 px-4 transition-all border-b-2 font-medium text-sm
      ${active
        ? 'border-teal-500 text-teal-700 dark:text-teal-400 bg-teal-50/30 dark:bg-teal-950/30'
        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
      }
    `}
  >
    {icon}
    <span>{label}</span>
  </button>
);
