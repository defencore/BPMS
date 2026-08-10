import { isConnectorOperationBusy, runConnectorOperation } from '../../connectors/operation-state.js';
import { t } from '../../i18n/i18n.js';
import { showAlert } from '../../ui/alerts.js';

export function blockIfDeviceBusy() {
    if (!isConnectorOperationBusy()) return false;
    showAlert(t('connector.busy'), 'warning');
    return true;
}

export function runDeviceOperation(name, action) {
    return runConnectorOperation(`hingmed-${name}`, action);
}
