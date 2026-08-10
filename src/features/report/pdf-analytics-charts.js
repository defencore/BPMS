const COLORS = Object.freeze({
    text: [15, 23, 42],
    muted: [100, 116, 139],
    border: [203, 213, 225],
    grid: [226, 232, 240],
    surface: [248, 250, 252],
    sleep: [224, 231, 255],
    systolic: [220, 38, 38],
    diastolic: [37, 99, 235],
    pulse: [5, 150, 105]
});

export function drawPressureCalendar(writer, {
    title,
    explanation,
    calendar,
    weekdayLabels,
    formatDay,
    countLabel,
    labelFor,
    emptyLabel
}) {
    const rows = Math.ceil((calendar.startOffset + calendar.days.length) / 7);
    writer.ensure(31 + rows * 17);
    writer.section(title);
    writer.paragraph(explanation, { muted: true, size: 7.4 });
    if (!calendar.days.length) {
        writer.paragraph(emptyLabel, { muted: true });
        return;
    }

    const pdf = writer.pdf;
    const gap = 1.2;
    const cellWidth = (writer.contentWidth - gap * 6) / 7;
    const cellHeight = 15;
    const headerY = writer.y;
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setFontSize(6.8);
    pdf.setTextColor(...COLORS.muted);
    weekdayLabels.forEach((label, index) => {
        const x = writer.margin + index * (cellWidth + gap);
        pdf.text(label, x + cellWidth / 2, headerY, { align: 'center' });
    });

    const gridY = headerY + 3;
    calendar.days.forEach((day, index) => {
        const position = calendar.startOffset + index;
        const column = position % 7;
        const row = Math.floor(position / 7);
        const x = writer.margin + column * (cellWidth + gap);
        const y = gridY + row * (cellHeight + gap);
        drawCalendarCell(pdf, x, y, cellWidth, cellHeight, day, formatDay, countLabel);
    });

    let legendY = gridY + rows * (cellHeight + gap) + 2;
    let legendX = writer.margin;
    for (const item of calendarLegend(calendar.days, labelFor)) {
        const color = hexToRgb(item.classification.color);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setFontSize(6.5);
        const itemWidth = pdf.getTextWidth(item.label) + 10;
        if (legendX + itemWidth > writer.margin + writer.contentWidth) {
            legendX = writer.margin;
            legendY += 5;
        }
        pdf.setFillColor(...color);
        pdf.circle(legendX + 1.5, legendY - 1.2, 1.2, 'F');
        pdf.setTextColor(...COLORS.muted);
        pdf.text(item.label, legendX + 4, legendY);
        legendX += itemWidth;
    }
    writer.y = legendY + 5;
}

