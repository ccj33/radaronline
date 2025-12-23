import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    X, Save, Trash2, Calendar, MessageCircle, Send,
    Users, Target, Clock, ChevronDown, Plus, Lock, Eye
} from 'lucide-react';
import { Action, Status, RaciRole, TeamMember, ActionComment } from '../../types';
import { formatDateBr } from '../../lib/date';
import { StatusBadge, RaciTag } from '../../components/common';
import { LoadingButton } from '../../components/common/LoadingSpinner';
import { Tooltip } from '../../components/common/Tooltip';
import { Select } from '../../ui/Select';
import { useAuth } from '../../auth/AuthContext';
import { getAvatarUrl } from '../settings/UserSettingsModal';
import { formatRelativeTime } from './ActionTable';

// =====================================
// PROPS DO COMPONENTE
// =====================================
interface ActionDetailModalProps {
    isOpen: boolean;
    action: Action | null;
    team: TeamMember[];
    activityName?: string;
    onClose: () => void;
    onUpdateAction: (uid: string, field: string, value: string | number) => void;
    onSaveAction: (uid?: string) => void;
    onDeleteAction: (uid: string) => void;
    onAddRaci: (uid: string, memberId: string, role: RaciRole) => void;
    onRemoveRaci: (uid: string, idx: number, memberName: string) => void;
    onAddComment: (uid: string, content: string) => void;
    isSaving?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    readOnly?: boolean;
}

const rolePriority: Record<RaciRole, number> = { R: 0, A: 1, C: 2, I: 3 };

const roleLabels: Record<RaciRole, { label: string; color: string }> = {
    R: { label: 'Responsável', color: 'bg-purple-600' },
    A: { label: 'Aprovador', color: 'bg-blue-600' },
    C: { label: 'Consultado', color: 'bg-emerald-600' },
    I: { label: 'Informado', color: 'bg-amber-500' },
};

// =====================================
// COMPONENTE DE COMENTÁRIO
// =====================================
const getRoleLabel = (role?: string): { label: string; style: string } | null => {
    if (!role) return null;
    const normalizedRole = role.toLowerCase();
    if (normalizedRole === 'superadmin' || normalizedRole === 'admin') {
        return { label: 'Adm', style: 'bg-purple-100 text-purple-700' };
    }
    if (normalizedRole === 'gestor') {
        return { label: 'Gestor', style: 'bg-blue-100 text-blue-700' };
    }
    if (normalizedRole === 'usuario') {
        return { label: 'Usuário', style: 'bg-slate-100 text-slate-600' };
    }
    return null;
};

