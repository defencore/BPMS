import { t } from '../i18n/i18n.js';
import { CLINICAL_SOURCES } from '../core/clinical-sources.js';
import { EVENT_TYPES } from '../core/event-schema.js';
import { escapeHtml } from '../ui/html.js';
import { renderSessionSettingsPanel } from './session-settings-view.js';

const escFields = [
    ['crisisSystolic', 'settings.esc.crisis-systolic'],
    ['crisisDiastolic', 'settings.esc.crisis-diastolic'],
    ['hypertensionSystolic', 'settings.esc.hypertension-systolic'],
    ['hypertensionDiastolic', 'settings.esc.hypertension-diastolic'],
    ['elevatedSystolic', 'settings.esc.elevated-systolic'],
    ['elevatedDiastolic', 'settings.esc.elevated-diastolic'],
    ['hypotensionSystolic', 'settings.esc.hypotension-systolic'],
    ['hypotensionDiastolic', 'settings.esc.hypotension-diastolic']
];

const zoneFields = [
    ['optimalSystolic', 'settings.risk.optimal-systolic'],
    ['optimalDiastolic', 'settings.risk.optimal-diastolic'],
    ['normalSystolic', 'settings.risk.normal-systolic'],
    ['normalDiastolic', 'settings.risk.normal-diastolic'],
    ['elevatedSystolic', 'settings.risk.elevated-systolic'],
    ['elevatedDiastolic', 'settings.risk.elevated-diastolic']
];

const abpmThresholdFields = [
    ['full.systolic', 'settings.reference.abpm24-full-systolic'],
    ['full.diastolic', 'settings.reference.abpm24-full-diastolic'],
    ['day.systolic', 'settings.reference.abpm24-day-systolic'],
    ['day.diastolic', 'settings.reference.abpm24-day-diastolic'],
    ['night.systolic', 'settings.reference.abpm24-night-systolic'],
    ['night.diastolic', 'settings.reference.abpm24-night-diastolic']
];

const monitoringFields = [
    ['dayIntervalMinutes', 'settings.monitoring.day-interval'],
    ['nightIntervalMinutes', 'settings.monitoring.night-interval'],
    ['minimumValidPercent', 'settings.monitoring.minimum-valid'],
    ['minimumTotalReadings', 'settings.monitoring.minimum-total'],
    ['minimumNightReadings', 'settings.monitoring.minimum-night'],
    ['morningWindowMinutes', 'settings.monitoring.morning-window'],
    ['preWakeWindowMinutes', 'settings.monitoring.pre-wake-window']
];

const patternFields = [
    ['morningSurge', 'settings.pattern.morning-surge'],
    ['normalDippingMin', 'settings.pattern.dipping-min'],
    ['normalDippingMax', 'settings.pattern.dipping-max'],
    ['trendChange', 'settings.pattern.trend'],
    ['variabilityStdDev', 'settings.pattern.variability'],
    ['pulsePressureHigh', 'settings.pattern.pulse-pressure-high'],
    ['pulsePressureLow', 'settings.pattern.pulse-pressure-low'],
    ['bradycardia', 'settings.pattern.bradycardia'],
    ['tachycardia', 'settings.pattern.tachycardia'],
    ['frequentHeartRatePercent', 'settings.pattern.frequent-heart-rate'],
    ['elevatedHeartRate', 'settings.pattern.elevated-heart-rate']
];

const analysisFields = [
    ['minimumPatternReadings', 'settings.analysis.minimum-pattern-readings'],
    ['minimumTrendReadingsPerSegment', 'settings.analysis.minimum-trend-segment'],
    ['alertWindow', 'settings.analysis.alert-window'],
    ['highReadingsForAlert', 'settings.analysis.high-readings']
];

const analysisFlags = [
    ['ignoreMovementReadings', 'settings.analysis.ignore-movement'],
    ['ignoreErrorReadings', 'settings.analysis.ignore-errors']
];

