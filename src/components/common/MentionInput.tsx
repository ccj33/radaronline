import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TeamMember } from '../../types';

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    teamMembers: TeamMember[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    onSubmit?: () => void;
}

export const MentionInput: React.FC<MentionInputProps> = ({
    value,
    onChange,
    teamMembers,
    placeholder = 'Escreva um comentário...',
    disabled = false,
    className = '',
    onSubmit,
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Filter team members based on search term
    const filteredMembers = teamMembers.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Detect @ mentions while typing
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart || 0;
        onChange(newValue);
        setCursorPosition(cursorPos);

        // Find if we're typing after an @
        const textBeforeCursor = newValue.slice(0, cursorPos);
        const atIndex = textBeforeCursor.lastIndexOf('@');

        if (atIndex !== -1) {
            const textAfterAt = textBeforeCursor.slice(atIndex + 1);
            // Check if there's no space after @ (still typing the mention)
            if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
                setSearchTerm(textAfterAt);
                setShowSuggestions(true);
                setSelectedIndex(0);
                return;
            }
        }

        setShowSuggestions(false);
        setSearchTerm('');
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showSuggestions && filteredMembers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredMembers.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length);
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                selectMember(filteredMembers[selectedIndex]);
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
        } else if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
            e.preventDefault();
            onSubmit();
        }
    };

    // Insert selected member into text
    const selectMember = useCallback((member: TeamMember) => {
        const textBeforeCursor = value.slice(0, cursorPosition);
        const textAfterCursor = value.slice(cursorPosition);
        const atIndex = textBeforeCursor.lastIndexOf('@');

        if (atIndex !== -1) {
            const newValue =
                textBeforeCursor.slice(0, atIndex) +
                `@${member.name} ` +
                textAfterCursor;
            onChange(newValue);

            // Move cursor after the inserted mention
            setTimeout(() => {
                if (textareaRef.current) {
                    const newCursorPos = atIndex + member.name.length + 2;
                    textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                    textareaRef.current.focus();
                }
            }, 0);
        }

        setShowSuggestions(false);
        setSearchTerm('');
    }, [value, cursorPosition, onChange]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus textarea externally
    const focus = useCallback(() => {
        textareaRef.current?.focus();
    }, []);

    // Insert mention at current position
    const insertMention = useCallback((name: string) => {
        const cursorPos = textareaRef.current?.selectionStart || value.length;
        const newValue = value.slice(0, cursorPos) + `@${name} ` + value.slice(cursorPos);
        onChange(newValue);
        setTimeout(() => {
            if (textareaRef.current) {
                const newCursorPos = cursorPos + name.length + 2;
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                textareaRef.current.focus();
            }
        }, 0);
    }, [value, onChange]);

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className={className}
                rows={2}
            />

            {/* Suggestions dropdown */}
            {showSuggestions && filteredMembers.length > 0 && (
                <div
                    ref={suggestionsRef}
                    className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50"
                >
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-700">
                        Mencionar membro
                    </div>
                    {filteredMembers.map((member, index) => (
                        <button
                            key={member.id}
                            onClick={() => selectMember(member)}
                            className={`w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${index === selectedIndex ? 'bg-slate-50 dark:bg-slate-700' : ''
                                }`}
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
                    {filteredMembers.length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500 italic">
                            Nenhum membro encontrado
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Utility function to render comment text with highlighted mentions
export const renderCommentWithMentions = (text: string): React.ReactNode => {
    const mentionRegex = /@(\S+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        // Add text before mention
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        // Add highlighted mention
        parts.push(
            <span key={match.index} className="text-blue-600 dark:text-blue-400 font-medium">
                {match[0]}
            </span>
        );
        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
};

// Utility function to extract mentioned names from text
export const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\S+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push(match[1]);
    }

    return mentions;
};

export default MentionInput;
