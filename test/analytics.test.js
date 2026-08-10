import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeMonitoringSession } from '../src/core/analytics/analyze-session.js';
import { calculatePressureExposure } from '../src/core/analytics/exposure.js';
import { summarizeMeasurements } from '../src/core/analytics/statistics.js';
import { buildMonitoringSessions } from '../src/core/analytics/sessions.js';
import { createDefaultSettings } from '../src/core/settings-store.js';

test('descriptive metrics calculate PP, scaled RPP, SD, CV, and ARV', () => {
    const summary = summarizeMeasurements([
        measurement('2026-08-10 08:00', 120, 80, 60),
        measurement('2026-08-10 08:30', 140, 90, 70)
    ]);
    assert.equal(summary.pulsePressure.mean, 45);
    assert.equal(summary.scaledRpp.mean, 85);
    assert.equal(summary.systolic.sd, 10);
    assert.equal(summary.systolic.arv, 20);
    assert.ok(summary.systolic.cv > 7 && summary.systolic.cv < 8);
});

test('24-hour analysis separates awake/asleep readings and assesses session quality', () => {
    const settings = createDefaultSettings();
    const measurements = halfHourlyDay();
    const [session] = buildMonitoringSessions(measurements, 24);
    const analysis = analyzeMonitoringSession(session, [], settings);

    assert.equal(analysis.summaries.full.count, 48);
    assert.equal(analysis.summaries.day.count, 32);
    assert.equal(analysis.summaries.night.count, 16);
    assert.equal(analysis.quality.sufficient, true);
    assert.equal(analysis.dipping.systolicCategory, 'dipper');
    assert.ok(analysis.dipping.systolic > 10 && analysis.dipping.systolic < 20);
    assert.equal(analysis.morningSurge.available, true);
});

test('reading load, time above range, and hyperbaric area remain separate metrics', () => {
    const values = [
        measurement('2026-08-10 08:00', 140, 90, 70),
        measurement('2026-08-10 08:30', 130, 80, 65),
        measurement('2026-08-10 09:00', 145, 92, 72)
    ];
    const exposure = calculatePressureExposure(values, () => ({ systolic: 135, diastolic: 85 }), 60);
    assert.ok(Math.abs(exposure.readingLoadPercent - 200 / 3) < 1e-10);
    assert.equal(exposure.timeAbovePercent, 50);
    assert.equal(exposure.systolicHyperbaricIndex, 2.5);
    assert.equal(exposure.diastolicHyperbaricIndex, 2.5);
});

function halfHourlyDay() {
    return Array.from({ length: 48 }, (_, index) => {
        const hour = Math.floor(index / 2);
        const minute = index % 2 ? 30 : 0;
        const asleep = hour >= 22 || hour < 6;
        return measurement(
            `2026-08-10 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            asleep ? 118 : 138,
            asleep ? 72 : 84,
            asleep ? 58 : 68
        );
    });
}

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
