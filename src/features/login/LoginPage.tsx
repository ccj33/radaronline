import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth';

export function LoginPage() {
  const { login, loginAsDemo } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!email || !senha) {
      setError('Preencha todos os campos');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await login(email, senha);

      if (!result.success) {
        setError(result.error || 'Erro ao fazer login');
      }
    } catch {
      setError('Erro inesperado ao fazer login');
    }

    setIsSubmitting(false);
  };

  return (
    <div
      className="min-h-[100svh] w-full relative flex items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/login-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div
        className="
          relative z-10 w-full max-w-5xl
          rounded-3xl md:rounded-[40px]
          overflow-hidden flex flex-col md:flex-row
          shadow-2xl
          max-h-[92svh] md:h-[85vh]
        "
        style={{
          background: 'transparent',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: '1px',
          boxShadow: '0 0 40px rgba(0,0,0,0.3)',
        }}
      >
        {/* Left Panel */}
        <div
          className="
            w-full md:w-[480px] h-auto md:h-full
            flex flex-col
            px-6 py-6 sm:px-8 sm:py-8 md:p-10
            relative
            overflow-y-auto
            [&::-webkit-scrollbar]:hidden
            [scrollbar-width:none]
          "
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 100%)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            borderRight: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Logo agora no fluxo (evita sobreposição) */}
          <div className="flex flex-col items-start gap-1">
            <span className="text-4xl sm:text-5xl font-bold text-cyan-400 tracking-tight">
              Radar
            </span>
            <span className="text-xs sm:text-sm text-white font-light tracking-wider opacity-90">
              Núcleo de Saúde Digital MG
            </span>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">Login</h2>
            <p className="text-white/50 text-sm mb-6">
              Acesse sua conta para continuar e gerenciar o monitoramento.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu e-mail institucional"
                  className="w-full px-0 py-3 bg-transparent border-b border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 transition-colors text-base"
                  disabled={isSubmitting}
                />

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Senha"
                    className="w-full px-0 py-3 bg-transparent border-b border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 transition-colors text-base pr-10"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-white hover:bg-white/90 text-black font-bold rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? 'Entrando...' : 'Acessar Conta'}
              </button>

              {/* Em vez de absoluto no rodapé, deixa no fluxo */}
              <div className="pt-2 flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-all"
                >
                  Esqueceu a senha?
                </button>

                {/* Separator */}
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-white/20" />
                  <span className="text-xs text-white/40 uppercase">ou</span>
                  <div className="flex-1 h-px bg-white/20" />
                </div>

                {/* Demo Button */}
                <button
                  type="button"
                  onClick={loginAsDemo}
                  disabled={isSubmitting}
                  className="w-full py-3 border border-white/30 text-white/80 font-semibold rounded-xl hover:bg-white/10 hover:border-white/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Entrar como Visitante
                </button>
                <p className="text-[10px] text-white/40 text-center -mt-2">
                  Explore o sistema com dados fictícios — nada será salvo.
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 hidden md:flex relative overflow-hidden flex-col justify-center items-center p-12">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(105deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0) 100%)',
              opacity: 0.8,
            }}
          />

          <div
            className="absolute top-0 right-0 w-full h-full pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom left, rgba(255,255,255,0.1) 0%, transparent 40%)',
            }}
          />

          <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
            <h3 className="text-3xl font-semibold text-white/60 mb-2 tracking-normal leading-tight">
              Transformação Digital em Saúde
            </h3>

            <p className="text-white/40 text-lg font-normal">
              Monitorando ações por um SUS mais forte em Minas.
            </p>
          </div>

          <div className="absolute bottom-24 z-10">
            <img
              src="/loginlogo2.png"
              alt="Logos SUS Digital e SES"
              className="w-[40rem] h-auto object-contain opacity-40 hover:opacity-60 transition-opacity duration-500"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
        </div>
      </div>

      {/* Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsForgotModalOpen(false)}
          />

          <div className="relative bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-2">
                <AlertCircle className="w-6 h-6 text-cyan-400" />
              </div>

              <h3 className="text-xl font-bold text-white">Recuperação de Acesso</h3>

              <p className="text-white/60 text-sm leading-relaxed">
                Para redefinir sua senha, entre em contato diretamente com a gestão do sistema.
              </p>
              <p className="text-cyan-400 font-medium text-sm mt-3">
                Suporte: saudedigital@saude.mg.gov.br
              </p>

              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="w-full mt-4 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
