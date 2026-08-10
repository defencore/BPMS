import { filterAnalysisMeasurements } from '../core/analysis-data.js';
import { analyzeEventCorrelations } from '../core/analytics/event-correlation.js';
import { CLINICAL_SOURCES } from '../core/clinical-sources.js';
import { getSettings } from '../core/settings-store.js';
import { state } from '../core/state.js';
import { formatNumber, t } from '../i18n/i18n.js';
import { escapeHtml } from '../ui/html.js';

const PATIENT_GUIDE_URL = CLINICAL_SOURCES.find(source => source.id === 'esc-patient-guide')?.url
    ?? CLINICAL_SOURCES[0].url;

export function updateEventCorrelationPanel() {
    const container = document.getElementById('event-correlation');
    if (!container) return;
    container.dataset.i18nSkip = '';
    container.innerHTML = renderEventCorrelation(state.events, state.measurements);
}

function renderEventCorrelation(events, measurements) {
    const included = filterAnalysisMeasurements(measurements, getSettings().analysis);
    const groups = analyzeEventCorrelations(events, included);
    return `
        <section class="event-correlation-panel" aria-labelledby="event-correlation-title">
            <div class="event-correlation-heading">
                <div>
                    <span class="event-correlation-kicker"><i class="fas fa-chart-line"></i>${t('event.correlation.kicker')}</span>
                    <h6 id="event-correlation-title">${t('event.correlation.title')}</h6>
                    <p>${t('event.correlation.description')}</p>
                </div>
                <a href="${PATIENT_GUIDE_URL}" target="_blank" rel="noopener noreferrer">${t('event.correlation.source')} <i class="fas fa-arrow-up-right-from-square"></i></a>
            </div>
            ${renderGroups(groups, events.length, included.length)}
            <div class="event-correlation-notice"><i class="fas fa-circle-info"></i><span>${t('event.correlation.notice')}</span></div>
        </section>`;
}

function renderGroups(groups, eventCount, measurementCount) {
    if (!eventCount) return emptyState('event.correlation.empty-events');
    if (!measurementCount) return emptyState('event.correlation.empty-measurements');
    if (!groups.some(group => group.comparableOccurrences)) return emptyState('event.correlation.empty-windows');
    return `<div class="event-correlation-grid">${groups
        .filter(group => group.comparableOccurrences)
        .map(renderGroup)
        .join('')}</div>`;
}

function renderGroup(group) {
    const detail = [group.label, group.name, group.dose].filter(Boolean).map(escapeHtml).join(' · ');
    return `
        <article class="event-correlation-card">
            <div class="event-correlation-card-header">
                <div><strong>${detail || t(`event.type.${group.type}`)}</strong>${detail ? `<span>${t(`event.type.${group.type}`)}</span>` : ''}</div>
                <span class="event-quality ${group.quality}">${t(`event.correlation.quality.${group.quality}`)}</span>
            </div>
            <div class="event-correlation-sample">${t('event.correlation.sample', {
                comparable: group.comparableOccurrences,
                total: group.occurrenceCount,
                before: group.beforeReadings,
                after: group.afterReadings
            })}</div>
            <div class="event-correlation-values">
                ${metricRow('systolic', group)}
                ${metricRow('diastolic', group)}
                ${metricRow('pulse', group)}
            </div>
        </article>`;
}

function metricRow(metric, group) {
    const unit = metric === 'pulse' ? t('report.unit.pulse') : t('report.unit.pressure');
    return `<div class="event-correlation-row">
        <span>${t(`event.correlation.metric.${metric}`)}</span>
        <span>${number(group.before[metric])}</span>
        <i class="fas fa-arrow-right"></i>
        <span>${number(group.after[metric])}</span>
        <strong class="${deltaClass(group.delta[metric])}">${signed(group.delta[metric])} <small>${unit}</small></strong>
    </div>`;
}

function emptyState(key) {
    return `<div class="event-correlation-empty"><i class="fas fa-wave-square"></i><p>${t(key)}</p></div>`;
}

function number(value) {
    return Number.isFinite(value) ? formatNumber(value, { maximumFractionDigits: 1 }) : '—';
}

function signed(value) {
    if (!Number.isFinite(value)) return '—';
    return `${value > 0 ? '+' : ''}${number(value)}`;
}

function deltaClass(value) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.05) return 'delta-neutral';
    return value > 0 ? 'delta-up' : 'delta-down';
}
