import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeMeasurementSets } from '../src/core/merge-measurements.js';

const first = { systolic: 120, diastolic: 75, pulse: 65, datetime: '2026-08-10 10:00' };
const second = { systolic: 130, diastolic: 80, pulse: 70, datetime: '2026-08-09 10:00' };

test('file merge removes exact duplicates and sorts chronologically', () => {
    const result = mergeMeasurementSets([
        { name: 'a.json', measurements: [first] },
        { name: 'b.json', measurements: [first, second] }
    ]);
    assert.equal(result.duplicates, 1);
    assert.deepEqual(result.measurements.map(item => item.datetime), ['2026-08-09 10:00', '2026-08-10 10:00']);
    assert.equal(result.measurements[1].source, 'a.json');
});
