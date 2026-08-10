import { formatDate, t } from '../../i18n/i18n.js';
import { drawCorrelationPlots } from './pdf-scatter-plots.js';
import { decimal, integer, percent, pressureAverage } from './report-formatters.js';

const PERIODS = Object.freeze(['full', 'day', 'night']);
const EXTREME_METRICS = Object.freeze([
    ['systolic', 'analytics.detail.systolic', 'report.unit.pressure'],
    ['diastolic', 'analytics.detail.diastolic', 'report.unit.pressure'],
    ['meanArterialPressure', 'analytics.detail.map', 'report.unit.pressure'],
    ['pulsePressure', 'analytics.detail.pulse-pressure', 'report.unit.pressure'],
    ['pulse', 'analytics.detail.pulse', 'report.unit.pulse']
]);

export function writeClinicalDetails(writer, model) {
    writePeriodLoads(writer, model.sessions);
    writeExtremes(writer, model.extremes);
    writeHourlyProfile(writer, model.hourlyProfile);
    writeCorrelations(writer, model.correlations);
}

function writePeriodLoads(writer, sessions) {
    if (!sessions.length) return;
    writer.ensure(32 + sessions.length * PERIODS.length * 8);
    writer.section(t('report.section.period-load'));
    writer.paragraph(t('report.period-load.explanation'), { muted: true, size: 7.4 });
    const rows = sessions.flatMap((analysis, index) => PERIODS.map(period => {
        const exposure = analysis.exposures[period];
        return {
            session: integer(index + 1),
            period: t(`analytics.period.${period}`),
            readings: integer(analysis.summaries[period].count),
            average: pressureAverage(analysis.summaries[period]),
            sysLoad: percent(exposure.systolicReadingLoadPercent),
            diaLoad: percent(exposure.diastolicReadingLoadPercent),
            sysTime: percent(exposure.systolicTimeAbovePercent),
            diaTime: percent(exposure.diastolicTimeAbovePercent)
        };
    }));
    writer.table([
        { key: 'session', label: '#', width: 10 },
        { key: 'period', label: t('analytics.period'), width: 28 },
        { key: 'readings', label: t('analytics.readings'), width: 19 },
        { key: 'average', label: t('report.column.avg-bp'), width: 25 },
        { key: 'sysLoad', label: t('report.column.sys-load'), width: 25 },
        { key: 'diaLoad', label: t('report.column.dia-load'), width: 25 },
        { key: 'sysTime', label: t('report.column.sys-time'), width: 25 },
        { key: 'diaTime', label: t('report.column.dia-time'), width: 25 }
    ], rows, { fontSize: 6.1 });
}

function writeExtremes(writer, extremes) {
    writer.section(t('report.section.extremes'));
    writer.paragraph(t('report.extremes.explanation'), { muted: true, size: 7.4 });
    writer.table([
        { key: 'metric', label: t('report.column.metric'), width: 46 },
        { key: 'minimum', label: t('analytics.detail.minimum'), width: 68 },
        { key: 'maximum', label: t('analytics.detail.maximum'), width: 68 }
    ], EXTREME_METRICS.map(([key, labelKey, unitKey]) => ({
        metric: t(labelKey),
        minimum: extremeValue(extremes[key]?.min, unitKey),
        maximum: extremeValue(extremes[key]?.max, unitKey)
    })));
}

function writeHourlyProfile(writer, profile) {
    const populated = profile.filter(item => item.count);
    if (!populated.length) return;
    writer.section(t('report.section.hourly'));
    writer.paragraph(t('report.hourly.explanation'), { muted: true, size: 7.4 });
    writer.table([
        { key: 'hour', label: t('analytics.detail.hour'), width: 22 },
        { key: 'count', label: t('report.column.count'), width: 20 },
        { key: 'bp', label: t('report.column.avg-bp'), width: 30 },
        { key: 'map', label: 'MAP', width: 24 },
        { key: 'pp', label: 'PP', width: 24 },
        { key: 'pulse', label: t('report.column.avg-pulse'), width: 30 },
        { key: 'rpp', label: 'RPP/100', width: 32 }
    ], populated.map(item => ({
        hour: `${String(item.hour).padStart(2, '0')}:00`,
        count: integer(item.count),
        bp: pressureAverage(item),
        map: decimal(item.meanArterialPressure?.mean),
        pp: decimal(item.pulsePressure?.mean),
        pulse: decimal(item.pulse?.mean),
        rpp: decimal(item.scaledRpp?.mean)
    })), { fontSize: 6.6 });
}

function writeCorrelations(writer, correlations) {
    const available = correlations.filter(item => item.available);
    if (!available.length) return;
    writer.section(t('report.section.correlations'));
    writer.paragraph(t('report.correlations.explanation'), { muted: true, size: 7.4 });
    drawCorrelationPlots(writer, available, correlationLabel, decimal);
    writer.paragraph(t('report.correlations.warning'), { muted: true, size: 7.2 });
}

function correlationLabel(correlation, axis) {
    if (!axis) return t(`analytics.correlation.${correlation.id}`);
    return t(`report.correlation.axis.${correlation[axis]}`);
}

function extremeValue(item, unitKey) {
    if (!item) return '-';
    const date = new Date(item.datetime.replace(' ', 'T'));
    return `${decimal(item.value)} ${t(unitKey)} · ${formatDate(date, { dateStyle: 'short', timeStyle: 'short' })}`;
}
