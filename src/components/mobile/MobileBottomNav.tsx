import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  LayoutGrid,
  List,
  Menu,
} from 'lucide-react';

type AppNav = 'strategy' | 'home' | 'settings' | 'dashboard' | 'news' | 'hub' | 'forums' | 'mentorship' | 'education' | 'repository';
type Workspace = 'planning' | 'community';
type ViewMode = 'table' | 'gantt' | 'team' | 'optimized' | 'calendar';

interface MobileBottomNavProps {
  currentNav: AppNav;
  currentWorkspace: Workspace;
  onNavChange: (nav: AppNav) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onWorkspaceSelect: (workspace: Workspace) => void;
  onMenuOpen: () => void;
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
      transition-all duration-200 min-h-[52px] max-w-[92px]
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
  currentWorkspace,
  onNavChange,
  onViewModeChange,
  onWorkspaceSelect,
  onMenuOpen,
}) => {
  const isPanelActive =
    currentWorkspace === 'planning' &&
    (currentNav === 'home' || currentNav === 'news' || currentNav === 'dashboard');
  const isActionsActive = currentWorkspace === 'planning' && currentNav === 'strategy';
  const isCommunityActive = currentWorkspace === 'community';

  const handleOpenPanel = () => {
    onWorkspaceSelect('planning');
    onNavChange('home');
  };

  const handleOpenActions = () => {
    const shouldResetMode = currentWorkspace !== 'planning' || currentNav !== 'strategy';
    onWorkspaceSelect('planning');
    onNavChange('strategy');
    if (shouldResetMode) {
      onViewModeChange('table');
    }
  };

  const handleOpenCommunity = () => {
    onWorkspaceSelect('community');
    onNavChange('hub');
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 dark:bg-slate-800/98 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-700/80 shadow-[0_-4px_30px_rgba(0,0,0,0.08)] safe-area-bottom"
      role="navigation"
      aria-label="Navegacao principal"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-1">
        <NavItem
          icon={<LayoutDashboard size={18} strokeWidth={2.2} />}
          label="Painel"
          isActive={isPanelActive}
          onClick={handleOpenPanel}
        />
        <NavItem
          icon={<List size={18} strokeWidth={2.2} />}
          label="Acoes"
          isActive={isActionsActive}
          onClick={handleOpenActions}
        />
        <NavItem
          icon={<LayoutGrid size={18} strokeWidth={2.2} />}
          label="Comunidade"
          isActive={isCommunityActive}
          onClick={handleOpenCommunity}
        />
        <NavItem
          icon={<Menu size={18} strokeWidth={2.2} />}
          label="Menu"
          isActive={false}
          onClick={onMenuOpen}
        />
      </div>

      <div className="h-safe-area-inset-bottom bg-white/98 dark:bg-slate-800/98" />
    </motion.nav>
  );
};

export default MobileBottomNav;
