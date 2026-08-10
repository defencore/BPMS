import assert from 'node:assert/strict';
import test from 'node:test';

import { LOCAL_DATASET_STORAGE_KEY, clearLocalDataset, loadLocalDataset, saveLocalDataset } from '../src/core/local-dataset.js';

test('measurements and context events persist only in the supplied browser storage', () => {
    const storage = memoryStorage();
    const dataset = {
        deviceInfo: {},
        measurements: [{
            systolic: 120,
            diastolic: 80,
            pulse: 65,
            datetime: '2026-08-10 10:00',
            errorCode: 0,
            error: 'none',
            bodyPosition: 'sitting',
            measurementMethod: 'manual',
            hasMovement: false,
            comment: '',
            edited: false,
            editedAt: null
        }],
        events: []
    };

    assert.equal(saveLocalDataset(dataset, storage), true);
    assert.ok(storage.getItem(LOCAL_DATASET_STORAGE_KEY));
    assert.equal(loadLocalDataset(storage).measurements[0].systolic, 120);
    clearLocalDataset(storage);
    assert.equal(loadLocalDataset(storage), null);
});

function memoryStorage() {
    const values = new Map();
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };
}
