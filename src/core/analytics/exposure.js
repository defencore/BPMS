import { parseMeasurementDate } from './time.js';

export function calculatePressureExposure(measurements, thresholdForMeasurement, maximumIntervalMinutes = 60) {
    if (!measurements.length) return emptyExposure();
    const ordered = measurements
        .map(measurement => ({ measurement, date: parseMeasurementDate(measurement.datetime) }))
        .filter(item => item.date)
        .sort((left, right) => left.date - right.date);
    if (!ordered.length) return emptyExposure();

    let aboveCount = 0;
    let systolicAboveCount = 0;
    let diastolicAboveCount = 0;
    let observedMinutes = 0;
    let aboveMinutes = 0;
    let systolicAboveMinutes = 0;
    let diastolicAboveMinutes = 0;
    let systolicArea = 0;
    let diastolicArea = 0;

    ordered.forEach(({ measurement, date }, index) => {
        const threshold = thresholdForMeasurement(measurement);
        const systolicExcess = Math.max(0, measurement.systolic - threshold.systolic);
        const diastolicExcess = Math.max(0, measurement.diastolic - threshold.diastolic);
        const above = systolicExcess > 0 || diastolicExcess > 0;
        if (above) aboveCount += 1;
        if (systolicExcess > 0) systolicAboveCount += 1;
        if (diastolicExcess > 0) diastolicAboveCount += 1;
        if (index === ordered.length - 1) return;
        const next = ordered[index + 1].date;
        const minutes = Math.min(maximumIntervalMinutes, Math.max(0, (next - date) / 60_000));
        observedMinutes += minutes;
        if (above) aboveMinutes += minutes;
        if (systolicExcess > 0) systolicAboveMinutes += minutes;
        if (diastolicExcess > 0) diastolicAboveMinutes += minutes;
        systolicArea += systolicExcess * minutes / 60;
        diastolicArea += diastolicExcess * minutes / 60;
    });

    return Object.freeze({
        countAbove: aboveCount,
        systolicCountAbove: systolicAboveCount,
        diastolicCountAbove: diastolicAboveCount,
        readingLoadPercent: aboveCount / ordered.length * 100,
        systolicReadingLoadPercent: systolicAboveCount / ordered.length * 100,
        diastolicReadingLoadPercent: diastolicAboveCount / ordered.length * 100,
        observedMinutes,
        timeAbovePercent: observedMinutes ? aboveMinutes / observedMinutes * 100 : null,
        systolicTimeAbovePercent: observedMinutes ? systolicAboveMinutes / observedMinutes * 100 : null,
        diastolicTimeAbovePercent: observedMinutes ? diastolicAboveMinutes / observedMinutes * 100 : null,
        systolicHyperbaricIndex: systolicArea,
        diastolicHyperbaricIndex: diastolicArea
    });
}

function emptyExposure() {
    return Object.freeze({
        countAbove: 0,
        systolicCountAbove: 0,
        diastolicCountAbove: 0,
        readingLoadPercent: 0,
        systolicReadingLoadPercent: 0,
        diastolicReadingLoadPercent: 0,
        observedMinutes: 0,
        timeAbovePercent: null,
        systolicTimeAbovePercent: null,
        diastolicTimeAbovePercent: null,
        systolicHyperbaricIndex: 0,
        diastolicHyperbaricIndex: 0
    });
}
