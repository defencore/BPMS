const DAY_MS = 24 * 60 * 60 * 1000;

export function selectCombinedChartMeasurements(measurements, viewMode, now = new Date()) {
    const valid = measurements.filter(item => item.systolic > 0 && item.diastolic > 0);
    if (viewMode === 'all') return valid;
    const cutoff = now.getTime() - DAY_MS;
    return valid.filter(item => new Date(item.datetime).getTime() >= cutoff);
}

export function formatCombinedXAxisLabel(label) {
    const text = label === null || label === undefined ? '' : String(label);
    if (!text) return '';
    const [date, time] = text.split(/\s+/u);
    return text.includes('00:00') ? date : time || date;
}

export function calculateCombinedChartBounds(measurements) {
    if (!measurements.length) return null;
    const pressure = measurements.flatMap(item => [item.systolic, item.diastolic]);
    const pulse = measurements.map(item => item.pulse).filter(value => value > 0);
    return Object.freeze({
        pressure: axisBounds(pressure, { floor: 30, ceiling: 250, minimumPadding: 5 }),
        pulse: pulse.length
            ? axisBounds(pulse, { floor: 30, ceiling: 150, minimumPadding: 5 })
            : Object.freeze({ min: 40, max: 120 })
    });
}

function axisBounds(values, { floor, ceiling, minimumPadding }) {
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const padding = Math.max(minimumPadding, (maximum - minimum) * 0.1);
    return Object.freeze({
        min: Math.max(floor, Math.floor(minimum - padding)),
        max: Math.min(ceiling, Math.ceil(maximum + padding))
    });
}
