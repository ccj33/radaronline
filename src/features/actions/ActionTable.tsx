import React, { useMemo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Trash2, Lock, Eye, MessageCircle, Send, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { staggerContainerFast, staggerItem } from '../../lib/motion';
import { Action, Status, RaciRole, TeamMember, ActionComment } from '../../types';
import { formatDateBr, getTodayStr } from '../../lib/date';
import {
  getActionDisplayId,
  getActivityDisplayId,
  getCorrectActivityPrefix,
  getCorrectActionDisplayId,
  findObjectiveIdByActivityId,
  getActivityPrefixFromActionId,
  naturalSortComparator
} from '../../lib/text';
import { Activity, Objective } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RaciCompactPill, RaciTag } from '../../components/common/RaciPill';
import { SearchFilter } from '../../components/common/SearchFilter';
import { ObjectiveHeader } from '../../components/common/ObjectiveHeader';
import { LoadingButton } from '../../components/common/LoadingSpinner';
import { Tooltip } from '../../components/common/Tooltip';
import { Select } from '../../ui/Select';
import { useAuth } from '../../auth/AuthContext';
import { getAvatarUrl } from '../settings/UserSettingsModal';
import { SmartPasteModal, ParsedAction } from './SmartPasteModal';

// =====================================
// PROPS DO COMPONENTE
// =====================================
interface ActionTableProps {
  actions: Action[];
  selectedActivity: string;
  selectedObjective?: number;  // ID do objetivo selecionado
  team: TeamMember[];
  // Para IDs dinâmicos baseados na posição atual
  objectives?: Objective[];
  activities?: Record<number, Activity[]>;
  // Modo de edição para ObjectiveHeader
  isEditMode?: boolean;
  onUpdateObjective?: (id: number, field: 'eixo' | 'description' | 'eixoLabel' | 'eixoColor', value: string | number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: Status | 'all';
  setStatusFilter: (status: Status | 'all') => void;
  responsibleFilter: string;
  setResponsibleFilter: (responsible: string) => void;
  expandedActionId: string | null; // Agora é UID
  setExpandedActionId: (uid: string | null) => void;
  involvedAreaFilter?: string;
  setInvolvedAreaFilter?: (area: string) => void;
  // Handlers recebem UID ao invés de ID simples
  onUpdateAction: (uid: string, field: string, value: string | number) => void;
  onSaveAction: (uid?: string) => void;
  onCreateAction: () => void;
  onDeleteAction: (uid: string) => void;
  onAddRaci: (uid: string, memberId: string, role: RaciRole) => void;
  onRemoveRaci: (uid: string, idx: number, memberName: string) => void;
  onAddComment: (uid: string, content: string) => void;
  isSaving?: boolean;
  // Permissões
  canCreate?: boolean;
  canEdit?: (action: Action) => boolean;
  canDelete?: (action: Action) => boolean;
  // Modo somente leitura (admin vendo todas as micros)
  readOnly?: boolean;
  // Se true, não expande inline - apenas define expandedActionId para modal externo
  useModal?: boolean;
  // Handler para importação em massa
  onBulkImport?: (actions: ParsedAction[]) => void;
  // Handler para atualizar atividade (descrição no header)
  onUpdateActivity?: (id: string, field: 'title' | 'description', value: string) => void;
}

const rolePriority: Record<RaciRole, number> = { R: 0, A: 1, I: 2 };

// ✅ FASE 3: Mover formatRelativeTime para fora do componente (evita recriação)
export const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;
  if (hours < 24) return `há ${hours}h`;
  if (days < 7) return `há ${days}d`;
  if (weeks < 5) return `há ${weeks} sem`;
  if (months < 12) return `há ${months} mes`;

  return `há ${years}a`;
};

