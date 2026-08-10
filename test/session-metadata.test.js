import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizePatientName } from '../src/core/session-metadata.js';

test('patient name is normalized for local session metadata', () => {
    assert.equal(normalizePatientName('  Alex   Smith  '), 'Alex Smith');
    assert.equal(normalizePatientName('   '), null);
    assert.equal(normalizePatientName(null), null);
    assert.equal(normalizePatientName('x'.repeat(160)).length, 128);
});
