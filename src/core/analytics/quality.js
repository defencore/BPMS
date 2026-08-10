import { durationMinutes } from './time.js';

export function assessSessionQuality(session, validMeasurements, nightCount, monitoring) {
    const total = session.measurements.length;
    const valid = validMeasurements.length;
    const validPercent = total ? valid / total * 100 : 0;
    const coveredMinutes = durationMinutes(session.start, session.end);
    const coveragePercent = Math.min(100, coveredMinutes / (monitoring.sessionHours * 60) * 100);
    const sleepMinutes = scheduledSleepMinutes(monitoring.sleepStart, monitoring.wakeTime);
    const awakeMinutes = 1440 - sleepMinutes;
    const expectedPer24h = Math.ceil(awakeMinutes / monitoring.dayIntervalMinutes)
        + Math.ceil(sleepMinutes / monitoring.nightIntervalMinutes);
    const estimatedExpected = Math.max(1, Math.round(expectedPer24h * coveragePercent / 100));
    const checks = Object.freeze({
        validPercent: validPercent >= monitoring.minimumValidPercent,
        totalReadings: valid >= monitoring.minimumTotalReadings,
        nightReadings: nightCount >= monitoring.minimumNightReadings,
        duration: coveragePercent >= 80
    });
    return Object.freeze({
        total,
        valid,
        excluded: Math.max(0, total - valid),
        validPercent,
        coveredMinutes,
        coveragePercent,
        expectedReadings: estimatedExpected,
        nightCount,
        checks,
        sufficient: Object.values(checks).every(Boolean)
    });
}

function scheduledSleepMinutes(sleepStart, wakeTime) {
    const toMinutes = value => {
        const [hour, minute] = value.split(':').map(Number);
        return hour * 60 + minute;
    };
    const start = toMinutes(sleepStart);
    const end = toMinutes(wakeTime);
    return end > start ? end - start : 1440 - start + end;
}
