import { USER_GUIDE_SECTIONS } from '../core/user-guide.js';
import { setLanguage, t } from '../i18n/i18n.js';
import { renderDialogLanguageOptions, renderInformationSection } from '../ui/information-dialog.js';

let dialog;
let trigger;
let restoreFocus;

export function initUserGuide() {
    trigger = document.getElementById('btn-open-user-guide');
    if (!trigger) return;
    dialog = document.createElement('dialog');
    dialog.id = 'user-guide-dialog';
    dialog.className = 'usage-policy-dialog user-guide-dialog';
    dialog.addEventListener('cancel', closeUserGuide);
    document.body.append(dialog);
    trigger.addEventListener('click', openUserGuide);
    window.addEventListener('bpms:languagechange', refreshUserGuideLanguage);
    refreshUserGuideLanguage();
}

export function openUserGuide() {
    if (!dialog) return;
    restoreFocus = document.activeElement;
    renderUserGuide();
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('#user-guide-language')?.focus();
}

function refreshUserGuideLanguage() {
    if (trigger) {
        trigger.querySelector('[data-user-guide-label]').textContent = t('user-guide.open');
        trigger.setAttribute('aria-label', t('user-guide.open'));
        trigger.title = t('user-guide.open');
    }
    if (dialog?.open) renderUserGuide();
}

function renderUserGuide() {
    dialog.dataset.i18nSkip = '';
    dialog.innerHTML = `
        <div class="usage-policy-shell">
            <header class="usage-policy-header">
                <div class="usage-policy-icon"><i class="fas fa-book-open" aria-hidden="true"></i></div>
                <div class="usage-policy-heading"><div class="usage-policy-kicker">${t('user-guide.kicker')}</div><h2>${t('user-guide.title')}</h2><p>${t('user-guide.subtitle')}</p></div>
                <label class="usage-policy-language"><span>${t('Language')}</span><select id="user-guide-language" class="form-select form-select-sm" aria-label="${t('Language')}">${renderDialogLanguageOptions()}</select></label>
            </header>
            <div class="usage-policy-scroll">
                <p class="usage-policy-lead">${t('user-guide.intro')}</p>
                ${USER_GUIDE_SECTIONS.map(renderInformationSection).join('')}
            </div>
            <footer class="usage-policy-footer user-guide-footer">
                <button id="btn-close-user-guide" class="btn btn-primary" type="button"><i class="fas fa-check me-2"></i>${t('user-guide.close')}</button>
            </footer>
        </div>`;
    dialog.querySelector('#user-guide-language')?.addEventListener('change', event => setLanguage(event.target.value));
    dialog.querySelector('#btn-close-user-guide')?.addEventListener('click', closeUserGuide);
}

function closeUserGuide() {
    if (!dialog?.open) return;
    dialog.close();
    restoreFocus?.focus?.();
}