export function renderSettingsView(container, connectors, activeTarget = '#settings-connectors', settings = {}, deviceInfo = {}) {
    container.dataset.i18nSkip = '';
    container.innerHTML = `
        <div class="card settings-workspace mb-4">
            <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
                <span><i class="fas fa-sliders-h text-primary me-2"></i>${t('settings.application-title')}</span>
                <span class="settings-storage-note"><i class="fas fa-database me-1"></i>${t('settings.saved-locally')}</span>
            </div>
            <div class="card-body settings-workspace-body">
                <aside class="settings-sidebar">
                    <ul class="nav nav-pills settings-nav" role="tablist">
                        ${tabButton('session', 'fa-user', 'settings.tab.session', activeTarget)}
                        ${tabButton('connectors', 'fa-plug', 'settings.tab.connectors', activeTarget)}
                        ${tabButton('esc', 'fa-heart-pulse', 'settings.tab.esc', activeTarget)}
                        ${tabButton('patterns', 'fa-wave-square', 'settings.tab.patterns', activeTarget)}
                        ${tabButton('context', 'fa-tags', 'settings.tab.context', activeTarget)}
                        ${tabButton('methodology', 'fa-book-medical', 'settings.tab.methodology', activeTarget)}
                        ${tabButton('storage', 'fa-database', 'settings.tab.storage', activeTarget)}
                    </ul>
                </aside>
                <main class="settings-content-panel">
                <div class="tab-content settings-tab-content">
                    <div class="tab-pane fade${paneActive('session', activeTarget)}" id="settings-session" role="tabpanel">
                        ${renderSessionSettingsPanel(deviceInfo)}
                    </div>
                    <div class="tab-pane fade${paneActive('connectors', activeTarget)}" id="settings-connectors" role="tabpanel">
                        ${connectorPanel(connectors, deviceInfo)}
                    </div>
                    <div class="tab-pane fade${paneActive('esc', activeTarget)}" id="settings-esc" role="tabpanel">
                        <form id="esc-settings-form">
                            <div class="settings-section-heading">
                                <div><h5>${t('settings.esc.title')}</h5><p>${t('settings.esc.description')}</p></div>
                            </div>
                            ${clinicalNotice()}
                            ${settingsGroup('fa-clock', 'settings.monitoring.title', 'settings.monitoring.description', `
                                <div class="settings-field-grid settings-field-grid-context">
                                    ${selectField('setting-monitoring-profile', 'settings.monitoring.profile', 'monitoring.profile', `<option value="office">${t('settings.profile.office')}</option><option value="home">${t('settings.profile.home')}</option><option value="abpm24">${t('settings.profile.abpm24')}</option>`)}
                                    ${inputField('setting-monitoring-sleepStart', 'settings.monitoring.sleep-start', 'monitoring.sleepStart', 'time')}
                                    ${inputField('setting-monitoring-wakeTime', 'settings.monitoring.wake-time', 'monitoring.wakeTime', 'time')}
                                </div>
                                <div class="settings-field-grid mt-3">${numberFields(monitoringFields, 'monitoring')}</div>`)}
                            ${settingsGroup('fa-calendar-day', 'settings.reference.abpm24-title', 'settings.reference.abpm24-description', `<div class="settings-field-grid">${numberFields(abpmThresholdFields, 'referenceProfiles.abpm24')}</div>`)}
                            ${settingsGroup('fa-gauge-high', 'settings.esc.classification', null, `<div class="settings-field-grid">${numberFields(escFields, 'esc2024')}</div>`)}
                            ${settingsGroup('fa-layer-group', 'settings.risk.title', 'settings.risk.description', `<div class="settings-field-grid">${numberFields(zoneFields, 'esc2024.riskZones')}</div>`)}
                            ${formActions('esc')}
                        </form>
                    </div>
                    <div class="tab-pane fade${paneActive('patterns', activeTarget)}" id="settings-patterns" role="tabpanel">
                        <form id="pattern-settings-form">
                            <div class="settings-section-heading">
                                <div><h5>${t('settings.patterns.title')}</h5><p>${t('settings.patterns.description')}</p></div>
                            </div>
                            ${settingsGroup('fa-wave-square', 'settings.patterns.configuration', null, `<div class="settings-field-grid">${numberFields(patternFields, 'patterns')}</div>`)}
                            ${settingsGroup('fa-filter-circle-check', 'settings.analysis.title', 'settings.analysis.description', `<div class="settings-field-grid">${numberFields(analysisFields, 'analysis')}</div><div class="settings-check-grid mt-3">${checkboxFields(analysisFlags, 'analysis')}</div>`)}
                            ${formActions('patterns')}
                        </form>
                    </div>
                    <div class="tab-pane fade${paneActive('context', activeTarget)}" id="settings-context" role="tabpanel">
                        ${eventPresetPanel(settings.eventPresets ?? [])}
                    </div>
                    <div class="tab-pane fade${paneActive('methodology', activeTarget)}" id="settings-methodology" role="tabpanel">
                        ${methodologyPanel()}
                    </div>
                    <div class="tab-pane fade${paneActive('storage', activeTarget)}" id="settings-storage" role="tabpanel">
                        <div class="settings-section-heading">
                            <div><h5>${t('settings.storage.title')}</h5><p>${t('settings.storage.description')}</p></div>
                        </div>
                        ${settingsGroup('fa-triangle-exclamation', 'settings.storage.danger-zone', null, `<div class="alert alert-warning mb-3"><i class="fas fa-triangle-exclamation me-2"></i>${t('settings.storage.warning')}</div><button id="btn-clear-local-data" class="btn btn-outline-danger" type="button"><i class="fas fa-trash-can me-2"></i>${t('settings.storage.clear')}</button>`)}
                    </div>
                </div>
                </main>
            </div>
        </div>`;
}

