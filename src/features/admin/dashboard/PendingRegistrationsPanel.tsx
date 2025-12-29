import { useState } from 'react';
import { UserPlus, Mail, MapPin, AlertTriangle, Building2, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import { PendingRegistration } from '../../../services/dataService';
import { getMicroregiaoById } from '../../../data/microregioes';

interface PendingRegistrationsPanelProps {
    pendingRegistrations: PendingRegistration[];
    onCreateUser?: (pending: PendingRegistration) => void;
    onDelete?: (pending: PendingRegistration) => void;
    isLoading?: boolean;
}

export function PendingRegistrationsPanel({
    pendingRegistrations,
    onCreateUser,
    onDelete,
    isLoading = false
}: PendingRegistrationsPanelProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; pending?: PendingRegistration }>({ open: false });
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    if (pendingRegistrations.length === 0 && !isLoading) {
        return null;
    }

    const getInitials = (name: string) => {
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length === 0) return '??';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const canDelete = confirmText.toLowerCase() === 'excluir';

    const handleDeleteConfirm = async () => {
        if (!deleteModal.pending || !onDelete || !canDelete) return;
        setIsDeleting(true);
        try {
            await onDelete(deleteModal.pending);
        } finally {
            setIsDeleting(false);
            setDeleteModal({ open: false });
            setConfirmText('');
        }
    };

    const handleCloseModal = () => {
        setDeleteModal({ open: false });
        setConfirmText('');
    };

    return (
        <>
            {/* Delete Modal */}
            {deleteModal.open && deleteModal.pending && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 pb-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl shrink-0">
                                    <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                        Excluir membro pendente?
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        Esta ação não pode ser desfeita.
                                    </p>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* User Info Card */}
                        <div className="mx-6 mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                                    {getInitials(deleteModal.pending.name)}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                                        {deleteModal.pending.name}
                                    </p>
                                    {deleteModal.pending.email && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {deleteModal.pending.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Confirmation Input */}
                        <div className="mx-6 mb-4">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Digite <span className="font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">excluir</span> para confirmar:
                            </label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="Digite aqui..."
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                                autoFocus
                            />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <button
                                onClick={handleCloseModal}
                                disabled={isDeleting}
                                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting || !canDelete}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Excluindo...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Excluir
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Panel */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-amber-300 dark:border-amber-700 shadow-md overflow-hidden mb-6">
                {/* Header */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 border-b-2 border-amber-200 dark:border-amber-800/50 hover:from-amber-50 hover:to-orange-50 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-200 dark:bg-amber-800 rounded-xl shadow-sm">
                            <AlertTriangle className="w-6 h-6 text-amber-700 dark:text-amber-300" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg text-amber-800 dark:text-amber-200 flex items-center gap-2">
                                Cadastros Pendentes
                                <span className="bg-amber-500 text-white text-sm font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                                    {pendingRegistrations.length}
                                </span>
                            </h3>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                Membros aguardando criação de conta no sistema
                            </p>
                        </div>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    )}
                </button>

                {/* Content */}
                {isExpanded && (
                    <div className="divide-y divide-amber-100 dark:divide-amber-900/30 max-h-[350px] overflow-y-auto bg-amber-50/30 dark:bg-amber-900/10">
                        {isLoading ? (
                            <div className="p-6 text-center text-slate-400">
                                Carregando...
                            </div>
                        ) : (
                            pendingRegistrations.map(pending => {
                                const micro = getMicroregiaoById(pending.microregiaoId);
                                return (
                                    <div
                                        key={pending.id}
                                        className="p-4 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center justify-between gap-4 group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {/* Avatar */}
                                            <div className="w-11 h-11 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border-2 border-amber-300 dark:border-amber-700">
                                                {getInitials(pending.name)}
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                                                        {pending.name}
                                                    </span>
                                                    <span className="text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full font-semibold">
                                                        {pending.cargo}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                    {pending.email && (
                                                        <span className="flex items-center gap-1 truncate">
                                                            <Mail className="w-3.5 h-3.5 shrink-0" />
                                                            <span className="truncate">{pending.email}</span>
                                                        </span>
                                                    )}
                                                    {pending.municipio && (
                                                        <span className="flex items-center gap-1 truncate">
                                                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                            <span className="truncate">{pending.municipio}</span>
                                                        </span>
                                                    )}
                                                    {micro && (
                                                        <span className="flex items-center gap-1 hidden sm:flex">
                                                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                                                            <span className="truncate">{micro.nome}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {/* Delete - Discreto, aparece mais no hover */}
                                            {onDelete && (
                                                <button
                                                    onClick={() => setDeleteModal({ open: true, pending })}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all opacity-50 group-hover:opacity-100"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            {/* Criar Usuário - Destaque principal */}
                                            {onCreateUser && (
                                                <button
                                                    onClick={() => onCreateUser(pending)}
                                                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Criar Usuário</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
