import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeMeasurement } from '../src/core/data-schema.js';
import { replaceMeasurementEvents } from '../src/core/event-store.js';
import { eventDateTimeFromMeasurement, eventsForMeasurement, formatEventOffset, measurementAnchorKey } from '../src/core/measurement-context.js';
import { deleteStoredMeasurement } from '../src/core/measurement-store.js';
import { replaceMeasurements, resetApplicationState, state } from '../src/core/state.js';

test('signed context offsets are readable and produce an absolute event time', () => {
    const measurement = reading('2026-08-10 10:00');
    assert.equal(formatEventOffset(-15), '-00:15');
    assert.equal(formatEventOffset(90), '+01:30');
    assert.equal(formatEventOffset(0), '±00:00');
    assert.equal(eventDateTimeFromMeasurement(measurement, -15), '2026-08-10T09:45');
});

test('measurement events are linked, replaceable after an edit, and deleted with the reading', () => {
    resetApplicationState();
    const original = reading('2026-08-10 10:00');
    replaceMeasurements([original]);
    replaceMeasurementEvents(null, original, [contextDraft(-15)]);
    assert.equal(eventsForMeasurement(state.events, original).length, 1);
    assert.equal(state.events[0].datetime, '2026-08-10T09:45');

    const edited = reading('2026-08-10 10:30');
    replaceMeasurements([edited]);
    replaceMeasurementEvents(measurementAnchorKey(original), edited, [contextDraft(30)]);
    assert.equal(state.events.length, 1);
    assert.equal(state.events[0].datetime, '2026-08-10T11:00');
    assert.equal(eventsForMeasurement(state.events, edited).length, 1);

    deleteStoredMeasurement(0);
    assert.equal(state.measurements.length, 0);
    assert.equal(state.events.length, 0);
});

function reading(datetime) {
    return normalizeMeasurement({
        systolic: 120,
        diastolic: 80,
        pulse: 65,
        datetime,
        errorCode: 0,
        error: 'none',
        bodyPosition: 'sitting',
        measurementMethod: 'manual',
        hasMovement: false,
        comment: '',
        edited: false,
        editedAt: null
    });
}

function contextDraft(offsetMinutes) {
    return {
        presetId: 'preset-medication',
        type: 'medication',
        label: 'Morning medicine',
        name: 'Example medicine',
        dose: '5 mg',
        offsetMinutes,
        durationMinutes: 0,
        intensity: null,
        analysisWindowMinutes: 240,
        note: ''
    };
}
