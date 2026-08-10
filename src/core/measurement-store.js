import { normalizeMeasurement } from './data-schema.js';
import { deleteMeasurementEvents } from './event-store.js';
import { getMeasurementAt, insertMeasurement, removeMeasurementAt, state, updateMeasurementAt } from './state.js';

export function addManualMeasurement(values) {
    const measurement = normalizeMeasurement({
        ...values,
        measurementMethod: 'manual',
        bodyPosition: values.bodyPosition || 'unknown'
    }, state.measurements.length);
    insertMeasurement(measurement);
    return measurement;
}

export function updateStoredMeasurement(index, values) {
    const current = getMeasurementAt(index);
    const measurement = normalizeMeasurement({
        ...current,
        ...values,
        measurementMethod: current.measurementMethod,
        edited: true,
        editedAt: new Date().toISOString()
    }, index);
    return updateMeasurementAt(index, measurement);
}

export function deleteStoredMeasurement(index) {
    const measurement = getMeasurementAt(index);
    deleteMeasurementEvents(measurement);
    return removeMeasurementAt(index);
}
