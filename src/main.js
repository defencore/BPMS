import { initI18n, t } from './i18n/i18n.js';
import { initConnectorController } from './connectors/controller.js';
import { initAnalytics, refreshAnalyticsLanguage, updateAnalytics } from './features/analytics.js';
import {
    initCombinedChart,
    updateCombinedChart
} from './features/charts/combined.js';
import { initHistograms } from './features/charts/histograms.js';
import { refreshChartsLanguage, resetChartZoom } from './features/charts/lifecycle.js';
import { initDataProcessing } from './features/data-processing.js';
import { initDataTransfer } from './features/data-transfer.js';
import { initDashboard, refreshDashboard } from './features/dashboard/index.js';
import { initHingmedControls } from './features/hingmed/controller.js';
import { initSettings } from './features/settings.js';
import { initMeasurementEditor } from './features/measurement-editor.js';
import { initMeasurementHistory } from './features/measurement-history.js';
import { initUsagePolicy } from './features/usage-policy.js';
import { initUserGuide } from './features/user-guide.js';
import { initResponsiveLayout } from './ui/responsive-layout.js';
import { loadLocalDataset } from './core/local-dataset.js';
import { hydrateApplicationState } from './core/state.js';
import { showAlert } from './ui/alerts.js';

export function initialize() {
    initI18n();
    window.addEventListener('bpms:storageerror', event => showStorageError(event.detail.message));
    hydrateApplicationState(loadLocalDataset());
    initUsagePolicy();
    initUserGuide();
    initResponsiveLayout();
    initDashboard();
    initHingmedControls(refreshDashboard);
    initConnectorController(refreshDashboard);
    initSettings(refreshDashboard);
    initMeasurementEditor(refreshDashboard);
    initMeasurementHistory(refreshDashboard);
    initDataTransfer(refreshDashboard);
    initDataProcessing();
    initAnalytics();
    initCombinedChart();
    initHistograms();
    initStaticControls();
    updateAsleepTime();
    updateCombinedChart('last24');
}

function showStorageError(message) {
    showAlert(t('storage.dataset-error', { message }), 'warning');
}

function initStaticControls() {
    document.querySelectorAll('[data-chart-view]').forEach(button => {
        button.addEventListener('click', () => setChartView(button.dataset.chartView));
    });
    document.getElementById('btn-reset-chart')?.addEventListener('click', resetChartZoom);
    ['awake-begin-hour', 'awake-begin-min', 'awake-end-hour', 'awake-end-min'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', updateAsleepTime);
    });
    document.getElementById('wifi-use-dhcp')?.addEventListener('change', event => {
        document.getElementById('static-ip-config').style.display = event.target.checked ? 'none' : 'block';
    });
    document.querySelectorAll('[data-bs-toggle="collapse"]').forEach(header => {
        const target = document.querySelector(header.dataset.bsTarget);
        const chevron = header.querySelector('.fa-chevron-down');
        target?.addEventListener('show.bs.collapse', () => { if (chevron) chevron.style.transform = 'rotate(180deg)'; });
        target?.addEventListener('hide.bs.collapse', () => { if (chevron) chevron.style.transform = 'rotate(0deg)'; });
    });
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(element => new bootstrap.Tooltip(element));
    window.addEventListener('bpms:languagechange', () => {
        refreshChartsLanguage();
        refreshAnalyticsLanguage();
        refreshDashboard();
        updateAnalytics();
    });
}

function updateAsleepTime() {
    const value = id => document.getElementById(id)?.value ?? '00';
    document.getElementById('asleep-begin-display').textContent = `${value('awake-end-hour')}:${value('awake-end-min')}`;
    document.getElementById('asleep-end-display').textContent = `${value('awake-begin-hour')}:${value('awake-begin-min')}`;
}

function setChartView(view) {
    document.querySelectorAll('[data-chart-view]').forEach(button => button.classList.toggle('active', button.dataset.chartView === view));
    updateCombinedChart(view);
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();
}
