const PLOT_COLORS = Object.freeze({
    systolic: [220, 38, 38],
    diastolic: [37, 99, 235],
    pulse: [5, 150, 105],
    grid: [226, 232, 240],
    axis: [100, 116, 139],
    background: [248, 250, 252]
});
const MAX_CONNECTED_GAP_MS = 4 * 60 * 60 * 1000;

export function drawTimelineChart(writer, { title, measurements, series, unit, formatDate, noData }) {
    writer.ensure(86);
    writer.section(title);
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
        pdf.setLineWidth(0.55);
        points.slice(1).forEach((point, index) => {
            if (times[index + 1] - times[index] <= MAX_CONNECTED_GAP_MS) {
                pdf.line(points[index].x, points[index].y, point.x, point.y);
            }
        });
        if (points.length <= 200) {
            pdf.setFillColor(...PLOT_COLORS[entry.color]);
            points.forEach(point => pdf.circle(point.x, point.y, 0.38, 'F'));
        }
    });

    pdf.setFont('DejaVuSans', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...PLOT_COLORS.axis);
    pdf.text(unit, writer.margin, y - 1);
    const dateLabels = [measurements[0], measurements[Math.floor((measurements.length - 1) / 2)], measurements.at(-1)];
    dateLabels.forEach((item, index) => pdf.text(formatDate(item.datetime), x + index * width / 2, y + height + 5, { align: index === 0 ? 'left' : index === 2 ? 'right' : 'center' }));

    let legendX = x;
    series.forEach(entry => {
        pdf.setFillColor(...PLOT_COLORS[entry.color]);
        pdf.rect(legendX, y - 4, 4, 1.4, 'F');
        pdf.setTextColor(...PLOT_COLORS.axis);
        pdf.text(entry.label, legendX + 5, y - 2.6);
        legendX += pdf.getTextWidth(entry.label) + 13;
    });
    writer.y = y + height + 10;
}

function dateValue(value) {
    const date = new Date(value.replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function timeRatio(value, minimum, maximum, index, length) {
    if (maximum > minimum) return (value - minimum) / (maximum - minimum);
    return length > 1 ? index / (length - 1) : 0.5;
}
