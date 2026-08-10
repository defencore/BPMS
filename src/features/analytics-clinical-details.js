import { formatDate, formatNumber, t } from '../i18n/i18n.js';

const PERIODS = Object.freeze(['full', 'day', 'night']);
const EXTREME_METRICS = Object.freeze([
    ['systolic', 'analytics.detail.systolic', 'mmHg'],
    ['diastolic', 'analytics.detail.diastolic', 'mmHg'],
    ['meanArterialPressure', 'analytics.detail.map', 'mmHg'],
    ['pulsePressure', 'analytics.detail.pulse-pressure', 'mmHg'],
    ['pulse', 'analytics.detail.pulse', 'bpm']
]);

export function renderAnalyticsClinicalDetails(analysis) {
    return `
        <div class="analytics-clinical-details">
            ${renderPeriodLoads(analysis)}
            ${renderExtremes(analysis.extremes.full)}
            ${renderHourlyProfile(analysis.hourlyProfile)}
            ${renderCorrelations(analysis.correlations)}
        </div>`;
}

function renderPeriodLoads(analysis) {
    const rows = PERIODS.map(period => {
        const exposure = analysis.exposures[period];
        const summary = analysis.summaries[period];
        return `<tr>
            <th scope="row">${t(`analytics.period.${period}`)}</th>
            <td data-label="${t('analytics.readings')}">${summary?.count ?? 0}</td>
            <td data-label="${t('analytics.detail.sys-load')}">${percent(exposure.systolicReadingLoadPercent)}</td>
            <td data-label="${t('analytics.detail.dia-load')}">${percent(exposure.diastolicReadingLoadPercent)}</td>
            <td data-label="${t('analytics.detail.sys-time')}">${percent(exposure.systolicTimeAbovePercent)}</td>
            <td data-label="${t('analytics.detail.dia-time')}">${percent(exposure.diastolicTimeAbovePercent)}</td>
        </tr>`;
    }).join('');
    return detailBlock('fa-gauge-high', 'analytics.detail.period-load', 'analytics.detail.period-load-help', `
        <div class="table-responsive"><table class="table table-sm analytics-data-table analytics-period-load-table">
            <thead><tr><th>${t('analytics.period')}</th><th>${t('analytics.readings')}</th><th>${t('analytics.detail.sys-load')}</th><th>${t('analytics.detail.dia-load')}</th><th>${t('analytics.detail.sys-time')}</th><th>${t('analytics.detail.dia-time')}</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>`);
}

function renderExtremes(extremes) {
    const rows = EXTREME_METRICS.map(([key, labelKey, unitKey]) => `<tr>
        <th scope="row">${t(labelKey)}</th>
        <td data-label="${t('analytics.detail.minimum')}">${extremeValue(extremes[key]?.min, unitKey)}</td>
        <td data-label="${t('analytics.detail.maximum')}">${extremeValue(extremes[key]?.max, unitKey)}</td>
    </tr>`).join('');
    return detailBlock('fa-arrow-down-up-across-line', 'analytics.detail.extremes', 'analytics.detail.extremes-help', `
        <div class="table-responsive"><table class="table table-sm analytics-data-table analytics-extremes-table">
            <thead><tr><th>${t('analytics.detail.metric')}</th><th>${t('analytics.detail.minimum')}</th><th>${t('analytics.detail.maximum')}</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>`);
}

function renderHourlyProfile(profile) {
    const populated = profile.filter(hour => hour.count);
    const rows = populated.map(hour => `<tr>
        <th scope="row">${String(hour.hour).padStart(2, '0')}:00</th>
        <td data-label="${t('analytics.readings')}">${hour.count}</td>
        <td data-label="${t('analytics.detail.bp')}">${value(hour.systolic?.mean, 0)}/${value(hour.diastolic?.mean, 0)}</td>
        <td data-label="MAP">${value(hour.meanArterialPressure?.mean)}</td>
        <td data-label="PP">${value(hour.pulsePressure?.mean)}</td>
        <td data-label="${t('analytics.detail.pulse')}">${value(hour.pulse?.mean, 0)}</td>
        <td data-label="RPP/100">${value(hour.scaledRpp?.mean)}</td>
    </tr>`).join('');
    return `<details class="analytics-details-disclosure">
        <summary><span><i class="fas fa-clock"></i>${t('analytics.detail.hourly')}</span><small>${t('analytics.detail.hourly-help')}</small></summary>
        <div class="table-responsive"><table class="table table-sm analytics-data-table">
            <thead><tr><th>${t('analytics.detail.hour')}</th><th>${t('analytics.readings')}</th><th>${t('analytics.detail.bp')}</th><th>MAP</th><th>PP</th><th>${t('analytics.detail.pulse')}</th><th>RPP/100</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
    </details>`;
}

function renderCorrelations(correlations) {
    const rows = correlations.map(item => `<tr>
        <th scope="row">${t(`analytics.correlation.${item.id}`)}</th>
        <td data-label="n">${item.n}</td>
        <td data-label="r">${item.available ? signed(item.r) : '—'}</td>
        <td data-label="R²">${item.available ? value(item.rSquared, 2) : '—'}</td>
    </tr>`).join('');
    return detailBlock('fa-circle-nodes', 'analytics.detail.correlations', 'analytics.detail.correlations-help', `
        <div class="table-responsive"><table class="table table-sm analytics-data-table">
            <thead><tr><th>${t('analytics.detail.relationship')}</th><th>n</th><th>r</th><th>R²</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
        <p class="analytics-correlation-warning"><i class="fas fa-flask"></i>${t('analytics.detail.correlation-warning')}</p>`);
}

function detailBlock(icon, titleKey, helpKey, content) {
    return `<section class="analytics-detail-block"><header><span><i class="fas ${icon}"></i>${t(titleKey)}</span><small>${t(helpKey)}</small></header>${content}</section>`;
}

function extremeValue(item, unitKey) {
    if (!item) return '—';
    return `<strong>${value(item.value)} ${t(unitKey)}</strong><small>${formatDate(new Date(item.datetime.replace(' ', 'T')), { dateStyle: 'short', timeStyle: 'short' })}</small>`;
}

function value(number, digits = 1) {
    return Number.isFinite(number) ? formatNumber(number, { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';
}

function percent(number) {
    return Number.isFinite(number) ? `${value(number)}%` : '—';
}

function signed(number) {
    return Number.isFinite(number) ? `${number > 0 ? '+' : ''}${value(number, 2)}` : '—';
}
