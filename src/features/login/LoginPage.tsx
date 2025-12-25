import { useState } from 'react';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth';

export function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!email || !senha) {
      setError('Preencha todos os campos');
      setIsSubmitting(false);
      return;
    }

    const result = await login(email, senha);

    if (!result.success) {
      setError(result.error || 'Erro ao fazer login');
    }
    setIsSubmitting(false);
  };

  return (
    <div
      className="min-h-screen w-full relative flex items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/login-bg-3.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay base */}
      <div className="absolute inset-0 bg-black/60" />



      <div
        className="relative z-10 w-full max-w-5xl h-[85vh] rounded-[40px] overflow-hidden flex shadow-2xl"
        style={{
          background: 'transparent',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: '1px',
          boxShadow: '0 0 40px rgba(0,0,0,0.3)',
        }}
      >
        {/* Left Panel - The Glass Card Content */}
        <div
          className="w-full md:w-[480px] h-full p-12 flex flex-col justify-center relative"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 100%)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            borderRight: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {/* Inner Logo */}
          <div className="absolute top-12 left-12">
            <div className="flex flex-col items-start -space-y-1">
              <span className="text-5xl font-bold text-cyan-400 tracking-tight">Radar</span>
              <span className="text-sm text-white font-light tracking-wider opacity-90">Núcleo de Saúde Digital | SES/GAB/ATI-NSDIGI</span>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-3xl font-semibold text-white mb-2">Login</h2>
            <p className="text-white/50 text-sm mb-8">
              Acesse sua conta para continuar e gerenciar o monitoramento.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full px-0 py-4 bg-transparent border-b border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 transition-colors text-base"
                  disabled={isSubmitting}
                />

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Senha"
                    className="w-full px-0 py-4 bg-transparent border-b border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 transition-colors text-base pr-10"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>



              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-white hover:bg-white/90 text-black font-bold rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {isSubmitting ? 'Entrando...' : 'Acessar Conta'}
              </button>


            </form>
          </div>

          <div className="absolute bottom-6 left-12">
            <button
              onClick={() => setIsForgotModalOpen(true)}
              className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-all"
            >
              Esqueceu a senha?
            </button>
          </div>
        </div>

        {/* Right Panel - Container Principal */}
        <div className="flex-1 hidden md:flex relative overflow-hidden flex-col justify-center items-center p-12">
          {/* Glass Reflection Gradient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(105deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0) 100%)',
              opacity: 0.8,
            }}
          />

          {/* Subtle Shine/Sheen overlay */}
          <div
            className="absolute top-0 right-0 w-full h-full pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom left, rgba(255,255,255,0.1) 0%, transparent 40%)',
            }}
          />

          {/* Conteúdo de Texto (Centralizado) */}
          <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
            <h3 className="text-3xl font-semibold text-white/60 mb-2 tracking-normal leading-tight">
              Transformação Digital em Saúde
            </h3>

            <p className="text-white/40 text-lg font-normal">
              Monitorando ações por um SUS mais forte em Minas.
            </p>
          </div>

          {/* Logo (Absoluto no rodapé) */}
          <div className="absolute bottom-12 z-10">
            <img
              src="/logos-sidebar.png"
              alt="Logos SUS Digital e SES"
              className="w-[40rem] h-auto object-contain opacity-40 hover:opacity-60 transition-opacity duration-500"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
        </div>
      </div>

      {/* Esqueci minha senha Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsForgotModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-2">
                <AlertCircle className="w-6 h-6 text-cyan-400" />
              </div>

              <h3 className="text-xl font-bold text-white">Recuperação de Acesso</h3>

              <p className="text-white/60 text-sm leading-relaxed">
                Para redefinir sua senha, entre em contato diretamente com a gestão do sistema.
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
