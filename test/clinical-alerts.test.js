import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateClinicalAlert } from '../src/core/alert-evaluator.js';
import { createDefaultSettings } from '../src/core/settings-store.js';

const settings = createDefaultSettings();

test('very high readings alert immediately and repeated high readings use a configurable window', () => {
    assert.deepEqual(evaluateClinicalAlert([measurement(182, 90)], settings), {
        type: 'very-high', count: 1, window: 1
    });
    assert.deepEqual(evaluateClinicalAlert([
        measurement(120, 75),
        measurement(145, 92),
        measurement(150, 95)
    ], settings), { type: 'repeated-high', count: 2, window: 3 });
    assert.equal(evaluateClinicalAlert([measurement(145, 92)], settings), null);
});

test('movement and device-error readings are excluded from alerts by default', () => {
    assert.equal(evaluateClinicalAlert([
        measurement(190, 110, { hasMovement: true }),
        measurement(190, 110, { errorCode: 2, error: 'movement' })
    ], settings), null);
});

test('repeated alerts use the selected ABPM day/night comparison boundaries', () => {
    assert.deepEqual(evaluateClinicalAlert([
        measurement(122, 69, { datetime: '2026-08-10 23:00' }),
        measurement(121, 68, { datetime: '2026-08-11 01:00' })
    ], settings), { type: 'repeated-high', count: 2, window: 2 });
    assert.equal(evaluateClinicalAlert([
        measurement(122, 69, { datetime: '2026-08-10 10:00' }),
        measurement(121, 68, { datetime: '2026-08-10 12:00' })
    ], settings), null);
});

function measurement(systolic, diastolic, extra = {}) {
    return {
        systolic,
        diastolic,
        pulse: 70,
        datetime: '2026-08-10 10:00',
        errorCode: 0,
        error: 'none',
        hasMovement: false,
        ...extra
    };
}
