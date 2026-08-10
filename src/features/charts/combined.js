import { getSettings } from '../../core/settings-store.js';
import { state } from '../../core/state.js';
import { t } from '../../i18n/i18n.js';
import { calculateCombinedChartBounds, formatCombinedXAxisLabel, selectCombinedChartMeasurements } from './combined-data.js';
import { applyClinicalThresholds } from './thresholds.js';

// Chart initialization and update functions

export function initCombinedChart() {
    const canvas = document.getElementById('combined-chart');
    if (!canvas) {
        console.error('Canvas element "combined-chart" not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    const settings = getSettings();
    const zones = settings.esc2024.riskZones;
    const patterns = settings.patterns;

    // Destroy existing chart if it exists
    if (state.charts.combined) {
        state.charts.combined.destroy();
        state.charts.combined = null;
    }

    state.charts.combined = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: t('Systolic'),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    data: [],
                    tension: 0.4,
                    fill: false,
                    borderWidth: 3,
                    yAxisID: 'y'
                },
                {
                    label: t('Diastolic'),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    data: [],
                    tension: 0.4,
                    fill: false,
                    borderWidth: 3,
                    yAxisID: 'y'
                },
                {
                    label: t('Pulse'),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    data: [],
                    tension: 0.4,
                    fill: false,
                    borderWidth: 3,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        callback: function(value, index) {
                            const label = this.getLabelForValue(value);
                            return formatCombinedXAxisLabel(label);
                        }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: false,
                    min: 40,
                    max: 200,
                    grid: {
                        color: 'rgba(239, 68, 68, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return `${value} ${t('mmHg')}`;
                        }
                    },
                    title: {
                        display: true,
                        text: t('Blood pressure (mmHg)'),
                        color: '#ef4444'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: false,
                    min: 40,
                    max: 120,
                    grid: {
                        drawOnChartArea: false,
                        color: 'rgba(16, 185, 129, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return `${value} ${t('bpm')}`;
                        }
                    },
                    title: {
                        display: true,
                        text: t('Pulse (bpm)'),
                        color: '#10b981'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1e293b',
                    bodyColor: '#1e293b',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.dataset.yAxisID === 'y1') {
                                    label += `${context.parsed.y} ${t('bpm')}`;
                                } else {
                                    label += `${context.parsed.y} ${t('mmHg')}`;
                                }
                            }
                            return label;
                        }
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x',
                        modifierKey: null
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                            speed: 0.02
                        },
                        pinch: {
                            enabled: true
                        },
                        drag: {
                            enabled: false
                        },
                        mode: 'x',
                    },
                    limits: {
                        x: {min: 'original', max: 'original'},
                        y: {min: 'original', max: 'original'}
                    }
                },
                annotation: {
                    annotations: {
                        normalSystolic: {
                            type: 'line',
                            yMin: zones.optimalSystolic,
                            yMax: zones.optimalSystolic,
                            scaleID: 'y',
                            borderColor: 'rgba(245, 158, 11, 0.5)',
                            borderWidth: 1,
                            borderDash: [10, 5],
                            label: {
                                enabled: true,
                                content: t('chart.normal-systolic', { value: zones.optimalSystolic }),
                                position: 'start',
                                backgroundColor: 'rgba(245, 158, 11, 0.8)',
                                font: {
                                    size: 10
                                }
                            }
                        },
                        normalDiastolic: {
                            type: 'line',
                            yMin: zones.optimalDiastolic,
                            yMax: zones.optimalDiastolic,
                            scaleID: 'y',
                            borderColor: 'rgba(59, 130, 246, 0.5)',
                            borderWidth: 1,
                            borderDash: [10, 5],
                            label: {
                                enabled: true,
                                content: t('chart.normal-diastolic', { value: zones.optimalDiastolic }),
                                position: 'start',
                                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                                font: {
                                    size: 10
                                }
                            }
                        },
                        normalPulseHigh: {
                            type: 'line',
                            yMin: patterns.tachycardia,
                            yMax: patterns.tachycardia,
                            scaleID: 'y1',
                            borderColor: 'rgba(16, 185, 129, 0.5)',
                            borderWidth: 1,
                            borderDash: [10, 5],
                            label: {
                                enabled: true,
                                content: t('chart.normal-pulse', { value: patterns.tachycardia }),
                                position: 'end',
                                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                                font: {
                                    size: 10
                                }
                            }
                        },
                        normalPulseLow: {
                            type: 'line',
                            yMin: patterns.bradycardia,
                            yMax: patterns.bradycardia,
                            scaleID: 'y1',
                            borderColor: 'rgba(16, 185, 129, 0.5)',
                            borderWidth: 1,
                            borderDash: [10, 5],
                            label: {
                                enabled: true,
                                content: t('chart.normal-pulse', { value: patterns.bradycardia }),
                                position: 'end',
                                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                                font: {
                                    size: 10
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}

export function updateCombinedChart(viewMode = 'last24') {
    if (!state.charts.combined) {
        initCombinedChart();
    }
    applyClinicalThresholds(state.charts.combined);

    const chartData = selectCombinedChartMeasurements(state.measurements, viewMode);
    const labels = chartData.map(m => m.datetime);
    const systolicData = chartData.map(m => m.systolic);
    const diastolicData = chartData.map(m => m.diastolic);
    const pulseData = chartData.map(m => m.pulse || 0);

    state.charts.combined.data.labels = labels;
    state.charts.combined.data.datasets[0].data = systolicData;
    state.charts.combined.data.datasets[1].data = diastolicData;
    state.charts.combined.data.datasets[2].data = pulseData;

    const bounds = calculateCombinedChartBounds(chartData);
    if (bounds) {
        state.charts.combined.options.scales.y.min = bounds.pressure.min;
        state.charts.combined.options.scales.y.max = bounds.pressure.max;
        state.charts.combined.options.scales.y1.min = bounds.pulse.min;
        state.charts.combined.options.scales.y1.max = bounds.pulse.max;
    }

    state.charts.combined.update();
}
