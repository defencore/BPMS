import { createExportPayload, parseExportPayload } from '../core/data-schema.js';
import { datedFilename, downloadJSON, readJSONFile } from '../core/files.js';
import { mergeMeasurementSets } from '../core/merge-measurements.js';
import { formatDate, t } from '../i18n/i18n.js';
import { showAlert } from '../ui/alerts.js';

let result = emptyResult();

export function initDataProcessing() {
    const input = document.getElementById('merge-files');
    const processButton = document.getElementById('btn-process-files');
    const clearButton = document.getElementById('btn-clear-processing');
    input?.addEventListener('change', () => {
        const hasFiles = input.files.length > 0;
        processButton.disabled = !hasFiles;
        clearButton.disabled = !hasFiles;
    });
    processButton?.addEventListener('click', processFiles);
    clearButton?.addEventListener('click', clearProcessing);
    document.getElementById('btn-save-merged')?.addEventListener('click', saveMergedData);
}

async function processFiles() {
    const files = Array.from(document.getElementById('merge-files').files);
    if (!files.length) return showAlert(t('data-processing.select-files'), 'warning');
    result = emptyResult();

    try {
        const parsedFiles = await Promise.all(files.map(async file => ({
            file,
            payload: parseExportPayload(await readJSONFile(file))
        })));
        for (const { file, payload } of parsedFiles) {
            const dates = payload.measurements.map(item => new Date(item.datetime.replace(' ', 'T')));
            result.files.push({
                name: file.name,
                count: payload.measurements.length,
                deviceInfo: payload.deviceInfo,
                start: dates.length ? new Date(Math.min(...dates)) : null,
                end: dates.length ? new Date(Math.max(...dates)) : null
            });
            result.events.push(...payload.events);
        }
        const merged = mergeMeasurementSets(parsedFiles.map(({ file, payload }) => ({
            name: file.name,
            measurements: payload.measurements
        })));
        result.measurements = merged.measurements;
        result.duplicates = merged.duplicates;
        renderResult();
        showAlert(t('data-processing.processed', { count: files.length }), 'success');
    } catch (error) {
        console.error('Merge failed:', error);
        clearResultDisplay();
        showAlert(t('data-processing.failed', { message: error.message }), 'danger');
    }
}

function renderResult() {
    document.getElementById('processing-results').style.display = 'block';
    document.getElementById('processing-preview').style.display = 'block';
    document.getElementById('files-count').textContent = result.files.length;
    document.getElementById('total-measurements').textContent = result.measurements.length;
    document.getElementById('duplicates-removed').textContent = result.duplicates;
    document.getElementById('merge-warning').style.display = result.duplicates ? 'block' : 'none';
    document.getElementById('btn-save-merged').disabled = false;

    const fileList = document.getElementById('processed-files-list');
    fileList.replaceChildren(...result.files.map(file => {
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-start';
        const details = document.createElement('div');
        const title = document.createElement('h6');
        title.className = 'mb-1';
        title.textContent = file.name;
        const range = document.createElement('p');
        range.className = 'mb-1 text-muted';
        range.textContent = file.start ? `${formatDate(file.start)} – ${formatDate(file.end)}` : '—';
        details.append(title, range);
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary';
        badge.textContent = file.count;
        item.append(details, badge);
        return item;
    }));

    const preview = document.getElementById('preview-table');
    const items = result.measurements.length <= 20
        ? result.measurements
        : [...result.measurements.slice(0, 10), null, ...result.measurements.slice(-10)];
    preview.replaceChildren(...items.map(measurement => {
        const row = document.createElement('tr');
        if (!measurement) {
            const cell = document.createElement('td');
            cell.colSpan = 5;
            cell.className = 'text-center text-muted';
            cell.textContent = '…';
            row.append(cell);
            return row;
        }
        [measurement.datetime, measurement.systolic, measurement.diastolic, measurement.pulse, measurement.source]
            .forEach(value => {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.append(cell);
            });
        return row;
    }));
}

function saveMergedData() {
    if (!result.measurements.length) return showAlert(t('data-processing.no-data'), 'warning');
    const measurements = result.measurements.map(({ source, ...measurement }) => measurement);
    const device = result.files[0]?.deviceInfo ?? {};
    downloadJSON(
        createExportPayload({
            deviceInfo: { ...device, numRecords: measurements.length },
            measurements,
            events: result.events,
            sources: result.files.map(file => file.name)
        }),
        datedFilename('bpms_merged', 'json')
    );
    showAlert(t('data-processing.saved', { count: measurements.length }), 'success');
}

function clearProcessing() {
    result = emptyResult();
    document.getElementById('merge-files').value = '';
    document.getElementById('btn-process-files').disabled = true;
    document.getElementById('btn-clear-processing').disabled = true;
    document.getElementById('btn-save-merged').disabled = true;
    clearResultDisplay();
}

function clearResultDisplay() {
    document.getElementById('processing-results').style.display = 'none';
    document.getElementById('processing-preview').style.display = 'none';
}

function emptyResult() {
    return { measurements: [], events: [], files: [], duplicates: 0 };
}
