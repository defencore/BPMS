import assert from 'node:assert/strict';
import test from 'node:test';

import {
    USAGE_POLICY_STORAGE_KEY,
    USAGE_POLICY_VERSION,
    acceptUsagePolicy,
    readUsagePolicyAcceptance
} from '../src/core/usage-policy.js';

test('usage-policy acceptance is versioned and persisted', () => {
    const storage = memoryStorage();
    assert.equal(readUsagePolicyAcceptance(storage), null);
    const acceptedAt = new Date('2026-08-10T10:00:00.000Z');
    assert.deepEqual(acceptUsagePolicy(storage, acceptedAt), {
        accepted: true,
        version: USAGE_POLICY_VERSION,
        acceptedAt: acceptedAt.toISOString()
    });
    assert.equal(readUsagePolicyAcceptance(storage)?.version, USAGE_POLICY_VERSION);
    assert.ok(storage.getItem(USAGE_POLICY_STORAGE_KEY));
});

test('stale or malformed acceptance requires a new acknowledgement', () => {
    const storage = memoryStorage();
    storage.setItem(USAGE_POLICY_STORAGE_KEY, JSON.stringify({ accepted: true, version: '0.9.0' }));
    assert.equal(readUsagePolicyAcceptance(storage), null);
    storage.setItem(USAGE_POLICY_STORAGE_KEY, '{');
    assert.equal(readUsagePolicyAcceptance(storage), null);
    assert.equal(storage.getItem(USAGE_POLICY_STORAGE_KEY), null);
});

function memoryStorage() {
    const values = new Map();
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };
}
