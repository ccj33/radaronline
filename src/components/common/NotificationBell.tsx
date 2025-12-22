import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Clock, XCircle, MessageSquare, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';

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

interface NotificationBellProps {
    className?: string;
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

export function NotificationBell({ className = '' }: NotificationBellProps) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [requests, setRequests] = useState<UserRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<UserRequest | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [saving, setSaving] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [readIds, setReadIds] = useState<Set<string>>(getReadNotifications);

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    // Verificar se uma notificação é "não lida"
    const isUnread = (request: UserRequest): boolean => {
        if (readIds.has(request.id)) return false;

        if (isAdmin) {
            // Para admins: não lida se está pendente
            return request.status === 'pending';
        } else {
            // Para usuários: não lida se tem resposta do admin
            return !!(request.admin_notes && request.status !== 'pending');
        }
    };

    // Marcar como lida
    const markAsRead = (requestId: string) => {
        const newReadIds = new Set(readIds);
        newReadIds.add(requestId);
        setReadIds(newReadIds);
        saveReadNotifications(newReadIds);
    };

    // Contagem de não lidas
    const notificationCount = requests.filter(r => isUnread(r)).length;

    // Carregar solicitações
    const loadRequests = async () => {
        if (!user) return;

        setLoading(true);
        try {
            let query = supabase
                .from('user_requests')
                .select(`
                    *,
                    user:profiles!user_id (nome, email)
                `)
                .order('created_at', { ascending: false })
                .limit(20);

            // Admins veem todas, usuários veem só as suas
            if (!isAdmin) {
                query = query.eq('user_id', user.id);
            }

            const { data, error } = await query;

            if (error) {
                console.error('[Notifications] Erro ao carregar:', error);
                return;
            }

            setRequests(data || []);
        } catch (error) {
            console.error('[Notifications] Erro inesperado:', error);
        } finally {
            setLoading(false);
        }
    };

    // Atualizar solicitação com resposta
    const handleUpdate = async (requestId: string, status: 'pending' | 'resolved' | 'rejected', note?: string) => {
        setSaving(true);
        try {
            const updateData: any = {
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
                console.error('[Notifications] Erro ao atualizar:', error);
                return;
            }

            // Atualizar lista local
            setRequests(prev => prev.map(r =>
                r.id === requestId ? { ...r, status, admin_notes: note ?? r.admin_notes } : r
            ));

            setSelectedRequest(null);
            setAdminNote('');
        } catch (error) {
            console.error('[Notifications] Erro inesperado:', error);
        } finally {
            setSaving(false);
        }
    };

    // Abrir detalhes e marcar como lida
    const openDetails = (request: UserRequest) => {
        setSelectedRequest(request);
        setAdminNote(request.admin_notes || '');
        // Marca como lida ao abrir
        markAsRead(request.id);
    };

    // Carregar ao abrir (para todos os usuários)
    useEffect(() => {
        if (isOpen && user) {
            loadRequests();
        }
    }, [isOpen, user]);

    // Carregar ao montar (para badge) - para todos os usuários
    useEffect(() => {
        if (user) {
            loadRequests();
        }
    }, [user]);

    // ✅ REALTIME: Atualiza automaticamente quando novas solicitações chegam
    // Funciona para todos: admins veem novas solicitações, usuários veem respostas
    useEffect(() => {
        if (!user) return;

        console.log('[Notifications] Iniciando subscription em tempo real...');

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
                    console.log('[Notifications] Mudança detectada:', payload.eventType);
                    // Recarrega a lista quando houver mudanças
                    loadRequests();
                }
            )
            .subscribe((status) => {
                console.log('[Notifications] Status da subscription:', status);
            });

