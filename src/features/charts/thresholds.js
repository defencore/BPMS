import { getSettings } from '../../core/settings-store.js';
import { t } from '../../i18n/i18n.js';

export function applyClinicalThresholds(chart) {
    const annotations = chart?.options.plugins.annotation?.annotations;
    if (!annotations) return;
    const settings = getSettings();
    const zones = settings.esc2024.riskZones;
    const patterns = settings.patterns;
    setAnnotation(annotations.normalSystolic, zones.optimalSystolic, t('chart.normal-systolic', { value: zones.optimalSystolic }));
    setAnnotation(annotations.normalDiastolic, zones.optimalDiastolic, t('chart.normal-diastolic', { value: zones.optimalDiastolic }));
    setAnnotation(annotations.normalPulseHigh, patterns.tachycardia, t('chart.normal-pulse', { value: patterns.tachycardia }));
    setAnnotation(annotations.normalPulseLow, patterns.bradycardia, t('chart.normal-pulse', { value: patterns.bradycardia }));
}

function setAnnotation(annotation, value, label) {
    annotation.yMin = value;
    annotation.yMax = value;
    annotation.label.content = label;
}