// Formato dd/mm/yy (ex: 25/12/26) para tabela compacta
const formatDateShortYear = (dateString?: string) => {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year.slice(2)}`;

};

// Usa getActionNumber de lib/text.ts para formatar ID da ação

const CommentItem: React.FC<{ comment: ActionComment }> = ({ comment }) => {
  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <img
        src={getAvatarUrl(comment.authorAvatarId || 'zg10')}
        alt={comment.authorName}
        className="w-8 h-8 rounded-full bg-white border border-slate-200 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{comment.authorName}</span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            {comment.authorMunicipio}
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-400">{formatRelativeTime(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">{comment.content}</p>
      </div>
    </div>
  );
};

// =====================================
// COMPONENTE PRINCIPAL
// =====================================
const ActionTableImpl: React.FC<ActionTableProps> = ({
  actions,
  selectedActivity,
  selectedObjective,
  team,
  objectives = [],
  activities = {},
  isEditMode = false,
  onUpdateObjective,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  responsibleFilter,
  setResponsibleFilter,
  expandedActionId,
  setExpandedActionId,
  involvedAreaFilter,
  setInvolvedAreaFilter,
  onUpdateAction,
  onSaveAction,
  onCreateAction,
  onDeleteAction,
  onAddRaci,
  onRemoveRaci,
  onAddComment,
  isSaving = false,
  canCreate = true,
  canEdit = () => true,
  canDelete = () => true,
  readOnly = false,
  useModal = true, // Por padrão, usa o modal (não expande inline)
  onBulkImport,
  onUpdateActivity,
}) => {
  const { user } = useAuth();
  const [selectedRaciMemberId, setSelectedRaciMemberId] = React.useState<string>("");
  const [newRaciRole, setNewRaciRole] = React.useState<RaciRole>("R");
  const [commentDrafts, setCommentDrafts] = React.useState<Record<string, string>>({});
  const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);

  const todayLabel = useMemo(() => formatDateBr(getTodayStr()), []);

  // Helper para calcular ID dinâmico (baseado na posição atual do objetivo)
  const getCorrectId = useCallback((action: Action): string => {
    if (objectives.length === 0 || Object.keys(activities).length === 0) {
      // Fallback: usar ID estático se não tiver dados de contexto
      return getActionDisplayId(action.id);
    }
    const objectiveId = findObjectiveIdByActivityId(action.activityId, activities);
    if (objectiveId === null) {
      return getActionDisplayId(action.id);
    }
    return getCorrectActionDisplayId(
      action.id,
      action.activityId,
      objectiveId,
      objectives,
      activities,
      actions
    );
  }, [objectives, activities, actions]);

  // Helper para prefixo do cabeçalho (objetivo.atividade)
  const getCorrectPrefix = useCallback((action: Action): string => {
    if (objectives.length === 0 || Object.keys(activities).length === 0) {
      return getActivityPrefixFromActionId(action.id);
    }
    const objectiveId = findObjectiveIdByActivityId(action.activityId, activities);
    if (objectiveId === null) {
      return getActivityPrefixFromActionId(action.id);
    }
    return getCorrectActivityPrefix(action.activityId, objectiveId, objectives, activities);
  }, [objectives, activities]);

  // Extract unique areas (tags) from actions
  const availableAreas = useMemo(() => {
    const areas = new Set<string>();
    actions.forEach(action => {
      action.tags?.forEach(tag => areas.add(tag.name));
    });
    return Array.from(areas).sort();
  }, [actions]);

  // Ações filtradas
  const filteredActions = useMemo(() => {
    return actions
      .filter(a => a.activityId === selectedActivity)
      .filter(a => {
        if (searchTerm) {
          const lowerSearch = searchTerm.toLowerCase();
          const matchesTitle = a.title.toLowerCase().includes(lowerSearch);
          const matchesTags = a.tags?.some(t => t.name.toLowerCase().includes(lowerSearch));
          const matchesRaci = a.raci.some(r => r.name.toLowerCase().includes(lowerSearch));

          if (!matchesTitle && !matchesTags && !matchesRaci) return false;
        }
        if (statusFilter !== 'all' && a.status !== statusFilter) return false;
        if (responsibleFilter && !a.raci.some(r => r.name === responsibleFilter && r.role === 'R')) return false;
        if (involvedAreaFilter && !a.tags?.some(t => t.name === involvedAreaFilter)) return false;
        return true;
      })
      .sort((a, b) => {
        // Use the DISPLAYED ID for sorting to match visual order
        const idA = getCorrectId(a);
        const idB = getCorrectId(b);
        return naturalSortComparator(idA, idB);
      });
  }, [actions, selectedActivity, searchTerm, statusFilter, responsibleFilter, involvedAreaFilter, getCorrectId]);

  // Toggle usando UID
  const toggleRow = useCallback((uid: string) => {
    if (expandedActionId === uid) {
      setExpandedActionId(null);
    } else {
      setExpandedActionId(uid);
      setSelectedRaciMemberId("");
      setNewRaciRole("R");
      setCommentDrafts(prev => ({ ...prev, [uid]: prev[uid] || '' }));
    }
  }, [expandedActionId, setExpandedActionId]);

  // Adicionar RACI usando UID
  const handleAddRaci = useCallback((uid: string) => {
    if (!selectedRaciMemberId) return;
    onAddRaci(uid, selectedRaciMemberId, newRaciRole);
    setSelectedRaciMemberId("");
    setNewRaciRole("R");
  }, [selectedRaciMemberId, newRaciRole, onAddRaci]);

  const handleAddComment = useCallback((action: Action) => {
    const draft = commentDrafts[action.uid]?.trim();
    if (!draft || !user) return;

    // Agora passa apenas o conteúdo - o backend cria o comentário com dados do usuário
    onAddComment(action.uid, draft);
    setCommentDrafts(prev => ({ ...prev, [action.uid]: '' }));
  }, [commentDrafts, onAddComment, user]);

  return (
    <div data-tour="actions-table" className="max-w-5xl mx-auto px-4 py-8">
      {/* Aviso de modo somente leitura */}
      {readOnly && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
          <Eye size={16} />
          <span>Modo visualização. Selecione uma microrregião específica para editar.</span>
        </div>
      )}

      {/* Objetivo Header - Exibe info da Atividade selecionada */}
      {selectedObjective && objectives.length > 0 && (
        <ObjectiveHeader
          objective={(() => {
            const obj = objectives.find(o => o.id === selectedObjective);
            if (!obj) return null;
            // Override description with Activity Description
            const act = activities[selectedObjective]?.find(a => a.id === selectedActivity);
            return { ...obj, description: act?.description };
          })()}
          objectiveIndex={objectives.findIndex(o => o.id === selectedObjective)}
          isEditMode={isEditMode}
          // Custom props para exibir Atividade ao invés de Eixo
          customBadgeText={(() => {
            const act = activities[selectedObjective]?.find(a => a.id === selectedActivity);
            return act ? `At. ${getActivityDisplayId(act.id)}` : undefined;
          })()}
          customTitle={(() => {
            const act = activities[selectedObjective]?.find(a => a.id === selectedActivity);
            return act ? act.title : undefined;
          })()}
          hideTitle={(() => {
            const act = activities[selectedObjective]?.find(a => a.id === selectedActivity);
            return !!act;
          })()}
          onEdit={(field, value) => {
            // Se for descrição, edita a ATIVIDADE. Se for eixo/cor, edita o OBJETIVO.
            if (field === 'description') {
              const act = activities[selectedObjective]?.find(a => a.id === selectedActivity);
              if (act && onUpdateActivity) {
                onUpdateActivity(act.id, 'description', String(value));
              }
            } else if (onUpdateObjective) {
              onUpdateObjective(selectedObjective, field, value);
            }
          }}
        />
      )}

      {/* Search & Filters */}
      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        responsibleFilter={responsibleFilter}
        onResponsibleFilterChange={setResponsibleFilter}
        involvedAreaFilter={involvedAreaFilter}
        onInvolvedAreaFilterChange={setInvolvedAreaFilter}
        availableAreas={availableAreas}
        teamMembers={team}
      />

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-200/50 dark:border-slate-700 overflow-hidden transition-all duration-300">
        {/* Linha de hoje */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-teal-300 dark:via-teal-600 to-transparent" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse-soft" aria-hidden="true" />
            <span>Hoje - {todayLabel}</span>
          </div>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-teal-300 dark:via-teal-600 to-transparent" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider" role="row">
          <div className="col-span-1" role="columnheader">
            ID
            {filteredActions.length > 0 && (
              <span className="ml-1 text-[10px] normal-case opacity-70">
                {getCorrectPrefix(filteredActions[0])}.x
              </span>
            )}
          </div>
          <div className="col-span-3" role="columnheader">Ação</div>
          <div className="col-span-2" role="columnheader">Cronograma</div>
          <div className="col-span-2" role="columnheader">Equipe</div>
          <div className="col-span-2" role="columnheader">Status</div>
          <div className="col-span-2 text-right" role="columnheader">Áreas</div>
        </div>

        {/* Rows */}
        <motion.div
          variants={staggerContainerFast}
          initial="initial"
          animate="animate"
          className="divide-y divide-slate-100 dark:divide-slate-700"
          role="rowgroup"
        >
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p className="text-sm">Nenhuma ação encontrada</p>
              {(searchTerm || statusFilter !== 'all' || responsibleFilter || involvedAreaFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setResponsibleFilter('');
                    if (setInvolvedAreaFilter) setInvolvedAreaFilter('');
                  }}
                  className="mt-2 text-teal-600 hover:underline text-sm"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : filteredActions.map((action, idx) => {
            // Usa UID para identificar a ação expandida
            const isExpanded = expandedActionId === action.uid;
            const zebra = idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/20';
            // Em modo readOnly, ninguém pode editar
            const userCanEdit = !readOnly && canEdit(action);
            const userCanDelete = !readOnly && canDelete(action);

            return (
              <motion.div
                variants={staggerItem}
                key={action.uid}
                id={`action-${action.uid}`}
                className={`transition-colors ${isExpanded ? 'bg-blue-50/30 dark:bg-blue-900/20' : `${zebra} hover:bg-slate-100/60 dark:hover:bg-slate-700/50`}`}
                role="row"
              >
                {/* Desktop row */}
                <div
                  onClick={() => toggleRow(action.uid)}
                  className="hidden sm:grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') toggleRow(action.uid); }}
                >
                  <div className="col-span-1">
                    <Tooltip content={`ID: ${getCorrectId(action)}`}>
                      <span className="inline-block font-mono text-[10px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600 cursor-help min-w-[24px] text-center">
                        {getCorrectId(action).split('.').pop()}
                      </span>
                    </Tooltip>
                  </div>
                  <div className="col-span-3 font-medium text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2 truncate">
                    <span className="truncate" title={action.title}>{action.title}</span>
                    {!userCanEdit && (
                      <Tooltip content={readOnly ? "Modo somente leitura" : "Você não tem permissão para editar"}>
                        <Lock size={12} className="text-slate-400 shrink-0" />
                      </Tooltip>
                    )}
                  </div>

                  {/* Coluna CRONOGRAMA Unificada */}
                  <div className="col-span-2 flex flex-col justify-center text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                      <Calendar size={12} className="shrink-0" />
                      <span>
                        {formatDateShortYear(action.startDate)}
                        <span className="mx-1 text-slate-300">→</span>
                        {formatDateShortYear(action.plannedEndDate)}
                      </span>
                    </div>
                    {action.endDate && (
                      <div className={`flex items-center gap-1.5 font-medium w-fit px-1.5 py-0.5 rounded-[4px] ${action.plannedEndDate && action.endDate > action.plannedEndDate
                        ? 'text-rose-600 bg-rose-50'
                        : 'text-emerald-600 bg-emerald-50'
                        }`}>
                        <CheckCircle2 size={10} className="shrink-0" />
                        <span>Real: {formatDateShortYear(action.endDate)}</span>
                      </div>
                    )}
                  </div>

                  {/* Coluna EQUIPE (Agora no meio - Overlapping) */}
                  <div className="col-span-2 flex items-center -space-x-2 overflow-hidden hover:space-x-1 hover:overflow-visible transition-all duration-300 px-1">
                    {[...action.raci].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]).map((r, i) => (
                      <div key={i} className="transition-transform hover:scale-110 hover:z-10 relative">
                        <RaciCompactPill person={r} />
                      </div>
                    ))}
                    {action.raci.length === 0 && (
                      <span className="text-[10px] text-slate-300 italic pl-2">Sem equipe</span>
                    )}
                  </div>

                  <div className="col-span-2 md:pl-2"><StatusBadge status={action.status} /></div>

                  {/* Coluna ÁREAS ENVOLVIDAS (Agora no fim - Alinhada à direita) */}
                  <div className="col-span-2 flex flex-wrap justify-end gap-1.5 items-center content-center">
                    {action.tags?.slice(0, 2).map(tag => (
                      <Tooltip key={tag.id} content={tag.name}>
                        <span
                          style={{ backgroundColor: tag.color }}
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white truncate max-w-[110px] hover:max-w-none transition-all duration-300 shadow-sm cursor-help ring-1 ring-white/20"
                        >
                          {tag.name}
                        </span>
                      </Tooltip>
                    ))}
                    {(action.tags?.length || 0) > 2 && (
                      <Tooltip content={action.tags!.slice(2).map(t => t.name).join(', ')}>
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold hover:bg-slate-200 cursor-pointer transition-colors">
                          +{action.tags!.length - 2}
                        </span>
                      </Tooltip>
                    )}
                    {(!action.tags || action.tags.length === 0) && (
                      <span className="text-[10px] text-slate-300 italic px-2">—</span>
                    )}
                  </div>
                </div>

                {/* Mobile row */}
                <div onClick={() => toggleRow(action.uid)} className="sm:hidden p-4 cursor-pointer">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Tooltip content={`ID: ${getCorrectId(action)}`}>
                          <span className="inline-block font-mono text-[10px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600 cursor-help min-w-[24px] text-center">
                            {getCorrectId(action).split('.').pop()}
                          </span>
                        </Tooltip>
                        <StatusBadge status={action.status} />
                        {!userCanEdit && <Lock size={12} className="text-slate-400" />}
                      </div>
                      <div className="font-medium text-sm text-slate-700 dark:text-slate-200 line-clamp-2">{action.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {formatDateBr(action.endDate)}</span>
                    <div className="flex gap-1">
                      {[...action.raci].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]).slice(0, 2).map((r, i) => <RaciCompactPill key={i} person={r} />)}
                    </div>
                  </div>
                </div>

                {/* Expanded form - só mostra se não está usando modal */}
                {isExpanded && !useModal && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 border-t border-slate-100 dark:border-slate-700 animate-fade-in">
                    {/* Aviso de permissão */}
                    {!userCanEdit && (
                      <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
                        <Lock size={16} />
                        <span>
                          {readOnly
                            ? "Modo somente leitura. Selecione uma microrregião para editar."
                            : "Você não tem permissão para editar esta ação."}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Título</label>
                        <textarea
                          className="w-full border-b border-slate-200 focus:border-blue-500 outline-none py-2 text-sm font-medium bg-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                          value={action.title}
                          onChange={e => onUpdateAction(action.uid, 'title', e.target.value)}
                          rows={2}
                          disabled={!userCanEdit}
                        />
                        <div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            <MessageCircle size={16} />
                            Comentários ({action.comments?.length || 0})
                          </div>
                          <div className="max-h-64 overflow-auto px-4 py-2">
                            {(action.comments || []).length === 0 ? (
                              (action.commentCount || 0) > 0 ? (
                                <div className="flex flex-col items-center justify-center text-slate-400 py-4 gap-2">
                                  <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                  <p className="font-medium text-xs">Carregando comentários...</p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400 py-4">
                                  <MessageCircle size={32} className="mb-2 opacity-30" />
                                  <p className="font-medium text-xs">Nenhum comentário ainda</p>
                                </div>
                              )
                            ) : (
                              <div>
                                {(action.comments || []).map(c => <CommentItem key={c.id} comment={c} />)}
                              </div>
                            )}
                          </div>
                          <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-white dark:bg-slate-800">
                            <div className="flex gap-3 items-start">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {(user?.nome || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                              </div>
                              <div className="flex-1">
                                <textarea
                                  value={commentDrafts[action.uid] ?? ''}
                                  onChange={e => setCommentDrafts(prev => ({ ...prev, [action.uid]: e.target.value }))}
                                  placeholder="Escreva um comentário..."
                                  rows={2}
                                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleAddComment(action);
                                    }
                                  }}
                                />
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-slate-400">Pressione Enter para enviar</span>
                                  <button
                                    onClick={() => handleAddComment(action)}
                                    disabled={!(commentDrafts[action.uid]?.trim()) || !user}
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
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Início</label>
                            <input
                              type="date"
                              className="w-full border rounded p-2 text-sm mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                              value={action.startDate}
                              onChange={e => onUpdateAction(action.uid, 'startDate', e.target.value)}
                              disabled={!userCanEdit}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-blue-600 uppercase">Término Planejado</label>
                            <input
                              type="date"
                              className="w-full border border-blue-200 rounded p-2 text-sm mt-1 bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
                              value={action.plannedEndDate || ''}
                              onChange={e => onUpdateAction(action.uid, 'plannedEndDate', e.target.value)}
                              disabled={!userCanEdit}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-orange-600 uppercase">Término Real</label>
                            <input
                              type="date"
                              className="w-full border border-orange-200 rounded p-2 text-sm mt-1 bg-orange-50 disabled:opacity-60 disabled:cursor-not-allowed"
                              value={action.endDate}
                              onChange={e => onUpdateAction(action.uid, 'endDate', e.target.value)}
                              disabled={!userCanEdit}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Progresso & Status</label>
                          <div className="flex gap-2 mt-1">
                            <Select
                              className="flex-1 text-sm"
                              value={action.status}
                              onChange={e => onUpdateAction(action.uid, 'status', e.target.value as Status)}
                              disabled={!userCanEdit}
                            >
                              <option>Não Iniciado</option>
                              <option>Em Andamento</option>
                              <option>Concluído</option>
                              <option>Atrasado</option>
                            </Select>
                            <input
                              type="number"
                              className="w-20 border border-slate-200 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                              value={action.progress}
                              onChange={e => onUpdateAction(action.uid, 'progress', e.target.value)}
                              min="0"
                              max="100"
                              disabled={!userCanEdit}
                            />
                          </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded border border-slate-100 dark:border-slate-600">
                          <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Equipe (RACI)</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {[...action.raci].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]).map((r, i) => (
                              <RaciTag
                                key={i}
                                person={r}
                                onRemove={userCanEdit ? () => onRemoveRaci(action.uid, i, r.name) : undefined}
                              />
                            ))}
                            {action.raci.length === 0 && (
                              <span className="text-xs text-slate-400 italic">Nenhum membro na equipe</span>
                            )}
                          </div>
                          {userCanEdit && (
                            <div className="flex gap-2">
                              <Select className="flex-1 text-xs" value={selectedRaciMemberId} onChange={e => setSelectedRaciMemberId(e.target.value)}>
                                <option value="">+ Adicionar pessoa</option>
                                {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </Select>
                              <Select className="w-16 text-xs" value={newRaciRole} onChange={e => setNewRaciRole(e.target.value as RaciRole)}>
                                <option>R</option><option>A</option><option>I</option>
                              </Select>
                              <Tooltip content="Adicionar membro à equipe">
                                <button
                                  onClick={() => handleAddRaci(action.uid)}
                                  className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-2 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                                  aria-label="Adicionar membro"
                                >
                                  <Plus size={14} />
                                </button>
                              </Tooltip>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          {/* Botão Excluir */}
                          {userCanDelete ? (
                            <Tooltip content="Excluir esta ação permanentemente">
                              <button
                                onClick={() => onDeleteAction(action.uid)}
                                className="flex items-center justify-center gap-2 text-sm text-rose-600 hover:text-white hover:bg-rose-500 px-4 py-2 rounded-lg border border-rose-200 hover:border-rose-500 transition-all"
                              >
                                <Trash2 size={16} />
                                <span>Excluir Ação</span>
                              </button>
                            </Tooltip>
                          ) : (
                            <div />
                          )}

                          {/* Botões Cancelar e Salvar */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleRow(action.uid)}
                              className="text-sm text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                            >
                              {userCanEdit ? 'Cancelar' : 'Fechar'}
                            </button>
                            {userCanEdit && (
                              <LoadingButton
                                onClick={() => onSaveAction(action.uid)}
                                isLoading={isSaving}
                                loadingText="Salvando..."
                                className="text-sm bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 transition-colors shadow-sm"
                              >
                                ✓ Salvar Alterações
                              </LoadingButton>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Botão Nova Ação e Importar */}
      {canCreate && !readOnly && (
        <div className="mt-4 flex justify-end gap-3">
          {onBulkImport && (
            <button
              onClick={() => setIsSmartPasteOpen(true)}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600"
            >
              <FileSpreadsheet size={18} /> Importar
            </button>
          )}
          <button
            onClick={onCreateAction}
            className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-teal-700 transition-colors shadow-sm"
          >
            <Plus size={18} /> Nova Ação
          </button>
        </div>
      )}

      {/* Smart Paste Modal */}
      {onBulkImport && (
        <SmartPasteModal
          isOpen={isSmartPasteOpen}
          onClose={() => setIsSmartPasteOpen(false)}
          onImport={onBulkImport}
        />
      )}
    </div>
  );
};

export const ActionTable = React.memo(ActionTableImpl);

