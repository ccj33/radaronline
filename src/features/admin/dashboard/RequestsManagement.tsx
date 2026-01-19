import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, ChevronLeft, ChevronRight, Check, XCircle, Clock,
    AtSign, RotateCcw, X, Shield, ClipboardList, User as UserIcon, Trash2, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../auth/AuthContext';
import { MICROREGIOES, getMicroregiaoById } from '../../../data/microregioes';
import { useToast } from '../../../components/common/Toast';
import { log, logError } from '../../../lib/logger';

interface UserRequest {
    id: string;
    user_id: string;
    request_type: string;
    content: string;
    status: 'pending' | 'resolved' | 'rejected';
    admin_notes: string | null;
    created_at: string;
    resolved_at?: string;
    resolved_by?: string;
    user?: {
        nome: string;
        email: string;
        role?: string;
        municipio?: string;
        microregiao_id?: string;
    };
}

type StatusFilter = 'all' | 'pending' | 'resolved' | 'rejected';
type TypeFilter = 'all' | 'profile_change' | 'mention' | 'system';

export function RequestsManagement() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [requests, setRequests] = useState<UserRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 20;

    // Filters
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [microFilter, setMicroFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Detail modal
    const [selectedRequest, setSelectedRequest] = useState<UserRequest | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    const isSuperAdmin = user?.role === 'superadmin';

    // Load requests
    const loadRequests = useCallback(async () => {
        if (!user || !isAdmin) return;

        setLoading(true);
        try {
            // First get count
            let countQuery = supabase
                .from('user_requests')
                .select('*', { count: 'exact', head: true });

            if (statusFilter !== 'all') {
                countQuery = countQuery.eq('status', statusFilter);
            }
            if (typeFilter !== 'all') {
                countQuery = countQuery.eq('request_type', typeFilter);
            }

            const { count } = await countQuery;
            setTotalCount(count || 0);

            // Now get actual data
            let query = supabase
                .from('user_requests')
                .select('*')
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }
            if (typeFilter !== 'all') {
                query = query.eq('request_type', typeFilter);
            }

            const { data: requestsData, error } = await query;

            if (error) {
                logError('RequestsManagement', 'Error loading requests', error);
                return;
            }

            if (!requestsData || requestsData.length === 0) {
                setRequests([]);
                return;
            }

            // Fetch profiles - fetch individually since batch queries return 400
            const userIds = [...new Set(requestsData.map(r => r.user_id).filter(Boolean))];
            log('RequestsManagement', `Fetching profiles for ${userIds.length} user IDs`);

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

                if (error) {
                    log('RequestsManagement', `Error fetching profile for ${userId}`);
                    return null;
                }
                return data;
            });

            const profilesResults = await Promise.all(profilePromises);
            const profilesData = profilesResults.filter(Boolean);

            log('RequestsManagement', `Profiles fetched: ${profilesData.length} of ${userIds.length}`);

            const profilesMap = new Map(profilesData.map(p => [p!.id, p]));

            const mergedRequests = requestsData.map(req => ({
                ...req,
                user: profilesMap.get(req.user_id) || undefined
            }));

            setRequests(mergedRequests);
        } catch (err) {
            logError('RequestsManagement', 'Unexpected error', err);
        } finally {
            setLoading(false);
        }
    }, [user, isAdmin, page, statusFilter, typeFilter]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    // Realtime subscription
    const loadRequestsRef = useRef(loadRequests);
    useEffect(() => {
        loadRequestsRef.current = loadRequests;
    }, [loadRequests]);

    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('requests_management_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'user_requests' },
                () => {
                    if (loadRequestsRef.current) {
                        loadRequestsRef.current();
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id]); // Dependência apenas do ID (primitivo estável)

    // Filter displayed requests by micro and search
    const filteredRequests = useMemo(() => {
        let result = requests;

        if (microFilter !== 'all') {
            result = result.filter(r => r.user?.microregiao_id === microFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.content.toLowerCase().includes(q) ||
                r.user?.nome?.toLowerCase().includes(q) ||
                r.user?.email?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [requests, microFilter, searchQuery]);

    // Handle status update
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
                showToast('Erro ao atualizar solicitação', 'error');
                return;
            }

            showToast('Solicitação atualizada!', 'success');
            setSelectedRequest(null);
            setAdminNote('');
            loadRequests();
        } catch {
            showToast('Erro inesperado', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Handle delete request
    const handleDelete = async (requestId: string) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('user_requests')
                .delete()
                .eq('id', requestId);

            if (error) {
                showToast('Erro ao excluir solicitação', 'error');
                return;
            }

            showToast('Solicitação excluída com sucesso!', 'success');
            setSelectedRequest(null);
            setDeleteConfirmId(null);
            loadRequests();
        } catch {
            showToast('Erro inesperado ao excluir', 'error');
        } finally {
            setSaving(false);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Clock size={12} /> Pendente</span>;
            case 'resolved':
                return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><Check size={12} /> Resolvido</span>;
            case 'rejected':
                return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle size={12} /> Rejeitado</span>;
            default:
                return null;
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'mention':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><AtSign size={10} /> Menção</span>;
            case 'profile_change':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"><UserIcon size={10} /> Perfil</span>;
            case 'system':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"><Shield size={10} /> Sistema</span>;
            default:
                return <span className="text-[10px] text-slate-500">{type}</span>;
        }
    };

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-slate-500">Acesso restrito a administradores.</p>
            </div>
        );
    }

    // Counts
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const resolvedCount = requests.filter(r => r.status === 'resolved').length;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl text-white shadow-lg">
                            <ClipboardList size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Central de Solicitações</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Gerencie todas as solicitações dos usuários
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-4">
                        <div className="text-center px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</div>
                            <div className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase">Pendentes</div>
                        </div>
                        <div className="text-center px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{resolvedCount}</div>
                            <div className="text-[10px] font-bold text-green-700 dark:text-green-500 uppercase">Resolvidos</div>
                        </div>
                        <div className="text-center px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="text-2xl font-bold text-slate-600 dark:text-slate-300">{totalCount}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase">Total</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, email ou conteúdo..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                </div>

                {/* Micro Filter */}
                <select
                    value={microFilter}
                    onChange={(e) => setMicroFilter(e.target.value)}
                    className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500/20"
                >
                    <option value="all">Todas Microrregiões</option>
                    {MICROREGIOES.map(m => (
                        <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                </select>

                {/* Status Filter */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                    {(['all', 'pending', 'resolved', 'rejected'] as StatusFilter[]).map(s => (
                        <button
                            key={s}
                            onClick={() => { setStatusFilter(s); setPage(1); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === s
                                ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendentes' : s === 'resolved' ? 'Resolvidos' : 'Rejeitados'}
                        </button>
                    ))}
                </div>

                {/* Type Filter */}
                <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value as TypeFilter); setPage(1); }}
                    className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500/20"
                >
                    <option value="all">Todos os Tipos</option>
                    <option value="profile_change">Alteração de Perfil</option>
                    <option value="mention">Menção</option>
                    <option value="system">Sistema</option>
                </select>

                {/* Refresh */}
                <button
                    onClick={loadRequests}
                    className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Atualizar"
                >
                    <RotateCcw size={18} />
                </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <ClipboardList size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">Nenhuma solicitação encontrada</p>
                        <p className="text-sm">Ajuste os filtros ou aguarde novas solicitações</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuário</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Micro</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Perfil</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Conteúdo</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredRequests.map((request, idx) => (
                                    <tr
                                        key={request.id}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-900/30'}`}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm">
                                                    {(request.user?.nome || 'U')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-800 dark:text-slate-100 text-sm">{request.user?.nome || 'Usuário'}</div>
                                                    <div className="text-xs text-slate-500">{request.user?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-slate-600 dark:text-slate-400">
                                                {request.user?.microregiao_id ? getMicroregiaoById(request.user.microregiao_id)?.nome || '-' : '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${request.user?.role === 'superadmin' || request.user?.role === 'admin'
                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                {request.user?.role === 'superadmin' ? 'Admin' : request.user?.role === 'admin' ? 'Gestor' : 'Usuário'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 max-w-[300px]">
                                            <p className="text-sm text-slate-700 dark:text-slate-300 truncate" title={request.content}>
                                                {request.content}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">{getStatusBadge(request.status)}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-slate-500">
                                                {new Date(request.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => { setSelectedRequest(request); setAdminNote(request.admin_notes || ''); }}
                                                className="px-3 py-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                                            >
                                                Ver detalhes
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                        Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} de {totalCount}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedRequest && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedRequest(null)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                                        {(selectedRequest.user?.nome || 'U')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white">{selectedRequest.user?.nome || 'Usuário'}</div>
                                        <div className="text-xs text-slate-500">{selectedRequest.user?.email}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedRequest(null)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    {getTypeBadge(selectedRequest.request_type)}
                                    {getStatusBadge(selectedRequest.status)}
                                    <span className="text-xs text-slate-400">
                                        {new Date(selectedRequest.created_at).toLocaleString('pt-BR')}
                                    </span>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                                    <p className="text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap">
                                        {selectedRequest.content}
                                    </p>
                                </div>

                                {/* Admin Response */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Resposta / Observação
                                    </label>
                                    <textarea
                                        value={adminNote}
                                        onChange={(e) => setAdminNote(e.target.value)}
                                        placeholder="Digite sua resposta ou observação..."
                                        rows={3}
                                        className="w-full px-4 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-2 pt-2">
                                    {selectedRequest.status !== 'pending' && (
                                        <button
                                            onClick={() => handleUpdate(selectedRequest.id, 'pending', adminNote)}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition-colors"
                                        >
                                            <RotateCcw size={14} /> Reabrir
                                        </button>
                                    )}
                                    {selectedRequest.status !== 'rejected' && (
                                        <button
                                            onClick={() => handleUpdate(selectedRequest.id, 'rejected', adminNote)}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                        >
                                            <XCircle size={14} /> Rejeitar
                                        </button>
                                    )}
                                    {selectedRequest.status !== 'resolved' && (
                                        <button
                                            onClick={() => handleUpdate(selectedRequest.id, 'resolved', adminNote)}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-teal-600 text-white hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
                                        >
                                            {saving ? 'Salvando...' : 'Resolver'}
                                            <Check size={14} />
                                        </button>
                                    )}
                                </div>
                                {/* SuperAdmin Delete Action */}
                                {isSuperAdmin && (
                                    <div className="flex justify-start border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
                                        <button
                                            onClick={() => setDeleteConfirmId(selectedRequest.id)}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} /> Excluir permanentemente
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirmId && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeleteConfirmId(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700"
                        >
                            {/* Header with warning icon */}
                            <div className="bg-gradient-to-br from-red-500 to-rose-600 px-6 py-5 text-center">
                                <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    <AlertTriangle size={32} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Confirmar Exclusão</h3>
                                <p className="text-sm text-red-100 mt-1">Esta ação não pode ser desfeita</p>
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                <p className="text-slate-600 dark:text-slate-300 text-center text-sm leading-relaxed">
                                    Você está prestes a excluir permanentemente esta solicitação.
                                    Todos os dados associados serão removidos do sistema.
                                </p>

                                <div className="mt-6 flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => setDeleteConfirmId(null)}
                                        disabled={saving}
                                        className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(deleteConfirmId)}
                                        disabled={saving}
                                        className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 rounded-xl shadow-lg shadow-red-500/25 transition-all flex items-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Excluindo...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={16} />
                                                Sim, excluir
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
