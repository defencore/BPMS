export const DEFAULT_ESC_2024 = Object.freeze({
    crisisSystolic: 180,
    crisisDiastolic: 120,
    hypertensionSystolic: 140,
    hypertensionDiastolic: 90,
    elevatedSystolic: 120,
    elevatedDiastolic: 70,
    hypotensionSystolic: 90,
    hypotensionDiastolic: 50,
    riskZones: Object.freeze({
        optimalSystolic: 120,
        optimalDiastolic: 80,
        normalSystolic: 130,
        normalDiastolic: 85,
        elevatedSystolic: 140,
        elevatedDiastolic: 90
    })
});

export const DEFAULT_REFERENCE_PROFILES = Object.freeze({
    office: Object.freeze({ full: Object.freeze({ systolic: 140, diastolic: 90 }) }),
    home: Object.freeze({ full: Object.freeze({ systolic: 135, diastolic: 85 }) }),
    abpm24: Object.freeze({
        full: Object.freeze({ systolic: 130, diastolic: 80 }),
        day: Object.freeze({ systolic: 135, diastolic: 85 }),
        night: Object.freeze({ systolic: 120, diastolic: 70 })
    })
});

export const DEFAULT_MONITORING_SETTINGS = Object.freeze({
    profile: 'abpm24',
    sleepStart: '22:00',
    wakeTime: '06:00',
    dayIntervalMinutes: 30,
    nightIntervalMinutes: 60,
    minimumValidPercent: 70,
    minimumTotalReadings: 27,
    minimumNightReadings: 7,
    sessionHours: 24,
    morningWindowMinutes: 120,
    preWakeWindowMinutes: 120
});

export const DEFAULT_PATTERN_THRESHOLDS = Object.freeze({
    morningSurge: 20,
    normalDippingMin: 10,
    normalDippingMax: 20,
    trendChange: 5,
    variabilityStdDev: 15,
    pulsePressureHigh: 60,
    pulsePressureLow: 30,
    bradycardia: 60,
    tachycardia: 100,
    frequentHeartRatePercent: 30,
    elevatedHeartRate: 80
});

export const DEFAULT_ANALYSIS_SETTINGS = Object.freeze({
    minimumPatternReadings: 7,
    minimumTrendReadingsPerSegment: 3,
    alertWindow: 3,
    highReadingsForAlert: 2,
    ignoreMovementReadings: true,
    ignoreErrorReadings: true
});

export function cloneClinicalDefaults() {
    return {
        esc2024: structuredClone(DEFAULT_ESC_2024),
        referenceProfiles: structuredClone(DEFAULT_REFERENCE_PROFILES),
        monitoring: structuredClone(DEFAULT_MONITORING_SETTINGS),
        patterns: structuredClone(DEFAULT_PATTERN_THRESHOLDS),
        analysis: structuredClone(DEFAULT_ANALYSIS_SETTINGS)
    };
}
