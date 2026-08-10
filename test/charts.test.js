import assert from 'node:assert/strict';
import test from 'node:test';

import {
    calculateCombinedChartBounds,
    formatCombinedXAxisLabel,
    selectCombinedChartMeasurements
} from '../src/features/charts/combined-data.js';

test('24-hour chart view excludes stale readings while all-data view retains them', () => {
    const now = new Date('2026-08-10T12:00:00Z');
    const measurements = [
        reading('2026-08-09T11:59:59Z', 120, 80, 60),
        reading('2026-08-09T12:00:00Z', 125, 82, 65),
        reading('2026-08-10T11:30:00Z', 130, 85, 70),
        reading('2026-08-10T11:45:00Z', 0, 0, 0)
    ];

    assert.deepEqual(
        selectCombinedChartMeasurements(measurements, 'last24', now).map(item => item.systolic),
        [125, 130]
    );
    assert.equal(selectCombinedChartMeasurements(measurements, 'all', now).length, 3);
});

test('single-reading chart bounds remain non-zero and clinically plausible', () => {
    const bounds = calculateCombinedChartBounds([reading('2026-08-10T11:30:00Z', 120, 80, 65)]);

    assert.deepEqual(bounds.pressure, { min: 75, max: 125 });
    assert.deepEqual(bounds.pulse, { min: 60, max: 70 });
    assert.equal(calculateCombinedChartBounds([]), null);
});

test('x-axis formatter accepts date strings and numeric zoom ticks', () => {
    assert.equal(formatCombinedXAxisLabel('2026-08-10 00:00'), '2026-08-10');
    assert.equal(formatCombinedXAxisLabel('2026-08-10 12:30'), '12:30');
    assert.equal(formatCombinedXAxisLabel(42), '42');
    assert.equal(formatCombinedXAxisLabel(null), '');
});

function reading(datetime, systolic, diastolic, pulse) {
    return { datetime, systolic, diastolic, pulse };
}
