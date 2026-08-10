import { parseMeasurementDate } from './time.js';
import { summarizeMeasurements } from './statistics.js';

export function buildHourlyProfile(measurements) {
    const groups = Array.from({ length: 24 }, () => []);
    for (const measurement of measurements) {
        const date = parseMeasurementDate(measurement.datetime);
        if (date) groups[date.getHours()].push(measurement);
    }
    return Object.freeze(groups.map((items, hour) => Object.freeze({
        hour,
        ...summarizeMeasurements(items)
    })));
}

