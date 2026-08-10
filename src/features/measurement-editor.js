import { MANUAL_BODY_POSITIONS, bodyPositionLabelKey } from '../core/body-positions.js';
import { classifyBloodPressure, classifyPulse } from '../core/blood-pressure.js';
import { getActiveConnector } from '../connectors/controller.js';
import { manualConnector } from '../connectors/manual.js';
import { replaceMeasurementEvents } from '../core/event-store.js';
import { eventsForMeasurement, measurementAnchorKey } from '../core/measurement-context.js';
import { updateStoredMeasurement } from '../core/measurement-store.js';
import { getMeasurementAt, state } from '../core/state.js';
import { t } from '../i18n/i18n.js';
import { showAlert } from '../ui/alerts.js';
import {
    bindMeasurementContext,
    createMeasurementContextDrafts,
    renderMeasurementContext
} from './measurement-context-editor.js';

let refreshDashboard = () => {};
let editingIndex = null;
let editingAnchorKey = null;
let contextDrafts = [];
let optionalDetailsExpanded = null;

// Template-generated DOM contract: measurement-datetime, measurement-systolic,
// measurement-diastolic, and measurement-pulse are declared through inputField().

export function initMeasurementEditor(onDataChanged) {
    refreshDashboard = onDataChanged;
    renderMeasurementEditor();
    window.addEventListener('bpms:connectorchange', renderMeasurementEditor);
    window.addEventListener('bpms:languagechange', renderMeasurementEditor);
    window.addEventListener('bpms:editmeasurement', startEditing);
    window.addEventListener('bpms:measurementdeleted', handleDeletedMeasurement);
}