export function drawDailyProfileChart(writer, {
    title,
    explanation,
    profile,
    series,
    unit,
    sleepStart,
    wakeTime,
    noData
}) {
    writer.ensure(96);
    writer.section(title);
    writer.paragraph(explanation, { muted: true, size: 7.4 });
    const values = profile.flatMap(item => series.map(entry => item[entry.key])).filter(Number.isFinite);
    if (!values.length) {
        writer.paragraph(noData, { muted: true });
        return;
    }

    const pdf = writer.pdf;
    const x = writer.margin + 12;
    const y = writer.y + 5;
    const width = writer.contentWidth - 16;
    const height = 52;
    const padding = Math.max(5, (Math.max(...values) - Math.min(...values)) * 0.08);
    const valueMin = Math.floor(Math.min(...values) - padding);
    const valueMax = Math.ceil(Math.max(...values) + padding);

    pdf.setFillColor(...COLORS.surface);
    pdf.setDrawColor(...COLORS.grid);
    pdf.rect(x, y, width, height, 'FD');
    drawSleepBands(pdf, x, y, width, height, sleepStart, wakeTime);
    drawYAxis(pdf, x, y, width, height, valueMin, valueMax);

    for (const entry of series) {
        const points = profile.filter(item => Number.isFinite(item[entry.key])).map(item => ({
            hour: item.hour,
            x: x + item.hour / 23 * width,
            y: y + height - (item[entry.key] - valueMin) / (valueMax - valueMin) * height
        }));
        pdf.setDrawColor(...COLORS[entry.color]);
        pdf.setLineWidth(0.55);
        points.slice(1).forEach((point, index) => {
            if (point.hour - points[index].hour === 1) pdf.line(points[index].x, points[index].y, point.x, point.y);
        });
        pdf.setFillColor(...COLORS[entry.color]);
        points.forEach(point => pdf.circle(point.x, point.y, 0.48, 'F'));
    }

    pdf.setFont('DejaVuSans', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(unit, writer.margin, y - 1);
    [0, 6, 12, 18, 23].forEach(hour => {
        const anchor = hour === 0 ? 'left' : hour === 23 ? 'right' : 'center';
        pdf.text(`${String(hour).padStart(2, '0')}:00`, x + hour / 23 * width, y + height + 5, { align: anchor });
    });
    drawLegend(pdf, x, y - 2.6, series);
    writer.y = y + height + 10;
}

export function drawEscDistribution(writer, { title, explanation, items, totalLabel, noData, labelFor, valueFor }) {
    writer.ensure(74);
    writer.section(title);
    writer.paragraph(explanation, { muted: true, size: 7.4 });
    if (!items.length) {
        writer.paragraph(noData, { muted: true });
        return;
    }

    const pdf = writer.pdf;
    const labelWidth = 50;
    const valueWidth = 27;
    const barX = writer.margin + labelWidth;
    const barWidth = writer.contentWidth - labelWidth - valueWidth;
    const maxCount = Math.max(...items.map(item => item.count));
    let y = writer.y + 2;
    for (const item of items) {
        const label = labelFor(item);
        const color = hexToRgb(item.color);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setFontSize(7.2);
        pdf.setTextColor(...COLORS.text);
        pdf.text(label, writer.margin, y + 4.2, { maxWidth: labelWidth - 3 });
        pdf.setFillColor(...COLORS.grid);
        pdf.roundedRect(barX, y + 0.8, barWidth, 5, 1.5, 1.5, 'F');
        pdf.setFillColor(...color);
        pdf.roundedRect(barX, y + 0.8, Math.max(1.5, item.count / maxCount * barWidth), 5, 1.5, 1.5, 'F');
        pdf.setFont('DejaVuSans', 'bold');
        pdf.setTextColor(...COLORS.text);
        pdf.text(valueFor(item), writer.margin + writer.contentWidth, y + 4.2, { align: 'right' });
        y += 9;
    }
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setFontSize(6.8);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(totalLabel, writer.margin, y + 2);
    writer.y = y + 6;
}

function drawCalendarCell(pdf, x, y, width, height, day, formatDay, countLabel) {
    const classificationColor = day.classification ? hexToRgb(day.classification.color) : COLORS.border;
    const fill = day.classification ? tint(classificationColor, 0.88) : COLORS.surface;
    pdf.setFillColor(...fill);
    pdf.setDrawColor(...COLORS.border);
    pdf.roundedRect(x, y, width, height, 1.5, 1.5, 'FD');
    pdf.setFillColor(...classificationColor);
    pdf.roundedRect(x, y, 1.5, height, 0.8, 0.8, 'F');
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.text);
    pdf.text(formatDay(day.date), x + 3, y + 4.2);
    pdf.setFontSize(8.5);
    pdf.text(day.count ? `${Math.round(day.systolic)}/${Math.round(day.diastolic)}` : '-', x + 3, y + 9.3);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setFontSize(5.8);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(day.count ? countLabel(day.count) : '', x + 3, y + 13.1);
}

function calendarLegend(days, labelFor) {
    const found = new Map();
    for (const day of days) {
        if (day.classification && !found.has(day.classification.category)) {
            found.set(day.classification.category, { classification: day.classification, label: labelFor(day.classification) });
        }
    }
    return [...found.values()];
}

function drawSleepBands(pdf, x, y, width, height, sleepStart, wakeTime) {
    const startHour = clockHour(sleepStart);
    const wakeHour = clockHour(wakeTime);
    pdf.setFillColor(...COLORS.sleep);
    if (startHour >= wakeHour) {
        pdf.rect(x, y, wakeHour / 23 * width, height, 'F');
        pdf.rect(x + startHour / 23 * width, y, (23 - startHour) / 23 * width, height, 'F');
    } else {
        pdf.rect(x + startHour / 23 * width, y, (wakeHour - startHour) / 23 * width, height, 'F');
    }
}

function drawYAxis(pdf, x, y, width, height, minimum, maximum) {
    for (let index = 0; index <= 4; index += 1) {
        const ratio = index / 4;
        const lineY = y + height - ratio * height;
        const label = Math.round(minimum + ratio * (maximum - minimum));
        pdf.setDrawColor(...COLORS.grid);
        pdf.line(x, lineY, x + width, lineY);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(...COLORS.muted);
        pdf.text(String(label), x - 2, lineY + 1.8, { align: 'right' });
    }
}

function drawLegend(pdf, x, y, series) {
    let legendX = x;
    for (const entry of series) {
        pdf.setFillColor(...COLORS[entry.color]);
        pdf.rect(legendX, y - 1.4, 4, 1.4, 'F');
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(...COLORS.muted);
        pdf.text(entry.label, legendX + 5, y);
        legendX += pdf.getTextWidth(entry.label) + 13;
    }
}

function hexToRgb(hex) {
    const value = Number.parseInt(hex.slice(1), 16);
    return [value >> 16, (value >> 8) & 255, value & 255];
}

function tint(color, ratio) {
    return color.map(channel => Math.round(channel + (255 - channel) * ratio));
}

function clockHour(value) {
    const [hour, minute] = value.split(':').map(Number);
    return hour + minute / 60;
}
