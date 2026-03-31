import { afterEach, describe, expect, it } from 'vitest';

import { addFallbackMaterial, getFallbackMaterials } from './repositoryFallbackStore';

describe('repositoryFallbackStore', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('adds fallback materials locally', () => {
    const initialCount = getFallbackMaterials().length;

    expect(
      addFallbackMaterial({
        title: 'Manual local',
        description: 'Descricao curta',
        type: 'manual',
        category: 'Gestão',
        author: 'Equipe local',
        url: '',
      }),
    ).toBe(true);

    expect(getFallbackMaterials()).toHaveLength(initialCount + 1);
  });
});
