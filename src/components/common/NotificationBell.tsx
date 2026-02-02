import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Check, Clock, XCircle, RotateCcw, AtSign, Shield, ChevronRight, ChevronLeft, CheckCheck, Megaphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { getMicroregiaoById } from '../../data/microregioes';
import { logError } from '../../lib/logger';

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
        cargo?: string;
        municipio?: string;
        microregiao_id?: string;
    };
}

export interface NotificationBellProps {
    className?: string;
    collapsed?: boolean;
    onViewAllRequests?: () => void;
    onNavigate?: (nav: 'strategy' | 'home' | 'settings' | 'dashboard' | 'news') => void;
}

// Chave para localStorage
const READ_NOTIFICATIONS_KEY = 'radar_read_notifications';

// Função para obter IDs lidos do localStorage
const getReadNotifications = (): Set<string> => {
    try {
        const stored = localStorage.getItem(READ_NOTIFICATIONS_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
        return new Set();
    }
};

// Função para salvar IDs lidos no localStorage
const saveReadNotifications = (ids: Set<string>) => {
    localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify([...ids]));
};

// Tipo para controle de abas
type NotificationTab = 'unread' | 'all';

export function NotificationBell({ className = '', collapsed = false, onViewAllRequests, onNavigate }: NotificationBellProps) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [requests, setRequests] = useState<UserRequest[]>([]);
    // const [pendingCount, setPendingCount] = useState<number | null>(null); // Removed unused
    const [loading, setLoading] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<UserRequest | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [readIds, setReadIds] = useState<Set<string>>(getReadNotifications);
    const [activeTab, setActiveTab] = useState<NotificationTab>('unread');
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    // Click outside handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (isOpen &&
                panelRef.current &&
                !panelRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);


    // Verificar se uma notificação é "não lida"
    // Usa 'id-status' para detectar mudanças de status
    const isUnread = (request: UserRequest): boolean => {
        // Chave composta: quando status muda, a notificação fica "não lida" novamente
        const readKey = `${request.id}-${request.status}`;
        if (readIds.has(readKey)) return false;

        if (isAdmin) {
            // Para admins: não lida se está PENDENTE (precisa de resposta)
            return request.status === 'pending';
        } else {
            // Para usuários: não lida se é menção/anúncio pendente OU recebeu resposta (status mudou)
            if (request.status === 'pending') {
                return request.request_type === 'mention' || request.request_type === 'announcement';
            }
            // Se mudou de status (resolveu/rejeitou), é unread (a chave será diferente)
            return true;
        }
    };

    // Marcar como lida (usa chave composta id-status)
    const markAsRead = (request: UserRequest) => {
        const readKey = `${request.id}-${request.status}`;
        const newReadIds = new Set(readIds);
        newReadIds.add(readKey);
        setReadIds(newReadIds);
        saveReadNotifications(newReadIds);
    };

    // Marcar todas como lidas
    const markAllAsRead = () => {
        const unreadReqs = requests.filter(r => isUnread(r));
        const newReadIds = new Set(readIds);
        unreadReqs.forEach(r => newReadIds.add(`${r.id}-${r.status}`));
        setReadIds(newReadIds);
        saveReadNotifications(newReadIds);
    };

    // Contagem de não lidas
    const unreadRequests = requests.filter(r => isUnread(r));
    // Agora usamos apenas a contagem local de não lidas, pois "Pending" não conta mais como badge
    const notificationCount = unreadRequests.length;

    // Lista filtrada baseada na aba ativa
    const filteredRequests = activeTab === 'unread' ? unreadRequests : requests;

    // Carregar solicitações
    const loadRequests = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            // First, fetch the requests
            let query = supabase
                .from('user_requests')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (isAdmin) {
                // Admins veem:
                // 1. Solicitações de TODOS os usuários (suporte, requests, feedback, menções)
                // 2. Announcements APENAS os seus próprios (evita duplicatas)
                query = query.or(`request_type.in.(request,feedback,support,mention),and(request_type.eq.announcement,user_id.eq.${user.id})`);
            } else {
                // Usuários veem apenas suas próprias notificações (incluindo announcements e menções)
                query = query.eq('user_id', user.id);
            }

            const { data: requestsData, error: requestsError } = await query;

            if (requestsError) {
                logError('NotificationBell', 'Error loading requests', requestsError);
                return;
            }

            if (!requestsData || requestsData.length === 0) {
                setRequests([]);
                return;
            }

            // Now fetch the user profiles - fetch individually since batch queries return 400
            const userIds = [...new Set(requestsData.map(r => r.user_id).filter(Boolean))];

            if (userIds.length === 0) {
                setRequests(requestsData);
                return;
            }

            // Fetch each profile individually in parallel
            const profilePromises = userIds.map(async (userId) => {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, nome, email, role, municipio, microregiao_id')
                    .eq('id', userId)
                    .single();

                if (error) return null;
                return data;
            });

            const profilesResults = await Promise.all(profilePromises);
            const profilesData = profilesResults.filter(Boolean);

            // Create a map of user_id -> profile
            const profilesMap = new Map(profilesData.map(p => [p!.id, p]));

            // Merge the data
            const mergedRequests = requestsData.map(req => ({
                ...req,
                user: profilesMap.get(req.user_id) || undefined
            }));

            setRequests(mergedRequests);
        } catch (err) {
            logError('NotificationBell', 'Unexpected error', err);
        } finally {
            setLoading(false);
        }
    }, [user, isAdmin]);

    // Fetch pending count (accurate) for admins (or for user-specific pending)
    // Removed unused loadPendingCount function


    // Atualizar solicitação com resposta
    const handleUpdate = async (requestId: string, status: 'pending' | 'resolved' | 'rejected', note?: string) => {
        setSaving(true);
        try {
            const updateData: Record<string, unknown> = {
                status,
                updated_at: new Date().toISOString()
            };

            if (status !== 'pending') {
                updateData.resolved_by = user?.id;
                updateData.resolved_at = new Date().toISOString();
            } else {
                updateData.resolved_by = null;
                updateData.resolved_at = null;
            }

            if (note !== undefined) {
                updateData.admin_notes = note;
            }

            const { error } = await supabase
                .from('user_requests')
                .update(updateData)
                .eq('id', requestId);

            if (error) {
                // Erro ao atualizar
                return;
            }

            // Atualizar lista local
            setRequests(prev => prev.map(r =>
                r.id === requestId ? { ...r, status, admin_notes: note ?? r.admin_notes } : r
            ));

            setSelectedRequest(null);
            setAdminNote('');
        } catch {
            // Erro inesperado ao atualizar
        } finally {
            setSaving(false);
        }
    };

    // Abrir detalhes e marcar como lida
    const openDetails = (request: UserRequest) => {
        setSelectedRequest(request);
        setAdminNote(request.admin_notes || '');
        // Marca como lida ao abrir (usa chave composta id-status)
        markAsRead(request);
    };

    // Carregar ao abrir (para todos os usuários)
    useEffect(() => {
        if (isOpen && user) {
            loadRequests();
        }
    }, [isOpen, user, loadRequests]);

    useEffect(() => {
        if (user) {
            loadRequests();
            // loadPendingCount();
        }
    }, [user, loadRequests]);

    // ✅ REALTIME: Atualiza automaticamente quando novas solicitações chegam
    // Usando Ref para evitar re-subscrição desnecessária quando loadRequests mudar
    const loadRequestsRef = useRef(loadRequests);
    // const loadPendingCountRef = useRef(loadPendingCount);

    useEffect(() => {
        loadRequestsRef.current = loadRequests;
        // loadPendingCountRef.current = loadPendingCount;
    }, [loadRequests]);

    useEffect(() => {
        if (!user?.id) return;

        console.log('🔔 [NOTIFICATION] Subscribing to realtime changes for user:', user.id);

        const channel = supabase
            .channel('user_requests_changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'user_requests'
                },
                (payload) => {
                    console.log('🔔 [NOTIFICATION] Realtime event received:', payload);

                    // Se for usuário comum, verificar se a notificação é para ele
                    // O payload.new tem os dados da nova linha
                    // Verificar se a notificação é para este usuário
                    // O payload.new tem os dados da nova linha
                    if (payload.new && 'user_id' in payload.new) {
                        const newRecord = payload.new as { user_id: string };
                        if (newRecord.user_id !== user.id) {
                            // Ignorar notificações de outros usuários
                            return;
                        }
                    }

                    // Chama as funções mais recentes via ref
                    loadRequestsRef.current();
                    // loadPendingCountRef.current();
                }
            )
            .subscribe((status) => {
                console.log('🔔 [NOTIFICATION] Subscription status:', status);
            });

        return () => {
            console.log('🔔 [NOTIFICATION] Unsubscribing channel');
            supabase.removeChannel(channel);
        };
    }, [user?.id, isAdmin]); // Dependência user.id e isAdmin


    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
            const isOutsidePanel = panelRef.current && !panelRef.current.contains(target);

            // Só fecha se clicou fora de AMBOS (botão e painel)
            if (isOutsideButton && isOutsidePanel) {
                setIsOpen(false);
                setSelectedRequest(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    // Drawer/Panel Style (Trello-like)
    return (
        <>
            {/* Botão do sino */}
            <button
                onClick={() => setIsOpen(true)}
                className={`
                    group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 
                    ${isOpen ? 'bg-white/20 text-white font-bold shadow-lg ring-1 ring-white/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white font-medium'}
                    ${collapsed ? 'justify-center relative w-full' : ''}
                    ${className}
                `}
                title={collapsed ? "Notificações" : ""}
                ref={buttonRef}
            >
                <div className="relative">
                    <Bell size={20} className={collapsed ? "" : "shrink-0"} />
                    {notificationCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 shadow-sm border border-white dark:border-slate-900">
                            {notificationCount > 9 ? '9+' : notificationCount}
                        </span>
                    )}
                </div>
                {!collapsed && (
                    <span className="truncate text-sm flex-1 text-left">Notificações</span>
                )}
            </button>

            {/* Portal para o Drawer - garante z-index superior a tudo */}
            {isOpen && createPortal(
                <>
                    {/* Backdrop / Overlay */}
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[9998]"
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />

                    {/* Right-Side Drawer Panel */}
                    <div
                        ref={panelRef}
                        className="fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-white dark:bg-slate-900 shadow-2xl z-[9999] animate-slide-in-right border-l border-slate-200 dark:border-slate-800 flex flex-col"
                    >
                        {/* Header do Painel */}
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-teal-50 dark:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400">
                                        <Bell className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">
                                            {isAdmin ? 'Solicitações' : 'Notificações'}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                            {notificationCount > 0 ? `${notificationCount} não lidas` : 'Nenhuma nova notificação'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Abas e botão marcar todas como lidas */}
                            <div className="flex items-center justify-between gap-2">
                                {/* Abas */}
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                    <button
                                        onClick={() => setActiveTab('unread')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'unread'
                                            ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                            }`}
                                    >
                                        Não lidas
                                        {notificationCount > 0 && (
                                            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                                                {notificationCount}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('all')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'all'
                                            ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                            }`}
                                    >
                                        Todas
                                        <span className="ml-1.5 text-slate-400 dark:text-slate-500">
                                            {requests.length}
                                        </span>
                                    </button>
                                </div>

                                {/* Botão Marcar Todas como Lidas */}
                                {notificationCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                                        title="Marcar todas como lidas"
                                    >
                                        <CheckCheck className="w-4 h-4" />
                                        <span className="hidden sm:inline">Marcar lidas</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Área de Conteúdo Scrollável */}
                        <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 p-4">

                            {/* Visualização de Detalhes ou Lista */}
                            {selectedRequest ? (
                                <div className="animate-fade-in">
                                    <button
                                        onClick={() => setSelectedRequest(null)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl mb-4 transition-all shadow-sm group"
                                    >
                                        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                                        Voltar para lista
                                    </button>

                                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                        {/* Header do Card */}
                                        <div className={`p-5 border-b border-slate-100 dark:border-slate-800 ${selectedRequest.request_type === 'announcement' ? 'bg-teal-50/50 dark:bg-teal-900/10' : 'bg-slate-50/50 dark:bg-slate-900/50'}`}>
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex items-center gap-3">
                                                    {/* Avatar / Ícone */}
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${selectedRequest.request_type === 'announcement'
                                                        ? 'bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                        }`}>
                                                        {selectedRequest.request_type === 'announcement' ? (
                                                            <Megaphone size={20} />
                                                        ) : (
                                                            (selectedRequest.user?.nome || 'U')[0].toUpperCase()
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="font-bold text-slate-800 dark:text-slate-100 text-base">
                                                            {selectedRequest.request_type === 'announcement' ? 'Mural da Rede' :
                                                                isAdmin ? selectedRequest.user?.nome : 'Sua Solicitação'}
                                                        </div>

                                                        {/* Subtítulo / Detalhes do Usuário */}
                                                        {selectedRequest.request_type === 'announcement' ? (
                                                            <div className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-0.5">
                                                                Comunicado Oficial
                                                            </div>
                                                        ) : (isAdmin && selectedRequest.user && (
                                                            <div className="flex flex-wrap gap-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                {selectedRequest.user.cargo && (
                                                                    <span className="font-medium text-teal-600 dark:text-teal-400">
                                                                        {selectedRequest.user.cargo}
                                                                    </span>
                                                                )}

                                                                {(selectedRequest.user.cargo && (selectedRequest.user.microregiao_id || selectedRequest.user.municipio)) && (
                                                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                                                )}

                                                                {selectedRequest.user.microregiao_id && (
                                                                    <span>
                                                                        {getMicroregiaoById(selectedRequest.user.microregiao_id)?.nome || 'Regional'}
                                                                    </span>
                                                                )}

                                                                {(selectedRequest.user.microregiao_id && selectedRequest.user.municipio) && (
                                                                    <span className="text-slate-300 dark:text-slate-600">/</span>
                                                                )}

                                                                {selectedRequest.user.municipio && (
                                                                    <span>{selectedRequest.user.municipio}</span>
                                                                )}
                                                            </div>
                                                        ))}

                                                        {/* Data */}
                                                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {new Date(selectedRequest.created_at).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Status Badge - Esconde para anúncios ou mostra badge específico */}
                                                {selectedRequest.request_type !== 'announcement' && (
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${selectedRequest.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30' :
                                                        selectedRequest.status === 'resolved' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30' :
                                                            'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
                                                        }`}>
                                                        {selectedRequest.status === 'pending' ? 'PENDENTE' :
                                                            selectedRequest.status === 'resolved' ? 'RESOLVIDO' : 'REJEITADO'}
                                                    </span>
                                                )}

                                                {/* Badge opcional para anúncios */}
                                                {selectedRequest.request_type === 'announcement' && (
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-900/30 flex items-center gap-1">
                                                        <Megaphone size={12} />
                                                        NOVO
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-5">
                                            {/* Conteúdo Principal */}
                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <p className="text-slate-800 dark:text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
                                                    {selectedRequest.content}
                                                </p>
                                            </div>

                                            {/* Footer / Resposta / Ações */}
                                            {(selectedRequest.admin_notes || isAdmin) && (
                                                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">

                                                    {/* Se for ANÚNCIO, mostra estilo diferente (Call to Action) */}
                                                    {selectedRequest.request_type === 'announcement' && !isAdmin ? (
                                                        <div className="flex justify-end">
                                                            <button
                                                                className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-300 dark:hover:bg-teal-900/30 rounded-lg text-sm font-bold transition-colors"
                                                                onClick={() => {
                                                                    setIsOpen(false);
                                                                    if (onNavigate) {
                                                                        onNavigate('news');
                                                                    }
                                                                }}
                                                            >
                                                                <Megaphone size={16} />
                                                                Ir para o Mural
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        /* Display Padrão para Solicitações */
                                                        <>
                                                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                                                {isAdmin ? 'Área Administrativa' : 'Resposta da Administração'}
                                                            </h5>

                                                            {!isAdmin && selectedRequest.admin_notes && (
                                                                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-lg p-4">
                                                                    <div className="flex gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                                                            <Shield className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">Radar Admin</div>
                                                                            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                                                                {selectedRequest.admin_notes}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {isAdmin && (
                                                                <div className="space-y-4">
                                                                    <textarea
                                                                        value={adminNote}
                                                                        onChange={(e) => setAdminNote(e.target.value)}
                                                                        placeholder="Digite sua resposta ou observação interna..."
                                                                        rows={4}
                                                                        className="w-full px-4 py-3 text-sm text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none placeholder:text-slate-400"
                                                                    />

                                                                    <div className="flex flex-wrap items-center gap-2 justify-end">
                                                                        {selectedRequest.status !== 'pending' && (
                                                                            <button
                                                                                onClick={() => handleUpdate(selectedRequest.id, 'pending', adminNote)}
                                                                                disabled={saving}
                                                                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition-colors border border-amber-200/50"
                                                                            >
                                                                                <RotateCcw className="w-3 h-3" />
                                                                                Reabrir
                                                                            </button>
                                                                        )}
                                                                        {selectedRequest.status !== 'rejected' && (
                                                                            <button
                                                                                onClick={() => handleUpdate(selectedRequest.id, 'rejected', adminNote)}
                                                                                disabled={saving}
                                                                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all shadow-sm"
                                                                            >
                                                                                <XCircle className="w-3 h-3" />
                                                                                Rejeitar
                                                                            </button>
                                                                        )}
                                                                        {selectedRequest.status !== 'resolved' && (
                                                                            <button
                                                                                onClick={() => handleUpdate(selectedRequest.id, 'resolved', adminNote)}
                                                                                disabled={saving}
                                                                                className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 rounded-lg shadow-md hover:shadow-lg transition-all"
                                                                            >
                                                                                {saving ? 'Salvando...' : 'Resolver & Responder'}
                                                                                <Check className="w-3 h-3" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Lista de Notificações + Ver Todos */
                                <>
                                    <div className="space-y-3">
                                        {loading && requests.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 animate-pulse">
                                                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-full mb-3" />
                                                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                                            </div>
                                        ) : filteredRequests.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                                                    <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                                                </div>
                                                <h4 className="text-slate-900 dark:text-slate-100 font-bold text-lg mb-1">
                                                    {activeTab === 'unread' ? 'Tudo em dia!' : 'Nenhuma notificação'}
                                                </h4>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[200px]">
                                                    {activeTab === 'unread'
                                                        ? 'Você não tem notificações não lidas.'
                                                        : 'Você ainda não tem notificações.'}
                                                </p>
                                            </div>
                                        ) : (
                                            filteredRequests.slice(0, 20).map(request => {
                                                const unread = isUnread(request);
                                                return (
                                                    <div
                                                        key={request.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openDetails(request);
                                                        }}
                                                        className={`
                                                        group relative bg-white dark:bg-slate-900 rounded-xl p-4 cursor-pointer transition-all duration-200
                                                        border border-transparent hover:border-teal-500/30 hover:shadow-md
                                                        ${unread ? 'shadow-sm ring-1 ring-blue-500/20 border-blue-500/10 bg-blue-50/10' : 'shadow-sm border-slate-200/60 dark:border-slate-800'}
                                                    `}
                                                    >
                                                        <div className="flex gap-4">
                                                            {/* Ícone de Status */}
                                                            <div className={`
                                                            w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border
                                                            ${request.request_type === 'mention' ? 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800' :
                                                                    request.request_type === 'announcement' ? 'bg-teal-100 text-teal-600 border-teal-200 dark:bg-teal-900/30 dark:border-teal-800' :
                                                                        request.status === 'pending' ? 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800' :
                                                                            request.status === 'resolved' ? 'bg-green-100 text-green-600 border-green-200 dark:bg-green-900/30 dark:border-green-800' :
                                                                                'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:border-red-800'}
                                                        `}>
                                                                {request.request_type === 'mention' ? <AtSign className="w-5 h-5" /> :
                                                                    request.request_type === 'announcement' ? <Megaphone className="w-5 h-5" /> :
                                                                        request.status === 'pending' ? <Clock className="w-5 h-5" /> :
                                                                            request.status === 'resolved' ? <Check className="w-5 h-5" /> :
                                                                                <XCircle className="w-5 h-5" />}
                                                            </div>

                                                            <div className="flex-1 min-w-0 pt-0.5">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <span className={`text-sm ${unread ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                                                        {request.request_type === 'mention' ? 'Menção' :
                                                                            request.request_type === 'announcement' ? 'Comunicado' :
                                                                                isAdmin ? (request.user?.nome || 'Usuário') : 'Solicitação'}
                                                                    </span>
                                                                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                                                                        {new Date(request.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                                                    </span>
                                                                </div>

                                                                <p className={`text-sm leading-snug line-clamp-2 ${unread ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                    {request.content}
                                                                </p>

                                                                {/* Footer com Status e Ações Rápida (se admin) */}
                                                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 border-dashed">
                                                                    <span className={`
                                                                    inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                                                                    ${request.status === 'pending' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                            request.status === 'resolved' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                                'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}
                                                                `}>
                                                                        {request.status === 'pending' ? 'Pendente' :
                                                                            request.status === 'resolved' ? 'Resolvido' : 'Rejeitado'}
                                                                    </span>

                                                                    <span className="text-xs text-teal-600 dark:text-teal-400 font-medium group-hover:translate-x-1 transition-transform flex items-center">
                                                                        Ver detalhes <ChevronRight size={12} className="ml-0.5" />
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Unread Indicator Dot */}
                                                        {unread && (
                                                            <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Ver Todos Button - For admins with requests */}
                                    {isAdmin && requests.length > 0 && onViewAllRequests && (
                                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                            <button
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    onViewAllRequests();
                                                }}
                                                className="w-full py-3 text-sm font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-xl transition-colors flex items-center justify-center gap-2"
                                            >
                                                Ver todas as solicitações
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    );
}
