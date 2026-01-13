import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Check, User as UserIcon, Save, Send, Bell, Moon, Sun, Shield,
    Palette, KeyRound, Monitor, Laptop, Smartphone, LogOut,
    Clock, RotateCcw, MessageSquare, AtSign, XCircle
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/common/Toast';
import { logError } from '../../lib/logger';
// import { AVATARS, AVATAR_CATEGORIES, getAvatarUrl } from './AvatarData';
import { fadeIn, scaleIn, slideInRight } from '../../lib/motion';

// =====================================
// AVATAR DATA MOVED TO SEPARATE EXPORT IF NEEDED
// FOR NOW KEEPING HERE BUT CLEANER
// =====================================
// (Reusing existing constants for compatibility)
const CATEGORIES = [
    { id: 'zeGotinha', label: '💧 Zé Gotinha' },
    { id: 'pessoas', label: '👤 Pessoas' },
    { id: 'emojis', label: '👍 Emojis' },
    { id: 'robos', label: '🤖 Robôs' },
    { id: 'cores', label: '🎨 Cores' },
    { id: 'abstrato', label: '✨ Abstrato' },
];

// ... (AVATARS constant would be imported or defined here - reusing the one from previous file content logic)
// To save space, assuming AVATARS is available or I should copy it back.
// Since I'm overwriting, I MUST include AVATARS content unless I extract it.
// I'll re-include the AVATARS and getAvatarUrl logic to be safe and self-contained.

