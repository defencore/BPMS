import { t } from '../../i18n/i18n.js';
import { showAlert } from '../../ui/alerts.js';
import { addToTerminal } from '../../ui/terminal.js';
import { blockIfDeviceBusy, runDeviceOperation } from './operation.js';

export function initUserSettings(client, onDeviceInfoChanged) {
    document.getElementById('btn-set-user-info')?.addEventListener('click', () => save(client, onDeviceInfoChanged));
    document.getElementById('btn-get-user-info')?.addEventListener('click', () => load(client, onDeviceInfoChanged));
    document.getElementById('btn-enter-menu')?.addEventListener('click', showMenuInstructions);
}

async function save(client, onDeviceInfoChanged) {
    if (!client.isConnected()) return showAlert(t('hingmed.not-connected'), 'danger');
    if (blockIfDeviceBusy()) return;
    const username = value('user-name-input');
    const userId = value('user-id-input');
    if (!username && !userId) return showAlert(t('hingmed.user-value-required'), 'warning');
    await runDeviceOperation('user-save', async () => {
        try {
            const changes = {};
            if (username) changes.username = await client.setUserName(username);
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
        try {
            const username = await client.getUserName();
            const userId = await client.getUserId();
            if (username) document.getElementById('user-name-input').value = username;
            if (userId) document.getElementById('user-id-input').value = userId;
            onDeviceInfoChanged({ username, userId });
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
