import { useMemo } from 'react';
import { Users, Mail, MapPin, User as UserIcon } from 'lucide-react';
import { User } from '../../../types/auth.types';
import { getMicroregiaoById } from '../../../data/microregioes';

interface WorkforcePanelProps {
    users: User[];
    selectedMacroId: string | null;
    selectedMicroId: string | null;
    onViewMicrorregiao?: (microId: string) => void;
}

export function WorkforcePanel({ users, selectedMacroId, selectedMicroId, onViewMicrorregiao: _onViewMicrorregiao }: WorkforcePanelProps) {

    const filteredWorkforce = useMemo(() => {
        // ✅ Logs de debug removidos para produção

        if (selectedMacroId) {
            // Filtra usuários que pertencem à macrorregião selecionada
            // (logs de debug removidos)
        }

        return users.filter(user => {
            if (!user.ativo) return false;

            // Se filtro de microrregião estiver ativo
            if (selectedMicroId) {
                return user.microregiaoId === selectedMicroId;
            }

            // Se filtro de macrorregião estiver ativo
            if (selectedMacroId) {
                if (user.microregiaoId === 'all') return false;
                const micro = getMicroregiaoById(user.microregiaoId);
                // Fix: Compare com macroId (ID) e não o nome da macrorregião
                return micro?.macroId === selectedMacroId;
            }

            // Se nenhum filtro, mostra todos (ou todos regionais?)
            return true;
        }).sort((a, b) => {
            // Ordenar por Microrregião (A-Z) e depois Nome do Usuário (A-Z)
            const getMicroName = (microId: string) => {
                if (microId === 'all') return ' Minas Gerais (Global)'; // Espaço para aparecer primeiro? Ou último? 
                // Usuário pediu ordem alfabética de microrregiões.
                // 'all' normalmente é "Minas Gerais", que é M.
                const micro = getMicroregiaoById(microId);
                return micro?.nome || 'ZZZ'; // Se não achar, joga pro fim
            };

            const microA = getMicroName(a.microregiaoId);
            const microB = getMicroName(b.microregiaoId);

            const microComparison = microA.localeCompare(microB);

            if (microComparison !== 0) {
                return microComparison;
            }

            return a.nome.localeCompare(b.nome);
        });
    }, [users, selectedMacroId, selectedMicroId]);

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'superadmin':
                return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 uppercase">Super Admin</span>;
            case 'admin':
                return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase">Admin</span>;
            case 'gestor':
                return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 uppercase">Gestor</span>;
            default:
                return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">Usuário</span>;
        }
    };

    const getRegionLabel = (microId?: string) => {
        if (!microId || microId === 'all') return 'Minas Gerais (Global)';
        const micro = getMicroregiaoById(microId);
        return micro ? `${micro.nome} (${micro.macrorregiao})` : 'Região desconhecida';
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[500px] transition-colors">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-700/30">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-100 dark:border-teal-800/50">
                        <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Força de Trabalho</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {selectedMicroId
                                ? 'Equipe da Microrregião'
                                : selectedMacroId
                                    ? 'Equipe da Macrorregião'
                                    : 'Visão Geral da Equipe'}
                        </p>
                    </div>
                </div>
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-md">
                    {filteredWorkforce.length} ativos
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                {filteredWorkforce.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="bg-slate-50 dark:bg-slate-700/50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <UserIcon className="w-5 h-5 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nenhum usuário encontrado nesta região.</p>
                    </div>
                ) : (
                    filteredWorkforce.map((user) => (
                        <div
                            key={user.id}
                            className="group flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-800 hover:shadow-sm bg-white dark:bg-slate-800 transition-all"
                        >
                            {/* Avatar / Icon */}
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-sm border-2 border-white dark:border-slate-600 shadow-sm shrink-0">
                                {user.avatarId || user.nome.charAt(0).toUpperCase()}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate pr-2">{user.nome}</h4>
                                    {getRoleBadge(user.role)}
                                </div>

                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1 truncate">
                                        <Mail className="w-3 h-3" />
                                        {user.email}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 mt-1.5 text-[10px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wide">
                                    <MapPin className="w-3 h-3" />
                                    {getRegionLabel(user.microregiaoId)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="py-2.5 px-5 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 flex justify-center items-center text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                Listando {filteredWorkforce.length} colaboradores
            </div>
        </div>
    );
}
