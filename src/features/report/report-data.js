import { filterAnalysisMeasurements } from '../../core/analysis-data.js';
import { analyzeMonitoringSession } from '../../core/analytics/analyze-session.js';
import { buildMonitoringSessions } from '../../core/analytics/sessions.js';
import { analyzeEventCorrelations } from '../../core/analytics/event-correlation.js';
import { summarizeMeasurements } from '../../core/analytics/statistics.js';
import { parseMeasurementDate } from '../../core/analytics/time.js';
import { buildReportVisuals } from './report-visuals.js';

export function buildReportModel({ measurements, events, settings, deviceInfo }) {
    const recorded = [...measurements].sort((left, right) => left.datetime.localeCompare(right.datetime));
    const chartMeasurements = recorded.filter(hasUsableValues);
    const primaryMeasurements = filterAnalysisMeasurements(recorded, settings.analysis);
    const dates = chartMeasurements.map(item => parseMeasurementDate(item.datetime)).filter(Boolean);
    const orderedEvents = [...events].sort((left, right) => left.datetime.localeCompare(right.datetime));
    const sessions = buildMonitoringSessions(recorded, settings.monitoring.sessionHours)
        .map(session => analyzeMonitoringSession(session, orderedEvents, settings));

    return Object.freeze({
        recorded: Object.freeze(recorded),
        chartMeasurements: Object.freeze(chartMeasurements),
        primaryMeasurements: Object.freeze(primaryMeasurements),
        events: Object.freeze(orderedEvents),
        eventCorrelations: analyzeEventCorrelations(orderedEvents, primaryMeasurements),
        deviceInfo: deviceInfo ?? {},
        settings,
        range: Object.freeze({ start: dates[0] ?? null, end: dates.at(-1) ?? null }),
        summary: summarizeMeasurements(primaryMeasurements),
        allValuesSummary: summarizeMeasurements(chartMeasurements),
        quality: qualitySummary(recorded, chartMeasurements, primaryMeasurements),
        daily: Object.freeze(dailySummaries(chartMeasurements, primaryMeasurements)),
        sessions: Object.freeze(sessions),
        visuals: buildReportVisuals(primaryMeasurements, settings)
    });
}

function qualitySummary(recorded, usable, primary) {
    return Object.freeze({
        recorded: recorded.length,
        usable: usable.length,
        included: primary.length,
        excluded: recorded.length - primary.length,
        movement: recorded.filter(item => item.hasMovement).length,
        deviceErrors: recorded.filter(item => item.errorCode || item.error !== 'none').length,
        manual: recorded.filter(item => item.measurementMethod === 'manual').length,
        edited: recorded.filter(item => item.edited).length,
        comments: recorded.filter(item => item.comment).length
    });
}

function dailySummaries(allMeasurements, primaryMeasurements) {
    const primarySet = new Set(primaryMeasurements);
    const groups = new Map();
    for (const measurement of allMeasurements) {
        const date = measurement.datetime.slice(0, 10);
        const group = groups.get(date) ?? [];
        group.push(measurement);
        groups.set(date, group);
    }
    return [...groups.entries()].map(([date, measurements]) => ({
        date,
        recorded: measurements.length,
        included: measurements.filter(item => primarySet.has(item)).length,
        movement: measurements.filter(item => item.hasMovement).length,
        summary: summarizeMeasurements(measurements)
    }));
}

function hasUsableValues(measurement) {
    return measurement.systolic > 0 && measurement.diastolic > 0 && measurement.pulse > 0
        && !measurement.errorCode && measurement.error === 'none';
}
