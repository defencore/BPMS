import { getSettings } from './settings-store.js';

export function classifyBloodPressure(systolic, diastolic, thresholds = getSettings().esc2024) {
    if (systolic >= thresholds.crisisSystolic || diastolic >= thresholds.crisisDiastolic) {
        return classification('hypertensive-crisis', 'crisis', '#7f1d1d', 'very-high');
    }
    if (systolic >= thresholds.hypertensionSystolic || diastolic >= thresholds.hypertensionDiastolic) {
        return classification('hypertension', 'high', '#ef4444', 'hypertension');
    }
    if ((systolic >= thresholds.elevatedSystolic && systolic < thresholds.hypertensionSystolic)
        || (diastolic >= thresholds.elevatedDiastolic && diastolic < thresholds.hypertensionDiastolic)) {
        return classification('elevated-bp', 'elevated', '#f59e0b', 'elevated');
    }
    if (systolic < thresholds.hypotensionSystolic || diastolic < thresholds.hypotensionDiastolic) {
        return classification('hypotension', 'low', '#06b6d4', 'low');
    }
    return classification('non-elevated', 'normal', '#10b981', 'below-elevated');
}

function classification(category, level, color, signal) {
    return {
        category,
        level,
        color,
        signal,
        textKey: `bp.${category}`,
        noteKey: `bp.reference-note.${signal}`,
        bgColor: hexToRgba(color, 0.1),
        cssClass: `bp-${category}`
    };
}

function hexToRgba(hex, alpha) {
    const value = Number.parseInt(hex.slice(1), 16);
    return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

export function classifyPulse(pulse, thresholds = getSettings().patterns) {
    if (pulse > thresholds.tachycardia) return { class: 'high', textKey: 'pulse.tachycardia' };
    if (pulse < thresholds.bradycardia) return { class: 'low', textKey: 'pulse.bradycardia' };
    return { class: 'normal', textKey: 'pulse.normal' };
}

export function isDayTime(hour) {
    return hour >= 6 && hour < 22;
}

export function getTimePeriod(datetime) {
    const hour = Number.parseInt(datetime.slice(11, 13), 10);
    return isDayTime(hour) ? 'day' : 'night';
}
