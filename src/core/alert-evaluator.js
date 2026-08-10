import { filterAnalysisMeasurements } from './analysis-data.js';
import { isAsleepBySchedule, parseMeasurementDate } from './analytics/time.js';

export function evaluateClinicalAlert(measurements, settings) {
    const valid = filterAnalysisMeasurements(measurements, settings.analysis);
    const recent = valid.slice(-settings.analysis.alertWindow);
    const veryHighCount = recent.filter(measurement => measurement.systolic >= settings.esc2024.crisisSystolic
        || measurement.diastolic >= settings.esc2024.crisisDiastolic).length;
    if (veryHighCount) return { type: 'very-high', count: veryHighCount, window: recent.length };

    const highCount = recent.filter(measurement => {
        const threshold = alertThreshold(measurement, settings);
        return measurement.systolic >= threshold.systolic || measurement.diastolic >= threshold.diastolic;
    }).length;
    return highCount >= settings.analysis.highReadingsForAlert
        ? { type: 'repeated-high', count: highCount, window: recent.length }
        : null;
}

function alertThreshold(measurement, settings) {
    const profile = settings.referenceProfiles[settings.monitoring.profile];
    if (settings.monitoring.profile !== 'abpm24') return profile.full;
    const date = parseMeasurementDate(measurement.datetime);
    const period = date && isAsleepBySchedule(date, settings.monitoring.sleepStart, settings.monitoring.wakeTime) ? 'night' : 'day';
    return profile[period];
}
