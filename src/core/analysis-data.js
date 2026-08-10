import { getSettings } from './settings-store.js';

export function filterAnalysisMeasurements(measurements, options = getSettings().analysis) {
    return measurements.filter(measurement => {
        if (options.ignoreErrorReadings && (measurement.errorCode || measurement.error !== 'none')) return false;
        if (options.ignoreMovementReadings && measurement.hasMovement) return false;
        return measurement.systolic > 0 && measurement.diastolic > 0 && measurement.pulse > 0;
    });
}
