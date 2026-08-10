import { cloneClinicalDefaults } from './clinical-config.js';
import { cloneDefaultEventPresets, normalizeEventPresets } from './event-presets.js';

export const SETTINGS_STORAGE_KEY = 'bpms.settings.v2';
export const SETTINGS_VERSION = 2;

export function createDefaultSettings() {
    return {
        version: SETTINGS_VERSION,
        connector: { active: 'hingmed' },
        remote: {
            protocol: 'https',
            host: '',
            port: '',
            basePath: '/api'
        },
        eventPresets: cloneDefaultEventPresets(),
        ...cloneClinicalDefaults()
    };
}

export function createSettingsRepository(storage) {
    let current = readSettings(storage);

    return Object.freeze({
        get: () => structuredClone(current),
        save(next) {
            current = normalizeSettings(next);
            storage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(current));
            return structuredClone(current);
        },
        update(patch) {
            return this.save(deepMerge(current, patch));
        },
        reset() {
            return this.save(createDefaultSettings());
        },
        clear() {
            storage?.removeItem(SETTINGS_STORAGE_KEY);
            current = createDefaultSettings();
            return structuredClone(current);
        }
    });
}

const repository = createSettingsRepository(globalThis.localStorage);

export const getSettings = () => repository.get();
export const updateSettings = patch => repository.update(patch);
export const resetSettings = () => repository.reset();

export function clearLocalApplicationData() {
    clearBpmsKeys(globalThis.localStorage);
    clearBpmsKeys(globalThis.sessionStorage);
    return repository.clear();
}

function clearBpmsKeys(storage) {
    if (!storage) return;
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    keys.filter(key => key?.startsWith('bpms.')).forEach(key => storage.removeItem(key));
}

function readSettings(storage) {
    try {
        const serialized = storage?.getItem(SETTINGS_STORAGE_KEY);
        return serialized ? normalizeSettings(JSON.parse(serialized)) : createDefaultSettings();
    } catch {
        storage?.removeItem(SETTINGS_STORAGE_KEY);
        return createDefaultSettings();
    }
}

function normalizeSettings(candidate) {
    const defaults = createDefaultSettings();
    const normalized = deepMerge(defaults, candidate && typeof candidate === 'object' ? candidate : {});
    normalized.version = SETTINGS_VERSION;
    normalized.connector.active = ['hingmed', 'manual', 'remote'].includes(normalized.connector.active)
        ? normalized.connector.active
        : defaults.connector.active;
    normalized.remote.protocol = normalized.remote.protocol === 'http' ? 'http' : 'https';
    normalized.remote.host = cleanText(normalized.remote.host, 255);
    normalized.remote.port = normalizePort(normalized.remote.port);
    normalized.remote.basePath = normalizePath(normalized.remote.basePath);
    normalized.eventPresets = normalizeEventPresets(normalized.eventPresets);
    normalizeNumbers(normalized.esc2024, defaults.esc2024);
    normalizeNumbers(normalized.referenceProfiles, defaults.referenceProfiles);
    normalizeMonitoring(normalized.monitoring, defaults.monitoring);
    normalizeNumbers(normalized.patterns, defaults.patterns);
    normalizeNumbers(normalized.analysis, defaults.analysis);
    normalized.analysis.ignoreMovementReadings = Boolean(normalized.analysis.ignoreMovementReadings);
    normalized.analysis.ignoreErrorReadings = Boolean(normalized.analysis.ignoreErrorReadings);
    validateThresholdOrder(normalized);
    return normalized;
}

function deepMerge(defaults, candidate) {
    if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) return candidate ?? defaults;
    const source = candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate : {};
    return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [
        key,
        value && typeof value === 'object' && !Array.isArray(value)
            ? deepMerge(value, source[key])
            : source[key] ?? value
    ]));
}

function normalizeNumbers(target, defaults) {
    for (const [key, defaultValue] of Object.entries(defaults)) {
        if (defaultValue && typeof defaultValue === 'object') normalizeNumbers(target[key], defaultValue);
        else if (typeof defaultValue === 'boolean') target[key] = Boolean(target[key]);
        else target[key] = finiteNumber(target[key], defaultValue);
    }
}

