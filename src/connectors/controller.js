import { updateSettings, getSettings } from '../core/settings-store.js';
import { t } from '../i18n/i18n.js';
import { showAlert } from '../ui/alerts.js';
import { addToTerminal } from '../ui/terminal.js';
import { connectorRegistry, getConnector } from './registry.js';
import {
    isConnectorOperationBusy,
    onConnectorOperationChange,
    runConnectorOperation
} from './operation-state.js';

let activeConnector;
let connected = false;
let refreshDashboard = () => {};

export function initConnectorController(onDataChanged) {
    refreshDashboard = onDataChanged;
    activeConnector = getConnector(getSettings().connector.active);
    document.getElementById('btn-connect')?.addEventListener('click', connectActive);
    document.getElementById('btn-disconnect')?.addEventListener('click', disconnectActive);
    document.getElementById('btn-fetch-data')?.addEventListener('click', fetchActive);
    document.getElementById('btn-publish-data')?.addEventListener('click', publishActive);
    window.addEventListener('bpms:languagechange', renderConnectorState);
    onConnectorOperationChange(renderConnectorState);
    renderConnectorState();
}

export async function selectConnector(id) {
    if (isConnectorOperationBusy()) return showBusyMessage();
    if (connected) await disconnectActive();
    activeConnector = getConnector(id);
    updateSettings({ connector: { active: id } });
    renderConnectorState();
    window.dispatchEvent(new CustomEvent('bpms:connectorchange', { detail: { id } }));
}

export function getActiveConnector() {
    return activeConnector ?? getConnector(getSettings().connector.active);
}

export function listConnectors() {
    return connectorRegistry;
}

async function connectActive() {
    if (isConnectorOperationBusy()) return showBusyMessage();
    const connector = getActiveConnector();
    if (!connector.isSupported()) {
        showAlert(t('connector.unsupported'), 'danger');
        return;
    }
    await runConnectorOperation('connect', async () => {
        try {
            connected = Boolean(await connector.connect());
            if (connected && connector.id !== 'hingmed') showAlert(t('connector.connected', { name: t(connector.labelKey) }), 'success');
        } catch (error) {
            connected = false;
            console.error('Connector connection failed:', error);
            showAlert(t('connector.connection-error', { message: error.message }), 'danger');
        }
    });
}

async function disconnectActive() {
    if (isConnectorOperationBusy()) return showBusyMessage();
    const connector = getActiveConnector();
    await runConnectorOperation('disconnect', async () => {
        try {
            await connector.disconnect();
            connected = false;
            if (connector.id !== 'hingmed') showAlert(t('connector.disconnected', { name: t(connector.labelKey) }), 'info');
        } catch (error) {
            showAlert(t('connector.connection-error', { message: error.message }), 'danger');
        }
    });
}

async function fetchActive() {
    if (isConnectorOperationBusy()) return showBusyMessage();
    await runConnectorOperation('fetch', async () => {
        try {
            const count = await getActiveConnector().fetchMeasurements();
            if (getActiveConnector().id === 'remote') {
                refreshDashboard();
                addToTerminal(t('connector.remote.loaded', { count }), 'system');
                showAlert(t('connector.remote.loaded', { count }), 'success');
            }
        } catch (error) {
            console.error('Connector fetch failed:', error);
            showAlert(t('connector.fetch-error', { message: error.message }), 'danger');
        }
    });
}

async function publishActive() {
    if (isConnectorOperationBusy()) return showBusyMessage();
    const connector = getActiveConnector();
    await runConnectorOperation('publish', async () => {
        try {
            const counts = await connector.publishMeasurements();
            const message = t('connector.remote.published', counts);
            addToTerminal(message, 'system');
            showAlert(message, 'success');
        } catch (error) {
            console.error('Connector publish failed:', error);
            showAlert(t('connector.publish-error', { message: error.message }), 'danger');
        }
    });
}

function renderConnectorState() {
    const connector = getActiveConnector();
    const connectButton = document.getElementById('btn-connect');
    const disconnectButton = document.getElementById('btn-disconnect');
    const fetchButton = document.getElementById('btn-fetch-data');
    const publishButton = document.getElementById('btn-publish-data');
    const publishLabel = document.getElementById('publish-data-label');
    const status = document.getElementById('device-status-nav');
    const source = document.getElementById('active-connector-label');
    const transportActions = document.getElementById('connector-transport-actions');
    const manualReady = document.getElementById('manual-connector-ready');
    const isManual = connector.id === 'manual';
    const isBusy = isConnectorOperationBusy();

    if (connectButton) connectButton.disabled = isBusy || connected || !connector.isSupported();
    if (disconnectButton) disconnectButton.disabled = isBusy || !connected;
    if (fetchButton) fetchButton.disabled = isBusy || !connected || !connector.capabilities.fetch;
    if (publishButton) {
        publishButton.disabled = isBusy || !connected || !connector.capabilities.publish;
        publishButton.classList.toggle('d-none', !connector.capabilities.publish);
    }
    if (publishLabel) publishLabel.textContent = t('connector.remote.publish-action');
    if (source) source.textContent = t(connector.labelKey);
    if (transportActions) transportActions.hidden = isManual;
    if (manualReady) {
        manualReady.dataset.i18nSkip = '';
        manualReady.hidden = !isManual;
        manualReady.innerHTML = isManual
            ? `<i class="fas fa-circle-check me-2"></i><strong>${t('manual-entry.ready')}</strong><span>${t('manual-entry.ready-help')}</span>`
            : '';
    }
    document.querySelectorAll('[data-connector-capability]').forEach(element => {
        const isAvailable = connector.capabilities[element.dataset.connectorCapability] === true;
        element.hidden = !isAvailable;
        element.classList.toggle('d-none', !isAvailable);
        element.toggleAttribute('inert', !isAvailable);
    });
    if (status) {
        status.className = `status-badge ${connected ? 'status-connected' : 'status-disconnected'}`;
        status.innerHTML = `<i class="fas fa-circle"></i> ${t(connected ? 'Connected' : 'Disconnected')}`;
    }
}

function showBusyMessage() {
    showAlert(t('connector.busy'), 'warning');
    return false;
}
