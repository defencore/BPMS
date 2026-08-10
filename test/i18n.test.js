import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { catalogs, LANGUAGE_DEFINITIONS, SUPPORTED_LANGUAGES } from '../src/i18n/locales.js';
import en from '../src/i18n/locales/en.js';
import ru from '../src/i18n/locales/ru.js';
import uk from '../src/i18n/locales/uk.js';
import { translateMessage } from '../src/i18n/i18n.js';

const CYRILLIC = /[\u0400-\u04FF]/u;

test('all languages expose every semantic translation key', () => {
    assert.deepEqual(SUPPORTED_LANGUAGES, ['en', 'uk', 'ru']);
    assert.deepEqual(LANGUAGE_DEFINITIONS.map(({ code, locale }) => ({ code, locale })), [
        { code: 'en', locale: 'en-US' },
        { code: 'uk', locale: 'uk-UA' },
        { code: 'ru', locale: 'ru-RU' }
    ]);
    assert.equal(catalogs.uk, uk);
    assert.equal(catalogs.en, en);
    assert.equal(catalogs.ru, ru);
    assert.deepEqual(Object.keys(catalogs.uk).sort(), Object.keys(catalogs.en).sort());
    assert.deepEqual(Object.keys(catalogs.ru).sort(), Object.keys(catalogs.en).sort());
    for (const key of Object.keys(catalogs.en)) {
        assert.doesNotMatch(key, CYRILLIC, `Canonical translation key contains Cyrillic: ${key}`);
        assert.ok(catalogs.uk[key], `Missing Ukrainian translation for ${key}`);
        assert.ok(catalogs.ru[key], `Missing Russian translation for ${key}`);
        assert.doesNotMatch(catalogs.en[key], CYRILLIC, `English translation contains Cyrillic: ${key}`);
    }
});

test('the static interface uses English source strings with complete translations', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    assert.doesNotMatch(html, CYRILLIC);
    const sources = extractInterfaceStrings(html).filter(value => catalogs.en[value]);
    const title = html.match(/<title>([^<]+)<\/title>/iu)?.[1].trim();
    const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/iu)?.[1].trim();
    if (title) sources.push(title);
    if (description) sources.push(description);

    for (const source of sources) {
        assert.ok(catalogs.uk[source], `Missing Ukrainian translation: ${source}`);
        assert.ok(catalogs.ru[source], `Missing Russian translation: ${source}`);
    }
});

test('missing translations fall back to the English source string', () => {
    assert.equal(translateMessage('Unknown text', 'en'), 'Unknown text');
    assert.equal(translateMessage('Unknown text', 'uk'), 'Unknown text');
    assert.equal(translateMessage('Unknown text', 'ru'), 'Unknown text');
});

function extractInterfaceStrings(html) {
    const withoutNonContent = html
        .replace(/<!--[\s\S]*?-->/gu, '')
        .replace(/<script\b[\s\S]*?<\/script>/giu, '')
        .replace(/<style\b[\s\S]*?<\/style>/giu, '');
    const values = new Set();

    for (const match of withoutNonContent.matchAll(/>([^<]+)</gu)) addValue(values, match[1]);
    for (const match of withoutNonContent.matchAll(/\b(?:title|placeholder|aria-label)=(?:"([^"]*)"|'([^']*)')/giu)) {
        addValue(values, match[1] ?? match[2]);
    }

    return [...values];
}

function addValue(values, rawValue) {
    const value = decodeEntities(rawValue).replace(/\s+/gu, ' ').trim();
    if (value) values.add(value);
}

function decodeEntities(value) {
    return value
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');
}
