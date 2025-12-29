import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    X, Save, Trash2, Calendar, MessageCircle, Send,
    Users, Target, Clock, ChevronDown, Plus, Lock, Eye, Reply, CornerDownRight, Pencil, Check
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
import { renderCommentWithMentions, extractMentions } from '../../components/common/MentionInput';

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
    onUpdateAction,
    onSaveFullAction, // Nova prop para salvar o objeto completo
    isSaving = false,
    canEdit = true,
    onDeleteAction, // Adicionado de volta para uso no botão Excluir
    canDelete = true,
    readOnly = false,
}) => {
    const { user, isAdmin, isSuperAdmin } = useAuth();

    // =================================================================================
    // DRAFT MODE STATE
    // Mante o estado localmente para permitir edição sem salvar e "dirty checking"
    // =================================================================================
    const [draftAction, setDraftAction] = useState<Action | null>(null);
    const [isDirty, setIsDirty] = useState(false);

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

    // Mention autocomplete states
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionIndex, setMentionIndex] = useState(0);
    const [cursorPos, setCursorPos] = useState(0);
    const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);

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
    // LOCAL HANDLERS (ATUALIZAM O DRAFT)
    // =================================================================================

    // Atualizar campos simples
    const updateDraftField = useCallback((field: keyof Action, value: any) => {
        setDraftAction(prev => {
            if (!prev) return null;
            return { ...prev, [field]: value };
        });
        setIsDirty(true);
    }, []);

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
            return { ...prev, raci: newRaci };
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
            return { ...prev, raci: newRaci };
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
        if (window.confirm('Tem certeza que deseja excluir este comentário?')) {
            setDraftAction(prev => {
                if (!prev) return null;
                const newComments = prev.comments?.filter(c => c.id !== commentId) || [];
                return { ...prev, comments: newComments };
            });
            setIsDirty(true);
        }
    }, []);

    // Salvar TUDO
    const handleSaveDirty = useCallback(() => {
        if (draftAction && onSaveFullAction) {
            onSaveFullAction(draftAction);
            setIsDirty(false);
        }
    }, [draftAction, onSaveFullAction]);

    // Fechar com verificação
    const handleCloseDirty = useCallback(() => {
        if (isDirty) {
            if (window.confirm("Existem alterações não salvas. Deseja sair e perder o rascunho?")) {
                onClose();
            }
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
            const comment = commentMap.get(c.id)!;
            if (c.parentId && commentMap.has(c.parentId)) {
                // This is a reply - add to parent's replies
                const parent = commentMap.get(c.parentId)!;
                parent.replies = [...(parent.replies || []), comment];
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

            {/* Drawer */}
            <div
                ref={modalRef}
                className="relative w-full max-w-2xl h-full bg-slate-50 dark:bg-slate-900 shadow-2xl flex flex-col animate-slide-in-right overflow-hidden"
            >
                {/* =========================================
            1. HEADER COMPACTO
        ========================================= */}
                <header className="px-4 py-3 md:px-6 md:py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:justify-between md:items-start gap-3 shrink-0 z-20">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        {/* Breadcrumb */}
                        <div className="flex items-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            <span>{activityName}</span>
                            <span className="mx-2 text-slate-300">/</span>
                            <span className="text-teal-600">{action.id}</span>
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

                {/* =========================================
            2. META-BAR DE CONTROLE - Layout Vertical Organizado
        ========================================= */}
                <div className="px-4 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 shadow-sm z-10 space-y-4">
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
                                    onChange={(e) => updateDraftField('status', e.target.value)}
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
                                onChange={(e) => updateDraftField('progress', parseInt(e.target.value))}
                                disabled={!userCanEdit}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-teal-600 disabled:opacity-60"
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
                                onChange={(e) => updateDraftField('startDate', e.target.value)}
                                disabled={!userCanEdit}
                                className="text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-60 w-full"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Fim Planejado</span>
                            <input
                                type="date"
                                value={action.plannedEndDate || ''}
                                onChange={(e) => updateDraftField('plannedEndDate', e.target.value)}
                                disabled={!userCanEdit}
                                className="text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 disabled:opacity-60 w-full"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider">Fim Real</span>
                            <input
                                type="date"
                                value={action.endDate}
                                onChange={(e) => {
                                    const newDate = e.target.value;
                                    updateDraftField('endDate', newDate);
                                    if (newDate) {
                                        updateDraftField('status', 'Concluído');
                                        updateDraftField('progress', 100);
                                    }
                                }}
                                disabled={!userCanEdit}
                                className="text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30 px-2.5 py-1.5 rounded-lg border border-orange-200 dark:border-orange-700 disabled:opacity-60 w-full"
                            />
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
                                        <Tooltip key={i} content={`${m.name} (${roleLabels[m.role].label}) - Clique para remover`}>
                                            <button
                                                onClick={() => userCanEdit && handleRemoveRaci(i)}
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
                        </div>

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

                {/* =========================================
            3. CORPO PRINCIPAL - COMENTÁRIOS
        ========================================= */}
                <div className="flex-1 flex flex-col overflow-hidden relative bg-white dark:bg-slate-800">
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
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
                                Pressione <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400 font-medium">Enter</kbd> para enviar • Use <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400 font-medium">@</kbd> para mencionar
                            </p>
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

                            {/* Lado Direito: Cancelar + Salvar */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleCloseDirty}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <LoadingButton
                                    onClick={() => handleSaveDirty()}
                                    isLoading={isSaving}
                                    disabled={action.title === 'Nova Ação' || action.title.trim() === ''}
                                    loadingText="Salvando..."
                                    className={`px-6 py-2 text-sm font-medium rounded-lg shadow-sm transition-all flex items-center gap-2 ${action.title === 'Nova Ação' || action.title.trim() === ''
                                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                                        }`}
                                >
                                    <Save size={16} />
                                    Salvar
                                </LoadingButton>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActionDetailModal;
