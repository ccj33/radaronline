import { type Dispatch, type MouseEvent, type SetStateAction } from 'react';
import { Calendar, Check, ChevronDown, Clock, Hash, Heart, Plus, Target, Users, X } from 'lucide-react';
import { Tooltip } from '../../../components/common/Tooltip';
import { Action, ActionTag, RaciRole, Status, TeamMember } from '../../../types';
import { ActionRuleErrors } from '../../../lib/actionRules';
import { actionDetailRoleLabels, actionDetailRolePriority } from './actionDetail.constants';

interface ActionDetailMetaBarProps {
  action: Action;
  /** Status efetivo (datas + progresso), igual à lista e aos filtros */
  displayStatus: Status;
  currentStatus: { bg: string; text: string; dot: string };
  draftMicroregiaoId?: string;
  isMobile: boolean;
  mobileSection: 'details' | 'raci' | 'comments';
  userCanEdit: boolean;
  ruleErrors: ActionRuleErrors;
  uiState: {
    progressDisabled: boolean;
    progressDisabledReason: string;
    isOverdue: boolean;
  };
  team: TeamMember[];
  selectedRaciMemberId: string;
  setSelectedRaciMemberId: Dispatch<SetStateAction<string>>;
  newRaciRole: RaciRole;
  setNewRaciRole: Dispatch<SetStateAction<RaciRole>>;
  showRaciPopover: boolean;
  setShowRaciPopover: Dispatch<SetStateAction<boolean>>;
  showTagPopover: boolean;
  setShowTagPopover: Dispatch<SetStateAction<boolean>>;
  availableTags: ActionTag[];
  newTagName: string;
  setNewTagName: Dispatch<SetStateAction<string>>;
  isLoadingTags: boolean;
  tagToDelete: ActionTag | null;
  setTagToDelete: Dispatch<SetStateAction<ActionTag | null>>;
  tagStatusMsg: string;
  updateDraftField: (field: keyof Action, value: Action[keyof Action]) => void;
  handleFieldChange: (field: keyof Action, value: Action[keyof Action]) => void;
  setDateShortcut: (field: 'startDate' | 'plannedEndDate' | 'endDate', daysToAdd?: number) => void;
  handleCreateTag: () => Promise<void>;
  handleDeleteTag: (tag: ActionTag) => void;
  confirmDeleteTag: () => Promise<void>;
  handleToggleFavorite: (tag: ActionTag, event: MouseEvent) => Promise<void>;
  toggleTagSelection: (tag: ActionTag, event?: MouseEvent) => void;
  handleAddRaci: () => void;
}

