import { catalogs, LANGUAGE_DEFINITIONS, LOCALE_TAGS, SUPPORTED_LANGUAGES } from './locales.js';
import { activateTabTarget, getActiveTabTarget } from '../ui/tab-state.js';

const STORAGE_KEY = 'bpms.language';
const textSources = new WeakMap();
const attributeSources = new WeakMap();
let currentLanguage = 'en';
let documentSources;
let observer;

export function initI18n() {
    currentLanguage = resolveLanguage();
    document.documentElement.lang = currentLanguage;
    const selector = document.getElementById('language-select');
    if (selector) {
        renderLanguageOptions(selector);
        selector.addEventListener('change', event => setLanguage(event.target.value));
    }
    translateDocumentMetadata();
    translateTree(document.body);
    observer = new MutationObserver(mutations => {
        observer.disconnect();
        for (const mutation of mutations) {
            mutation.addedNodes.forEach(node => translateTree(node));
        }
        observe();
    });
    observe();
    window.dispatchEvent(new CustomEvent('bpms:languagechange', { detail: { language: currentLanguage } }));
}

export function setLanguage(language) {
    if (!SUPPORTED_LANGUAGES.includes(language)) return;
    const activeMainTab = getActiveTabTarget('#mainTabs', '#monitoring');
    currentLanguage = language;
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    const selector = document.getElementById('language-select');
    if (selector) renderLanguageOptions(selector);
    translateDocumentMetadata();
    translateTree(document.body);
    window.dispatchEvent(new CustomEvent('bpms:languagechange', { detail: { language } }));
    activateTabTarget(activeMainTab);
}

export function getLanguage() {
    return currentLanguage;
}

export function getLocale() {
    return LOCALE_TAGS[currentLanguage];
}

export function t(source, replacements = {}) {
    return translateMessage(source, currentLanguage, replacements);
}

export function translateMessage(source, language, replacements = {}) {
    const translated = catalogs[language]?.[source] ?? source;
    return Object.entries(replacements).reduce(
        (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
        translated
    );
}

export function formatDate(value, options) {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(getLocale(), options).format(date);
}

export function formatNumber(value, options) {
    return new Intl.NumberFormat(getLocale(), options).format(value);
}

function resolveLanguage() {
    const queryLanguage = new URLSearchParams(location.search).get('lang');
    if (SUPPORTED_LANGUAGES.includes(queryLanguage)) return queryLanguage;
    const savedLanguage = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED_LANGUAGES.includes(savedLanguage)) return savedLanguage;
    const browserLanguage = navigator.language?.slice(0, 2).toLowerCase();
    return SUPPORTED_LANGUAGES.includes(browserLanguage) ? browserLanguage : 'en';
}

function translateTree(root) {
    if (!root) return;
    if (root.nodeType === Node.ELEMENT_NODE && root.closest('[data-i18n-skip]')) return;
    if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root);
        return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
        else translateAttributes(node);
    }
}

function translateTextNode(node) {
    if (node.parentElement?.closest('script, style, #terminal, #language-select, [data-i18n-skip]')) return;
    let source = textSources.get(node);
    if (source === undefined) {
        source = node.nodeValue;
        textSources.set(node, source);
    }
    const leading = source.match(/^\s*/)[0];
    const trailing = source.match(/\s*$/)[0];
    const content = source.trim();
    if (content) node.nodeValue = `${leading}${t(content)}${trailing}`;
}

function translateAttributes(element) {
    if (element.closest('[data-i18n-skip]')) return;
    const translatable = ['title', 'placeholder', 'aria-label'];
    let sources = attributeSources.get(element);
    if (!sources) {
        sources = {};
        for (const name of translatable) if (element.hasAttribute(name)) sources[name] = element.getAttribute(name);
        attributeSources.set(element, sources);
    }
    for (const [name, source] of Object.entries(sources)) element.setAttribute(name, t(source));
}

function observe() {
    observer.observe(document.body, { childList: true, subtree: true });
}

function renderLanguageOptions(selector) {
    const displayNames = new Intl.DisplayNames([getLocale()], { type: 'language' });
    selector.replaceChildren(...LANGUAGE_DEFINITIONS.map(({ code }) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = capitalize(displayNames.of(code) ?? code);
        return option;
    }));
    selector.value = currentLanguage;
}

function capitalize(value) {
    return value.charAt(0).toLocaleUpperCase(getLocale()) + value.slice(1);
}

function translateDocumentMetadata() {
    documentSources ??= Object.freeze({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content ?? ''
    });
    document.title = t(documentSources.title);
    const description = document.querySelector('meta[name="description"]');
    if (description && documentSources.description) description.content = t(documentSources.description);
}
