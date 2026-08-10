import assert from 'node:assert/strict';
import test from 'node:test';

import { createDefaultSettings } from '../src/core/settings-store.js';
import { buildReportModel } from '../src/features/report/report-data.js';

test('report keeps complete data while primary summary respects analysis filters', () => {
    const settings = createDefaultSettings();
    settings.analysis.ignoreMovementReadings = true;
    const values = [
        measurement('2026-08-09 23:30', 120, 80, 60),
        { ...measurement('2026-08-10 08:00', 150, 95, 90), hasMovement: true },
        { ...measurement('2026-08-10 09:00', 130, 85, 70), measurementMethod: 'manual', edited: true, comment: 'After coffee' }
    ];

    const model = buildReportModel({ measurements: values, events: [], settings, deviceInfo: {} });

    assert.equal(model.recorded.length, 3);
    assert.equal(model.chartMeasurements.length, 3);
    assert.equal(model.primaryMeasurements.length, 2);
    assert.equal(model.quality.excluded, 1);
    assert.equal(model.quality.movement, 1);
    assert.equal(model.quality.manual, 1);
    assert.equal(model.quality.edited, 1);
    assert.equal(model.quality.comments, 1);
    assert.equal(model.daily.length, 2);
    assert.equal(model.sessions.length, 1);
    assert.equal(model.allValuesSummary.count, 3);
    assert.equal(model.summary.count, 2);
    assert.ok(model.summary.meanArterialPressure.mean > 90);
    assert.equal(model.hourlyProfile.length, 24);
    assert.equal(model.extremes.systolic.max.value, 130);
    assert.equal(model.correlations.length, 4);
    assert.equal(model.visuals.calendar.days.at(-1).count, 1);
    assert.equal(model.visuals.escDistribution.reduce((sum, item) => sum + item.count, 0), 2);
});

test('device errors stay in the appendix but not in usable charts or summaries', () => {
    const settings = createDefaultSettings();
    const broken = { ...measurement('2026-08-10 08:00', 150, 95, 90), errorCode: 2, error: 'device' };
    const model = buildReportModel({
        measurements: [broken, measurement('2026-08-10 08:30', 125, 75, 65)],
        events: [],
        settings,
        deviceInfo: {}
    });

    assert.equal(model.recorded.length, 2);
    assert.equal(model.chartMeasurements.length, 1);
    assert.equal(model.primaryMeasurements.length, 1);
    assert.equal(model.quality.deviceErrors, 1);
});

test('report model includes event before and after comparisons for the clinician section', () => {
    const settings = createDefaultSettings();
    const event = {
        id: 'med-1',
        type: 'medication',
        datetime: '2026-08-10T10:00',
        name: 'Example medicine',
        dose: '5 mg',
        durationMinutes: 0,
        intensity: null,
        analysisWindowMinutes: 60,
        note: '',
        edited: false,
        editedAt: null
    };
    const model = buildReportModel({
        measurements: [
            measurement('2026-08-10 09:30', 140, 90, 80),
            measurement('2026-08-10 10:30', 130, 84, 72)
        ],
        events: [event],
        settings,
        deviceInfo: {}
    });

    assert.equal(model.eventCorrelations.length, 1);
    assert.equal(model.eventCorrelations[0].delta.systolic, -10);
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
