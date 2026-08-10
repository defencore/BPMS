import { t } from '../../i18n/i18n.js';
import { addToTerminal } from '../../ui/terminal.js';
import { blockIfDeviceBusy, runDeviceOperation } from './operation.js';

export function initCommandTerminal(client) {
    document.getElementById('console-input')?.addEventListener('keydown', async event => {
        if (event.key !== 'Enter' || !event.target.value.trim()) return;
        if (blockIfDeviceBusy()) return;
        const command = event.target.value.trim();
        event.target.value = '';
        await runDeviceOperation('terminal', async () => {
            try {
                await client.customCommand(command);
            } catch (error) {
                addToTerminal(t('hingmed.operation-error', { message: error.message }), 'error');
            }
        });
    });
}
