import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
  Target,
  Layers,
  Zap,
  Calendar,
  Users,
  TrendingUp,
  Search,
  Edit3,
  Save,
  Trash2,
  MessageCircle,
  Send,
  MapPin,
  X
} from 'lucide-react';
import { Action, Activity, Objective, TeamMember, Status, RaciRole, ActionComment } from '../../types';
import { formatDateBr, parseDateLocal, getTodayStr } from '../../lib/date';
import { useAuth } from '../../auth';
import { getAvatarUrl } from '../settings/UserSettingsModal';

interface OptimizedViewProps {
  objectives: Objective[];
  activities: Record<number, Activity[]>;
  actions: Action[];
  team: TeamMember[];
  onUpdateAction?: (uid: string, updates: Partial<Action>) => void;
  onDeleteAction?: (uid: string) => void;
  onAddRaci?: (uid: string, memberId: string, role: RaciRole) => void;
  onRemoveRaci?: (uid: string, idx: number, memberName: string) => void;
  onAddComment?: (uid: string, content: string) => void;
  onEditComment?: (actionUid: string, commentId: string, content: string) => void;
  onDeleteComment?: (actionUid: string, commentId: string) => void;
  readOnly?: boolean;
}

const STATUSES: Status[] = ['Não Iniciado', 'Em Andamento', 'Concluído', 'Atrasado'];
const RACI_ROLES: { role: RaciRole; label: string; color: string }[] = [
  { role: 'R', label: 'Responsável', color: 'bg-blue-500' },
  { role: 'A', label: 'Aprovador', color: 'bg-purple-500' },
  { role: 'C', label: 'Consultado', color: 'bg-amber-500' },
  { role: 'I', label: 'Informado', color: 'bg-slate-400' },
];

