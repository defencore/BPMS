import { resetApplicationState, state } from '../../core/state.js';
import { t } from '../../i18n/i18n.js';
import { showAlert } from '../../ui/alerts.js';
import { addToTerminal, clearTerminal } from '../../ui/terminal.js';
import { updateAnalytics } from '../analytics.js';
import {
    initCombinedChart,
    updateCombinedChart
} from '../charts/combined.js';
import { initHistograms, updateHistograms } from '../charts/histograms.js';
import { destroyCharts } from '../charts/lifecycle.js';
import { updateClinicalAlerts } from '../clinical-alerts.js';
import { renderDeviceInfo } from '../device-info-view.js';
import { updateEventCorrelationPanel } from '../event-correlation.js';
import { updateMeasurementHistory } from '../measurement-history.js';
import { exportResearchReport } from '../research-report.js';
import { renderClassificationSummary } from './classification-summary.js';
import { renderMeasurementStatistics } from './statistics.js';

export function initDashboard() {
    document.getElementById('btn-clear')?.addEventListener('click', clearDashboardData);
    document.getElementById('btn-export')?.addEventListener('click', exportResearchReport);
}

export function refreshDashboard() {
    renderDeviceInfo();
    updateMeasurementHistory();
    renderMeasurementStatistics();
    updateCombinedChart();
    updateHistograms();
    updateAnalytics();
    renderClassificationSummary();
    updateClinicalAlerts();
    updateEventCorrelationPanel();
}

export function clearDashboardData() {
    if ((state.measurements.length || state.events.length) && !globalThis.confirm(t('dashboard.clear-confirm'))) return;
    resetApplicationState();
    clearTerminal();
    destroyCharts();
    initCombinedChart();
    initHistograms();
    refreshDashboard();
    addToTerminal(t('dashboard.data-cleared'), 'system');
    showAlert(t('dashboard.all-data-cleared'), 'info');
}
