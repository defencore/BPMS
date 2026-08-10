import { LANGUAGE_DEFINITIONS } from '../i18n/locales.js';
import { getLanguage, getLocale, t } from '../i18n/i18n.js';

export function renderDialogLanguageOptions() {
    const displayNames = new Intl.DisplayNames([getLocale()], { type: 'language' });
    return LANGUAGE_DEFINITIONS.map(({ code }) => {
        const selected = code === getLanguage() ? ' selected' : '';
        return `<option value="${code}"${selected}>${displayNames.of(code) ?? code}</option>`;
    }).join('');
}

export function renderInformationSection({ icon, titleKey, bodyKey, variant = '' }) {
    return `
        <section class="usage-policy-section ${variant}">
            <i class="fas ${icon}" aria-hidden="true"></i>
            <div><h3>${t(titleKey)}</h3><p>${t(bodyKey)}</p></div>
        </section>`;
}
