import { parseMeasurementDate } from './time.js';

export function buildMonitoringSessions(measurements, sessionHours = 24) {
    const timed = measurements
        .map(measurement => ({ measurement, date: parseMeasurementDate(measurement.datetime) }))
        .filter(item => item.date)
        .sort((left, right) => left.date - right.date);
    if (!timed.length) return [];

    const maximumDuration = sessionHours * 60 * 60 * 1000;
    const sessions = [];
    let current = createSession(timed[0]);
    for (const item of timed.slice(1)) {
        if (item.date - current.start >= maximumDuration) {
            sessions.push(finishSession(current));
            current = createSession(item);
        } else {
            current.measurements.push(item.measurement);
            current.end = item.date;
        }
    }
    sessions.push(finishSession(current));
    return sessions;
}

function createSession(item) {
    return { id: item.date.toISOString(), start: item.date, end: item.date, measurements: [item.measurement] };
}

function finishSession(session) {
    return Object.freeze({ ...session, measurements: Object.freeze(session.measurements) });
}
