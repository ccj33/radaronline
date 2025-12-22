// supabase/functions/create-user/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.3';

// ✅ DICA 1: Constantes centralizadas (evita hardcode)
const VALID_ROLES = ['admin', 'gestor', 'usuario'] as const;
const MIN_PASSWORD_LENGTH = 6;
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;
const REQUEST_TIMEOUT_MS = 30000;

// CORS Headers reutilizáveis
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ✅ DICA 1: Helper pra respostas de erro (remove duplicatas)
const errorResponse = (message: string, status: number) => new Response(
  JSON.stringify({ error: message }),
  { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);

// ✅ DICA 1: Helper pra respostas de sucesso (consistência)
const successResponse = (data: any) => new Response(
  JSON.stringify(data),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);

// ✅ DICA 2: Sanitização global (previne inputs sujos)
const sanitizeString = (value: any): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

// ✅ DICA 1: Validações em função única (remove espalhamento)
interface ValidatedInput {
  email: string;
  password: string;
  nome: string;
  role: 'admin' | 'gestor' | 'usuario';
  microregiao_id: string | null;
  created_by: string;
}

const validateAndSanitizeInputs = (
  body: any,
  currentUserId: string
): ValidatedInput => {
  // Sanitizar todos os campos
  const email = sanitizeString(body.email);
  const password = body.password ? String(body.password) : '';
  const nome = sanitizeString(body.nome);
  const role = body.role ? String(body.role) : '';
  const microregiaoId = body.microregiaoId ? sanitizeString(body.microregiaoId) : '';
  const createdBy = body.createdBy ? sanitizeString(body.createdBy) : currentUserId;

  // Validações
  if (!email) {
    throw new Error('Email é obrigatório');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.toLowerCase())) {
    throw new Error('Formato de email inválido');
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`);
  }

  if (!nome) {
    throw new Error('Nome é obrigatório');
  }

  if (!role || !VALID_ROLES.includes(role as any)) {
    throw new Error(`Role inválido. Use: ${VALID_ROLES.join(', ')}`);
  }

  // Converter microregiaoId (camelCase) para microregiao_id (snake_case)
  let microregiao_id: string | null = null;
  if (role === 'admin' || microregiaoId === 'all' || !microregiaoId) {
    microregiao_id = null;
  } else {
    if (!microregiaoId) {
      throw new Error('Microrregião é obrigatória para usuários não-admin');
    }
    microregiao_id = microregiaoId;
  }

  return {
    email: email.toLowerCase(),
    password,
    nome,
    role: role as 'admin' | 'gestor' | 'usuario',
    microregiao_id,
    created_by: createdBy,
  };
};

// ✅ DICA 2: Verificação de admin extraída (testável)
const checkIsAdmin = async (
  supabaseAdmin: any,
  userId: string
): Promise<boolean> => {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return false;
  }

  return profile.role === 'admin';
};

// ✅ DICA 3: Retry com timeout (safeguard automático)
const insertProfileWithRetry = async (
  supabaseAdmin: any,
  profileData: any,
  maxAttempts: number = MAX_RETRY_ATTEMPTS
): Promise<{ data: any; error: any }> => {
  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout ao inserir perfil')), REQUEST_TIMEOUT_MS);
    });

    const insertPromise = supabaseAdmin
      .from('profiles')
      .insert([profileData])
      .select()
      .single();

    try {
      const result = await Promise.race([insertPromise, timeoutPromise]);
      if (result.data && !result.error) {
        return result;
      }
      lastError = result.error;
    } catch (error: any) {
      lastError = error;
    }

    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  return { data: null, error: lastError };
};

serve(async (req: Request) => {
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ✅ Obter e validar auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Não autenticado', 401);
    }
    const token = authHeader.replace('Bearer ', '');

    // ✅ Cliente Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ✅ Obter usuário atual
    const { data: { user: currentUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !currentUser) {
      return errorResponse('Não autenticado', 401);
    }

    // ✅ DICA 2: Verificar se é admin (função extraída, testável)
    const isAdmin = await checkIsAdmin(supabaseAdmin, currentUser.id);
    if (!isAdmin) {
      return errorResponse('Apenas administradores podem criar usuários', 403);
    }

    // ✅ Parse body (único)
    let body;
    try {
      body = await req.json();
    } catch (error: any) {
      console.error('[create-user] Erro ao parsear body:', error);
      return errorResponse('Dados inválidos', 400);
    }

    // ✅ DICA 1: Validação e sanitização centralizadas
    const validated = validateAndSanitizeInputs(body, currentUser.id);

    // ✅ Criar user no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: true,
    });

    if (authError) {
      console.error('[create-user] Erro ao criar usuário:', authError);

      if (authError.message?.includes('already registered') ||
          authError.message?.includes('already exists') ||
          authError.message?.includes('já está cadastrado')) {
        return errorResponse('Este email já está cadastrado', 400);
      }

      return errorResponse(authError.message || 'Erro ao criar usuário', 500);
    }

    // ✅ DICA 3: Insert com retry e timeout (safeguard automático)
    const profileData = {
      id: authData.user.id,
      nome: validated.nome,
      email: validated.email,
      role: validated.role,
      microregiao_id: validated.microregiao_id,
      created_by: validated.created_by,
      ativo: true,
      lgpd_consentimento: false,
    };

    const { data: newProfile, error: profileInsertError } = await insertProfileWithRetry(
      supabaseAdmin,
      profileData
    );

    // ✅ DICA 3: Rollback automático se perfil falhar
    if (profileInsertError || !newProfile) {
      console.error('[create-user] Erro ao inserir perfil:', profileInsertError);

      // Rollback: Delete user do Auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return errorResponse('Erro ao criar perfil de usuário', 500);
    }

    // ✅ Resposta alinhada com app
    return successResponse({
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
        profile: newProfile,
      },
    });

  } catch (error: any) {
    // ✅ DICA 4: Logging padronizado com tags
    console.error('[create-user] Erro inesperado:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    const errorMessage = error.message || 'Erro inesperado';
    const status = errorMessage.includes('inválido') || 
                   errorMessage.includes('obrigatório') || 
                   errorMessage.includes('já está') ? 400 : 500;

    return errorResponse(errorMessage, status);
  }
});