function eventPresetPanel(presets) {
    return `<form id="event-presets-form">
        <div class="settings-section-heading"><div><h5>${t('settings.context.title')}</h5><p>${t('settings.context.description')}</p></div></div>
        <div class="alert alert-primary" role="note"><i class="fas fa-circle-info me-2"></i>${t('settings.context.local-only')}</div>
        <div id="event-preset-list" class="event-preset-list">
            ${presets.length ? presets.map(eventPresetRow).join('') : `<div class="event-preset-empty">${t('settings.context.empty')}</div>`}
        </div>
        <div class="settings-form-actions">
            <button id="btn-add-event-preset" class="btn btn-outline-primary" type="button"><i class="fas fa-plus me-2"></i>${t('settings.context.add')}</button>
            <button class="btn btn-primary" type="submit"><i class="fas fa-save me-2"></i>${t('settings.save')}</button>
            <button class="btn btn-outline-secondary" type="button" data-reset-settings="context"><i class="fas fa-rotate-left me-2"></i>${t('settings.restore-defaults')}</button>
        </div>
    </form>`;
}

function eventPresetRow(preset, index) {
    return `<article class="event-preset-card" data-event-preset-id="${escapeHtml(preset.id)}">
        <div class="event-preset-card-heading"><span><i class="fas fa-tag me-2"></i>${t('settings.context.preset-number', { number: index + 1 })}</span><button class="btn btn-sm btn-outline-danger" type="button" data-delete-event-preset="${escapeHtml(preset.id)}" aria-label="${t('settings.context.delete')}"><i class="fas fa-trash"></i></button></div>
        <div class="settings-field-grid event-preset-grid">
            ${presetSelect('type', 'settings.context.type', preset.type)}
            ${presetInput('label', 'settings.context.label', preset.label, 'text', '', t('settings.context.label-placeholder'))}
            ${presetInput('name', 'settings.context.name', preset.name, 'text', '', t('settings.context.name-placeholder'))}
            ${presetInput('dose', 'settings.context.dose', preset.dose, 'text', '', t('settings.context.dose-placeholder'))}
            ${presetInput('defaultOffsetMinutes', 'settings.context.offset', preset.defaultOffsetMinutes, 'number', 'min="-1440" max="1440" step="5"')}
            ${presetInput('durationMinutes', 'settings.context.duration', preset.durationMinutes, 'number', 'min="0" max="1440" step="5"')}
            ${presetInput('analysisWindowMinutes', 'settings.context.window', preset.analysisWindowMinutes, 'number', 'min="30" max="1440" step="30"')}
        </div>
    </article>`;
}

