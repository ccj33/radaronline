import { useState } from 'react';
import { Shield, CheckCircle, FileText, Lock, AlertTriangle, ScrollText } from 'lucide-react';
import { useAuth } from '../../auth';

interface LgpdConsentProps {
  onAccepted?: () => void;
}

export function LgpdConsent(props: LgpdConsentProps) {
  const { onAccepted } = props;
  const { user, acceptLgpd, logout } = useAuth();

  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectWarning, setShowRejectWarning] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    await acceptLgpd();
    setIsLoading(false);
    onAccepted?.();
  };

  const handleReject = async () => {
    if (!showRejectWarning) {
      setShowRejectWarning(true);
      return;
    }
    await logout();
  };

  // Detectar scroll no container de termos
  const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isAtBottom) {
      setHasScrolledTerms(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-4">
      {/* Padrão de fundo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Cabeçalho */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg shadow-teal-500/30 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Termo de Uso e Responsabilidade
          </h1>
          <p className="text-slate-400">
            Olá, <span className="text-teal-400 font-medium">{user?.nome || 'Usuário'}</span>!
            Para utilizar o sistema Radar Minas Digital, leia e aceite os termos abaixo.
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">

          {/* Conteúdo dos Termos - Scrollável */}
          <div
            className="p-6 max-h-[50vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
            onScroll={handleTermsScroll}
          >
            {/* Introdução */}
            <div className="mb-6">
              <p className="text-slate-300 text-sm leading-relaxed">
                O <strong className="text-white">Radar Minas Digital</strong> é um sistema de gestão estratégica da
                Secretaria de Estado de Saúde de Minas Gerais (SES-MG). Ao acessar e utilizar este sistema,
                você declara estar ciente e de acordo com os seguintes termos:
              </p>
            </div>

            {/* Seção 1: Termos de Uso */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-white font-semibold">1. Condições de Uso</h3>
              </div>
              <ul className="text-sm text-slate-400 space-y-2 ml-11">
                <li className="flex gap-2">
                  <span className="text-teal-400">•</span>
                  <span>Utilizar o sistema <strong className="text-slate-300">exclusivamente para fins profissionais</strong> relacionados às suas atribuições funcionais na SES-MG ou órgãos vinculados.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-400">•</span>
                  <span>Manter a <strong className="text-slate-300">confidencialidade absoluta</strong> das informações acessadas, especialmente dados de gestão, metas e indicadores estratégicos.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-400">•</span>
                  <span><strong className="text-slate-300">Não compartilhar credenciais</strong> de acesso (login e senha) com terceiros, sob qualquer circunstância.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-400">•</span>
                  <span>Reportar imediatamente qualquer <strong className="text-slate-300">uso indevido, falha de segurança</strong> ou comportamento suspeito identificado no sistema.</span>
                </li>
              </ul>
            </div>

            {/* Seção 2: LGPD */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Lock className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-white font-semibold">2. Proteção de Dados (LGPD)</h3>
              </div>
              <p className="text-sm text-slate-400 mb-3 ml-11">
                Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018):
              </p>
              <ul className="text-sm text-slate-400 space-y-2 ml-11">
                <li className="flex gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Coletamos apenas os dados <strong className="text-slate-300">estritamente necessários</strong>: nome, e-mail, microrregião de atuação e município.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Seus dados pessoais são <strong className="text-slate-300">protegidos por criptografia</strong> e armazenados em servidores seguros.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Dados <strong className="text-slate-300">não são compartilhados</strong> com terceiros externos à administração pública estadual.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Você tem direito de <strong className="text-slate-300">acessar, corrigir ou solicitar exclusão</strong> dos seus dados a qualquer momento.</span>
                </li>
              </ul>
            </div>

            {/* Seção 3: Responsabilidades */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <ScrollText className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-white font-semibold">3. Responsabilidades</h3>
              </div>
              <ul className="text-sm text-slate-400 space-y-2 ml-11">
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Você é <strong className="text-slate-300">responsável pela veracidade</strong> das informações que cadastrar no sistema.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>O uso indevido do sistema pode resultar em <strong className="text-slate-300">sanções administrativas</strong> conforme legislação vigente.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>A SES-MG reserva-se o direito de <strong className="text-slate-300">suspender o acesso</strong> em caso de violação destes termos.</span>
                </li>
              </ul>
            </div>

            {/* Informações de Contato */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs text-slate-500 mb-2">
                <strong className="text-slate-400">Controlador de dados:</strong> Secretaria de Estado de Saúde de Minas Gerais
              </p>
              <p className="text-xs text-slate-500">
                <strong className="text-slate-400">Contato DPO:</strong> Para dúvidas sobre privacidade, entre em contato com o Encarregado de Proteção de Dados através dos canais oficiais da SES-MG.
              </p>
            </div>

            {/* Indicador de scroll (aparece se não scrollou até o fim) */}
            {!hasScrolledTerms && (
              <div className="sticky bottom-0 left-0 right-0 py-2 text-center bg-gradient-to-t from-slate-800/90 to-transparent">
                <span className="text-xs text-slate-400 animate-pulse">
                  ↓ Role para ler todos os termos
                </span>
              </div>
            )}
          </div>

          {/* Área de Aceite */}
          <div className="p-6 bg-white/5 border-t border-white/10">
            {/* Aviso de recusa */}
            {showRejectWarning && (
              <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-200 font-medium">Tem certeza?</p>
                  <p className="text-xs text-amber-300/70 mt-1">
                    Ao recusar os termos, você será desconectado e não poderá utilizar o sistema Radar Minas Digital.
                  </p>
                </div>
              </div>
            )}

            {/* Texto de concordância */}
            <p className="text-sm text-slate-400 text-center mb-4">
              Ao clicar em <strong className="text-teal-400">"Aceitar e Continuar"</strong>, declaro que li, compreendi e aceito
              integralmente os <strong className="text-white">Termos de Uso</strong> e a <strong className="text-white">Política de Privacidade</strong> acima.
            </p>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                className={`flex-shrink-0 py-3 px-6 font-medium rounded-xl transition-all ${showRejectWarning
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
              >
                {showRejectWarning ? 'Confirmar Saída' : 'Recusar'}
              </button>
              <button
                onClick={handleAccept}
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Aceitar e Continuar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <p className="mt-4 text-center text-slate-500 text-xs">
          Radar Minas Digital • Última atualização: Janeiro/2026
        </p>
      </div>
    </div>
  );
}
