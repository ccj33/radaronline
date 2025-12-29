import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'radar-theme-preference';

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
}

function getStoredTheme(): Theme {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
            return stored;
        }
    }
    return 'system';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
        const stored = getStoredTheme();
        return stored === 'system' ? getSystemTheme() : stored;
    });

    // Update resolved theme when theme or system preference changes
    const updateResolvedTheme = useCallback(() => {
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        console.log('[Theme] updateResolvedTheme called:', { theme, resolved });
        setResolvedTheme(resolved);

        // Apply to document
        const root = document.documentElement;
        console.log('[Theme] Before change - HTML classes:', root.className);
        if (resolved === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        console.log('[Theme] After change - HTML classes:', root.className);
    }, [theme]);

    // Set theme and persist
    const setTheme = useCallback((newTheme: Theme) => {
        console.log('[Theme] setTheme called:', { from: theme, to: newTheme });
        setThemeState(newTheme);
        localStorage.setItem(STORAGE_KEY, newTheme);
    }, [theme]);

    // Toggle between light and dark
    const toggleTheme = useCallback(() => {
        console.log('[Theme] toggleTheme called');
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    }, [resolvedTheme, setTheme]);

    // Apply theme on mount and when theme changes
    useEffect(() => {
        console.log('[Theme] useEffect triggered - calling updateResolvedTheme');
        updateResolvedTheme();
    }, [updateResolvedTheme]);

    // Listen for system preference changes
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => updateResolvedTheme();

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [theme, updateResolvedTheme]);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

// Hook seguro para usar fora do provider (retorna null se não houver contexto)
export function useThemeSafe() {
    return useContext(ThemeContext);
}
