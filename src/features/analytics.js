import { analyzeMonitoringSession, thresholdForPeriod } from '../core/analytics/analyze-session.js';
import { detectResearchPatterns } from '../core/analytics/patterns.js';
import { buildMonitoringSessions } from '../core/analytics/sessions.js';
import { parseMeasurementDate } from '../core/analytics/time.js';
import { filterAnalysisMeasurements } from '../core/analysis-data.js';
import { CLINICAL_SOURCES } from '../core/clinical-sources.js';
import { getSettings } from '../core/settings-store.js';
import { state } from '../core/state.js';
import { formatDate, formatNumber, t } from '../i18n/i18n.js';
import { escapeHtml } from '../ui/html.js';
import { renderAnalyticsClinicalDetails } from './analytics-clinical-details.js';
import { renderAnalyticsSummaryTable } from './analytics-summary-table.js';
import {
    isCompactChartViewport,
    responsiveAxisTitle,
    responsiveLegend,
    responsiveTicks,
    responsiveTooltip
} from './charts/responsive-options.js';

let monthlyPressureChart = null;
let dailyProfileChart = null;
let selectedSessionId = null;

export function initAnalytics() {
    document.getElementById('analytics-tab')?.addEventListener('shown.bs.tab', () => {
        ensureCharts();
        updateAnalytics();
    });
    document.getElementById('analytics-session-select')?.addEventListener('change', event => {
        selectedSessionId = event.target.value;
        updateAnalytics();
    });
}

export function updateAnalytics() {
    const settings = getSettings();
    const sessions = buildMonitoringSessions(state.measurements, settings.monitoring.sessionHours);
    const session = resolveSession(sessions);
    renderSessionSelector(sessions, session);
    const analysis = session ? analyzeMonitoringSession(session, state.events, settings) : null;
    renderSessionAnalytics(analysis, settings);
    renderPatterns(analysis, settings);
    renderMonthlyChart();
    renderDailyChart(analysis);
    renderHeatmap(settings);
    renderComparisonZones(analysis, settings);
}

export function refreshAnalyticsLanguage() {
    const initialized = Boolean(monthlyPressureChart || dailyProfileChart);
    monthlyPressureChart?.destroy();
    dailyProfileChart?.destroy();
    monthlyPressureChart = null;
    dailyProfileChart = null;
    if (initialized) ensureCharts();
    updateAnalytics();
}

function resolveSession(sessions) {
    if (!sessions.length) {
        selectedSessionId = null;
        return null;
    }
    const selected = sessions.find(session => session.id === selectedSessionId) ?? sessions.at(-1);
    selectedSessionId = selected.id;
    return selected;
}

function renderSessionSelector(sessions, selected) {
    const select = document.getElementById('analytics-session-select');
    if (!select) return;
    select.dataset.i18nSkip = '';
    if (!sessions.length) {
        select.innerHTML = `<option>${t('analytics.session.none')}</option>`;
        select.disabled = true;
        return;
    }
    select.disabled = false;
    select.innerHTML = sessions.map((session, index) => `<option value="${session.id}"${session.id === selected.id ? ' selected' : ''}>${t('analytics.session.label', {
        number: index + 1,
        start: formatDate(session.start, { dateStyle: 'short', timeStyle: 'short' })
    })}</option>`).join('');
}

