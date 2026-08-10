import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyBloodPressure, getTimePeriod } from '../src/core/blood-pressure.js';

test('ESC classification prioritizes crisis and hypertension thresholds', () => {
    const crisis = classifyBloodPressure(180, 80);
    assert.equal(crisis.level, 'crisis');
    assert.equal(crisis.noteKey, 'bp.reference-note.very-high');
    assert.equal('recommendationKey' in crisis, false);
    assert.equal(classifyBloodPressure(130, 90).level, 'high');
    assert.equal(classifyBloodPressure(125, 65).level, 'elevated');
    assert.equal(classifyBloodPressure(115, 65).level, 'normal');
    assert.equal(classifyBloodPressure(85, 55).level, 'low');
});

test('day and night periods use 06:00 and 22:00 boundaries', () => {
    assert.equal(getTimePeriod('2026-08-10 05:59'), 'night');
    assert.equal(getTimePeriod('2026-08-10 06:00'), 'day');
    assert.equal(getTimePeriod('2026-08-10 22:00'), 'night');
});
