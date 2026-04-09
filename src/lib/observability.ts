type ObservabilityLevel = 'info' | 'warn' | 'error';

type ObservabilityUserContext = {
  id: string;
  role?: string;
  microregiaoId?: string;
};

type ObservabilityEvent = {
  timestamp: string;
  level: ObservabilityLevel;
  source: string;
  message: string;
  page?: string;
  user?: ObservabilityUserContext | null;
  details?: unknown;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
};

const OBSERVABILITY_STORAGE_KEY = 'radar_observability_events';
const OBSERVABILITY_BUFFER_LIMIT = 50;
const observabilityBeaconUrl = (import.meta as any).env?.VITE_OBSERVABILITY_BEACON_URL as
  | string
  | undefined;
const IS_DEV = import.meta.env.DEV;
const IS_PRODUCTION = import.meta.env.PROD;

let currentUserContext: ObservabilityUserContext | null = null;
let cleanupHandlers: (() => void) | null = null;
let inMemoryEvents: ObservabilityEvent[] = [];

function isAbortLikeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'AbortError' ||
    error.message.includes('signal is aborted without reason') ||
    error.message.includes('The user aborted a request')
  );
}

function isExtensionNoise(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  if (!message) {
    return false;
  }

  return (
    message.includes('Extension context invalidated') ||
    message.includes('Node cannot be found in the current page')
  );
}

function shouldIgnoreObservabilityError(error: unknown): boolean {
  return isAbortLikeError(error) || isExtensionNoise(error);
}

function getCurrentPage(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.location.href;
}

function getStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function trimString(value: string, maxLength = 1000): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function sanitizeForObservability(value: unknown, depth = 0): unknown {
  if (value == null) {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: trimString(value.message, 500),
      stack: value.stack ? trimString(value.stack, 2000) : undefined,
    };
  }

  if (typeof value === 'string') {
    return trimString(value, 1000);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (depth >= 2) {
    return '[max-depth]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => sanitizeForObservability(item, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 20)
        .map(([key, entry]) => [key, sanitizeForObservability(entry, depth + 1)])
    );
  }

  return String(value);
}

function buildEvent(input: {
  level: ObservabilityLevel;
  source: string;
  message: string;
  details?: unknown;
  error?: unknown;
}): ObservabilityEvent {
  return {
    timestamp: new Date().toISOString(),
    level: input.level,
    source: input.source,
    message: input.message,
    page: getCurrentPage(),
    user: currentUserContext,
    details: input.details !== undefined ? sanitizeForObservability(input.details) : undefined,
    error:
      input.error !== undefined
        ? (sanitizeForObservability(input.error) as ObservabilityEvent['error'])
        : undefined,
  };
}

function persistEvent(event: ObservabilityEvent): void {
  const storage = getStorage();

  if (!storage) {
    inMemoryEvents = [...inMemoryEvents, event].slice(-OBSERVABILITY_BUFFER_LIMIT);
    return;
  }

  try {
    const current = storage.getItem(OBSERVABILITY_STORAGE_KEY);
    const parsed = current ? (JSON.parse(current) as ObservabilityEvent[]) : [];
    const next = [...parsed, event].slice(-OBSERVABILITY_BUFFER_LIMIT);
    storage.setItem(OBSERVABILITY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    inMemoryEvents = [...inMemoryEvents, event].slice(-OBSERVABILITY_BUFFER_LIMIT);
  }
}

function emitConsole(event: ObservabilityEvent): void {
  const prefix = `[%s] [%s] %s`;
  const baseArgs = [event.timestamp, event.source, event.message] as const;

  if (event.level === 'error') {
    if (IS_DEV && (event.error || event.details)) {
      console.error(prefix, ...baseArgs, event.error ?? event.details ?? '');
    } else {
      console.error(prefix, ...baseArgs);
    }
    return;
  }

  if (event.level === 'warn') {
    if (IS_PRODUCTION) {
      return;
    }
    console.warn(prefix, ...baseArgs, event.details ?? '');
    return;
  }

  if (!IS_PRODUCTION) {
    console.log(prefix, ...baseArgs, event.details ?? '');
  }
}

function trySendBeacon(event: ObservabilityEvent): void {
  if (!observabilityBeaconUrl || typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    return;
  }

  if (event.level !== 'error') {
    return;
  }

  try {
    navigator.sendBeacon(
      observabilityBeaconUrl,
      new Blob([JSON.stringify(event)], { type: 'application/json' })
    );
  } catch {
    // Best-effort only.
  }
}

function recordEvent(event: ObservabilityEvent): void {
  persistEvent(event);
  emitConsole(event);
  trySendBeacon(event);
}

export function setObservabilityUserContext(user: ObservabilityUserContext | null): void {
  currentUserContext = user;
}

export function captureLog(
  level: ObservabilityLevel,
  source: string,
  message: string,
  details?: unknown
): void {
  if (level === 'info' && IS_PRODUCTION) {
    return;
  }

  recordEvent(
    buildEvent({
      level,
      source,
      message,
      details,
    })
  );
}

export function captureException(source: string, error: unknown, details?: unknown): void {
  if (shouldIgnoreObservabilityError(error)) {
    return;
  }

  recordEvent(
    buildEvent({
      level: 'error',
      source,
      message: error instanceof Error ? error.message : 'Unhandled exception',
      details,
      error,
    })
  );
}

export function installObservabilityGlobalHandlers(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (cleanupHandlers) {
    return cleanupHandlers;
  }

  const handleError = (event: ErrorEvent) => {
    if (shouldIgnoreObservabilityError(event.error || event.message)) {
      return;
    }

    captureException('window.error', event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (shouldIgnoreObservabilityError(event.reason)) {
      return;
    }

    captureException('window.unhandledrejection', event.reason, {
      type: 'unhandledrejection',
    });
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  cleanupHandlers = () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    cleanupHandlers = null;
  };

  return cleanupHandlers;
}

export function getBufferedObservabilityEvents(): ObservabilityEvent[] {
  const storage = getStorage();

  if (!storage) {
    return inMemoryEvents;
  }

  try {
    const current = storage.getItem(OBSERVABILITY_STORAGE_KEY);
    return current ? (JSON.parse(current) as ObservabilityEvent[]) : [];
  } catch {
    return inMemoryEvents;
  }
}

export function clearBufferedObservabilityEvents(): void {
  const storage = getStorage();

  if (storage) {
    try {
      storage.setItem(OBSERVABILITY_STORAGE_KEY, JSON.stringify([]));
    } catch {
      // Ignore storage failures during cleanup.
    }
  }

  inMemoryEvents = [];
}