function renderSessionAnalytics(analysis, settings) {
    const container = document.getElementById('session-analytics');
    if (!container) return;
    container.dataset.i18nSkip = '';
    if (!analysis) {
        container.innerHTML = emptyState('fa-wave-square', 'analytics.session.empty');
        return;
    }
    const { quality, summaries, dipping, morningSurge, exposure, session } = analysis;
    const qualityClass = quality.sufficient ? 'sufficient' : 'limited';
    container.innerHTML = `
        <div class="session-overview">
            <div class="session-quality ${qualityClass}">
                <div class="session-quality-icon"><i class="fas ${quality.sufficient ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i></div>
                <div><span>${t('analytics.quality.title')}</span><strong>${t(quality.sufficient ? 'analytics.quality.sufficient' : 'analytics.quality.limited')}</strong><small>${formatDate(session.start, { dateStyle: 'medium', timeStyle: 'short' })} – ${formatDate(session.end, { dateStyle: 'medium', timeStyle: 'short' })}</small></div>
            </div>
            <div class="quality-checks">
                ${qualityCheck('fa-clock', 'analytics.quality.coverage', quality.coveragePercent, '%', quality.checks.duration)}
                ${qualityCheck('fa-filter-circle-xmark', 'analytics.quality.valid', quality.validPercent, '%', quality.checks.validPercent)}
                ${qualityCheck('fa-list-ol', 'analytics.quality.readings', quality.valid, ` / ${settings.monitoring.minimumTotalReadings}`, quality.checks.totalReadings)}
                ${qualityCheck('fa-moon', 'analytics.quality.night', quality.nightCount, ` / ${settings.monitoring.minimumNightReadings}`, quality.checks.nightReadings)}
            </div>
        </div>
        <div class="analysis-method-note"><i class="fas fa-circle-info"></i><span>${t('analytics.session.method-note', { profile: t(`settings.profile.${analysis.profile}`), expected: quality.expectedReadings, excluded: quality.excluded })} <a href="${CLINICAL_SOURCES[2].url}" target="_blank" rel="noopener noreferrer">${t('methodology.open-source')} <i class="fas fa-arrow-up-right-from-square"></i></a></span></div>
        ${renderAnalyticsSummaryTable(summaries)}
        <div class="derived-metrics-grid">
            ${metricCard('fa-arrows-left-right', 'analytics.metric.pulse-pressure', number(summaries.full?.pulsePressure?.mean), t('unit.mm-short'), 'analytics.metric.pulse-pressure-help')}
            ${metricCard('fa-wave-square', 'analytics.metric.map', number(summaries.full?.meanArterialPressure?.mean), t('unit.mm-short'), 'analytics.metric.map-help')}
            ${metricCard('fa-heart-circle-bolt', 'analytics.metric.rpp', number(summaries.full?.scaledRpp?.mean), t('analytics.unit.scaled-rpp'), 'analytics.metric.rpp-help')}
            ${variabilityCard(summaries.full)}
            ${dippingCard(dipping)}
            ${metricCard('fa-percent', 'analytics.metric.reading-load', number(exposure.readingLoadPercent), '%', 'analytics.metric.reading-load-help')}
            ${metricCard('fa-hourglass-half', 'analytics.metric.time-above', number(exposure.timeAbovePercent), '%', 'analytics.metric.time-above-help')}
            ${hyperbaricCard(exposure)}
            ${morningCard(morningSurge)}
        </div>
        ${renderAnalyticsClinicalDetails(analysis)}
        ${eventTimeline(analysis.events)}`;
}

function qualityCheck(icon, key, value, suffix, passed) {
    return `<div class="quality-check ${passed ? 'passed' : 'failed'}"><i class="fas ${icon}"></i><span>${t(key)}</span><strong>${number(value, 0)}${suffix}</strong></div>`;
}

function metricCard(icon, titleKey, value, unit, helpKey) {
    return `<article class="derived-metric"><div class="derived-metric-icon"><i class="fas ${icon}"></i></div><div><span>${t(titleKey)}</span><strong>${value} <small>${unit}</small></strong><p>${t(helpKey)}</p></div></article>`;
}

function variabilityCard(summary) {
    const systolic = summary?.systolic;
    return `<article class="derived-metric"><div class="derived-metric-icon"><i class="fas fa-wave-square"></i></div><div><span>${t('analytics.metric.variability')}</span><strong>SD ${number(systolic?.sd)} · CV ${number(systolic?.cv)}% · ARV ${number(systolic?.arv)}</strong><p>${t('analytics.metric.variability-help')}</p></div></article>`;
}

function dippingCard(dipping) {
    if (!dipping) return metricCard('fa-moon', 'analytics.metric.dipping', '—', '', 'analytics.metric.dipping-unavailable');
    return `<article class="derived-metric"><div class="derived-metric-icon"><i class="fas fa-moon"></i></div><div><span>${t('analytics.metric.dipping')}</span><strong>SBP ${number(dipping.systolic)}% · DBP ${number(dipping.diastolic)}%</strong><p>${t(`analytics.dipping.${dipping.systolicCategory}`)} · ${t('analytics.metric.dipping-session')}</p></div></article>`;
}

function hyperbaricCard(exposure) {
    return `<article class="derived-metric"><div class="derived-metric-icon"><i class="fas fa-chart-area"></i></div><div><span>${t('analytics.metric.hyperbaric')}</span><strong>SBP ${number(exposure.systolicHyperbaricIndex)} · DBP ${number(exposure.diastolicHyperbaricIndex)}</strong><p>${t('analytics.metric.hyperbaric-help')}</p></div></article>`;
}

