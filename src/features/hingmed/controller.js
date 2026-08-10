import { replaceMeasurements, state, updateDeviceInfo as persistDeviceInfo } from '../../core/state.js';
import { createHingmedClient } from '../../infrastructure/hingmed/client.js';
import {
    isConnectorOperationBusy,
    onConnectorOperationChange,
    runConnectorOperation
} from '../../connectors/operation-state.js';
import { formatDate, t } from '../../i18n/i18n.js';
import { showAlert } from '../../ui/alerts.js';
import { addToTerminal } from '../../ui/terminal.js';
import { setHingmedControlsEnabled } from '../device-info-view.js';
import { initCommandTerminal } from './terminal-controller.js';
import { initDeviceSettings, readDeviceConfiguration } from './device-settings.js';
import { initUserSettings } from './user-settings.js';
import { initWifiSettings } from './wifi-settings.js';

const client = createHingmedClient({ logger: addToTerminal });
let refreshDashboard = () => {};
let lastClockSentAt = null;

export function initHingmedControls(onDataChanged) {
    refreshDashboard = onDataChanged;
    initCommandTerminal(client);
    initDeviceSettings(client, updateDeviceInfo);
    initWifiSettings(client, updateDeviceInfo);
    initUserSettings(client, updateDeviceInfo);
    document.getElementById('btn-clear-device-memory')?.addEventListener('click', clearHingmedDeviceMemory);
    window.addEventListener('bpms:languagechange', renderClockSyncStatus);
    onConnectorOperationChange(() => setHingmedControlsEnabled(client.isConnected() && !isConnectorOperationBusy()));
    setHingmedControlsEnabled(false);
    renderClockSyncStatus();
    addToTerminal(t('hingmed.ready'), 'system');
}

export function isHingmedSupported() {
    return client.isSupported() && globalThis.isSecureContext;
}

export async function connectHingmed() {
    if (!isHingmedSupported()) throw new Error(t('hingmed.unsupported'));
    try {
        await client.connect();
        const id = await client.handshake();
        lastClockSentAt = await client.syncClock();
        persistDeviceInfo({ id });
        await hydrateDeviceInfo();
        setHingmedControlsEnabled(true);
        addToTerminal(t('hingmed.connected'), 'system');
        addToTerminal(t('hingmed.clock-sync-sent', { time: formatClock(lastClockSentAt) }), 'system');
        renderClockSyncStatus();
        refreshDashboard();
        showAlert(t('hingmed.connected-clock-synced'), 'success');
        return true;
    } catch (error) {
        await client.disconnect().catch(() => {});
        setHingmedControlsEnabled(false);
        throw error;
    }
}

async function clearHingmedDeviceMemory() {
    if (!client.isConnected()) return showAlert(t('hingmed.not-connected'), 'danger');
    if (isConnectorOperationBusy()) return showAlert(t('connector.busy'), 'warning');
    if (!globalThis.confirm(t('hingmed.clear-memory-confirm', { count: state.deviceInfo.numRecords ?? 0 }))) return;
    const button = document.getElementById('btn-clear-device-memory');
    if (button) button.disabled = true;
    await runConnectorOperation('hingmed-clear', async () => {
        try {
            addToTerminal(t('hingmed.clear-memory-start'), 'system');
            const result = await client.clearDeviceMemory(readDeviceConfiguration());
            if (result.recordCount !== null) persistDeviceInfo({ numRecords: result.recordCount });
            refreshDashboard();
            const resultKey = result.recordCount === 0
                ? 'hingmed.clear-memory-verified'
                : result.recordCount === null ? 'hingmed.clear-memory-unverified' : 'hingmed.clear-memory-not-empty';
            const message = t(resultKey, { count: result.recordCount ?? '-' });
            addToTerminal(message, result.recordCount === 0 ? 'system' : 'warning');
            showAlert(message, result.recordCount === 0 ? 'success' : 'warning');
        } catch (error) {
            addToTerminal(t('hingmed.operation-error', { message: error.message }), 'error');
            showAlert(t('hingmed.clear-memory-error', { message: error.message }), 'danger');
        } finally {
            if (button) button.disabled = !client.isConnected();
        }
    });
}

export async function disconnectHingmed() {
    await client.disconnect();
    persistDeviceInfo({ username: state.deviceInfo.username }, true);
    setHingmedControlsEnabled(false);
    refreshDashboard();
    addToTerminal(t('hingmed.disconnected'), 'system');
    return true;
}

export async function fetchHingmedMeasurements() {
    if (!client.isConnected()) throw new Error(t('hingmed.not-connected'));
    const loading = document.getElementById('history-loading');
    const progress = document.getElementById('progress-info');
    if (loading) loading.style.display = 'block';

    try {
        const id = await client.handshake();
        const count = await client.getRecordCount();
        persistDeviceInfo({ id, numRecords: count });
        const measurements = [];
        for (let index = 0; index < count; index += 1) {
            if (progress) progress.textContent = t('hingmed.loading-record', { current: index + 1, total: count });
            const measurement = await optional(() => client.getRecord(index));
            if (measurement) measurements.push(measurement);
        }
        replaceMeasurements(measurements);
        refreshDashboard();
        const message = t('hingmed.loaded', { count: measurements.length, total: count });
        addToTerminal(message, 'system');
        showAlert(message, 'success');
        return measurements.length;
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

async function hydrateDeviceInfo() {
    const userId = await optional(() => client.getUserId());
    if (userId !== null) {
        const input = document.getElementById('user-id-input');
        if (input) input.value = userId;
    }
    persistDeviceInfo({
        userId,
        numRecords: await optional(() => client.getRecordCount()) ?? 0,
        serialNumber: await optional(() => client.getDeviceCode()),
        macAddress: await optional(() => client.getMacAddress())
    });
}

function renderClockSyncStatus() {
    const status = document.getElementById('hingmed-clock-status');
    if (!status) return;
    status.dataset.i18nSkip = '';
    status.textContent = lastClockSentAt
        ? t('hingmed.clock-sync-status', { time: formatClock(lastClockSentAt) })
        : t('hingmed.clock-sync-pending');
}

function formatClock(value) {
    return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });
}

function updateDeviceInfo(changes) {
    persistDeviceInfo(Object.fromEntries(Object.entries(changes).filter(([, value]) => value != null)));
    refreshDashboard();
}

async function optional(action) {
    try {
        return await action();
    } catch (error) {
        addToTerminal(t('hingmed.optional-command-failed', { message: error.message }), 'warning');
        return null;
    }
}
