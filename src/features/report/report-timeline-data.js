import { isAsleepBySchedule, parseMeasurementDate } from '../../core/analytics/time.js';

export function withPressureBoundaries(measurements, settings) {
    const { monitoring, referenceProfiles } = settings;
    const profile = referenceProfiles[monitoring.profile] ?? referenceProfiles.abpm24;
    return measurements.map(measurement => {
        const date = parseMeasurementDate(measurement.datetime);
        const period = monitoring.profile === 'abpm24' && date
            ? (isAsleepBySchedule(date, monitoring.sleepStart, monitoring.wakeTime) ? 'night' : 'day')
            : 'full';
        const boundary = profile[period] ?? profile.full;
        return Object.freeze({
            ...measurement,
            systolicBoundary: boundary.systolic,
            diastolicBoundary: boundary.diastolic
        });
    });
}
