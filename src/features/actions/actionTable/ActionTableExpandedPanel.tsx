import { Lock, MessageCircle, Plus, Send, Trash2 } from "lucide-react";

import { LoadingButton } from "../../../components/common/LoadingSpinner";
import { RaciTag } from "../../../components/common/RaciPill";
import { Tooltip } from "../../../components/common/Tooltip";
import { Select } from "../../../ui/Select";
import { getDerivedActionStatus } from "../../../lib/actionPortfolio";
import type { Action, RaciRole, Status, TeamMember } from "../../../types";
import { rolePriority } from "./actionTable.utils";
import { ActionTableCommentItem } from "./ActionTableCommentItem";

interface ActionTableExpandedPanelProps {
  action: Action;
  team: TeamMember[];
  readOnly: boolean;
  userCanEdit: boolean;
  userCanDelete: boolean;
  currentUserInitials: string;
  hasUser: boolean;
  commentDraft: string;
  selectedRaciMemberId: string;
  newRaciRole: RaciRole;
  isSaving: boolean;
  onCommentDraftChange: (value: string) => void;
  onSelectedRaciMemberIdChange: (value: string) => void;
  onNewRaciRoleChange: (value: RaciRole) => void;
  onUpdateAction: (uid: string, field: string, value: string | number) => void;
  onSaveAction: (uid?: string) => void;
  onDeleteAction: (uid: string) => void;
  onAddRaci: (uid: string) => void;
  onRemoveRaci: (uid: string, index: number, memberName: string) => void;
  onAddComment: (action: Action) => void;
  onClose: () => void;
}

export function ActionTableExpandedPanel({
  action,
  team,
  readOnly,
  userCanEdit,
  userCanDelete,
  currentUserInitials,
  hasUser,
  commentDraft,
  selectedRaciMemberId,
  newRaciRole,
  isSaving,
  onCommentDraftChange,
  onSelectedRaciMemberIdChange,
  onNewRaciRoleChange,
  onUpdateAction,
  onSaveAction,
  onDeleteAction,
  onAddRaci,
  onRemoveRaci,
  onAddComment,
  onClose,
}: ActionTableExpandedPanelProps) {
  const derivedActionStatus = getDerivedActionStatus(action);

  return (
    <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 border-t border-slate-100 dark:border-slate-700 animate-fade-in">
      {!userCanEdit ? (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
          <Lock size={16} />
          <span>
            {readOnly
              ? "Modo somente leitura. Selecione uma microrregião para editar."
              : "Você não tem permissão para editar esta ação."}
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Título</label>
          <textarea
            className="w-full border-b border-slate-200 focus:border-blue-500 outline-none py-2 text-sm font-medium bg-transparent disabled:opacity-60 disabled:cursor-not-allowed"
            value={action.title}
            onChange={(event) => onUpdateAction(action.uid, "title", event.target.value)}
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
                  {(action.comments || []).map((comment) => (
                    <ActionTableCommentItem key={comment.id} comment={comment} />
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-white dark:bg-slate-800">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {currentUserInitials}
                </div>
                <div className="flex-1">
                  <textarea
                    value={commentDraft}
                    onChange={(event) => onCommentDraftChange(event.target.value)}
                    placeholder="Escreva um comentário..."
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        onAddComment(action);
                      }
                    }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-400">Pressione Enter para enviar</span>
                    <button
                      onClick={() => onAddComment(action)}
                      disabled={!commentDraft.trim() || !hasUser}
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
                onChange={(event) => onUpdateAction(action.uid, "startDate", event.target.value)}
                disabled={!userCanEdit}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-blue-600 uppercase">Término Planejado</label>
              <input
                type="date"
                className="w-full border border-blue-200 rounded p-2 text-sm mt-1 bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
                value={action.plannedEndDate || ""}
                onChange={(event) => onUpdateAction(action.uid, "plannedEndDate", event.target.value)}
                disabled={!userCanEdit}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-orange-600 uppercase">Término Real</label>
              <input
                type="date"
                className="w-full border border-orange-200 rounded p-2 text-sm mt-1 bg-orange-50 disabled:opacity-60 disabled:cursor-not-allowed"
                value={action.endDate}
                onChange={(event) => onUpdateAction(action.uid, "endDate", event.target.value)}
                disabled={!userCanEdit}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Situação atual (igual à lista)</label>
            <div className="flex gap-2 mt-1">
              <Select
                className="flex-1 text-sm"
                value={derivedActionStatus}
                onChange={(event) => onUpdateAction(action.uid, "status", event.target.value as Status)}
                disabled={!userCanEdit}
              >
                <option>{"N\u00E3o Iniciado"}</option>
                <option>Em Andamento</option>
                <option>{"Conclu\u00EDdo"}</option>
                <option>Atrasado</option>
              </Select>
              <input
                type="number"
                className="w-20 border border-slate-200 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                value={action.progress}
                onChange={(event) => onUpdateAction(action.uid, "progress", event.target.value)}
                min="0"
                max="100"
                disabled={!userCanEdit}
              />
            </div>
            {action.status !== derivedActionStatus ? (
              <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                Cadastro salvo: <span className="font-semibold text-slate-600 dark:text-slate-300">{action.status}</span>. A tabela usa a situação calculada (prazo e progresso).
              </p>
            ) : null}
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded border border-slate-100 dark:border-slate-600">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Equipe (RACI)</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {[...action.raci].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]).map((person, index) => (
                <RaciTag
                  key={`${person.name}-${person.role}-${index}`}
                  person={person}
                  onRemove={userCanEdit ? () => onRemoveRaci(action.uid, index, person.name) : undefined}
                />
              ))}
              {action.raci.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Nenhum membro na equipe</span>
              ) : null}
            </div>

            {userCanEdit ? (
              <div className="flex gap-2">
                <Select
                  className="flex-1 text-xs"
                  value={selectedRaciMemberId}
                  onChange={(event) => onSelectedRaciMemberIdChange(event.target.value)}
                >
                  <option value="">+ Adicionar pessoa</option>
                  {team.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </Select>
                <Select className="w-16 text-xs" value={newRaciRole} onChange={(event) => onNewRaciRoleChange(event.target.value as RaciRole)}>
                  <option>R</option>
                  <option>A</option>
                  <option>I</option>
                </Select>
                <Tooltip content="Adicionar membro à equipe">
                  <button
                    onClick={() => onAddRaci(action.uid)}
                    className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-2 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    aria-label="Adicionar membro"
                  >
                    <Plus size={14} />
                  </button>
                </Tooltip>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
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

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="text-sm text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                {userCanEdit ? "Cancelar" : "Fechar"}
              </button>
              {userCanEdit ? (
                <LoadingButton
                  onClick={() => onSaveAction(action.uid)}
                  isLoading={isSaving}
                  loadingText="Salvando..."
                  className="text-sm bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 transition-colors shadow-sm"
                >
                  Salvar Alterações
                </LoadingButton>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
