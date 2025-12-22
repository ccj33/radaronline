// Declarações de tipos para Deno em Supabase Edge Functions

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  readTextFile(path: string | URL): Promise<string>;
  readTextFileSync(path: string | URL): string;
  writeTextFile(path: string | URL, data: string): Promise<void>;
  writeTextFileSync(path: string | URL, data: string): void;
  [key: string]: any;
};

// APIs globais do Deno/Web
declare var console: Console;
declare var setTimeout: (callback: () => void, delay: number) => number;
declare var Request: {
  new (input: RequestInfo | URL, init?: RequestInit): Request;
  prototype: Request;
};
declare var Response: {
  new (body?: BodyInit | null, init?: ResponseInit): Response;
  prototype: Response;
  error(): Response;
  redirect(url: string | URL, status?: number): Response;
};

// Permitir imports de URLs HTTP/HTTPS - Declarações genéricas para Deno
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.87.3" {
  export function createClient(url: string, key: string): any;
  export * from "@supabase/supabase-js";
}

// Declaração genérica para qualquer módulo HTTPS (fallback)
declare module "https://*" {
  const content: any;
  export default content;
  export function serve(...args: any[]): any;
  export function createClient(...args: any[]): any;
  export const createClient: (...args: any[]) => any;
  export const serve: (...args: any[]) => any;
  [key: string]: any;
}

