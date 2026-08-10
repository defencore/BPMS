const PLOT_COLORS = Object.freeze({
    systolic: [220, 38, 38],
    diastolic: [37, 99, 235],
    pulse: [5, 150, 105],
    systolicBoundary: [248, 113, 113],
    diastolicBoundary: [96, 165, 250],
    event: [124, 58, 237],
    sleep: [238, 242, 255],
    grid: [226, 232, 240],
    axis: [100, 116, 139],
    background: [248, 250, 252]
});
const MAX_CONNECTED_GAP_MS = 4 * 60 * 60 * 1000;

export function drawTimelineChart(writer, {
    title,
    explanation,
    measurements,
    series,
    unit,
    formatDate,
    noData,
    sleepWindow = null,
    events = [],
    eventLabel = ''
}) {
    writer.ensure(92);
    writer.section(title);
    if (explanation) writer.paragraph(explanation, { muted: true, size: 7.2 });
    if (!measurements.length) {
        writer.paragraph(noData, { muted: true });
        return;
    }
    const pdf = writer.pdf;
    const x = writer.margin + 12;
    const y = writer.y + 5;
    const width = writer.contentWidth - 16;
    const height = 53;
    const values = measurements.flatMap(item => series.map(entry => item[entry.key])).filter(Number.isFinite);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const padding = Math.max(5, (rawMax - rawMin) * 0.08);
    const valueMin = Math.floor(rawMin - padding);
    const valueMax = Math.ceil(rawMax + padding);
    const times = measurements.map(item => dateValue(item.datetime));
    const timeMin = Math.min(...times);
    const timeMax = Math.max(...times);

    pdf.setFillColor(...PLOT_COLORS.background);
    pdf.setDrawColor(...PLOT_COLORS.grid);
    pdf.rect(x, y, width, height, 'FD');
    if (sleepWindow) drawSleepIntervals(pdf, x, y, width, height, timeMin, timeMax, sleepWindow);

    for (let index = 0; index <= 4; index += 1) {
        const ratio = index / 4;
        const lineY = y + height - ratio * height;
        const label = Math.round(valueMin + ratio * (valueMax - valueMin));
        pdf.setDrawColor(...PLOT_COLORS.grid);
        pdf.line(x, lineY, x + width, lineY);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(...PLOT_COLORS.axis);
        pdf.text(String(label), x - 2, lineY + 1.8, { align: 'right' });
    }

    series.forEach(entry => {
        const points = measurements.map((item, index) => ({
            x: x + timeRatio(times[index], timeMin, timeMax, index, measurements.length) * width,
            y: y + height - (item[entry.key] - valueMin) / (valueMax - valueMin) * height
        }));
        pdf.setDrawColor(...PLOT_COLORS[entry.color]);
        pdf.setLineWidth(entry.dashed ? 0.35 : 0.55);
        pdf.setLineDashPattern(entry.dashed ? [1.2, 1.2] : [], 0);
        points.slice(1).forEach((point, index) => {
            if (times[index + 1] - times[index] <= MAX_CONNECTED_GAP_MS) {
                pdf.line(points[index].x, points[index].y, point.x, point.y);
            }
        });
        pdf.setLineDashPattern([], 0);
        if (entry.points !== false && points.length <= 200) {
            pdf.setFillColor(...PLOT_COLORS[entry.color]);
            points.forEach(point => pdf.circle(point.x, point.y, 0.38, 'F'));
        }
    });
    drawEventMarkers(pdf, events, x, y, width, height, timeMin, timeMax);

    pdf.setFont('DejaVuSans', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...PLOT_COLORS.axis);
    pdf.text(unit, writer.margin, y - 1);
    const dateLabels = [measurements[0], measurements[Math.floor((measurements.length - 1) / 2)], measurements.at(-1)];
    dateLabels.forEach((item, index) => pdf.text(formatDate(item.datetime), x + index * width / 2, y + height + 5, { align: index === 0 ? 'left' : index === 2 ? 'right' : 'center' }));

    let legendX = x;
    series.filter(entry => entry.legend !== false).forEach(entry => {
        pdf.setFillColor(...PLOT_COLORS[entry.color]);
        pdf.rect(legendX, y - 4, 4, 1.4, 'F');
        pdf.setTextColor(...PLOT_COLORS.axis);
        pdf.text(entry.label, legendX + 5, y - 2.6);
        legendX += pdf.getTextWidth(entry.label) + 13;
    });
    if (events.length && eventLabel) {
        pdf.setFillColor(...PLOT_COLORS.event);
        pdf.circle(legendX + 1.5, y - 3.3, 1, 'F');
        pdf.setTextColor(...PLOT_COLORS.axis);
        pdf.text(eventLabel, legendX + 4, y - 2.6);
    }
    writer.y = y + height + 10;
}

function drawSleepIntervals(pdf, x, y, width, height, minimum, maximum, monitoring) {
    if (!(maximum > minimum)) return;
    const cursor = new Date(minimum);
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() - 1);
    const end = new Date(maximum);
    end.setDate(end.getDate() + 1);
    pdf.setFillColor(...PLOT_COLORS.sleep);
    for (; cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const start = atClock(cursor, monitoring.sleepStart);
        const wake = atClock(cursor, monitoring.wakeTime);
        if (wake <= start) wake.setDate(wake.getDate() + 1);
        const from = Math.max(minimum, start.getTime());
        const to = Math.min(maximum, wake.getTime());
        if (to <= from) continue;
        const left = x + (from - minimum) / (maximum - minimum) * width;
        const span = (to - from) / (maximum - minimum) * width;
        pdf.rect(left, y, span, height, 'F');
    }
}

function drawEventMarkers(pdf, events, x, y, width, height, minimum, maximum) {
    if (!(maximum > minimum)) return;
    const visible = events.map(event => dateValue(event.datetime)).filter(time => time >= minimum && time <= maximum).slice(0, 40);
    pdf.setDrawColor(...PLOT_COLORS.event);
    pdf.setFillColor(...PLOT_COLORS.event);
    pdf.setLineWidth(0.25);
    pdf.setLineDashPattern([0.8, 1.2], 0);
    visible.forEach(time => {
        const markerX = x + (time - minimum) / (maximum - minimum) * width;
        pdf.line(markerX, y, markerX, y + height);
        pdf.triangle(markerX - 1, y, markerX + 1, y, markerX, y + 2, 'F');
    });
    pdf.setLineDashPattern([], 0);
}

function atClock(day, value) {
    const [hour, minute] = value.split(':').map(Number);
    const result = new Date(day);
    result.setHours(hour, minute, 0, 0);
    return result;
}

function dateValue(value) {
    const date = new Date(value.replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function timeRatio(value, minimum, maximum, index, length) {
    if (maximum > minimum) return (value - minimum) / (maximum - minimum);
    return length > 1 ? index / (length - 1) : 0.5;
}
