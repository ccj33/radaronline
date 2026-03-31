import { afterEach, describe, expect, it } from 'vitest';

import { isHubBackendUnavailable, normalizeHubError } from './hubFallbackUtils';

describe('hubFallbackUtils', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('detects missing hub relations as unavailable backend', () => {
    expect(isHubBackendUnavailable(new Error('relation "courses" does not exist'))).toBe(true);
    expect(isHubBackendUnavailable(new Error('404 not found'))).toBe(true);
    expect(isHubBackendUnavailable(new Error('permission denied'))).toBe(false);
  });

  it('keeps original message for non-fallback errors', () => {
    expect(normalizeHubError(new Error('falha qualquer'), 'fallback')).toBe('falha qualquer');
  });
});
