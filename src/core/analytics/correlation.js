import { meanArterialPressure } from './measurement-metrics.js';

const PAIRS = Object.freeze([
    Object.freeze({ id: 'systolic-diastolic', x: 'systolic', y: 'diastolic' }),
    Object.freeze({ id: 'systolic-pulse', x: 'systolic', y: 'pulse' }),
    Object.freeze({ id: 'diastolic-pulse', x: 'diastolic', y: 'pulse' }),
    Object.freeze({ id: 'map-pulse', x: 'meanArterialPressure', y: 'pulse' })
]);

export function analyzeMeasurementCorrelations(measurements, minimumSample = 3) {
    return Object.freeze(PAIRS.map(pair => analyzePair(measurements, pair, minimumSample)));
}

function analyzePair(measurements, pair, minimumSample) {
    const points = measurements.map(measurement => Object.freeze({
        x: valueFor(measurement, pair.x),
        y: valueFor(measurement, pair.y)
    })).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (points.length < minimumSample) return Object.freeze({ ...pair, n: points.length, available: false, points: Object.freeze(points) });

    const xMean = mean(points, 'x');
    const yMean = mean(points, 'y');
    const xVariance = points.reduce((sum, point) => sum + (point.x - xMean) ** 2, 0);
    const yVariance = points.reduce((sum, point) => sum + (point.y - yMean) ** 2, 0);
    const covariance = points.reduce((sum, point) => sum + (point.x - xMean) * (point.y - yMean), 0);
    if (!xVariance || !yVariance) {
        return Object.freeze({ ...pair, n: points.length, available: false, points: Object.freeze(points) });
    }
    const r = covariance / Math.sqrt(xVariance * yVariance);
    const slope = covariance / xVariance;
    return Object.freeze({
        ...pair,
        n: points.length,
        available: true,
        r,
        rSquared: r ** 2,
        slope,
        intercept: yMean - slope * xMean,
        xMean,
        yMean,
        points: Object.freeze(points)
    });
}

function valueFor(measurement, key) {
    return key === 'meanArterialPressure' ? meanArterialPressure(measurement) : measurement[key];
}

function mean(points, key) {
    return points.reduce((sum, point) => sum + point[key], 0) / points.length;
}

