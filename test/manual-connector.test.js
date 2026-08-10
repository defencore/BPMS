import assert from 'node:assert/strict';
import test from 'node:test';

import { manualConnector } from '../src/connectors/manual.js';
import { deleteStoredMeasurement, updateStoredMeasurement } from '../src/core/measurement-store.js';
import { resetApplicationState, state } from '../src/core/state.js';

test('stored measurements support add, edit, comment, and delete', () => {
    resetApplicationState();
    manualConnector.addMeasurement({
        systolic: 121,
        diastolic: 78,
        pulse: 64,
        datetime: '2026-08-10 09:15',
        bodyPosition: 'sitting',
        comment: 'Before medication'
    });
    assert.equal(state.measurements.length, 1);
    assert.equal(state.measurements[0].comment, 'Before medication');

    updateStoredMeasurement(0, { systolic: 124, comment: 'After a short walk' });
    assert.equal(state.measurements[0].systolic, 124);
    assert.equal(state.measurements[0].comment, 'After a short walk');
    assert.equal(state.measurements[0].bodyPosition, 'sitting');
    assert.equal(state.measurements[0].edited, true);
    assert.match(state.measurements[0].editedAt, /^\d{4}-\d{2}-\d{2}T/u);

    deleteStoredMeasurement(0);
    assert.equal(state.measurements.length, 0);
});

test('automatic and imported measurements can be corrected without changing their source type', () => {
    resetApplicationState();
    state.measurements = [{
        index: 0,
        systolic: 160,
        diastolic: 95,
        pulse: 72,
        datetime: '2026-08-10 10:00',
        errorCode: 0,
        error: 'none',
        bodyPosition: 'lying',
        measurementMethod: 'automatic',
        hasMovement: false,
        comment: '',
        edited: false,
        editedAt: null
    }];
    updateStoredMeasurement(0, { systolic: 125, comment: 'Corrected cuff artefact' });
    assert.equal(state.measurements[0].measurementMethod, 'automatic');
    assert.equal(state.measurements[0].systolic, 125);
    assert.equal(state.measurements[0].comment, 'Corrected cuff artefact');
    deleteStoredMeasurement(0);
    assert.equal(state.measurements.length, 0);
});
