import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeEventCorrelations } from '../src/core/analytics/event-correlation.js';
import { normalizeEvent } from '../src/core/event-schema.js';

test('event analysis compares paired before and after windows and groups repeated events', () => {
    const events = [
        medication('2026-08-10T10:00'),
        medication('2026-08-11T10:00')
    ];
    const measurements = [
        reading('2026-08-10 09:30', 140, 90, 80),
        reading('2026-08-10 10:30', 130, 84, 72),
        reading('2026-08-11 09:30', 138, 88, 78),
        reading('2026-08-11 10:30', 126, 82, 70)
    ];

    const [group] = analyzeEventCorrelations(events, measurements);

    assert.equal(group.occurrenceCount, 2);
    assert.equal(group.label, 'Morning medicine');
    assert.equal(group.comparableOccurrences, 2);
    assert.equal(group.quality, 'repeated');
    assert.equal(group.before.systolic, 139);
    assert.equal(group.after.systolic, 128);
    assert.equal(group.delta.systolic, -11);
    assert.equal(group.delta.pulse, -8);
});

test('activity response window starts after the recorded duration', () => {
    const event = normalizeEvent({
        type: 'activity',
        name: 'Walk',
        datetime: '2026-08-10T10:00',
        durationMinutes: 60,
        analysisWindowMinutes: 60
    });
    const [group] = analyzeEventCorrelations([event], [
        reading('2026-08-10 09:30', 120, 75, 65),
        reading('2026-08-10 10:30', 150, 90, 100),
        reading('2026-08-10 11:30', 118, 73, 62)
    ]);

    assert.equal(group.after.systolic, 118);
    assert.equal(group.afterReadings, 1);
});

function medication(datetime) {
    return normalizeEvent({
        type: 'medication',
        label: 'Morning medicine',
        name: 'Amlodipine',
        dose: '5 mg',
        datetime,
        analysisWindowMinutes: 60
    });
}

function reading(datetime, systolic, diastolic, pulse) {
    return { datetime, systolic, diastolic, pulse };
}