function morningCard(surge) {
    if (!surge?.available) return metricCard('fa-sun', 'analytics.metric.morning-surge', '—', '', 'analytics.metric.morning-unavailable');
    return `<article class="derived-metric"><div class="derived-metric-icon"><i class="fas fa-sun"></i></div><div><span>${t('analytics.metric.morning-surge')}</span><strong>SBP ${signed(surge.systolic)} · DBP ${signed(surge.diastolic)}</strong><p>${t('analytics.metric.morning-help', { before: surge.beforeCount, after: surge.afterCount })}</p></div></article>`;
}

function eventTimeline(events) {
    if (!events.length) return `<div class="analysis-timeline-empty"><i class="fas fa-tags"></i>${t('analytics.timeline.empty')}</div>`;
    return `<div class="analysis-timeline"><div class="analysis-timeline-title"><i class="fas fa-timeline"></i>${t('analytics.timeline.title')}</div><div class="analysis-timeline-items">${events.map(event => `<div class="timeline-event"><time>${formatDate(new Date(event.datetime), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time><strong>${escapeHtml(event.label || t(`event.type.${event.type}`))}</strong>${event.note ? `<span>${escapeHtml(event.note)}</span>` : ''}</div>`).join('')}</div></div>`;
}

function renderPatterns(analysis, settings) {
    const container = document.getElementById('patterns-detection');
    if (!container) return;
    const patterns = detectResearchPatterns(analysis, state.measurements, settings);
    container.dataset.i18nSkip = '';
    container.innerHTML = `<div class="pattern-research-notice"><i class="fas fa-flask me-2"></i>${t('analytics.patterns.research-notice')}</div>`;
    if (!analysis || analysis.validMeasurements.length < settings.analysis.minimumPatternReadings) {
        container.innerHTML += `<p class="text-muted text-center mb-0">${t('analytics.patterns.need-more-data', { count: settings.analysis.minimumPatternReadings })}</p>`;
        return;
    }
    if (!patterns.length) {
        container.innerHTML += `<p class="text-muted text-center mb-0">${t('analytics.patterns.none')}</p>`;
        return;
    }
    container.innerHTML += patterns.map(pattern => `<article class="pattern-item"><div class="pattern-icon ${pattern.type}"><i class="fas ${pattern.icon}"></i></div><div class="pattern-content"><h6>${t('analytics.patterns.card-title', { name: t(pattern.titleKey) })}</h6><p>${t(pattern.descriptionKey, pattern.params)}</p></div></article>`).join('');
}

function ensureCharts() {
    if (!globalThis.Chart) return;
    if (!monthlyPressureChart) monthlyPressureChart = createLineChart('monthly-pressure-chart');
    if (!dailyProfileChart) dailyProfileChart = createLineChart('daily-profile-chart');
}

function createLineChart(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    const compact = isCompactChartViewport();
    return new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: pressureDatasets() },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: compact ? 0 : 400 },
            layout: { padding: compact ? 0 : 4 },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: responsiveLegend(),
                tooltip: responsiveTooltip()
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: responsiveTicks(undefined, { maxTicks: 6 })
                },
                y: {
                    beginAtZero: false,
                    suggestedMin: 60,
                    suggestedMax: 170,
                    ticks: responsiveTicks(undefined, { maxTicks: 5 }),
                    title: responsiveAxisTitle(t('Pressure (mmHg)'))
                }
            }
        }
    });
}

function pressureDatasets() {
    return [
        { label: t('Systolic'), data: [], borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.12)', tension: 0.3, spanGaps: true },
        { label: t('Diastolic'), data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.12)', tension: 0.3, spanGaps: true },
        { label: t('Pulse'), data: [], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.1)', tension: 0.3, spanGaps: true, borderDash: [5, 4] }
    ];
}

function renderMonthlyChart() {
    if (!monthlyPressureChart) return;
    const valid = filterAnalysisMeasurements(state.measurements);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 29);
    cutoff.setHours(0, 0, 0, 0);
    const groups = new Map();
    valid.forEach(item => {
        const date = parseMeasurementDate(item.datetime);
        if (!date || date < cutoff) return;
        const key = item.datetime.slice(0, 10);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
    });
    const entries = [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
    monthlyPressureChart.data.labels = entries.map(([key]) => formatDate(new Date(`${key}T12:00`), { day: 'numeric', month: 'short' }));
    setChartData(monthlyPressureChart, entries.map(([, items]) => items));
}

