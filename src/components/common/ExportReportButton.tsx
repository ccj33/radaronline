// ============================================
// Export Report Button Component
// Botão para exportar/imprimir relatórios
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import { Printer, FileDown, ChevronDown } from 'lucide-react';

interface ExportReportButtonProps {
    onPrint: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    label?: string;
    disabled?: boolean;
}

export function ExportReportButton({
    onPrint,
    variant = 'secondary',
    size = 'md',
    label = 'Exportar',
    disabled = false
}: ExportReportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fecha dropdown ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const sizeClasses = {
        sm: 'px-2.5 py-1.5 text-xs gap-1.5',
        md: 'px-3 py-2 text-sm gap-2',
        lg: 'px-4 py-2.5 text-base gap-2'
    };

    const variantClasses = {
        primary: 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm',
        secondary: 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm',
        ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
    };

    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
          inline-flex items-center justify-center rounded-lg font-medium transition-all
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800
        `}
            >
                <Printer size={iconSize} />
                <span>{label}</span>
                <ChevronDown size={iconSize - 2} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="py-1">
                        <button
                            onClick={() => {
                                onPrint();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Printer size={16} className="text-teal-600" />
                            <div className="text-left">
                                <div className="font-medium">Imprimir</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Abre janela de impressão</div>
                            </div>
                        </button>
                        <button
                            onClick={() => {
                                onPrint();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-t border-slate-100 dark:border-slate-700"
                        >
                            <FileDown size={16} className="text-blue-600" />
                            <div className="text-left">
                                <div className="font-medium">Salvar como PDF</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Via impressão do navegador</div>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// Simple Print Icon Button (para espaços menores)
// ============================================

interface PrintIconButtonProps {
    onClick: () => void;
    title?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function PrintIconButton({
    onClick,
    title = 'Imprimir relatório',
    size = 'md',
    className = ''
}: PrintIconButtonProps) {
    const sizeClasses = {
        sm: 'p-1.5',
        md: 'p-2',
        lg: 'p-2.5'
    };

    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

    return (
        <button
            onClick={onClick}
            title={title}
            className={`
        inline-flex items-center justify-center rounded-lg
        text-slate-500 dark:text-slate-400 
        hover:text-teal-600 dark:hover:text-teal-400
        hover:bg-slate-100 dark:hover:bg-slate-700
        transition-colors
        ${sizeClasses[size]}
        ${className}
      `}
        >
            <Printer size={iconSize} />
        </button>
    );
}

export default ExportReportButton;
