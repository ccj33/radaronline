/**
 * Utilitários assíncronos para operações com timeout e cleanup
 */

/**
 * Envolve uma Promise com timeout, limpando o timer quando a promise resolve/rejeita
 * 
 * @param promise - Promise ou PromiseLike a ser executada
 * @param ms - Tempo máximo em milissegundos
 * @param message - Mensagem de erro caso timeout
 * @returns Promise que resolve com o resultado ou rejeita com timeout
 * 
 * @example
 * const result = await withTimeout(
 *   fetch('/api/data'),
 *   5000,
 *   'Requisição expirou após 5s'
 * );
 */
export function withTimeout<T>(
    promise: PromiseLike<T>,
    ms: number,
    message: string
): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(message));
        }, ms);
    });

    // Converter PromiseLike para Promise real para compatibilidade com Supabase
    const realPromise = Promise.resolve(promise);

    return Promise.race([realPromise, timeoutPromise]).finally(() => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
    }) as Promise<T>;
}

/**
 * Delay assíncrono
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry com backoff exponencial
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (attempt < maxRetries) {
                const delayMs = baseDelayMs * Math.pow(2, attempt);
                await delay(Math.min(delayMs, 30000));
            }
        }
    }

    throw lastError;
}
