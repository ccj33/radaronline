import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Shield } from 'lucide-react';

interface SecureDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    itemName: string;
}

export const SecureDeleteModal: React.FC<SecureDeleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    itemName,
}) => {
    const [confirmationText, setConfirmationText] = useState('');

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setConfirmationText('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isConfirmed = confirmationText.toLowerCase() === 'excluir';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700 animate-scaleIn">
                {/* Header com gradiente de alerta */}
                <div className="bg-gradient-to-r from-red-500 to-orange-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <AlertTriangle size={24} className="text-white" />
                        </div>
                        <h2 className="text-xl font-bold">{title}</h2>
                    </div>
                    <p className="text-red-100 text-sm">Esta ação não pode ser desfeita.</p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                        <p className="text-slate-700 dark:text-slate-300 text-sm">
                            Você está prestes a excluir permanentemente:
                            <br />
                            <span className="font-bold text-slate-900 dark:text-white text-base block mt-1 break-words">{itemName}</span>
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                            Digite <span className="font-bold text-red-600 select-none uppercase text-xs border border-red-200 bg-red-50 px-1 rounded">excluir</span> para confirmar:
                        </label>
                        <input
                            type="text"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            placeholder="excluir"
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 outline-none transition-all font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900"
                            autoFocus
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        {/* Botão Cancelar em DESTAQUE (Segurança UI/UX) */}
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 shadow-lg shadow-teal-600/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                        >
                            <Shield size={18} />
                            Cancelar e Manter
                        </button>

                        {/* Botão Excluir (Secundário/Perigo) */}
                        <button
                            onClick={onConfirm}
                            disabled={!isConfirmed}
                            className={`
                px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-2
                ${isConfirmed
                                    ? 'border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer shadow-sm'
                                    : 'border-slate-200 text-slate-300 cursor-not-allowed dark:border-slate-700 dark:text-slate-600 bg-slate-50 dark:bg-slate-800'}
              `}
                        >
                            <Trash2 size={18} />
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