function presetSelect(field, labelKey, selected) {
    const options = EVENT_TYPES.map(type => `<option value="${type}"${type === selected ? ' selected' : ''}>${t(`event.type.${type}`)}</option>`).join('');
    return `<div class="settings-field"><label class="form-label">${t(labelKey)}</label><select class="form-select" data-preset-field="${field}">${options}</select></div>`;
}

function presetInput(field, labelKey, value, type, attributes = '', placeholder = '') {
    return `<div class="settings-field"><label class="form-label">${t(labelKey)}</label><input class="form-control" type="${type}" value="${escapeHtml(String(value ?? ''))}" ${attributes} ${placeholder ? `placeholder="${escapeHtml(placeholder)}"` : ''} data-preset-field="${field}"></div>`;
}
function connectorPanel(connectors, deviceInfo) {
    const options = connectors.map(connector => `<option value="${connector.id}">${t(connector.labelKey)}</option>`).join('');
    return `
        <div class="settings-section-heading">
            <div><h5>${t('settings.connectors.title')}</h5><p>${t('settings.connectors.description')}</p></div>
        </div>
        <div class="settings-connector-layout">
            <section class="settings-group settings-connector-picker">
                <div class="settings-group-heading"><span class="settings-group-icon"><i class="fas fa-arrow-pointer"></i></span><div><h6>${t('settings.connectors.active')}</h6></div></div>
                <div class="settings-field">
                    <label for="connector-select" class="visually-hidden">${t('settings.connectors.active')}</label>
                    <select id="connector-select" class="form-select">${options}</select>
                    <div id="connector-description" class="form-text"></div>
                </div>
            </section>
            <section class="settings-connector-details">
                <div class="connector-config" data-connector-panel="hingmed">
                    <h6><i class="fas fa-plug me-2"></i>${t('connector.hingmed.label')}</h6>
                    <p class="text-muted">${t('settings.connector.hingmed-help')}</p>
                    <div class="connector-quick-actions">
                        <button id="btn-settings-open-monitoring" class="btn btn-outline-primary" type="button"><i class="fas fa-arrow-up-right-from-square me-2"></i>${t('Data overview')}</button>
                        <button id="btn-settings-hingmed-connect" class="btn btn-success" type="button"><i class="fas fa-link me-2"></i>${t('Connect')}</button>
                        <button id="btn-settings-hingmed-disconnect" class="btn btn-outline-danger" type="button" disabled><i class="fas fa-unlink me-2"></i>${t('Disconnect')}</button>
                    </div>
                    <div id="hingmed-tools-slot" class="hingmed-tools-slot"></div>
                </div>
                <div class="connector-config" data-connector-panel="manual" hidden>
                    <h6><i class="fas fa-keyboard me-2"></i>${t('connector.manual.label')}</h6>
                    <p class="text-muted">${t('settings.manual.monitoring-help')}</p>
                    <form id="manual-device-form">
                        <div class="settings-group manual-device-group">
                            <div class="settings-group-heading mb-3"><span class="settings-group-icon"><i class="fas fa-id-card"></i></span><div><h6>${t('settings.manual.device-title')}</h6><p>${t('settings.manual.device-description')}</p></div></div>
                            <div class="settings-field-grid manual-device-grid">
                                ${manualDeviceInput('manual-device-id', 'id', 'settings.manual.device-id', deviceInfo.id, true)}
                                ${manualDeviceInput('manual-device-serial', 'serialNumber', 'settings.manual.serial-number', deviceInfo.serialNumber, true)}
                                ${manualDeviceInput('manual-device-mac', 'macAddress', 'settings.manual.mac-address', deviceInfo.macAddress, true)}
                            </div>
                        </div>
                        <div class="settings-form-actions manual-device-actions">
                            <button class="btn btn-primary" type="submit"><i class="fas fa-save me-2"></i>${t('settings.manual.save-device')}</button>
                            <button id="btn-open-manual-entry" class="btn btn-outline-primary" type="button"><i class="fas fa-arrow-up-right-from-square me-2"></i>${t('settings.manual.open-monitoring')}</button>
                        </div>
                    </form>
                </div>
                <div class="connector-config" data-connector-panel="remote" hidden>
                    <h6><i class="fas fa-cloud me-2"></i>${t('connector.remote.label')}</h6>
                    <form id="remote-settings-form">
                        <div class="settings-field-grid">
                            <div class="settings-field"><label for="remote-protocol" class="form-label">${t('settings.remote.protocol')}</label>
                                <select id="remote-protocol" class="form-select" data-setting="remote.protocol"><option value="https">HTTPS</option><option value="http">HTTP</option></select>
                            </div>
                            ${remoteInput('remote-host', 'remote.host', 'settings.remote.host', 'text', 'api.example.com')}
                            ${remoteInput('remote-port', 'remote.port', 'settings.remote.port', 'number', '443')}
                            ${remoteInput('remote-base-path', 'remote.basePath', 'settings.remote.base-path', 'text', '/api')}
                        </div>
                        <p class="form-text mt-3">${t('settings.remote.help')}</p>
                        <div class="settings-form-actions"><button class="btn btn-primary" type="submit"><i class="fas fa-save me-2"></i>${t('settings.save')}</button></div>
                    </form>
                </div>
            </section>
        </div>`;
}