export const AVATAR_LIST = [
    // Zé Gotinha
    { id: 'zg1', label: 'Zé Gotinha 1', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg1.png' },
    { id: 'zg2', label: 'Zé Gotinha 2', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg2.png' },
    { id: 'zg3', label: 'Zé Gotinha 3', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg3.png' },
    { id: 'zg4', label: 'Zé Gotinha 4', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg4.png' },
    { id: 'zg5', label: 'Zé Gotinha 5', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg5.png' },
    { id: 'zg6', label: 'Zé Gotinha 6', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg6.png' },
    { id: 'zg7', label: 'Zé Gotinha 7', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg7.png' },
    { id: 'zg8', label: 'Zé Gotinha 8', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg8.png' },
    { id: 'zg9', label: 'Zé Gotinha 9', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg9.png' },
    { id: 'zg10', label: 'Zé Gotinha 10', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg10.png' },
    { id: 'zg11', label: 'Zé Gotinha 11', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg11.png' },
    { id: 'zg12', label: 'Zé Gotinha 12', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg12.png' },
    { id: 'zg13', label: 'Zé Gotinha 13', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg13.png' },
    { id: 'zg14', label: 'Zé Gotinha 14', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg14.png' },
    { id: 'zg15', label: 'Zé Gotinha 15', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg15.png' },
    { id: 'zg16', label: 'Zé Gotinha 16', category: 'zeGotinha', local: '/avatars/ze-gotinha/zg16.png' },

    // Pessoas
    { id: 'p22', seed: 'Thiago', label: 'Pessoa 1', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p1', seed: 'Ana', label: 'Pessoa 2', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p2', seed: 'Carlos', label: 'Pessoa 3', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p3', seed: 'Maria', label: 'Pessoa 4', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p4', seed: 'Pedro', label: 'Pessoa 5', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p5', seed: 'Julia', label: 'Pessoa 6', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p6', seed: 'Lucas', label: 'Pessoa 7', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p7', seed: 'Clara', label: 'Pessoa 8', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p8', seed: 'Rafael', label: 'Pessoa 9', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p9', seed: 'Beatriz', label: 'Pessoa 10', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p10', seed: 'Marcos', label: 'Pessoa 11', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p11', seed: 'Patricia', label: 'Pessoa 12', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p12', seed: 'Roberto', label: 'Pessoa 13', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p13', seed: 'Camila', label: 'Pessoa 14', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p14', seed: 'Fernando', label: 'Pessoa 15', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p15', seed: 'Lucia', label: 'Pessoa 16', category: 'pessoas', style: 'notionists-neutral' },
    // Emojis
    { id: 'e1', seed: 'like', label: 'Joinha', category: 'emojis', style: 'thumbs' },
    { id: 'e2', seed: 'cool', label: 'Legal', category: 'emojis', style: 'thumbs' },
    { id: 'e3', seed: 'happy', label: 'Feliz', category: 'emojis', style: 'thumbs' },
    { id: 'e4', seed: 'star', label: 'Estrela', category: 'emojis', style: 'thumbs' },
    // Robos
    { id: 'r1', seed: 'Robot1', label: 'Robô 1', category: 'robos', style: 'bottts' },
    { id: 'r2', seed: 'Robot2', label: 'Robô 2', category: 'robos', style: 'bottts' },
    { id: 'r3', seed: 'Robot3', label: 'Robô 3', category: 'robos', style: 'bottts' },
    // Cores
    { id: 'c1', seed: 'Vermelho', label: 'Vermelho', category: 'cores', style: 'shapes' },
    { id: 'c2', seed: 'Azul', label: 'Azul', category: 'cores', style: 'shapes' },
    { id: 'c3', seed: 'Verde', label: 'Verde', category: 'cores', style: 'shapes' },
    // Abstrato
    { id: 'x1', seed: 'Alpha', label: 'Alpha', category: 'abstrato', style: 'rings' },
    { id: 'x2', seed: 'Beta', label: 'Beta', category: 'abstrato', style: 'rings' },
];

export function getAvatarUrl(avatarId: string): string {
    const avatar = AVATAR_LIST.find(a => a.id === avatarId);
    if ((avatar as any)?.local) return (avatar as any).local;
    const seed = (avatar as any)?.seed || 'User';
    const style = (avatar as any)?.style || 'personas';
    const colors = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=${colors}`;
}

interface UserSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'profile' | 'appearance' | 'notifications' | 'security';
    mode?: 'settings' | 'avatar';
}

type Tab = 'profile' | 'appearance' | 'notifications' | 'security';

export function UserSettingsModal({ isOpen, onClose, initialTab = 'profile', mode = 'settings' }: UserSettingsModalProps) {
    const { user, refreshUser } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const isAvatarMode = mode === 'avatar';

    // Profile State
    const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarId || 'zg10');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [changeRequest, setChangeRequest] = useState('');
    const [isSendingRequest, setIsSendingRequest] = useState(false);

    // Chat scroll ref
    const chatContainerRef = useRef<HTMLDivElement>(null);


    const [isSaving, setIsSaving] = useState(false);
    const [myRequests, setMyRequests] = useState<any[]>([]);

    // Theme (Simulated for UI)
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

    // Notifications State
    interface UserRequest {
        id: string;
        user_id: string;
        request_type: string;
        content: string;
        status: 'pending' | 'resolved' | 'rejected';
        admin_notes: string | null;
        created_at: string;
        user?: {
            nome: string;
            email: string;
        };
    }

    const [requests, setRequests] = useState<UserRequest[]>([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const READ_NOTIFICATIONS_KEY = 'radar_read_notifications';

    // Initial read IDs state
    const [readIds, setReadIds] = useState<Set<string>>(() => {
        try {
            const stored = localStorage.getItem(READ_NOTIFICATIONS_KEY);
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch {
            return new Set();
        }
    });

    const saveReadNotifications = (ids: Set<string>) => {
        localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify([...ids]));
    };

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    // Auto-scroll when requests update or tab changes to security
    useEffect(() => {
        if (activeTab === 'security') {
            scrollToBottom();
        }
    }, [requests, activeTab]);

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    const isUnread = useCallback((request: UserRequest): boolean => {
        if (readIds.has(request.id)) return false;
        if (isAdmin) {
            return request.status === 'pending' && request.request_type !== 'mention';
        } else {
            if (request.request_type === 'mention') {
                return request.status === 'pending';
            }
            return !!(request.admin_notes && request.status !== 'pending');
        }
    }, [readIds, isAdmin]);


    const loadRequests = useCallback(async () => {
        if (!user) return;
        setLoadingNotifications(true);
        try {
            // First fetch requests
            let query = supabase
                .from('user_requests')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (!isAdmin) {
                query = query.eq('user_id', user.id);
            }

            const { data: requestsData, error } = await query;

            if (error || !requestsData || requestsData.length === 0) {
                setRequests([]);
                return;
            }

            // Fetch profiles - fetch individually since batch queries return 400
            const userIds = [...new Set(requestsData.map(r => r.user_id).filter(Boolean))];

            if (userIds.length === 0) {
                setRequests(requestsData);
                return;
            }

            // Fetch each profile individually in parallel
            const profilePromises = userIds.map(async (userId) => {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, nome, email')
                    .eq('id', userId)
                    .single();

                if (error) return null;
                return data;
            });

            const profilesResults = await Promise.all(profilePromises);
            const profilesData = profilesResults.filter(Boolean);

            // Merge data
            const profilesMap = new Map(profilesData.map(p => [p!.id, p]));
            const mergedRequests = requestsData.map(req => ({
                ...req,
                user: profilesMap.get(req.user_id) || undefined
            }));

            setRequests(mergedRequests);
        } finally {
            setLoadingNotifications(false);
        }
    }, [user, isAdmin]);

    // Mark as read
    const markAsRead = (requestId: string) => {
        const newReadIds = new Set(readIds);
        newReadIds.add(requestId);
        setReadIds(newReadIds);
        saveReadNotifications(newReadIds);
    };

    // Effects for Notifications and Requests History
    useEffect(() => {
        if ((activeTab === 'notifications' || activeTab === 'security') && user) {
            loadRequests();
        }
    }, [activeTab, user, loadRequests]);

    useEffect(() => {
        if (!user?.id) return;
        const channel = supabase
            .channel('user_requests_modal_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'user_requests' },
                () => loadRequests()
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user?.id, loadRequests]);

    // Reset when opening

    useEffect(() => {
        if (isOpen && user) {
            setSelectedAvatar(user.avatarId || 'zg10');
            // Check current theme from document class
            if (document.documentElement.classList.contains('dark')) {
                setTheme('dark');
            } else {
                setTheme('light');
            }

            // Set initial tab based on mode or defaults
            if (activeTab) {
                setActiveTab(initialTab || (isAvatarMode ? 'notifications' : 'profile'));
            } else {
                setActiveTab(isAvatarMode ? 'notifications' : 'profile');
            }

            // If in avatar mode, default to notifications unless profile explicitly requested? 
            // Actually, let's default to notifications for the "Hub" feel, or Profile if they clicked avatar?
            // User said "Changing Avatar AND Notifications". 
            // Let's set it based on the passed prop if present, else notifications for hub might be cleaner?
            // Actually, if they clicked avatar, they probably want to change it? 
            // Sidebar passes 'avatar' mode. 
            // Let's default to 'notifications' as the "Home" of the hub, but if they clicked explicitly to change, maybe profile?
            // Let's stick to the prop `initialTab` if passed.
            setActiveTab(initialTab || 'profile');
        }
    }, [isOpen, user, initialTab]);

    if (!isOpen || !user) return null;

    const filteredAvatars = selectedCategory === 'all'
        ? AVATAR_LIST
        : AVATAR_LIST.filter(a => a.category === selectedCategory);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    avatar_id: selectedAvatar,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            await refreshUser();
            showToast('Perfil atualizado com sucesso!', 'success');
            onClose();
        } catch (error) {
            logError('UserSettingsModal', 'Error saving profile', error);
            showToast('Erro ao salvar perfil', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendRequest = async () => {
        if (!changeRequest.trim()) return;
        setIsSendingRequest(true);
        try {
            const { data, error } = await supabase
                .from('user_requests')
                .insert({
                    user_id: user.id,
                    request_type: 'profile_change',
                    content: changeRequest.trim(),
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            // Optimistic update
            if (data) {
                setRequests(prev => [data, ...prev]);
            }
            showToast('Solicitação enviada!', 'success');
            setChangeRequest('');
        } catch (error) {
            logError('UserSettingsModal', 'Error sending request', error);
            showToast('Erro ao enviar solicitação', 'error');
        } finally {
            setIsSendingRequest(false);
        }
    };

    const toggleTheme = (newTheme: 'light' | 'dark' | 'system') => {
        setTheme(newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else if (newTheme === 'light') {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            localStorage.removeItem('theme');
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    {/* AVATAR MODE: PERSONAL HUB DESIGN */}
                    {isAvatarMode ? (
                        <motion.div
                            variants={scaleIn}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="relative w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[32px] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[85vh]"
                            style={{ fontSize: '16px' }} // Reset font-size to prevent zoom scaling inside modal
                        >
                            {/* Header Gradient */}
                            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-teal-500/20 via-blue-500/20 to-purple-500/20 blur-xl pointer-events-none" />

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-20 p-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 rounded-full backdrop-blur-md transition-all"
                            >
                                <X className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                            </button>

                            {/* User Identity Section */}
                            <div className="relative pt-10 pb-6 text-center z-10 px-6">
                                <div className="relative inline-block group">
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        className="relative p-1 rounded-full bg-gradient-to-tr from-teal-400 to-blue-500 shadow-lg"
                                    >
                                        <img
                                            src={getAvatarUrl(user.avatarId || 'zg10')}
                                            alt="Avatar"
                                            className="w-28 h-28 rounded-full border-4 border-white dark:border-slate-800 object-cover bg-white"
                                        />
                                        <button
                                            onClick={() => setActiveTab(activeTab === 'profile' ? 'notifications' : 'profile')} // Toggle edit
                                            className="absolute bottom-1 right-1 bg-slate-900 text-white p-2 rounded-full shadow-lg hover:bg-slate-700 transition-colors border-2 border-white dark:border-slate-800"
                                            title="Alterar Avatar"
                                        >
                                            <Palette className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                </div>

                                <h2 className="mt-4 text-2xl font-bold text-slate-800 dark:text-white">{user.nome}</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{user.email}</p>
                                <div className="mt-3 flex justify-center gap-2">
                                    <span className="px-3 py-1 rounded-full bg-teal-100/50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-bold uppercase tracking-wider border border-teal-200/50 dark:border-teal-800/50">
                                        {user.role}
                                    </span>
                                </div>
                            </div>

                            {/* Tabs / Switcher */}
                            <div className="flex border-b border-slate-200/60 dark:border-slate-700/60 mx-6">
                                <button
                                    onClick={() => setActiveTab('notifications')}
                                    className={`flex-1 pb-3 text-sm font-bold transition-all relative ${activeTab === 'notifications'
                                        ? 'text-teal-600 dark:text-teal-400'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                >
                                    Notificações
                                    {requests.filter(r => isUnread(r)).length > 0 && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                                            {requests.filter(r => isUnread(r)).length}
                                        </span>
                                    )}
                                    {activeTab === 'notifications' && (
                                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-full" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`flex-1 pb-3 text-sm font-bold transition-all relative ${activeTab === 'profile'
                                        ? 'text-teal-600 dark:text-teal-400'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                >
                                    Alterar Avatar
                                    {activeTab === 'profile' && (
                                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-full" />
                                    )}
                                </button>
                            </div>

                            {/* Content Area (Scrollable) */}
                            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'profile' ? (
                                        <motion.div
                                            key="avatar-grid"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-4"
                                        >
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
                                                <button
                                                    onClick={() => setSelectedCategory('all')}
                                                    className={`px-4 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap snap-start ${selectedCategory === 'all'
                                                        ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-md'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                        }`}
                                                >
                                                    Tudo
                                                </button>
                                                {CATEGORIES.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setSelectedCategory(cat.id)}
                                                        className={`px-4 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap snap-start ${selectedCategory === cat.id
                                                            ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-md'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                            }`}
                                                    >
                                                        {cat.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                                {filteredAvatars.map((avatar) => (
                                                    <motion.button
                                                        key={avatar.id}
                                                        layoutId={`avatar-${avatar.id}`}
                                                        onClick={() => setSelectedAvatar(avatar.id)}
                                                        className={`relative aspect-square rounded-2xl overflow-hidden transition-all ${selectedAvatar === avatar.id
                                                            ? 'ring-4 ring-teal-500 shadow-lg scale-105 z-10'
                                                            : 'opacity-80 hover:opacity-100 hover:scale-105'
                                                            }`}
                                                    >
                                                        <img
                                                            src={getAvatarUrl(avatar.id)}
                                                            alt={avatar.label}
                                                            className="w-full h-full object-cover bg-white"
                                                            loading="lazy"
                                                        />
                                                    </motion.button>
                                                ))}
                                            </div>

                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleSaveProfile}
                                                disabled={isSaving || selectedAvatar === user.avatarId}
                                                className="w-full mt-4 py-3 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-600/20 disabled:opacity-50 disabled:shadow-none hover:bg-teal-500 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Save className="w-4 h-4" />
                                                {isSaving ? 'Atualizando...' : 'Confirmar Novo Avatar'}
                                            </motion.button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="notifications-list"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="space-y-3"
                                        >
                                            {loadingNotifications ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                                    <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin mb-3"></div>
                                                    <span className="text-xs font-medium uppercase tracking-widest">Carregando</span>
                                                </div>
                                            ) : requests.length === 0 ? (
                                                <div className="text-center py-12">
                                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600">
                                                        <Bell className="w-8 h-8" />
                                                    </div>
                                                    <p className="text-slate-500 dark:text-slate-400 font-medium">Tudo limpo por aqui!</p>
                                                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Nenhuma notificação nova.</p>
                                                </div>
                                            ) : (
                                                requests.map(request => {
                                                    const unread = isUnread(request);
                                                    return (
                                                        <motion.div
                                                            key={request.id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            onClick={() => markAsRead(request.id)}
                                                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${unread
                                                                ? 'bg-white dark:bg-slate-800 border-teal-200 dark:border-teal-900 shadow-lg shadow-teal-900/5'
                                                                : 'bg-slate-50 dark:bg-slate-900/50 border-transparent opacity-75 hover:opacity-100'
                                                                }`}
                                                        >
                                                            <div className="flex gap-3">
                                                                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${unread ? 'bg-teal-500' : 'bg-transparent'}`} />
                                                                <div className="flex-1">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className={`text-xs font-bold uppercase tracking-wider ${request.status === 'pending' ? 'text-amber-500' :
                                                                            request.status === 'resolved' ? 'text-green-500' :
                                                                                'text-red-500'
                                                                            }`}>
                                                                            {request.status === 'pending' ? 'Análise' :
                                                                                request.status === 'resolved' ? 'Resolvido' : 'Rejeitado'}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400">
                                                                            {new Date(request.created_at).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug mb-1.5">
                                                                        {request.content}
                                                                    </p>
                                                                    {request.admin_notes && (
                                                                        <div className="bg-slate-100 dark:bg-slate-950 rounded-lg p-2.5 text-xs text-slate-600 dark:text-slate-400 mt-2 border-l-2 border-teal-500">
                                                                            <span className="block font-bold text-teal-600 dark:text-teal-400 mb-0.5">Admin:</span>
                                                                            {request.admin_notes}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    ) : (
                        // SETTINGS MODE: ORIGINAL SIDEBAR DESIGN
                        <motion.div
                            variants={scaleIn}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800"
                            style={{ fontSize: '16px' }} // Reset font-size to prevent zoom scaling inside modal
                        >
                            {/* Toap Navigation Bar */}
                            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm p-3 gap-3 items-center z-10">
                                <nav className="flex-1 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    <button
                                        onClick={() => setActiveTab('profile')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'profile'
                                            ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <UserIcon className="w-4 h-4" />
                                        Perfil
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('appearance')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'appearance'
                                            ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <Palette className="w-4 h-4" />
                                        Aparência
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('notifications')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'notifications'
                                            ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <Bell className="w-4 h-4" />
                                        Notificações
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('security')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'security'
                                            ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <KeyRound className="w-4 h-4" />
                                        Segurança
                                    </button>
                                </nav>
                                <button
                                    onClick={onClose}
                                    className="p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Fechar"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content Area */}
                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/50 p-6 md:p-8 relative">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

                                {/* TAB: PROFILE */}
                                {activeTab === 'profile' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Editar Perfil</h3>
                                            <p className="text-slate-500 dark:text-slate-400">Gerencie suas informações pessoais e avatar.</p>
                                        </div>

                                        {/* Avatar Selection */}
                                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500" />

                                            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                                                <div className="relative group">
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-teal-500 to-blue-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity" />
                                                    <img
                                                        src={getAvatarUrl(user.avatarId || 'zg10')}
                                                        alt="Avatar"
                                                        className="relative w-32 h-32 rounded-full border-4 border-white dark:border-slate-800 shadow-2xl object-cover bg-white"
                                                    />
                                                </div>

                                                <div className="flex-1 text-center md:text-left space-y-4">
                                                    <div>
                                                        <h4 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{user.nome}</h4>
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                                                            {user.role}
                                                        </span>
                                                    </div>

                                                    <div className="grid gap-3">
                                                        <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                                            <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-slate-500">
                                                                <AtSign className="w-4 h-4" />
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</div>
                                                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{user.email}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 p-4 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 rounded-2xl">
                                            <div className="shrink-0 text-teal-600 dark:text-teal-400 bg-white dark:bg-teal-900/40 p-3 rounded-xl h-fit">
                                                <Palette className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-teal-800 dark:text-teal-300">Quer mudar seu visual?</h5>
                                                <p className="text-sm text-teal-600/80 dark:text-teal-400/80 mt-1">
                                                    Para alterar seu avatar, feche esta tela e clique diretamente na sua foto de perfil no menu lateral.
                                                </p>
                                            </div>
                                        </div>


                                        {/* Request Data Change moved to Security Tab */}
                                    </div>
                                )}

                                {/* TAB: APPEARANCE */}
                                {activeTab === 'appearance' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Aparência</h3>
                                            <p className="text-slate-500 dark:text-slate-400">Personalize a interface do sistema.</p>
                                        </div>

                                        <div className="grid grid-cols-3 gap-6">
                                            <button
                                                onClick={() => toggleTheme('light')}
                                                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${theme === 'light'
                                                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800'
                                                    }`}
                                            >
                                                <div className="w-16 h-10 bg-white border border-slate-200 rounded-lg shadow-sm"></div>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">Claro</span>
                                            </button>

                                            <button
                                                onClick={() => toggleTheme('dark')}
                                                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${theme === 'dark'
                                                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800'
                                                    }`}
                                            >
                                                <div className="w-16 h-10 bg-slate-900 border border-slate-700 rounded-lg shadow-sm"></div>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">Escuro</span>
                                            </button>

                                            <button
                                                onClick={() => toggleTheme('system')}
                                                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${theme === 'system'
                                                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800'
                                                    }`}
                                            >
                                                <div className="w-16 h-10 bg-gradient-to-r from-white to-slate-900 border border-slate-200 rounded-lg shadow-sm"></div>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">Sistema</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'notifications' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Notificações</h3>
                                                <p className="text-slate-500 dark:text-slate-400">Acompanhe suas solicitações e avisos do sistema.</p>
                                            </div>
                                            <button
                                                onClick={loadRequests}
                                                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                title="Atualizar"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            {loadingNotifications ? (
                                                <div className="p-8 text-center text-slate-400">
                                                    <div className="animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full mx-auto mb-2"></div>
                                                    Carregando...
                                                </div>
                                            ) : requests.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                    <Bell className="w-12 h-12 text-slate-300 mb-3" />
                                                    <p className="text-slate-500 font-medium">Nenhuma notificação encontrada</p>
                                                </div>
                                            ) : (
                                                requests.map(request => {
                                                    const unread = isUnread(request);
                                                    return (
                                                        <div
                                                            key={request.id}
                                                            onClick={() => markAsRead(request.id)}
                                                            className={`relative p-4 rounded-xl border transition-all ${unread
                                                                ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                                                }`}
                                                        >
                                                            {unread && (
                                                                <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                                                            )}

                                                            <div className="flex items-start gap-4">
                                                                <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${request.request_type === 'mention' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                    request.status === 'pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                        request.status === 'resolved' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                                                            'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                                    }`}>
                                                                    {request.request_type === 'mention' ? <AtSign className="w-5 h-5" /> :
                                                                        request.request_type === 'system' ? <Clock className="w-5 h-5" /> :
                                                                            request.status === 'pending' ? <Clock className="w-5 h-5" /> :
                                                                                request.status === 'resolved' ? <Check className="w-5 h-5" /> :
                                                                                    <XCircle className="w-5 h-5" />}
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className={`text-sm ${unread ? 'font-bold text-slate-800 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                                                            {request.request_type === 'mention' ? 'Você foi mencionado' :
                                                                                request.request_type === 'system' ? 'Aviso do Sistema' :
                                                                                    isAdmin ? (request.user?.nome || 'Usuário') : 'Minha solicitação'}
                                                                        </span>
                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${request.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                            request.status === 'resolved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                            }`}>
                                                                            {request.status === 'pending' ? 'Pendente' :
                                                                                request.status === 'resolved' ? 'Resolvido' : 'Rejeitado'}
                                                                        </span>
                                                                    </div>

                                                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                                                        {request.content}
                                                                    </p>

                                                                    {request.admin_notes && (
                                                                        <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-sm border border-slate-100 dark:border-slate-800">
                                                                            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-medium mb-1 text-xs uppercase tracking-wide">
                                                                                <MessageSquare className="w-3 h-3" />
                                                                                Resposta do Admin
                                                                            </div>
                                                                            <p className="text-slate-600 dark:text-slate-400">
                                                                                {request.admin_notes}
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                                                                        {new Date(request.created_at).toLocaleString('pt-BR')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* TAB: SECURITY (Placeholder) */}
                                {activeTab === 'security' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Central de Segurança</h3>
                                            <p className="text-slate-500 dark:text-slate-400">Gerencie sua proteção e suporte.</p>
                                        </div>

                                        {/* Protected Area Status Card */}
                                        <div className="relative overflow-hidden rounded-3xl p-8 border border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                                            <div className="absolute top-0 right-0 p-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                                            <div className="relative flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
                                                    <Shield className="w-8 h-8" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-xl font-bold text-slate-800 dark:text-white flex items-center justify-center md:justify-start gap-2">
                                                        Conta Protegida
                                                        <Check className="w-5 h-5 text-green-500" />
                                                    </h4>
                                                    <p className="text-slate-600 dark:text-slate-300 mt-1">
                                                        Sua senha e dados sensíveis estão seguros. Nenhuma atividade suspeita detectada.
                                                    </p>
                                                </div>
                                                <div className="shrink-0 bg-white/50 dark:bg-black/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">Status: Ativo</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Support & Requests Section */}
                                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[400px]">
                                            {/* Header */}
                                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4 text-slate-400" />
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Suporte e Solicitações</span>
                                            </div>

                                            {/* History (Scrollable) */}
                                            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-950/30 scroll-smooth">
                                                {loadingNotifications ? (
                                                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">Carregando...</div>
                                                ) : requests.filter(r => r.user_id === user.id).length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2">
                                                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                            <MessageSquare className="w-6 h-6 text-slate-300" />
                                                        </div>
                                                        <p>Nenhuma mensagem ainda.</p>
                                                    </div>
                                                ) : (
                                                    requests
                                                        .filter(r => r.user_id === user.id)
                                                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) // Sort Oldest -> Newest
                                                        .map(request => (
                                                            <div key={request.id} className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                                                                {/* User Message */}
                                                                <div className="flex justify-end">
                                                                    <div className="bg-teal-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] shadow-sm">
                                                                        <p className="text-sm">{request.content}</p>
                                                                        <div className="flex items-center justify-end gap-2 mt-1 opacity-70">
                                                                            <span className="text-[10px]">{new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                            {request.status === 'pending' && <Clock className="w-3 h-3" />}
                                                                            {request.status === 'resolved' && <Check className="w-3 h-3" />}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Admin Reply */}
                                                                {request.admin_notes && (
                                                                    <div className="flex justify-start">
                                                                        <div className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm">
                                                                            <p className="text-sm">{request.admin_notes}</p>
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase">Suporte</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                )}
                                            </div>

                                            {/* Input Area */}
                                            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                                <div className="flex gap-2 relative">
                                                    <input
                                                        type="text"
                                                        value={changeRequest}
                                                        onChange={(e) => setChangeRequest(e.target.value)}
                                                        placeholder="Digite sua solicitação ou dúvida..."
                                                        className="flex-1 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all placeholder:text-slate-400 pr-12"
                                                        onKeyDown={(e) => e.key === 'Enter' && changeRequest.trim() && handleSendRequest()}
                                                    />
                                                    <button
                                                        onClick={handleSendRequest}
                                                        disabled={isSendingRequest || !changeRequest.trim()}
                                                        className="absolute right-1.5 top-1.5 p-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:bg-slate-300"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-2 text-center">
                                                    Precisa de ajuda urgente? Contate o suporte técnico diretamente.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </motion.div>
                    )}
                </div>
            )
            }
        </AnimatePresence >
    );
}