const OBJECTIVE_COLORS: Record<number, { border: string; bg: string; accent: string }> = {
  1: { border: 'border-cyan-200 dark:border-cyan-800', bg: 'bg-cyan-50 dark:bg-cyan-900/30', accent: 'bg-cyan-500' },
  2: { border: 'border-indigo-200 dark:border-indigo-800', bg: 'bg-indigo-50 dark:bg-indigo-900/30', accent: 'bg-indigo-500' },
  3: { border: 'border-amber-200 dark:border-amber-800', bg: 'bg-amber-50 dark:bg-amber-900/30', accent: 'bg-amber-500' },
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
  const height = size === 'sm' ? 'h-1.5' : 'h-2';
  const color = value >= 100 ? 'bg-emerald-500' : value >= 50 ? 'bg-blue-500' : value > 0 ? 'bg-amber-500' : 'bg-slate-200';
  return (
    <div className={`w-full ${height} bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden`}>
      <div className={`${height} ${color} transition-all duration-300`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
};

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const CommentItem: React.FC<{ comment: ActionComment }> = ({ comment }) => {
  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
      <img
        src={getAvatarUrl(comment.authorAvatarId || 'zg10')}
        alt={comment.authorName}
        className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-slate-800">{comment.authorName}</span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin size={10} />
            {comment.authorMunicipio}
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-400">{formatRelativeTime(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{comment.content}</p>
      </div>
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
      className={`group relative p-2.5 rounded-lg border cursor-pointer transition-colors ${isLate ? 'border-rose-200 bg-rose-50/60 dark:border-rose-700 dark:bg-rose-900/30' : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-teal-200 dark:hover:border-teal-700 hover:bg-white dark:hover:bg-slate-600'}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs font-mono text-slate-400 shrink-0">{action.id}</span>
          <span className={`shrink-0 ${status.color}`}>{status.icon}</span>
        </div>
        <span className="text-xs font-bold tabular-nums text-slate-600 dark:text-slate-300">{action.progress}%</span>
      </div>
      <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2 mb-2 leading-snug">{action.title}</h4>
      <MiniProgress value={action.progress} />
      <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1 truncate">
          <Users size={12} />
          <span className="truncate">{responsible}</span>
        </span>
        <div className="flex items-center gap-2">
          {commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-teal-600">
              <MessageCircle size={12} />
              {commentCount}
            </span>
          )}
          <span className="flex items-center gap-1 shrink-0">
            <Calendar size={12} />
            {formatDateBr(action.plannedEndDate)}
          </span>
        </div>
      </div>
      <div className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 bg-teal-500 transition-opacity">
        <Edit3 size={12} className="text-white" />
      </div>
      {isLate && <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-pulse" />}
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
      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-100 dark:border-slate-600 ${isLate ? 'bg-rose-50/60 dark:bg-rose-900/30' : 'bg-white dark:bg-slate-800'}`}
      onClick={onClick}
    >
      <span className={`shrink-0 ${status.color}`}>{status.icon}</span>
      <span className="text-xs font-mono text-slate-400 w-12 shrink-0">{action.id}</span>
      <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 truncate">{action.title}</span>
      <div className="w-20 shrink-0">
        <div className="flex items-center gap-1">
          <MiniProgress value={action.progress} />
          <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400 w-8 text-right">{action.progress}%</span>
        </div>
      </div>
      <span className="flex items-center gap-0.5 text-xs text-teal-600 w-8">
        {commentCount > 0 && <><MessageCircle size={12} />{commentCount}</>}
      </span>
      <span className="text-xs text-slate-500 w-24 truncate shrink-0">{responsible}</span>
      <span className="text-xs text-slate-400 w-20 shrink-0 text-right">{formatDateBr(action.plannedEndDate)}</span>
      {isLate && <AlertTriangle size={14} className="text-rose-500 shrink-0" />}
    </div>
  );
};

export const OptimizedView: React.FC<OptimizedViewProps> = ({
  objectives,
  activities,
  actions,
  team,
  onUpdateAction,
  onDeleteAction,
  onAddRaci,
  onRemoveRaci,
  onAddComment,
  readOnly = false,
}) => {
  const { user } = useAuth();
  const [expandedObjectives, setExpandedObjectives] = useState<number[]>(objectives.map(o => o.id));
  const [expandedActivities, setExpandedActivities] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'tree' | 'cards' | 'list' | 'kanban'>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all' | 'late'>('all');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [localAction, setLocalAction] = useState<Action | null>(null);
  const [newRaciMember, setNewRaciMember] = useState('');
  const [newRaciRole, setNewRaciRole] = useState<RaciRole>('R');
  const [newComment, setNewComment] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const today = parseDateLocal(getTodayStr());

  const isActionLate = (action: Action): boolean => {
    if (action.status === 'Concluído') return false;
    const endDate = parseDateLocal(action.plannedEndDate);
    return Boolean(endDate && today && endDate < today);
  };

  const filteredActions = useMemo(() => {
    return actions.filter(a => {
      if (searchTerm && !a.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (statusFilter === 'late') return isActionLate(a);
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      return true;
    });
  }, [actions, searchTerm, statusFilter]);

  // Atualiza localAction quando selecionada mudar
  useEffect(() => {
    if (selectedUid) {
      const act = actions.find(a => a.uid === selectedUid);
      setLocalAction(act || null);
    }
  }, [selectedUid, actions]);

  // Scroll para último comentário ao adicionar
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localAction?.comments?.length]);

  const metrics = useMemo(() => {
    const total = actions.length;
    const completed = actions.filter(a => a.status === 'Concluído').length;
    const inProgress = actions.filter(a => a.status === 'Em Andamento').length;
    const late = actions.filter(isActionLate).length;
    const avgProgress = total > 0 ? Math.round(actions.reduce((s, a) => s + a.progress, 0) / total) : 0;
    return { total, completed, inProgress, late, avgProgress };
  }, [actions]);

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
  }, [objectives, activities, filteredActions]);

  const handleSelectAction = (uid: string) => {
    setSelectedUid(uid);
    setShowDetail(true);
    setSavedFeedback(false);
  };

  const handleClearSelection = () => {
    setShowDetail(false);
    setSelectedUid(null);
    setLocalAction(null);
    setSavedFeedback(false);
  };

  const handleSave = () => {
    if (!localAction || !onUpdateAction || !selectedUid) return;
    onUpdateAction(selectedUid, {
      title: localAction.title,
      status: localAction.status,
      progress: localAction.progress,
      startDate: localAction.startDate,
      plannedEndDate: localAction.plannedEndDate,
      endDate: localAction.endDate,
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1500);
  };

  const handleDelete = () => {
    if (selectedUid && onDeleteAction) {
      onDeleteAction(selectedUid);
      setSelectedUid(null);
      setLocalAction(null);
    }
  };

  const handleAddRaciMember = () => {
    if (!localAction || !selectedUid || !onAddRaci || !newRaciMember) return;
    onAddRaci(selectedUid, newRaciMember, newRaciRole);
    const member = team.find(t => String(t.id) === newRaciMember);
    if (member) {
      setLocalAction(prev => prev ? { ...prev, raci: [...prev.raci, { name: member.name, role: newRaciRole }] } : prev);
    }
    setNewRaciMember('');
  };

  const handleRemoveRaciMember = (idx: number, memberName: string) => {
    if (!localAction || !selectedUid || !onRemoveRaci) return;
    onRemoveRaci(selectedUid, idx, memberName);
    setLocalAction(prev => prev ? { ...prev, raci: prev.raci.filter((_, i) => i !== idx) } : prev);
  };

  const handleAddCommentLocal = () => {
    if (!localAction || !selectedUid || !onAddComment || !user) return;
    if (!newComment.trim()) return;

    // Cria comentário local para atualização otimista da UI
    const optimisticComment: ActionComment = {
      id: `c${Date.now()}`,
      authorId: user.id,
      authorName: user.nome,
      authorMunicipio: user.microregiaoId || 'N/A',
      authorAvatarId: user.avatarId || 'zg10',
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
    };

    // Passa apenas o conteúdo para o handler - o backend cria o comentário completo
    onAddComment(selectedUid, newComment.trim());

    // Atualiza UI otimisticamente
    setLocalAction(prev => prev ? { ...prev, comments: [...(prev.comments || []), optimisticComment] } : prev);
    setNewComment('');
  };

  const availableTeam = useMemo(() => {
    if (!localAction) return [] as TeamMember[];
    return team.filter(t => !localAction.raci.some(r => r.name === t.name));
  }, [team, localAction]);

  const selectedAction = showDetail ? localAction : null;
  const hasSelection = Boolean(selectedAction);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center"><Target size={16} className="text-teal-600 dark:text-teal-400" /></div>
              <div>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{metrics.total}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ações</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center"><CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" /></div>
              <div>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{metrics.completed}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Concluídas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center"><Clock size={16} className="text-blue-600 dark:text-blue-400" /></div>
              <div>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{metrics.inProgress}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Em Andamento</p>
              </div>
            </div>
            {metrics.late > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center"><AlertTriangle size={16} className="text-rose-600 dark:text-rose-400" /></div>
                <div>
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{metrics.late}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Atrasadas</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-600">
              <TrendingUp size={16} className="text-teal-600 dark:text-teal-400" />
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{metrics.avgProgress}%</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Progresso</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg w-40 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Todos</option>
              <option value="late">⚠️ Atrasados</option>
              <option value="Em Andamento">🔵 Em Andamento</option>
              <option value="Não Iniciado">⚪ Não Iniciado</option>
              <option value="Concluído">✅ Concluído</option>
            </select>
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
              {(['tree', 'cards', 'list', 'kanban'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${viewMode === mode ? 'bg-white dark:bg-slate-600 text-teal-600 dark:text-teal-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  {mode === 'tree' ? 'Árvore' : mode === 'cards' ? 'Cards' : mode === 'list' ? 'Lista' : 'Kanban'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedUid && (
        <div className="px-4 pt-2">
          <div className="mx-auto w-full max-w-6xl flex items-center justify-between gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                Ação selecionada
              </span>
              <span className="text-sm font-medium text-slate-800 truncate">
                {selectedAction?.id} • {selectedAction?.title || '---'}
              </span>
            </div>
            <button
              onClick={handleClearSelection}
              className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 w-full">
        <div className={`mx-auto w-full max-w-6xl grid ${hasSelection ? 'grid-cols-1 lg:grid-cols-[44%_56%]' : 'grid-cols-1'} gap-4 p-4 overflow-hidden transition-all`}>
          {/* Lista / Cards / Árvore */}
          <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 h-full overflow-auto p-2.5 space-y-3 ${hasSelection ? '' : 'lg:col-span-1'}`}>
            {viewMode === 'tree' && (
              <div className="space-y-3">
                {groupedData.map(obj => (
                  <div key={obj.id} className={`bg-white dark:bg-slate-800 rounded-xl border overflow-hidden ${OBJECTIVE_COLORS[obj.id]?.border || 'border-slate-200 dark:border-slate-700'}`}>
                    <button onClick={() => setExpandedObjectives(prev => prev.includes(obj.id) ? prev.filter(x => x !== obj.id) : [...prev, obj.id])} className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <span className="text-slate-400">{expandedObjectives.includes(obj.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${OBJECTIVE_COLORS[obj.id]?.accent || 'bg-teal-500'}`}>{obj.id}</div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{obj.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{obj.actionCount} ações • {obj.activities.length} atividades {obj.lateCount > 0 && <span className="text-rose-500 ml-2">• {obj.lateCount} atrasadas</span>}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24"><MiniProgress value={obj.progress} size="md" /></div>
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300 w-10 text-right">{obj.progress}%</span>
                      </div>
                    </button>
                    {expandedObjectives.includes(obj.id) && (
                      <div className="border-t border-slate-100 dark:border-slate-700">
                        {obj.activities.map(act => (
                          <div key={act.id} className="border-b border-slate-50 dark:border-slate-700 last:border-0">
                            <button onClick={() => setExpandedActivities(prev => prev.includes(act.id) ? prev.filter(x => x !== act.id) : [...prev, act.id])} className="w-full px-3.5 py-2.5 pl-11 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                              <span className="text-slate-300">{expandedActivities.includes(act.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                              <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-600 flex items-center justify-center relative">
                                <Layers size={12} className="text-slate-500 dark:text-slate-300" />
                                <span className={`absolute -left-2 w-2 h-2 rounded-full ${OBJECTIVE_COLORS[obj.id]?.accent || 'bg-slate-400'}`}></span>
                              </div>
                              <div className="flex-1 text-left">
                                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200">{act.id}. {act.title}</h4>
                                <p className="text-xs text-slate-400">{act.actions.length} ações {act.lateCount > 0 && <span className="text-rose-500 ml-1">• {act.lateCount} atrasadas</span>}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-16"><MiniProgress value={act.progress} /></div>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-8 text-right">{act.progress}%</span>
                              </div>
                            </button>
                            {expandedActivities.includes(act.id) && act.actions.length > 0 && (
                              <div className="px-3.5 pb-3 pl-16">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {act.actions.map(action => {
                                    const isSelected = selectedUid === action.uid && showDetail;
                                    return (
                                      <div key={action.uid} className={isSelected ? 'ring-1 ring-teal-300 rounded-lg shadow-sm' : ''}>
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
                ))}
              </div>
            )}

            {viewMode === 'cards' && (
              <div className={`grid ${hasSelection ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'} gap-2.5`}>
                {filteredActions.map(action => {
                  const isSelected = selectedUid === action.uid && showDetail;
                  return (
                    <div key={action.uid} className={isSelected ? 'ring-1 ring-teal-300 rounded-lg shadow-sm' : ''}>
                      <ActionCard action={action} onClick={() => handleSelectAction(action.uid)} isLate={isActionLate(action)} />
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  <span className="w-5"></span>
                  <span className="w-12">ID</span>
                  <span className="flex-1">Ação</span>
                  <span className="w-28">Progresso</span>
                  <span className="w-8">💬</span>
                  <span className="w-24">Responsável</span>
                  <span className="w-20 text-right">Prazo</span>
                  <span className="w-5"></span>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-700">
                  {filteredActions.map(action => {
                    const isSelected = selectedUid === action.uid && showDetail;
                    return (
                      <div key={action.uid} className={isSelected ? 'ring-1 ring-teal-300 rounded-lg shadow-sm' : ''}>
                        <ActionRow action={action} onClick={() => handleSelectAction(action.uid)} isLate={isActionLate(action)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {viewMode === 'kanban' && (
              <div className="pb-1">
                <div className="grid grid-cols-4 gap-3">
                  {KANBAN_COLUMNS.map(col => {
                    const colActions = filteredActions.filter(a => a.status === col.key);
                    return (
                      <div
                        key={col.key}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col"
                      >
                        <div className={`px-3 py-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 ${STATUS_CONFIG[col.key].header}`}>
                          <span className="text-sm font-semibold flex items-center gap-2">
                            {STATUS_CONFIG[col.key].icon}
                            {col.label}
                          </span>
                          <span className="text-xs font-semibold bg-white/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                            {colActions.length}
                          </span>
                        </div>
                        <div className="p-2 space-y-2">
                          {colActions.length === 0 && (
                            <div className="text-xs text-slate-400 italic px-2 py-4 text-center">
                              Nenhuma ação
                            </div>
                          )}
                          {colActions.map(action => {
                            const isSelected = selectedUid === action.uid && showDetail;
                            return (
                              <div key={action.uid} className={isSelected ? 'ring-1 ring-teal-300 rounded-lg shadow-sm' : ''}>
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

            {filteredActions.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Zap size={48} className="mx-auto mb-3 opacity-20" />
                <p className="font-medium">Nenhuma ação encontrada</p>
                <p className="text-sm">Tente ajustar os filtros</p>
              </div>
            )}
          </div>

          {/* Painel de Detalhes + Comentários */}
          {hasSelection && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 h-full overflow-hidden flex flex-col">
              {!selectedAction ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">Selecione uma ação para visualizar</div>
              ) : (
                <>
                  <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4 bg-slate-50 dark:bg-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-mono bg-slate-200 text-slate-700 px-2 py-1 rounded shrink-0">{selectedAction.id}</span>
                      <h2 className="font-semibold text-slate-800 text-lg truncate">{selectedAction.title}</h2>
                      {savedFeedback && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Salvo
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-start md:justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowDetail(false);
                          setSelectedUid(null);
                          setLocalAction(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors shadow-sm"
                        title="Fechar painel e expandir lista"
                      >
                        <X size={14} />
                        Fechar
                      </button>
                      {!readOnly && (
                        <button
                          onClick={handleDelete}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-700 border border-rose-200 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors shadow-sm"
                        >
                          <Trash2 size={14} />
                          Excluir
                        </button>
                      )}
                      <button
                        onClick={handleSave}
                        disabled={readOnly}
                        className={`flex items-center gap-2 px-3 py-1.5 bg-teal-500 text-white text-sm rounded-lg shadow-sm hover:bg-teal-600 transition-colors font-medium ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Save size={14} />
                        Salvar
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto px-4 py-4 space-y-5 w-full max-w-4xl mx-auto">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título</label>
                      <input
                        value={selectedAction.title === localAction?.title ? localAction.title : selectedAction.title}
                        onChange={(e) => setLocalAction(prev => prev ? { ...prev, title: e.target.value } : prev)}
                        disabled={readOnly}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-slate-50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                        <select
                          value={localAction?.status || selectedAction.status}
                          onChange={(e) => setLocalAction(prev => prev ? { ...prev, status: e.target.value as Status } : prev)}
                          disabled={readOnly}
                          className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-700 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-800"
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Progresso: <span className="text-teal-600 font-bold">{localAction?.progress ?? selectedAction.progress}%</span></label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={localAction?.progress ?? selectedAction.progress}
                          onChange={(e) => setLocalAction(prev => prev ? { ...prev, progress: Number(e.target.value) } : prev)}
                          disabled={readOnly}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data Início</label>
                        <input
                          type="date"
                          value={localAction?.startDate ?? selectedAction.startDate}
                          onChange={(e) => setLocalAction(prev => prev ? { ...prev, startDate: e.target.value } : prev)}
                          disabled={readOnly}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data Fim Prevista</label>
                        <input
                          type="date"
                          value={localAction?.plannedEndDate ?? selectedAction.plannedEndDate}
                          onChange={(e) => setLocalAction(prev => prev ? { ...prev, plannedEndDate: e.target.value } : prev)}
                          disabled={readOnly}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">Equipe RACI</label>
                      <div className="space-y-1.5 mb-2">
                        {selectedAction.raci.map((member, idx) => {
                          const roleConfig = RACI_ROLES.find(r => r.role === member.role);
                          return (
                            <div key={idx} className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 ${roleConfig?.color || 'bg-slate-400'} text-white text-xs font-bold rounded flex items-center justify-center`}>{member.role}</span>
                                <span className="text-sm text-slate-700">{member.name}</span>
                              </div>
                              {!readOnly && (
                                <button onClick={() => handleRemoveRaciMember(idx, member.name)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-rose-500">
                                  <span className="sr-only">Remover</span>×
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {selectedAction.raci.length === 0 && <p className="text-xs text-slate-400 italic px-3 py-2">Nenhum membro adicionado</p>}
                      </div>
                      {!readOnly && availableTeam.length > 0 && (
                        <div className="flex gap-2">
                          <select value={newRaciMember} onChange={(e) => setNewRaciMember(e.target.value)} className="flex-1 px-2 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-slate-100">
                            <option value="">Selecionar membro...</option>
                            {availableTeam.map(t => (
                              <option key={t.id} value={String(t.id)} disabled={t.isRegistered === false} className={t.isRegistered === false ? 'text-slate-400 italic' : ''}>
                                {t.name} {t.isRegistered === false ? '(Pendente)' : ''}
                              </option>
                            ))}
                          </select>
                          <select value={newRaciRole} onChange={(e) => setNewRaciRole(e.target.value as RaciRole)} className="w-24 px-2 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-slate-100">
                            {RACI_ROLES.map(r => <option key={r.role} value={r.role}>{r.role}</option>)}
                          </select>
                          <button onClick={handleAddRaciMember} disabled={!newRaciMember} className="px-3 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed">+</button>
                        </div>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <MessageCircle size={16} />
                        Comentários ({selectedAction.comments?.length || 0})
                      </div>
                      <div className="max-h-72 overflow-auto px-4 py-2">
                        {(selectedAction.comments || []).length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-slate-400 py-6">
                            <MessageCircle size={36} className="mb-2 opacity-30" />
                            <p className="font-medium text-sm">Nenhum comentário ainda</p>
                            <p className="text-xs">Seja o primeiro a comentar!</p>
                          </div>
                        ) : (
                          <div>
                            {selectedAction.comments!.map(c => <CommentItem key={c.id} comment={c} />)}
                            <div ref={commentsEndRef} />
                          </div>
                        )}
                      </div>
                      <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-white dark:bg-slate-800">
                        <div className="flex gap-3 items-start">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {user?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                          </div>
                          <div className="flex-1">
                            <textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Escreva um comentário..."
                              rows={2}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddCommentLocal();
                                }
                              }}
                            />
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-slate-400">Pressione Enter para enviar</span>
                              <button
                                onClick={handleAddCommentLocal}
                                disabled={!newComment.trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Send size={14} />
                                Enviar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptimizedView;



