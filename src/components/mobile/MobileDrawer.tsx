import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Triangle } from 'lucide-react';
import { Objective } from '../../types';
import { UserRole } from '../../types/auth.types';
import { useMobileDrawerHandlers } from '../../hooks/useMobileDrawerHandlers';
import { MobileDrawerAdminShortcut } from './drawer/MobileDrawerAdminShortcut';
import { MobileDrawerFooter } from './drawer/MobileDrawerFooter';
import { MobileDrawerObjectiveList } from './drawer/MobileDrawerObjectiveList';
import { MobileDrawerProfileCard } from './drawer/MobileDrawerProfileCard';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  objectives: Objective[];
  activities: Record<number, { id: string; title: string }[]>;
  selectedObjective: number;
  selectedActivity: string;
  onSelectObjective: (id: number) => void;
  onSelectActivity: (id: string) => void;
  onGoToStrategy: () => void;
  userName?: string;
  userRole?: UserRole;
  userAvatarId?: string;
  isAdmin?: boolean;
  onAdminClick?: () => void;
  onSettingsClick?: () => void;
  onAvatarClick?: () => void;
  onLogout?: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  objectives,
  activities,
  selectedObjective,
  selectedActivity,
  onSelectObjective,
  onSelectActivity,
  onGoToStrategy,
  userName,
  userRole,
  userAvatarId,
  isAdmin,
  onAdminClick,
  onSettingsClick,
  onAvatarClick,
  onLogout,
}) => {
  const {
    handleSelectActivity,
    handleAvatarClick,
    handleAdminClick,
    handleSettingsClick,
    handleLogout,
  } = useMobileDrawerHandlers({
    onClose,
    onSelectObjective,
    onSelectActivity,
    onGoToStrategy,
    onAvatarClick,
    onAdminClick,
    onSettingsClick,
    onLogout,
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 w-[85vw] max-w-[320px] bg-gradient-to-b from-[#0e7490] to-[#047857] dark:from-slate-900 dark:to-slate-950 z-50 flex flex-col shadow-2xl"
          >
            <div className="p-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Triangle size={22} fill="currentColor" className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-white text-lg">RADAR</div>
                  <div className="text-[10px] text-teal-100/70 uppercase tracking-wider">Menu</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <MobileDrawerProfileCard
              userName={userName}
              userRole={userRole}
              userAvatarId={userAvatarId}
              onClick={handleAvatarClick}
            />

            {isAdmin && onAdminClick && (
              <MobileDrawerAdminShortcut onClick={handleAdminClick} />
            )}

            <MobileDrawerObjectiveList
              objectives={objectives}
              activities={activities}
              selectedObjective={selectedObjective}
              selectedActivity={selectedActivity}
              onSelectActivity={handleSelectActivity}
            />

            <MobileDrawerFooter
              onSettingsClick={onSettingsClick ? handleSettingsClick : undefined}
              onLogout={onLogout ? handleLogout : undefined}
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileDrawer;
