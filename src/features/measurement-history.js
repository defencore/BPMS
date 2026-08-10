import { classifyBloodPressure, classifyPulse } from '../core/blood-pressure.js';
import { bodyPositionLabelKey, isLyingPosition } from '../core/body-positions.js';
import { eventsForMeasurement, formatEventOffset } from '../core/measurement-context.js';
import { state } from '../core/state.js';
import { deleteStoredMeasurement } from '../core/measurement-store.js';
import { t } from '../i18n/i18n.js';
import { showAlert } from '../ui/alerts.js';
import { escapeHtml } from '../ui/html.js';

let refreshDashboard = () => {};

export function initMeasurementHistory(onDataChanged) {
    refreshDashboard = onDataChanged;
    document.getElementById('measurements-table')?.addEventListener('click', handleHistoryAction);
}

export function updateMeasurementHistory() {
    const tbody = document.getElementById('measurements-table');
    if (!tbody) return;
    tbody.dataset.i18nSkip = '';
    if (!state.measurements.length) {
        tbody.innerHTML = `
            <tr class="history-empty-row">
                <td colspan="10" class="text-center text-muted py-5">
                    <i class="fas fa-database fa-3x mb-3 d-block"></i>
                    ${t('No data to display')}
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = state.measurements.map(renderMeasurementRow).join('');
}

function renderMeasurementRow(measurement, index) {
    const pressure = classifyBloodPressure(measurement.systolic, measurement.diastolic);
    const pulse = classifyPulse(measurement.pulse);
    const status = measurement.errorCode
        ? `<span class="measurement-badge high"><i class="fas fa-exclamation-circle me-1"></i>${t(`error.${measurement.error ?? 'unknown'}`)}</span>`
        : '<span class="measurement-badge normal"><i class="fas fa-check-circle me-1"></i>OK</span>';
    const hour = Number.parseInt(measurement.datetime.slice(11, 13), 10);
    const positionClass = isLyingPosition(measurement.bodyPosition) ? (hour >= 22 || hour < 6 ? 'table-primary' : 'table-info') : '';
    const pressureClass = pressure.level === 'high' || pressure.level === 'crisis'
        ? 'high'
        : pressure.level === 'low' ? 'low' : 'normal';
    const comment = renderCommentAndContext(measurement);
    const actions = `<div class="history-actions">
                <button class="btn btn-sm btn-outline-primary" type="button" data-history-action="edit" data-measurement-index="${index}" aria-label="${t('history.edit')}"><i class="fas fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" type="button" data-history-action="delete" data-measurement-index="${index}" aria-label="${t('history.delete')}"><i class="fas fa-trash"></i></button>
           </div>`;
    const edited = measurement.edited ? `<i class="fas fa-pen-to-square ms-1 text-primary" title="${t('history.edited')}"></i>` : '';

    return `
        <tr class="measurement-row" data-measurement-index="${index}">
            ${historyCell(index + 1, '#')}
            ${historyCell(`<i class="far fa-clock me-1"></i>${escapeHtml(measurement.datetime)}${edited}`, 'Date/Time')}
            ${historyCell(`<span class="measurement-badge ${pressureClass}">${measurement.systolic}</span>`, 'Systolic')}
            ${historyCell(`<span class="measurement-badge ${pressureClass}">${measurement.diastolic}</span>`, 'Diastolic')}
            ${historyCell(`<span class="measurement-badge ${pulse.class}">${measurement.pulse}</span>`, 'Pulse')}
            ${historyCell(t(bodyPositionLabelKey(measurement.bodyPosition)), 'Position', positionClass)}
            ${historyCell(`<span class="bp-classification ${pressure.cssClass}">${t(pressure.textKey)}</span>`, 'Classification')}
            ${historyCell(status, 'Status')}
            ${historyCell(comment, 'Comment')}
            ${historyCell(actions, 'Actions', 'text-end')}
        </tr>`;
}

function historyCell(content, label, className = '') {
    return `<td class="${className}" data-label="${escapeHtml(t(label))}">${content}</td>`;
}

function renderCommentAndContext(measurement) {
    const linkedEvents = eventsForMeasurement(state.events, measurement);
    if (!measurement.comment && !linkedEvents.length) return '<span class="text-muted">—</span>';
    return `<div class="measurement-comment-stack">
        ${measurement.comment ? `<span class="measurement-comment" title="${escapeHtml(measurement.comment)}">${escapeHtml(measurement.comment)}</span>` : ''}
        ${linkedEvents.map(event => `<span class="measurement-context-chip" title="${escapeHtml(event.note || '')}"><strong>${formatEventOffset(event.offsetMinutes)}</strong> ${escapeHtml(contextEventLabel(event))}</span>`).join('')}
    </div>`;
}

function contextEventLabel(event) {
    return [event.label || t(`event.type.${event.type}`), event.name, event.dose].filter(Boolean).join(' · ');
}

function handleHistoryAction(event) {
    const button = event.target.closest('[data-history-action]');
    if (!button) return;
    const index = Number(button.dataset.measurementIndex);
    if (button.dataset.historyAction === 'edit') {
        window.dispatchEvent(new CustomEvent('bpms:editmeasurement', { detail: { index } }));
        return;
    }
    if (!window.confirm(t('history.delete-confirm'))) return;
    deleteStoredMeasurement(index);
    window.dispatchEvent(new CustomEvent('bpms:measurementdeleted', { detail: { index } }));
    refreshDashboard();
    showAlert(t('history.deleted'), 'info');
}
