import { ESC_GUIDELINE_URL } from '../../core/clinical-sources.js';
import { formatEventOffset } from '../../core/measurement-context.js';
import { formatDate, t } from '../../i18n/i18n.js';
import { writeReportCharts } from './report-charts-section.js';
import { writeClinicalDetails } from './report-clinical-details.js';
import {
    decimal,
    formatMeasurementDate,
    integer,
    measurementFlags,
    measurementPosition,
    percent,
    pressureAverage,
    pressureValues,
    rangeValue,
    signed
} from './report-formatters.js';

export function writeReportSections(writer, model) {
    writeOverview(writer, model);
    writeAnalytics(writer, model);
    writeCompleteness(writer, model);
    writeReportCharts(writer, model);
    writeClinicalDetails(writer, model);
    writeDailySummary(writer, model);
    writeEvents(writer, model.events);
    writeEventCorrelations(writer, model.eventCorrelations);
    writeMeasurements(writer, model.recorded);
}

function writeOverview(writer, model) {
    writer.section(t('report.section.overview'));
    writer.statCards([
        { label: t('report.metric.recorded'), value: integer(model.quality.recorded) },
        { label: t('report.metric.included'), value: integer(model.quality.included) },
        { label: t('report.metric.movement'), value: integer(model.quality.movement) },
        { label: t('report.metric.days'), value: integer(model.daily.length) }
    ]);
    writer.table(summaryColumns(), [
        summaryRow(t('report.summary.primary'), model.summary),
        summaryRow(t('report.summary.all-usable'), model.allValuesSummary)
    ]);
}

function writeAnalytics(writer, model) {
    writer.section(t('report.section.analytics'));
    writer.paragraph(t('report.analytics.explanation'), { muted: true });
    writer.statCards([
        { label: t('report.analytics.mean-pp'), value: `${decimal(model.summary.pulsePressure?.mean)} ${t('report.unit.pressure')}` },
        { label: t('report.analytics.mean-map'), value: `${decimal(model.summary.meanArterialPressure?.mean)} ${t('report.unit.pressure')}` },
        { label: t('report.analytics.sbp-sd'), value: `${decimal(model.summary.systolic?.sd)} ${t('report.unit.pressure')}` },
        { label: t('report.analytics.sbp-cv'), value: `${decimal(model.summary.systolic?.cv)}%` },
        { label: t('report.analytics.sbp-arv'), value: `${decimal(model.summary.systolic?.arv)} ${t('report.unit.pressure')}` },
        { label: t('report.analytics.scaled-rpp'), value: decimal(model.summary.scaledRpp?.mean) },
        {
            label: t('report.analytics.quality-sessions'),
            value: `${integer(model.sessions.filter(item => item.quality.sufficient).length)} / ${integer(model.sessions.length)}`
        }
    ], { columns: 4 });
    writer.pageBreak();
    writer.section(t('report.section.sessions'));
    writer.table([
        { key: 'session', label: '#', width: 9 },
        { key: 'start', label: t('report.analytics.session-start'), width: 28 },
        { key: 'quality', label: t('report.analytics.quality'), width: 28 },
        { key: 'day', label: t('report.analytics.awake-bp'), width: 23 },
        { key: 'night', label: t('report.analytics.asleep-bp'), width: 23 },
        { key: 'dip', label: t('report.analytics.dip'), width: 27 },
        { key: 'morning', label: t('report.analytics.morning'), width: 22 },
        { key: 'load', label: t('report.analytics.load'), width: 22 }
    ], model.sessions.map((analysis, index) => ({
        session: integer(index + 1),
        start: formatDate(analysis.session.start, { dateStyle: 'short', timeStyle: 'short' }),
        quality: `${analysis.quality.sufficient ? '✓' : '!'} ${integer(analysis.quality.valid)}/${integer(analysis.quality.total)}; ${percent(analysis.quality.coveragePercent)}`,
        day: pressureAverage(analysis.summaries.day),
        night: pressureAverage(analysis.summaries.night),
        dip: analysis.dipping
            ? `${t(`analytics.dipping.${analysis.dipping.systolicCategory}`)}; ${percent(analysis.dipping.systolic)}`
            : '-',
        morning: analysis.morningSurge?.available ? signed(analysis.morningSurge.systolic) : '-',
        load: percent(analysis.exposure.readingLoadPercent)
    })), { fontSize: 6.5 });
    writer.paragraph(t('report.analytics.how-to-read'), { muted: true, size: 7.4 });
}

