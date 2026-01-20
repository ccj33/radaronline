import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, LayoutDashboard, Zap, List, CalendarDays } from 'lucide-react';

interface MobileBottomNavProps {
  currentNav: 'strategy' | 'home' | 'settings' | 'dashboard' | 'news';
  viewMode: 'table' | 'gantt' | 'team' | 'optimized' | 'calendar';
  onNavChange: (nav: 'strategy' | 'home' | 'settings' | 'dashboard' | 'news') => void;
  onViewModeChange: (mode: 'table' | 'gantt' | 'team' | 'optimized' | 'calendar') => void;
  showTeamOption?: boolean;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`
      relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5
      transition-all duration-200 min-h-[52px] max-w-[64px]
      ${isActive
        ? 'text-teal-600 dark:text-teal-400'
        : 'text-slate-400 dark:text-slate-500 active:text-slate-600 dark:active:text-slate-300'
      }
    `}
    aria-current={isActive ? 'page' : undefined}
  >
    <motion.div
      className="relative"
      whileTap={{ scale: 0.85 }}
      transition={{ duration: 0.1 }}
    >
      {isActive && (
        <motion.div
          layoutId="bottomNavIndicator"
          className="absolute -inset-1.5 bg-teal-100/80 dark:bg-teal-900/50 rounded-lg"
          initial={false}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{icon}</span>
      {badge && badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center z-20 shadow-sm">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </motion.div>
    <span className={`text-[9px] font-medium transition-all leading-tight ${isActive ? 'font-bold text-teal-700 dark:text-teal-300' : ''}`}>
      {label}
    </span>
  </button>
);

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentNav,
  viewMode,
  onNavChange,
  onViewModeChange,
  showTeamOption = false,
}) => {
  // Navegação unificada com todas as opções principais
  // Dashboard sempre visível + modos de visualização da estratégia

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 dark:bg-slate-800/98 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-700/80 shadow-[0_-4px_30px_rgba(0,0,0,0.08)] safe-area-bottom"
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-1">
        {/* Dashboard - Sempre visível */}
        <NavItem
          icon={<LayoutDashboard size={18} strokeWidth={2.2} />}
          label="Painel"
          isActive={currentNav === 'home'}
          onClick={() => onNavChange('home')}
        />

        {/* Ações (Tabela) */}
        <NavItem
          icon={<List size={18} strokeWidth={2.2} />}
          label="Ações"
          isActive={currentNav === 'strategy' && viewMode === 'table'}
          onClick={() => {
            onNavChange('strategy');
            onViewModeChange('table');
          }}
        />

        {/* Agenda/Calendário */}
        <NavItem
          icon={<CalendarDays size={18} strokeWidth={2.2} />}
          label="Agenda"
          isActive={currentNav === 'strategy' && viewMode === 'calendar'}
          onClick={() => {
            onNavChange('strategy');
            onViewModeChange('calendar');
          }}
        />

        {/* Cronograma (Gantt) */}
        <NavItem
          icon={<Calendar size={18} strokeWidth={2.2} />}
          label="Gantt"
          isActive={currentNav === 'strategy' && viewMode === 'gantt'}
          onClick={() => {
            onNavChange('strategy');
            onViewModeChange('gantt');
          }}
        />

        {/* Equipe - Condicional */}
        {showTeamOption && (
          <NavItem
            icon={<Users size={18} strokeWidth={2.2} />}
            label="Equipe"
            isActive={currentNav === 'strategy' && viewMode === 'team'}
            onClick={() => {
              onNavChange('strategy');
              onViewModeChange('team');
            }}
          />
        )}

        {/* Visão Rápida/Otimizada */}
        <NavItem
          icon={<Zap size={18} strokeWidth={2.2} />}
          label="Rápida"
          isActive={currentNav === 'strategy' && viewMode === 'optimized'}
          onClick={() => {
            onNavChange('strategy');
            onViewModeChange('optimized');
          }}
        />
      </div>

      {/* Home indicator safe area - altura dinâmica */}
      <div className="h-safe-area-inset-bottom bg-white/98 dark:bg-slate-800/98" />
    </motion.nav>
  );
};

export default MobileBottomNav;
