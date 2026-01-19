import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    X, Save, Trash2, Calendar, MessageCircle, Send,
    Users, Target, Clock, ChevronDown, Plus, Lock, Eye, Reply, CornerDownRight, Pencil, Check, Hash
} from 'lucide-react';
import { Action, Status, RaciRole, TeamMember, ActionComment, ActionTag } from '../../types';
import { LoadingButton } from '../../components/common/LoadingSpinner';
import { Tooltip } from '../../components/common/Tooltip';
import { useAuth } from '../../auth/AuthContext';
import { getAvatarUrl } from '../settings/UserSettingsModal';
import { formatRelativeTime } from './ActionTable';
import { renderCommentWithMentions } from '../../components/common/MentionInput';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { useResponsive } from '../../hooks/useResponsive';
import { getActionDisplayId } from '../../lib/text';
import { applyActionRules, canSaveAction, ActionRuleErrors } from '../../lib/actionRules';
import { loadTags, createTag, deleteTag } from '../../services/dataService';

// =====================================
// PROPS DO COMPONENTE
// =====================================
interface ActionDetailModalProps {
    isOpen: boolean;
    action: Action | null;
    team: TeamMember[];
    activityName?: string;
    onClose: () => void;
    onUpdateAction?: (uid: string, field: string, value: string | number) => void;
    onSaveAction?: (uid?: string) => void;
    onSaveFullAction?: (action: Action) => void; // New prop for draft mode save
    onDeleteAction: (uid: string) => void;
    onAddRaci?: (uid: string, memberId: string, role: RaciRole) => void;
    onRemoveRaci?: (uid: string, idx: number, memberName: string) => void;
    onAddComment?: (uid: string, content: string, parentId?: string | null) => void;
    onEditComment?: (actionUid: string, commentId: string, content: string) => void;
    onDeleteComment?: (actionUid: string, commentId: string) => void;
    onSaveAndNew?: (updatedAction: Action) => Promise<void>;
    isSaving?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    readOnly?: boolean;
}

const rolePriority: Record<RaciRole, number> = { R: 0, A: 1, I: 2 };

const roleLabels: Record<RaciRole, { label: string; color: string }> = {
    R: { label: 'Responsável', color: 'bg-purple-600' },
    A: { label: 'Aprovador', color: 'bg-blue-600' },
    I: { label: 'Informado', color: 'bg-amber-500' },
};

