import React from 'react';
import { List, BarChart2, Users, Menu, Shield, MapPin, Zap, ChevronRight } from 'lucide-react';
import { Objective } from '../../types';
import { UserRole } from '../../types/auth.types';

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
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-[72px] flex justify-between items-center shrink-0 z-30 sticky top-0">
      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
        {/* Menu hamburger mobile */}
        {isMobile && onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg shrink-0"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="flex-1 min-w-0">
          {/* Breadcrumb de Localização */}
          {/* Badge de Localização Moderno */}
          <div className="flex items-center gap-2 mb-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/60 text-xs font-medium text-slate-600 hover:bg-white hover:shadow-sm transition-all group cursor-default">
              <div className="p-0.5 rounded-full bg-teal-100 text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                <MapPin size={10} />
              </div>
              <span className="text-slate-500 uppercase tracking-wide text-[10px]">{macro}</span>
              {micro && (
                <>
                  <ChevronRight size={10} className="text-slate-300" />
                  <span className="text-slate-800 font-bold">{micro}</span>
                </>
              )}
            </div>
          </div>

          {currentNav === 'strategy' ? (
            <h1 className="text-lg font-bold text-slate-900 leading-tight truncate" title={objectiveTitle}>
              {objectiveTitle}
            </h1>
          ) : (
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
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
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode(viewMode === 'table' ? 'gantt' : 'table')}
              className="p-2 text-slate-700"
            >
              {viewMode === 'table' ? <BarChart2 size={20} /> : <List size={20} />}
            </button>
          </div>
        )}

        {/* Botão Admin */}
        {isAdmin && !isMobile && onAdminClick && (
          <button
            onClick={onAdminClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full text-xs font-bold transition-colors border border-purple-100"
          >
            <Shield size={14} />
            <span>ADMIN</span>
          </button>
        )}
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
        ? 'border-teal-500 text-teal-700 bg-teal-50/30'
        : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
      }
    `}
  >
    {icon}
    <span>{label}</span>
  </button>
);
