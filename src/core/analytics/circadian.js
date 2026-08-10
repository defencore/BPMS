import { dateAtClock, isAsleepBySchedule, parseMeasurementDate } from './time.js';

export function partitionByWakeState(measurements, events, monitoring) {
    const sleepIntervals = buildSleepIntervals(events);
    const day = [];
    const night = [];
    for (const measurement of measurements) {
        const date = parseMeasurementDate(measurement.datetime);
        if (!date) continue;
        const explicit = sleepIntervals.find(interval => date >= interval.start && date < interval.end);
        const asleep = Boolean(explicit) || isAsleepBySchedule(date, monitoring.sleepStart, monitoring.wakeTime);
        (asleep ? night : day).push(measurement);
    }
    return Object.freeze({ day: Object.freeze(day), night: Object.freeze(night), sleepIntervals });
}

export function calculateDipping(daySummary, nightSummary, thresholds) {
    if (!daySummary?.systolic || !nightSummary?.systolic) return null;
    const systolic = dip(daySummary.systolic.mean, nightSummary.systolic.mean);
    const diastolic = dip(daySummary.diastolic.mean, nightSummary.diastolic.mean);
    return Object.freeze({
        systolic,
        diastolic,
        systolicCategory: dippingCategory(systolic, thresholds),
        diastolicCategory: dippingCategory(diastolic, thresholds),
        nightDaySystolicRatio: nightSummary.systolic.mean / daySummary.systolic.mean,
        nightDayDiastolicRatio: nightSummary.diastolic.mean / daySummary.diastolic.mean
    });
}

export function calculateMorningSurge(measurements, events, session, monitoring) {
    const wake = resolveWakeTime(events, session, monitoring.wakeTime);
    if (!wake) return null;
    const beforeStart = new Date(wake.getTime() - monitoring.preWakeWindowMinutes * 60_000);
    const afterEnd = new Date(wake.getTime() + monitoring.morningWindowMinutes * 60_000);
    const before = measurements.filter(item => {
        const date = parseMeasurementDate(item.datetime);
        return date >= beforeStart && date < wake;
    });
    const after = measurements.filter(item => {
        const date = parseMeasurementDate(item.datetime);
        return date >= wake && date <= afterEnd;
    });
    if (!before.length || !after.length) return Object.freeze({ wake, beforeCount: before.length, afterCount: after.length, available: false });
    const mean = (items, key) => items.reduce((sum, item) => sum + item[key], 0) / items.length;
    return Object.freeze({
        wake,
        beforeCount: before.length,
        afterCount: after.length,
        available: true,
        systolic: mean(after, 'systolic') - mean(before, 'systolic'),
        diastolic: mean(after, 'diastolic') - mean(before, 'diastolic'),
        pulse: mean(after, 'pulse') - mean(before, 'pulse')
    });
}

function buildSleepIntervals(events) {
    const ordered = events
        .filter(event => event.type === 'sleep-start' || event.type === 'wake-up')
        .map(event => ({ ...event, date: new Date(event.datetime) }))
        .filter(event => !Number.isNaN(event.date.getTime()))
        .sort((left, right) => left.date - right.date);
    const intervals = [];
    let start = null;
    for (const event of ordered) {
        if (event.type === 'sleep-start') start = event.date;
        else if (start && event.date > start) {
            intervals.push(Object.freeze({ start, end: event.date }));
            start = null;
        }
    }
    return Object.freeze(intervals);
}

function resolveWakeTime(events, session, fallbackClock) {
    const explicit = events
        .filter(event => event.type === 'wake-up')
        .map(event => new Date(event.datetime))
        .find(date => date >= session.start && date <= new Date(session.start.getTime() + 30 * 60 * 60 * 1000));
    if (explicit) return explicit;
    const wake = dateAtClock(session.start, fallbackClock);
    if (wake < session.start) wake.setDate(wake.getDate() + 1);
    return wake;
}

function dip(day, night) {
    return day ? (day - night) / day * 100 : null;
}

function dippingCategory(value, thresholds) {
    if (value === null) return 'unavailable';
    if (value <= 0) return 'riser';
    if (value < thresholds.normalDippingMin) return 'non-dipper';
    if (value <= thresholds.normalDippingMax) return 'dipper';
    return 'extreme-dipper';
}
