import { t } from '../i18n/i18n.js';
import { escapeHtml } from '../ui/html.js';

export function renderSessionSettingsPanel(deviceInfo = {}) {
    return `<form id="session-metadata-form">
        <div class="settings-section-heading">
            <div><h5>${t('settings.session.title')}</h5><p>${t('settings.session.description')}</p></div>
        </div>
        <div class="alert alert-primary" role="note"><i class="fas fa-shield-halved me-2"></i>${t('settings.session.local-only')}</div>
        <section class="settings-group session-identity-group">
            <div class="settings-group-heading">
                <span class="settings-group-icon"><i class="fas fa-id-card"></i></span>
                <div><h6>${t('settings.session.patient-heading')}</h6></div>
            </div>
            <div class="settings-field-grid session-identity-grid settings-group-body">
                <div class="settings-field">
                    <label for="session-patient-name" class="form-label">${t('settings.session.patient-name')}</label>
                    <input id="session-patient-name" class="form-control" type="text" maxlength="128" autocomplete="name" value="${escapeHtml(String(deviceInfo.username ?? ''))}" placeholder="${t('settings.session.patient-placeholder')}">
                    <small class="form-text">${t('settings.session.patient-help')}</small>
                </div>
                <div class="settings-field">
                    <label for="session-user-id" class="form-label">${t('settings.session.user-id')}</label>
                    <input id="session-user-id" class="form-control" type="text" maxlength="128" value="${escapeHtml(String(deviceInfo.userId ?? ''))}" placeholder="${t('settings.session.id-placeholder')}">
                    <small class="form-text">${t('settings.session.id-help')}</small>
                </div>
            </div>
            <div class="settings-form-actions session-primary-actions">
                <button class="btn btn-primary" type="submit"><i class="fas fa-save me-2"></i>${t('settings.session.save')}</button>
            </div>
        </section>
        <section class="settings-group session-device-sync" data-session-device-actions hidden>
            <div class="settings-group-heading">
                <span class="settings-group-icon"><i class="fas fa-plug"></i></span>
                <div><h6>${t('settings.session.device-sync-title')}</h6><p>${t('settings.session.device-sync-help')}</p></div>
            </div>
            <div class="settings-form-actions">
                <button id="btn-session-save-device" class="btn btn-primary" type="button" disabled><i class="fas fa-upload me-2"></i>${t('Save to device')}</button>
                <button id="btn-session-read-device" class="btn btn-outline-primary" type="button" disabled><i class="fas fa-download me-2"></i>${t('Read from device')}</button>
                <button id="btn-session-menu-help" class="btn btn-outline-secondary" type="button" aria-expanded="false" aria-controls="session-device-menu-help"><i class="fas fa-circle-info me-2"></i>${t('Menu mode instructions')}</button>
            </div>
            <div id="session-device-menu-help" class="alert alert-warning mt-3 mb-0" role="note" hidden><i class="fas fa-triangle-exclamation me-2"></i>${t('hingmed.menu-manual-help')}</div>
        </section>
    </form>`;
}
