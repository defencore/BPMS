import { ESC_GUIDELINE_URL } from '../core/clinical-sources.js';
import {
    USAGE_POLICY_VERSION,
    acceptUsagePolicy,
    readUsagePolicyAcceptance
} from '../core/usage-policy.js';
import { setLanguage, t } from '../i18n/i18n.js';
import { renderDialogLanguageOptions, renderInformationSection } from '../ui/information-dialog.js';

const MDR_URL = 'https://eur-lex.europa.eu/eli/reg/2017/745/oj?locale=en';
let dialog;
let required = false;
let restoreFocus;

export function initUsagePolicy() {
    dialog = document.createElement('dialog');
    dialog.id = 'usage-policy-dialog';
    dialog.className = 'usage-policy-dialog';
    dialog.addEventListener('cancel', event => {
        if (required) event.preventDefault();
    });
    document.body.append(dialog);
    window.addEventListener('bpms:languagechange', () => {
        if (dialog.open) renderPolicy();
    });
    if (!readUsagePolicyAcceptance(globalThis.localStorage)) openUsagePolicy({ requireAcceptance: true });
}

export function openUsagePolicy({ requireAcceptance = false } = {}) {
    if (!dialog) return;
    required = requireAcceptance || !readUsagePolicyAcceptance(globalThis.localStorage);
    restoreFocus = document.activeElement;
    renderPolicy();
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('#usage-policy-language')?.focus();
}

function renderPolicy() {
    dialog.dataset.i18nSkip = '';
    dialog.innerHTML = `
        <div class="usage-policy-shell">
            <header class="usage-policy-header">
                <div class="usage-policy-icon"><i class="fas fa-scale-balanced" aria-hidden="true"></i></div>
                <div class="usage-policy-heading"><div class="usage-policy-kicker">${t('usage-policy.kicker')}</div><h2>${t('usage-policy.title')}</h2><p>${t('usage-policy.updated', { version: USAGE_POLICY_VERSION })}</p></div>
                <label class="usage-policy-language"><span>${t('Language')}</span><select id="usage-policy-language" class="form-select form-select-sm" aria-label="${t('Language')}">${renderDialogLanguageOptions()}</select></label>
            </header>
            <div class="usage-policy-scroll">
                <p class="usage-policy-lead">${t('usage-policy.intro')}</p>
                ${renderInformationSection({ icon: 'fa-flask', titleKey: 'usage-policy.purpose-title', bodyKey: 'usage-policy.purpose-body' })}
                ${renderInformationSection({ icon: 'fa-stethoscope', titleKey: 'usage-policy.not-medical-title', bodyKey: 'usage-policy.not-medical-body' })}
                ${renderInformationSection({ icon: 'fa-chart-line', titleKey: 'usage-policy.tools-title', bodyKey: 'usage-policy.tools-body' })}
                ${renderInformationSection({ icon: 'fa-people-arrows', titleKey: 'usage-policy.individual-title', bodyKey: 'usage-policy.individual-body' })}
                ${renderInformationSection({ icon: 'fa-user-shield', titleKey: 'usage-policy.decisions-title', bodyKey: 'usage-policy.decisions-body' })}
                ${renderInformationSection({ icon: 'fa-triangle-exclamation', titleKey: 'usage-policy.emergency-title', bodyKey: 'usage-policy.emergency-body', variant: 'warning' })}
                ${renderInformationSection({ icon: 'fa-laptop-file', titleKey: 'usage-policy.storage-title', bodyKey: 'usage-policy.storage-body', variant: 'info' })}
                ${renderInformationSection({ icon: 'fa-database', titleKey: 'usage-policy.data-title', bodyKey: 'usage-policy.data-body' })}
                ${renderInformationSection({ icon: 'fa-file-contract', titleKey: 'usage-policy.liability-title', bodyKey: 'usage-policy.liability-body' })}
                <div class="usage-policy-links">
                    <a href="${ESC_GUIDELINE_URL}" target="_blank" rel="noopener noreferrer">${t('usage-policy.link-methodology')} <i class="fas fa-arrow-up-right-from-square"></i></a>
                    <a href="${MDR_URL}" target="_blank" rel="noopener noreferrer">${t('usage-policy.link-mdr')} <i class="fas fa-arrow-up-right-from-square"></i></a>
                </div>
            </div>
            <footer class="usage-policy-footer">
                ${required ? `
                    <label class="usage-policy-consent" for="usage-policy-checkbox">
                        <input id="usage-policy-checkbox" class="form-check-input" type="checkbox">
                        <span>${t('usage-policy.acceptance')}</span>
                    </label>
                    <button id="btn-accept-usage-policy" class="btn btn-primary btn-lg" type="button" disabled><i class="fas fa-check me-2"></i>${t('usage-policy.accept')}</button>
                ` : `<button id="btn-close-usage-policy" class="btn btn-primary" type="button">${t('usage-policy.close')}</button>`}
            </footer>
        </div>`;
    bindPolicyEvents();
}

function bindPolicyEvents() {
    dialog.querySelector('#usage-policy-language')?.addEventListener('change', event => setLanguage(event.target.value));
    const checkbox = dialog.querySelector('#usage-policy-checkbox');
    const acceptButton = dialog.querySelector('#btn-accept-usage-policy');
    checkbox?.addEventListener('change', () => { acceptButton.disabled = !checkbox.checked; });
    acceptButton?.addEventListener('click', () => {
        if (!checkbox.checked) return;
        acceptUsagePolicy(globalThis.localStorage);
        required = false;
        closePolicy();
    });
    dialog.querySelector('#btn-close-usage-policy')?.addEventListener('click', closePolicy);
}

function closePolicy() {
    dialog.close();
    restoreFocus?.focus?.();
}
