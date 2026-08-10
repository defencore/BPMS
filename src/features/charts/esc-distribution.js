import { classifyBloodPressure } from '../../core/blood-pressure.js';
import { state } from '../../core/state.js';
import { t } from '../../i18n/i18n.js';

export function updateESCDistributionChart() {
    const canvas = document.getElementById('esc-distribution-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart if it exists before creating a new one
    if (state.charts.escDistribution && !state.charts.escDistribution.data) {
        state.charts.escDistribution.destroy();
        state.charts.escDistribution = null;
    }

    if (!state.charts.escDistribution) {
        state.charts.escDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    if (state.measurements.length === 0) {
        if (state.charts.escDistribution.data) {
            state.charts.escDistribution.data.labels = [];
            state.charts.escDistribution.data.datasets[0].data = [];
            state.charts.escDistribution.data.datasets[0].backgroundColor = [];
            state.charts.escDistribution.update();
        }
        return;
    }

    const classifications = {};
    state.measurements.forEach(m => {
        const bp = classifyBloodPressure(m.systolic, m.diastolic);
        if (!classifications[bp.category]) {
            classifications[bp.category] = {
                count: 0,
                data: bp
            };
        }
        classifications[bp.category].count++;
    });

    const labels = [];
    const data = [];
    const backgroundColors = [];

    const sortedCategories = Object.entries(classifications)
        .sort((a, b) => b[1].count - a[1].count);

    sortedCategories.forEach(([category, {count, data: bpData}]) => {
        labels.push(t(bpData.textKey));
        data.push(count);
        backgroundColors.push(bpData.color);
    });

    state.charts.escDistribution.data.labels = labels;
    state.charts.escDistribution.data.datasets[0].data = data;
    state.charts.escDistribution.data.datasets[0].backgroundColor = backgroundColors;
    state.charts.escDistribution.update();
}
