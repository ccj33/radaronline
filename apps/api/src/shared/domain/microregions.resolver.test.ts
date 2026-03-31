import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isGlobalMicroregionMarker,
  resolveMicroregion,
  splitMicroregionInput,
} from './microregions.resolver.js';

test('resolveMicroregion matches ids, codes and accentless names', () => {
  const byId = resolveMicroregion('mr011');
  assert.equal(byId.status, 'exact-id');
  assert.equal(byId.id, 'MR011');

  const byCode = resolveMicroregion('31011');
  assert.equal(byCode.status, 'exact-code');
  assert.equal(byCode.id, 'MR011');

  const byName = resolveMicroregion('sao joao del rei');
  assert.equal(byName.status, 'exact-name');
  assert.equal(byName.id, 'MR015');
});

test('resolveMicroregion keeps fuzzy typos visible for review instead of silently forcing exact matches', () => {
  const fuzzy = resolveMicroregion('vargina');
  assert.equal(fuzzy.status, 'fuzzy');
  assert.equal(fuzzy.id, 'MR012');
  assert.ok(fuzzy.suggestions.some((item) => item.includes('MR012')));
});

test('helpers split multi-micro inputs and detect global markers', () => {
  assert.deepEqual(splitMicroregionInput('MR011 | MR012, 31015'), ['MR011', 'MR012', '31015']);
  assert.equal(isGlobalMicroregionMarker('Todas'), true);
  assert.equal(isGlobalMicroregionMarker('MR011'), false);
});
