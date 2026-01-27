import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ClipboardPaste, AlertCircle, CheckCircle2, FileSpreadsheet, Trash2 } from 'lucide-react';
import { Status } from '../../types';

// Tipo para uma ação parseada da planilha
export interface ParsedAction {
    title: string;
    area: string;
    status: Status;
    startDate: string; // YYYY-MM-DD
    plannedEndDate: string; // YYYY-MM-DD
    isValid: boolean;
    errors: string[];
}

interface SmartPasteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (actions: ParsedAction[]) => void;
}

// Converte DD/MM/YYYY para YYYY-MM-DD
function parseDate(dateStr: string): string {
    if (!dateStr || !dateStr.trim()) return '';
    const cleaned = dateStr.trim();

    // Tenta DD/MM/YYYY
    const parts = cleaned.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        // Valida se são números
        if (!isNaN(parseInt(day)) && !isNaN(parseInt(month)) && !isNaN(parseInt(year))) {
            const fullYear = year.length === 2 ? `20${year}` : year;
            return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
    }

    // Tenta YYYY-MM-DD (já no formato correto)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return cleaned;
    }

    return '';
}

// Normaliza o status para os valores aceitos
function normalizeStatus(statusStr: string): Status {
    if (!statusStr || !statusStr.trim()) return 'Não Iniciado';

    const s = statusStr.trim().toLowerCase();

    if (s.includes('conclu') || s.includes('feito') || s.includes('pronto')) return 'Concluído';
    if (s.includes('andamento') || s.includes('progresso') || s.includes('execu')) return 'Em Andamento';
    if (s.includes('atras')) return 'Atrasado';

    return 'Não Iniciado';
}

// Processa o texto colado e retorna as ações parseadas
function parseClipboardText(text: string): ParsedAction[] {
    const lines = text.split('\n').filter(line => line.trim());
    const results: ParsedAction[] = [];

    for (const line of lines) {
        // Ignora linhas de cabeçalho
        if (line.toLowerCase().includes('ações chave') ||
            line.toLowerCase().includes('áreas envolvidas') ||
            line.toLowerCase().includes('data de início')) {
            continue;
        }

        // Separa por tab (padrão Excel/Planilhas)
        const columns = line.split('\t');

        // Estrutura esperada: [Título, Área, Status, Data Início, Data Término, ...]
        // Baseado no exemplo do usuário, pode haver colunas vazias no início
        // Limpa colunas vazias do início
        while (columns.length > 0 && !columns[0]?.trim()) {
            columns.shift();
        }

        if (columns.length < 1 || !columns[0]?.trim()) continue;

        const errors: string[] = [];

        const title = columns[0]?.trim() || '';
        const area = columns[1]?.trim() || '';
        const statusRaw = columns[2]?.trim() || '';
        const startDateRaw = columns[3]?.trim() || '';
        const endDateRaw = columns[4]?.trim() || '';

        const startDate = parseDate(startDateRaw);
        const plannedEndDate = parseDate(endDateRaw);
        const status = normalizeStatus(statusRaw);

        // Validações
        if (!title) errors.push('Título vazio');
        if (startDateRaw && !startDate) errors.push('Data início inválida');
        if (endDateRaw && !plannedEndDate) errors.push('Data término inválida');

        results.push({
            title,
            area,
            status,
            startDate,
            plannedEndDate,
            isValid: errors.length === 0 && !!title,
            errors,
        });
    }

    return results;
}

export const SmartPasteModal: React.FC<SmartPasteModalProps> = ({
    isOpen,
    onClose,
    onImport,
}) => {
    const [rawText, setRawText] = useState('');
    const [parsedActions, setParsedActions] = useState<ParsedAction[]>([]);
    const [step, setStep] = useState<'paste' | 'preview'>('paste');

    const handleProcess = useCallback(() => {
        const actions = parseClipboardText(rawText);
        setParsedActions(actions);
        setStep('preview');
    }, [rawText]);

    const handleImport = useCallback(() => {
        const validActions = parsedActions.filter(a => a.isValid);
        if (validActions.length > 0) {
            onImport(validActions);
            handleReset();
            onClose();
        }
    }, [parsedActions, onImport, onClose]);

    const handleReset = useCallback(() => {
        setRawText('');
        setParsedActions([]);
        setStep('paste');
    }, []);

    const handleClose = useCallback(() => {
        handleReset();
        onClose();
    }, [onClose, handleReset]);

    const validCount = parsedActions.filter(a => a.isValid).length;
    const invalidCount = parsedActions.filter(a => !a.isValid).length;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={e => e.stopPropagation()}
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-lg">
                                    <FileSpreadsheet className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                        Importar Ações da Planilha
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Cole linhas da sua planilha para criar várias ações de uma vez
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto p-6">
                            {step === 'paste' ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <div className="flex gap-3">
                                            <ClipboardPaste className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                            <div className="text-sm text-blue-800 dark:text-blue-200">
                                                <p className="font-semibold mb-1">Como usar:</p>
                                                <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300">
                                                    <li>Copie as linhas da sua planilha (Ctrl+C)</li>
                                                    <li>Cole no campo abaixo (Ctrl+V)</li>
                                                    <li>Clique em "Processar" para ver a prévia</li>
                                                </ol>
                                                <p className="mt-2 text-xs opacity-75">
                                                    Colunas esperadas: Título | Áreas | Status | Data Início | Data Término
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <textarea
                                        value={rawText}
                                        onChange={e => setRawText(e.target.value)}
                                        placeholder="Cole aqui as linhas da planilha..."
                                        className="w-full h-64 p-4 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Summary */}
                                    <div className="flex gap-4">
                                        <div className="flex-1 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{validCount}</span>
                                            </div>
                                            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">Ações válidas</p>
                                        </div>
                                        {invalidCount > 0 && (
                                            <div className="flex-1 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="w-5 h-5 text-amber-600" />
                                                    <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">{invalidCount}</span>
                                                </div>
                                                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">Com problemas</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Preview Table */}
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-700/50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
                                                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Título</th>
                                                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Área</th>
                                                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Início</th>
                                                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Término</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                    {parsedActions.map((action, idx) => (
                                                        <tr
                                                            key={idx}
                                                            className={action.isValid
                                                                ? 'bg-white dark:bg-slate-800'
                                                                : 'bg-amber-50/50 dark:bg-amber-900/10'
                                                            }
                                                        >
                                                            <td className="px-4 py-3">
                                                                {action.isValid ? (
                                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                                ) : (
                                                                    <div className="group relative">
                                                                        <AlertCircle className="w-5 h-5 text-amber-500" />
                                                                        <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                                                            {action.errors.join(', ')}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 max-w-xs truncate">
                                                                {action.title || <span className="text-slate-400 italic">Sem título</span>}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                                {action.area || '—'}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">
                                                                {action.startDate || '—'}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">
                                                                {action.plannedEndDate || '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            {step === 'preview' && (
                                <button
                                    onClick={handleReset}
                                    className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Limpar e voltar
                                </button>
                            )}
                            {step === 'paste' && <div />}

                            <div className="flex gap-3">
                                <button
                                    onClick={handleClose}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>

                                {step === 'paste' ? (
                                    <button
                                        onClick={handleProcess}
                                        disabled={!rawText.trim()}
                                        className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Processar
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleImport}
                                        disabled={validCount === 0}
                                        className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Importar {validCount} {validCount === 1 ? 'ação' : 'ações'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
