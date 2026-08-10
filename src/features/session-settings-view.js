import { t } from '../i18n/i18n.js';
import { escapeHtml } from '../ui/html.js';

export function renderSessionSettingsPanel(deviceInfo = {}) {
    return `<form id="session-metadata-form">
        <div class="settings-section-heading">
            <div><h5>${t('settings.session.title')}</h5><p>${t('settings.session.description')}</p></div>
        </div>
        <div class="alert alert-primary" role="note"><i class="fas fa-shield-halved me-2"></i>${t('settings.session.local-only')}</div>
        <section class="settings-group">
            <div class="settings-group-heading">
                <span class="settings-group-icon"><i class="fas fa-id-card"></i></span>
                <div><h6>${t('settings.session.patient-heading')}</h6></div>
            </div>
            <div class="settings-field-grid">
                <div class="settings-field">
                    <label for="session-patient-name" class="form-label">${t('settings.session.patient-name')}</label>
                    <input id="session-patient-name" class="form-control" type="text" maxlength="128" autocomplete="name" value="${escapeHtml(String(deviceInfo.username ?? ''))}" placeholder="${t('settings.session.patient-placeholder')}">
                    <small class="form-text">${t('settings.session.patient-help')}</small>
                </div>
            </div>
        </section>
        <div class="settings-form-actions">
            <button class="btn btn-primary" type="submit"><i class="fas fa-save me-2"></i>${t('settings.session.save')}</button>
        </div>
    </form>`;
}
