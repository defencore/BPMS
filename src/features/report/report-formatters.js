import { bodyPositionLabelKey } from '../../core/body-positions.js';
import { parseMeasurementDate } from '../../core/analytics/time.js';
import { formatDate, formatNumber, t } from '../../i18n/i18n.js';

export function formatReportRange({ start, end }) {
    if (!start || !end) return t('report.not-available');
    const options = { dateStyle: 'medium', timeStyle: 'short' };
    return `${formatDate(start, options)} - ${formatDate(end, options)}`;
}

export function formatMeasurementDate(value) {
    const date = parseMeasurementDate(value) ?? new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : formatDate(date, { dateStyle: 'short', timeStyle: 'short' });
}

export function shortChartDate(value) {
    const date = parseMeasurementDate(value);
    return date ? formatDate(date, { day: '2-digit', month: '2-digit' }) : value.slice(0, 10);
}

export function pressureAverage(summary) {
    return summary.systolic && summary.diastolic
        ? `${decimal(summary.systolic.mean)}/${decimal(summary.diastolic.mean)}`
        : '-';
}

export function pressureValues(values) {
    return Number.isFinite(values.systolic) && Number.isFinite(values.diastolic)
        ? `${decimal(values.systolic)}/${decimal(values.diastolic)}`
        : '-';
}

export function rangeValue(summary) {
    return summary ? `${integer(summary.min)}-${integer(summary.max)}` : '-';
}

export function decimal(value) {
    return Number.isFinite(value) ? formatNumber(value, { maximumFractionDigits: 1 }) : '-';
}

export function percent(value) {
    return Number.isFinite(value) ? `${decimal(value)}%` : '-';
}

export function signed(value) {
    if (!Number.isFinite(value)) return '-';
    return `${value > 0 ? '+' : ''}${decimal(value)}`;
}

export function integer(value) {
    return Number.isFinite(Number(value)) ? formatNumber(Number(value), { maximumFractionDigits: 0 }) : '-';
}

export function measurementFlags(measurement) {
    const flags = [];
    if (measurement.measurementMethod === 'manual') flags.push(t('report.flag.manual'));
    if (measurement.hasMovement) flags.push(t('report.flag.movement'));
    if (measurement.edited) flags.push(t('report.flag.edited'));
    if (measurement.errorCode || measurement.error !== 'none') flags.push(t('report.flag.error'));
    return flags.join(', ') || t('report.flag.none');
}

export function measurementPosition(measurement) {
    return t(bodyPositionLabelKey(measurement.bodyPosition));
}

export function reportFilename(model) {
    const start = model.range.start?.toISOString().slice(0, 10) ?? 'data';
    const end = model.range.end?.toISOString().slice(0, 10) ?? start;
    return `bpms_report_${start}_${end}.pdf`;
}