function manualDeviceInput(id, field, labelKey, value, required = false) {
    return `<div class="settings-field"><label for="${id}" class="form-label">${t(labelKey)}</label><input id="${id}" class="form-control" type="text" maxlength="128" value="${escapeHtml(String(value ?? ''))}" data-manual-device-field="${field}" ${required ? 'required' : ''}></div>`;
}

function tabButton(id, icon, key, activeTarget) {
    const active = activeTarget === `#settings-${id}`;
    return `<li class="nav-item" role="presentation"><button class="nav-link${active ? ' active' : ''}" data-bs-toggle="pill" data-bs-target="#settings-${id}" type="button" role="tab" aria-selected="${active}"><span class="settings-nav-icon"><i class="fas ${icon}"></i></span><span>${t(key)}</span><i class="fas fa-chevron-right settings-nav-chevron"></i></button></li>`;
}

function paneActive(id, activeTarget) {
    return activeTarget === `#settings-${id}` ? ' show active' : '';
}

function numberFields(fields, prefix) {
    return fields.map(([name, label]) => inputField(`setting-${prefix}-${name}`, label, `${prefix}.${name}`, 'number', 'min="0" max="500" step="1"')).join('');
}

function checkboxFields(fields, prefix) {
    return fields.map(([name, label]) => `<div class="form-check settings-check"><input id="setting-${prefix}-${name}" class="form-check-input" type="checkbox" data-setting="${prefix}.${name}"><label class="form-check-label" for="setting-${prefix}-${name}">${t(label)}</label></div>`).join('');
}

function clinicalNotice() {
    return `<div class="alert alert-primary clinical-notice" role="note"><i class="fas fa-circle-info me-2"></i>${t('methodology.esc-public-basis')} <a href="${CLINICAL_SOURCES[1].url}" target="_blank" rel="noopener noreferrer">${t('methodology.open-source')} <i class="fas fa-arrow-up-right-from-square ms-1"></i></a></div>`;
}

