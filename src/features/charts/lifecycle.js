import { state } from '../../core/state.js';
import { t } from '../../i18n/i18n.js';
import { updateESCDistributionChart } from './esc-distribution.js';
import { applyClinicalThresholds } from './thresholds.js';

export function resetChartZoom() {
    state.charts.combined?.resetZoom();
}

export function destroyCharts() {
    Object.entries(state.charts).forEach(([name, chart]) => {
        chart?.destroy?.();
        state.charts[name] = null;
    });
}

export function refreshChartsLanguage() {
    const combined = state.charts.combined;
    if (combined) {
        const [systolic, diastolic, pulse] = combined.data.datasets;
        systolic.label = t('Systolic');
        diastolic.label = t('Diastolic');
        pulse.label = t('Pulse');
        combined.options.scales.y.title.text = t('Blood pressure (mmHg)');
        combined.options.scales.y1.title.text = t('Pulse (bpm)');

        applyClinicalThresholds(combined);
        combined.update('none');
    }

    const histogramDefinitions = [
        [state.charts.systolicHistogram, 'mmHg'],
        [state.charts.diastolicHistogram, 'mmHg'],
        [state.charts.pulseHistogram, 'bpm']
    ];
    histogramDefinitions.forEach(([chart, unit]) => {
        if (!chart) return;
        chart.data.datasets[0].label = t('Distribution (%)');
        chart.options.scales.y.title.text = t('Frequency (%)');
        chart.options.scales.x.title.text = t(unit);
        chart.update('none');
    });

    updateESCDistributionChart();
}
