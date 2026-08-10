import { parseMeasurementDate } from '../../core/analytics/time.js';
import { classifyBloodPressure } from '../../core/blood-pressure.js';

const CALENDAR_DAYS = 30;
const CATEGORY_ORDER = Object.freeze([
    'hypertensive-crisis',
    'hypertension',
    'elevated-bp',
    'non-elevated',
    'hypotension'
]);

export function buildReportVisuals(measurements, settings) {
    const ordered = [...measurements].sort((left, right) => left.datetime.localeCompare(right.datetime));
    return Object.freeze({
        calendar: buildCalendar(ordered, settings.esc2024),
        dailyProfile: Object.freeze(buildDailyProfile(ordered)),
        escDistribution: Object.freeze(buildEscDistribution(ordered, settings.esc2024))
    });
}

function buildCalendar(measurements, thresholds) {
    const groups = groupByDate(measurements);
    const lastMeasurement = parseMeasurementDate(measurements.at(-1)?.datetime);
    if (!lastMeasurement) return Object.freeze({ startOffset: 0, days: Object.freeze([]) });
    const end = dateOnly(lastMeasurement);
    const start = new Date(end);
    start.setDate(end.getDate() - CALENDAR_DAYS + 1);
    const days = Array.from({ length: CALENDAR_DAYS }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const key = localDateKey(date);
        const items = groups.get(key) ?? [];
        if (!items.length) return Object.freeze({ date, key, count: 0, systolic: null, diastolic: null, classification: null });
        const systolic = mean(items, 'systolic');
        const diastolic = mean(items, 'diastolic');
        return Object.freeze({
            date,
            key,
            count: items.length,
            systolic,
            diastolic,
            classification: Object.freeze(classifyBloodPressure(systolic, diastolic, thresholds))
        });
    });
    return Object.freeze({
        startOffset: mondayIndex(start),
        days: Object.freeze(days)
    });
}

function buildDailyProfile(measurements) {
    const groups = Array.from({ length: 24 }, () => []);
    for (const measurement of measurements) {
        const date = parseMeasurementDate(measurement.datetime);
        if (date) groups[date.getHours()].push(measurement);
    }
    return groups.map((items, hour) => Object.freeze({
        hour,
        count: items.length,
        systolic: items.length ? mean(items, 'systolic') : null,
        diastolic: items.length ? mean(items, 'diastolic') : null,
        pulse: items.length ? mean(items, 'pulse') : null
    }));
}

function buildEscDistribution(measurements, thresholds) {
    const groups = new Map();
    for (const measurement of measurements) {
        const result = classifyBloodPressure(measurement.systolic, measurement.diastolic, thresholds);
        const current = groups.get(result.category) ?? { ...result, count: 0 };
        current.count += 1;
        groups.set(result.category, current);
    }
    const total = measurements.length;
    return CATEGORY_ORDER.filter(category => groups.has(category)).map(category => {
        const item = groups.get(category);
        return Object.freeze({
            category,
            textKey: item.textKey,
            color: item.color,
            count: item.count,
            percent: total ? item.count / total * 100 : 0
        });
    });
}

function groupByDate(measurements) {
    const groups = new Map();
    for (const measurement of measurements) {
        const key = measurement.datetime.slice(0, 10);
        const group = groups.get(key) ?? [];
        group.push(measurement);
        groups.set(key, group);
    }
    return groups;
}

function mean(items, key) {
    return items.reduce((sum, item) => sum + item[key], 0) / items.length;
}

function dateOnly(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mondayIndex(date) {
    return (date.getDay() + 6) % 7;
}
