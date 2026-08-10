import { classifyBloodPressure, classifyPulse } from '../../core/blood-pressure.js';
import { state } from '../../core/state.js';
import { t } from '../../i18n/i18n.js';

export function renderMeasurementStatistics() {
    const measurements = state.measurements.filter(item => item.systolic > 0 && item.diastolic > 0);
    if (!measurements.length) {
        resetStatistics();
        return;
    }

    const systolic = measurements.map(item => item.systolic);
    const diastolic = measurements.map(item => item.diastolic);
    const pulse = measurements.map(item => item.pulse).filter(Boolean);
    const averageSystolic = average(systolic);
    const averageDiastolic = average(diastolic);
    const averagePulse = pulse.length ? average(pulse) : null;

    setText('avg-systolic', averageSystolic);
    setText('avg-diastolic', averageDiastolic);
    setText('avg-heart-rate', averagePulse);
    setRange('minmax-systolic', systolic);
    setRange('minmax-diastolic', diastolic);
    setRange('minmax-heart-rate', pulse);

    const pressure = classifyBloodPressure(averageSystolic, averageDiastolic);
    setCardState('systolic-card', pressure.level);
    setCardState('diastolic-card', pressure.level);
    setCardState('pulse-card', averagePulse === null ? null : classifyPulse(averagePulse).class);
}

function resetStatistics() {
    for (const id of ['avg-systolic', 'avg-diastolic', 'avg-heart-rate']) setText(id, null);
    for (const id of ['minmax-systolic', 'minmax-diastolic', 'minmax-heart-rate']) setRange(id, []);
    for (const id of ['systolic-card', 'diastolic-card', 'pulse-card']) setCardState(id, null);
}

function average(values) {
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value ?? '--';
}

function setRange(id, values) {
    const element = document.getElementById(id);
    if (!element) return;
    element.dataset.i18nSkip = '';
    const [min, max] = values.length ? [Math.min(...values), Math.max(...values)] : ['--', '--'];
    element.textContent = t('stats.range', { min, max });
}

function setCardState(id, level) {
    const element = document.getElementById(id);
    if (!element) return;
    const normalized = level === 'crisis' || level === 'high' ? 'high'
        : level === 'low' ? 'low'
            : level === 'normal' || level === 'elevated' ? 'normal' : null;
    element.className = `stat-card${normalized ? ` ${normalized}` : ''}`;
}
