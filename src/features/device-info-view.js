import { state } from '../core/state.js';

export function renderDeviceInfo() {
    setText('device-username-inline', state.deviceInfo.username);
    setInputValue('session-patient-name', state.deviceInfo.username);
    setInputValue('session-user-id', state.deviceInfo.userId);
    setText('device-userid-inline', state.deviceInfo.userId);
    setText('device-records-inline', state.deviceInfo.numRecords || null);
    setText('loaded-records-inline', state.measurements.length);
    renderOptionalIdentifier('device-serial-inline', state.deviceInfo.serialNumber);
    renderOptionalIdentifier('device-mac-inline', state.deviceInfo.macAddress);

    const badge = document.querySelector('#btn-fetch-data .badge');
    if (badge) badge.textContent = String(state.deviceInfo.numRecords || '');
}

function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element && document.activeElement !== element) element.value = value ?? '';
}

export function setHingmedControlsEnabled(enabled) {
    for (const id of [
        'console-input',
        'btn-clear-device-memory',
        'btn-configure-device',
        'btn-configure-wifi',
        'btn-test-wifi',
        'btn-reset-wifi',
        'btn-session-save-device',
        'btn-session-read-device'
    ]) {
        const element = document.getElementById(id);
        if (element) element.disabled = !enabled;
    }
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value ?? '--';
}

function renderOptionalIdentifier(id, value) {
    const element = document.getElementById(id);
    if (!element) return;
    element.className = value ? 'fw-bold' : 'fw-bold text-info';
    if (value) element.textContent = value;
    else element.innerHTML = '<i class="fas fa-question-circle small"></i> --';
}