function methodologyPanel() {
    const sources = CLINICAL_SOURCES.map(source => `
        <a class="methodology-source" href="${source.url}" target="_blank" rel="noopener noreferrer">
            <span><strong>${t(source.titleKey)}</strong><small>${t(source.descriptionKey)}</small></span>
            <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </a>`).join('');
    return `
        <div class="settings-section-heading"><div><h5>${t('methodology.title')}</h5><p>${t('methodology.description')}</p></div></div>
        <div class="alert alert-warning" role="note"><i class="fas fa-user-doctor me-2"></i>${t('methodology.disclaimer')}</div>
        <div class="methodology-grid mb-4">
            ${methodologyCard('fa-gauge-high', 'methodology.classification-title', 'methodology.classification-description')}
            ${methodologyCard('fa-chart-line', 'methodology.patterns-title', 'methodology.patterns-description')}
            ${methodologyCard('fa-bell', 'methodology.alerts-title', 'methodology.alerts-description')}
        </div>
        ${settingsGroup('fa-calculator', 'methodology.calculations-title', null, `<div class="methodology-grid">
            ${methodologyCard('fa-filter-circle-xmark', 'methodology.quality-title', 'methodology.quality-description')}
            ${methodologyCard('fa-moon', 'methodology.dipping-title', 'methodology.dipping-description')}
            ${methodologyCard('fa-wave-square', 'methodology.variability-title', 'methodology.variability-description')}
            ${methodologyCard('fa-chart-area', 'methodology.exposure-title', 'methodology.exposure-description')}
        </div>`)}
        ${settingsGroup('fa-book-open', 'methodology.sources-title', null, `<div class="methodology-sources">${sources}</div><p class="form-text mt-3 mb-0">${t('methodology.license-note')}</p>`)}
        <div class="settings-form-actions"><button id="btn-open-usage-policy" class="btn btn-outline-primary" type="button"><i class="fas fa-scale-balanced me-2"></i>${t('usage-policy.open')}</button></div>`;
}

function methodologyCard(icon, titleKey, descriptionKey) {
    return `<article class="methodology-card"><i class="fas ${icon}"></i><div><h6>${t(titleKey)}</h6><p>${t(descriptionKey)}</p></div></article>`;
}

function remoteInput(id, setting, key, type, placeholder) {
    return `<div class="settings-field"><label for="${id}" class="form-label">${t(key)}</label><input id="${id}" class="form-control" type="${type}" placeholder="${placeholder}" data-setting="${setting}" ${id === 'remote-host' ? 'required' : ''}></div>`;
}

function formActions(section) {
    return `<div class="settings-form-actions"><button class="btn btn-primary" type="submit"><i class="fas fa-save me-2"></i>${t('settings.save')}</button><button class="btn btn-outline-secondary" type="button" data-reset-settings="${section}"><i class="fas fa-rotate-left me-2"></i>${t('settings.restore-defaults')}</button></div>`;
}

function settingsGroup(icon, titleKey, descriptionKey, content) {
    return `<section class="settings-group"><div class="settings-group-heading"><span class="settings-group-icon"><i class="fas ${icon}"></i></span><div><h6>${t(titleKey)}</h6>${descriptionKey ? `<p>${t(descriptionKey)}</p>` : ''}</div></div><div class="settings-group-body">${content}</div></section>`;
}

function inputField(id, labelKey, setting, type, attributes = '') {
    return `<div class="settings-field"><label class="form-label" for="${id}">${t(labelKey)}</label><input id="${id}" class="form-control" type="${type}" ${attributes} required data-setting="${setting}"></div>`;
}

function selectField(id, labelKey, setting, options) {
    return `<div class="settings-field"><label class="form-label" for="${id}">${t(labelKey)}</label><select id="${id}" class="form-select" data-setting="${setting}">${options}</select></div>`;
}
