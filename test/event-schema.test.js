import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeEvent } from '../src/core/event-schema.js';

test('structured events validate type, local timestamp, duration, intensity, and note', () => {
    const event = normalizeEvent({
        id: 'coffee-1',
        type: 'coffee',
        datetime: '2026-08-10 09:15',
        durationMinutes: 20,
        intensity: 3,
        note: `  ${'x'.repeat(600)}  `
    });
    assert.equal(event.datetime, '2026-08-10T09:15');
    assert.equal(event.note.length, 500);
    assert.equal(event.intensity, 3);
    assert.equal(event.analysisWindowMinutes, 120);
    assert.throws(() => normalizeEvent({ ...event, type: 'diagnosis' }), /type/);
    assert.throws(() => normalizeEvent({ ...event, intensity: 6 }), /intensity/);
});

test('medication, procedure, and activity details are canonical and bounded', () => {
    const medication = normalizeEvent({
        type: 'medication',
        datetime: '2026-08-10T09:15',
        label: ' Morning medicine ',
        name: ' Amlodipine ',
        dose: ' 5 mg ',
        analysisWindowMinutes: 240
    });
    assert.equal(medication.name, 'Amlodipine');
    assert.equal(medication.label, 'Morning medicine');
    assert.equal(medication.dose, '5 mg');
    assert.equal(medication.analysisWindowMinutes, 240);
    assert.equal(normalizeEvent({ ...medication, anchorMeasurementKey: 'key', offsetMinutes: -15, presetId: 'preset-medication' }).offsetMinutes, -15);
    assert.equal(normalizeEvent({ ...medication, type: 'procedure', dose: 'ignored' }).dose, '');
    assert.equal(normalizeEvent({ ...medication, type: 'activity' }).type, 'activity');
    assert.throws(() => normalizeEvent({ ...medication, analysisWindowMinutes: 15 }), /analysisWindowMinutes/);
});
