import { createExportPayload, parseExportPayload } from '../core/data-schema.js';
import { datedFilename, downloadJSON, readJSONFile } from '../core/files.js';
import { replaceEvents, replaceMeasurements, state, updateDeviceInfo } from '../core/state.js';
import { t } from '../i18n/i18n.js';
import { showAlert } from '../ui/alerts.js';
import { addToTerminal } from '../ui/terminal.js';

let refreshDashboard = () => {};

export function initDataTransfer(onDataChanged) {
    refreshDashboard = onDataChanged;
    document.getElementById('btn-export-data')?.addEventListener('click', exportMeasurements);
    document.getElementById('import-file')?.addEventListener('change', importFromInput);
}

export function exportMeasurements() {
    if (!state.measurements.length) {
        showAlert(t('data-transfer.no-data'), 'warning');
        return;
    }
    downloadJSON(
        createExportPayload({ deviceInfo: state.deviceInfo, measurements: state.measurements, events: state.events }),
        datedFilename('bpms_data', 'json')
    );
    addToTerminal(t('data-transfer.export-terminal', { count: state.measurements.length }), 'system');
    showAlert(t('data-transfer.exported'), 'success');
}

export async function importFromInput(event) {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) return;
    try {
        const result = parseExportPayload(await readJSONFile(file));
        replaceMeasurements(result.measurements);
        replaceEvents(result.events);
        updateDeviceInfo({ ...result.deviceInfo, numRecords: result.measurements.length });
        refreshDashboard();
        addToTerminal(t('data-transfer.import-terminal', { count: result.measurements.length }), 'system');
        showAlert(t('data-transfer.imported', { count: result.measurements.length }), 'success');
    } catch (error) {
        console.error('Import failed:', error);
        showAlert(t('data-transfer.import-failed', { message: error.message }), 'danger');
    }
}
