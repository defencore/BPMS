import { formatDate, t } from '../../i18n/i18n.js';
import { drawDailyProfileChart, drawEscDistribution, drawPressureCalendar } from './pdf-analytics-charts.js';
import { drawTimelineChart } from './pdf-charts.js';
import { integer, percent, shortChartDate } from './report-formatters.js';
import { withPressureBoundaries } from './report-timeline-data.js';

export function writeReportCharts(writer, model) {
    const pressureTimeline = withPressureBoundaries(model.chartMeasurements, model.settings);
    drawPressureCalendar(writer, {
        title: t('report.chart.calendar'),
        explanation: t('report.calendar.explanation'),
        calendar: model.visuals.calendar,
        weekdayLabels: weekdayLabels(),
        formatDay: date => formatDate(date, { day: '2-digit', month: '2-digit' }),
        countLabel: count => t('report.calendar.count', { count: integer(count) }),
        labelFor: classification => t(classification.textKey),
        emptyLabel: t('report.no-chart-data')
    });
    drawTimelineChart(writer, {
        title: t('report.chart.dynamics'),
        explanation: t('report.dynamics.explanation'),
        measurements: pressureTimeline,
        series: [
            { key: 'systolic', label: t('report.series.systolic'), color: 'systolic' },
            { key: 'diastolic', label: t('report.series.diastolic'), color: 'diastolic' },
            { key: 'systolicBoundary', color: 'systolicBoundary', dashed: true, points: false, legend: false },
            { key: 'diastolicBoundary', color: 'diastolicBoundary', dashed: true, points: false, legend: false }
        ],
        unit: t('report.unit.pressure'),
        formatDate: shortChartDate,
        noData: t('report.no-chart-data'),
        sleepWindow: model.settings.monitoring,
        events: model.events,
        eventLabel: t('report.series.context-event')
    });
    drawDailyProfileChart(writer, {
        title: t('report.chart.daily-profile'),
        explanation: t('report.profile.explanation'),
        profile: model.visuals.dailyProfile,
        series: [
            { key: 'systolic', label: t('report.series.systolic'), color: 'systolic' },
            { key: 'diastolic', label: t('report.series.diastolic'), color: 'diastolic' },
            { key: 'pulse', label: t('report.series.pulse'), color: 'pulse' }
        ],
        unit: t('report.unit.profile'),
        sleepStart: model.settings.monitoring.sleepStart,
        wakeTime: model.settings.monitoring.wakeTime,
        noData: t('report.no-chart-data')
    });
    drawEscDistribution(writer, {
        title: t('report.chart.esc-distribution'),
        explanation: t('report.esc.explanation'),
        items: model.visuals.escDistribution,
        totalLabel: t('report.esc.total', { count: integer(model.primaryMeasurements.length) }),
        noData: t('report.no-chart-data'),
        labelFor: item => t(item.textKey),
        valueFor: item => `${integer(item.count)} (${percent(item.percent)})`
    });
    drawTimelineChart(writer, {
        title: t('report.chart.pulse'),
        explanation: t('report.pulse-chart.explanation'),
        measurements: model.chartMeasurements,
        series: [{ key: 'pulse', label: t('report.series.pulse'), color: 'pulse' }],
        unit: t('report.unit.pulse'),
        formatDate: shortChartDate,
        noData: t('report.no-chart-data')
    });
}

function weekdayLabels() {
    const monday = new Date(2024, 0, 1, 12);
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        return formatDate(date, { weekday: 'short' });
    });
}
