import { state } from '../../core/state.js';
import { t } from '../../i18n/i18n.js';

export function createHistogramData(values, binSize, min, max) {
    const bins = [];
    const binCounts = [];

    for (let i = min; i <= max; i += binSize) {
        bins.push(`${i}-${i + binSize - 1}`);
        const count = values.filter(v => v >= i && v < i + binSize).length;
        binCounts.push(count);
    }

    const total = values.length;
    const percentages = binCounts.map(count => total > 0 ? (count / total * 100) : 0);

    return { bins, percentages };
}

export function initHistograms() {
    // Check if canvas elements exist
    const systolicCanvas = document.getElementById('systolic-histogram');
    const diastolicCanvas = document.getElementById('diastolic-histogram');
    const pulseCanvas = document.getElementById('pulse-histogram');

    if (!systolicCanvas || !diastolicCanvas || !pulseCanvas) {
        console.error('One or more histogram canvas elements not found');
        return;
    }

    // Destroy existing histograms if they exist
    if (state.charts.systolicHistogram) {
        state.charts.systolicHistogram.destroy();
        state.charts.systolicHistogram = null;
    }
    if (state.charts.diastolicHistogram) {
        state.charts.diastolicHistogram.destroy();
        state.charts.diastolicHistogram = null;
    }
    if (state.charts.pulseHistogram) {
        state.charts.pulseHistogram.destroy();
        state.charts.pulseHistogram = null;
    }

    const systolicCtx = systolicCanvas.getContext('2d');
    state.charts.systolicHistogram = new Chart(systolicCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: t('Distribution (%)'),
                data: [],
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderColor: '#ef4444',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 60,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    title: {
                        display: true,
                        text: t('Frequency (%)')
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: t('mmHg')
                    }
                }
            }
        }
    });

    const diastolicCtx = diastolicCanvas.getContext('2d');
    state.charts.diastolicHistogram = new Chart(diastolicCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: t('Distribution (%)'),
                data: [],
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: '#3b82f6',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 60,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    title: {
                        display: true,
                        text: t('Frequency (%)')
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: t('mmHg')
                    }
                }
            }
        }
    });

    const pulseCtx = pulseCanvas.getContext('2d');
    state.charts.pulseHistogram = new Chart(pulseCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: t('Distribution (%)'),
                data: [],
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: '#10b981',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 80,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    title: {
                        display: true,
                        text: t('Frequency (%)')
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: t('bpm')
                    }
                }
            }
        }
    });
}

export function updateHistograms() {
    if (!state.charts.systolicHistogram || !state.charts.diastolicHistogram || !state.charts.pulseHistogram) {
        initHistograms();
    }

    if (state.measurements.length === 0) {
        state.charts.systolicHistogram.data.labels = [];
        state.charts.systolicHistogram.data.datasets[0].data = [];
        state.charts.diastolicHistogram.data.labels = [];
        state.charts.diastolicHistogram.data.datasets[0].data = [];
        state.charts.pulseHistogram.data.labels = [];
        state.charts.pulseHistogram.data.datasets[0].data = [];

        state.charts.systolicHistogram.update();
        state.charts.diastolicHistogram.update();
        state.charts.pulseHistogram.update();
        return;
    }

    const validMeasurements = state.measurements.filter(m => m.systolic > 0 && m.diastolic > 0);

    if (validMeasurements.length === 0) {
        return;
    }

    const systolicValues = validMeasurements.map(m => m.systolic);
    const diastolicValues = validMeasurements.map(m => m.diastolic);
    const pulseValues = validMeasurements.filter(m => m.pulse > 0).map(m => m.pulse);

    const systolicData = createHistogramData(systolicValues, 10, 100, 180);
    state.charts.systolicHistogram.data.labels = systolicData.bins;
    state.charts.systolicHistogram.data.datasets[0].data = systolicData.percentages;
    state.charts.systolicHistogram.update();

    const diastolicData = createHistogramData(diastolicValues, 10, 50, 90);
    state.charts.diastolicHistogram.data.labels = diastolicData.bins;
    state.charts.diastolicHistogram.data.datasets[0].data = diastolicData.percentages;
    state.charts.diastolicHistogram.update();

    if (pulseValues.length > 0) {
        const pulseData = createHistogramData(pulseValues, 10, 50, 110);
        state.charts.pulseHistogram.data.labels = pulseData.bins;
        state.charts.pulseHistogram.data.datasets[0].data = pulseData.percentages;
        state.charts.pulseHistogram.update();
    }
}
