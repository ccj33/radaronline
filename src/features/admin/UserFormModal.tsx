import React, { useState } from 'react';
import { X, User as UserIcon, Mail, Shield, MapPin, ChevronDown, Lock, Eye, EyeOff, RefreshCw, AlertTriangle, Filter } from 'lucide-react';
import { User, UserRole } from '../../types/auth.types';
import { MICROREGIOES, getMacrorregioes, getMunicipiosByMicro } from '../../data/microregioes';
import {
  canAssignAdminRole,
  canManageAdminTarget,
  getAdminRoleAssignmentError,
  getAdminTargetManagementError,
  getAssignableAdminRoles,
} from '../../lib/adminRolePolicy';
import { log, logError } from '../../lib/logger';
import { isValidEmail } from '../../lib/validation';

type UserFormModalProps = {
  user: User | null;
  onClose: () => void;
  onSave: (userData: Partial<User>) => Promise<void>;
  isSaving?: boolean;
  initialData?: {
    nome?: string;
    email?: string;
    microregiaoId?: string;
    municipio?: string;
  };
  fullScreen?: boolean; // quando true, usa layout full-screen em mobile
  currentUserRole?: UserRole;
};

export function UserFormModal({
  user,
  onClose,
  onSave,
  isSaving = false,
  initialData,
  fullScreen = false,
  currentUserRole,
}: UserFormModalProps) {
  const isEditing = user !== null;
  const assignableRoles = getAssignableAdminRoles(currentUserRole);
  const visibleRoles: UserRole[] =
    assignableRoles.length > 0 ? assignableRoles : ['usuario', 'gestor'];
  const canManageEditedUser = !user || canManageAdminTarget(currentUserRole, user.role);

  const [formData, setFormData] = useState({
    nome: user?.nome || initialData?.nome || '',
    email: user?.email || initialData?.email || '',
    senha: '',
    role: user?.role || 'usuario' as UserRole,
    // Para gestores: array de IDs; para usuários: array de 1 elemento
    microregiaoIds: user?.microregiaoIds?.length
      ? user.microregiaoIds
      : initialData?.microregiaoId
        ? [initialData.microregiaoId]
        : [] as string[],
    municipio: user?.municipio || initialData?.municipio || '',
    ativo: user?.ativo ?? true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterMacro, setFilterMacro] = useState<string>('all');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false);
  const saving = isSaving || isLoading;

  const filteredMicroregioes = MICROREGIOES.filter(m =>
    filterMacro === 'all' || m.macrorregiao === filterMacro
  );

  // Gerador de senha automático
  const generatePassword = () => {
    const palavras = [
      'radar', 'micro', 'gestao', 'saude', 'relatorio', 'acao', 'equipe',
      'projeto', 'objetivo', 'metrica', 'indicador', 'dashboard', 'painel',
      'sistema', 'usuario', 'admin', 'monitor', 'controle', 'planejamento',
      'execucao', 'resultado', 'impacto', 'eficiencia', 'qualidade', 'atencao',
      'prevencao', 'promocao', 'vigilancia', 'epidemiologia', 'assistencia',
      'regulacao', 'gestor', 'coordenador', 'supervisor', 'tecnico', 'analista'
    ];

    const palavraAleatoria = palavras[Math.floor(Math.random() * palavras.length)];
    const numeroAleatorio = Math.floor(Math.random() * 99) + 1;
    const numeroFormatado = numeroAleatorio.toString().padStart(2, '0');

    return `${palavraAleatoria}@${numeroFormatado}`;
  };

  const handleGeneratePassword = () => {
    setShowConfirmGenerate(true);
  };

  const confirmGeneratePassword = () => {
    const novaSenha = generatePassword();
    setFormData(prev => ({ ...prev, senha: novaSenha }));
    setShowConfirmGenerate(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.nome.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email é obrigatório');
      return;
    }

    // ✅ Validar formato de email usando função centralizada
    if (!isValidEmail(formData.email)) {
      setError('Formato de email inválido');
      return;
    }

    // ✅ CORREÇÃO: Validar senha apenas na criação
    if (!isEditing && !formData.senha.trim()) {
      setError('Senha é obrigatória para novos usuários');
      return;
    }

    if (!canAssignAdminRole(currentUserRole, formData.role)) {
      setError(getAdminRoleAssignmentError(formData.role));
      return;
    }

    if (user && !canManageEditedUser) {
      setError(getAdminTargetManagementError(user.role));
      return;
    }

    // ✅ CORREÇÃO: Validar microrregião para não-admins
    if (
      formData.role !== 'admin' &&
      formData.role !== 'superadmin' &&
      formData.microregiaoIds.length === 0
    ) {
      setError('Microrregião é obrigatória para usuários não-admin');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      // Formata IDs como comma-separated para salvar no campo microregiao_id
      const microregiaoId = formData.role === 'admin' || formData.role === 'superadmin'
        ? 'all'
        : formData.microregiaoIds.join(',');

      const userData: any = {
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        role: formData.role,
        microregiaoId,
        municipio: formData.municipio,
        ativo: formData.ativo,
        lgpdConsentimento: user?.lgpdConsentimento ?? false,
      };

      // ✅ CORREÇÃO: Incluir senha apenas se foi preenchida
      if (formData.senha.trim()) {
        userData.senha = formData.senha.trim();
      }

      log('[UserFormModal]', 'Chamando onSave...');
      await onSave(userData);
      log('[UserFormModal]', 'onSave concluído');
      // ✅ Fechar modal apenas se não houver erro (o AdminPanel já fecha)
    } catch (err: any) {
      logError('[UserFormModal]', 'Erro capturado:', err);
      setError(err?.message || 'Erro desconhecido. Tente novamente ou contate o suporte.');
      // ✅ Não fechar modal em caso de erro
    } finally {
      setIsLoading(false);
      log('[UserFormModal]', 'Loading resetado');
    }
  };

  return (
    <React.Fragment>
      {/* Modal de confirmação para gerar senha */}
      {showConfirmGenerate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    Gerar nova senha?
                  </h3>
                  <p className="text-sm text-slate-600 mb-1">
                    {isEditing ? (
                      <span>
                        Você está prestes a <span className="font-semibold text-amber-600">alterar a senha</span> deste usuário.
                        <br />
                        <br />
                        A senha atual será <span className="font-semibold">substituída</span> por uma nova senha gerada automaticamente.
                        <br />
                        <br />
                        Tem certeza que deseja continuar?
                      </span>
                    ) : (
                      <span>
                        Uma nova senha será gerada automaticamente para este usuário.
                        <br />
                        <br />
                        A senha seguirá o formato: <span className="font-mono text-teal-600 font-semibold">palavra@número</span>
                        <br />
                        <br />
                        Deseja continuar?
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowConfirmGenerate(false)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmGeneratePassword}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Sim, gerar senha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal principal */}
      <div className={`fixed inset-0 z-50 flex ${fullScreen ? 'items-start justify-start p-0' : 'items-center justify-center p-4'} bg-black/50`}>
        <div className={`bg-white dark:bg-slate-800 ${fullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-lg max-h-[90vh] rounded-2xl'} overflow-hidden shadow-2xl`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <span className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Nome completo *
                </span>
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome do usuário"
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email *
                </span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@gov.mg.br"
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Senha {!isEditing && '*'}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-colors"
                  title="Gerar senha automática"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Gerar senha
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.senha}
                  onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                  placeholder={isEditing ? "Deixe em branco para manter a senha atual" : "Defina uma senha para o usuário"}
                  className="w-full px-4 py-2.5 pr-20 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-slate-400 dark:placeholder-slate-500"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {isEditing && (
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Deixe em branco para manter a senha atual
                </p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Nível de acesso *
                </span>
              </label>
              <div className="relative">
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                  disabled={!canManageEditedUser}
                  className="w-full appearance-none px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                >
                  {visibleRoles.map((role) => (
                    <option key={role} value={role}>
                      {role === 'superadmin'
                        ? 'Super Admin'
                        : role === 'admin'
                          ? 'Administrador'
                          : role === 'gestor'
                            ? 'Gestor'
                            : 'Usuário'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {formData.role === 'superadmin' && 'Acesso irrestrito de plataforma, incluindo administradores e outros Super Admins'}
                {formData.role === 'admin' && 'Acesso total a todas as microrregiões e configurações'}
                {formData.role === 'gestor' && 'Pode criar e gerenciar ações na sua microrregião'}
                {formData.role === 'usuario' && 'Acesso limitado baseado no papel RACI'}
              </p>
              {!canManageEditedUser && user && (
                <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-300">
                  {getAdminTargetManagementError(user.role)}
                </p>
              )}
            </div>

            {/* Microrregião (não aparece para admin/superadmin) */}
            {formData.role !== 'admin' && formData.role !== 'superadmin' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {formData.role === 'gestor' ? 'Microrregiões *' : 'Região *'}
                    {formData.role === 'gestor' && (
                      <span className="text-xs font-normal text-slate-400">(pode selecionar mais de uma)</span>
                    )}
                  </span>
                </label>

                {/* Filtro por macrorregião */}
                <div className="mb-3 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <select
                    value={filterMacro}
                    onChange={(e) => setFilterMacro(e.target.value)}
                    className="w-full appearance-none pl-9 pr-8 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <option value="all">Filtrar por macrorregião...</option>
                    {getMacrorregioes().map(macro => (
                      <option key={macro} value={macro}>{macro}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* GESTOR: checkboxes multi-seleção */}
                {formData.role === 'gestor' ? (
                  <>
                    <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-y-auto max-h-44 bg-white dark:bg-slate-700">
                      {filteredMicroregioes.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">Nenhuma microrregião encontrada</p>
                      ) : filteredMicroregioes.map(micro => {
                        const checked = formData.microregiaoIds.includes(micro.id);
                        return (
                          <label
                            key={micro.id}
                            className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${checked ? 'bg-teal-50 dark:bg-teal-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-600/30'}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setFormData(prev => ({
                                  ...prev,
                                  microregiaoIds: e.target.checked
                                    ? [...prev.microregiaoIds, micro.id]
                                    : prev.microregiaoIds.filter(id => id !== micro.id),
                                  municipio: '',
                                }));
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 shrink-0"
                            />
                            <span className={`text-sm flex-1 ${checked ? 'text-teal-700 dark:text-teal-300 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                              {micro.nome}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{micro.macrorregiao}</span>
                          </label>
                        );
                      })}
                    </div>
                    {/* Badges das micros selecionadas */}
                    {formData.microregiaoIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {formData.microregiaoIds.map(id => {
                          const m = MICROREGIOES.find(mr => mr.id === id);
                          return (
                            <span key={id} className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-full text-xs font-medium">
                              {m?.nome || id}
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, microregiaoIds: prev.microregiaoIds.filter(i => i !== id) }))}
                                className="hover:bg-teal-200 dark:hover:bg-teal-800 rounded-full p-0.5 transition-colors"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  /* USUÁRIO: select único */
                  <div className="relative">
                    <select
                      value={formData.microregiaoIds[0] || ''}
                      onChange={(e) => {
                        const microId = e.target.value;
                        setFormData(prev => ({ ...prev, microregiaoIds: microId ? [microId] : [], municipio: '' }));
                        if (microId) {
                          const micro = MICROREGIOES.find(m => m.id === microId);
                          if (micro) setFilterMacro(micro.macrorregiao);
                        } else {
                          setFilterMacro('all');
                        }
                      }}
                      className="w-full appearance-none px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                    >
                      <option value="">Selecione uma microrregião</option>
                      {filteredMicroregioes.map(micro => (
                        <option key={micro.id} value={micro.id}>
                          {micro.nome} ({micro.macrorregiao})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  </div>
                )}
              </div>
            )}

            {/* Município (Opcional, apenas se 1 região selecionada) */}
            {formData.role !== 'admin' &&
              formData.role !== 'superadmin' &&
              formData.microregiaoIds.length === 1 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Município <span className="text-slate-400 font-normal">(Opcional)</span>
                  </span>
                </label>
                <div className="relative">
                  <select
                    value={formData.municipio}
                    onChange={(e) => setFormData(prev => ({ ...prev, municipio: e.target.value }))}
                    className="w-full appearance-none px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Selecione um município (ou deixe em branco)</option>
                    {getMunicipiosByMicro(formData.microregiaoIds[0] || '').map(mun => (
                      <option key={mun.codigo} value={mun.nome}>
                        {mun.nome}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Status (apenas para edição) */}
            {isEditing && (
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-teal-500 bg-white dark:bg-slate-700"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Usuário ativo
                  </span>
                </label>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 ml-8">
                  Usuários inativos não conseguem fazer login
                </p>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !canManageEditedUser}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-teal-500/20"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                isEditing ? 'Salvar alterações' : 'Criar usuário'
              )}
            </button>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
