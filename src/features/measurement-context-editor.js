import { getSettings } from '../core/settings-store.js';
import { formatEventOffset } from '../core/measurement-context.js';
import { t } from '../i18n/i18n.js';
import { showAlert } from '../ui/alerts.js';
import { escapeHtml } from '../ui/html.js';

export function createMeasurementContextDrafts(events) {
    return events.map(event => ({
        presetId: event.presetId,
        type: event.type,
        label: event.label,
        name: event.name,
        dose: event.dose,
        offsetMinutes: event.offsetMinutes,
        durationMinutes: event.durationMinutes,
        intensity: event.intensity,
        analysisWindowMinutes: event.analysisWindowMinutes,
        note: event.note
    }));
}

export function renderMeasurementContext(drafts) {
    const presets = getSettings().eventPresets;
    const options = presets
        .map(preset => `<option value="${escapeHtml(preset.id)}">${escapeHtml(presetLabel(preset))}</option>`)
        .join('');
    return `
        <section class="measurement-context-editor">
            <div class="measurement-context-heading">
                <div><h6><i class="fas fa-tags me-2"></i>${t('measurement-context.title')}</h6><p>${t('measurement-context.description')}</p></div>
                <span>${drafts.length}</span>
            </div>
            ${presets.length ? `
                <div class="measurement-context-controls">
                    <div class="measurement-context-preset-field"><label class="form-label" for="measurement-context-preset">${t('measurement-context.preset')}</label><select id="measurement-context-preset" class="form-select">${options}</select></div>
                    <div><label class="form-label" for="measurement-context-offset">${t('measurement-context.offset')}</label><input id="measurement-context-offset" class="form-control" type="number" min="-1440" max="1440" step="5" value="${presets[0].defaultOffsetMinutes}"></div>
                    <div class="measurement-context-note-field"><label class="form-label" for="measurement-context-note">${t('measurement-context.note')}</label><input id="measurement-context-note" class="form-control" type="text" maxlength="500" placeholder="${t('measurement-context.note-placeholder')}"></div>
                    <button id="btn-add-measurement-context" class="btn btn-outline-primary" type="button"><i class="fas fa-plus me-2"></i>${t('measurement-context.add')}</button>
                </div>
                <p class="measurement-context-offset-help">${t('measurement-context.offset-help')}</p>`
                : `<div class="measurement-context-empty">${t('measurement-context.no-presets')}</div>`}
            <div class="measurement-context-drafts">${renderDrafts(drafts)}</div>
        </section>`;
}

export function bindMeasurementContext(container, drafts, onChanged) {
    container.querySelector('#measurement-context-preset')?.addEventListener('change', applyPresetOffset);
    container.querySelector('#btn-add-measurement-context')?.addEventListener('click', () => addDraft(drafts, onChanged));
    container.querySelectorAll('[data-remove-context-draft]').forEach(button => {
        button.addEventListener('click', event => removeDraft(event, drafts, onChanged));
    });
}

function renderDrafts(drafts) {
    if (!drafts.length) return `<p class="measurement-context-empty mb-0">${t('measurement-context.empty')}</p>`;
    return drafts.map((draft, index) => `
        <article class="measurement-context-draft">
            <span class="measurement-context-time">${formatEventOffset(draft.offsetMinutes)}</span>
            <span class="measurement-context-icon"><i class="fas ${contextIcon(draft.type)}"></i></span>
            <div><strong>${escapeHtml(draftLabel(draft))}</strong>${draft.note ? `<small>${escapeHtml(draft.note)}</small>` : ''}</div>
            <button class="btn btn-sm btn-outline-danger" type="button" data-remove-context-draft="${index}" aria-label="${t('measurement-context.remove')}"><i class="fas fa-xmark"></i></button>
        </article>`).join('');
}

function applyPresetOffset(event) {
    const preset = getSettings().eventPresets.find(item => item.id === event.target.value);
    if (preset) document.getElementById('measurement-context-offset').value = preset.defaultOffsetMinutes;
}

function addDraft(drafts, onChanged) {
    try {
        const presetId = document.getElementById('measurement-context-preset').value;
        const preset = getSettings().eventPresets.find(item => item.id === presetId);
        if (!preset) throw new TypeError(t('measurement-context.invalid-preset'));
        const offsetMinutes = Number(document.getElementById('measurement-context-offset').value);
        if (!Number.isInteger(offsetMinutes) || offsetMinutes < -1440 || offsetMinutes > 1440) {
            throw new RangeError(t('measurement-context.invalid-offset'));
        }
        drafts.push({
            presetId: preset.id,
            type: preset.type,
            label: preset.label,
            name: preset.name,
            dose: preset.dose,
            offsetMinutes,
            durationMinutes: preset.durationMinutes,
            intensity: null,
            analysisWindowMinutes: preset.analysisWindowMinutes,
            note: document.getElementById('measurement-context-note').value
        });
        onChanged();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function removeDraft(event, drafts, onChanged) {
    drafts.splice(Number(event.currentTarget.dataset.removeContextDraft), 1);
    onChanged();
}

function presetLabel(preset) {
    const base = preset.label || t(`event.type.${preset.type}`);
    return [base, preset.name, preset.dose].filter(Boolean).join(' · ');
}

function draftLabel(draft) {
    const preset = getSettings().eventPresets.find(item => item.id === draft.presetId);
    const base = draft.label || preset?.label || t(`event.type.${draft.type}`);
    return [base, draft.name, draft.dose].filter(Boolean).join(' · ');
}

function contextIcon(type) {
    return ({
        medication: 'fa-pills',
        procedure: 'fa-stethoscope',
        activity: 'fa-person-walking',
        exercise: 'fa-person-running',
        coffee: 'fa-mug-hot',
        meal: 'fa-utensils',
        stress: 'fa-bolt',
        symptom: 'fa-notes-medical'
    })[type] ?? 'fa-tag';
}
