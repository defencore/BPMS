import test from 'node:test';
import assert from 'node:assert/strict';
import { createExportPayload, measurementIdentity, normalizeMeasurement, parseExportPayload } from '../src/core/data-schema.js';

const source = {
    systolic: 118,
    diastolic: 72,
    pulse: 61,
    datetime: '2026-08-10 12:30',
    errorCode: 0,
    error: 'none',
    bodyPosition: 'lying',
    measurementMethod: 'automatic',
    measurementEvent: 'automatic',
    hasMovement: false,
    comment: '',
    edited: false,
    editedAt: null
};

test('exported JSON imports back into the canonical model', () => {
    const event = { id: 'wake-1', type: 'wake-up', datetime: '2026-08-10T06:30', durationMinutes: 0, intensity: null, note: 'Alarm', edited: false, editedAt: null };
    const payload = createExportPayload({ deviceInfo: { id: 'WBP-02A', username: 'Test' }, measurements: [source], events: [event] });
    const imported = parseExportPayload(JSON.parse(JSON.stringify(payload)));
    assert.equal(payload.schema, 'bpms');
    assert.equal(payload.version, 2);
    assert.deepEqual(imported.measurements[0], { index: 0, ...source });
    assert.equal(imported.deviceInfo.id, 'WBP-02A');
    assert.deepEqual(imported.events[0], {
        ...event,
        anchorMeasurementKey: '',
        offsetMinutes: 0,
        presetId: '',
        label: '',
        name: '',
        dose: '',
        analysisWindowMinutes: 120
    });
});

test('version 1 payloads migrate to the current model with an empty context-event collection', () => {
    const imported = parseExportPayload({ schema: 'bpms', version: 1, device: {}, measurements: [source] });
    assert.deepEqual(imported.events, []);
    assert.equal(imported.measurements.length, 1);
});

test('invalid and stale payloads fail clearly', () => {
    assert.throws(() => parseExportPayload({ measurements: [] }), /Unsupported data schema/);
    assert.throws(() => parseExportPayload({ schema: 'bpms', version: 1, measurements: [{ ...source, pulse: 0 }] }), /pulse/);
    assert.throws(() => parseExportPayload({ schema: 'bpms', version: 1, measurements: [{ ...source, datetime: '2026-02-31 10:00' }] }), /datetime/);
});

test('duplicate identity includes timestamp and vital values', () => {
    assert.equal(measurementIdentity(source), '2026-08-10 12:30|118|72|61');
});

test('bodyPosition is canonical and preserves separate manual postures', () => {
    assert.equal(normalizeMeasurement({ ...source, bodyPosition: 'sitting' }).bodyPosition, 'sitting');
    assert.equal(normalizeMeasurement({ ...source, bodyPosition: 'standing' }).bodyPosition, 'standing');
    assert.throws(
        () => normalizeMeasurement({ ...source, bodyPosition: undefined, position: 'Legacy sitting value' }),
        /bodyPosition/
    );
});

test('comments are normalized and preserved by export', () => {
    const comment = `  ${'x'.repeat(600)}  `;
    const normalized = normalizeMeasurement({ ...source, comment });
    assert.equal(normalized.comment.length, 500);
    assert.equal(createExportPayload({ measurements: [normalized] }).measurements[0].comment, normalized.comment);
});

test('local edit metadata is normalized and preserved by export', () => {
    const editedAt = '2026-08-10T10:00:00.000Z';
    const normalized = normalizeMeasurement({ ...source, edited: true, editedAt });
    assert.equal(normalized.edited, true);
    assert.equal(normalized.editedAt, editedAt);
    assert.equal(createExportPayload({ measurements: [normalized] }).measurements[0].editedAt, editedAt);
    assert.throws(() => normalizeMeasurement({ ...source, editedAt: 'not-a-date' }), /edit timestamp/);
});
