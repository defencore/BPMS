import { evaluateClinicalAlert } from '../core/alert-evaluator.js';
import { ESC_GUIDELINE_URL } from '../core/clinical-sources.js';
import { getSettings } from '../core/settings-store.js';
import { state } from '../core/state.js';
import { t } from '../i18n/i18n.js';

export function updateClinicalAlerts() {
    const warning = document.getElementById('critical-warning');
    const heading = warning?.querySelector('.critical-warning-header span');
    const content = document.getElementById('critical-warning-content');
    if (!warning || !heading || !content) return;

    const alert = evaluateClinicalAlert(state.measurements, getSettings());
    if (alert?.type === 'very-high') {
        renderAlert(warning, heading, content, 'clinical-alert.very-high-title', 'clinical-alert.very-high-body', {
            count: alert.count
        });
        return;
    }
    if (alert?.type === 'repeated-high') {
        renderAlert(warning, heading, content, 'clinical-alert.repeated-high-title', 'clinical-alert.repeated-high-body', {
            count: alert.count,
            window: alert.window
        });
        return;
    }
    warning.style.display = 'none';
    content.replaceChildren();
}

function renderAlert(warning, heading, content, titleKey, bodyKey, replacements) {
    heading.textContent = t(titleKey);
    content.innerHTML = `
        <p class="mb-2">${t(bodyKey, replacements)}</p>
        <small>${t('clinical-alert.disclaimer')} <a href="${ESC_GUIDELINE_URL}" target="_blank" rel="noopener noreferrer">${t('methodology.open-source')} <i class="fas fa-arrow-up-right-from-square ms-1"></i></a></small>`;
    warning.style.display = 'block';
}
