import React from 'react';
import { motion } from 'framer-motion';
import { Home, Target, Calendar, Users, LayoutDashboard, Zap } from 'lucide-react';

interface MobileBottomNavProps {
  currentNav: 'strategy' | 'home' | 'settings';
  viewMode: 'table' | 'gantt' | 'team' | 'optimized' | 'calendar';
  onNavChange: (nav: 'strategy' | 'home' | 'settings') => void;
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
      relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1
      transition-all duration-200 min-h-[56px]
      ${isActive 
        ? 'text-teal-600 dark:text-teal-400' 
        : 'text-slate-400 dark:text-slate-500 active:text-slate-600'
      }
    `}
    aria-current={isActive ? 'page' : undefined}
  >
    <motion.div
      className="relative"
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.1 }}
    >
      {isActive && (
        <motion.div
          layoutId="bottomNavIndicator"
          className="absolute -inset-2 bg-teal-100 dark:bg-teal-900/40 rounded-xl"
          initial={false}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative z-10">{icon}</span>
      {badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center z-20">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </motion.div>
    <span className={`text-[10px] font-medium transition-all ${isActive ? 'font-bold' : ''}`}>
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
  // No modo estratégia, mostramos as opções de visualização
  // No modo home, mostramos navegação principal
  
  const isStrategyMode = currentNav === 'strategy';

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] safe-area-bottom"
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {isStrategyMode ? (
          // Modo estratégia: opções de visualização
          <>
            <NavItem
              icon={<Target size={22} strokeWidth={2} />}
              label="Ações"
              isActive={viewMode === 'table'}
              onClick={() => onViewModeChange('table')}
            />
            <NavItem
              icon={<Calendar size={22} strokeWidth={2} />}
              label="Cronograma"
              isActive={viewMode === 'gantt'}
              onClick={() => onViewModeChange('gantt')}
            />
            {showTeamOption && (
              <NavItem
                icon={<Users size={22} strokeWidth={2} />}
                label="Equipe"
                isActive={viewMode === 'team'}
                onClick={() => onViewModeChange('team')}
              />
            )}
            <NavItem
              icon={<Zap size={22} strokeWidth={2} />}
              label="Rápida"
              isActive={viewMode === 'optimized'}
              onClick={() => onViewModeChange('optimized')}
            />
            <NavItem
              icon={<Home size={22} strokeWidth={2} />}
              label="Dashboard"
              isActive={false}
              onClick={() => onNavChange('home')}
            />
          </>
        ) : (
          // Modo home/dashboard
          <>
            <NavItem
              icon={<LayoutDashboard size={22} strokeWidth={2} />}
              label="Dashboard"
              isActive={currentNav === 'home'}
              onClick={() => onNavChange('home')}
            />
            <NavItem
              icon={<Target size={22} strokeWidth={2} />}
              label="Estratégia"
              isActive={false}
              onClick={() => onNavChange('strategy')}
            />
          </>
        )}
      </div>
      
      {/* Home indicator safe area */}
      <div className="h-safe-area-inset-bottom" />
    </motion.nav>
  );
};

export default MobileBottomNav;