const CommentItem: React.FC<{ comment: ActionComment }> = ({ comment }) => {
    const roleInfo = getRoleLabel(comment.authorRole);
    return (
        <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
            <img
                src={getAvatarUrl(comment.authorAvatarId || 'zg10')}
                alt={comment.authorName}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 shrink-0"
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-800">{comment.authorName}</span>
                    {roleInfo && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${roleInfo.style}`}>
                            {roleInfo.label}
                        </span>
                    )}
                    <span className="text-xs text-slate-400">{comment.authorMunicipio}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-400">{formatRelativeTime(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{comment.content}</p>
            </div>
        </div>
    );
};

// =====================================
// COMPONENTE PRINCIPAL
// =====================================
export const ActionDetailModal: React.FC<ActionDetailModalProps> = ({
    isOpen,
    action,
    team,
    activityName = 'Atividade',
    onClose,
    onUpdateAction,
    onSaveAction,
    onDeleteAction,
    onAddRaci,
    onRemoveRaci,
    onAddComment,
    isSaving = false,
    canEdit = true,
    canDelete = true,
    readOnly = false,
}) => {
    const { user } = useAuth();
    const [commentDraft, setCommentDraft] = useState('');
    const [selectedRaciMemberId, setSelectedRaciMemberId] = useState('');
    const [newRaciRole, setNewRaciRole] = useState<RaciRole>('R');
    const [showRaciPopover, setShowRaciPopover] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);

    const userCanEdit = !readOnly && canEdit;
    const userCanDelete = !readOnly && canDelete;

    // ESC para fechar e focus trap
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
            // Ctrl+S para salvar
            if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (userCanEdit && action) onSaveAction(action.uid);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose, onSaveAction, userCanEdit]);

    const handleAddComment = useCallback(() => {
        if (!commentDraft.trim() || !user || !action) return;
        onAddComment(action.uid, commentDraft.trim());
        setCommentDraft('');
    }, [commentDraft, onAddComment, user, action]);

    const handleAddRaci = useCallback(() => {
        if (!selectedRaciMemberId || !action) return;
        onAddRaci(action.uid, selectedRaciMemberId, newRaciRole);
        setSelectedRaciMemberId('');
        setNewRaciRole('R');
    }, [selectedRaciMemberId, newRaciRole, onAddRaci, action]);

    if (!isOpen || !action) return null;

    const statusColors: Record<Status, { bg: string; text: string; dot: string }> = {
        'Não Iniciado': { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
        'Em Andamento': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
        'Concluído': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
        'Atrasado': { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
    };

    const currentStatus = statusColors[action.status] || statusColors['Não Iniciado'];

    return (
        <div
            className="fixed inset-0 z-[80] flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-detail-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer */}
            <div
                ref={modalRef}
                className="relative w-full max-w-2xl h-full bg-slate-50 shadow-2xl flex flex-col animate-slide-in-right overflow-hidden"
            >
                {/* =========================================
            1. HEADER COMPACTO
        ========================================= */}
                <header className="px-4 py-3 md:px-6 md:py-4 bg-white border-b border-slate-200 flex flex-col md:flex-row md:justify-between md:items-start gap-3 shrink-0 z-20">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        {/* Breadcrumb */}
                        <div className="flex items-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            <span>{activityName}</span>
                            <span className="mx-2 text-slate-300">/</span>
                            <span className="text-teal-600">{action.id}</span>
                        </div>
                        {/* Título Editável */}
                        <div className="group flex items-center gap-2 md:gap-3">
                            {userCanEdit ? (
                                <input
                                    type="text"
                                    id="action-detail-title"
                                    value={action.title}
                                    onChange={(e) => onUpdateAction(action.uid, 'title', e.target.value)}
                                    className="text-xl md:text-2xl font-bold text-slate-900 leading-tight bg-transparent border-0 border-b-2 border-transparent focus:border-teal-500 focus:outline-none w-full truncate transition-colors"
                                    placeholder="Título da ação..."
                                />
                            ) : (
                                <h1 id="action-detail-title" className="text-xl md:text-2xl font-bold text-slate-900 leading-tight truncate flex items-center gap-2">
                                    {action.title}
                                    <Lock size={16} className="text-slate-400" />
                                </h1>
                            )}
                        </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                        {userCanDelete && (
                            <Tooltip content="Excluir ação">
                                <button
                                    onClick={() => onDeleteAction(action.uid)}
                                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors"
                                    aria-label="Excluir"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </Tooltip>
                        )}
                        <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block" />
                        <button
                            onClick={onClose}
                            className="hidden md:block px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            Cancelar
                        </button>
                        {userCanEdit && (
                            <LoadingButton
                                onClick={() => onSaveAction(action.uid)}
                                isLoading={isSaving}
                                loadingText="Salvando..."
                                className="px-4 py-1.5 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-2"
                            >
                                <Save size={16} />
                                <span className="hidden sm:inline">Salvar</span>
                            </LoadingButton>
                        )}
                        <button
                            onClick={onClose}
                            className="md:hidden text-slate-400 hover:text-slate-600 p-2"
                            aria-label="Fechar"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </header>

                {/* =========================================
            2. META-BAR DE CONTROLE - Layout Vertical Organizado
        ========================================= */}
                <div className="px-4 py-4 bg-white border-b border-slate-200 shrink-0 shadow-sm z-10 space-y-4">
                    {/* Linha 1: Status + Progresso */}
                    <div className="flex items-center gap-4">
                        {/* Status */}
                        <div className="flex-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1 mb-1.5">
                                <Target size={10} /> Status
                            </span>
                            <div className="relative">
                                <select
                                    value={action.status}
                                    onChange={(e) => onUpdateAction(action.uid, 'status', e.target.value)}
                                    disabled={!userCanEdit}
                                    className={`w-full appearance-none pl-7 pr-8 py-2 text-sm font-semibold rounded-lg border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed
                      ${currentStatus.bg} ${currentStatus.text} border-current/20`}
                                >
                                    <option>Não Iniciado</option>
                                    <option>Em Andamento</option>
                                    <option>Concluído</option>
                                    <option>Atrasado</option>
                                </select>
                                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <div className={`w-2.5 h-2.5 rounded-full ${currentStatus.dot}`} />
                                </div>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-current opacity-60 pointer-events-none" size={14} />
                            </div>
                        </div>

                        {/* Progresso */}
                        <div className="flex-1">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                                <span className="flex items-center gap-1"><Clock size={10} /> Progresso</span>
                                <span className={`text-sm font-bold ${action.progress === 100 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                    {action.progress}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={action.progress}
                                onChange={(e) => onUpdateAction(action.uid, 'progress', parseInt(e.target.value))}
                                disabled={!userCanEdit}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 disabled:opacity-60"
                            />
                        </div>
                    </div>

                    {/* Linha 2: Datas */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                                <Calendar size={10} /> Início
                            </span>
                            <input
                                type="date"
                                value={action.startDate}
                                onChange={(e) => onUpdateAction(action.uid, 'startDate', e.target.value)}
                                disabled={!userCanEdit}
                                className="text-sm font-medium text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 disabled:opacity-60 w-full"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Fim Planejado</span>
                            <input
                                type="date"
                                value={action.plannedEndDate || action.endDate}
                                onChange={(e) => onUpdateAction(action.uid, 'plannedEndDate', e.target.value)}
                                disabled={!userCanEdit}
                                className="text-sm font-medium text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 disabled:opacity-60 w-full"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider">Fim Real</span>
                            <input
                                type="date"
                                value={action.endDate}
                                onChange={(e) => onUpdateAction(action.uid, 'endDate', e.target.value)}
                                disabled={!userCanEdit}
                                className="text-sm font-medium text-orange-700 bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-200 disabled:opacity-60 w-full"
                            />
                        </div>
                    </div>

                    {/* Linha 3: Equipe (compacta) */}
                    <div className="relative pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                                    <Users size={10} /> Equipe
                                </span>
                                <div className="flex items-center">
                                    {[...action.raci].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]).slice(0, 5).map((m, i) => (
                                        <Tooltip key={i} content={`${m.name} (${roleLabels[m.role].label}) - Clique para remover`}>
                                            <button
                                                onClick={() => userCanEdit && onRemoveRaci(action.uid, i, m.name)}
                                                disabled={!userCanEdit}
                                                className={`relative -ml-1.5 first:ml-0 hover:z-10 transition-transform hover:-translate-y-0.5 ${userCanEdit ? 'hover:ring-2 hover:ring-red-300 hover:ring-offset-1 rounded-full' : ''}`}
                                            >
                                                <div className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold shadow-sm ${roleLabels[m.role].color}`}>
                                                    {m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white text-[5px] font-bold flex items-center justify-center ${roleLabels[m.role].color} text-white`}>
                                                    {m.role}
                                                </div>
                                            </button>
                                        </Tooltip>
                                    ))}
                                    {action.raci.length > 5 && (
                                        <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-500 text-[9px] font-bold -ml-1.5">
                                            +{action.raci.length - 5}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {userCanEdit && (
                                <button
                                    className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-teal-50 transition-colors"
                                    onClick={() => setShowRaciPopover(!showRaciPopover)}
                                >
                                    <Plus size={12} /> Adicionar
                                </button>
                            )}
                        </div>

                        {/* Popover para adicionar membro */}
                        {showRaciPopover && userCanEdit && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-30 animate-fade-in">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-bold text-slate-700">Adicionar Membro à Equipe</h4>
                                    <button
                                        onClick={() => setShowRaciPopover(false)}
                                        className="text-slate-400 hover:text-slate-600 p-1"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {/* Seleção de membro */}
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Selecionar Pessoa</label>
                                        <select
                                            value={selectedRaciMemberId}
                                            onChange={(e) => setSelectedRaciMemberId(e.target.value)}
                                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        >
                                            <option value="">Escolha um membro...</option>
                                            {team
                                                .filter(t => !action.raci.some(r => r.name === t.name))
                                                .map(t => (
                                                    <option key={t.id} value={t.id}>{t.name} - {t.role}</option>
                                                ))
                                            }
                                        </select>
                                        {team.length === 0 && (
                                            <p className="text-xs text-amber-600 mt-1">Nenhum membro cadastrado na equipe. Adicione membros pela aba "Equipe".</p>
                                        )}
                                    </div>

                                    {/* Seleção de papel RACI */}
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Papel (RACI)</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['R', 'A', 'C', 'I'] as RaciRole[]).map(role => (
                                                <button
                                                    key={role}
                                                    onClick={() => setNewRaciRole(role)}
                                                    className={`p-2 rounded-lg text-center text-xs font-bold transition-all border-2
                                                        ${newRaciRole === role
                                                            ? `${roleLabels[role].color} text-white border-transparent scale-105`
                                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                                >
                                                    <div className="text-sm">{role}</div>
                                                    <div className="text-[9px] font-medium opacity-80">{roleLabels[role].label}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Botão de adicionar */}
                                    <button
                                        onClick={() => {
                                            if (selectedRaciMemberId) {
                                                onAddRaci(action.uid, selectedRaciMemberId, newRaciRole);
                                                setSelectedRaciMemberId('');
                                                setNewRaciRole('R');
                                                setShowRaciPopover(false);
                                            }
                                        }}
                                        disabled={!selectedRaciMemberId}
                                        className="w-full py-2 bg-teal-600 text-white rounded-lg font-bold text-sm hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Adicionar à Equipe
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* =========================================
            3. CORPO PRINCIPAL - COMENTÁRIOS
        ========================================= */}
                <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
                    {/* Aviso de permissão (se necessário) */}
                    {!userCanEdit && (
                        <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700 text-sm">
                            {readOnly ? <Eye size={16} /> : <Lock size={16} />}
                            <span>
                                {readOnly
                                    ? "Modo somente leitura. Selecione uma microrregião para editar."
                                    : "Você não tem permissão para editar esta ação."}
                            </span>
                        </div>
                    )}

                    {/* Header Comentários */}
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <MessageCircle size={16} className="text-teal-600" />
                            Comentários
                        </span>
                        <span className="bg-teal-100 text-teal-700 text-xs px-2.5 py-1 rounded-full font-bold">
                            {action.comments?.length || 0}
                        </span>
                    </div>

                    {/* Lista de Comentários */}
                    <div className="flex-1 px-4 md:px-6 overflow-y-auto">
                        {(action.comments || []).length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center h-full py-12">
                                <div className="p-4 bg-slate-100 rounded-full mb-3">
                                    <MessageCircle className="text-slate-300" size={32} />
                                </div>
                                <p className="text-slate-500 text-base font-medium">Nenhum comentário ainda</p>
                                <p className="text-slate-400 text-sm mt-1">Seja o primeiro a comentar!</p>
                            </div>
                        ) : (
                            <div className="py-4 max-w-2xl mx-auto">
                                {action.comments!.map(c => <CommentItem key={c.id} comment={c} />)}
                            </div>
                        )}
                    </div>

                    {/* Input de Comentário */}
                    <div className="p-4 bg-white border-t border-slate-200">
                        <div className="max-w-2xl mx-auto">
                            <div className="relative flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                                    {(user?.nome || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 relative">
                                    <textarea
                                        ref={commentInputRef}
                                        value={commentDraft}
                                        onChange={(e) => setCommentDraft(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm text-slate-600 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none transition-all"
                                        placeholder="Escreva um comentário..."
                                        rows={2}
                                        style={{ minHeight: '60px', maxHeight: '120px' }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddComment();
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!commentDraft.trim() || !user}
                                        className={`absolute right-3 bottom-3 p-2 rounded-lg transition-all ${commentDraft.trim()
                                            ? 'text-white bg-teal-500 hover:bg-teal-600 shadow-sm'
                                            : 'text-slate-300 bg-slate-100'
                                            }`}
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 text-center">
                                Pressione <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-medium">Enter</kbd> para enviar
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActionDetailModal;
