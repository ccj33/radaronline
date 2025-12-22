import React, { useState, useEffect } from 'react';
import { X, Check, User as UserIcon, Save, Send } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/common/Toast';

// =====================================
// AVATARES DISPONÍVEIS - Variados
// =====================================

// Categorias de avatares
export const AVATAR_CATEGORIES = [
    { id: 'pessoas', label: '👤 Pessoas' },
    { id: 'formas', label: '🔷 Formas' },
    { id: 'emojis', label: '👍 Emojis' },
    { id: 'robos', label: '🤖 Robôs' },
    { id: 'cores', label: '🎨 Cores' },
    { id: 'abstrato', label: '✨ Abstrato' },
];

export const AVATARS = [
    // Pessoas - notionists-neutral style (profissional e variado)
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
    { id: 'p16', seed: 'Andre', label: 'Pessoa 17', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p17', seed: 'Renata', label: 'Pessoa 18', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p18', seed: 'Bruno', label: 'Pessoa 19', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p19', seed: 'Mariana', label: 'Pessoa 20', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p20', seed: 'Diego', label: 'Pessoa 21', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p21', seed: 'Isabela', label: 'Pessoa 22', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p23', seed: 'Amanda', label: 'Pessoa 23', category: 'pessoas', style: 'notionists-neutral' },
    { id: 'p24', seed: 'Eduardo', label: 'Pessoa 24', category: 'pessoas', style: 'notionists-neutral' },

    // Formas - fun-emoji style
    { id: 'a1', seed: 'cat', label: 'Forma 1', category: 'formas', style: 'fun-emoji' },
    { id: 'a2', seed: 'dog', label: 'Forma 2', category: 'formas', style: 'fun-emoji' },
    { id: 'a3', seed: 'lion', label: 'Forma 3', category: 'formas', style: 'fun-emoji' },
    { id: 'a4', seed: 'panda', label: 'Forma 4', category: 'formas', style: 'fun-emoji' },
    { id: 'a5', seed: 'fox', label: 'Forma 5', category: 'formas', style: 'fun-emoji' },
    { id: 'a6', seed: 'owl', label: 'Forma 6', category: 'formas', style: 'fun-emoji' },

    // Emojis - thumbs style (mãos/emojis)
    { id: 'e1', seed: 'like', label: 'Joinha', category: 'emojis', style: 'thumbs' },
    { id: 'e2', seed: 'cool', label: 'Legal', category: 'emojis', style: 'thumbs' },
    { id: 'e3', seed: 'happy', label: 'Feliz', category: 'emojis', style: 'thumbs' },
    { id: 'e4', seed: 'star', label: 'Estrela', category: 'emojis', style: 'thumbs' },
    { id: 'e5', seed: 'love', label: 'Amor', category: 'emojis', style: 'thumbs' },
    { id: 'e6', seed: 'peace', label: 'Paz', category: 'emojis', style: 'thumbs' },

    // Robôs - bottts style
    { id: 'r1', seed: 'Robot1', label: 'Robô 1', category: 'robos', style: 'bottts' },
    { id: 'r2', seed: 'Robot2', label: 'Robô 2', category: 'robos', style: 'bottts' },
    { id: 'r3', seed: 'Robot3', label: 'Robô 3', category: 'robos', style: 'bottts' },
    { id: 'r4', seed: 'Robot4', label: 'Robô 4', category: 'robos', style: 'bottts' },
    { id: 'r5', seed: 'Robot5', label: 'Robô 5', category: 'robos', style: 'bottts' },
    { id: 'r6', seed: 'Robot6', label: 'Robô 6', category: 'robos', style: 'bottts' },

    // Cores - shapes style (formas geométricas)
    { id: 'c1', seed: 'Vermelho', label: 'Vermelho', category: 'cores', style: 'shapes' },
    { id: 'c2', seed: 'Azul', label: 'Azul', category: 'cores', style: 'shapes' },
    { id: 'c3', seed: 'Verde', label: 'Verde', category: 'cores', style: 'shapes' },
    { id: 'c4', seed: 'Amarelo', label: 'Amarelo', category: 'cores', style: 'shapes' },
    { id: 'c5', seed: 'Roxo', label: 'Roxo', category: 'cores', style: 'shapes' },
    { id: 'c6', seed: 'Laranja', label: 'Laranja', category: 'cores', style: 'shapes' },

    // Abstrato - rings style
    { id: 'x1', seed: 'Alpha', label: 'Alpha', category: 'abstrato', style: 'rings' },
    { id: 'x2', seed: 'Beta', label: 'Beta', category: 'abstrato', style: 'rings' },
    { id: 'x3', seed: 'Gamma', label: 'Gamma', category: 'abstrato', style: 'rings' },
    { id: 'x4', seed: 'Delta', label: 'Delta', category: 'abstrato', style: 'rings' },
    { id: 'x5', seed: 'Omega', label: 'Omega', category: 'abstrato', style: 'rings' },
    { id: 'x6', seed: 'Sigma', label: 'Sigma', category: 'abstrato', style: 'rings' },
];

