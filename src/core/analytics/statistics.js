export function summarizeSeries(values) {
    const clean = values.filter(Number.isFinite);
    if (!clean.length) return null;
    const sorted = [...clean].sort((left, right) => left - right);
    const mean = clean.reduce((sum, value) => sum + value, 0) / clean.length;
    const variance = clean.reduce((sum, value) => sum + (value - mean) ** 2, 0) / clean.length;
    const sd = Math.sqrt(variance);
    return Object.freeze({
        count: clean.length,
        mean,
        min: sorted[0],
        max: sorted.at(-1),
        median: percentile(sorted, 0.5),
        q1: percentile(sorted, 0.25),
        q3: percentile(sorted, 0.75),
        iqr: percentile(sorted, 0.75) - percentile(sorted, 0.25),
        sd,
        cv: mean === 0 ? null : sd / mean * 100
    });
}

export function averageRealVariability(values) {
    const clean = values.filter(Number.isFinite);
    if (clean.length < 2) return null;
    return clean.slice(1).reduce((sum, value, index) => sum + Math.abs(value - clean[index]), 0) / (clean.length - 1);
}

export function summarizeMeasurements(measurements) {
    const ordered = [...measurements].sort((left, right) => left.datetime.localeCompare(right.datetime));
    return Object.freeze({
        count: ordered.length,
        systolic: withArv(ordered.map(item => item.systolic)),
        diastolic: withArv(ordered.map(item => item.diastolic)),
        pulse: withArv(ordered.map(item => item.pulse)),
        pulsePressure: withArv(ordered.map(item => item.systolic - item.diastolic)),
        scaledRpp: withArv(ordered.map(item => item.systolic * item.pulse / 100))
    });
}

function withArv(values) {
    const summary = summarizeSeries(values);
    return summary ? Object.freeze({ ...summary, arv: averageRealVariability(values) }) : null;
}

function percentile(sorted, fraction) {
    if (sorted.length === 1) return sorted[0];
    const position = (sorted.length - 1) * fraction;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const weight = position - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