function writeCompleteness(writer, model) {
    writer.ensure(72);
    writer.section(t('report.section.completeness'));
    writer.paragraph(t('report.completeness.explanation'));
    writer.table([
        { key: 'metric', label: t('report.column.metric'), width: 132 },
        { key: 'value', label: t('report.column.count'), width: 50 }
    ], [
        qualityRow('report.metric.recorded', model.quality.recorded),
        qualityRow('report.metric.usable', model.quality.usable),
        qualityRow('report.metric.included', model.quality.included),
        qualityRow('report.metric.excluded', model.quality.excluded),
        qualityRow('report.metric.movement', model.quality.movement),
        qualityRow('report.metric.errors', model.quality.deviceErrors),
        qualityRow('report.metric.manual', model.quality.manual),
        qualityRow('report.metric.edited', model.quality.edited),
        qualityRow('report.metric.comments', model.quality.comments)
    ]);
    writer.link(t('report.source'), ESC_GUIDELINE_URL);
}

function writeDailySummary(writer, model) {
    writer.ensure(70);
    writer.section(t('report.section.daily'));
    writer.table([
        { key: 'date', label: t('report.column.date'), width: 28 },
        { key: 'recorded', label: t('report.metric.recorded'), width: 24 },
        { key: 'included', label: t('report.metric.included'), width: 24 },
        { key: 'averageBp', label: t('report.column.avg-bp'), width: 32 },
        { key: 'averagePulse', label: t('report.column.avg-pulse'), width: 27 },
        { key: 'systolicRange', label: t('report.column.sys-range'), width: 27 },
        { key: 'movement', label: t('report.metric.movement'), width: 20 }
    ], model.daily.map(day => ({
        date: formatDate(`${day.date}T00:00:00`, { dateStyle: 'short' }),
        recorded: integer(day.recorded),
        included: integer(day.included),
        averageBp: pressureAverage(day.summary),
        averagePulse: decimal(day.summary.pulse?.mean),
        systolicRange: rangeValue(day.summary.systolic),
        movement: integer(day.movement)
    })), { fontSize: 6.8 });
}

function writeEvents(writer, events) {
    if (!events.length) return;
    writer.section(t('report.section.events'));
    writer.table([
        { key: 'datetime', label: t('report.column.datetime'), width: 29 },
        { key: 'type', label: t('report.column.type'), width: 29 },
        { key: 'details', label: t('report.column.details'), width: 39 },
        { key: 'duration', label: t('report.column.duration'), width: 21 },
        { key: 'window', label: t('report.column.window'), width: 22 },
        { key: 'note', label: t('report.column.comment'), width: 40 }
    ], events.map(event => ({
        datetime: formatMeasurementDate(event.datetime),
        type: t(`event.type.${event.type}`),
        details: [event.anchorMeasurementKey ? formatEventOffset(event.offsetMinutes) : '', event.label, event.name, event.dose].filter(Boolean).join(' · ') || '-',
        duration: event.durationMinutes ? `${integer(event.durationMinutes)} ${t('event.minutes-short')}` : '-',
        window: `${integer(event.analysisWindowMinutes)} ${t('event.minutes-short')}`,
        note: event.note || '-'
    })), { fontSize: 6.5 });
}

