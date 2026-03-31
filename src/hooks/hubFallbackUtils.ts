export function getHubErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message.toLowerCase();
    }
  }

  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  return String(error).toLowerCase();
}

export function isHubBackendUnavailable(error: unknown): boolean {
  const message = getHubErrorMessage(error);

  return (
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('schema cache') ||
    message.includes('could not find the table')
  );
}

export function normalizeHubError(error: unknown, fallbackMessage: string): string {
  if (isHubBackendUnavailable(error)) {
    return fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Erro ao carregar dados do Hub.';
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function generateHubId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function canUseHubStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readHubStore<T>(
  storageKey: string,
  createInitialStore: () => T,
  isValid: (value: unknown) => boolean,
): T {
  if (!canUseHubStorage()) {
    return createInitialStore();
  }

  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      const seededStore = createInitialStore();
      window.localStorage.setItem(storageKey, JSON.stringify(seededStore));
      return seededStore;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isValid(parsed)) {
      const seededStore = createInitialStore();
      window.localStorage.setItem(storageKey, JSON.stringify(seededStore));
      return seededStore;
    }

    return parsed as T;
  } catch {
    return createInitialStore();
  }
}

export function writeHubStore<T>(
  storageKey: string,
  updateEvent: string,
  store: T,
  options?: { notify?: boolean },
) {
  if (canUseHubStorage()) {
    window.localStorage.setItem(storageKey, JSON.stringify(store));
  }

  if (options?.notify === false || typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(updateEvent));
}

export function subscribeToHubStore(
  storageKey: string,
  updateEvent: string,
  callback: () => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleUpdate = () => callback();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey) {
      callback();
    }
  };

  window.addEventListener(updateEvent, handleUpdate);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(updateEvent, handleUpdate);
    window.removeEventListener('storage', handleStorage);
  };
}
