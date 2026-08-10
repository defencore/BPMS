import { t } from '../i18n/i18n.js';

const ICONS = Object.freeze({
    success: 'check-circle',
    warning: 'exclamation-triangle',
    danger: 'exclamation-circle',
    info: 'info-circle'
});

export function showAlert(message, type = 'info') {
    const container = document.getElementById('alerts-container');
    if (!container) return;
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.setAttribute('role', 'alert');

    const icon = document.createElement('i');
    icon.className = `fas fa-${ICONS[type] ?? ICONS.info} me-2`;
    alert.append(icon, document.createTextNode(t(message)));

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn-close';
    close.dataset.bsDismiss = 'alert';
    close.setAttribute('aria-label', t('Close'));
    alert.append(close);
    container.replaceChildren(alert);
    window.setTimeout(() => alert.remove(), 5000);
}