export function getAvatarUrl(avatarId: string): string {
    const avatar = AVATARS.find(a => a.id === avatarId);
    const seed = avatar?.seed || 'User';
    const style = (avatar as any)?.style || 'personas';

    // Cores vibrantes para fundo
    const colors = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';

    // Usando o estilo específico de cada avatar
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=${colors}`;
}

// =====================================
// COMPONENTE PRINCIPAL
// =====================================

interface UserSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
    const { user, refreshUser } = useAuth();
    const { showToast } = useToast();

    const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarId || 'p22');
    const [isSaving, setIsSaving] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [changeRequest, setChangeRequest] = useState('');
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const [myRequests, setMyRequests] = useState<any[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);

    // Avatares filtrados por categoria
    const filteredAvatars = selectedCategory === 'all'
        ? AVATARS
        : AVATARS.filter(a => a.category === selectedCategory);

    // Carregar minhas solicitações
    const loadMyRequests = async () => {
        if (!user) return;
        setLoadingRequests(true);
        try {
            const { data, error } = await supabase
                .from('user_requests')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (!error && data) {
                setMyRequests(data);
            }
        } catch (e) {
            console.error('[UserSettings] Erro ao carregar solicitações:', e);
        } finally {
            setLoadingRequests(false);
        }
    };

    // Resetar quando abrir
    useEffect(() => {
        if (isOpen && user) {
            setSelectedAvatar(user.avatarId || 'p22');
            setSelectedCategory('all');
            setChangeRequest('');
            loadMyRequests();
        }
    }, [isOpen, user]);

    if (!isOpen || !user) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    avatar_id: selectedAvatar,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) {
                console.error('[UserSettings] Erro ao salvar:', error);
                showToast('Erro ao salvar configurações', 'error');
                return;
            }

            // ✅ Atualiza o contexto automaticamente (sem precisar recarregar!)
            await refreshUser();

            showToast('Avatar atualizado com sucesso!', 'success');
            onClose();
        } catch (error) {
            console.error('[UserSettings] Erro inesperado:', error);
            showToast('Erro ao salvar configurações', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendRequest = async () => {
        if (!changeRequest.trim()) {
            showToast('Escreva a alteração desejada', 'error');
            return;
        }
        setIsSendingRequest(true);
        try {
            const { error } = await supabase
                .from('user_requests')
                .insert({
                    user_id: user.id,
                    request_type: 'profile_change',
                    content: changeRequest.trim(),
                    status: 'pending'
                });

            if (error) {
                console.error('[UserSettings] Erro ao enviar solicitação:', error);
                showToast('Erro ao enviar solicitação', 'error');
                return;
            }

            showToast('Solicitação enviada para os administradores!', 'success');
            setChangeRequest('');

            // ✅ Recarrega a lista de solicitações para ver a nova
            console.log('[UserSettings] Recarregando lista de solicitações...');
            await loadMyRequests();
            console.log('[UserSettings] Lista recarregada!');
        } catch (error) {
            console.error('[UserSettings] Erro inesperado:', error);
            showToast('Erro ao enviar solicitação', 'error');
        } finally {
            setIsSendingRequest(false);
        }
    };

    const hasChanges = selectedAvatar !== (user.avatarId || 'p22');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-teal-500 to-emerald-500 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <UserIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Meu Perfil</h2>
                            <p className="text-xs opacity-80">Personalize suas configurações</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-6 overflow-y-auto max-h-[65vh]">
                    {/* Preview do Avatar atual */}
                    <div className="flex flex-col items-center gap-3">
                        <img
                            src={getAvatarUrl(selectedAvatar)}
                            alt="Avatar selecionado"
                            className="w-20 h-20 rounded-full border-4 border-teal-500 shadow-lg bg-white"
                        />
                        <div className="text-center">
                            <p className="font-medium text-slate-700">{user.nome}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                    </div>

                    {/* Informações do usuário (somente leitura) */}
                    <div className="bg-slate-50 rounded-xl p-4">
                        <h3 className="text-sm font-medium text-slate-600 mb-3">Suas informações</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Nome</label>
                                <p className="text-sm text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-200">{user.nome}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                                <p className="text-sm text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-200">{user.email}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Função</label>
                                <p className="text-sm text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-200 capitalize">
                                    {user.role === 'superadmin' ? 'Super Admin' :
                                        user.role === 'admin' ? 'Administrador' :
                                            user.role === 'gestor' ? 'Gestor' : 'Usuário'}
                                </p>
                            </div>
                        </div>

                        {/* Campo para solicitar alteração */}
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <label className="block text-xs font-medium text-slate-600 mb-2">
                                Solicitar alteração de dados
                            </label>
                            <textarea
                                value={changeRequest}
                                onChange={(e) => setChangeRequest(e.target.value)}
                                placeholder="Descreva a alteração desejada (ex: Alterar nome para João Silva)..."
                                rows={2}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                            />
                            <button
                                onClick={handleSendRequest}
                                disabled={!changeRequest.trim() || isSendingRequest}
                                className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="w-3 h-3" />
                                {isSendingRequest ? 'Enviando...' : 'Enviar aos Admins'}
                            </button>
                        </div>

                        {/* Histórico de solicitações */}
                        {myRequests.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <label className="block text-xs font-medium text-slate-600 mb-2">
                                    Minhas Solicitações
                                </label>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {myRequests.map((req) => (
                                        <div key={req.id} className={`p-2 rounded-lg text-xs ${req.status === 'pending' ? 'bg-amber-50 border border-amber-200' :
                                            req.status === 'resolved' ? 'bg-green-50 border border-green-200' :
                                                'bg-red-50 border border-red-200'
                                            }`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                    req.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    {req.status === 'pending' ? '⏳ Pendente' :
                                                        req.status === 'resolved' ? '✅ Resolvido' : '❌ Rejeitado'}
                                                </span>
                                                <span className="text-slate-400">
                                                    {new Date(req.created_at).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                            <p className="text-slate-600 line-clamp-2">{req.content}</p>
                                            {req.admin_notes && (
                                                <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                                                    <p className="text-xs text-slate-500 font-medium mb-0.5">Resposta do Admin:</p>
                                                    <p className="text-slate-700">{req.admin_notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Galeria de Avatares */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                            Escolha seu avatar
                        </label>

                        {/* Filtro por categoria */}
                        <div className="flex gap-2 mb-4 flex-wrap">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${selectedCategory === 'all'
                                    ? 'bg-teal-500 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                Todos
                            </button>
                            {AVATAR_CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${selectedCategory === cat.id
                                        ? 'bg-teal-500 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-6 gap-2">
                            {filteredAvatars.map((avatar) => (
                                <button
                                    key={avatar.id}
                                    onClick={() => setSelectedAvatar(avatar.id)}
                                    className={`relative p-1 rounded-xl transition-all duration-200 ${selectedAvatar === avatar.id
                                        ? 'ring-2 ring-teal-500 bg-teal-50 scale-105'
                                        : 'hover:bg-slate-50 hover:scale-105'
                                        }`}
                                    title={avatar.label}
                                >
                                    <img
                                        src={getAvatarUrl(avatar.id)}
                                        alt={avatar.label}
                                        className="w-full aspect-square rounded-lg bg-white"
                                    />
                                    {selectedAvatar === avatar.id && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center shadow-md">
                                            <Check className="w-2.5 h-2.5 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Informações adicionais (somente leitura) */}
                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-sm font-medium text-slate-500 mb-3">Informações da conta</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between py-2 px-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-500">Email</span>
                                <span className="text-slate-700">{user.email}</span>
                            </div>
                            <div className="flex justify-between py-2 px-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-500">Função</span>
                                <span className="capitalize text-slate-700">
                                    {user.role === 'superadmin' ? 'Super Admin' :
                                        user.role === 'admin' ? 'Administrador' :
                                            user.role === 'gestor' ? 'Gestor' : 'Usuário'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${hasChanges
                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-lg hover:scale-[1.02]'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
