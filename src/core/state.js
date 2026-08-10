import { clearLocalDataset, saveLocalDataset } from './local-dataset.js';

export function createDeviceInfo() {
    return {
        id: null,
        numRecords: 0,
        username: null,
        usernameSource: null,
        userId: null,
        serialNumber: null,
        macAddress: null
    };
}

export const state = {
    measurements: [],
    events: [],
    deviceInfo: createDeviceInfo(),
    charts: {
        combined: null,
        systolicHistogram: null,
        diastolicHistogram: null,
        pulseHistogram: null,
        escDistribution: null,
        monthlyPressure: null,
        dailyProfile: null
    }
};

export function replaceMeasurements(measurements) {
    state.measurements = measurements.map((measurement, index) => ({
        ...measurement,
        index
    }));
    persistState();
}

export function replaceEvents(events) {
    state.events = [...events].sort(compareEvents);
    persistState();
}

export function updateDeviceInfo(changes, replace = false) {
    state.deviceInfo = replace ? { ...createDeviceInfo(), ...changes } : { ...state.deviceInfo, ...changes };
    persistState();
    return state.deviceInfo;
}

export function hydrateApplicationState(dataset) {
    if (!dataset) return;
    state.measurements = dataset.measurements.map((measurement, index) => ({ ...measurement, index }));
    state.events = [...dataset.events].sort(compareEvents);
    state.deviceInfo = { ...createDeviceInfo(), ...dataset.deviceInfo, numRecords: dataset.measurements.length };
}

export function insertMeasurement(measurement) {
    replaceMeasurements([...state.measurements, measurement].sort(compareMeasurements));
    return state.measurements.findIndex(candidate => candidate === measurement
        || (candidate.datetime === measurement.datetime
            && candidate.systolic === measurement.systolic
            && candidate.diastolic === measurement.diastolic
            && candidate.pulse === measurement.pulse));
}

export function updateMeasurementAt(index, measurement) {
    assertMeasurementIndex(index);
    const next = [...state.measurements];
    next[index] = measurement;
    replaceMeasurements(next.sort(compareMeasurements));
    return measurement;
}

export function removeMeasurementAt(index) {
    assertMeasurementIndex(index);
    const [removed] = state.measurements.splice(index, 1);
    replaceMeasurements(state.measurements);
    return removed;
}

export function getMeasurementAt(index) {
    assertMeasurementIndex(index);
    return state.measurements[index];
}

export function resetApplicationState() {
    state.measurements = [];
    state.events = [];
    state.deviceInfo = createDeviceInfo();
    clearLocalDataset();
}

function persistState() {
    saveLocalDataset({ deviceInfo: state.deviceInfo, measurements: state.measurements, events: state.events });
}

function compareEvents(left, right) {
    return left.datetime.localeCompare(right.datetime);
}

function compareMeasurements(left, right) {
    return left.datetime.localeCompare(right.datetime);
}

function assertMeasurementIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index >= state.measurements.length) {
        throw new RangeError(`Unknown measurement index: ${index}`);
    }
}