        return () => {
            console.log('[Notifications] Removendo subscription...');
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSelectedRequest(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Botão do sino */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Notificações"
            >
                <Bell className="w-5 h-5 text-white/80" />
                {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                )}
            </button>

            {/* Dropdown - abre para cima */}
            {isOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            <span className="font-medium text-sm">
                                {isAdmin ? 'Solicitações de Usuários' : 'Minhas Solicitações'}
                            </span>
                            {notificationCount > 0 && (
                                <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                                    {notificationCount}
                                </span>
                            )}
                        </div>
                        <button onClick={() => { setIsOpen(false); setSelectedRequest(null); }} className="p-1 hover:bg-white/20 rounded">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Modal de detalhes */}
                    {selectedRequest ? (
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-slate-700">Detalhes da Solicitação</h4>
                                <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Conteúdo da solicitação */}
                            <div className="bg-slate-50 rounded-lg p-3 mb-3">
                                {isAdmin && (
                                    <p className="text-xs text-slate-500 mb-1">De: {selectedRequest.user?.nome} ({selectedRequest.user?.email})</p>
                                )}
                                <p className="text-sm text-slate-700">{selectedRequest.content}</p>
                                <p className="text-xs text-slate-400 mt-2">
                                    {new Date(selectedRequest.created_at).toLocaleString('pt-BR')}
                                </p>
                            </div>

                            {/* Status atual */}
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs text-slate-500">Status:</span>
                                <span className={`text-xs px-2 py-1 rounded font-medium ${selectedRequest.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                    selectedRequest.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                    {selectedRequest.status === 'pending' ? '⏳ Pendente' :
                                        selectedRequest.status === 'resolved' ? '✅ Resolvido' : '❌ Rejeitado'}
                                </span>
                            </div>

                            {/* Resposta do admin (somente leitura para usuários) */}
                            {!isAdmin && selectedRequest.admin_notes && (
                                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-3">
                                    <p className="text-xs font-medium text-teal-700 mb-1">Resposta do Administrador:</p>
                                    <p className="text-sm text-slate-700">{selectedRequest.admin_notes}</p>
                                </div>
                            )}

                            {/* Para admins: campo de resposta e botões */}
                            {isAdmin && (
                                <>
                                    <div className="mb-3">
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Resposta para o usuário (opcional)
                                        </label>
                                        <textarea
                                            value={adminNote}
                                            onChange={(e) => setAdminNote(e.target.value)}
                                            placeholder="Escreva uma resposta ou observação..."
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm text-slate-700 bg-white rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                                        />
                                    </div>

                                    {/* Botões de ação (apenas para admins) */}
                                    <div className="flex items-center justify-end gap-2">
                                        {selectedRequest.status !== 'pending' && (
                                            <button
                                                onClick={() => handleUpdate(selectedRequest.id, 'pending', adminNote)}
                                                disabled={saving}
                                                className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                                Reabrir
                                            </button>
                                        )}
                                        {selectedRequest.status !== 'resolved' && (
                                            <button
                                                onClick={() => handleUpdate(selectedRequest.id, 'resolved', adminNote)}
                                                disabled={saving}
                                                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                            >
                                                <Check className="w-3 h-3" />
                                                Resolver
                                            </button>
                                        )}
                                        {selectedRequest.status !== 'rejected' && (
                                            <button
                                                onClick={() => handleUpdate(selectedRequest.id, 'rejected', adminNote)}
                                                disabled={saving}
                                                className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-400 text-white rounded hover:bg-slate-500 disabled:opacity-50"
                                            >
                                                <X className="w-3 h-3" />
                                                Rejeitar
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        /* Lista */
                        <div className="max-h-80 overflow-y-auto">
                            {loading ? (
                                <div className="p-4 text-center text-slate-400 text-sm">
                                    Carregando...
                                </div>
                            ) : requests.length === 0 ? (
                                <div className="p-6 text-center">
                                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-400 text-sm">Nenhuma solicitação</p>
                                </div>
                            ) : (
                                requests.map(request => {
                                    const unread = isUnread(request);
                                    return (
                                        <button
                                            key={request.id}
                                            onClick={() => openDetails(request)}
                                            className={`w-full text-left p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors relative ${unread
                                                ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                                : 'bg-white'
                                                }`}
                                        >
                                            {/* Indicador de não lida */}
                                            {unread && (
                                                <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                                            )}
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${request.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                                    request.status === 'resolved' ? 'bg-green-100 text-green-600' :
                                                        'bg-red-100 text-red-600'
                                                    }`}>
                                                    {request.status === 'pending' ? <Clock className="w-4 h-4" /> :
                                                        request.status === 'resolved' ? <Check className="w-4 h-4" /> :
                                                            <XCircle className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm truncate ${unread ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>
                                                            {isAdmin ? (request.user?.nome || 'Usuário') : 'Minha solicitação'}
                                                        </span>
                                                        <span className={`text-xs px-1.5 py-0.5 rounded ${request.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                            request.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {request.status === 'pending' ? 'Pendente' :
                                                                request.status === 'resolved' ? 'Resolvido' : 'Rejeitado'}
                                                        </span>
                                                        {request.admin_notes && (
                                                            <MessageSquare className="w-3 h-3 text-teal-500" />
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-600 mt-1 line-clamp-1">
                                                        {request.content}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        {new Date(request.created_at).toLocaleString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
