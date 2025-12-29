import React, { useState, useEffect } from 'react';
import { MapPin, Save, Building } from 'lucide-react';
import { User } from '../../types/auth.types';
import { getMunicipiosByMicro, getMicroregiaoById } from '../../data/microregioes';

interface MunicipalityOnboardingModalProps {
    user: User;
    onSave: (municipio: string) => Promise<void>;
}

export const MunicipalityOnboardingModal: React.FC<MunicipalityOnboardingModalProps> = ({ user, onSave }) => {
    const [municipio, setMunicipio] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Lista de municípios da micro do usuário
    const municipios = React.useMemo(() => {
        if (!user.microregiaoId || user.microregiaoId === 'all') return [];
        return getMunicipiosByMicro(user.microregiaoId);
    }, [user.microregiaoId]);

    const microregiaoNome = React.useMemo(() => {
        if (!user.microregiaoId || user.microregiaoId === 'all') return '';
        return getMicroregiaoById(user.microregiaoId)?.nome || '';
    }, [user.microregiaoId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!municipio) {
            setError('Por favor, selecione um município.');
            return;
        }

        setLoading(true);
        try {
            await onSave(municipio);
        } catch (err) {
            console.error(err);
            setError('Erro ao salvar. Tente novamente.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header Decorativo */}
                <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-8 text-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                        <MapPin className="text-white w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo(a), {user.nome.split(' ')[0]}!</h2>
                    <p className="text-teal-50 text-sm">Para continuar, precisamos saber em qual município você atua.</p>
                </div>

                {/* Content */}
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {error && (
                            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 text-sm font-medium text-center">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Microrregião de Vínculo
                            </label>
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed">
                                <Building size={18} />
                                <span>{microregiaoNome || 'Microrregião não identificada'}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Selecione seu Município *
                            </label>
                            <select
                                value={municipio}
                                onChange={(e) => setMunicipio(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                required
                            >
                                <option value="">Selecione...</option>
                                {municipios.map((mun) => (
                                    <option key={mun.codigo} value={mun.nome}>
                                        {mun.nome}
                                    </option>
                                ))}
                                <option value="Sede/Remoto">Sede Administrativa / Remoto</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !municipio}
                            className="w-full px-6 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Confirmar e Acessar
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
