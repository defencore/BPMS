import { createDefaultSettings, clearLocalApplicationData, getSettings, updateSettings } from '../core/settings-store.js';
import { getActiveConnector, listConnectors, selectConnector } from '../connectors/controller.js';
import { t } from '../i18n/i18n.js';
import { showAlert } from '../ui/alerts.js';
import { renderSettingsView } from './settings-view.js';
import { activateTabTarget, getActiveTabTarget } from '../ui/tab-state.js';
import { openUsagePolicy } from './usage-policy.js';

let refreshDashboard = () => {};

export function initSettings(onDataChanged) {
    refreshDashboard = onDataChanged;
    render();
    window.addEventListener('bpms:languagechange', render);
}

function render() {
    const container = document.getElementById('application-settings');
    if (!container) return;
    const activeSettingsTab = getActiveTabTarget('.settings-nav', '#settings-connectors');
    renderSettingsView(container, listConnectors(), activeSettingsTab, getSettings());
    bindEvents(container);
    populateSettings(container);
    renderConnectorPanel();
}

function bindEvents(container) {
    container.querySelector('#connector-select')?.addEventListener('change', async event => {
        await selectConnector(event.target.value);
        renderConnectorPanel();
    });
    container.querySelector('#esc-settings-form')?.addEventListener('submit', event => saveForm(event, 'esc2024'));
    container.querySelector('#pattern-settings-form')?.addEventListener('submit', event => saveForm(event, 'patterns'));
    container.querySelector('#event-presets-form')?.addEventListener('submit', saveEventPresets);
    container.querySelector('#btn-add-event-preset')?.addEventListener('click', addEventPreset);
    container.querySelectorAll('[data-delete-event-preset]').forEach(button => button.addEventListener('click', deleteEventPreset));
    container.querySelector('#remote-settings-form')?.addEventListener('submit', event => saveForm(event, 'remote'));
    container.querySelector('#btn-open-manual-entry')?.addEventListener('click', () => activateTabTarget('#monitoring'));
    container.querySelectorAll('[data-reset-settings]').forEach(button => button.addEventListener('click', resetSection));
    container.querySelector('#btn-clear-local-data')?.addEventListener('click', clearLocalData);
    container.querySelector('#btn-open-usage-policy')?.addEventListener('click', () => openUsagePolicy());
}

function populateSettings(container) {
    const settings = getSettings();
    container.querySelector('#connector-select').value = settings.connector.active;
    container.querySelectorAll('[data-setting]').forEach(input => {
        if (input.type === 'checkbox') input.checked = Boolean(getPath(settings, input.dataset.setting));
        else input.value = getPath(settings, input.dataset.setting) ?? '';
    });
}

function saveForm(event, section) {
    event.preventDefault();
    try {
        const patch = {};
        event.currentTarget.querySelectorAll('[data-setting]').forEach(input => {
            const value = input.type === 'checkbox'
                ? input.checked
                : input.type === 'number' && input.value !== '' ? Number(input.value) : input.value;
            setPath(patch, input.dataset.setting, value);
        });
        updateSettings(patch);
        refreshDashboard();
        showAlert(t('settings.saved'), 'success');
    } catch (error) {
        showAlert(t('settings.invalid', { message: error.message }), 'danger');
    }
}

function resetSection(event) {
    const section = event.currentTarget.dataset.resetSettings;
    const defaults = createDefaultSettings();
    const patch = section === 'esc'
        ? { esc2024: defaults.esc2024, referenceProfiles: defaults.referenceProfiles, monitoring: defaults.monitoring }
        : section === 'context'
            ? { eventPresets: defaults.eventPresets }
            : { patterns: defaults.patterns, analysis: defaults.analysis };
    updateSettings(patch);
    if (section === 'context') render();
    else populateSettings(document.getElementById('application-settings'));
    refreshDashboard();
    showAlert(t('settings.defaults-restored'), 'info');
}

function saveEventPresets(event) {
    event.preventDefault();
    try {
        const eventPresets = [...event.currentTarget.querySelectorAll('[data-event-preset-id]')].map(card => {
            const value = field => card.querySelector(`[data-preset-field="${field}"]`)?.value ?? '';
            return {
                id: card.dataset.eventPresetId,
                type: value('type'),
                label: value('label'),
                name: value('name'),
                dose: value('dose'),
                defaultOffsetMinutes: Number(value('defaultOffsetMinutes')),
                durationMinutes: Number(value('durationMinutes')),
                analysisWindowMinutes: Number(value('analysisWindowMinutes'))
            };
        });
        updateSettings({ eventPresets });
        render();
        refreshDashboard();
        showAlert(t('settings.saved'), 'success');
    } catch (error) {
        showAlert(t('settings.invalid', { message: error.message }), 'danger');
    }
}

function addEventPreset() {
    const settings = getSettings();
    updateSettings({
        eventPresets: [...settings.eventPresets, {
            id: crypto.randomUUID(),
            type: 'other',
            label: '',
            name: '',
            dose: '',
            defaultOffsetMinutes: 0,
            durationMinutes: 0,
            analysisWindowMinutes: 120
        }]
    });
    render();
}

function deleteEventPreset(event) {
    const id = event.currentTarget.dataset.deleteEventPreset;
    updateSettings({ eventPresets: getSettings().eventPresets.filter(preset => preset.id !== id) });
    render();
}

function renderConnectorPanel() {
    const active = getActiveConnector();
    document.querySelectorAll('[data-connector-panel]').forEach(panel => { panel.hidden = panel.dataset.connectorPanel !== active.id; });
    const description = document.getElementById('connector-description');
    if (description) description.textContent = t(active.descriptionKey);
}

function clearLocalData() {
    if (!window.confirm(t('settings.storage.confirm'))) return;
    clearLocalApplicationData();
    window.location.reload();
}

function getPath(source, path) {
    return path.split('.').reduce((value, key) => value?.[key], source);
}

function setPath(target, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const parent = keys.reduce((object, key) => (object[key] ??= {}), target);
    parent[last] = value;
}
