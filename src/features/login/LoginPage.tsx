import { useState } from 'react';
import { Eye, EyeOff, LogIn, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../../auth';

export function LoginPage() {
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !senha) {
      setError('Preencha todos os campos');
      return;
    }

    const result = await login(email, senha);
    
    if (!result.success) {
      setError(result.error || 'Erro ao fazer login');
    }
    // Se sucesso, o App.tsx vai detectar isAuthenticated e mudar a tela
  };

  return (
    <div className="min-h-screen relative bg-white overflow-hidden flex items-center justify-center px-4 py-10">
      {/* Acentos com o gradiente do menu lateral */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0891b2] via-[#06a07a] to-[#059669]" />
        <div className="absolute -top-32 -left-28 w-80 h-80 bg-gradient-to-br from-[#0891b2] to-[#059669] opacity-20 blur-[110px]" />
        <div className="absolute bottom-[-80px] right-[-120px] w-[320px] h-[320px] bg-gradient-to-tl from-[#059669] to-[#0891b2] opacity-15 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-5xl grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
        {/* Bloco hero (desktop) */}
        <div className="hidden lg:flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[#0891b2] to-[#059669] text-white shadow-lg shadow-teal-500/30">
            RADAR 2.0
          </span>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">
            Acesso seguro com visual claro e moderno
          </h1>
          <p className="text-slate-600 max-w-lg">
            Use seu e-mail institucional para acessar o painel.
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-500/10 p-8 relative">
          <div className="absolute -top-0.5 left-4 right-4 h-1 bg-gradient-to-r from-[#0891b2] to-[#059669] rounded-full" />

          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#0891b2] to-[#059669] rounded-xl shadow-lg shadow-teal-500/25 text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Acesse sua conta</h2>
              <p className="text-sm text-slate-500">Use seu e-mail institucional</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Erro */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@gov.mg.br"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0891b2]/70 focus:border-transparent transition-all shadow-sm"
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-slate-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0891b2]/70 focus:border-transparent transition-all pr-12 shadow-sm"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Botão Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-[#0891b2] to-[#059669] hover:brightness-110 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Entrar</span>
                </>
              )}
            </button>
          </form>

          {/* Links auxiliares */}
          <div className="mt-6 text-center">
            <button 
              type="button"
              className="text-sm text-slate-500 hover:text-[#0891b2] transition-colors"
              onClick={() => alert('Contate o administrador do sistema')}
            >
              Esqueci minha senha
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <p className="lg:col-span-2 mt-6 text-center text-slate-400 text-xs">
          © 2024 Secretaria de Estado de Saúde de Minas Gerais
        </p>
      </div>
    </div>
  );
}



