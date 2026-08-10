import assert from 'node:assert/strict';
import test from 'node:test';

import { createDefaultSettings } from '../src/core/settings-store.js';
import { buildReportVisuals } from '../src/features/report/report-visuals.js';

test('report visuals build a dataset-anchored calendar, hourly profile, and ESC distribution', () => {
    const settings = createDefaultSettings();
    const visuals = buildReportVisuals([
        measurement('2026-08-09 08:00', 118, 68, 58),
        measurement('2026-08-10 08:15', 142, 92, 72),
        measurement('2026-08-10 08:45', 138, 88, 68)
    ], settings);

    assert.equal(visuals.calendar.days.length, 30);
    assert.equal(visuals.calendar.days.at(-1).key, '2026-08-10');
    assert.equal(visuals.calendar.days.at(-1).count, 2);
    assert.equal(visuals.calendar.days.at(-1).systolic, 140);
    assert.equal(visuals.dailyProfile[8].count, 3);
    assert.equal(visuals.dailyProfile[8].systolic, 398 / 3);
    assert.deepEqual(
        visuals.escDistribution.map(item => [item.category, item.count]),
        [['hypertension', 1], ['elevated-bp', 1], ['non-elevated', 1]]
    );
});

test('report visuals return empty calendar and distribution for an empty dataset', () => {
    const visuals = buildReportVisuals([], createDefaultSettings());
    assert.deepEqual(visuals.calendar.days, []);
    assert.equal(visuals.dailyProfile.length, 24);
    assert.deepEqual(visuals.escDistribution, []);
});

function measurement(datetime, systolic, diastolic, pulse) {
    return {
        datetime,
        systolic,
        diastolic,
        pulse,
        errorCode: 0,
        error: 'none',
        bodyPosition: 'lying',
        measurementMethod: 'automatic',
        hasMovement: false,
        comment: '',
        edited: false,
        editedAt: null
    };
}
