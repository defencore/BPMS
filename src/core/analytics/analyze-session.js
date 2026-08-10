import { filterAnalysisMeasurements } from '../analysis-data.js';
import { calculateDipping, calculateMorningSurge, partitionByWakeState } from './circadian.js';
import { calculatePressureExposure } from './exposure.js';
import { assessSessionQuality } from './quality.js';
import { summarizeMeasurements } from './statistics.js';

export function analyzeMonitoringSession(session, events, settings) {
    const valid = filterAnalysisMeasurements(session.measurements, settings.analysis);
    const sessionEvents = events.filter(event => {
        const date = new Date(event.datetime);
        return date >= session.start && date <= new Date(session.start.getTime() + settings.monitoring.sessionHours * 60 * 60 * 1000);
    });
    const periods = partitionByWakeState(valid, sessionEvents, settings.monitoring);
    const full = summarizeMeasurements(valid);
    const day = summarizeMeasurements(periods.day);
    const night = summarizeMeasurements(periods.night);
    const quality = assessSessionQuality(session, valid, periods.night.length, settings.monitoring);
    const dipping = calculateDipping(day, night, settings.patterns);
    const morningSurge = calculateMorningSurge(valid, sessionEvents, session, settings.monitoring);
    const exposure = calculatePressureExposure(
        valid,
        measurement => thresholdForMeasurement(measurement, periods.night, settings),
        Math.max(settings.monitoring.dayIntervalMinutes, settings.monitoring.nightIntervalMinutes) * 2
    );

    return Object.freeze({
        session,
        events: Object.freeze(sessionEvents),
        validMeasurements: Object.freeze(valid),
        periods,
        summaries: Object.freeze({ full, day, night }),
        quality,
        dipping,
        morningSurge,
        exposure,
        profile: settings.monitoring.profile,
        thresholds: settings.referenceProfiles[settings.monitoring.profile]
    });
}

export function thresholdForPeriod(settings, period) {
    const profile = settings.referenceProfiles[settings.monitoring.profile];
    return profile?.[period] ?? profile?.full ?? settings.referenceProfiles.office.full;
}

function thresholdForMeasurement(measurement, nightMeasurements, settings) {
    const isNight = nightMeasurements.includes(measurement);
    return thresholdForPeriod(settings, settings.monitoring.profile === 'abpm24' ? (isNight ? 'night' : 'day') : 'full');
}
