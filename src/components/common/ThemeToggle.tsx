import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, Theme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
    showLabel?: boolean;
    size?: 'sm' | 'md';
}

export function ThemeToggle({ showLabel = false, size = 'md' }: ThemeToggleProps) {
    const { theme, setTheme, resolvedTheme } = useTheme();

    const iconSize = size === 'sm' ? 16 : 18;
    const buttonPadding = size === 'sm' ? 'p-1.5' : 'p-2';

    const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
        { value: 'light', icon: <Sun size={iconSize} />, label: 'Claro' },
        { value: 'dark', icon: <Moon size={iconSize} />, label: 'Escuro' },
        { value: 'system', icon: <Monitor size={iconSize} />, label: 'Sistema' },
    ];

    // Simple toggle button (cycles through options)
    if (!showLabel) {
        const currentIcon = resolvedTheme === 'dark'
            ? <Moon size={iconSize} className="text-yellow-300" />
            : <Sun size={iconSize} className="text-amber-500" />;

        return (
            <button
                onClick={() => {
                    const nextTheme: Record<Theme, Theme> = {
                        light: 'dark',
                        dark: 'system',
                        system: 'light',
                    };
                    setTheme(nextTheme[theme]);
                }}
                className={`${buttonPadding} rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group`}
                title={`Tema: ${theme === 'system' ? 'Sistema' : theme === 'dark' ? 'Escuro' : 'Claro'}`}
            >
                <div className="relative">
                    {currentIcon}
                    {theme === 'system' && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-teal-500 rounded-full border border-white dark:border-slate-800" />
                    )}
                </div>
            </button>
        );
    }

    // Full selector with labels
    return (
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
            ${theme === option.value
                            ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }
          `}
                >
                    {option.icon}
                    <span>{option.label}</span>
                </button>
            ))}
        </div>
    );
}

// Versão simplificada para usar na Sidebar
export function ThemeToggleCompact() {
    const { toggleTheme, resolvedTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            title={resolvedTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
            {resolvedTheme === 'dark' ? (
                <Sun size={18} className="text-yellow-300" />
            ) : (
                <Moon size={18} />
            )}
        </button>
    );
}
