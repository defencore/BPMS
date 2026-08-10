export function detectResearchPatterns(analysis, allMeasurements, settings) {
    if (!analysis || analysis.validMeasurements.length < settings.analysis.minimumPatternReadings) return [];
    const patterns = [];
    addDippingPattern(patterns, analysis.dipping);
    addMorningPattern(patterns, analysis.morningSurge, settings.patterns.morningSurge);
    addVariabilityPattern(patterns, analysis.summaries.full, settings.patterns.variabilityStdDev);
    addPulsePressurePattern(patterns, analysis.summaries.full, settings.patterns);
    addHeartRatePattern(patterns, analysis.validMeasurements, settings.patterns);
    addTrendPattern(patterns, allMeasurements, settings);
    return patterns;
}

function addDippingPattern(patterns, dipping) {
    if (!dipping) return;
    patterns.push({
        type: dipping.systolicCategory === 'dipper' ? 'good' : 'warning',
        icon: 'fa-moon',
        titleKey: `analytics.dipping.${dipping.systolicCategory}`,
        descriptionKey: 'analytics.pattern.dipping-session.description',
        params: { systolic: dipping.systolic.toFixed(1), diastolic: dipping.diastolic.toFixed(1) }
    });
}

function addMorningPattern(patterns, surge, threshold) {
    if (!surge?.available || surge.systolic <= threshold) return;
    patterns.push({
        type: 'warning',
        icon: 'fa-sun',
        titleKey: 'Morning blood pressure surge',
        descriptionKey: 'analytics.pattern.morning-surge.research-description',
        params: { value: surge.systolic.toFixed(1), threshold }
    });
}

function addVariabilityPattern(patterns, summary, threshold) {
    if (!summary?.systolic || summary.systolic.sd <= threshold) return;
    patterns.push({
        type: 'warning',
        icon: 'fa-wave-square',
        titleKey: 'High variability',
        descriptionKey: 'analytics.pattern.variability.research-description',
        params: { sd: summary.systolic.sd.toFixed(1), cv: summary.systolic.cv.toFixed(1), arv: summary.systolic.arv.toFixed(1) }
    });
}

function addPulsePressurePattern(patterns, summary, thresholds) {
    const mean = summary?.pulsePressure?.mean;
    if (mean === undefined || (mean >= thresholds.pulsePressureLow && mean <= thresholds.pulsePressureHigh)) return;
    patterns.push({
        type: 'warning',
        icon: 'fa-heart-pulse',
        titleKey: mean > thresholds.pulsePressureHigh ? 'High pulse pressure' : 'Low pulse pressure',
        descriptionKey: 'analytics.pattern.pulse-pressure.research-description',
        params: { value: mean.toFixed(1) }
    });
}

function addHeartRatePattern(patterns, measurements, thresholds) {
    const low = measurements.filter(item => item.pulse < thresholds.bradycardia).length;
    const high = measurements.filter(item => item.pulse > thresholds.tachycardia).length;
    const lowPercent = low / measurements.length * 100;
    const highPercent = high / measurements.length * 100;
    if (Math.max(lowPercent, highPercent) < thresholds.frequentHeartRatePercent) return;
    const elevated = highPercent >= lowPercent;
    patterns.push({
        type: 'warning',
        icon: 'fa-heartbeat',
        titleKey: elevated ? 'Frequent tachycardia' : 'Frequent bradycardia',
        descriptionKey: 'analytics.pattern.pulse-frequency.research-description',
        params: { value: Math.round(elevated ? highPercent : lowPercent) }
    });
}

function addTrendPattern(patterns, measurements, settings) {
    const ordered = [...measurements].sort((left, right) => left.datetime.localeCompare(right.datetime));
    const minimum = settings.analysis.minimumTrendReadingsPerSegment;
    if (ordered.length < minimum * 2) return;
    const midpoint = Math.floor(ordered.length / 2);
    const first = ordered.slice(0, midpoint);
    const second = ordered.slice(midpoint);
    const mean = values => values.reduce((sum, item) => sum + item.systolic, 0) / values.length;
    const change = mean(second) - mean(first);
    if (Math.abs(change) <= settings.patterns.trendChange) return;
    patterns.push({
        type: change > 0 ? 'warning' : 'good',
        icon: change > 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down',
        titleKey: change > 0 ? 'Upward trend' : 'Downward trend',
        descriptionKey: 'analytics.pattern.trend-groups.research-description',
        params: { value: Math.abs(change).toFixed(1), first: first.length, second: second.length }
    });
}
