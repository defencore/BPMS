export function meanArterialPressure(measurement) {
    return (measurement.systolic + 2 * measurement.diastolic) / 3;
}

export function pulsePressure(measurement) {
    return measurement.systolic - measurement.diastolic;
}

export function scaledRatePressureProduct(measurement) {
    return measurement.systolic * measurement.pulse / 100;
}

