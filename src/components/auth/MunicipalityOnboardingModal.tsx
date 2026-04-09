import React, { useState } from 'react';
import { MapPin, Save, Building, Lock, Eye, EyeOff, ShieldCheck, ChevronDown } from 'lucide-react';
import { User } from '../../types/auth.types';
import { getMunicipiosByMicro, getMicroregiaoById } from '../../data/microregioes';

interface FirstAccessOnboardingModalProps {
    user: User;
    onSave: (municipio: string, novaSenha: string, microregiaoId: string) => Promise<void>;
}

export const MunicipalityOnboardingModal: React.FC<FirstAccessOnboardingModalProps> = ({ user, onSave }) => {
    const isMultiMicro = user.microregiaoIds.length > 1;
    const isAdminLike = user.role === 'admin' || user.role === 'superadmin';

    const [selectedMicroId, setSelectedMicroId] = useState(user.microregiaoId || '');
    const [municipio, setMunicipio] = useState('');
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isGlobalScope = !selectedMicroId || selectedMicroId === 'all';

    const microregiaoNome = React.useMemo(() => {
        if (!selectedMicroId || selectedMicroId === 'all') return '';
        return getMicroregiaoById(selectedMicroId)?.nome || '';
    }, [selectedMicroId]);

    const municipios = React.useMemo(() => {
        if (!selectedMicroId || selectedMicroId === 'all') return [];
        return getMunicipiosByMicro(selectedMicroId);
    }, [selectedMicroId]);

    const showMunicipioSection = !isGlobalScope || isAdminLike;

    const validateForm = (): string | null => {
        if (isMultiMicro && !selectedMicroId) {
            return 'Por favor, selecione sua microrregião de vínculo.';
        }
        if (!isAdminLike && isGlobalScope && user.microregiaoIds.length === 0) {
            return 'Sua conta não possui microrregião vinculada. Contate o administrador.';
        }
        if (!municipio) {
            return 'Por favor, selecione um município.';
        }
        if (!novaSenha) {
            return 'Por favor, informe sua nova senha.';
        }
        if (novaSenha.length < 6) {
            return 'A senha deve ter no mínimo 6 caracteres.';
        }
        if (novaSenha !== confirmarSenha) {
            return 'As senhas não conferem.';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        setError('');

        try {
            await onSave(municipio, novaSenha, selectedMicroId);
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar. Tente novamente.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header Decorativo */}
                <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-8 text-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                        <ShieldCheck className="text-white w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo(a), {user.nome.split(' ')[0]}!</h2>
                    <p className="text-teal-50 text-sm">
                        Para sua segurança, configure seu acesso antes de continuar.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {error && (
                            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 text-sm font-medium text-center">
                                {error}
                            </div>
                        )}

                        {/* Microrregião de Vínculo */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Microrregião de Vínculo {isMultiMicro && <span className="text-rose-500">*</span>}
                            </label>

                            {isMultiMicro ? (
                                /* Gestor com múltiplas micros: deixar escolher */
                                <div className="relative">
                                    <select
                                        value={selectedMicroId}
                                        onChange={(e) => {
                                            setSelectedMicroId(e.target.value);
                                            setMunicipio(''); // reseta município ao trocar micro
                                        }}
                                        className="w-full appearance-none px-4 py-3 border border-teal-300 dark:border-teal-700 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                        required
                                    >
                                        <option value="">Selecione sua microrregião...</option>
                                        {user.microregiaoIds.map(id => {
                                            const m = getMicroregiaoById(id);
                                            return (
                                                <option key={id} value={id}>
                                                    {m?.nome || id}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            ) : (
                                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed">
                                    <Building size={18} />
                                    <span>
                                        {isGlobalScope
                                            ? (isAdminLike ? 'Todas as Microrregiões (Escopo Global)' : 'Microrregião não identificada')
                                            : (microregiaoNome || 'Microrregião não identificada')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {showMunicipioSection && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                <MapPin size={16} className="inline mr-1" />
                                {isAdminLike && isGlobalScope ? 'Município / Localização *' : 'Selecione seu Município *'}
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
                                {isAdminLike && (
                                    <option value="Sede/Remoto">Sede Administrativa / Remoto</option>
                                )}
                            </select>
                        </div>
                        )}

                        {/* Divider */}
                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white dark:bg-slate-800 px-2 text-slate-400 dark:text-slate-500">
                                    Defina sua senha
                                </span>
                            </div>
                        </div>

                        {/* Nova Senha */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                <Lock size={16} className="inline mr-1" />
                                Nova Senha *
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={novaSenha}
                                    onChange={(e) => setNovaSenha(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    className="w-full px-4 py-3 pr-12 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirmar Senha */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                <Lock size={16} className="inline mr-1" />
                                Confirmar Senha *
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmarSenha}
                                    onChange={(e) => setConfirmarSenha(e.target.value)}
                                    placeholder="Repita a senha"
                                    className={`w-full px-4 py-3 pr-12 border rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${confirmarSenha && novaSenha !== confirmarSenha
                                            ? 'border-rose-400 dark:border-rose-500'
                                            : 'border-slate-200 dark:border-slate-600'
                                        }`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {confirmarSenha && novaSenha !== confirmarSenha && (
                                <p className="mt-1 text-xs text-rose-500">As senhas não conferem</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !selectedMicroId || !municipio || !novaSenha || novaSenha !== confirmarSenha}
                            className="w-full px-6 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Configurando...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Confirmar e Acessar
                                </>
                            )}
                        </button>

                        <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-2">
                            Esta configuração é obrigatória para o seu primeiro acesso.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};
