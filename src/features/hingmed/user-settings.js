import { t } from '../../i18n/i18n.js';
import { normalizePatientName } from '../../core/session-metadata.js';
import { showAlert } from '../../ui/alerts.js';
import { addToTerminal } from '../../ui/terminal.js';
import { blockIfDeviceBusy, runDeviceOperation } from './operation.js';

export function initUserSettings(client, onDeviceInfoChanged) {
    document.getElementById('btn-save-patient-name')?.addEventListener('click', () => savePatientName(onDeviceInfoChanged));
    document.getElementById('btn-set-user-info')?.addEventListener('click', () => save(client, onDeviceInfoChanged));
    document.getElementById('btn-get-user-info')?.addEventListener('click', () => load(client, onDeviceInfoChanged));
    document.getElementById('btn-enter-menu')?.addEventListener('click', showMenuInstructions);
}

function savePatientName(onDeviceInfoChanged) {
    const username = normalizePatientName(value('patient-name-input'));
    onDeviceInfoChanged({ username, usernameSource: username ? 'local' : null });
    showAlert(t('hingmed.patient-name-saved'), 'success');
}

async function save(client, onDeviceInfoChanged) {
    if (!client.isConnected()) return showAlert(t('hingmed.not-connected'), 'danger');
    if (blockIfDeviceBusy()) return;
    const username = value('patient-name-input');
    const userId = value('user-id-input');
    if (!username && !userId) return showAlert(t('hingmed.user-value-required'), 'warning');
    await runDeviceOperation('user-save', async () => {
        try {
            const changes = {};
            if (username) {
                changes.username = await client.setUserName(username);
                changes.usernameSource = 'device';
            }
            if (userId) changes.userId = await client.setUserId(userId);
            onDeviceInfoChanged(changes);
            showAlert(t('hingmed.user-saved'), 'success');
        } catch (error) {
            showAlert(t('hingmed.operation-error', { message: error.message }), 'danger');
        }
    });
}

async function load(client, onDeviceInfoChanged) {
    if (!client.isConnected()) return showAlert(t('hingmed.not-connected'), 'danger');
    if (blockIfDeviceBusy()) return;
    await runDeviceOperation('user-load', async () => {
        const [nameResult, idResult] = await Promise.allSettled([
            client.getUserName(),
            client.getUserId()
        ]);
        try {
            if (nameResult.status === 'rejected' && idResult.status === 'rejected') {
                throw nameResult.reason;
            }
            const changes = {};
            if (nameResult.status === 'fulfilled') {
                changes.username = nameResult.value;
                changes.usernameSource = nameResult.value ? 'device' : null;
                document.getElementById('patient-name-input').value = nameResult.value ?? '';
            }
            if (idResult.status === 'fulfilled') {
                changes.userId = idResult.value;
                document.getElementById('user-id-input').value = idResult.value ?? '';
            }
            onDeviceInfoChanged(changes);
            for (const result of [nameResult, idResult]) {
                if (result.status === 'rejected') addToTerminal(result.reason.message, 'warning');
            }
            showAlert(t('hingmed.user-loaded'), 'success');
        } catch (error) {
            showAlert(t('hingmed.operation-error', { message: error.message }), 'danger');
        }
    });
}

function showMenuInstructions(event) {
    const help = document.getElementById('hingmed-menu-help');
    if (!help) return;
    help.classList.remove('d-none');
    event.currentTarget.setAttribute('aria-expanded', 'true');
    addToTerminal(t('hingmed.menu-manual-help'), 'info');
}

function value(id) {
    return document.getElementById(id)?.value.trim() ?? '';
}
