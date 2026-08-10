import {
    meanArterialPressure,
    pulsePressure,
    scaledRatePressureProduct
} from './measurement-metrics.js';

const METRICS = Object.freeze({
    systolic: measurement => measurement.systolic,
    diastolic: measurement => measurement.diastolic,
    meanArterialPressure,
    pulse: measurement => measurement.pulse,
    pulsePressure,
    scaledRpp: scaledRatePressureProduct
});

export function summarizeExtremes(measurements) {
    const result = {};
    for (const [key, valueFor] of Object.entries(METRICS)) {
        result[key] = findExtremes(measurements, valueFor);
    }
    return Object.freeze(result);
}

function findExtremes(measurements, valueFor) {
    const values = measurements
        .map(measurement => ({ value: valueFor(measurement), datetime: measurement.datetime }))
        .filter(item => Number.isFinite(item.value));
    if (!values.length) return null;
    let minimum = values[0];
    let maximum = values[0];
    for (const item of values.slice(1)) {
        if (item.value < minimum.value) minimum = item;
        if (item.value > maximum.value) maximum = item;
    }
    return Object.freeze({ min: Object.freeze(minimum), max: Object.freeze(maximum) });
}

