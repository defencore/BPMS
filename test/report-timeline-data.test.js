import assert from 'node:assert/strict';
import test from 'node:test';

import { cloneClinicalDefaults } from '../src/core/clinical-config.js';
import { withPressureBoundaries } from '../src/features/report/report-timeline-data.js';

test('PDF pressure timeline uses configured awake and asleep boundaries', () => {
    const settings = cloneClinicalDefaults();
    const values = withPressureBoundaries([
        { datetime: '2026-08-10 12:00', systolic: 130, diastolic: 80 },
        { datetime: '2026-08-10 23:00', systolic: 120, diastolic: 70 }
    ], settings);
    assert.deepEqual(values.map(item => [item.systolicBoundary, item.diastolicBoundary]), [[135, 85], [120, 70]]);
});
