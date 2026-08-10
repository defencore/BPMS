import { getLocale, t } from '../i18n/i18n.js';

const PREFIXES = Object.freeze({ sent: '→', received: '←', error: '⚠', system: '●', command: '►', debug: '◆', warning: '⚠' });

export function addToTerminal(message, type = 'system') {
    const terminal = document.getElementById('terminal');
    if (!terminal) return;
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    const timestamp = new Date().toLocaleTimeString(getLocale());
    line.textContent = `[${timestamp}] ${PREFIXES[type] ?? '●'} ${t(message)}`;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

export function clearTerminal() {
    document.getElementById('terminal')?.replaceChildren();
}
