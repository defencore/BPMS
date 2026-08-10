import { t } from '../../i18n/i18n.js';
import { showAlert } from '../../ui/alerts.js';
import { addToTerminal } from '../../ui/terminal.js';
import { blockIfDeviceBusy, runDeviceOperation } from './operation.js';

export function initWifiSettings(client, onDeviceInfoChanged) {
    document.getElementById('btn-configure-wifi')?.addEventListener('click', () => configure(client, onDeviceInfoChanged));
    document.getElementById('btn-test-wifi')?.addEventListener('click', () => test(client, onDeviceInfoChanged));
    document.getElementById('btn-reset-wifi')?.addEventListener('click', () => reset(client));
}

async function configure(client, onDeviceInfoChanged) {
    if (!client.isConnected()) return showAlert(t('hingmed.not-connected'), 'danger');
    if (blockIfDeviceBusy()) return;
    const button = document.getElementById('btn-configure-wifi');
    if (button) button.disabled = true;
    await runDeviceOperation('wifi-configure', async () => {
        try {
            addToTerminal(t('hingmed.wifi-config-start'), 'system');
            await client.configureWifi(readWifiSettings());
            const macAddress = await optional(() => client.getMacAddress());
            if (macAddress) onDeviceInfoChanged({ macAddress });
            addToTerminal(t('hingmed.wifi-config-complete'), 'system');
            showAlert(t('hingmed.wifi-config-complete'), 'success');
        } catch (error) {
            addToTerminal(t('hingmed.operation-error', { message: error.message }), 'error');
            showAlert(t('hingmed.wifi-config-error'), 'danger');
        } finally {
            if (button) button.disabled = !client.isConnected();
        }
    });
}

async function test(client, onDeviceInfoChanged) {
    if (!client.isConnected()) return showAlert(t('hingmed.not-connected'), 'danger');
    if (blockIfDeviceBusy()) return;
    const button = document.getElementById('btn-test-wifi');
    if (button) button.disabled = true;
    await runDeviceOperation('wifi-test', async () => {
        try {
            const macAddress = await client.getMacAddress();
            const ip = await client.getIpConfiguration();
            const serialNumber = await optional(() => client.getDeviceCode());
            onDeviceInfoChanged({ macAddress, serialNumber });
            addToTerminal(t('hingmed.wifi-test-result', { mac: macAddress, ip: ip.ip }), 'system');
        } catch (error) {
            addToTerminal(t('hingmed.operation-error', { message: error.message }), 'error');
        } finally {
            if (button) button.disabled = !client.isConnected();
        }
    });
}

async function reset(client) {
    if (!client.isConnected()) return showAlert(t('hingmed.not-connected'), 'danger');
    if (blockIfDeviceBusy()) return;
    await runDeviceOperation('wifi-reset', async () => {
        try {
            await client.resetWifi();
            showAlert(t('hingmed.wifi-reset-complete'), 'success');
        } catch (error) {
            showAlert(t('hingmed.operation-error', { message: error.message }), 'danger');
        }
    });
}

function readWifiSettings() {
    const useDhcp = checked('wifi-use-dhcp');
    return {
        ssid: value('wifi-ssid'),
        password: value('wifi-password'),
        serverIp: value('wifi-server-ip'),
        serverPort: value('wifi-server-port'),
        connectionInterval: value('wifi-connection-interval'),
        sleepInterval: value('wifi-sleep-interval'),
        apSsid: value('wifi-ap-ssid'),
        blindMeasure: checked('wifi-blind-measure'),
        useDhcp,
        ip: useDhcp ? '' : value('wifi-static-ip'),
        subnet: useDhcp ? '' : value('wifi-subnet'),
        gateway: useDhcp ? '' : value('wifi-gateway'),
        dns: useDhcp ? '' : value('wifi-dns') || '1.1.1.1'
    };
}

function value(id) {
    return document.getElementById(id)?.value.trim() ?? '';
}

function checked(id) {
    return Boolean(document.getElementById(id)?.checked);
}

async function optional(action) {
    try {
        return await action();
    } catch {
        return null;
    }
}
