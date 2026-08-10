const CLOCK_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;

export function parseMeasurementDate(value) {
    const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/u.exec(value);
    if (!match) return null;
    const [, year, month, day, hour, minute] = match.map(Number);
    const date = new Date(year, month - 1, day, hour, minute);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function clockToMinutes(value) {
    if (!CLOCK_PATTERN.test(value)) throw new TypeError(`Invalid clock value: ${value}`);
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
}

export function minutesOfDay(date) {
    return date.getHours() * 60 + date.getMinutes();
}

export function isAsleepBySchedule(date, sleepStart, wakeTime) {
    const minute = minutesOfDay(date);
    const start = clockToMinutes(sleepStart);
    const end = clockToMinutes(wakeTime);
    return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}

export function dateAtClock(reference, clock) {
    const [hour, minute] = clock.split(':').map(Number);
    const result = new Date(reference);
    result.setHours(hour, minute, 0, 0);
    return result;
}

export function toLocalDateTimeValue(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
}

export function durationMinutes(start, end) {
    return Math.max(0, (end.getTime() - start.getTime()) / 60_000);
}
