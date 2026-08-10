import { classifyBloodPressure, getTimePeriod } from '../../core/blood-pressure.js';
import { state } from '../../core/state.js';
import { t } from '../../i18n/i18n.js';
import { escapeHtml } from '../../ui/html.js';
import { updateESCDistributionChart } from '../charts/esc-distribution.js';

const SIGNAL_ORDER = Object.freeze(['very-high', 'hypertension', 'elevated', 'low', 'below-elevated']);

export function renderClassificationSummary() {
    const valid = state.measurements.filter(item => item.systolic > 0 && item.diastolic > 0);
    renderPeriod('day-classification-summary', valid.filter(item => getTimePeriod(item.datetime) === 'day'), 'esc-summary.empty-day');
    renderPeriod('night-classification-summary', valid.filter(item => getTimePeriod(item.datetime) === 'night'), 'esc-summary.empty-night');
    updateESCDistributionChart(valid);
}

function renderPeriod(elementId, measurements, emptyKey) {
    const element = document.getElementById(elementId);
    if (!element) return;
    if (!measurements.length) {
        element.innerHTML = `<p class="text-muted">${escapeHtml(t(state.measurements.length ? emptyKey : 'esc-summary.empty'))}</p>`;
        return;
    }

    const groups = new Map();
    for (const measurement of measurements) {
        const classification = classifyBloodPressure(measurement.systolic, measurement.diastolic);
        const group = groups.get(classification.category) ?? { count: 0, classification };
        group.count += 1;
        groups.set(classification.category, group);
    }
    const rows = [...groups.values()]
        .sort((left, right) => SIGNAL_ORDER.indexOf(left.classification.signal) - SIGNAL_ORDER.indexOf(right.classification.signal))
        .map(group => row(group, measurements.length))
        .join('');

    element.innerHTML = `<div class="table-responsive"><table class="table table-sm classification-summary-table"><thead><tr>
        <th>${escapeHtml(t('esc-summary.count'))}</th>
        <th>${escapeHtml(t('esc-summary.classification'))}</th>
        <th>${escapeHtml(t('esc-summary.reference-context'))}</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
}

function row({ count, classification }, total) {
    const percentage = ((count / total) * 100).toFixed(1);
    return `<tr><td data-label="${escapeHtml(t('esc-summary.count'))}"><span class="fw-bold">${count} (${percentage}%)</span></td>
        <td data-label="${escapeHtml(t('esc-summary.classification'))}"><span class="bp-classification ${classification.cssClass}">${escapeHtml(t(classification.textKey))}</span></td>
        <td data-label="${escapeHtml(t('esc-summary.reference-context'))}"><small class="text-muted"><i class="fas fa-lightbulb me-1" style="color:${classification.color}"></i>${escapeHtml(t(classification.noteKey))}</small></td></tr>`;
}
