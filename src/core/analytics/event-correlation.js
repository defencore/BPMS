import { parseMeasurementDate } from './time.js';

const METRICS = Object.freeze(['systolic', 'diastolic', 'pulse']);

export function analyzeEventCorrelations(events, measurements) {
    const usableMeasurements = measurements
        .map(measurement => ({ measurement, time: parseMeasurementDate(measurement.datetime)?.getTime() }))
        .filter(item => Number.isFinite(item.time))
        .sort((left, right) => left.time - right.time);
    const groups = new Map();

    for (const event of events) {
        const occurrence = analyzeOccurrence(event, usableMeasurements);
        if (!occurrence) continue;
        const key = correlationKey(event);
        const group = groups.get(key) ?? {
            key,
            type: event.type,
            label: event.label ?? '',
            name: event.name,
            dose: event.dose,
            occurrences: []
        };
        group.occurrences.push(occurrence);
        groups.set(key, group);
    }

    return Object.freeze([...groups.values()]
        .map(summarizeGroup)
        .sort((left, right) => right.comparableOccurrences - left.comparableOccurrences
            || right.occurrenceCount - left.occurrenceCount));
}

function analyzeOccurrence(event, measurements) {
    const eventTime = parseMeasurementDate(event.datetime)?.getTime();
    if (!Number.isFinite(eventTime)) return null;
    const windowMs = event.analysisWindowMinutes * 60_000;
    const responseStart = eventTime + event.durationMinutes * 60_000;
    const before = measurements
        .filter(item => item.time >= eventTime - windowMs && item.time < eventTime)
        .map(item => item.measurement);
    const after = measurements
        .filter(item => item.time >= responseStart && item.time <= responseStart + windowMs)
        .map(item => item.measurement);
    return Object.freeze({
        event,
        beforeCount: before.length,
        afterCount: after.length,
        before: metricMeans(before),
        after: metricMeans(after),
        comparable: before.length > 0 && after.length > 0
    });
}

function summarizeGroup(group) {
    const comparable = group.occurrences.filter(occurrence => occurrence.comparable);
    const before = aggregateOccurrenceMeans(comparable, 'before');
    const after = aggregateOccurrenceMeans(comparable, 'after');
    const delta = Object.fromEntries(METRICS.map(metric => [metric, pairedDeltaMean(comparable, metric)]));
    return Object.freeze({
        key: group.key,
        type: group.type,
        label: group.label,
        name: group.name,
        dose: group.dose,
        occurrenceCount: group.occurrences.length,
        comparableOccurrences: comparable.length,
        beforeReadings: comparable.reduce((sum, item) => sum + item.beforeCount, 0),
        afterReadings: comparable.reduce((sum, item) => sum + item.afterCount, 0),
        before: Object.freeze(before),
        after: Object.freeze(after),
        delta: Object.freeze(delta),
        quality: comparable.length >= 2 ? 'repeated' : comparable.length === 1 ? 'preliminary' : 'unavailable'
    });
}

function metricMeans(measurements) {
    return Object.freeze(Object.fromEntries(METRICS.map(metric => [metric, mean(measurements.map(item => item[metric]))])));
}

function aggregateOccurrenceMeans(occurrences, side) {
    return Object.fromEntries(METRICS.map(metric => [metric, mean(occurrences.map(item => item[side][metric]))]));
}

function pairedDeltaMean(occurrences, metric) {
    return mean(occurrences.map(item => item.after[metric] - item.before[metric]));
}

function mean(values) {
    const valid = values.filter(Number.isFinite);
    return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function correlationKey(event) {
    return [event.presetId, event.type, event.label, event.name, event.dose]
        .map(value => String(value ?? '').trim().toLocaleLowerCase())
        .join('|');
}