function renderMeasurementEditor() {
    const container = document.getElementById('measurement-editor');
    if (!container) return;
    const draft = readDraft(container);
    const isEditing = editingIndex !== null;
    const canAdd = getActiveConnector().capabilities.manualEntry;
    const showOptionalDetails = optionalDetailsExpanded ?? (isEditing
        || Boolean(draft?.comment)
        || contextDrafts.length > 0
        || !globalThis.matchMedia?.('(max-width: 767.98px)').matches);
    container.hidden = !isEditing && !canAdd;
    if (container.hidden) {
        container.replaceChildren();
        return;
    }

    container.dataset.i18nSkip = '';
    container.innerHTML = `
        <section class="manual-entry-card history-entry-editor mb-4">
            <div class="manual-entry-header">
                <div>
                    <div class="manual-entry-kicker"><i class="fas ${isEditing ? 'fa-clock-rotate-left' : 'fa-keyboard'} me-2"></i>${t(isEditing ? 'measurement-editor.kicker' : 'manual-entry.kicker')}</div>
                    <h5 class="mb-1">${t(isEditing ? 'measurement-editor.title' : 'manual-entry.title')}</h5>
                    <p class="mb-0">${t(isEditing ? 'measurement-editor.description' : 'manual-entry.description')}</p>
                </div>
                <span class="connector-ready-badge"><i class="fas ${isEditing ? 'fa-pen' : 'fa-circle-check'} me-1"></i>${t(isEditing ? 'manual-entry.editing' : 'manual-entry.ready')}</span>
            </div>
            <div class="manual-entry-body">
                <form id="measurement-editor-form">
                    <div class="manual-entry-grid">
                        ${inputField({ id: 'measurement-datetime', type: 'datetime-local', labelKey: 'settings.manual.datetime', className: 'manual-datetime-field' })}
                        ${inputField({ id: 'measurement-systolic', type: 'number', labelKey: 'settings.manual.systolic', min: 20, max: 300, prefix: 'SYS', className: 'manual-vital-field', enterKeyHint: 'next' })}
                        ${inputField({ id: 'measurement-diastolic', type: 'number', labelKey: 'settings.manual.diastolic', min: 20, max: 200, prefix: 'DIA', className: 'manual-vital-field', enterKeyHint: 'next' })}
                        ${inputField({ id: 'measurement-pulse', type: 'number', labelKey: 'settings.manual.pulse', min: 20, max: 250, prefix: 'BPM', className: 'manual-vital-field', enterKeyHint: 'done' })}
                        <div class="manual-position-field">
                            <label for="measurement-position" class="form-label">${t('settings.manual.position')}</label>
                            <select id="measurement-position" class="form-select" required>
                                ${MANUAL_BODY_POSITIONS.map(value => `<option value="${value}">${t(bodyPositionLabelKey(value))}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="manual-optional-details">
                        <button class="manual-optional-toggle" type="button" aria-expanded="${showOptionalDetails}" aria-controls="manual-optional-panel">
                            <span class="manual-optional-copy"><strong><i class="fas fa-comment-medical me-2" aria-hidden="true"></i>${t('manual-entry.optional-title')}</strong><small>${t('manual-entry.optional-help')}</small></span>
                            <i class="fas fa-chevron-down manual-optional-chevron" aria-hidden="true"></i>
                        </button>
                        <div id="manual-optional-panel" class="manual-optional-content" ${showOptionalDetails ? '' : 'hidden'}>
                            <div class="manual-comment-field">
                                <label for="measurement-comment" class="form-label">${t('manual-entry.comment')}</label>
                                <textarea id="measurement-comment" class="form-control" rows="2" maxlength="500" placeholder="${t('manual-entry.comment-placeholder')}"></textarea>
                                <div class="form-text">${t('manual-entry.comment-help')}</div>
                            </div>
                            ${renderMeasurementContext(contextDrafts)}
                        </div>
                    </div>
                    <div class="manual-entry-footer mt-4">
                        <div id="measurement-reading-preview" class="manual-reading-preview" aria-live="polite"></div>
                        <div class="manual-entry-actions">
                            ${isEditing ? `<button id="btn-cancel-measurement-edit" class="btn btn-outline-secondary btn-lg" type="button">${t('manual-entry.cancel')}</button>` : ''}
                            <button class="btn btn-primary btn-lg" type="submit">
                                <i class="fas ${isEditing ? 'fa-save' : 'fa-plus-circle'} me-2"></i>${t(isEditing ? 'manual-entry.save-changes' : 'settings.manual.add')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </section>`;
    writeDraft(container, draft);
    setDefaultDateTime();
    bindEditor(container);
    updatePreview();
}

function bindEditor(container) {
    const form = container.querySelector('#measurement-editor-form');
    form?.addEventListener('submit', submitMeasurement);
    form?.querySelectorAll('input, select').forEach(control => control.addEventListener('input', updatePreview));
    container.querySelector('.manual-optional-toggle')?.addEventListener('click', toggleOptionalDetails);
    bindMeasurementContext(container, contextDrafts, renderMeasurementEditor);
    container.querySelector('#btn-cancel-measurement-edit')?.addEventListener('click', cancelEditing);
}

function submitMeasurement(event) {
    event.preventDefault();
    try {
        const measurement = editingIndex === null
            ? manualConnector.addMeasurement(readFormValues())
            : updateStoredMeasurement(editingIndex, readFormValues());
        replaceMeasurementEvents(editingAnchorKey, measurement, contextDrafts);
        const message = editingIndex === null ? 'settings.manual.added' : 'measurement-editor.updated';
        editingIndex = null;
        editingAnchorKey = null;
        contextDrafts = [];
        optionalDetailsExpanded = null;
        refreshDashboard();
        resetAndRenderEditor();
        showAlert(t(message), 'success');
    } catch (error) {
        showAlert(t('settings.invalid', { message: error.message }), 'danger');
    }
}

function updatePreview() {
    const preview = document.getElementById('measurement-reading-preview');
    if (!preview) return;
    const values = readFormValues();
    if (!values.systolic || !values.diastolic || !values.pulse) {
        preview.innerHTML = `<i class="fas fa-circle-info me-2"></i>${t('manual-entry.preview-empty')}`;
        preview.className = 'manual-reading-preview';
        return;
    }
    const pressure = classifyBloodPressure(Number(values.systolic), Number(values.diastolic));
    const pulse = classifyPulse(Number(values.pulse));
    preview.innerHTML = `<strong>${t(pressure.textKey)}</strong><span>${t(pulse.textKey)}</span><span>${t(bodyPositionLabelKey(values.bodyPosition))}</span>`;
    preview.className = `manual-reading-preview ${pressure.cssClass}`;
}

function readFormValues() {
    return {
        datetime: document.getElementById('measurement-datetime')?.value ?? '',
        systolic: document.getElementById('measurement-systolic')?.value ?? '',
        diastolic: document.getElementById('measurement-diastolic')?.value ?? '',
        pulse: document.getElementById('measurement-pulse')?.value ?? '',
        bodyPosition: document.getElementById('measurement-position')?.value ?? 'unknown',
        comment: document.getElementById('measurement-comment')?.value ?? ''
    };
}

function readDraft(container) {
    return container.querySelector('#measurement-editor-form') ? readFormValues() : null;
}

function writeDraft(container, draft) {
    if (!draft) return;
    const values = {
        'measurement-datetime': draft.datetime?.replace(' ', 'T'),
        'measurement-systolic': draft.systolic,
        'measurement-diastolic': draft.diastolic,
        'measurement-pulse': draft.pulse,
        'measurement-position': draft.bodyPosition,
        'measurement-comment': draft.comment ?? ''
    };
    for (const [id, value] of Object.entries(values)) {
        const control = container.querySelector(`#${id}`);
        if (control) control.value = value;
    }
}