function validateThresholdOrder(settings) {
    const { esc2024, patterns } = settings;
    if (esc2024.hypotensionSystolic >= esc2024.elevatedSystolic
        || esc2024.elevatedSystolic >= esc2024.hypertensionSystolic
        || esc2024.hypertensionSystolic >= esc2024.crisisSystolic) {
        throw new RangeError('Systolic ESC thresholds must be strictly increasing');
    }
    if (esc2024.hypotensionDiastolic >= esc2024.elevatedDiastolic
        || esc2024.elevatedDiastolic >= esc2024.hypertensionDiastolic
        || esc2024.hypertensionDiastolic >= esc2024.crisisDiastolic) {
        throw new RangeError('Diastolic ESC thresholds must be strictly increasing');
    }
    const zones = esc2024.riskZones;
    if (!(zones.optimalSystolic < zones.normalSystolic && zones.normalSystolic < zones.elevatedSystolic)
        || !(zones.optimalDiastolic < zones.normalDiastolic && zones.normalDiastolic < zones.elevatedDiastolic)) {
        throw new RangeError('Risk zone thresholds must be strictly increasing');
    }
    if (patterns.normalDippingMin >= patterns.normalDippingMax) {
        throw new RangeError('Normal dipping minimum must be below maximum');
    }
    if (patterns.pulsePressureLow >= patterns.pulsePressureHigh) {
        throw new RangeError('Low pulse pressure must be below high pulse pressure');
    }
    if (patterns.bradycardia >= patterns.tachycardia) {
        throw new RangeError('Bradycardia threshold must be below tachycardia threshold');
    }
    for (const [profile, periods] of Object.entries(settings.referenceProfiles)) {
        for (const [period, threshold] of Object.entries(periods)) {
            if (!(threshold.systolic > 0 && threshold.diastolic > 0)) {
                throw new RangeError(`Reference threshold ${profile}.${period} must be positive`);
            }
        }
    }
    if (settings.analysis.highReadingsForAlert > settings.analysis.alertWindow) {
        throw new RangeError('Required high readings cannot exceed the alert window');
    }
    for (const key of ['minimumPatternReadings', 'minimumTrendReadingsPerSegment', 'alertWindow', 'highReadingsForAlert']) {
        if (!Number.isInteger(settings.analysis[key]) || settings.analysis[key] < 1) {
            throw new RangeError(`Analysis setting ${key} must be a positive integer`);
        }
    }
    const monitoring = settings.monitoring;
    if (monitoring.minimumValidPercent > 100) throw new RangeError('Minimum valid percentage cannot exceed 100');
    for (const key of ['dayIntervalMinutes', 'nightIntervalMinutes', 'sessionHours', 'morningWindowMinutes', 'preWakeWindowMinutes']) {
        if (!(monitoring[key] > 0)) throw new RangeError(`Monitoring setting ${key} must be positive`);
    }
}

function normalizeMonitoring(target, defaults) {
    target.profile = ['office', 'home', 'abpm24'].includes(target.profile) ? target.profile : defaults.profile;
    target.sleepStart = normalizeClock(target.sleepStart, defaults.sleepStart);
    target.wakeTime = normalizeClock(target.wakeTime, defaults.wakeTime);
    for (const key of [
        'dayIntervalMinutes',
        'nightIntervalMinutes',
        'minimumValidPercent',
        'minimumTotalReadings',
        'minimumNightReadings',
        'sessionHours',
        'morningWindowMinutes',
        'preWakeWindowMinutes'
    ]) target[key] = finiteNumber(target[key], defaults[key]);
}

function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 500 ? number : fallback;
}

function normalizePort(value) {
    if (value === '' || value === null || value === undefined) return '';
    const port = Number(value);
    return Number.isInteger(port) && port >= 1 && port <= 65535 ? String(port) : '';
}

function normalizePath(value) {
    const path = cleanText(value, 255) || '/api';
    return `/${path.replace(/^\/+|\/+$/gu, '')}`;
}

function normalizeClock(value, fallback) {
    return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(value) ? value : fallback;
}

function cleanText(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}
