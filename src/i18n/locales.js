import en from './locales/en.js';
import ru from './locales/ru.js';
import uk from './locales/uk.js';

export const LANGUAGE_DEFINITIONS = Object.freeze([
    Object.freeze({ code: 'en', locale: 'en-US', catalog: en }),
    Object.freeze({ code: 'uk', locale: 'uk-UA', catalog: uk }),
    Object.freeze({ code: 'ru', locale: 'ru-RU', catalog: ru })
]);

export const SUPPORTED_LANGUAGES = Object.freeze(LANGUAGE_DEFINITIONS.map(({ code }) => code));

export const LOCALE_TAGS = Object.freeze(
    Object.fromEntries(LANGUAGE_DEFINITIONS.map(({ code, locale }) => [code, locale]))
);

export const catalogs = Object.freeze(
    Object.fromEntries(LANGUAGE_DEFINITIONS.map(({ code, catalog }) => [code, catalog]))
);