function writeEventCorrelations(writer, groups) {
    const available = groups.filter(group => group.comparableOccurrences);
    if (!available.length) return;
    writer.ensure(64);
    writer.section(t('report.section.event-correlations'));
    writer.paragraph(t('report.event-correlation.explanation'), { muted: true, size: 7.4 });
    writer.table([
        { key: 'event', label: t('report.column.event'), width: 38 },
        { key: 'sample', label: t('report.column.comparable'), width: 21 },
        { key: 'before', label: t('report.column.before-bp'), width: 24 },
        { key: 'after', label: t('report.column.after-bp'), width: 24 },
        { key: 'deltaBp', label: t('report.column.delta-bp'), width: 29 },
        { key: 'deltaPulse', label: t('report.column.delta-pulse'), width: 22 },
        { key: 'quality', label: t('report.column.evidence'), width: 24 }
    ], available.map(group => ({
        event: [group.label || group.name || t(`event.type.${group.type}`), group.label ? group.name : '', group.dose].filter(Boolean).join(' · '),
        sample: `${integer(group.comparableOccurrences)}/${integer(group.occurrenceCount)}`,
        before: pressureValues(group.before),
        after: pressureValues(group.after),
        deltaBp: `${signed(group.delta.systolic)}/${signed(group.delta.diastolic)}`,
        deltaPulse: signed(group.delta.pulse),
        quality: t(`event.correlation.quality.${group.quality}`)
    })), { fontSize: 6.1 });
    writer.paragraph(t('report.event-correlation.warning'), { muted: true, size: 7.2 });
}

function writeMeasurements(writer, measurements) {
    writer.ensure(26);
    writer.section(t('report.section.measurements'));
    writer.paragraph(t('report.measurements.explanation'), { muted: true, size: 7.8 });
    writer.table([
        { key: 'index', label: '#', width: 10 },
        { key: 'datetime', label: t('report.column.datetime'), width: 31 },
        { key: 'bp', label: t('report.column.bp'), width: 24 },
        { key: 'map', label: 'MAP', width: 16 },
        { key: 'pulse', label: t('report.column.pulse'), width: 16 },
        { key: 'position', label: t('report.column.position'), width: 26 },
        { key: 'flags', label: t('report.column.flags'), width: 27 },
        { key: 'comment', label: t('report.column.comment'), width: 34 }
    ], measurements.map((measurement, index) => ({
        index: integer(index + 1),
        datetime: formatMeasurementDate(measurement.datetime),
        bp: `${measurement.systolic}/${measurement.diastolic}`,
        map: decimal((measurement.systolic + 2 * measurement.diastolic) / 3),
        pulse: integer(measurement.pulse),
        position: measurementPosition(measurement),
        flags: measurementFlags(measurement),
        comment: measurement.comment || '-'
    })), { fontSize: 6.5 });
}

function summaryColumns() {
    return [
        { key: 'scope', label: t('report.column.scope'), width: 34 },
        { key: 'count', label: t('report.column.count'), width: 15 },
        { key: 'averageBp', label: t('report.column.avg-bp'), width: 27 },
        { key: 'averageMap', label: t('report.column.avg-map'), width: 22 },
        { key: 'averagePulse', label: t('report.column.avg-pulse'), width: 22 },
        { key: 'averagePp', label: t('report.column.avg-pp'), width: 20 },
        { key: 'systolicRange', label: t('report.column.sys-range'), width: 22 },
        { key: 'diastolicRange', label: t('report.column.dia-range'), width: 20 }
    ];
}

function summaryRow(scope, summary) {
    return {
        scope,
        count: integer(summary.count),
        averageBp: pressureAverage(summary),
        averageMap: decimal(summary.meanArterialPressure?.mean),
        averagePulse: decimal(summary.pulse?.mean),
        averagePp: decimal(summary.pulsePressure?.mean),
        systolicRange: rangeValue(summary.systolic),
        diastolicRange: rangeValue(summary.diastolic)
    };
}

function qualityRow(key, value) {
    return { metric: t(key), value: integer(value) };
}
