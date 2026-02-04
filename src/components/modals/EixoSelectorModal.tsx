import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Check } from 'lucide-react';
import { EIXOS_PREDEFINIDOS, EixoConfig } from '../../lib/eixosConfig';

interface EixoSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (eixo: EixoConfig) => void;
    currentEixo?: number;
}

export const EixoSelectorModal: React.FC<EixoSelectorModalProps> = ({
    isOpen,
    onClose,
    onSave,
    currentEixo = 1,
}) => {
    const [selectedEixo, setSelectedEixo] = useState<number>(currentEixo);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    if (!isOpen) return null;

    const eixoSelecionado = EIXOS_PREDEFINIDOS.find(e => e.numero === selectedEixo) || EIXOS_PREDEFINIDOS[0];

    const getColorClasses = (cor: 'blue' | 'emerald' | 'rose') => {
        switch (cor) {
            case 'blue':
                return {
                    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                    border: 'border-blue-500',
                    bg: 'bg-blue-50 dark:bg-blue-900/20',
                    ring: 'ring-blue-500',
                };
            case 'emerald':
                return {
                    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                    border: 'border-emerald-500',
                    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                    ring: 'ring-emerald-500',
                };
            case 'rose':
            default:
                return {
                    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
                    border: 'border-rose-500',
                    bg: 'bg-rose-50 dark:bg-rose-900/20',
                    ring: 'ring-rose-500',
                };
        }
    };

    const handleSave = () => {
        onSave(eixoSelecionado);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Selecionar Eixo
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Dropdown */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Escolha o Eixo
                        </label>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-700 border-2 ${getColorClasses(eixoSelecionado.cor).border} rounded-lg transition-all hover:shadow-md`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getColorClasses(eixoSelecionado.cor).badge}`}>
                                    EIXO {eixoSelecionado.numero}
                                </span>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                    {eixoSelecionado.nome}
                                </span>
                            </div>
                            <ChevronDown
                                size={18}
                                className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {/* Dropdown Options */}
                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
                                {EIXOS_PREDEFINIDOS.map(eixo => {
                                    const isSelected = eixo.numero === selectedEixo;
                                    const colors = getColorClasses(eixo.cor);
                                    return (
                                        <button
                                            key={eixo.numero}
                                            onClick={() => {
                                                setSelectedEixo(eixo.numero);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected
                                                ? `${colors.bg} ring-2 ${colors.ring} ring-inset`
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${colors.badge}`}>
                                                EIXO {eixo.numero}
                                            </span>
                                            <span className="text-sm text-slate-700 dark:text-slate-200 truncate flex-1">
                                                {eixo.nome}
                                            </span>
                                            {isSelected && (
                                                <Check size={16} className="text-teal-500 shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    <div className={`p-4 rounded-lg border-l-4 ${getColorClasses(eixoSelecionado.cor).border} ${getColorClasses(eixoSelecionado.cor).bg}`}>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
                            Sobre o Eixo:
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {eixoSelecionado.descricao}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