// =====================================
// COMPONENTE DE COMENTÁRIO
// =====================================
const getRoleLabel = (role?: string): { label: string; style: string } | null => {
    if (!role) return null;
    const normalizedRole = role.toLowerCase();
    if (normalizedRole === 'superadmin' || normalizedRole === 'admin') {
        return { label: 'Adm', style: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' };
    }
    if (normalizedRole === 'gestor') {
        return { label: 'Gestor', style: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' };
    }
    if (normalizedRole === 'usuario') {
        return { label: 'Usuário', style: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' };
    }
    return null;
};

const CommentItem: React.FC<{
    comment: ActionComment;
    onReply?: (commentId: string, authorName: string) => void;
    onEdit?: (commentId: string, content: string) => void;
    onDelete?: (commentId: string) => void;
    canEditComment?: boolean;
    depth?: number;
}> = ({ comment, onReply, onEdit, onDelete, canEditComment, depth = 0 }) => {
    const roleInfo = getRoleLabel(comment.authorRole);
    const isReply = depth > 0;
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);

    const handleSaveEdit = () => {
        if (editContent.trim() && onEdit) {
            onEdit(comment.id, editContent.trim());
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setEditContent(comment.content);
        setIsEditing(false);
    };

    return (
        <div className={`${depth === 0 ? 'py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0' : 'mt-3'}`}>
            {/* Reply indicator */}
            {isReply && (
                <div className="flex items-center gap-2 mb-2 ml-4">
                    <CornerDownRight size={14} className="text-teal-500" />
                    <span className="text-[10px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wide">
                        Resposta
                    </span>
                </div>
            )}
            <div className={`flex gap-3 ${isReply ? 'ml-6 pl-4 py-3 rounded-xl bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-800/50 dark:to-transparent border-l-3 border-l-teal-500' : ''}`}>
                <img
                    src={getAvatarUrl(comment.authorAvatarId || 'zg10')}
                    alt={comment.authorName}
                    className={`rounded-full bg-white dark:bg-slate-600 border-2 shrink-0 ${isReply
                        ? 'w-7 h-7 border-teal-400/50'
                        : 'w-9 h-9 border-slate-200 dark:border-slate-500'}`}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-slate-800 dark:text-slate-100 ${isReply ? 'text-xs' : 'text-sm'}`}>
                            {comment.authorName}
                        </span>
                        {roleInfo && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${roleInfo.style}`}>
                                {roleInfo.label}
                            </span>
                        )}
                        <span className="text-xs text-slate-400 dark:text-slate-500">{comment.authorMunicipio}</span>
                        <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(comment.createdAt)}</span>

                        {/* Action buttons */}
                        <div className="ml-auto flex items-center gap-1">
                            {onReply && !isEditing && (
                                <button
                                    onClick={() => onReply(comment.id, comment.authorName)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:text-teal-400 dark:hover:bg-teal-900/30 rounded-lg transition-all"
                                    title="Responder"
                                >
                                    <Reply size={12} />
                                    <span className="hidden sm:inline">Responder</span>
                                </button>
                            )}
                            {canEditComment && !isEditing && (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-all"
                                        title="Editar"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                    <button
                                        onClick={() => onDelete?.(comment.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-900/30 rounded transition-all"
                                        title="Excluir"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Comment content or edit mode */}
                    {isEditing ? (
                        <div className="mt-2">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full p-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                                rows={2}
                                autoFocus
                            />
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={!editContent.trim()}
                                    className="px-3 py-1 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    <Check size={12} />
                                    Salvar
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className={`text-slate-600 dark:text-slate-300 mt-1.5 whitespace-pre-wrap leading-relaxed ${isReply ? 'text-xs' : 'text-sm'}`}>
                            {renderCommentWithMentions(comment.content)}
                        </p>
                    )}
                </div>
            </div>
            {/* Render replies recursively */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-1">
                    {comment.replies.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            canEditComment={canEditComment}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// =====================================
// COMPONENTE PRINCIPAL
// =====================================
export const ActionDetailModal: React.FC<ActionDetailModalProps> = ({
    isOpen,
    action: initialAction,
    team,
    activityName = 'Atividade',
    onClose,
    onUpdateAction: _onUpdateAction,
    onSaveFullAction, // Nova prop para salvar o objeto completo
    isSaving = false,
    canEdit = true,
    onDeleteAction, // Adicionado de volta para uso no botão Excluir
    canDelete = true,
    readOnly = false,
    onSaveAndNew,
}) => {
    const { user, isAdmin, isSuperAdmin } = useAuth();
    const { isMobile } = useResponsive();

    // =================================================================================
    // DRAFT MODE STATE
    // Mante o estado localmente para permitir edição sem salvar e "dirty checking"
    // =================================================================================
    const [draftAction, setDraftAction] = useState<Action | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isSavingAndNew, setIsSavingAndNew] = useState(false);
    const [mobileSection, setMobileSection] = useState<'details' | 'raci' | 'comments'>('details');

    // Rule engine state
    const [ruleErrors, setRuleErrors] = useState<ActionRuleErrors>({});
    const [uiState, setUiState] = useState({
        progressDisabled: false,
        progressDisabledReason: '',
        isOverdue: false
    });

    // Reopen Confirmation State
    const [reopenConfig, setReopenConfig] = useState<{
        isOpen: boolean;
        pendingPatch: Partial<Action> | null;
    }>({ isOpen: false, pendingPatch: null });


    // Inicializa o draft quando a action muda ou o modal abre
    useEffect(() => {
        if (initialAction) {
            setDraftAction(JSON.parse(JSON.stringify(initialAction))); // Deep clone simples
            setIsDirty(false);
        } else {
            setDraftAction(null);
        }
    }, [initialAction, isOpen]);

    const [commentDraft, setCommentDraft] = useState('');
    const [selectedRaciMemberId, setSelectedRaciMemberId] = useState('');
    const [newRaciRole, setNewRaciRole] = useState<RaciRole>('R');
    const [showRaciPopover, setShowRaciPopover] = useState(false);

    // Tags state
    const [showTagPopover, setShowTagPopover] = useState(false);
    const [availableTags, setAvailableTags] = useState<ActionTag[]>([]);
    const [newTagName, setNewTagName] = useState('');
    const [isLoadingTags, setIsLoadingTags] = useState(false);
    const [tagToDelete, setTagToDelete] = useState<ActionTag | null>(null);
    const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());


    // Mention autocomplete states
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionIndex, setMentionIndex] = useState(0);
    const [cursorPos, setCursorPos] = useState(0);
    const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);

    // Confirmation Modal State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'warning' | 'danger' | 'info';
        confirmText: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        confirmText: 'Confirmar',
        onConfirm: () => { },
    });

    const modalRef = useRef<HTMLDivElement>(null);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);

    // Filter team members for mentions
    const filteredMentions = team.filter(m =>
        m.name.toLowerCase().includes(mentionSearch.toLowerCase())
    ).slice(0, 8);

    const userCanEdit = !readOnly && canEdit;
    const userCanDelete = !readOnly && canDelete;

    // Handler para responder comentário (thread)
    const handleReply = useCallback((commentId: string, authorName: string) => {
        setReplyingTo({ id: commentId, authorName });
        setCommentDraft(`@${authorName} `);
        commentInputRef.current?.focus();
    }, []);

    // =================================================================================
    // TAGS HANDLERS
    // =================================================================================

    // Carregar tags disponíveis quando o popover abrir
    useEffect(() => {
        if (showTagPopover) {
            setIsLoadingTags(true);
            loadTags()
                .then(tags => setAvailableTags(tags))
                .catch(() => setAvailableTags([]))
                .finally(() => setIsLoadingTags(false));

            // Inicializa seleção com tags já na ação
            if (draftAction?.tags) {
                setSelectedTagIds(new Set(draftAction.tags.map(t => t.id)));
            }
        } else {
            // Limpa seleção ao fechar
            setSelectedTagIds(new Set());
            setTagToDelete(null);
        }
    }, [showTagPopover, draftAction?.tags]);

    // Toggle tag - adiciona ou remove imediatamente da ação
    const toggleTagSelection = useCallback((tag: ActionTag) => {
        if (!draftAction) return;

        const hasTag = draftAction.tags.some(t => t.id === tag.id);

        if (hasTag) {
            // Remove
            setDraftAction(prev => {
                if (!prev) return null;
                return { ...prev, tags: prev.tags.filter(t => t.id !== tag.id) };
            });
        } else {
            // Adiciona
            setDraftAction(prev => {
                if (!prev) return null;
                return { ...prev, tags: [...prev.tags, tag] };
            });
        }
        setIsDirty(true);
    }, [draftAction]);



    // Criar nova tag e selecioná-la
    const handleCreateTag = useCallback(async () => {
        if (!newTagName.trim()) return;

        try {
            const newTag = await createTag(newTagName.trim());
            setNewTagName('');
            setAvailableTags(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
            // Já seleciona a tag criada
            setSelectedTagIds(prev => new Set([...prev, newTag.id]));
        } catch (error) {
            console.error('Erro ao criar tag:', error);
        }
    }, [newTagName]);



    // Solicitar confirmação para excluir tag
    const handleDeleteTag = useCallback((tag: ActionTag) => {
        setTagToDelete(tag);
    }, []);

    // Confirmar exclusão de tag
    const confirmDeleteTag = useCallback(async () => {
        if (!tagToDelete) return;

        try {
            await deleteTag(tagToDelete.id);
            setAvailableTags(prev => prev.filter(t => t.id !== tagToDelete.id));
            // Remove da ação atual também se estiver
            setDraftAction(prev => {
                if (!prev) return null;
                const hadTag = prev.tags.some(t => t.id === tagToDelete.id);
                if (hadTag) {
                    return { ...prev, tags: prev.tags.filter(t => t.id !== tagToDelete.id) };
                }
                return prev;
            });
        } catch (error) {
            console.error('Erro ao excluir tag:', error);
        } finally {
            setTagToDelete(null);
        }
    }, [tagToDelete]);

    // =================================================================================
    // LOCAL HANDLERS (ATUALIZAM O DRAFT)
    // =================================================================================

    // Atualizar campos usando o motor de regras centralizado (applyActionRules)
    const updateDraftField = useCallback((field: keyof Action, value: Action[keyof Action]) => {
        setDraftAction(prev => {
            if (!prev) return null;

            // Aplica as regras centralizadas
            const { next, errors, ui } = applyActionRules(prev, { [field]: value });

            // Side-effects assíncronos (State updates)
            setRuleErrors(errors);
            setUiState(ui);

            return next;
        });
        setIsDirty(true);
    }, []);


    // Wrapper inteligente para interceptar "Reabertura"
    const handleFieldChange = useCallback((field: keyof Action, value: any) => {
        if (!draftAction) return;

        // Se a ação já tem data fim (está concluída) e tentamos mudar algo que a reabriria
        const isConcluded = !!draftAction.endDate;

        let impliesReopen = false;
        if (isConcluded) {
            if (field === 'progress' && value < 100) impliesReopen = true;
            if (field === 'status' && value !== 'Concluído') impliesReopen = true;
            if (field === 'endDate' && !value) impliesReopen = true; // Apagar data fim
        }

        if (impliesReopen) {
            setReopenConfig({
                isOpen: true,
                pendingPatch: { [field]: value }
            });
            return;
        }

        updateDraftField(field, value);
    }, [draftAction, updateDraftField]);

    const confirmReopen = () => {
        if (!reopenConfig.pendingPatch) return;

        // Aplica o patch pendente E força reabertura (limpa data, status em andamento)
        // Nota: Se o patch for justamente limpar data, ok.
        // Se for mudar status, ok.

        setDraftAction(prev => {
            if (!prev) return null;
            const patch = reopenConfig.pendingPatch!;

            // Base da reabertura
            const reopenPatch: Partial<Action> = {
                endDate: '', // Limpa data fim
                status: 'Em Andamento', // Volta status
                ...patch // Aplica a mudança desejada (ex: progresso 90)
            };

            const { next, errors, ui } = applyActionRules(prev, reopenPatch);
            setRuleErrors(errors);
            setUiState(ui);
            return next;
        });

        setReopenConfig({ isOpen: false, pendingPatch: null });
        setIsDirty(true);
    };

    const cancelReopen = () => {
        setReopenConfig({ isOpen: false, pendingPatch: null });
        // Se for slider, ele vai visualmente voltar pro lugar porque o state não mudou
    };

    // Atualiza regras ao carregar
    useEffect(() => {
        if (draftAction) {
            const { errors, ui } = applyActionRules(draftAction, {});
            setRuleErrors(errors);
            setUiState(ui);
        }
    }, [draftAction]); // Rodar a validação inicial quando mudar de ação

    // Helper para atalhos de data
    const setDateShortcut = useCallback((field: 'startDate' | 'plannedEndDate' | 'endDate', daysToAdd: number = 0) => {
        const date = new Date();
        date.setDate(date.getDate() + daysToAdd);

        // Formata para YYYY-MM-DD
        const isoDate = date.toISOString().split('T')[0];
        updateDraftField(field, isoDate);
    }, [updateDraftField]);

    // Adicionar comentário (Local)
    const handleAddComment = useCallback(() => {
        if (!commentDraft.trim() || !user || !draftAction) return;

        const newComment: ActionComment = {
            id: `temp-${Date.now()}`,
            parentId: replyingTo?.id || null,
            authorId: user.id,
            authorName: user.nome,
            authorMunicipio: user.municipio || '',
            authorAvatarId: user.avatarId || 'zg10',
            authorRole: user.role,
            content: commentDraft.trim(), // Remove espaços extras
            createdAt: new Date().toISOString()
        };

        setDraftAction(prev => {
            if (!prev) return null;
            return {
                ...prev,
                comments: [...(prev.comments || []), newComment]
            };
        });

        setIsDirty(true);
        setCommentDraft('');
        setShowMentions(false);
        setReplyingTo(null);
    }, [commentDraft, user, draftAction, replyingTo]);

    // Raci Add (Local)
    const handleAddRaci = useCallback(() => {
        if (!selectedRaciMemberId || !draftAction) return;
        const member = team.find(t => t.id === selectedRaciMemberId);
        if (!member) return;

        setDraftAction(prev => {
            if (!prev) return null;
            const newRaci = [...prev.raci, { name: member.name, role: newRaciRole }];
            const nextAction = { ...prev, raci: newRaci };

            // Re-validate immediately
            const { errors, ui } = applyActionRules(nextAction, {});
            setRuleErrors(errors);
            setUiState(ui);

            return nextAction;
        });
        setIsDirty(true);
        setSelectedRaciMemberId('');
        setNewRaciRole('R');
        setShowRaciPopover(false);
    }, [selectedRaciMemberId, draftAction, newRaciRole, team]);

    // Raci Remove (Local)
    const handleRemoveRaci = useCallback((index: number) => {
        setDraftAction(prev => {
            if (!prev) return null;
            const newRaci = [...prev.raci];
            newRaci.splice(index, 1);
            const nextAction = { ...prev, raci: newRaci };

            // Re-validate immediately
            const { errors, ui } = applyActionRules(nextAction, {});
            setRuleErrors(errors);
            setUiState(ui);

            return nextAction;
        });
        setIsDirty(true);
    }, []);

    // Handlers Locais para Comentários (Edit/Delete)
    const handleEditComment = useCallback((commentId: string, content: string) => {
        setDraftAction(prev => {
            if (!prev) return null;
            const newComments = prev.comments?.map(c =>
                c.id === commentId ? { ...c, content } : c
            ) || [];
            return { ...prev, comments: newComments };
        });
        setIsDirty(true);
    }, []);

    const handleDeleteComment = useCallback((commentId: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Excluir Comentário',
            message: 'Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.',
            type: 'danger',
            confirmText: 'Excluir',
            onConfirm: () => {
                setDraftAction(prev => {
                    if (!prev) return null;
                    const newComments = prev.comments?.filter(c => c.id !== commentId) || [];
                    return { ...prev, comments: newComments };
                });
                setIsDirty(true);
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    }, []);

    // Salvar TUDO
    const handleSaveDirty = useCallback(() => {
        if (!draftAction) return;

        // Auto-fill Data Fim se Concluído/100% e vazio
        const needsEndDate = (draftAction.status === 'Concluído' || draftAction.progress === 100) && !draftAction.endDate;
        const actionToSave = needsEndDate ? {
            ...draftAction,
            endDate: new Date().toLocaleDateString('sv').split('T')[0], // YYYY-MM-DD Local
            status: 'Concluído' as Status, // Garante consistência
            progress: 100
        } : draftAction;

        if (onSaveFullAction) {
            onSaveFullAction(actionToSave);
        }
        setIsDirty(false);
    }, [draftAction, onSaveFullAction]);

    const handleSaveAndNewDirty = useCallback(async () => {
        if (!draftAction || !onSaveAndNew) return;
        setIsSavingAndNew(true);
        try {
            await onSaveAndNew(draftAction);
            setIsDirty(false); // Reset dirty state after successful save
        } finally {
            setIsSavingAndNew(false);
        }
    }, [draftAction, onSaveAndNew]);

    // Fechar com verificação
    const handleCloseDirty = useCallback(() => {
        if (isDirty) {
            setConfirmConfig({
                isOpen: true,
                title: 'Alterações não salvas',
                message: 'Existem alterações no rascunho que não foram salvas. Deseja sair e perder essas alterações?',
                type: 'warning',
                confirmText: 'Sair sem salvar',
                onConfirm: () => {
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                    onClose();
                }
            });
        } else {
            onClose();
        }
    }, [isDirty, onClose]);

    // Intercepta ESC e Salvar
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleCloseDirty();
            }
            if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (userCanEdit) handleSaveDirty();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleCloseDirty, handleSaveDirty, userCanEdit]);

    // Handle comment input change with mention detection
    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursor = e.target.selectionStart || 0;
        setCommentDraft(value);
        setCursorPos(cursor);

        // Detect @ mention
        const textBefore = value.slice(0, cursor);
        const atIndex = textBefore.lastIndexOf('@');

        if (atIndex !== -1) {
            const afterAt = textBefore.slice(atIndex + 1);
            if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
                setMentionSearch(afterAt);
                setShowMentions(true);
                setMentionIndex(0);
                return;
            }
        }
        setShowMentions(false);
    };

    // Select mention from dropdown
    const selectMention = (member: TeamMember) => {
        const textBefore = commentDraft.slice(0, cursorPos);
        const textAfter = commentDraft.slice(cursorPos);
        const atIndex = textBefore.lastIndexOf('@');

        if (atIndex !== -1) {
            const newValue = textBefore.slice(0, atIndex) + `@${member.name} ` + textAfter;
            setCommentDraft(newValue);
            setShowMentions(false);

            setTimeout(() => {
                if (commentInputRef.current) {
                    const newPos = atIndex + member.name.length + 2;
                    commentInputRef.current.setSelectionRange(newPos, newPos);
                    commentInputRef.current.focus();
                }
            }, 0);
        }
    };

    // Handle keyboard in comment input for mentions
    const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showMentions && filteredMentions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex(prev => (prev + 1) % filteredMentions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex(prev => (prev - 1 + filteredMentions.length) % filteredMentions.length);
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                selectMention(filteredMentions[mentionIndex]);
            } else if (e.key === 'Escape') {
                setShowMentions(false);
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAddComment();
        }
    };

    // Alias for JSX compatibility (Logic Source of Truth)
    const action = draftAction;
    if (!isOpen || !action) return null;



    // Build comment tree for threaded display
    const buildCommentTree = (comments: ActionComment[]): ActionComment[] => {
        const commentMap = new Map<string, ActionComment>();
        const rootComments: ActionComment[] = [];

        // First pass: create a map of all comments with empty replies
        comments.forEach(c => {
            commentMap.set(c.id, { ...c, replies: [] });
        });

        // Second pass: build the tree
        comments.forEach(c => {
            const comment = commentMap.get(c.id);
            if (!comment) return;
            if (c.parentId && commentMap.has(c.parentId)) {
                // This is a reply - add to parent's replies
                const parent = commentMap.get(c.parentId);
                if (parent) {
                    parent.replies = [...(parent.replies || []), comment];
                }
            } else {
                // This is a root comment
                rootComments.push(comment);
            }
        });

        return rootComments;
    };

    const threadedComments = action ? buildCommentTree(action.comments || []) : [];

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
                onClick={handleCloseDirty}
                aria-hidden="true"
            />

            {/* Drawer - Fullscreen on mobile, side drawer on desktop */}
            <div
                ref={modalRef}
                className={`relative h-full bg-slate-50 dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden
                    ${isMobile
                        ? 'w-full animate-slide-in-up safe-area-bottom'
                        : 'w-full max-w-2xl animate-slide-in-right'
                    }`}
            >
                <ConfirmModal
                    isOpen={reopenConfig.isOpen}
                    title="Reabrir Ação?"
                    message="Esta ação está concluída com Data Fim preenchida. Para fazer essa alteração, a ação será reaberta e a Data Fim removida."
                    confirmText="Reabrir e Alterar"
                    cancelText="Manter Concluída"
                    onConfirm={confirmReopen}
                    onCancel={cancelReopen}
                    type="warning"
                />

                {/* =========================================
                   HEADER (TÍTULO E ID)
                ========================================= */}
                <header className="px-4 py-3 md:px-6 md:py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:justify-between md:items-start gap-3 shrink-0 z-20">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        {/* Breadcrumb */}
                        <div className="flex items-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            <span>{activityName}</span>
                            <span className="mx-2 text-slate-300">/</span>
                            <span className="text-teal-600">{getActionDisplayId(action.id)}</span>
                        </div>
                        {/* Título Editável */}
                        <div className="flex items-center gap-2">
                            {userCanEdit ? (
                                <>
                                    <input
                                        type="text"
                                        id="action-detail-title"
                                        value={action.title}
                                        onChange={(e) => updateDraftField('title', e.target.value)}
                                        className={`text-xl md:text-2xl font-bold leading-tight w-full bg-transparent border-b-2 outline-none transition-colors py-1 ${action.title === 'Nova Ação'
                                            ? 'border-amber-400 text-amber-600 dark:text-amber-400'
                                            : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-teal-500 text-slate-900 dark:text-slate-100'
                                            }`}
                                        placeholder="Digite o nome da ação..."
                                    />
                                    {action.title === 'Nova Ação' && (
                                        <span className="text-xs text-amber-500 whitespace-nowrap">← altere</span>
                                    )}
                                </>
                            ) : (
                                <h1 id="action-detail-title" className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight truncate flex items-center gap-2">
                                    {action.title}
                                    <Lock size={16} className="text-slate-400" />
                                </h1>
                            )}
                        </div>
                    </div>

                    {/* Botão Fechar (apenas X no canto) */}
                    <button
                        onClick={handleCloseDirty}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors self-start"
                        aria-label="Fechar"
                    >
                        <X size={20} />
                    </button>
                </header>

                {/* Mobile Section Tabs */}
                {isMobile && (
                    <div className="flex bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
                        <button
                            onClick={() => setMobileSection('details')}
                            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${mobileSection === 'details'
                                ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500'
                                : 'text-slate-500 dark:text-slate-400'
                                }`}
                        >
                            <Target size={14} />
                            Detalhes
                        </button>
                        <button
                            onClick={() => setMobileSection('raci')}
                            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${mobileSection === 'raci'
                                ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500'
                                : 'text-slate-500 dark:text-slate-400'
                                }`}
                        >
                            <Users size={14} />
                            Equipe
                            {action.raci?.length > 0 && (
                                <span className="ml-1 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-[10px] px-1.5 rounded-full">
                                    {action.raci.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setMobileSection('comments')}
                            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${mobileSection === 'comments'
                                ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500'
                                : 'text-slate-500 dark:text-slate-400'
                                }`}
                        >
                            <MessageCircle size={14} />
                            Comentários
                            {action.comments?.length > 0 && (
                                <span className="ml-1 bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400 text-[10px] px-1.5 rounded-full">
                                    {action.comments.length}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* =========================================
            2. META-BAR DE CONTROLE - Layout Vertical Organizado
        ========================================= */}
                <div className={`px-4 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 shadow-sm z-10 space-y-4 ${isMobile && mobileSection !== 'details' ? 'hidden' : ''}`}>
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
                                    onChange={(e) => handleFieldChange('status', e.target.value)}
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
                                <span className={`text-sm font-bold ${action.progress === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                    {action.progress}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={action.progress}
                                onChange={(e) => handleFieldChange('progress', parseInt(e.target.value))}
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

                    {/* Linha 2: Datas */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                    <Calendar size={10} className="inline mr-1" /> Início
                                </span>
                                {userCanEdit && (
                                    <button
                                        onClick={() => setDateShortcut('startDate', 0)}
                                        className="text-[9px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300 transition-colors"
                                        title="Definir para Hoje"
                                    >
                                        Hoje
                                    </button>
                                )}
                            </div>
                            <input
                                type="date"
                                value={action.startDate}
                                onChange={(e) => updateDraftField('startDate', e.target.value)}
                                disabled={!userCanEdit}
                                className={`text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700 px-2.5 py-1.5 rounded-lg border disabled:opacity-60 w-full ${ruleErrors.startAfterPlanned || ruleErrors.endBeforeStart ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-600'}`}
                            />
                            {ruleErrors.startAfterPlanned && <span className="text-[9px] text-rose-500 leading-tight">Checar Data</span>}
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
                                onChange={(e) => updateDraftField('plannedEndDate', e.target.value)}
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
                                onChange={(e) => handleFieldChange('endDate', e.target.value)}
                                disabled={!userCanEdit}
                                className={`text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30 px-2.5 py-1.5 rounded-lg border disabled:opacity-60 w-full ${ruleErrors.endBeforeStart ? 'border-rose-400 focus:ring-rose-500' : 'border-orange-200 dark:border-orange-700'}`}
                            />
                            {ruleErrors.endBeforeStart && <span className="text-[9px] text-rose-500 leading-tight">{ruleErrors.endBeforeStart}</span>}
                        </div>
                    </div>

                    {/* Linha 3: Equipe (compacta) */}
                    <div className="relative pt-2 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                                    <Users size={10} /> Equipe
                                </span>
                                <div className="flex items-center">
                                    {[...action.raci].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]).slice(0, 5).map((m, i) => (
                                        <Tooltip key={i} content={`${m.name} (${roleLabels[m.role].label})`}>
                                            <div className="relative -ml-1.5 first:ml-0">
                                                <div className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold shadow-sm ${roleLabels[m.role].color}`}>
                                                    {m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white text-[5px] font-bold flex items-center justify-center ${roleLabels[m.role].color} text-white`}>
                                                    {m.role}
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

                            {/* Seção de Tags */}
                            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                                    <Hash size={10} /> Áreas Envolvidas
                                </span>
                                <div className="flex items-center gap-1 flex-wrap">
                                    {action.tags?.map(tag => (
                                        <div
                                            key={tag.id}
                                            className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                            style={{ backgroundColor: tag.color }}
                                        >
                                            <Check size={8} className="mr-0.5 text-green-300" />
                                            #{tag.name}
                                        </div>
                                    ))}
                                    {userCanEdit && (
                                        <Tooltip content="Adicionar área">
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

                        {/* Popover para adicionar tag */}
                        {showTagPopover && userCanEdit && (
                            <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3 z-40 animate-fade-in">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Gerenciar Áreas Envolvidas</h4>
                                    <button onClick={() => setShowTagPopover(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                        <X size={14} />
                                    </button>
                                </div>

                                {/* Criar nova tag */}
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={newTagName}
                                        onChange={e => setNewTagName(e.target.value.toUpperCase())}
                                        placeholder="Nova área..."
                                        className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                                        onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
                                    />
                                    <button
                                        onClick={handleCreateTag}
                                        disabled={!newTagName.trim()}
                                        className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 disabled:opacity-50"
                                    >
                                        Criar
                                    </button>
                                </div>

                                {/* Tags disponíveis - clique para adicionar/remover */}
                                <div className="max-h-40 overflow-y-auto">
                                    {isLoadingTags ? (
                                        <p className="text-xs text-slate-400 text-center py-2">Carregando...</p>
                                    ) : availableTags.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-2">Nenhuma área salva</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {availableTags.map(tag => {
                                                const isOnAction = action.tags?.some(at => at.id === tag.id);
                                                return (
                                                    <div key={tag.id} className="flex items-center">
                                                        {/* Tag principal - clique para adicionar/remover */}
                                                        <button
                                                            onClick={() => toggleTagSelection(tag)}
                                                            className={`relative px-2 py-0.5 rounded-l-full text-[10px] font-bold text-white transition-all hover:brightness-110`}
                                                            style={{ backgroundColor: tag.color }}
                                                        >
                                                            {isOnAction && (
                                                                <Check size={8} className="inline mr-0.5 -mt-0.5 text-green-300" />
                                                            )}
                                                            #{tag.name}
                                                        </button>
                                                        {/* Botão X com cor mais clara */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag); }}
                                                            className="px-1 py-0.5 rounded-r-full text-[10px] hover:bg-red-500 transition-colors"
                                                            style={{
                                                                backgroundColor: `color-mix(in srgb, ${tag.color} 60%, white)`,
                                                                color: tag.color
                                                            }}
                                                            title="Excluir área"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Mini modal de confirmação de exclusão */}
                                {tagToDelete && (
                                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                                        <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                                            Excluir área <strong>#{tagToDelete.name}</strong>?
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setTagToDelete(null)}
                                                className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-300"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={confirmDeleteTag}
                                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 font-bold"
                                            >
                                                Excluir
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Popover para adicionar membro */}
                        {showRaciPopover && userCanEdit && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 z-30 animate-fade-in">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Adicionar Membro à Equipe</h4>
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
                                            className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                                        >
                                            <option value="">Escolha um membro...</option>
                                            {team
                                                .filter(t => !action.raci.some(r => r.name === t.name))
                                                .map(t => (
                                                    <option key={t.id} value={t.id} className={t.isRegistered === false ? 'text-slate-400 italic' : ''}>
                                                        {t.name} {t.isRegistered === false ? '(Cadastro Pendente)' : ''} - {t.role}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                        {team.length === 0 && (
                                            <p className="text-xs text-amber-600 mt-1">Nenhum membro cadastrado na equipe. Adicione membros pela aba &quot;Equipe&quot;.</p>
                                        )}
                                    </div>

                                    {/* Seleção de papel RACI */}
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Papel (RACI)</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['R', 'A', 'I'] as RaciRole[]).map(role => (
                                                <button
                                                    key={role}
                                                    onClick={() => setNewRaciRole(role)}
                                                    className={`p-2 rounded-lg text-center text-xs font-bold transition-all border-2
                                                        ${newRaciRole === role
                                                            ? `${roleLabels[role].color} text-white border-transparent scale-105`
                                                            : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}
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
                                                handleAddRaci();
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

                {/* Confirmation Modal */}
                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    confirmType={confirmConfig.type}
                    confirmText={confirmConfig.confirmText}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                />

                {/* =========================================
            MOBILE RACI SECTION (Full screen when active)
        ========================================= */}
                {isMobile && mobileSection === 'raci' && (
                    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-800">
                        {/* RACI Header */}
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <Users size={16} className="text-teal-600" />
                                Equipe RACI
                            </span>
                            {ruleErrors.missingResponsible && (
                                <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full animate-pulse">
                                    Requer Responsável
                                </span>
                            )}
                            <span className="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-400 text-xs px-2.5 py-1 rounded-full font-bold">
                                {action.raci?.length || 0}
                            </span>
                        </div>

                        {/* RACI List */}
                        <div className="flex-1 px-4 py-3 overflow-y-auto space-y-2">
                            {action.raci?.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center h-full py-12">
                                    <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full mb-3">
                                        <Users className="text-slate-300" size={32} />
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum membro atribuído</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Adicione membros à equipe desta ação</p>
                                </div>
                            ) : (
                                [...action.raci].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]).map((m, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${roleLabels[m.role].color}`}>
                                            {m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{m.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabels[m.role].label}</p>
                                        </div>
                                        <div className={`px-2 py-1 rounded-md text-xs font-bold text-white ${roleLabels[m.role].color}`}>
                                            {m.role}
                                        </div>
                                        {userCanEdit && (
                                            <button
                                                onClick={() => handleRemoveRaci(i)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add RACI Member - Mobile */}
                        {userCanEdit && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600 space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={selectedRaciMemberId}
                                        onChange={(e) => setSelectedRaciMemberId(e.target.value)}
                                        className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                                    >
                                        <option value="">Selecionar pessoa...</option>
                                        {team
                                            .filter(t => !action.raci.some(r => r.name === t.name))
                                            .map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name}
                                                </option>
                                            ))
                                        }
                                    </select>
                                    <select
                                        value={newRaciRole}
                                        onChange={(e) => setNewRaciRole(e.target.value as RaciRole)}
                                        className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                                    >
                                        <option value="R">R - Responsável</option>
                                        <option value="A">A - Aprovador</option>
                                        <option value="I">I - Informado</option>
                                    </select>
                                </div>
                                <button
                                    onClick={handleAddRaci}
                                    disabled={!selectedRaciMemberId}
                                    className="w-full py-2.5 bg-teal-600 text-white rounded-lg font-bold text-sm hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} />
                                    Adicionar Membro
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* =========================================
            3. CORPO PRINCIPAL - COMENTÁRIOS
        ========================================= */}
                <div className={`flex-1 flex flex-col overflow-hidden relative bg-white dark:bg-slate-800 ${isMobile && mobileSection !== 'comments' ? 'hidden' : ''}`}>
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
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex justify-between items-center">
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
                        {threadedComments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center h-full py-12">
                                <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full mb-3">
                                    <MessageCircle className="text-slate-300" size={32} />
                                </div>
                                <p className="text-slate-500 text-base font-medium">Nenhum comentário ainda</p>
                                <p className="text-slate-400 text-sm mt-1">Seja o primeiro a comentar!</p>
                            </div>
                        ) : (
                            <div className="py-4 max-w-2xl mx-auto">
                                {threadedComments.map(c => {
                                    const isAuthor = user?.id === c.authorId;
                                    const createdAt = new Date(c.createdAt);
                                    const now = new Date();
                                    const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
                                    const withinTimeLimit = diffHours <= 2;

                                    return (
                                        <CommentItem
                                            key={c.id}
                                            comment={c}
                                            onReply={handleReply}
                                            onEdit={handleEditComment}
                                            onDelete={handleDeleteComment}
                                            canEditComment={isAdmin || isSuperAdmin || (isAuthor && withinTimeLimit)}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Input de Comentário */}
                    <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                        <div className="max-w-2xl mx-auto">
                            {/* Indicator when replying */}
                            {replyingTo && (
                                <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                                    <Reply size={14} className="text-blue-500" />
                                    <span className="text-xs text-blue-700 dark:text-blue-300">
                                        Respondendo a <strong>{replyingTo.authorName}</strong>
                                    </span>
                                    <button
                                        onClick={() => { setReplyingTo(null); setCommentDraft(''); }}
                                        className="ml-auto text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                            <div className="relative flex items-start gap-3">
                                <img
                                    src={getAvatarUrl(user?.avatarId || 'zg10')}
                                    alt={user?.nome || 'Usuário'}
                                    className="w-10 h-10 rounded-full bg-white dark:bg-slate-600 border-2 border-teal-400 shrink-0 shadow-sm"
                                />
                                <div className="flex-1 relative">
                                    {/* Mentions Dropdown */}
                                    {showMentions && filteredMentions.length > 0 && (
                                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50">
                                            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-700">
                                                Mencionar (@)
                                            </div>
                                            {filteredMentions.map((member, index) => (
                                                <button
                                                    key={member.id}
                                                    onClick={() => selectMention(member)}
                                                    className={`w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${index === mentionIndex ? 'bg-slate-50 dark:bg-slate-700' : ''}`}
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-200">
                                                        {member.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                                                            {member.name}
                                                        </div>
                                                        <div className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                                            {member.municipio || 'Sem município'}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <textarea
                                        ref={commentInputRef}
                                        value={commentDraft}
                                        onChange={handleCommentChange}
                                        onKeyDown={handleCommentKeyDown}
                                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl py-3 pl-4 pr-12 text-sm text-slate-600 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none transition-all"
                                        placeholder="Escreva um comentário... Use @ para mencionar"
                                        rows={2}
                                        style={{ minHeight: '60px', maxHeight: '120px' }}
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!commentDraft.trim() || !user}
                                        className={`absolute right-3 bottom-3 p-2 rounded-lg transition-all ${commentDraft.trim()
                                            ? 'text-white bg-teal-500 hover:bg-teal-600 shadow-sm'
                                            : 'text-slate-300 dark:text-slate-500 bg-slate-100 dark:bg-slate-600'
                                            }`}
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* =========================================
                   FOOTER FIXO - Ações Principais
                ========================================= */}
                {userCanEdit && (
                    <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
                        <div className="flex items-center justify-between">
                            {/* Lado Esquerdo: Excluir (discreto) */}
                            <div>
                                {userCanDelete && (
                                    <button
                                        onClick={() => onDeleteAction(action.uid)}
                                        className="text-sm text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                        <span>Excluir</span>
                                    </button>
                                )}
                            </div>

                            {/* Lado Direito: Cancelar + Ações */}
                            <div className="flex items-center gap-2.5">
                                <button
                                    onClick={handleCloseDirty}
                                    className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>

                                {onSaveAndNew && (
                                    <LoadingButton
                                        onClick={() => handleSaveAndNewDirty()}
                                        isLoading={isSavingAndNew}
                                        disabled={isSaving || !canSaveAction(draftAction, ruleErrors)}
                                        loadingText="Salvando..."
                                        className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all flex items-center gap-2 ${!canSaveAction(draftAction, ruleErrors)
                                            ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-70'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        <Plus size={16} />
                                        <span className="hidden sm:inline">Salvar e Nova</span>
                                        <span className="sm:hidden">S. e Nova</span>
                                    </LoadingButton>
                                )}

                                {/* Botão SALVAR */}
                                <div className="flex flex-col items-end">
                                    <LoadingButton
                                        onClick={() => handleSaveDirty()}
                                        isLoading={isSaving}
                                        disabled={!canSaveAction(draftAction, ruleErrors)}
                                        loadingText="Salvando..."
                                        className={`px-6 py-2 text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 ${!canSaveAction(draftAction, ruleErrors)
                                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                            : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-200/50 dark:shadow-none'
                                            }`}
                                    >
                                        <Save size={16} />
                                        Salvar
                                    </LoadingButton>
                                    {ruleErrors.missingResponsible && (
                                        <span className="text-[9px] text-rose-500 font-medium mt-1 mr-1">
                                            Quem é responsável?
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActionDetailModal;
