const COLORS = Object.freeze({
    point: [37, 99, 235],
    line: [220, 38, 38],
    grid: [226, 232, 240],
    border: [203, 213, 225],
    text: [15, 23, 42],
    muted: [100, 116, 139],
    surface: [248, 250, 252]
});

export function drawCorrelationPlots(writer, correlations, labelFor, formatNumber) {
    const available = correlations.filter(item => item.available);
    for (let index = 0; index < available.length; index += 2) {
        writer.ensure(67);
        const y = writer.y;
        drawPlot(writer, available[index], writer.margin, y, labelFor, formatNumber);
        if (available[index + 1]) {
            drawPlot(writer, available[index + 1], writer.margin + 94, y, labelFor, formatNumber);
        }
        writer.y += 65;
    }
}

function drawPlot(writer, correlation, x, y, labelFor, formatNumber) {
    const pdf = writer.pdf;
    const cardWidth = 88;
    const plotX = x + 10;
    const plotY = y + 12;
    const plotWidth = 74;
    const plotHeight = 38;
    const bounds = dataBounds(correlation.points);

    pdf.setFillColor(...COLORS.surface);
    pdf.setDrawColor(...COLORS.border);
    pdf.roundedRect(x, y, cardWidth, 61, 2, 2, 'FD');
    pdf.setFont('DejaVuSans', 'bold');
    pdf.setFontSize(7.4);
    pdf.setTextColor(...COLORS.text);
    pdf.text(labelFor(correlation), x + 4, y + 5.5, { maxWidth: 53 });
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setFontSize(6.1);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(`n=${correlation.n}  r=${formatNumber(correlation.r)}  R²=${formatNumber(correlation.rSquared)}`, x + cardWidth - 4, y + 5.5, { align: 'right' });

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(...COLORS.grid);
    pdf.rect(plotX, plotY, plotWidth, plotHeight, 'FD');
    drawGrid(pdf, plotX, plotY, plotWidth, plotHeight, bounds, formatNumber);

    pdf.setFillColor(...COLORS.point);
    for (const point of correlation.points.slice(0, 250)) {
        const position = project(point, bounds, plotX, plotY, plotWidth, plotHeight);
        pdf.circle(position.x, position.y, 0.55, 'F');
    }
    const startY = correlation.slope * bounds.xMin + correlation.intercept;
    const endY = correlation.slope * bounds.xMax + correlation.intercept;
    const start = project({ x: bounds.xMin, y: startY }, bounds, plotX, plotY, plotWidth, plotHeight);
    const end = project({ x: bounds.xMax, y: endY }, bounds, plotX, plotY, plotWidth, plotHeight);
    pdf.setDrawColor(...COLORS.line);
    pdf.setLineWidth(0.45);
    pdf.line(start.x, clamp(start.y, plotY, plotY + plotHeight), end.x, clamp(end.y, plotY, plotY + plotHeight));

    pdf.setFont('DejaVuSans', 'normal');
    pdf.setFontSize(5.8);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(labelFor(correlation, 'x'), plotX + plotWidth / 2, y + 57.5, { align: 'center' });
    pdf.text(labelFor(correlation, 'y'), x + 3, plotY + plotHeight / 2, { angle: 90, align: 'center' });
}

function drawGrid(pdf, x, y, width, height, bounds, formatNumber) {
    for (let index = 0; index <= 2; index += 1) {
        const ratio = index / 2;
        const gridX = x + ratio * width;
        const gridY = y + height - ratio * height;
        pdf.setDrawColor(...COLORS.grid);
        pdf.line(gridX, y, gridX, y + height);
        pdf.line(x, gridY, x + width, gridY);
        pdf.setFont('DejaVuSans', 'normal');
        pdf.setFontSize(5.3);
        pdf.setTextColor(...COLORS.muted);
        pdf.text(formatNumber(bounds.xMin + ratio * (bounds.xMax - bounds.xMin), 0), gridX, y + height + 3, { align: 'center' });
        pdf.text(formatNumber(bounds.yMin + ratio * (bounds.yMax - bounds.yMin), 0), x - 1, gridY + 1.5, { align: 'right' });
    }
}

function dataBounds(points) {
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    return padded(Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys));
}

function padded(xMin, xMax, yMin, yMax) {
    const xPadding = Math.max(2, (xMax - xMin) * 0.08);
    const yPadding = Math.max(2, (yMax - yMin) * 0.08);
    return { xMin: xMin - xPadding, xMax: xMax + xPadding, yMin: yMin - yPadding, yMax: yMax + yPadding };
}

function project(point, bounds, x, y, width, height) {
    return {
        x: x + (point.x - bounds.xMin) / (bounds.xMax - bounds.xMin) * width,
        y: y + height - (point.y - bounds.yMin) / (bounds.yMax - bounds.yMin) * height
    };
}

function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}

