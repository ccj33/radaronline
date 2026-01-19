import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
  Layers,
  Zap,
  Calendar,
  Search,
  Edit3,
  MessageCircle,
  MapPin
} from 'lucide-react';
import { Action, Activity, Objective, TeamMember, Status, RaciRole } from '../../types';
import { formatDateBr, parseDateLocal, getTodayStr } from '../../lib/date';
import { getActivityDisplayId, getActionDisplayId } from '../../lib/text';
import { ActionDetailModal } from '../actions/ActionDetailModal';

interface OptimizedViewProps {
  objectives: Objective[];
  activities: Record<number, Activity[]>;
  actions: Action[];
  team: TeamMember[];
  onUpdateAction?: (uid: string, updates: Partial<Action>) => void;
  onSaveAction?: (uid?: string) => void;
  onDeleteAction?: (uid: string) => void;
  onAddRaci?: (uid: string, memberId: string, role: RaciRole) => void;
  onRemoveRaci?: (uid: string, idx: number, memberName: string) => void;
  onAddComment?: (uid: string, content: string) => void;
  onEditComment?: (actionUid: string, commentId: string, content: string) => void;
  onDeleteComment?: (actionUid: string, commentId: string) => void;
  readOnly?: boolean;
}



const OBJECTIVE_COLORS: Record<number, { border: string; bg: string; accent: string; text: string }> = {
  1: { border: 'border-cyan-200 dark:border-cyan-800', bg: 'bg-cyan-50 dark:bg-cyan-900/30', accent: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
  2: { border: 'border-indigo-200 dark:border-indigo-800', bg: 'bg-indigo-50 dark:bg-indigo-900/30', accent: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
  3: { border: 'border-amber-200 dark:border-amber-800', bg: 'bg-amber-50 dark:bg-amber-900/30', accent: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
};

const STATUS_CONFIG: Record<Status, { icon: React.ReactNode; color: string; bg: string; header: string }> = {
  'Concluído': { icon: <CheckCircle2 size={14} />, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800', header: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  'Em Andamento': { icon: <Clock size={14} />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800', header: 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  'Não Iniciado': { icon: <Circle size={14} />, color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600', header: 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300' },
  'Atrasado': { icon: <AlertTriangle size={14} />, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800', header: 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' },
};

// Ordem tradicional: backlog -> em andamento -> risco/atraso -> concluído
const KANBAN_COLUMNS: { key: Status; label: string }[] = [
  { key: 'Não Iniciado', label: 'Não iniciado' },
  { key: 'Em Andamento', label: 'Em andamento' },
  { key: 'Atrasado', label: 'Atrasado' },
  { key: 'Concluído', label: 'Concluído' },
];

const MiniProgress: React.FC<{ value: number; size?: 'sm' | 'md' }> = ({ value, size = 'sm' }) => {
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';
  const getGradient = () => {
    if (value >= 100) return 'bg-gradient-to-r from-emerald-400 to-emerald-500';
    if (value >= 75) return 'bg-gradient-to-r from-teal-400 to-emerald-500';
    if (value >= 50) return 'bg-gradient-to-r from-blue-400 to-teal-500';
    if (value > 0) return 'bg-gradient-to-r from-amber-400 to-amber-500';
    return 'bg-slate-200 dark:bg-slate-600';
  };
  return (
    <div className={`w-full ${height} bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner`}>
      <div
        className={`${height} ${getGradient()} rounded-full transition-all duration-500 ease-out`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
};





const ActionCard: React.FC<{
  action: Action;
  onClick?: () => void;
  isLate?: boolean;
}> = ({ action, onClick, isLate }) => {
  const status = STATUS_CONFIG[action.status] || STATUS_CONFIG['Não Iniciado'];
  const responsible = action.raci.find(r => r.role === 'R')?.name || action.raci[0]?.name || '-';
  const commentCount = action.comments?.length || 0;

  return (
    <div
      className={`group relative p-3 rounded-xl border cursor-pointer transition-all duration-200 
        ${isLate
          ? 'border-rose-200/80 bg-gradient-to-br from-rose-50 to-white dark:border-rose-700/60 dark:from-rose-900/40 dark:to-slate-800 shadow-rose-100/50 dark:shadow-rose-900/20'
          : 'border-slate-200/60 dark:border-slate-600/60 bg-white dark:bg-slate-800 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-lg hover:shadow-teal-100/40 dark:hover:shadow-teal-900/20'
        } 
        shadow-sm hover:-translate-y-0.5`}
      onClick={onClick}
    >
      {/* Status Badge */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg}`}>
            {status.icon}
            <span className={`${status.color} hidden sm:inline`}>{action.status === 'Não Iniciado' ? 'Pendente' : action.status === 'Em Andamento' ? 'Andamento' : action.status === 'Concluído' ? 'Concluído' : 'Atrasado'}</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
            {getActionDisplayId(action.id)}
          </span>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 mb-3 leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
        {action.title}
      </h4>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Progresso</span>
          <span className={`text-sm font-bold tabular-nums ${action.progress >= 100 ? 'text-emerald-600 dark:text-emerald-400' :
            action.progress >= 50 ? 'text-teal-600 dark:text-teal-400' :
              'text-slate-600 dark:text-slate-300'
            }`}>
            {action.progress}%
          </span>
        </div>
        <MiniProgress value={action.progress} size="md" />
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
        <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 truncate max-w-[45%]">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            {responsible.charAt(0).toUpperCase()}
          </div>
          <span className="truncate">{responsible.split(' ')[0]}</span>
        </span>
        <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          {commentCount > 0 && (
            <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-1.5 py-0.5 rounded-full">
              <MessageCircle size={11} />
              <span className="font-medium">{commentCount}</span>
            </span>
          )}
          <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 px-2 py-0.5 rounded-full">
            <Calendar size={11} className="text-slate-400" />
            <span className="font-medium">{formatDateBr(action.plannedEndDate)}</span>
          </span>
        </div>
      </div>

      {/* Hover Edit Indicator */}
      <div className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-gradient-to-r from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30 transition-all duration-200 scale-90 group-hover:scale-100">
        <Edit3 size={11} className="text-white" />
      </div>

      {/* Late Indicator */}
      {isLate && (
        <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center">
          <span className="absolute w-4 h-4 bg-rose-500 rounded-full animate-ping opacity-40" />
          <span className="relative w-3 h-3 bg-rose-500 rounded-full shadow-lg shadow-rose-500/50" />
        </div>
      )}
    </div>
  );
};

const ActionRow: React.FC<{
  action: Action;
  onClick?: () => void;
  isLate?: boolean;
}> = ({ action, onClick, isLate }) => {
  const status = STATUS_CONFIG[action.status] || STATUS_CONFIG['Não Iniciado'];
  const responsible = action.raci.find(r => r.role === 'R')?.name || '-';
  const commentCount = action.comments?.length || 0;
  return (
    <div
      className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 
        hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent dark:hover:from-slate-700/50 dark:hover:to-transparent 
        border-b border-slate-100 dark:border-slate-700/50 last:border-0
        ${isLate ? 'bg-rose-50/40 dark:bg-rose-900/20' : ''}`}
      onClick={onClick}
    >
      {/* Status Indicator */}
      <div className={`w-1.5 h-8 rounded-full ${action.status === 'Concluído' ? 'bg-emerald-500' :
        action.status === 'Em Andamento' ? 'bg-blue-500' :
          action.status === 'Atrasado' || isLate ? 'bg-rose-500' :
            'bg-slate-300 dark:bg-slate-600'
        }`} />

      {/* Status Icon */}
      <span className={`shrink-0 p-1 rounded-lg ${status.bg}`}>{status.icon}</span>

      {/* ID Badge */}
      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded w-14 text-center shrink-0">
        {getActionDisplayId(action.id)}
      </span>

      {/* Title */}
      <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 truncate font-medium group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
        {action.title}
      </span>

      {/* Progress */}
      <div className="w-28 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <MiniProgress value={action.progress} />
          </div>
          <span className={`text-xs font-bold tabular-nums w-9 text-right ${action.progress >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
            }`}>
            {action.progress}%
          </span>
        </div>
      </div>

      {/* Comments */}
      <span className="w-10 shrink-0">
        {commentCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full">
            <MessageCircle size={11} />
            {commentCount}
          </span>
        )}
      </span>

      {/* Responsible */}
      <span className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 w-28 truncate shrink-0">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
          {responsible.charAt(0).toUpperCase()}
        </div>
        <span className="truncate">{responsible.split(' ')[0]}</span>
      </span>

      {/* Date */}
      <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 w-24 shrink-0 justify-end bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded-lg">
        <Calendar size={11} />
        {formatDateBr(action.plannedEndDate)}
      </span>

      {/* Late Warning */}
      {isLate && (
        <span className="shrink-0 p-1 rounded-full bg-rose-100 dark:bg-rose-900/50">
          <AlertTriangle size={12} className="text-rose-500" />
        </span>
      )}

      {/* Edit hover */}
      <span className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-teal-500 transition-all shrink-0">
        <Edit3 size={11} className="text-white" />
      </span>
    </div>
  );
};

export const OptimizedView: React.FC<OptimizedViewProps> = ({
  objectives,
  activities,
  actions,
  team,
  onUpdateAction,
  onSaveAction,
  onDeleteAction,
  onAddRaci,
  onRemoveRaci,
  onAddComment,
  readOnly = false,
}) => {

  const [expandedObjectives, setExpandedObjectives] = useState<number[]>(objectives.map(o => o.id));
  const [expandedActivities, setExpandedActivities] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'tree' | 'cards' | 'list' | 'kanban'>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all' | 'late' | 'alert'>('all');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const today = parseDateLocal(getTodayStr());

  const isActionLate = useCallback((action: Action): boolean => {
    if (action.status === 'Concluído') return false;
    const endDate = parseDateLocal(action.plannedEndDate);
    return Boolean(endDate && today && endDate < today);
  }, [today]);

  const isActionAlert = useCallback((action: Action): boolean => {
    if (action.status === 'Concluído') return false;
    const endDate = parseDateLocal(action.plannedEndDate);
    if (!endDate || !today) return false;
    const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }, [today]);

  const filteredActions = useMemo(() => {
    return actions.filter(a => {
      if (searchTerm && !a.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (statusFilter === 'late') return isActionLate(a);
      if (statusFilter === 'alert') return isActionAlert(a) && !isActionLate(a);
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      return true;
    });
  }, [actions, searchTerm, statusFilter, isActionLate, isActionAlert]);

  // Ação selecionada para o modal
  const selectedAction = useMemo(() => {
    if (!selectedUid) return null;
    return actions.find(a => a.uid === selectedUid) || null;
  }, [selectedUid, actions]);

  // Nome da atividade para o modal
  const selectedActivityName = useMemo(() => {
    if (!selectedAction) return '';
    for (const [, acts] of Object.entries(activities)) {
      const act = acts.find(a => a.id === selectedAction.activityId);
      if (act) return act.title;
    }
    return '';
  }, [selectedAction, activities]);

  const metrics = useMemo(() => {
    const total = actions.length;
    const completed = actions.filter(a => a.status === 'Concluído').length;
    const inProgress = actions.filter(a => a.status === 'Em Andamento').length;
    const notStarted = actions.filter(a => a.status === 'Não Iniciado').length;
    const late = actions.filter(isActionLate).length;
    const alert = actions.filter(a => isActionAlert(a) && !isActionLate(a)).length;
    const avgProgress = total > 0 ? Math.round(actions.reduce((s, a) => s + a.progress, 0) / total) : 0;
    return { total, completed, inProgress, notStarted, late, alert, avgProgress };
  }, [actions, isActionLate, isActionAlert]);

  const groupedData = useMemo(() => {
    return objectives.map(obj => {
      const objActivities = activities[obj.id] || [];
      const objActions = filteredActions.filter(a => objActivities.some(act => act.id === a.activityId));
      const objProgress = objActions.length > 0 ? Math.round(objActions.reduce((s, a) => s + a.progress, 0) / objActions.length) : 0;
      const objLate = objActions.filter(isActionLate).length;

      return {
        ...obj,
        activities: objActivities.map(act => {
          const actActions = filteredActions.filter(a => a.activityId === act.id);
          const actProgress = actActions.length > 0 ? Math.round(actActions.reduce((s, a) => s + a.progress, 0) / actActions.length) : 0;
          const actLate = actActions.filter(isActionLate).length;
          return { ...act, actions: actActions, progress: actProgress, lateCount: actLate };
        }),
        actionCount: objActions.length,
        progress: objProgress,
        lateCount: objLate,
      };
    });
  }, [objectives, activities, filteredActions, isActionLate]);

  const handleSelectAction = (uid: string) => {
    setSelectedUid(uid);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUid(null);
  };

  const handleUpdateActionField = (uid: string, field: string, value: string | number) => {
    if (onUpdateAction) {
      onUpdateAction(uid, { [field]: value });
    }
  };

  const handleDeleteAction = (uid: string) => {
    if (onDeleteAction) {
      onDeleteAction(uid);
      handleCloseModal();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-slate-50 to-teal-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Modal de Detalhes da Ação */}
      <ActionDetailModal
        isOpen={isModalOpen}
        action={selectedAction}
        team={team}
        activityName={selectedActivityName}
        onClose={handleCloseModal}
        onUpdateAction={handleUpdateActionField}
        onSaveAction={onSaveAction}
        onDeleteAction={handleDeleteAction}
        onAddRaci={onAddRaci}
        onRemoveRaci={onRemoveRaci}
        onAddComment={onAddComment}
        canEdit={!readOnly}
        canDelete={!readOnly}
        readOnly={readOnly}
      />

      {/* Header Minimalista */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        {/* Linha 1: Métricas Interativas */}
        <div className="flex items-center justify-center gap-1 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/50">
          {/* Total */}
          <button
            onClick={() => setStatusFilter('all')}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'all'
              ? 'bg-slate-100 dark:bg-slate-700'
              : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
          >
            <span className={`text-lg font-bold ${statusFilter === 'all' ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              {metrics.total}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Total</span>
          </button>

          <span className="text-slate-300 dark:text-slate-600">|</span>

          {/* Concluídas */}
          <button
            onClick={() => setStatusFilter('Concluído')}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'Concluído'
              ? 'bg-emerald-50 dark:bg-emerald-900/30'
              : 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20'
              }`}
          >
            <span className={`text-lg font-bold ${statusFilter === 'Concluído' ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-500/70 dark:text-emerald-500/50'}`}>
              {metrics.completed}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Concluídas</span>
          </button>

          {/* Em Andamento */}
          <button
            onClick={() => setStatusFilter('Em Andamento')}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'Em Andamento'
              ? 'bg-blue-50 dark:bg-blue-900/30'
              : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
              }`}
          >
            <span className={`text-lg font-bold ${statusFilter === 'Em Andamento' ? 'text-blue-600 dark:text-blue-400' : 'text-blue-500/70 dark:text-blue-500/50'}`}>
              {metrics.inProgress}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Andamento</span>
          </button>

          {/* Não Iniciadas */}
          <button
            onClick={() => setStatusFilter('Não Iniciado')}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'Não Iniciado'
              ? 'bg-slate-100 dark:bg-slate-700'
              : 'hover:bg-slate-100/50 dark:hover:bg-slate-700/30'
              }`}
          >
            <span className={`text-lg font-bold ${statusFilter === 'Não Iniciado' ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
              {metrics.notStarted}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Pendentes</span>
          </button>

          {/* Em Alerta */}
          {metrics.alert > 0 && (
            <button
              onClick={() => setStatusFilter('alert')}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'alert'
                ? 'bg-amber-50 dark:bg-amber-900/30'
                : 'hover:bg-amber-50/50 dark:hover:bg-amber-900/20'
                }`}
            >
              <span className={`text-lg font-bold ${statusFilter === 'alert' ? 'text-amber-600 dark:text-amber-400' : 'text-amber-500/70 dark:text-amber-500/50'}`}>
                {metrics.alert}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Alerta</span>
            </button>
          )}

          {/* Atrasadas */}
          {metrics.late > 0 && (
            <button
              onClick={() => setStatusFilter('late')}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'late'
                ? 'bg-rose-50 dark:bg-rose-900/30'
                : 'hover:bg-rose-50/50 dark:hover:bg-rose-900/20'
                }`}
            >
              <span className={`text-lg font-bold ${statusFilter === 'late' ? 'text-rose-600 dark:text-rose-400' : 'text-rose-500/70 dark:text-rose-500/50'}`}>
                {metrics.late}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Atrasadas</span>
            </button>
          )}

          {/* Progresso */}
          <span className="text-slate-300 dark:text-slate-600 ml-1">|</span>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all"
                style={{ width: `${metrics.avgProgress}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{metrics.avgProgress}%</span>
          </div>
        </div>

        {/* Linha 2: Views + Busca */}
        <div className="flex items-center justify-between px-4 py-2">
          {/* Toggle de Visualização */}
          <div className="flex items-center gap-1">
            {(['tree', 'cards', 'list', 'kanban'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewMode === mode
                  ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
              >
                {mode === 'tree' ? 'Árvore' : mode === 'cards' ? 'Cards' : mode === 'list' ? 'Lista' : 'Kanban'}
              </button>
            ))}
          </div>

          {/* Busca */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg w-40 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 w-full overflow-hidden">
        <div className="mx-auto w-full max-w-7xl h-full p-5">
          {/* Container Principal */}
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-700/60 h-full overflow-auto shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
            <div className="p-4 space-y-4">
              {viewMode === 'tree' && (
                <div className="space-y-4">
                  {groupedData.map((obj, objIndex) => {
                    const displayNum = objIndex + 1;
                    return (
                      <div key={obj.id} className={`bg-white dark:bg-slate-800 rounded-2xl border-2 overflow-hidden shadow-lg hover:shadow-xl transition-shadow ${OBJECTIVE_COLORS[displayNum]?.border || 'border-slate-200 dark:border-slate-700'}`}>
                        {/* Objective Header */}
                        <button onClick={() => setExpandedObjectives(prev => prev.includes(obj.id) ? prev.filter(x => x !== obj.id) : [...prev, obj.id])} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-all">
                          <span className={`text-slate-400 transition-transform duration-200 ${expandedObjectives.includes(obj.id) ? 'rotate-0' : '-rotate-90'}`}>
                            <ChevronDown size={20} />
                          </span>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg ${OBJECTIVE_COLORS[displayNum]?.accent || 'bg-teal-500'}`}>
                            {displayNum}
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{obj.title}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{obj.actionCount} ações</span>
                              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{obj.activities.length} atividades</span>
                              {obj.lateCount > 0 && (
                                <span className="text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-medium animate-pulse">⚠ {obj.lateCount} atrasadas</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-32"><MiniProgress value={obj.progress} size="md" /></div>
                            <span className={`text-lg font-bold w-14 text-right ${obj.progress >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>{obj.progress}%</span>
                          </div>
                        </button>

                        {/* Activities */}
                        {expandedObjectives.includes(obj.id) && (
                          <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30">
                            {obj.activities.map(act => (
                              <div key={act.id} className="border-b border-slate-100/80 dark:border-slate-700/30 last:border-0">
                                <button onClick={() => setExpandedActivities(prev => prev.includes(act.id) ? prev.filter(x => x !== act.id) : [...prev, act.id])} className="w-full px-5 py-3 pl-14 flex items-center gap-3 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all">
                                  <span className={`text-slate-400 transition-transform duration-200 ${expandedActivities.includes(act.id) ? 'rotate-0' : '-rotate-90'}`}>
                                    <ChevronDown size={16} />
                                  </span>
                                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center relative shadow-sm">
                                    <Layers size={13} className="text-slate-500 dark:text-slate-400" />
                                    <span className={`absolute -left-2.5 w-2.5 h-2.5 rounded-full shadow-sm ${OBJECTIVE_COLORS[displayNum]?.accent || 'bg-slate-400'}`}></span>
                                  </div>
                                  <div className="flex-1 text-left">
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{getActivityDisplayId(act.id)}. {act.title}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs text-slate-500 dark:text-slate-400">{act.actions.length} ações</span>
                                      {act.lateCount > 0 && <span className="text-xs text-rose-500 font-medium">• {act.lateCount} atrasadas</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="w-20"><MiniProgress value={act.progress} /></div>
                                    <span className={`text-sm font-bold w-10 text-right ${act.progress >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{act.progress}%</span>
                                  </div>
                                </button>

                                {/* Actions Grid */}
                                {expandedActivities.includes(act.id) && act.actions.length > 0 && (
                                  <div className="px-5 pb-4 pl-20 bg-white/40 dark:bg-slate-800/40">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {act.actions.map(action => {
                                        const isSelected = selectedUid === action.uid && isModalOpen;
                                        return (
                                          <div key={action.uid} className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-teal-400 ring-offset-2 rounded-xl' : ''}`}>
                                            <ActionCard action={action} onClick={() => handleSelectAction(action.uid)} isLate={isActionLate(action)} />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === 'cards' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredActions.map(action => {
                    const isSelected = selectedUid === action.uid && isModalOpen;
                    return (
                      <div key={action.uid} className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-teal-400 ring-offset-2 rounded-xl scale-[1.02]' : ''}`}>
                        <ActionCard
                          action={action}
                          onClick={() => handleSelectAction(action.uid)}
                          isLate={isActionLate(action)}
                        />
                      </div>
                    );
                  })}

                  {filteredActions.length === 0 && (
                    <div className="col-span-full text-center py-16 px-6">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                        <Zap size={36} className="text-slate-400 dark:text-slate-500" />
                      </div>
                      <p className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-1">Nenhuma ação encontrada</p>
                      <p className="text-sm text-slate-400 dark:text-slate-500">Tente ajustar os filtros.</p>
                    </div>
                  )}
                </div>
              )}

              {viewMode === 'list' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden shadow-sm">
                  {/* Table Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-700 dark:to-slate-700/50 border-b border-slate-200 dark:border-slate-600 flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm bg-opacity-90">
                    <span className="w-3"></span>
                    <span className="w-8"></span>
                    <span className="w-16">ID</span>
                    <span className="flex-1">Ação</span>
                    <span className="w-28 pl-6">Progresso</span>
                    <span className="w-10 text-center">💬</span>
                    <span className="w-28">Responsável</span>
                    <span className="w-24 text-right">Prazo</span>
                    <span className="w-8"></span>
                    <span className="w-8"></span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {groupedData.flatMap((obj, objIndex) => {
                      const displayNum = objIndex + 1;
                      const visibleActivities = obj.activities.filter(act => act.actions.length > 0);

                      if (visibleActivities.length === 0) return [];

                      const rows = [];

                      // Objective Header Row
                      rows.push(
                        <div key={`obj-${obj.id}`} className="bg-slate-50/80 dark:bg-slate-700/30 px-4 py-2 border-y border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`flex items-center justify-center w-6 h-6 rounded-md text-white text-xs font-bold shadow-sm ${OBJECTIVE_COLORS[displayNum]?.accent || 'bg-slate-500'}`}>
                              {displayNum}
                            </span>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm tracking-tight">{obj.title}</h3>
                          </div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {obj.actionCount} ações
                          </div>
                        </div>
                      );

                      visibleActivities.forEach(act => {
                        // Activity Header Row
                        rows.push(
                          <div key={`act-${act.id}`} className="bg-white dark:bg-slate-800 px-4 py-2 pl-12 border-b border-slate-100/50 dark:border-slate-700/50 flex items-center gap-2">
                            <Layers size={12} className="text-slate-400" />
                            <h4 className="font-semibold text-slate-600 dark:text-slate-300 text-xs">
                              {getActivityDisplayId(act.id)}. {act.title}
                            </h4>
                          </div>
                        );

                        // Actions
                        act.actions.forEach(action => {
                          const isSelected = selectedUid === action.uid && isModalOpen;
                          rows.push(
                            <div key={action.uid} className={`transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isSelected ? 'bg-teal-50/50 dark:bg-teal-900/20' : ''}`}>
                              <ActionRow action={action} onClick={() => handleSelectAction(action.uid)} isLate={isActionLate(action)} />
                            </div>
                          );
                        });
                      });

                      return rows;
                    })}

                    {filteredActions.length === 0 && (
                      <div className="text-center py-16 px-6">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                          <Zap size={36} className="text-slate-400 dark:text-slate-500" />
                        </div>
                        <p className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-1">Nenhuma ação encontrada</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500">Tente ajustar os filtros.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewMode === 'kanban' && (
                <div className="pb-2">
                  <div className="grid grid-cols-4 gap-4">
                    {KANBAN_COLUMNS.map(col => {
                      const colActions = filteredActions.filter(a => a.status === col.key);
                      return (
                        <div
                          key={col.key}
                          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-2xl overflow-hidden flex flex-col shadow-lg hover:shadow-xl transition-shadow"
                        >
                          {/* Kanban Column Header */}
                          <div className={`px-4 py-3 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 ${STATUS_CONFIG[col.key].header}`}>
                            <span className="text-sm font-bold flex items-center gap-2">
                              <span className="p-1 rounded-lg bg-white/50 dark:bg-slate-800/50">
                                {STATUS_CONFIG[col.key].icon}
                              </span>
                              {col.label}
                            </span>
                            <span className="text-xs font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-full shadow-sm">
                              {colActions.length}
                            </span>
                          </div>

                          {/* Kanban Column Content */}
                          <div className="p-3 space-y-3 flex-1 bg-slate-50/50 dark:bg-slate-900/30">
                            {colActions.length === 0 && (
                              <div className="text-sm text-slate-400 italic px-3 py-8 text-center bg-white/50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                <Zap size={24} className="mx-auto mb-2 opacity-30" />
                                Nenhuma ação
                              </div>
                            )}
                            {colActions.map(action => {
                              const isSelected = selectedUid === action.uid && isModalOpen;
                              return (
                                <div key={action.uid} className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-teal-400 ring-offset-1 rounded-xl scale-[1.02]' : ''}`}>
                                  <ActionCard
                                    action={action}
                                    onClick={() => handleSelectAction(action.uid)}
                                    isLate={isActionLate(action)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Estado Vazio */}
              {filteredActions.length === 0 && (
                <div className="text-center py-16 px-6">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                    <Zap size={36} className="text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-1">Nenhuma ação encontrada</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">Tente ajustar os filtros ou criar novas ações</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizedView;



