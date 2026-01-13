import React from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Calendar, Clock, Users, ChevronRight, 
  AlertTriangle, CheckCircle2, MoreHorizontal
} from 'lucide-react';
import { Action, Status, RaciRole } from '../../types';
import { formatDateBr } from '../../lib/date';
import { getActionNumber } from '../../lib/text';

// =============================================
// MOBILE ACTION CARD
// Card otimizado para touch com swipe actions
// =============================================

interface MobileActionCardProps {
  action: Action;
  onClick: () => void;
  onSwipeDelete?: () => void;
  canDelete?: boolean;
  isCompact?: boolean;
}

const rolePriority: Record<RaciRole, number> = { R: 0, A: 1, C: 2, I: 3 };

const statusConfig: Record<Status, { 
  color: string; 
  bg: string; 
  icon: React.ReactNode;
  borderColor: string;
}> = {
  'Não Iniciado': { 
    color: 'text-slate-600 dark:text-slate-400', 
    bg: 'bg-slate-100 dark:bg-slate-700',
    borderColor: 'border-l-slate-400',
    icon: <Clock size={12} className="text-slate-400" />
  },
  'Em Andamento': { 
    color: 'text-blue-700 dark:text-blue-300', 
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    borderColor: 'border-l-blue-500',
    icon: <Clock size={12} className="text-blue-500" />
  },
  'Concluído': { 
    color: 'text-emerald-700 dark:text-emerald-300', 
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    borderColor: 'border-l-emerald-500',
    icon: <CheckCircle2 size={12} className="text-emerald-500" />
  },
  'Atrasado': { 
    color: 'text-rose-700 dark:text-rose-300', 
    bg: 'bg-rose-100 dark:bg-rose-900/40',
    borderColor: 'border-l-rose-500',
    icon: <AlertTriangle size={12} className="text-rose-500" />
  },
};

export const MobileActionCard: React.FC<MobileActionCardProps> = ({
  action,
  onClick,
  onSwipeDelete,
  canDelete = false,
  isCompact = false,
}) => {
  const [isSwiped, setIsSwiped] = React.useState(false);
  const status = statusConfig[action.status] || statusConfig['Não Iniciado'];
  
  const orderedRaci = [...action.raci]
    .sort((a, b) => rolePriority[a.role] - rolePriority[b.role]);
  
  const responsaveis = orderedRaci.filter(r => r.role === 'R');
  
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -100 && canDelete) {
      setIsSwiped(true);
    } else {
      setIsSwiped(false);
    }
  };

  const handleDelete = () => {
    if (onSwipeDelete) {
      onSwipeDelete();
    }
  };

  const progressColor = 
    action.progress >= 100 ? 'bg-emerald-500' :
    action.progress >= 50 ? 'bg-teal-500' :
    action.progress >= 25 ? 'bg-amber-500' :
    'bg-slate-300';

  return (
    <div className="relative overflow-hidden">
      {/* Delete action revealed on swipe */}
      {canDelete && (
        <div className="absolute inset-y-0 right-0 w-20 bg-rose-500 flex items-center justify-center">
          <button
            onClick={handleDelete}
            className="w-full h-full flex items-center justify-center text-white"
          >
            <span className="text-xs font-bold">Excluir</span>
          </button>
        </div>
      )}

      <motion.div
        drag={canDelete ? "x" : false}
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: isSwiped ? -80 : 0 }}
        onClick={() => !isSwiped && onClick()}
        className={`
          relative bg-white dark:bg-slate-800 
          border-l-4 ${status.borderColor}
          ${isCompact ? 'p-3' : 'p-4'}
          active:bg-slate-50 dark:active:bg-slate-700
          touch-pan-y cursor-pointer
        `}
      >
        {/* Top row: ID, Status, More */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
              {getActionNumber(action.id)}
            </span>
            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
              {status.icon}
              {action.status}
            </span>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>

        {/* Title */}
        <h3 className={`font-medium text-slate-800 dark:text-slate-100 ${isCompact ? 'text-sm line-clamp-1' : 'text-sm line-clamp-2'} mb-2`}>
          {action.title}
        </h3>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>Progresso</span>
            <span className="font-bold text-slate-600 dark:text-slate-300">{action.progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${action.progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${progressColor}`}
            />
          </div>
        </div>

        {/* Bottom row: Date and Team */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            <span>{formatDateBr(action.plannedEndDate || action.endDate) || 'Sem prazo'}</span>
          </div>
          
          <div className="flex items-center gap-1">
            {responsaveis.length > 0 ? (
              <div className="flex items-center gap-1">
                <Users size={12} />
                <span className="truncate max-w-[80px]">
                  {responsaveis[0].name.split(' ')[0]}
                  {responsaveis.length > 1 && ` +${responsaveis.length - 1}`}
                </span>
              </div>
            ) : (
              <span className="text-slate-400 italic">Sem responsável</span>
            )}
            <ChevronRight size={14} className="text-slate-300" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// =============================================
// MOBILE ACTION LIST
// Lista de ações com scroll otimizado
// =============================================

interface MobileActionListProps {
  actions: Action[];
  onActionClick: (action: Action) => void;
  onDeleteAction?: (uid: string) => void;
  canDelete?: (action: Action) => boolean;
  emptyMessage?: string;
}

export const MobileActionList: React.FC<MobileActionListProps> = ({
  actions,
  onActionClick,
  onDeleteAction,
  canDelete = () => true,
  emptyMessage = "Nenhuma ação encontrada"
}) => {
  return (
    <div className="touch-scroll divide-y divide-slate-100 dark:divide-slate-700">
      <AnimatePresence mode="popLayout">
        {actions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 px-4 text-center"
          >
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{emptyMessage}</p>
          </motion.div>
        ) : (
          actions.map((action, idx) => (
            <motion.div
              key={action.uid}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: idx * 0.03 }}
            >
              <MobileActionCard
                action={action}
                onClick={() => onActionClick(action)}
                onSwipeDelete={() => onDeleteAction?.(action.uid)}
                canDelete={canDelete(action)}
              />
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================
// FLOATING ACTION BUTTON (FAB)
// =============================================

interface MobileFabProps {
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  color?: 'teal' | 'blue' | 'rose';
}

const fabColors = {
  teal: 'from-teal-500 to-emerald-500 shadow-teal-500/30',
  blue: 'from-blue-500 to-indigo-500 shadow-blue-500/30',
  rose: 'from-rose-500 to-pink-500 shadow-rose-500/30',
};

export const MobileFab: React.FC<MobileFabProps> = ({
  onClick,
  icon,
  label,
  color = 'teal'
}) => {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        fab bg-gradient-to-br ${fabColors[color]}
        text-white shadow-lg
      `}
      aria-label={label || "Ação"}
    >
      {icon}
    </motion.button>
  );
};

export default {
  MobileActionCard,
  MobileActionList,
  MobileFab
};
