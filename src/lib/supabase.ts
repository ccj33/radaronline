import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const isDev = import.meta.env.DEV;
  const message = isDev
    ? `⚠️ Variáveis do Supabase não encontradas!\n\n` +
    `Crie um arquivo .env na raiz do projeto com:\n` +
    `VITE_SUPABASE_URL=https://seu-projeto.supabase.co\n` +
    `VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui\n\n` +
    `Veja o arquivo .env.example para mais detalhes.`
    : `⚠️ Variáveis do Supabase não configuradas no Vercel!\n\n` +
    `Configure as variáveis de ambiente no Vercel:\n` +
    `- VITE_SUPABASE_URL\n` +
    `- VITE_SUPABASE_ANON_KEY\n\n` +
    `Acesse: Settings > Environment Variables no seu projeto Vercel.`;

  console.error(message);
  throw new Error(message);
}

// ✅ CORREÇÃO: Condicionar objeto auth inteiro para evitar edge cases (SSR safe)
const auth =
  typeof window !== 'undefined'
    ? {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    }
    : {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth,
  // Desabilitar Realtime para evitar erros de WebSocket (não usamos subscriptions)
  realtime: {
    params: {
      eventsPerSecond: 0, // Desabilita polling
    },
  },
  // Configuração global para evitar tentativas de conexão desnecessárias
  global: {
    headers: {
      'X-Client-Info': 'radar-2.0',
    },
  },
});


