import { measurementIdentity } from './data-schema.js';

export function mergeMeasurementSets(sources) {
    const unique = new Map();
    let duplicates = 0;
    for (const source of sources) {
        for (const measurement of source.measurements) {
            const identity = measurementIdentity(measurement);
            if (unique.has(identity)) duplicates += 1;
            else unique.set(identity, { ...measurement, source: source.name });
        }
    }
    return {
        measurements: [...unique.values()].sort((left, right) => left.datetime.localeCompare(right.datetime)),
        duplicates
    };
}
