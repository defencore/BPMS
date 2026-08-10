const MOBILE_CHART_QUERY = '(max-width: 767.98px)';

export function isCompactChartViewport() {
    return globalThis.matchMedia?.(MOBILE_CHART_QUERY).matches ?? false;
}

export function responsiveLegend(position = 'top') {
    const compact = isCompactChartViewport();
    return {
        position: compact ? 'bottom' : position,
        labels: {
            boxHeight: compact ? 9 : 12,
            boxWidth: compact ? 9 : 12,
            font: { size: compact ? 10 : 12 },
            padding: compact ? 8 : 20,
            usePointStyle: true
        }
    };
}

export function responsiveTicks(callback, { maxTicks = 6 } = {}) {
    const compact = isCompactChartViewport();
    return {
        autoSkip: true,
        callback,
        font: { size: compact ? 9 : 12 },
        maxRotation: compact ? 0 : 50,
        maxTicksLimit: compact ? maxTicks : undefined
    };
}

export function responsiveAxisTitle(text, color) {
    return {
        color,
        display: !isCompactChartViewport(),
        text
    };
}

export function responsiveTooltip(callbacks = {}) {
    const compact = isCompactChartViewport();
    return {
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        bodyColor: '#1e293b',
        bodyFont: { size: compact ? 10 : 12 },
        borderColor: '#e2e8f0',
        borderWidth: 1,
        callbacks,
        displayColors: true,
        padding: compact ? 8 : 12,
        titleColor: '#1e293b',
        titleFont: { size: compact ? 10 : 12 }
    };
}

export function compactDatasetStyle() {
    const compact = isCompactChartViewport();
    return {
        borderWidth: compact ? 2 : 3,
        pointHoverRadius: compact ? 4 : 5,
        pointRadius: compact ? 2 : 3
    };
}
