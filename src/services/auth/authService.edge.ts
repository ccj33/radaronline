import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

import { log, logError, logWarn } from '../../lib/logger';
import type { ProfileDTO } from '../../types/auth.types';
import { getPlatformClient } from '../platformClient';
import { AUTH_EDGE_FUNCTION_TIMEOUT_MS } from './authService.constants';

const platformClient = getPlatformClient;
const EDGE_TIMEOUT_PREFIX = 'edge-timeout:';

type EdgeInvokeOptions = {
  scope: string;
  timeoutMessage: string;
  defaultErrorMessage: string;
  mapErrorMessage?: (message: string | undefined) => string;
  timeoutLogMessage?: string;
};

export type CreateUserEdgeFunctionResponse = {
  data?: {
    user?: { id: string };
    profile?: ProfileDTO;
  };
};

export function mapCreateUserErrorMessage(errorMessage: string | undefined): string {
  if (!errorMessage) return 'Erro desconhecido ao criar usuario';
  if (
    errorMessage.includes('already registered') ||
    errorMessage.includes('already exists') ||
    errorMessage.includes('ja esta cadastrado')
  ) {
    return 'Este email ja esta cadastrado';
  }
  if (errorMessage.includes('password') || errorMessage.includes('senha')) {
    return 'Senha muito fraca. Use pelo menos 6 caracteres';
  }
  if (errorMessage.includes('Formato de email')) {
    return 'Formato de email invalido';
  }
  if (errorMessage.includes('Role invalido')) {
    return 'Nivel de acesso invalido';
  }
  if (errorMessage.includes('Microrregiao')) {
    return 'Microrregiao invalida ou obrigatoria';
  }
  if (errorMessage.includes('Super Admin')) {
    return errorMessage;
  }
  if (errorMessage.includes('administrador')) {
    return errorMessage;
  }
  if (errorMessage.includes('Nao autenticado')) {
    return 'Sessao expirada. Faca login novamente.';
  }
  if (errorMessage.includes('administradores')) {
    return 'Apenas administradores podem criar usuarios';
  }
  return errorMessage;
}

async function extractHttpErrorMessage(error: FunctionsHttpError): Promise<string | undefined> {
  const context = error.context as
    | {
        body?: unknown;
        response?: { json: () => Promise<unknown> };
      }
    | undefined;

  const candidates: unknown[] = [];

  if (context?.body !== undefined) {
    candidates.push(context.body);
  }

  if (context?.response) {
    try {
      candidates.push(await context.response.json());
    } catch {
      // Response body was not available anymore.
    }
  }

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      try {
        const parsed = JSON.parse(candidate) as { error?: string };
        if (parsed?.error) {
          return parsed.error;
        }
      } catch {
        return candidate;
      }
    }

    if (
      candidate &&
      typeof candidate === 'object' &&
      'error' in candidate &&
      typeof (candidate as { error?: unknown }).error === 'string'
    ) {
      return (candidate as { error: string }).error;
    }
  }

  return error.message;
}

async function normalizeEdgeFunctionError(
  functionName: string,
  error: unknown,
  options: EdgeInvokeOptions
): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const httpMessage = await extractHttpErrorMessage(error);
    const message = options.mapErrorMessage ? options.mapErrorMessage(httpMessage) : httpMessage;
    logError(options.scope, 'Edge function retornou erro HTTP', {
      functionName,
      message,
      status: (error.context as { status?: number } | undefined)?.status,
    });
    return message || options.defaultErrorMessage;
  }

  if (error instanceof FunctionsRelayError) {
    logError(options.scope, 'Erro de rede com provider em edge function', {
      functionName,
      message: error.message,
    });
    return 'Erro de conexao com o servidor. Verifique sua internet.';
  }

  if (error instanceof FunctionsFetchError) {
    logError(options.scope, 'Nao foi possivel alcancar edge function', {
      functionName,
      message: error.message,
    });
    return 'Nao foi possivel conectar ao servidor. Tente novamente.';
  }

  if (error instanceof Error) {
    return options.mapErrorMessage ? options.mapErrorMessage(error.message) : error.message;
  }

  return options.defaultErrorMessage;
}

export async function invokeEdgeFunction<T>(
  functionName: string,
  body: unknown,
  options: EdgeInvokeOptions
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      if (options.timeoutLogMessage) {
        logWarn(options.scope, options.timeoutLogMessage, { functionName });
      }
      reject(new Error(`${EDGE_TIMEOUT_PREFIX}${options.timeoutMessage}`));
    }, AUTH_EDGE_FUNCTION_TIMEOUT_MS);
  });

  try {
    const result = (await Promise.race([
      platformClient().functions.invoke(functionName, {
        body: body as Record<string, unknown>,
      }),
      timeoutPromise,
    ])) as { data: T; error: unknown };

    if (result.error) {
      throw new Error(await normalizeEdgeFunctionError(functionName, result.error, options));
    }

    return result.data;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(EDGE_TIMEOUT_PREFIX)) {
      const timeoutMessage = error.message.slice(EDGE_TIMEOUT_PREFIX.length);
      logError(options.scope, 'Timeout detectado em edge function', {
        functionName,
        message: timeoutMessage,
      });
      throw new Error(timeoutMessage);
    }

    if (error instanceof Error && !(error instanceof FunctionsHttpError)) {
      throw error;
    }

    throw new Error(await normalizeEdgeFunctionError(functionName, error, options));
  }
}

export async function createUserWithEdgeFunction(body: {
  email: string;
  password: string;
  nome: string;
  role: string;
  microregiaoId: string | null;
  createdBy: string;
}): Promise<CreateUserEdgeFunctionResponse> {
  log('authService', 'Criando usuario via edge function', {
    email: body.email,
    role: body.role,
    microregiaoId: body.microregiaoId,
  });

  return invokeEdgeFunction<CreateUserEdgeFunctionResponse>('create-user', body, {
    scope: 'authService',
    timeoutMessage: 'A requisicao demorou muito. Verifique sua conexao ou tente novamente.',
    defaultErrorMessage: 'Erro ao criar usuario',
    mapErrorMessage: mapCreateUserErrorMessage,
    timeoutLogMessage: 'Timeout na edge function create-user',
  });
}

export async function updateUserPasswordWithEdgeFunction(
  userId: string,
  password: string,
  timeoutMessage: string
): Promise<void> {
  await invokeEdgeFunction<unknown>(
    'update-user-password',
    {
      userId,
      password,
    },
    {
      scope: 'authService',
      timeoutMessage,
      defaultErrorMessage: 'Erro ao atualizar senha',
      timeoutLogMessage: 'Timeout ao atualizar senha via edge function',
    }
  );
}

export async function deleteUserWithEdgeFunction(userId: string): Promise<void> {
  await invokeEdgeFunction<unknown>(
    'delete-user',
    { userId },
    {
      scope: 'authService',
      timeoutMessage: 'A exclusao do usuario demorou muito. Tente novamente.',
      defaultErrorMessage: 'Erro ao excluir usuario',
    }
  );
}