function renderDailyChart(analysis) {
    if (!dailyProfileChart) return;
    const groups = Array.from({ length: 24 }, () => []);
    analysis?.validMeasurements.forEach(item => {
        const date = parseMeasurementDate(item.datetime);
        if (date) groups[date.getHours()].push(item);
    });
    dailyProfileChart.data.labels = groups.map((_, hour) => `${String(hour).padStart(2, '0')}:00`);
    setChartData(dailyProfileChart, groups);
}

function setChartData(chart, groups) {
    const mean = (items, key) => items.length ? items.reduce((sum, item) => sum + item[key], 0) / items.length : null;
    chart.data.datasets[0].data = groups.map(items => mean(items, 'systolic'));
    chart.data.datasets[1].data = groups.map(items => mean(items, 'diastolic'));
    chart.data.datasets[2].data = groups.map(items => mean(items, 'pulse'));
    chart.update();
}

function renderHeatmap(settings) {
    const container = document.getElementById('weekly-heatmap');
    if (!container) return;
    const threshold = thresholdForPeriod(settings, settings.monitoring.profile === 'abpm24' ? 'full' : 'full');
    const groups = new Map();
    filterAnalysisMeasurements(state.measurements).forEach(item => {
        const key = item.datetime.slice(0, 10);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
    });
    const today = new Date();
    const days = Array.from({ length: 30 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - 29 + index);
        const key = localDateKey(date);
        const items = groups.get(key) ?? [];
        const mean = items.length ? items.reduce((sum, item) => sum + item.systolic, 0) / items.length : null;
        const level = mean === null ? 'empty' : mean >= threshold.systolic ? 'above' : 'within';
        return `<button class="analytics-heat-cell ${level}" type="button" data-date="${key}" title="${mean === null ? t('analytics.no-data') : `${number(mean, 0)} ${t('unit.mm-short')}`}"><span>${date.getDate()}</span><strong>${mean === null ? '—' : number(mean, 0)}</strong></button>`;
    });
    container.dataset.i18nSkip = '';
    container.innerHTML = `<div class="analytics-heat-legend"><span><i class="within"></i>${t('analytics.comparison.within')}</span><span><i class="above"></i>${t('analytics.comparison.above')}</span><span><i class="empty"></i>${t('analytics.no-data')}</span></div><div class="analytics-heat-grid">${days.join('')}</div>`;
}

function renderComparisonZones(analysis, settings) {
    const container = document.getElementById('risk-zones');
    if (!container) return;
    container.dataset.i18nSkip = '';
    const periods = [
        ['full', analysis?.summaries.full],
        ['day', analysis?.summaries.day],
        ['night', analysis?.summaries.night]
    ];
    container.innerHTML = periods.map(([period, summary]) => {
        const threshold = thresholdForPeriod(settings, settings.monitoring.profile === 'abpm24' ? period : 'full');
        const above = summary?.systolic && (summary.systolic.mean >= threshold.systolic || summary.diastolic.mean >= threshold.diastolic);
        return `<article class="comparison-zone ${above ? 'above' : 'within'}"><span>${t(`analytics.period.${period}`)}</span><strong>${summary?.systolic ? `${number(summary.systolic.mean, 0)}/${number(summary.diastolic.mean, 0)}` : '—'}</strong><small>${t('analytics.comparison.threshold')}: ${threshold.systolic}/${threshold.diastolic}</small><em>${summary?.systolic ? t(above ? 'analytics.comparison.above' : 'analytics.comparison.within') : t('analytics.no-data')}</em></article>`;
    }).join('');
}

function emptyState(icon, key) {
    return `<div class="analytics-empty"><i class="fas ${icon}"></i><p>${t(key)}</p></div>`;
}

function number(value, digits = 1) {
    return Number.isFinite(value) ? formatNumber(value, { maximumFractionDigits: digits, minimumFractionDigits: digits }) : '—';
}

function signed(value) {
    if (!Number.isFinite(value)) return '—';
    return `${value > 0 ? '+' : ''}${number(value)}`;
}

function localDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