function startEditing(event) {
    editingIndex = event.detail.index;
    const measurement = getMeasurementAt(editingIndex);
    editingAnchorKey = measurementAnchorKey(measurement);
    contextDrafts = createMeasurementContextDrafts(eventsForMeasurement(state.events, measurement));
    optionalDetailsExpanded = true;
    renderWithDraft(measurement);
}

function renderWithDraft(draft) {
    const container = document.getElementById('measurement-editor');
    if (!container) return;
    container.replaceChildren();
    renderMeasurementEditor();
    writeDraft(container, draft);
    updatePreview();
    document.getElementById('measurement-systolic')?.focus();
}

function cancelEditing() {
    editingIndex = null;
    editingAnchorKey = null;
    contextDrafts = [];
    optionalDetailsExpanded = null;
    resetAndRenderEditor();
}

function toggleOptionalDetails(event) {
    const panel = document.getElementById('manual-optional-panel');
    if (!panel) return;
    optionalDetailsExpanded = panel.hidden;
    panel.hidden = !optionalDetailsExpanded;
    event.currentTarget.setAttribute('aria-expanded', String(optionalDetailsExpanded));
}

function resetAndRenderEditor() {
    document.getElementById('measurement-editor')?.replaceChildren();
    renderMeasurementEditor();
}

function handleDeletedMeasurement(event) {
    if (editingIndex === event.detail.index) cancelEditing();
    else if (editingIndex !== null && event.detail.index < editingIndex) editingIndex -= 1;
}

function setDefaultDateTime() {
    const input = document.getElementById('measurement-datetime');
    if (!input || input.value) return;
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    input.value = now.toISOString().slice(0, 16);
}

function inputField({ id, type, labelKey, min = '', max = '', prefix = '', className = '', enterKeyHint = '' }) {
    const numeric = type === 'number';
    return `<div class="${className}"><label for="${id}" class="form-label">${t(labelKey)}</label><div class="input-group">${prefix ? `<span class="input-group-text">${prefix}</span>` : ''}<input id="${id}" class="form-control" type="${type}" ${numeric ? 'inputmode="numeric" step="1" autocomplete="off"' : ''} ${enterKeyHint ? `enterkeyhint="${enterKeyHint}"` : ''} ${min !== '' ? `min="${min}"` : ''} ${max !== '' ? `max="${max}"` : ''} required></div></div>`;
}
