import { t } from '../../i18n/i18n.js';
import { showAlert } from '../../ui/alerts.js';
import { addToTerminal } from '../../ui/terminal.js';
import { blockIfDeviceBusy, runDeviceOperation } from './operation.js';

export async function saveUserSettings(client, onDeviceInfoChanged, values = {}) {
    if (!client.isConnected()) return showAlert(t('hingmed.not-connected'), 'danger');
    if (blockIfDeviceBusy()) return;
    const username = String(values.username ?? '').trim();
    const userId = String(values.userId ?? '').trim();
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

export async function loadUserSettings(client, onDeviceInfoChanged) {
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
            }
            if (idResult.status === 'fulfilled') {
                changes.userId = idResult.value;
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