export function ActionDetailMetaBar({
  action,
  displayStatus,
  currentStatus,
  draftMicroregiaoId,
  isMobile,
  mobileSection,
  userCanEdit,
  ruleErrors,
  uiState,
  team,
  selectedRaciMemberId,
  setSelectedRaciMemberId,
  newRaciRole,
  setNewRaciRole,
  showRaciPopover,
  setShowRaciPopover,
  showTagPopover,
  setShowTagPopover,
  availableTags,
  newTagName,
  setNewTagName,
  isLoadingTags,
  tagToDelete,
  setTagToDelete,
  tagStatusMsg,
  updateDraftField,
  handleFieldChange,
  setDateShortcut,
  handleCreateTag,
  handleDeleteTag,
  confirmDeleteTag,
  handleToggleFavorite,
  toggleTagSelection,
  handleAddRaci,
}: ActionDetailMetaBarProps) {
  return (
    <div
      className={`px-4 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 shadow-sm z-10 space-y-4 ${
        isMobile && mobileSection !== 'details' ? 'hidden' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1 mb-1.5">
            <Target size={10} /> Situação atual
          </span>
          <div className="relative">
            <select
              value={displayStatus}
              onChange={(event) => handleFieldChange('status', event.target.value as Status)}
              disabled={!userCanEdit}
              className={`w-full appearance-none pl-7 pr-8 py-2 text-sm font-semibold rounded-lg border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed ${currentStatus.bg} ${currentStatus.text} border-current/20`}
            >
              <option>{'N\u00E3o Iniciado'}</option>
              <option>Em Andamento</option>
              <option>{'Conclu\u00EDdo'}</option>
              <option>Atrasado</option>
            </select>
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <div className={`w-2.5 h-2.5 rounded-full ${currentStatus.dot}`} />
            </div>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-current opacity-60 pointer-events-none" size={14} />
          </div>
          {action.status !== displayStatus ? (
            <p className="mt-1.5 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
              Cadastro salvo: <span className="font-semibold text-slate-600 dark:text-slate-300">{action.status}</span>
              . A lista e os filtros usam a situação calculada acima (prazo planejado, progresso e datas).
            </p>
          ) : null}
        </div>

        <div className="flex-1">
          <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
            <span className="flex items-center gap-1">
              <Clock size={10} /> Progresso
            </span>
            <span className={`text-sm font-bold ${action.progress === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
              {action.progress}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={action.progress}
            onChange={(event) => handleFieldChange('progress', parseInt(event.target.value, 10))}
            disabled={!userCanEdit || uiState.progressDisabled}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-teal-600 disabled:opacity-50 disabled:cursor-not-allowed ${uiState.progressDisabled ? 'bg-slate-100 dark:bg-slate-700' : 'bg-slate-200 dark:bg-slate-600'}`}
          />
          {uiState.progressDisabled && uiState.progressDisabledReason && (
            <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1 font-medium animate-fade-in">
              {uiState.progressDisabledReason}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <Calendar size={10} className="inline mr-1" /> In\u00EDcio
            </span>
            {userCanEdit && (
              <button
                onClick={() => setDateShortcut('startDate', 0)}
                className="text-[9px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300 transition-colors"
                title="Definir para hoje"
              >
                Hoje
              </button>
            )}
          </div>
          <input
            type="date"
            value={action.startDate}
            onChange={(event) => updateDraftField('startDate', event.target.value)}
            disabled={!userCanEdit}
            className={`text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700 px-2.5 py-1.5 rounded-lg border disabled:opacity-60 w-full ${ruleErrors.startAfterPlanned || ruleErrors.endBeforeStart ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-600'}`}
          />
          {ruleErrors.startAfterPlanned && <span className="text-[9px] text-rose-500 leading-tight">Checar data</span>}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Fim Planejado</span>
            {userCanEdit && (
              <div className="flex gap-1">
                <button onClick={() => setDateShortcut('plannedEndDate', 7)} className="text-[9px] px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 rounded text-blue-600 dark:text-blue-300">+7d</button>
                <button onClick={() => setDateShortcut('plannedEndDate', 15)} className="text-[9px] px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 rounded text-blue-600 dark:text-blue-300">+15d</button>
                <button onClick={() => setDateShortcut('plannedEndDate', 30)} className="text-[9px] px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 rounded text-blue-600 dark:text-blue-300">+30d</button>
              </div>
            )}
          </div>
          <input
            type="date"
            value={action.plannedEndDate || ''}
            onChange={(event) => updateDraftField('plannedEndDate', event.target.value)}
            disabled={!userCanEdit}
            className={`text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-lg border disabled:opacity-60 w-full ${ruleErrors.startAfterPlanned || ruleErrors.lateNeedsPlanned ? 'border-rose-400 focus:ring-rose-500' : 'border-blue-200 dark:border-blue-700'}`}
          />
          {ruleErrors.startAfterPlanned && <span className="text-[9px] text-rose-500 leading-tight">{ruleErrors.startAfterPlanned}</span>}
          {ruleErrors.lateNeedsPlanned && <span className="text-[9px] text-rose-500 leading-tight">{ruleErrors.lateNeedsPlanned}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider">Fim Real</span>
          <input
            type="date"
            value={action.endDate}
            onChange={(event) => handleFieldChange('endDate', event.target.value)}
            disabled={!userCanEdit}
            className={`text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30 px-2.5 py-1.5 rounded-lg border disabled:opacity-60 w-full ${ruleErrors.endBeforeStart ? 'border-rose-400 focus:ring-rose-500' : 'border-orange-200 dark:border-orange-700'}`}
          />
          {ruleErrors.endBeforeStart && <span className="text-[9px] text-rose-500 leading-tight">{ruleErrors.endBeforeStart}</span>}
        </div>
      </div>

      <div className="relative pt-2 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Users size={10} /> Equipe
            </span>
            <div className="flex items-center">
              {[...action.raci]
                .sort((left, right) => actionDetailRolePriority[left.role] - actionDetailRolePriority[right.role])
                .slice(0, 5)
                .map((member, index) => (
                  <Tooltip key={index} content={`${member.name} (${actionDetailRoleLabels[member.role].label})`}>
                    <div className="relative -ml-1.5 first:ml-0">
                      <div className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold shadow-sm ${actionDetailRoleLabels[member.role].color}`}>
                        {member.name.split(' ').map((item) => item[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white text-[5px] font-bold flex items-center justify-center ${actionDetailRoleLabels[member.role].color} text-white`}>
                        {member.role}
                      </div>
                    </div>
                  </Tooltip>
                ))}
              {action.raci.length > 5 && (
                <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-500 text-[9px] font-bold -ml-1.5">
                  +{action.raci.length - 5}
                </div>
              )}
              {userCanEdit && (
                <Tooltip content="Adicionar membro">
                  <button
                    onClick={() => setShowRaciPopover(!showRaciPopover)}
                    className="w-7 h-7 rounded-full bg-white dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-500 hover:border-teal-500 dark:hover:border-teal-400 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 flex items-center justify-center -ml-1.5 relative z-0 hover:z-10 transition-all shadow-sm"
                  >
                    <Plus size={14} />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-200 dark:border-slate-700">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Hash size={10} /> Areas Envolvidas
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {action.tags?.map((tag) => (
                <div key={tag.id} className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: tag.color }}>
                  <Check size={8} className="mr-0.5 text-green-300" />
                  #{tag.name}
                </div>
              ))}
              {userCanEdit && (
                <Tooltip content="Adicionar area">
                  <button
                    onClick={() => setShowTagPopover(!showTagPopover)}
                    className="w-6 h-6 rounded-full bg-white dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-500 hover:border-teal-500 dark:hover:border-teal-400 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 flex items-center justify-center transition-all"
                  >
                    <Plus size={12} />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {showTagPopover && userCanEdit && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3 z-40 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Gerenciar Areas ({draftMicroregiaoId || 'SEM MICRO'})</h4>
                {tagStatusMsg && <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold animate-pulse">{tagStatusMsg}</p>}
              </div>
              <button onClick={() => setShowTagPopover(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={14} />
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value.toUpperCase())}
                placeholder="Nova area..."
                className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                onKeyDown={(event) => event.key === 'Enter' && handleCreateTag()}
              />
              <button onClick={handleCreateTag} disabled={!newTagName.trim()} className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 disabled:opacity-50">
                Criar
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto">
              {isLoadingTags ? (
                <p className="text-xs text-slate-400 text-center py-2">Carregando...</p>
              ) : availableTags.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">Nenhuma area salva</p>
              ) : (
                <div className="space-y-3">
                  {availableTags.some((tag) => tag.isFavorite) && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                        <Heart size={10} className="text-rose-400 fill-current" /> Favoritos
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableTags.filter((tag) => tag.isFavorite).map((tag) => {
                          const isOnAction = action.tags?.some((actionTag) => actionTag.id === tag.id);
                          return (
                            <div key={tag.id} className="flex items-center">
                              <button
                                type="button"
                                onClick={(event) => handleToggleFavorite(tag, event)}
                                className="mr-1 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-rose-500"
                                title="Remover destaque"
                              >
                                <Heart size={10} fill="currentColor" />
                              </button>
                              <button
                                onClick={(event) => toggleTagSelection(tag, event)}
                                className="relative px-2 py-0.5 rounded-l-full text-[10px] font-bold text-white transition-all hover:brightness-110"
                                style={{ backgroundColor: tag.color }}
                              >
                                {isOnAction && <Check size={8} className="inline mr-0.5 -mt-0.5 text-green-300" />}
                                #{tag.name}
                              </button>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteTag(tag);
                                }}
                                className="px-1 py-0.5 rounded-r-full text-[10px] hover:bg-red-500 transition-colors"
                                style={{ backgroundColor: `color-mix(in srgb, ${tag.color} 60%, white)`, color: tag.color }}
                                title="Excluir area"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    {availableTags.some((tag) => tag.isFavorite) && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 mt-2">Outras Areas</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.filter((tag) => !tag.isFavorite).map((tag) => {
                        const isOnAction = action.tags?.some((actionTag) => actionTag.id === tag.id);
                        return (
                          <div key={tag.id} className="flex items-center opacity-80 hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(event) => handleToggleFavorite(tag, event)}
                              className="mr-1 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-slate-300 hover:text-rose-300"
                              title="Destacar"
                            >
                              <Heart size={10} />
                            </button>
                            <button
                              onClick={(event) => toggleTagSelection(tag, event)}
                              className="relative px-2 py-0.5 rounded-l-full text-[10px] font-bold text-white transition-all hover:brightness-110"
                              style={{ backgroundColor: tag.color }}
                            >
                              {isOnAction && <Check size={8} className="inline mr-0.5 -mt-0.5 text-green-300" />}
                              #{tag.name}
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteTag(tag);
                              }}
                              className="px-1 py-0.5 rounded-r-full text-[10px] hover:bg-red-500 transition-colors"
                              style={{ backgroundColor: `color-mix(in srgb, ${tag.color} 60%, white)`, color: tag.color }}
                              title="Excluir area"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {tagToDelete && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                  Excluir area <strong>#{tagToDelete.name}</strong>?
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setTagToDelete(null)} className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-300">
                    Cancelar
                  </button>
                  <button onClick={confirmDeleteTag} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 font-bold">
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {showRaciPopover && userCanEdit && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 z-30 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Adicionar Membro a Equipe</h4>
              <button onClick={() => setShowRaciPopover(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Selecionar Pessoa</label>
                <select
                  value={selectedRaciMemberId}
                  onChange={(event) => setSelectedRaciMemberId(event.target.value)}
                  className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  <option value="">Escolha um membro...</option>
                  {team
                    .filter((member) => !action.raci.some((raciMember) => raciMember.name === member.name))
                    .map((member) => (
                      <option key={member.id} value={member.id} className={member.isRegistered === false ? 'text-slate-400 italic' : ''}>
                        {member.name} {member.isRegistered === false ? '(Cadastro Pendente)' : ''} - {member.role}
                      </option>
                    ))}
                </select>
                {team.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Nenhum membro cadastrado na equipe. Adicione membros pela aba "Equipe".</p>
                )}
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Papel (RACI)</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['R', 'A', 'I'] as RaciRole[]).map((role) => (
                    <button
                      key={role}
                      onClick={() => setNewRaciRole(role)}
                      className={`p-2 rounded-lg text-center text-xs font-bold transition-all border-2 ${
                        newRaciRole === role
                          ? `${actionDetailRoleLabels[role].color} text-white border-transparent scale-105`
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <div className="text-sm">{role}</div>
                      <div className="text-[9px] font-medium opacity-80">{actionDetailRoleLabels[role].label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  if (selectedRaciMemberId) {
                    handleAddRaci();
                  }
                }}
                disabled={!selectedRaciMemberId}
                className="w-full py-2 bg-teal-600 text-white rounded-lg font-bold text-sm hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adicionar a Equipe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
